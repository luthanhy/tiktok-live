/**
 * ZeroTTS Python worker manager (Vietnamese MC voice, default "maichi").
 * Preserved from the original project, plus:
 *  - Windows venv path (.venv\Scripts\python.exe)
 *  - spawn 'error' handling (a missing Python no longer crashes the server)
 *  - TTS_DISABLED=1 to skip the worker entirely
 * When the worker is unavailable the browser falls back to the Web Speech API.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const logger = require('../core/logger').child('tts');

const ROOT = path.join(__dirname, '..', '..');

class ZeroTTSManager extends EventEmitter {
  constructor({ getVoice } = {}) {
    super();
    this.getVoice = getVoice || (() => 'maichi');
    this.proc = null;
    this.ready = false;
    this.status = 'starting';
    this.voices = ['maichi'];
    this.model = 'zeroweight-ai/ZeroTTS';
    this.pending = new Map();
    this.inflight = new Map();
    this.reqCounter = 0;
    this.buffer = '';
    if (process.env.TTS_DISABLED === '1') {
      this.status = 'disabled';
    } else {
      this.startWorker();
    }
  }

  resolvePythonBin() {
    const candidates = [path.join(ROOT, '.venv', 'bin', 'python'), path.join(ROOT, '.venv', 'Scripts', 'python.exe')];
    for (const c of candidates) if (fs.existsSync(c)) return c;
    return process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  }

  setStatus(status) {
    this.status = status;
    this.emit('status', this.getStatus());
  }

  startWorker() {
    const pyBin = this.resolvePythonBin();
    logger.info(`Khởi động ZeroTTS bằng ${pyBin}`);
    this.setStatus('loading');
    try {
      this.proc = spawn(pyBin, [path.join(ROOT, 'tts_worker.py')], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    } catch (err) {
      logger.warn(`Cannot spawn TTS worker: ${err.message}`);
      this.setStatus('unavailable');
      return;
    }
    this.proc.on('error', (err) => {
      logger.warn(`Không có ZeroTTS (${err.message}) — dùng giọng Việt của trình duyệt (Edge: Hoài My)`);
      this.ready = false;
      this.setStatus('unavailable');
    });
    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';
      for (const line of lines) if (line.trim()) this.handleWorkerLine(line.trim());
    });
    this.proc.stderr.on('data', (chunk) => {
      const msg = chunk.toString('utf8').trim();
      if (msg) logger.debug(msg.slice(0, 400));
    });
    this.proc.on('exit', (code) => {
      if (this.status !== 'unavailable') logger.warn(`ZeroTTS dừng (mã ${code}) — dùng giọng Việt của trình duyệt (Edge: Hoài My)`);
      this.ready = false;
      this.proc = null;
      if (this.status !== 'unavailable') this.setStatus('stopped');
      for (const [, item] of this.pending) {
        clearTimeout(item.timer);
        item.resolve({ ok: false, error: 'ZeroTTS worker exited' });
      }
      this.pending.clear();
    });
  }

  handleWorkerLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (_) {
      logger.debug(`worker: ${line.slice(0, 200)}`);
      return;
    }
    if (msg.type === 'status') {
      this.model = msg.model || this.model;
      this.setStatus(msg.status);
    } else if (msg.type === 'ready') {
      this.ready = true;
      this.voices = msg.voices || this.voices;
      this.model = msg.model || this.model;
      logger.info(`ZeroTTS ready in ${msg.loadSec}s (voices: ${this.voices.join(', ')})`);
      this.setStatus('ready');
    } else if (msg.type === 'result' && msg.id != null) {
      const entry = this.pending.get(msg.id);
      if (entry) {
        clearTimeout(entry.timer);
        this.pending.delete(msg.id);
        entry.resolve(msg);
      }
    } else if (msg.type === 'error') {
      logger.error(`ZeroTTS: ${msg.error}`);
      this.setStatus('error');
    }
  }

  getStatus() {
    return { ready: this.ready, status: this.status, engine: 'ZeroTTS', voice: this.getVoice(), voices: this.voices, model: this.model };
  }

  synthesize(text, voiceOverride) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return Promise.resolve({ ok: false, error: 'Empty text' });
    const voice = String(voiceOverride || this.getVoice() || 'maichi').toLowerCase();
    const key = `${voice}::${cleanText}`;
    if (this.inflight.has(key)) return this.inflight.get(key);
    const promise = new Promise((resolve) => {
      if (!this.proc || !this.ready) return resolve({ ok: false, error: `ZeroTTS status: ${this.status}` });
      const id = ++this.reqCounter;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ok: false, error: 'ZeroTTS synthesis timeout' });
      }, 30000);
      this.pending.set(id, { resolve, timer });
      this.proc.stdin.write(JSON.stringify({ id, text: cleanText, voice }) + '\n');
    }).finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  stop() {
    if (this.proc) {
      try {
        this.proc.kill();
      } catch (_) {}
    }
  }
}

module.exports = { ZeroTTSManager };

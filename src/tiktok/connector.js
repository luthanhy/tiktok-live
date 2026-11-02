/**
 * TikTok Live connection manager.
 * Connection flow, username/URL resolving and event wiring are preserved from the
 * original temple project; output is now a stream of normalized events.
 */
const { EventEmitter } = require('events');
const normalize = require('./normalizer');
const logger = require('../core/logger').child('tiktok');

let Connector = null;
try {
  Connector = require('tiktok-live-connector');
} catch (err) {
  logger.error(`tiktok-live-connector not available: ${err.message}`);
}

async function resolveTikTokUsername(rawInput, fetchImpl = globalThis.fetch) {
  const input = String(rawInput || '').trim();
  if (!input) throw new Error('Vui lòng nhập @username hoặc link TikTok Live cần kết nối');
  if (input.startsWith('http://') || input.startsWith('https://') || input.includes('tiktok.com/')) {
    const urlToFetch = input.startsWith('http') ? input : `https://${input}`;
    const direct = urlToFetch.match(/tiktok\.com\/@([^/?#]+)/i);
    if (direct?.[1]) return direct[1];
    try {
      const resp = await fetchImpl(urlToFetch, { redirect: 'follow' });
      const resolved = String(resp.url || '').match(/tiktok\.com\/@([^/?#]+)/i);
      if (resolved?.[1]) return resolved[1];
    } catch (e) {
      logger.warn(`URL resolve failed: ${e.message}`);
    }
  }
  return input.replace(/^@/, '').split(/[/?#]/)[0].trim();
}

class TikTokLiveManager extends EventEmitter {
  constructor() {
    super();
    this.conn = null;
    this.combos = new normalize.GiftComboTracker();
    this.status = { connected: false, connecting: false, username: '', roomId: null, viewerCount: 0, lastError: null, connectedAt: null, eventsReceived: 0 };
  }

  setStatus(patch) {
    Object.assign(this.status, patch);
    this.emit('status', { ...this.status });
  }

  publish(evt) {
    if (!evt) return;
    this.status.eventsReceived += 1;
    this.emit('event', evt);
  }

  async connect(usernameOrUrl) {
    if (!Connector) throw new Error('Thư viện tiktok-live-connector chưa được cài đặt (chạy bun install)');
    const username = await resolveTikTokUsername(usernameOrUrl);
    if (!username) throw new Error('Không tìm thấy @username hợp lệ');
    await this.disconnect();
    this.combos.clear();
    this.setStatus({ connected: false, connecting: true, username, roomId: null, viewerCount: 0, lastError: null });

    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = Connector;
    const conn = new TikTokLiveConnection(username, {
      processInitialData: false,
      fetchRoomInfoOnConnect: false,
      enableExtendedGiftInfo: false
    });
    this.conn = conn;

    // With fetchRoomInfoOnConnect:false (kept from the original for reliability) the connector
    // happily "connects" to a stale room of an offline account. Ask TikTok first; if the check
    // itself fails we fall through to the original connect path.
    let isLive = null;
    try {
      if (typeof conn.fetchIsLive === 'function') isLive = await conn.fetchIsLive();
    } catch (err) {
      logger.debug(`Live pre-check unavailable for @${username}: ${err.message}`);
    }
    if (isLive === false) {
      const msg = `@${username} hiện không phát Live`;
      this.setStatus({ connected: false, connecting: false, lastError: msg });
      if (this.conn === conn) this.conn = null;
      throw new Error(msg);
    }

    conn.on(ControlEvent.CONNECTED, (roomState) => {
      this.setStatus({ connected: true, connecting: false, roomId: roomState?.roomId || conn.roomId || null, lastError: null, connectedAt: new Date().toISOString() });
      logger.info(`Connected to @${username} (room ${this.status.roomId})`);
    });
    conn.on(ControlEvent.DISCONNECTED, () => {
      if (this.conn !== conn) return;
      this.setStatus({ connected: false, connecting: false });
      logger.info(`Disconnected from @${username}`);
    });
    conn.on(ControlEvent.ERROR, (err) => {
      const msg = err?.message || err?.info || String(err);
      this.setStatus({ lastError: msg });
      logger.warn(`Connector error: ${msg}`);
    });
    conn.on(WebcastEvent.STREAM_END, () => {
      this.setStatus({ connected: false, connecting: false, lastError: 'Phiên Live đã kết thúc' });
      logger.info('Stream ended');
    });
    conn.on(WebcastEvent.ROOM_USER, (data) => {
      const viewerCount = Number(data?.viewerCount ?? data?.total ?? 0);
      if (viewerCount > 0) this.setStatus({ viewerCount });
    });

    const safe = (fn) => (data) => {
      try {
        this.publish(fn(data));
      } catch (err) {
        logger.error(`Failed to normalize event: ${err.message}`);
      }
    };
    conn.on(WebcastEvent.CHAT, safe(normalize.chat));
    conn.on(WebcastEvent.LIKE, safe(normalize.like));
    conn.on(WebcastEvent.MEMBER, safe(normalize.member));
    conn.on(WebcastEvent.FOLLOW, safe(normalize.follow));
    conn.on(WebcastEvent.SHARE, safe(normalize.share));
    // SOCIAL duplicates FOLLOW/SHARE on some connector versions; anti-spam dedups the overlap.
    conn.on(WebcastEvent.SOCIAL, safe(normalize.social));
    conn.on(WebcastEvent.GIFT, safe((d) => this.combos.normalize(d)));

    try {
      const roomState = await conn.connect();
      this.setStatus({ connected: true, connecting: false, roomId: roomState?.roomId || conn.roomId || null, connectedAt: new Date().toISOString() });
      return { ...this.status };
    } catch (err) {
      const msg = err?.message || 'Không thể kết nối phòng Live (tài khoản có đang phát Live không?)';
      this.setStatus({ connected: false, connecting: false, lastError: msg });
      if (this.conn === conn) this.conn = null;
      throw new Error(msg);
    }
  }

  async disconnect() {
    const conn = this.conn;
    this.conn = null;
    if (conn) {
      try {
        await conn.disconnect();
      } catch (_) {}
    }
    this.setStatus({ connected: false, connecting: false, viewerCount: 0 });
    return { ...this.status };
  }
}

module.exports = { TikTokLiveManager, resolveTikTokUsername };

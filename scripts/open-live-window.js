/**
 * Opens the stage as a phone-shaped (9:16) app window for TikTok LIVE Studio "Window capture":
 *   npm run live
 *
 * - Microsoft Edge first: it ships Vietnamese natural voices (Hoài My / Nam Minh) for the MC.
 * - Window height = screen height, width = height × 9/16, so the capture fills a vertical LIVE exactly.
 * - Autoplay is allowed, so the wedding music and voice start without clicking.
 * - Its own browser profile keeps it separate from your normal browsing.
 * Options: --port 3000 --height 1080 --browser chrome --landscape
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const port = Number(opt('port', process.env.PORT || 3000));
const landscape = args.includes('--landscape');

function screenHeight() {
  if (process.platform !== 'win32') return 1080;
  try {
    const out = execSync('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea.Height"', { encoding: 'utf8' });
    return Number(out.trim()) || 1040;
  } catch (_) {
    return 1040;
  }
}

const BROWSERS = {
  edge: ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/microsoft-edge'],
  chrome: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome']
};
const order = opt('browser', 'edge') === 'chrome' ? ['chrome', 'edge'] : ['edge', 'chrome'];
const exe = order.flatMap((b) => BROWSERS[b]).find((p) => p && fs.existsSync(p));
if (!exe) {
  console.error('Không tìm thấy Microsoft Edge hoặc Google Chrome.');
  process.exit(1);
}

const height = Number(opt('height', screenHeight()));
const width = landscape ? Math.round((height * 16) / 9) : Math.round((height * 9) / 16);
const url = `http://localhost:${port}/?obs=1${landscape ? '&layout=landscape' : ''}`;
const profile = path.join(os.tmpdir(), 'dam-cuoi-live-window');

spawn(exe, [`--app=${url}`, `--window-size=${width},${height}`, '--window-position=0,0', '--autoplay-policy=no-user-gesture-required', `--user-data-dir=${profile}`, '--no-first-run', '--lang=vi'], { detached: true, stdio: 'ignore' }).unref();

console.log(`Đã mở cửa sổ ${landscape ? 'ngang 16:9' : 'dọc 9:16'} ${width}×${height} bằng ${path.basename(exe)}: ${url}`);
console.log('Trong TikTok LIVE Studio: Add source → Window capture → chọn cửa sổ "Đám Cưới Live – Ngày Chung Đôi", rồi kéo khung cho kín màn hình dọc.');

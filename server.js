/**
 * 💍 ĐÁM CƯỚI LIVE – NGÀY CHUNG ĐÔI
 * Đám cưới tương tác thuần Việt cho TikTok LIVE — điểm khởi động máy chủ.
 * Chạy: `npm run start:node` (hoặc `bun start`).
 */
const { createApp } = require('./src/app');
const logger = require('./src/core/logger');

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  const wedding = createApp({ port: PORT });
  const port = await wedding.listen(PORT);
  const line = '='.repeat(64);
  console.log(line);
  console.log('💍 ĐÁM CƯỚI LIVE – NGÀY CHUNG ĐÔI');
  console.log(`📱 Sân khấu để live (dọc 9:16) : http://localhost:${port}/?obs=1`);
  console.log(`📺 Sân khấu có nút chạy thử    : http://localhost:${port}/`);
  console.log(`🎛️  Trang quản lý               : http://localhost:${port}/admin`);
  console.log(`🔌 JSON-RPC 2.0                : POST http://localhost:${port}/rpc  ·  ws://localhost:${port}/ws`);
  console.log('👉 Mở cửa sổ dọc cho TikTok LIVE Studio: npm run live');
  console.log(line);

  const channel = process.env.TIKTOK_USER || (wedding.config.wedding.tiktok?.autoConnect ? wedding.config.wedding.tiktok.username : '');
  if (channel) {
    wedding.tiktok.connect(channel).catch((err) => logger.warn(`Tự kết nối @${channel} thất bại: ${err.message}`));
  }

  const shutdown = async () => {
    logger.info('Đang tắt máy chủ…');
    await wedding.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

process.on('unhandledRejection', (err) => logger.error(`Unhandled rejection: ${err?.message || err}`));

main().catch((err) => {
  logger.error(`Fatal: ${err.stack || err.message}`);
  process.exit(1);
});

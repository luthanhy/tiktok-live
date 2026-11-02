/**
 * 💍 WEDDING LIVE – THE BIG DAY
 * TikTok Live interactive wedding — server entry point.
 * Run with `bun start` (or `node server.js`).
 */
const { createApp } = require('./src/app');
const logger = require('./src/core/logger');

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  const wedding = createApp({ port: PORT });
  const port = await wedding.listen(PORT);
  const line = '='.repeat(64);
  console.log(line);
  console.log('💍 WEDDING LIVE – THE BIG DAY');
  console.log(`📺 Stage (1920×1080)    : http://localhost:${port}/`);
  console.log(`🎥 OBS clean source     : http://localhost:${port}/?obs=1`);
  console.log(`🎛️  Admin dashboard      : http://localhost:${port}/admin`);
  console.log(`🔌 JSON-RPC 2.0          : POST http://localhost:${port}/rpc  ·  ws://localhost:${port}/ws`);
  console.log(line);

  const channel = process.env.TIKTOK_USER || (wedding.config.wedding.tiktok?.autoConnect ? wedding.config.wedding.tiktok.username : '');
  if (channel) {
    wedding.tiktok.connect(channel).catch((err) => logger.warn(`Auto-connect @${channel} failed: ${err.message}`));
  }

  const shutdown = async () => {
    logger.info('Shutting down…');
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

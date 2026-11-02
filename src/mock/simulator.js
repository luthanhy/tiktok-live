/**
 * Mock TikTok event generator.
 * Produces the same normalized events as src/tiktok/normalizer.js so the whole
 * pipeline (anti-spam → engine → queue → stage) can be exercised without a live room.
 */
const VIEWERS = [
  { id: 'ngocanh.98', name: 'Ngọc Anh' },
  { id: 'minhquan_bds', name: 'Trần Minh Quân' },
  { id: 'thao.vy', name: 'Thảo Vy' },
  { id: 'hoangnam.dev', name: 'Lê Hoàng Nam' },
  { id: 'thanhha.rose', name: 'Phạm Thanh Hà' },
  { id: 'ducthinh88', name: 'Vũ Đức Thịnh' },
  { id: 'khanhlinh', name: 'Khánh Linh' },
  { id: 'baotran.2k', name: 'Bảo Trân' },
  { id: 'quanghuy', name: 'Quang Huy' },
  { id: 'mylinh_xinh', name: 'Mỹ Linh' },
  { id: 'tuananh.music', name: 'Tuấn Anh' },
  { id: 'phuongthao', name: 'Phương Thảo' },
  { id: 'giahan', name: 'Gia Hân' },
  { id: 'kimngan', name: 'Kim Ngân' },
  { id: 'ducanh', name: 'Đức Anh' },
  { id: 'hoaimy', name: 'Hoài My' },
  { id: 'trungkien', name: 'Trung Kiên' },
  { id: 'lananh', name: 'Lan Anh' }
];

const WISHES = [
  'Chúc hai bạn trăm năm hạnh phúc',
  'Chúc mừng hạnh phúc cô dâu chú rể',
  'Bách niên giai lão nha hai bạn',
  'Chúc hai bạn mãi yêu thương nhau',
  'Cô dâu xinh quá trời luôn',
  'Chúc mừng đám cưới, sớm có em bé nha',
  'Chúc mừng ngày vui của hai bạn',
  'Mừng hai họ thêm dâu thêm rể',
  'Rước dâu đẹp quá trời',
  'Chúc gia đình nhỏ luôn ấm êm',
  'Hôn đi hôn đi',
  'Cho mình chụp ảnh với cô dâu',
  'Dzô trăm phần trăm',
  'Nhảy đi mọi người ơi'
];

const GIFTS = [
  { id: 5655, name: 'Rose', diamonds: 1, weight: 40 },
  { id: 7934, name: 'Heart Me', diamonds: 1, weight: 18 },
  { id: 5487, name: 'Finger Heart', diamonds: 5, weight: 12 },
  { id: 5658, name: 'Perfume', diamonds: 20, weight: 10 },
  { id: 5879, name: 'Doughnut', diamonds: 30, weight: 7 },
  { id: 11046, name: 'Galaxy', diamonds: 1000, weight: 2 },
  { id: 6369, name: 'Lion', diamonds: 29999, weight: 0.4 },
  { id: 7312, name: 'Universe', diamonds: 34999, weight: 0.3 },
  { id: 9999, name: 'Hand Wave', diamonds: 150, weight: 3 }
];

function pick(arr, rand = Math.random) {
  return arr[Math.floor(rand() * arr.length)];
}

function weighted(arr, rand = Math.random) {
  const total = arr.reduce((s, x) => s + x.weight, 0);
  let r = rand() * total;
  for (const x of arr) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return arr[arr.length - 1];
}

const CROWD_FIRST = ['Anh', 'Bảo', 'Châu', 'Dung', 'Giang', 'Hà', 'Hải', 'Hương', 'Khoa', 'Lan', 'Linh', 'Long', 'Mai', 'Minh', 'Nam', 'Ngọc', 'Phúc', 'Quân', 'Thảo', 'Trang', 'Tú', 'Vy', 'Yến'];

function makeUser(seed, rand = Math.random) {
  const v = seed ? VIEWERS.find((x) => x.id === seed || x.name === seed) || { id: String(seed), name: String(seed) } : pick(VIEWERS, rand);
  return { ...v, avatar: '' };
}

/** One of `size` synthetic viewers — a big room has hundreds of distinct people. */
function crowdUser(size = 600, rand = Math.random) {
  const n = Math.floor(rand() * size);
  return { id: `viewer_${n}`, name: `${CROWD_FIRST[n % CROWD_FIRST.length]} ${100 + n}`, avatar: '' };
}

/** Build one mock event. `type` may be omitted for a weighted random event. */
function mockEvent(opts = {}, rand = Math.random) {
  if (opts.crowd) return { ...mockEvent({ ...opts, crowd: false, user: undefined }, rand), user: crowdUser(opts.crowd, rand) };
  let type = opts.type;
  if (!type) {
    const r = rand();
    type = r < 0.45 ? 'like' : r < 0.65 ? 'comment' : r < 0.85 ? 'gift' : r < 0.94 ? 'follow' : 'share';
  }
  const user = makeUser(opts.user, rand);
  const base = { type, user, source: 'mock' };
  switch (type) {
    case 'like':
      return { ...base, count: Number(opts.count) || 1 + Math.floor(rand() * 15) };
    case 'comment':
      return { ...base, text: opts.text || pick(WISHES, rand) };
    case 'gift': {
      let g = opts.gift ? GIFTS.find((x) => String(x.name).toLowerCase() === String(opts.gift).toLowerCase() || x.id === Number(opts.gift)) : null;
      if (!g && opts.gift) g = { id: 0, name: String(opts.gift), diamonds: Number(opts.diamonds) || 1 };
      if (!g) g = weighted(GIFTS, rand);
      return { ...base, gift: { id: g.id, name: g.name, diamonds: Number(opts.diamonds) || g.diamonds, count: Number(opts.count) || (g.diamonds <= 5 ? 1 + Math.floor(rand() * 5) : 1) } };
    }
    case 'follow':
    case 'share':
    case 'join':
      return base;
    default:
      throw new Error(`Unknown mock event type: ${type}`);
  }
}

class MockSimulator {
  constructor({ publish, logger }) {
    this.publish = publish;
    this.logger = logger;
    this.timer = null;
    this.intervalMs = 2500;
  }

  get running() {
    return Boolean(this.timer);
  }

  emit(opts) {
    const evt = mockEvent(opts);
    this.publish(evt);
    return evt;
  }

  /** Fire `count` random events as fast as possible (stress test). */
  burst(count = 50, opts = {}) {
    const n = Math.max(1, Math.min(2000, Number(count) || 50));
    const types = {};
    for (let i = 0; i < n; i++) {
      const evt = mockEvent({ ...opts, user: opts.user || undefined });
      types[evt.type] = (types[evt.type] || 0) + 1;
      this.publish(evt);
    }
    return { count: n, types };
  }

  /**
   * Sustained load: `eventsPerSec` random events from a 600-person synthetic crowd for
   * `durationSec` seconds (stress-testing 10 / 100 / 1000 events per second).
   */
  setRate(eventsPerSec, durationSec = 10) {
    if (this.rateTimer) clearInterval(this.rateTimer);
    this.rateTimer = null;
    this.rate = null;
    const rps = Math.max(0, Math.min(5000, Number(eventsPerSec) || 0));
    if (!rps) return this.status();
    const tickMs = 50;
    const startedAt = Date.now();
    const endsAt = startedAt + Math.max(1, Number(durationSec) || 10) * 1000;
    this.rate = { eventsPerSec: rps, endsAt, sent: 0 };
    // Time-based: each tick catches up to rate × elapsed, so timer jitter never lowers the real rate.
    this.rateTimer = setInterval(() => {
      const now = Math.min(Date.now(), endsAt);
      const due = Math.floor((rps * (now - startedAt)) / 1000) - this.rate.sent;
      for (let i = 0; i < due; i++) this.publish(mockEvent({ crowd: 600 }));
      this.rate.sent += Math.max(0, due);
      if (now >= endsAt) {
        this.logger?.info(`Mock rate finished: ${this.rate.sent} events`);
        clearInterval(this.rateTimer);
        this.rateTimer = null;
        this.lastRate = { ...this.rate };
        this.rate = null;
      }
    }, tickMs);
    this.logger?.info(`Mock rate ON: ${rps} events/s for ${durationSec}s`);
    return this.status();
  }

  status() {
    return {
      running: this.running,
      intervalMs: this.intervalMs,
      rate: this.rate ? { eventsPerSec: this.rate.eventsPerSec, sent: this.rate.sent, remainingSec: Math.max(0, Math.round((this.rate.endsAt - Date.now()) / 1000)) } : null,
      lastRate: this.lastRate || null
    };
  }

  setAuto(enabled, intervalMs) {
    if (intervalMs) this.intervalMs = Math.max(200, Number(intervalMs));
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (enabled) {
      this.timer = setInterval(() => {
        // Natural-looking traffic: a few events per tick.
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.emit({});
      }, this.intervalMs);
      this.logger?.info(`Mock auto-simulation ON (${this.intervalMs}ms)`);
    } else {
      this.logger?.info('Mock auto-simulation OFF');
    }
    return this.status();
  }
}

module.exports = { MockSimulator, mockEvent, MOCK_GIFTS: GIFTS, MOCK_VIEWERS: VIEWERS };

/**
 * MC announcer — the Vietnamese lines the stage reads aloud for viewer events.
 *
 * Every gift, follow, share, comment and (now and then) arrival gets a spoken line, picked
 * from several phrasings so the MC never sounds like a loop. Lines share one spacing gap so
 * a busy room is read at a natural pace instead of a flood; big gifts skip the gap.
 *
 * Config: wedding.announcer { enabled, minGapMs, gifts, follows, shares, joins, joinGapMs }
 * and wedding.comments.readAloud.mode ('all' | 'wishes' | 'off').
 */
const LINES = {
  gift: [
    'Cảm ơn {name} đã tặng {gift} cho cô dâu chú rể!',
    '{name} vừa gửi {gift}, cảm ơn bạn nhiều nha!',
    'Ôi, {gift} từ {name}! Cô dâu chú rể cảm ơn bạn!',
    'Xin cảm ơn {name} với {gift} thật dễ thương!'
  ],
  bigGift: [
    'Ôi trời ơi! {name} đã tặng {gift}! Cả khán phòng cùng vỗ tay cảm ơn {name} nào!',
    'Xin trân trọng cảm ơn {name} đã gửi tặng {gift} mừng hạnh phúc đôi uyên ương!',
    'Tuyệt vời quá! {gift} từ {name}! Chúc {name} luôn may mắn và thật nhiều niềm vui!',
    'Cả hai họ xin cảm ơn {name} vì món quà {gift} quá đỗi chân tình!'
  ],
  follow: [
    'Cảm ơn {name} đã theo dõi! Mời {name} vào dự tiệc cưới!',
    'Chào mừng {name} gia nhập đại gia đình nhà mình!',
    '{name} vừa theo dõi, thêm một vị khách quý tới chung vui!'
  ],
  share: [
    'Cảm ơn {name} đã chia sẻ đám cưới tới mọi người!',
    '{name} vừa chia sẻ buổi live, cảm ơn bạn nhiều nha!',
    'Có {name} chia sẻ, đám cưới thêm đông vui rồi!'
  ],
  join: [
    'Chào mừng {name} đã tới dự đám cưới!',
    'Xin chào {name}, mời bạn vào ghế ngồi chung vui nhé!',
    '{name} đã tới rồi, mời bạn thả tim chúc mừng cô dâu chú rể nha!'
  ],
  wish: ['{name} chúc: {text}', '{name} gửi lời chúc: {text}'],
  comment: ['{name} nói: {text}', '{name} bảo: {text}']
};

/**
 * What the MC says when the room has gone quiet: an invitation that tells new viewers what
 * to do right now. Chapter-specific lines first, then general ones.
 */
const IDLE = {
  preparation: ['Rạp cưới còn thiếu hoa! Cả nhà tặng một bông hồng để trang trí giúp nhà trai nhé!', 'Ai mới vào thì bấm theo dõi để được mời vào ghế khách quý nha!'],
  bride_entrance: ['Cô dâu sắp bước ra rồi! Cả nhà thả tim thật nhiều để cổ vũ cô dâu nào!', 'Gõ "cô dâu đẹp quá" để khen cô dâu một câu đi cả nhà ơi!'],
  ceremony: ['Hai họ đang làm lễ gia tiên. Cả nhà gửi một lời chúc để cùng chứng giám nhé!', 'Gõ "chúc mừng hạnh phúc" để lời chúc của bạn bay lên sân khấu!'],
  ring_exchange: ['Nhẫn cưới đang chờ được trao! Cả nhà tặng quà để lấp đầy thanh Nhẫn cưới nào!', 'Chỉ cần một món quà nhỏ là cô dâu chú rể tiến gần tới lúc trao nhẫn rồi!'],
  kiss: ['Gõ "hôn đi" thật nhiều để cô dâu chú rể trao nhau nụ hôn nào!', 'Cả nhà ơi, hô "hôn đi, hôn đi" cùng MC nào!'],
  reception: ['Tiệc cưới bắt đầu rồi! Gõ "dzô" để cùng nâng ly, gõ "nhảy" để cả nhà lên sân khấu!', 'Tặng bánh để cắt bánh cưới, gõ "chụp ảnh" để chụp hình lưu niệm với cô dâu chú rể!'],
  finale: ['Cảm ơn cả nhà đã tới chung vui! Thả tim và chia sẻ để đám cưới thêm đông vui nhé!', 'Ai chưa gửi lời chúc thì gõ ngay một câu chúc cho đôi uyên ương nha!'],
  any: [
    'Phòng live đang hơi yên ắng nha! Cả nhà thả tim để tăng niềm vui cho đám cưới nào!',
    'Gõ tên một con vật như "con đà điểu" hay "con voi", nó sẽ chạy vào đám cưới đó!',
    'Mỗi bình luận của bạn sẽ được MC đọc to và hiện trên đầu khách mời đó nha!',
    'Ai tặng quà nhiều nhất sẽ lên Bảng Vàng Khách Quý, cả nhà ơi!'
  ]
};

/** TikTok handles like "thao.vy_99" read badly: speak separators as spaces. */
function speakableName(name) {
  const s = String(name || '').replace(/[._\-@#]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s || 'một vị khách';
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

class Announcer {
  constructor({ clock = Date.now, getConfig = () => ({}), random = Math.random } = {}) {
    this.clock = clock;
    this.getConfig = getConfig;
    this.random = random;
    this.lastAt = -Infinity;
    this.lastJoinAt = -Infinity;
    this.lastPick = {};
  }

  get cfg() {
    return this.getConfig() || {};
  }

  pick(kind) {
    const list = LINES[kind];
    let i = Math.floor(this.random() * list.length);
    if (list.length > 1 && i === this.lastPick[kind]) i = (i + 1) % list.length; // never the same phrase twice in a row
    this.lastPick[kind] = i;
    return list[i];
  }

  /** Returns the line to read, or '' when it should stay silent (disabled or too soon). */
  say(kind, vars = {}, { force = false } = {}) {
    const a = this.cfg.announcer || {};
    if (a.enabled === false) return '';
    const now = this.clock();
    if (!force && now - this.lastAt < (a.minGapMs ?? 2500)) return '';
    this.lastAt = now;
    return fill(this.pick(kind), { ...vars, name: speakableName(vars.name) });
  }

  gift({ name, gift, big }) {
    if ((this.cfg.announcer || {}).gifts === false) return '';
    return this.say(big ? 'bigGift' : 'gift', { name, gift }, { force: big });
  }

  follow(name) {
    return (this.cfg.announcer || {}).follows === false ? '' : this.say('follow', { name });
  }

  share(name) {
    return (this.cfg.announcer || {}).shares === false ? '' : this.say('share', { name });
  }

  /** Arrivals are frequent: welcome at most one viewer per joinGapMs. */
  join(name) {
    const a = this.cfg.announcer || {};
    if (a.joins === false) return '';
    const now = this.clock();
    if (now - this.lastJoinAt < (a.joinGapMs ?? 20000)) return '';
    const line = this.say('join', { name });
    if (line) this.lastJoinAt = now;
    return line;
  }

  /**
   * Invitation for a quiet room (no viewer activity for announcer.idlePromptSec). Alternates
   * between a line for the current chapter and a general one, never repeating back to back.
   * Returns '' when disabled or not due yet.
   */
  idle(chapterId, { lastActivityAt }) {
    const a = this.cfg.announcer || {};
    const gapMs = Number(a.idlePromptSec ?? 40) * 1000;
    if (a.enabled === false || !(gapMs > 0)) return '';
    const now = this.clock();
    if (now - Math.max(lastActivityAt, this.lastIdleAt ?? -Infinity, this.lastAt) < gapMs) return '';
    this.lastIdleAt = now;
    this.lastAt = now;
    this.idleCount = (this.idleCount || 0) + 1;
    const pool = IDLE[chapterId] && this.idleCount % 2 ? IDLE[chapterId] : IDLE.any;
    const key = `idle:${pool === IDLE.any ? 'any' : chapterId}`;
    let i = Math.floor(this.random() * pool.length);
    if (pool.length > 1 && i === this.lastPick[key]) i = (i + 1) % pool.length;
    this.lastPick[key] = i;
    return pool[i];
  }

  comment({ name, text, wish }) {
    const mode = this.cfg.comments?.readAloud?.mode || 'all';
    if (mode === 'off' || (mode === 'wishes' && !wish)) return '';
    return this.say(wish ? 'wish' : 'comment', { name, text });
  }
}

module.exports = { Announcer, LINES, IDLE, speakableName };

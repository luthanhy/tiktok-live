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

  comment({ name, text, wish }) {
    const mode = this.cfg.comments?.readAloud?.mode || 'all';
    if (mode === 'off' || (mode === 'wishes' && !wish)) return '';
    return this.say(wish ? 'wish' : 'comment', { name, text });
  }
}

module.exports = { Announcer, LINES, speakableName };

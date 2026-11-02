/**
 * DOM overlays for cinematic moments. Pure presentation: no game logic here.
 */
import { escapeHtml, safeUrl, initials, wait, fmt, shortName } from '../core/util.js';
import { photoBoothSvg } from '../environments/scenes.js';

const ROLE_LABEL = {
  special_guest: 'Khách mời đặc biệt',
  gift_giver: 'Người trao quà cưới',
  flower_giver: 'Người tặng hoa',
  wisher: 'Người gửi lời chúc',
  guest: 'Khách mời'
};

export function avatarHtml(user, cls = 'av') {
  const url = safeUrl(user?.avatar);
  return url
    ? `<span class="${cls}"><img src="${escapeHtml(url)}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()"><b>${escapeHtml(initials(user?.name))}</b></span>`
    : `<span class="${cls}"><b>${escapeHtml(initials(user?.name))}</b></span>`;
}

export class Overlays {
  constructor(root, { getEffects } = {}) {
    this.root = root;
    this.getEffects = getEffects || (() => ({}));
    this.layer = root.querySelector('#overlays');
    this.worldUi = root.querySelector('#world-ui');
    this.toastStack = root.querySelector('#toasts');
    this.bannerBusy = Promise.resolve();
    this.build();
  }

  build() {
    this.layer.innerHTML = `
      <div class="letterbox top"></div><div class="letterbox bottom"></div>
      <div class="vignette"></div>
      <div class="light-beams"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="flash"></div>
      <div class="chapter-card"><div class="cc-inner"><div class="cc-num"></div><div class="cc-title"></div><div class="cc-sub"></div><div class="cc-line"></div></div></div>
      <div class="banner"><div class="banner-inner"></div></div>
      <div class="ring-closeup"><svg viewBox="0 0 300 200">
        <defs><linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4cf"/><stop offset=".5" stop-color="#e3bd6c"/><stop offset="1" stop-color="#9b712c"/></linearGradient></defs>
        <circle cx="120" cy="110" r="52" fill="none" stroke="url(#ring-g)" stroke-width="14"/>
        <circle cx="185" cy="110" r="48" fill="none" stroke="url(#ring-g)" stroke-width="11"/>
        <path d="M108 52 l12 -18 l12 18 l-12 10 z" fill="#eef8ff" stroke="#bfe0ff"/>
        <circle class="rc-glint" cx="120" cy="45" r="6" fill="#fff"/></svg></div>
      <div class="photo-booth"><div class="pb-backdrop">${photoBoothSvg()}</div><div class="polaroid"><div class="pol-photo"></div><div class="pol-caption"></div></div></div>
      <div class="summary-card"></div>
      <div class="mega-title"><div class="mt-kicker"></div><div class="mt-title"></div><div class="mt-sub"></div></div>
      <div class="float-layer"></div>
      <div class="pause-veil"><div><div class="pv-title">Intermission</div><div class="pv-sub">Đám cưới tạm dừng — quay lại ngay!</div></div></div>`;
    this.q = (s) => this.layer.querySelector(s);
  }

  fxOn(kind) {
    const e = this.getEffects() || {};
    return e[kind] !== false;
  }

  letterbox(on) {
    if (!this.fxOn('cinematicTransitions')) on = false;
    this.root.classList.toggle('cinematic', Boolean(on));
  }

  flash(color = '#fff', ms = 700) {
    const f = this.q('.flash');
    f.style.setProperty('--flash', color);
    f.style.setProperty('--flash-ms', `${ms}ms`);
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
  }

  beams(on, { tint = 'gold' } = {}) {
    const b = this.q('.light-beams');
    b.dataset.tint = tint;
    b.classList.toggle('on', Boolean(on) && this.fxOn('lightBeams'));
  }

  async beamPulse(ms = 4000, tint = 'gold') {
    this.beams(true, { tint });
    await wait(ms);
    this.beams(false);
  }

  async chapterCard(ch, ms = 3600) {
    const card = this.q('.chapter-card');
    card.querySelector('.cc-num').textContent = `Chapter ${ch.order}`;
    card.querySelector('.cc-title').textContent = ch.title;
    card.querySelector('.cc-sub').textContent = ch.subtitle || '';
    card.classList.add('show');
    await wait(ms);
    card.classList.remove('show');
  }

  /** Banners are serialized so two big announcements never overlap. */
  banner({ kicker = '', title = '', sub = '', user = null, style = 'gold', ms = 3800 } = {}) {
    this.bannerBusy = this.bannerBusy.then(async () => {
      const b = this.q('.banner');
      b.dataset.style = style;
      b.querySelector('.banner-inner').innerHTML = `
        ${user ? avatarHtml(user, 'banner-av') : ''}
        <div class="banner-text">${kicker ? `<div class="b-kicker">${escapeHtml(kicker)}</div>` : ''}<div class="b-title">${escapeHtml(title)}</div>${sub ? `<div class="b-sub">${escapeHtml(sub)}</div>` : ''}</div>`;
      b.classList.add('show');
      await wait(ms);
      b.classList.remove('show');
      await wait(450);
    });
    return this.bannerBusy;
  }

  toast({ user, icon = '💗', title, detail = '', points = 0, tier = '', rarity = '' }) {
    const t = document.createElement('div');
    t.className = `toast ${tier ? `tier-${tier}` : ''} ${rarity ? `rarity-${rarity}` : ''}`;
    t.innerHTML = `${avatarHtml(user, 'toast-av')}<div class="toast-body"><div class="toast-title"><span class="toast-icon">${icon}</span> <b>${escapeHtml(shortName(user?.name, 16))}</b> ${escapeHtml(title)}</div>${detail ? `<div class="toast-detail">${escapeHtml(detail)}</div>` : ''}</div>${points ? `<div class="toast-pts">+${fmt(points)}</div>` : ''}`;
    this.toastStack.prepend(t);
    while (this.toastStack.children.length > 4) this.toastStack.lastChild.remove();
    setTimeout(() => t.classList.add('out'), 4200);
    setTimeout(() => t.remove(), 4800);
  }

  /** Speech bubble that follows an actor inside the world (moves with the camera). */
  bubble(actor, text, { ms = 3200, style = '' } = {}) {
    const b = document.createElement('div');
    b.className = `bubble ${style}`;
    b.textContent = text;
    const s = actor.scaleAt(actor.y);
    b.style.transform = `translate3d(${actor.x}px, ${actor.y - 430 * s}px, 0) translate(-50%, -100%)`;
    b.style.zIndex = '2000';
    this.worldUi.appendChild(b);
    requestAnimationFrame(() => b.classList.add('show'));
    setTimeout(() => b.classList.remove('show'), ms);
    setTimeout(() => b.remove(), ms + 500);
  }

  async ringCloseup(ms = 4200) {
    const r = this.q('.ring-closeup');
    r.classList.add('show');
    await wait(ms);
    r.classList.remove('show');
  }

  async photoBooth(user, couple, ms = 4600) {
    const pb = this.q('.photo-booth');
    const url = safeUrl(user?.avatar);
    pb.querySelector('.pol-photo').innerHTML = `
      <div class="pol-people">
        <div class="pol-guest">${url ? `<img src="${escapeHtml(url)}" referrerpolicy="no-referrer" alt="">` : `<b>${escapeHtml(initials(user?.name))}</b>`}</div>
        <div class="pol-couple">💍</div>
      </div>`;
    pb.querySelector('.pol-caption').textContent = `${shortName(user?.name, 16)} ♥ ${couple?.groomName || ''} & ${couple?.brideName || ''}`;
    pb.classList.add('show');
    await wait(700);
    this.flash('#fff', 500);
    await wait(500);
    pb.classList.add('printed');
    await wait(ms);
    pb.classList.remove('show', 'printed');
  }

  /**
   * Final scoreboard. Shown large first ("THE BIG DAY IS COMPLETE"), then collapses to a
   * compact bar so the couple stays visible for the rest of the finale.
   */
  showSummary(summary, couple, { compactAfterMs = 16000 } = {}) {
    const card = this.q('.summary-card');
    clearTimeout(this.summaryTimer);
    if (!summary) {
      card.classList.remove('show', 'compact');
      return;
    }
    const stat = (v, label, icon) => `<div><span class="si">${icon}</span><b>${typeof v === 'number' ? fmt(v) : escapeHtml(v)}</b><span>${label}</span></div>`;
    const medals = ['🥇', '🥈', '🥉', '4', '5'];
    const top = (summary.top || [])
      .map((s, i) => `<li><span class="rank">${medals[i]}</span>${avatarHtml(s, 'sum-av')}<span class="nm">${escapeHtml(shortName(s.name, 16))}</span><span class="pt">${fmt(s.points)}</span></li>`)
      .join('');
    const mins = Math.max(1, Math.round((summary.durationSec || 0) / 60));
    card.innerHTML = `
      <div class="sum-kicker">Final Scoreboard · ${mins} phút</div>
      <div class="sum-names">${escapeHtml(couple?.groomName || '')} <em>&amp;</em> ${escapeHtml(couple?.brideName || '')}</div>
      <div class="sum-grid">
        ${stat(summary.love, 'Love Score', '💗')}
        ${stat(`${summary.happiness ?? 0}%`, 'Happiness', '😊')}
        ${stat(summary.gifts, 'Total Gifts', '🎁')}
        ${stat(summary.guests, 'Total Guests', '👥')}
        ${stat(summary.flowers, 'Total Flowers', '🌹')}
        ${stat(summary.comments ?? summary.wishes, 'Total Comments', '💬')}
      </div>
      <div class="sum-top-title">Top Supporters</div>
      <ol class="sum-top">${top || '<li>—</li>'}</ol>
      <div class="sum-end">THE BIG DAY IS COMPLETE</div>`;
    card.classList.remove('compact');
    card.classList.add('show');
    if (compactAfterMs) this.summaryTimer = setTimeout(() => card.classList.add('compact'), compactAfterMs);
  }

  /** Huge centre-screen announcement (WEDDING COMPLETE!, mode results…). */
  async megaTitle({ kicker = '', title = '', sub = '', style = 'gold', ms = 3800 } = {}) {
    const el = this.q('.mega-title');
    el.dataset.style = style;
    el.querySelector('.mt-kicker').textContent = kicker;
    el.querySelector('.mt-title').textContent = title;
    el.querySelector('.mt-sub').textContent = sub;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    await wait(ms);
    el.classList.remove('show');
  }

  /** A wish card that drifts up through the venue (max 3 at a time). */
  floatingWish(user, text) {
    if (!this.fxOn('floatingWishes')) return;
    const layer = this.q('.float-layer');
    if (layer.children.length >= 3) layer.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = 'float-wish';
    const x = 470 + Math.random() * 980;
    el.style.left = `${x}px`;
    el.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    el.innerHTML = `${avatarHtml(user, 'fw-av')}<div><b>${escapeHtml(shortName(user?.name, 16))}</b><p>${escapeHtml(text)}</p></div><span class="fw-heart">💌</span>`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 7000);
  }

  /** "+120 💗" pop next to the community progress bar. */
  scorePopup(points, icon = '💗') {
    if (!(points > 0)) return;
    const host = this.root.querySelector('.community-bar .cb-score');
    if (!host) return;
    const el = document.createElement('span');
    el.className = 'score-pop';
    el.textContent = `+${fmt(points)} ${icon}`;
    host.appendChild(el);
    setTimeout(() => el.remove(), 1400);
    while (host.querySelectorAll('.score-pop').length > 4) host.querySelector('.score-pop').remove();
  }

  pause(on) {
    this.root.classList.toggle('paused', Boolean(on));
  }
}

export { ROLE_LABEL };

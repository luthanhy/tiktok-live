/**
 * HUD — livestream overlay layout (1920×1080 safe zones):
 *
 *   TOP     title · couple · live/mode status
 *   LEFT    current chapter, its objective meter, chapter meters, journey
 *   RIGHT   TOP WEDDING GUESTS (top 10, medals, animated rank changes)
 *   CENTER  game world (kept clear)          MODE PANEL (top centre, only for game modes)
 *   BOTTOM  how to participate · COMMUNITY PROGRESS (chapter milestones) · counters
 *   CORNERS wishes (bottom-left) · recent events (bottom-right, see Overlays.toast)
 *
 * Read-only view of server state.
 */
import { escapeHtml, fmt, shortName, replay } from '../core/util.js';
import { avatarHtml, ROLE_LABEL } from '../effects/overlays.js';

const CHAPTER_ICONS = { preparation: '🌿', bride_entrance: '👰', ceremony: '🕊️', ring_exchange: '💍', kiss: '💋', reception: '🥂', finale: '🎆' };
const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;

export class Hud {
  constructor(root) {
    this.root = root;
    this.prev = {};
    this.build();
  }

  build() {
    this.root.querySelector('#hud').innerHTML = `
      <header class="hud-top glass">
        <div class="brand"><span class="brand-kicker">Đám Cưới Live</span><span class="brand-title">Ngày Chung Đôi</span></div>
        <div class="couple-names"><span data-k="groom"></span><i>♥</i><span data-k="bride"></span></div>
        <div class="top-right"><span class="mode-chip" data-k="mode-chip"></span><div class="live-chip"><span class="dot"></span><span data-k="live">NGOẠI TUYẾN</span><span data-k="viewers"></span></div></div>
      </header>

      <section class="mode-panel glass" data-k="mode-panel"></section>

      <aside class="panel panel-left glass">
        <div class="ch-kicker" data-k="ch-kicker"></div>
        <div class="ch-title" data-k="ch-title"></div>
        <div class="ch-sub" data-k="ch-sub"></div>
        <div class="objective">
          <div class="obj-head"><span data-k="obj-label"></span><b data-k="obj-value"></b></div>
          <div class="bar big"><i data-k="obj-bar"></i><em data-k="obj-glow"></em></div>
          <div class="obj-hint" data-k="obj-hint"></div>
        </div>
        <div class="meters" data-k="meters"></div>
        <div class="meter happy-meter"><div class="meter-head"><span>😊 Niềm vui</span><b data-k="happy-val">0</b></div><div class="bar happy"><i data-k="happy-bar"></i></div></div>
        <ol class="chapter-track"></ol>
      </aside>

      <aside class="panel panel-right glass">
        <div class="panel-title">Bảng Vàng Khách Quý</div>
        <ol class="leaderboard"></ol>
      </aside>

      <section class="wishes"></section>

      <footer class="community-bar glass">
        <div class="how-to">
          <span><i>❤️</i>Thả tim<small>+Yêu thương</small></span><span><i>➕</i>Theo dõi<small>Khách mời</small></span><span><i>💬</i>Bình luận<small>Lời chúc</small></span><span><i>🔁</i>Chia sẻ<small>Pháo giấy</small></span><span><i>🎁</i>Quà<small>Nghi lễ</small></span>
        </div>
        <div class="cb-progress">
          <div class="cb-label"><span>Tiến độ đám cưới</span><span class="cb-score"><b data-k="love">0</b> 💗</span></div>
          <div class="bar journey"><i data-k="journey-bar"></i><div class="milestones" data-k="milestones"></div></div>
        </div>
        <div class="counters">
          <div><span>👥</span><b data-k="c-guests">0</b></div>
          <div><span>🌹</span><b data-k="c-flowers">0</b></div>
          <div><span>🎁</span><b data-k="c-gifts">0</b></div>
          <div><span>💬</span><b data-k="c-comments">0</b></div>
          <div><span>💗</span><b data-k="c-likes">0</b></div>
        </div>
      </footer>`;
    this.$ = (k) => this.root.querySelector(`[data-k="${k}"]`);
  }

  setText(k, v) {
    const n = this.$(k);
    if (n && n.textContent !== String(v)) n.textContent = v;
  }

  bump(k) {
    replay(this.$(k)?.closest('div'), 'bump');
  }

  setLive(status) {
    const chip = this.root.querySelector('.live-chip');
    chip.classList.toggle('on', Boolean(status?.connected));
    chip.classList.toggle('connecting', Boolean(status?.connecting));
    this.setText('live', status?.connected ? `LIVE @${status.username}` : status?.connecting ? 'ĐANG KẾT NỐI…' : 'CHẠY THỬ');
    this.setText('viewers', status?.connected && status.viewerCount ? `👁 ${fmt(status.viewerCount)}` : '');
  }

  render(s) {
    if (!s) return;
    const p = this.prev;
    this.setText('groom', s.couple?.groomName || '');
    this.setText('bride', s.couple?.brideName || '');
    this.renderChapter(s);
    this.renderLeaderboard(s.leaderboard || []);
    this.renderCommunity(s);
    this.renderMode(s.mode);
    this.renderWishes(s.wishes || []);
    p.love = s.love;
  }

  // ---------------------------------------------------------------- left: chapter + objective
  renderChapter(s) {
    const prog = s.progress;
    const cur = prog.current;
    this.setText('ch-kicker', `Chương ${cur.order} / ${prog.count}`);
    this.setText('ch-title', cur.title);
    this.setText('ch-sub', cur.subtitle || '');
    const meters = Object.fromEntries((s.meters || []).map((m) => [m.id, m]));
    const objId = cur.objective?.meter || 'love';
    let label;
    let value;
    let pct;
    if (objId === 'love' || !meters[objId]) {
      label = prog.next ? `💗 Yêu thương → ${prog.next.subtitle}` : '💗 Điểm yêu thương';
      value = prog.next ? `${fmt(Math.max(0, prog.next.threshold - prog.pointsToNext))}/${fmt(prog.next.threshold)}` : fmt(s.love);
      pct = prog.chapterPct;
    } else {
      const m = meters[objId];
      label = `${m.icon} ${m.label}`;
      value = cur.objectiveDone ? 'Hoàn thành ✓' : `${fmt(Math.round(m.value))}/${fmt(m.max)}`;
      pct = cur.objectiveDone ? 100 : m.pct;
    }
    this.setText('obj-label', label);
    this.setText('obj-value', value);
    this.$('obj-bar').style.width = `${pct}%`;
    this.$('obj-glow').style.left = `${pct}%`;
    this.root.querySelector('.objective').classList.toggle('done', Boolean(cur.objectiveDone) && objId !== 'love');
    const lockNote = cur.requireObjective && !cur.objectiveDone && prog.next && prog.pointsToNext === 0 ? ' — đủ điểm, hãy hoàn thành mục tiêu!' : '';
    this.setText('obj-hint', `${cur.goalHint || ''}${lockNote}`);

    // other active chapter meters (cake / champagne / dance / celebration …)
    const extra = (cur.meters || []).filter((id) => id !== objId && meters[id]);
    const sig = extra.map((id) => `${id}:${meters[id].pct}:${meters[id].completions}`).join('|');
    if (sig !== this.prev.metersSig) {
      this.$('meters').innerHTML = extra
        .map((id) => {
          const m = meters[id];
          return `<div class="meter mini" data-meter="${id}"><div class="meter-head"><span>${m.icon} ${escapeHtml(m.label)}</span><b>${m.completions ? `×${m.completions}` : `${Math.round(m.pct)}%`}</b></div><div class="bar m-${id}"><i style="width:${m.pct}%"></i></div></div>`;
        })
        .join('');
      this.prev.metersSig = sig;
    }

    this.setText('happy-val', `${Math.round(s.happiness)}%`);
    this.$('happy-bar').style.width = `${(s.happiness / (s.happinessMax || 100)) * 100}%`;

    const track = this.root.querySelector('.chapter-track');
    const tsig = prog.chapters.map((c) => `${c.id}:${c.state}`).join('|');
    if (tsig !== this.prev.trackSig) {
      track.innerHTML = prog.chapters
        .map((c) => `<li class="${c.state}"><span class="ic">${CHAPTER_ICONS[c.id] || '✦'}</span><span class="nm">${escapeHtml(c.subtitle || c.title)}</span><span class="st">${c.state === 'done' ? '✓' : c.state === 'active' ? '●' : c.state === 'ready' ? '◎' : ''}</span></li>`)
        .join('');
      this.prev.trackSig = tsig;
    }
  }

  // ---------------------------------------------------------------- right: leaderboard with FLIP rank animation
  renderLeaderboard(list) {
    const sig = list.map((l) => `${l.id}:${l.points}:${l.badge}`).join('|');
    if (sig === this.prev.lbSig) return;
    this.prev.lbSig = sig;
    const ol = this.root.querySelector('.leaderboard');
    if (!list.length) {
      ol.innerHTML = '<li class="empty">Hãy là vị khách đầu tiên chúc phúc! 💐</li>';
      return;
    }
    // FLIP: remember old positions (offsetTop is unaffected by the stage scale transform)
    const before = new Map([...ol.children].map((li) => [li.dataset.id, { top: li.offsetTop, points: Number(li.dataset.points) }]));
    ol.innerHTML = list
      .map(
        (l) => `<li class="r${l.rank}${l.team ? ` team-${l.team}` : ''}" data-id="${escapeHtml(l.id)}" data-points="${l.points}">
          <span class="rank">${l.rank <= 3 ? l.badge : l.rank}</span>${avatarHtml(l, 'lb-av')}
          <span class="who"><b>${escapeHtml(shortName(l.name, 15))}</b><small>${l.rank > 3 ? `${l.badge} ` : ''}${escapeHtml(ROLE_LABEL[l.role] || '')}</small></span>
          <span class="pts">${fmt(l.points)}</span></li>`
      )
      .join('');
    for (const li of ol.children) {
      const old = before.get(li.dataset.id);
      if (!old) {
        li.classList.add('lb-new');
        continue;
      }
      const dy = old.top - li.offsetTop;
      if (dy) {
        li.style.transform = `translateY(${dy}px)`;
        li.style.transition = 'none';
        requestAnimationFrame(() => {
          li.style.transition = 'transform .6s cubic-bezier(.3,1.3,.5,1)';
          li.style.transform = '';
        });
        if (dy > 0) li.classList.add('lb-up');
      }
      if (Number(li.dataset.points) > old.points) replay(li.querySelector('.pts'), 'bump');
    }
  }

  // ---------------------------------------------------------------- bottom: community progress
  renderCommunity(s) {
    const p = this.prev;
    const prog = s.progress;
    if (p.love !== s.love) {
      this.setText('love', fmt(s.love));
      if (p.love !== undefined) replay(this.root.querySelector('.cb-score'), 'bump');
    }
    // Chapters are evenly spaced (thresholds grow fast); the fill interpolates between them.
    const chs = prog.chapters;
    const last = chs.length - 1;
    let seg = 0;
    while (seg < last && s.love >= chs[seg + 1].threshold) seg += 1;
    const span = seg < last ? Math.max(1, chs[seg + 1].threshold - chs[seg].threshold) : 1;
    const frac = seg < last ? Math.min(1, Math.max(0, (s.love - chs[seg].threshold) / span)) : 0;
    this.$('journey-bar').style.width = `${((seg + frac) / Math.max(1, last)) * 100}%`;
    const msig = chs.map((c) => `${c.id}:${c.state}`).join('|');
    if (msig !== p.msSig) {
      this.$('milestones').innerHTML = chs
        .map((c, i) => `<span class="ms ${c.state}" style="left:${(i / Math.max(1, last)) * 100}%" title="${escapeHtml(c.title)} · ${fmt(c.threshold)}">${CHAPTER_ICONS[c.id] || '✦'}</span>`)
        .join('');
      p.msSig = msig;
    }
    const c = s.counters;
    for (const k of ['guests', 'flowers', 'gifts', 'comments', 'likes']) {
      if (p[`c-${k}`] !== c[k]) {
        this.setText(`c-${k}`, fmt(c[k]));
        if (p[`c-${k}`] !== undefined) this.bump(`c-${k}`);
        p[`c-${k}`] = c[k];
      }
    }
  }

  // ---------------------------------------------------------------- mode panel
  renderMode(mode) {
    const panel = this.$('mode-panel');
    const id = mode?.id || 'classic';
    this.setText('mode-chip', id === 'classic' ? '' : mode.label);
    this.root.querySelector('.mode-chip').classList.toggle('on', id !== 'classic');
    panel.classList.toggle('show', id !== 'classic');
    if (id === 'classic') return;
    let html = '';
    if (mode.teams) {
      const [a, b] = mode.teams;
      const groom = mode.teams.find((t) => t.id === 'groom') || b;
      const bride = mode.teams.find((t) => t.id === 'bride') || a;
      const pct = groom.score + bride.score > 0 ? groom.pct : 50;
      const round = mode.round ? `<span class="mp-round">Hiệp ${mode.round} · ${fmtTime(mode.roundRemainingSec)}</span>` : `<span class="mp-round">Bình luận "cô dâu" hoặc "chú rể" để chọn phe</span>`;
      html = `<div class="mp-head"><b>${escapeHtml(mode.label)}</b>${round}</div>
        <div class="tug"><span class="t-side groom">${groom.icon} ${escapeHtml(groom.label)} <b>${fmt(groom.score)}</b>${groom.roundsWon != null ? ` <small>🏆${groom.roundsWon}</small>` : ''}</span>
        <div class="tug-bar"><i style="width:${pct}%"></i><em style="left:${pct}%">💞</em></div>
        <span class="t-side bride"><b>${fmt(bride.score)}</b> ${escapeHtml(bride.label)} ${bride.icon}${bride.roundsWon != null ? ` <small>🏆${bride.roundsWon}</small>` : ''}</span></div>`;
    } else if (id === 'wedding_rush') {
      const pct = (mode.remainingSec / Math.max(1, mode.totalSec)) * 100;
      html = `<div class="mp-head"><b>⏱ ${escapeHtml(mode.label)}</b><span class="mp-timer${mode.remainingSec < 60 ? ' urgent' : ''}">${fmtTime(mode.remainingSec)}</span></div>
        <div class="bar timer"><i style="width:${pct}%"></i></div><div class="mp-note">Đến Grand Finale trước khi hết giờ!</div>`;
    } else if (id === 'gift_battle') {
      html = `<div class="mp-head"><b>⚔️ ${escapeHtml(mode.label)} · Hiệp ${mode.round}</b><span class="mp-timer">${fmtTime(mode.roundRemainingSec)}</span></div>
        <ol class="mp-top">${(mode.roundTop || []).map((t, i) => `<li>${['🥇', '🥈', '🥉'][i]} ${escapeHtml(shortName(t.name, 12))} <b>${fmt(t.points)}</b></li>`).join('') || '<li>Ai sẽ là quán quân hiệp này?</li>'}</ol>`;
    } else if (id === 'perfect_wedding') {
      const hearts = Array.from({ length: mode.maxMistakes }, (_, i) => `<span class="${i < mode.maxMistakes - mode.mistakes ? 'on' : 'off'}">💍</span>`).join('');
      html = `<div class="mp-head"><b>✨ ${escapeHtml(mode.label)}</b><span class="mp-timer${mode.chapterRemainingSec < 30 ? ' urgent' : ''}">${fmtTime(mode.chapterRemainingSec)}</span></div>
        <div class="mp-lives">${hearts}<small>Hoàn thành chương trước khi hết giờ</small></div>`;
    }
    if (html !== this.prev.modeHtml) {
      panel.innerHTML = html;
      this.prev.modeHtml = html;
    }
  }

  renderWishes(wishes) {
    const wSig = wishes.map((w) => w.at).join('|');
    if (wSig === this.prev.wSig) return;
    this.root.querySelector('.wishes').innerHTML = wishes
      .slice(0, 2)
      .map((w, i) => `<div class="wish-card${i === 0 && this.prev.wSig !== undefined ? ' fresh' : ''}">${avatarHtml({ name: w.user, avatar: w.avatar }, 'wish-av')}<div><b>${escapeHtml(shortName(w.user, 18))}</b><p>${escapeHtml(w.text)}</p></div></div>`)
      .join('');
    this.prev.wSig = wSig;
  }
}

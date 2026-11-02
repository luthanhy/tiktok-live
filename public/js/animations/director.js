/**
 * Director — turns server actions into stage presentation without conflicts.
 *
 * Channels:
 *  - chapter   : one chapter "program" at a time (enter cinematic + idle loop, abortable)
 *  - cinematic : exclusive lock for chapter entrances, meter beats (ring exchange, cake…)
 *                and premium/large gift showpieces; requests queue FIFO (bounded)
 *  - ambient   : hearts, toasts, small gift effects — always allowed, throttled by the
 *                particle budget; while a cinematic runs they degrade to lightweight variants
 *
 * Every viewer action gets the full feedback chain:
 *   notification → score pop → meter animates (HUD) → character reacts → effect → history
 */
import { CHAPTERS, BEATS, METER_BEATS } from '../storyline/choreography.js';
import { INTERACTIONS, REACTIONS, MANUAL_EFFECTS } from './interactions.js';
import { pick } from '../core/util.js';

const MAX_CINEMATIC_QUEUE = 6;
const COMMENT_KINDS = new Set(['wish', 'kiss_cheer', 'dance', 'toast', 'photo', 'confetti']);
const RARITY_ICON = { common: '🎁', rare: '💝', epic: '💎', legendary: '👑' };
const RARITY_LABEL = { common: 'thường', rare: 'hiếm', epic: 'quý', legendary: 'huyền thoại' };

export class Director {
  constructor({ stage, fx, ov, audio, hud, variant }) {
    this.stage = stage;
    this.fx = fx;
    this.ov = ov;
    this.audio = audio;
    this.hud = hud;
    this.variant = variant;
    this.state = null;
    this.chapterId = null;
    this.chapterAbort = null;
    this.cinematicQueue = [];
    this.cinematicRunning = false;
    this.stats = { actions: 0, cinematics: 0, droppedCinematics: 0, byKind: {} };
    this.lastGuestsSig = '';
    stage.shakeEnabled = () => this.state?.effects?.cameraShake !== false;
  }

  ctx(extra = {}) {
    return {
      stage: this.stage,
      fx: this.fx,
      ov: this.ov,
      audio: this.audio,
      couple: this.state?.couple || {},
      locked: this.cinematicRunning,
      runBeat: (name) => this.runBeat(name),
      ...extra
    };
  }

  // ---------------------------------------------------------------- cinematic lock
  cinematic(label, fn, { priority = false } = {}) {
    return new Promise((resolve) => {
      const job = { label, fn, resolve };
      if (priority) this.cinematicQueue.unshift(job);
      else this.cinematicQueue.push(job);
      while (this.cinematicQueue.length > MAX_CINEMATIC_QUEUE) {
        const dropped = this.cinematicQueue.splice(priority ? this.cinematicQueue.length - 1 : 1, 1)[0];
        dropped.resolve(false);
        this.stats.droppedCinematics += 1;
      }
      this.pumpCinematic();
    });
  }

  async pumpCinematic() {
    if (this.cinematicRunning) return;
    const job = this.cinematicQueue.shift();
    if (!job) return;
    this.cinematicRunning = true;
    this.stats.cinematics += 1;
    try {
      // safety net: no cinematic may hold the stage longer than 30 s
      await Promise.race([job.fn(), new Promise((r) => setTimeout(r, 30000))]);
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(`[director] cinematic ${job.label} failed`, err);
    }
    this.cinematicRunning = false;
    job.resolve(true);
    this.pumpCinematic();
  }

  /** Run a story beat (BEATS) inside the cinematic lock. */
  runBeat(name) {
    const beat = BEATS[name];
    if (!beat) return Promise.resolve(false);
    const signal = this.chapterAbort?.signal || new AbortController().signal;
    const run = () =>
      beat(this.ctx({ signal })).catch((err) => {
        if (err?.name !== 'AbortError') console.error(`[director] beat ${name} failed`, err);
      });
    return this.cinematic(`beat:${name}`, run);
  }

  // ---------------------------------------------------------------- state
  onState(s, { initial = false } = {}) {
    const first = !this.state;
    this.state = s;
    this.hud.render(s);
    this.ov.pause(s.status === 'paused' || s.status === 'idle');
    this.stage.root.classList.toggle('fx-lite', s.effects?.particleBudget < 300);
    this.stage.root.dataset.status = s.status;
    const sig = s.guests.map((g) => `${g.id}:${g.role}:${g.team || ''}`).join('|');
    if (sig !== this.lastGuestsSig) {
      this.stage.renderGuests(s.guests);
      this.lastGuestsSig = sig;
    }
    this.updatePrepLevel(s);
    const current = s.progress.current?.id;
    if ((first || initial) && current && current !== this.chapterId) {
      // Joining mid-show (OBS reload): jump straight into the chapter without the long cinematic.
      this.startChapter(current, { quick: true, summary: s.summary, objectiveDone: s.progress.current.objectiveDone });
    }
  }

  /** Venue decorations appear as the Preparation meter fills (4 stages). */
  updatePrepLevel(s) {
    const cur = s.progress.current;
    if (cur?.id !== 'preparation') return this.stage.setPrepLevel(4);
    const m = (s.meters || []).find((x) => x.id === 'preparation');
    this.stage.setPrepLevel(cur.objectiveDone ? 4 : Math.floor((m?.pct || 0) / 25));
  }

  musicFor(id) {
    return this.variant?.music?.[id] || CHAPTERS[id]?.music;
  }

  // ---------------------------------------------------------------- chapters
  async startChapter(id, { quick = false, summary = null, chapter = null, objectiveDone = false } = {}) {
    const program = CHAPTERS[id];
    if (!program) return;
    const prev = CHAPTERS[this.chapterId];
    this.chapterAbort?.abort();
    const abort = new AbortController();
    this.chapterAbort = abort;
    this.chapterId = id;
    this.stage.root.dataset.chapter = id;
    const ctx = this.ctx({ signal: abort.signal, quick, summary, objectiveDone });
    prev?.exit?.(ctx);
    this.ov.letterbox(false);
    this.stage.root.classList.remove('dim');
    for (const w of [...this.stage.walkers]) this.stage.removeWalker(w);

    this.audio.playMusic(this.musicFor(id));
    this.fx.setAmbient({ ...program.ambient, ...(this.variant?.fx?.ambient || {}) });

    const run = async () => {
      if (!quick) this.audio.sfx('transition');
      await this.stage.setScene(program.scene, { transition: quick ? 'cut' : 'fade' });
      if (!quick && chapter) {
        this.ov.chapterCard(chapter);
        for (const s of chapter.enterSfx || []) this.audio.sfx(s);
        if (chapter.narration) this.audio.speak(chapter.narration, { priority: true });
      }
      await program.enter(ctx);
    };
    try {
      if (quick) await run();
      else await this.cinematic(`chapter:${id}`, run, { priority: true });
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('[director] chapter enter failed', err);
    }
    if (abort.signal.aborted) return;
    program.loop(this.ctx({ signal: abort.signal })).catch((err) => {
      if (err?.name !== 'AbortError') console.error('[director] chapter loop failed', err);
    });
  }

  // ---------------------------------------------------------------- actions
  onAction(a) {
    this.stats.actions += 1;
    this.stats.byKind[a.kind] = (this.stats.byKind[a.kind] || 0) + 1;
    if (a.tts && a.kind !== 'chapter') this.audio.speak(a.tts, { priority: a.kind === 'gift' && ['large', 'premium'].includes(a.gift?.tier) });
    if (COMMENT_KINDS.has(a.kind) && a.text) this.onCommentText(a);

    switch (a.kind) {
      case 'chapter':
        this.startChapter(a.chapter.id, { chapter: a.chapter, summary: a.summary });
        return;
      case 'gift':
        this.onGift(a);
        return;
      case 'meter_full':
        this.onMeterFull(a);
        return;
      case 'effect': {
        const fn = MANUAL_EFFECTS[a.effect];
        if (fn) fn(this.ctx());
        return;
      }
      case 'wish':
        this.ov.floatingWish(a.user, a.text);
        this.ov.scorePopup(5, '💌');
        break;
      case 'hearts':
        this.ov.scorePopup(a.count, '❤️');
        break;
      case 'mc_prompt': {
        // Quiet room: the MC (or a banner if the MC is off stage) invites viewers to join in.
        const mc = this.stage.cast.mc;
        if (mc && !mc.el.classList.contains('hidden') && !this.cinematicRunning) this.ov.bubble(mc, a.text, { style: 'mc', ms: 6500 });
        else this.ov.banner({ kicker: '🎤 MC mời cả nhà', title: a.text, style: 'pink', ms: 5200 });
        this.hud.flashTip?.();
        return;
      }
      case 'guest_arrival':
        this.ov.scorePopup(25, '👰');
        break;
      case 'confetti':
        this.ov.scorePopup(40, '🎉');
        break;
      default:
        break;
    }
    const fn = REACTIONS[a.kind];
    if (fn) Promise.resolve(fn(this.ctx(), a)).catch((err) => console.error(`[director] reaction ${a.kind} failed`, err));
  }

  /** Every comment gets a visible answer: a bubble over the viewer's seat, and anything it names walks in. */
  onCommentText(a) {
    const fx = this.state?.effects || {};
    if (fx.commentBubbles !== false) this.stage.guestSay(a.user?.id, a.text);
    if (fx.commentSpawns !== false && this.stage.spawns.spawnFor(a.user, a.text, a.emojis || []).length) this.audio.sfx('pop');
  }

  onMeterFull(a) {
    this.ov.scorePopup(a.bonus, a.icon || '✨');
    const beat = METER_BEATS[a.meter];
    // Beats belong to their chapter: a late "cake" fill after the reception ended just celebrates.
    const chapterMeters = this.state?.progress?.current?.meters || [];
    if (beat && (chapterMeters.includes(a.meter) || a.chapter === this.chapterId)) {
      this.runBeat(beat);
    } else {
      this.ov.banner({ kicker: a.label, title: `${a.icon || '✨'} ${a.label} đầy!`, sub: `+${a.bonus} điểm`, style: 'gold', ms: 2600 });
      this.fx.sparkles(40, { x: 960, y: 520, w: 900, h: 400 });
    }
  }

  onGift(a) {
    const { user, gift } = a;
    const icon = gift.key === 'rose' ? '🌹' : RARITY_ICON[gift.rarity] || '🎁';
    const detail = a.boost ? '⚡ Đẩy nhanh sang chương mới!' : a.note === 'cooldown' ? gift.tierLabel : `${gift.tierLabel} · ${RARITY_LABEL[gift.rarity] || gift.rarity}`;
    this.ov.toast({ user, icon, title: `tặng ${gift.count > 1 ? `${gift.count}× ` : ''}${gift.label}`, detail, points: gift.points, tier: gift.tier, rarity: gift.rarity });
    this.ov.scorePopup(gift.points, icon);
    if (a.sound) this.audio.sfx(a.sound);

    // character reaction scaled by rarity
    const { bride, groom } = this.stage.cast;
    const reactor = pick([bride, groom]);
    if (gift.rarity === 'legendary' || gift.rarity === 'epic') {
      bride.react('hop', 900);
      groom.react('hop', 900);
      this.stage.guestsReact('cheer');
    } else {
      reactor.react('hop', 900);
    }
    if (gift.rarity !== 'common' && a.note !== 'cooldown') {
      const p = this.stage.actorPoint(bride.el.classList.contains('hidden') ? groom : bride, 'hands');
      this.fx.giftExplosion(p.x, p.y, gift.rarity);
    }
    if (gift.rarity === 'legendary') {
      this.stage.shake(1.4);
      this.audio.sfx('impact');
    }
    if (a.boost) this.ov.banner({ kicker: '⚡ Tăng tốc nghi lễ', title: `${user.name} đẩy đám cưới sang chương mới!`, user, style: 'gold', ms: 3200 });

    const play = (name) => {
      const spec = INTERACTIONS[name];
      if (!spec) return;
      if (spec.cinematic) {
        this.cinematic(`gift:${name}`, () => spec.run(this.ctx({ locked: false }), a));
      } else {
        Promise.resolve(spec.run(this.ctx(), a)).catch((err) => console.error(`[director] ${name} failed`, err));
      }
    };
    play(a.interaction);
    if (a.bonusInteraction) play(a.bonusInteraction);
  }

  debug() {
    return {
      chapter: this.chapterId,
      cinematicRunning: this.cinematicRunning,
      cinematicQueue: this.cinematicQueue.map((j) => j.label),
      walkers: this.stage.walkers.size,
      ...this.stats,
      fx: this.fx.stats()
    };
  }
}

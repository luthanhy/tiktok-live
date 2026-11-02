/**
 * Viewer interaction effects (gift interactions + social reactions).
 * Each entry declares whether it is `cinematic` (needs the exclusive stage lock)
 * and a `run(ctx, payload)` that performs the presentation.
 */
import { wait, pick, rand, shortName } from '../core/util.js';

function couplePoint(stage) {
  const { bride, groom } = stage.cast;
  const s = groom.scaleAt(groom.y);
  return stage.toScreen((bride.x + groom.x) / 2, Math.min(bride.y, groom.y) - 320 * s);
}

/** A viewer walks up and hands something to the couple, then leaves. */
async function delivery(ctx, user, carry, { burst } = {}) {
  const { stage, fx, ov } = ctx;
  if (stage.walkers.size >= 3) {
    const to = couplePoint(stage);
    fx.roseFlight(1700, 1000, to.x, to.y, { count: 2 });
    return;
  }
  const side = Math.random() < 0.5 ? 'entryLeft' : 'entryRight';
  const walker = stage.spawnWalker(user, { carry, from: side });
  const target = stage.cast.bride.el.classList.contains('hidden') ? stage.cast.groom : stage.cast.bride;
  const tx = target.x + (side === 'entryLeft' ? -95 : 95);
  const ty = Math.max(target.y + 30, 740);
  walker.setPose('present');
  await walker.moveTo(tx, ty, { speed: 330 });
  walker.face(side === 'entryLeft' ? 1 : -1);
  target.react('hop', 900);
  target.setExpr('love');
  ov.bubble(walker, carry === 'rose' ? 'Tặng cô dâu nè! 🌹' : 'Quà mừng cưới! 🎁', { ms: 1800, style: 'guest' });
  const p = stage.actorPoint(target, 'hands');
  burst?.(p);
  await wait(1300);
  target.setExpr('joy');
  walker.setPose('wave');
  await walker.moveTo(stage.mark(side).x, ty + 40, { speed: 380 });
  stage.removeWalker(walker);
}

export const INTERACTIONS = {
  flower_delivery: {
    async run(ctx, { user, gift }) {
      const { fx, audio, stage } = ctx;
      audio.sfx('gift');
      const n = Math.min(gift?.count || 1, 30);
      fx.petalsFall(Math.min(80, 10 + n * 4), { side: 'top' });
      if (ctx.locked) {
        const to = couplePoint(stage);
        fx.roseFlight(rand(1300, 1800), 1050, to.x, to.y, { count: Math.min(n, 5) });
        return;
      }
      await delivery(ctx, user, 'rose', { burst: (p) => fx.petalBurst(p.x, p.y, 16 + Math.min(n, 20)) });
    }
  },
  heart_burst: {
    async run({ fx, audio, stage }, { gift }) {
      const c = couplePoint(stage);
      audio.sfx('heart');
      fx.heartBurst(c.x, c.y, Math.min(70, 20 + (gift?.count || 1) * 4));
      fx.heartsRise(12, { x: c.x, y: 1000, spread: 300 });
    }
  },
  perfume_mist: {
    async run({ fx, audio, stage }) {
      audio.sfx('sparkle');
      fx.perfumeMist(14);
      for (const a of stage.allCast()) a.setExpr('love');
      await wait(2600);
      for (const a of stage.allCast()) a.setExpr('joy');
    }
  },
  cake_delivery: {
    async run(ctx, { user }) {
      ctx.audio.sfx('gift');
      if (ctx.locked) {
        ctx.fx.sparkles(30, { ...couplePoint(ctx.stage), w: 300, h: 200 });
        return;
      }
      await delivery(ctx, user, 'cake', { burst: (p) => ctx.fx.sparkles(30, { x: p.x, y: p.y, w: 120, h: 100 }) });
    }
  },
  sparkle_shower: {
    async run({ fx, audio, stage }, { gift }) {
      audio.sfx('sparkle');
      const c = couplePoint(stage);
      fx.sparkles(Math.min(80, 24 + (gift?.count || 1) * 6), { x: c.x, y: c.y + 60, w: 520, h: 360, rise: 50 });
    }
  },
  champagne_pop: {
    async run({ fx, audio, stage }) {
      audio.sfx('champagne');
      const c = couplePoint(stage);
      fx.bubbles(c.x - 160, c.y + 220, 46);
      fx.bubbles(c.x + 160, c.y + 220, 46);
      fx.confettiCannon(c.x, c.y + 260, -90, 50, 0.7);
    }
  },
  special_dance: {
    cinematic: true,
    async run({ stage, fx, ov, audio }, { user, gift }) {
      ov.banner({ kicker: 'Quà đặc biệt', title: `${shortName(user.name, 18)} tặng ${gift.count > 1 ? `${gift.count}× ` : ''}${gift.label}`, sub: 'Phù dâu & phù rể quẩy cực sung! 💃🕺', user, style: 'pink', ms: 4200 });
      audio.sfx('fanfare');
      ov.beams(true, { tint: 'pink' });
      const crew = [stage.cast.bm1, stage.cast.bm2, stage.cast.gm1, stage.cast.gm2];
      crew.forEach((a) => a.setPose('dance'));
      fx.petalsFall(80, { side: 'top' });
      for (let i = 0; i < 3; i++) {
        crew.forEach((a, k) => setTimeout(() => a.react(i % 2 ? 'hop' : 'spin', 1300), k * 120));
        stage.guestsReact('dance', 1300);
        await wait(1500);
      }
      audio.sfx('cheer');
      crew.forEach((a) => a.setPose('idle'));
      ov.beams(false);
    }
  },
  light_show: {
    cinematic: true,
    async run({ fx, ov, audio, stage }, { user, gift }) {
      ov.banner({ kicker: 'Đêm hội ánh sáng', title: `${shortName(user.name, 18)} thắp sáng lễ cưới`, sub: gift.label, user, style: 'night', ms: 3800 });
      ov.beams(true, { tint: 'rainbow' });
      audio.sfx('chime');
      for (let i = 0; i < 4; i++) {
        fx.sparkles(40, { x: rand(500, 1420), y: rand(200, 600), w: 600, h: 400 });
        audio.sfx('sparkle');
        await wait(900);
      }
      fx.heartBurst(couplePoint(stage).x, couplePoint(stage).y, 40);
      ov.beams(false);
    }
  },
  fireworks_show: {
    cinematic: true,
    async run({ fx, ov, audio, stage }, { user, gift }) {
      ov.letterbox(true);
      stage.root.classList.add('dim');
      ov.banner({ kicker: 'Quà siêu cấp', title: `${shortName(user.name, 18)} — ${gift.label}`, sub: 'Bắn pháo hoa mừng hạnh phúc! 🎆', user, style: 'gold', ms: 5200 });
      audio.sfx('fanfare');
      for (let i = 0; i < 3; i++) {
        fx.fireworks(5, { delay: 0.25 });
        audio.sfx('fireworks', { count: 3 });
        await wait(2000);
      }
      fx.confettiRain(120);
      audio.sfx('cheer');
      stage.guestsReact('cheer');
      await wait(1000);
      stage.root.classList.remove('dim');
      ov.letterbox(false);
    }
  },
  grand_celebration: {
    cinematic: true,
    async run({ fx, ov, audio, stage }, { user, gift }) {
      ov.letterbox(true);
      ov.flash('#fff2dc', 900);
      ov.banner({ kicker: 'Đại lễ mừng cưới', title: `${shortName(user.name, 18)} tặng ${gift.label}!`, sub: 'Cả lễ đường bùng nổ ăn mừng! 👑', user, style: 'married', ms: 6000 });
      audio.sfx('bells');
      audio.sfx('fanfare');
      ov.beams(true, { tint: 'gold' });
      for (const a of stage.allCast()) {
        a.setPose('cheer');
        a.setExpr('joy');
      }
      fx.confettiBoth(240);
      fx.fireworks(8, { delay: 0.3 });
      audio.sfx('fireworks', { count: 4 });
      stage.guestsReact('cheer', 2400);
      await wait(2600);
      fx.petalsFall(100);
      fx.heartBurst(couplePoint(stage).x, couplePoint(stage).y, 50, 1.3);
      audio.sfx('cheer');
      await wait(2800);
      for (const a of stage.allCast()) a.setPose('idle');
      ov.beams(false);
      ov.letterbox(false);
    }
  }
};

/** Non-gift reactions dispatched by the server queue. */
export const REACTIONS = {
  hearts({ fx, audio }, { count = 1 }) {
    fx.heartsRise(Math.min(14, 2 + Math.ceil(count / 3)), { x: rand(1580, 1820), y: 1040, spread: 160 });
    if (count >= 10) audio.sfx('heart');
  },
  /** A viewer who just entered the room walks in and takes their seat (no toast — joins are frequent). */
  async walk_in(ctx, { user }) {
    const { stage } = ctx;
    if (ctx.locked || stage.walkers.size >= 6) return;
    const seat = stage.seatOf(user.id);
    const walker = stage.spawnWalker(user, { from: seat && seat.x < 960 ? 'entryLeft' : 'entryRight' });
    walker.setPose('wave');
    const dest = seat ? { x: seat.x, y: seat.y + 20 } : { x: rand(500, 1420), y: rand(860, 1000) };
    await walker.moveTo(dest.x, dest.y, { speed: 420 });
    stage.removeWalker(walker);
  },
  async guest_arrival(ctx, { user }) {
    const { stage, ov, audio } = ctx;
    ov.toast({ user, icon: '🎉', title: 'đã đến dự tiệc cưới', detail: 'Khách mời mới' });
    audio.sfx('chime');
    if (ctx.locked || stage.walkers.size >= 3) return;
    const seat = stage.seatOf(user.id);
    const side = seat && seat.x < 960 ? 'entryLeft' : 'entryRight';
    const walker = stage.spawnWalker(user, { from: side });
    walker.setPose('wave');
    const dest = seat ? { x: seat.x, y: seat.y + 20 } : { x: rand(600, 1300), y: 900 };
    await walker.moveTo(dest.x, dest.y, { speed: 360 });
    stage.removeWalker(walker);
  },
  wish({ fx, stage }, { user }) {
    const anchor = stage.seatOf(user.id);
    if (anchor) {
      const p = stage.toScreen(anchor.x, anchor.y - 120);
      fx.heartsRise(3, { x: p.x, y: p.y, spread: 30 });
    }
  },
  photo(ctx, { user }) {
    ctx.audio.sfx('shutter');
    return ctx.ov.photoBooth(user, ctx.couple);
  },
  kiss_cheer({ ov, fx, audio, stage }, { user, text }) {
    ov.toast({ user, icon: '💋', title: 'hô:', detail: text });
    const c = couplePoint(stage);
    fx.heartsRise(8, { x: c.x, y: c.y + 200, spread: 200 });
    if (['kiss', 'finale'].includes(stage.root.dataset.chapter)) {
      const { groom, bride } = stage.cast;
      const pg = groom.el.className.match(/pose-(\w+)/)?.[1] || 'idle';
      groom.setPose('kiss');
      bride.setPose('kiss');
      audio.sfx('kiss');
      setTimeout(() => {
        groom.setPose(pg);
        bride.setPose(pg);
      }, 1400);
    }
  },
  dance({ stage, ov }, { user, text }) {
    ov.toast({ user, icon: '💃', title: 'rủ cả nhà nhảy!', detail: text });
    stage.guestsReact('dance', 1500);
    for (const a of [stage.cast.bm1, stage.cast.gm2]) a.react('spin', 1400);
  },
  toast({ stage, ov, audio, fx }, { user, text }) {
    ov.toast({ user, icon: '🥂', title: 'nâng ly!', detail: text });
    audio.sfx('glassClink');
    const c = couplePoint(stage);
    fx.bubbles(c.x, c.y + 200, 24);
  },
  confetti({ fx, ov, audio }, { user }) {
    ov.toast({ user, icon: '🎊', title: 'đã chia sẻ lễ cưới', detail: 'Bắn pháo giấy!' });
    audio.sfx('champagne');
    fx.confettiCannon(pick([-20, 1940]), 980, pick([-60, -120]), 90);
  },
  support_goal({ fx, ov, audio, stage }, { level, bonus }) {
    ov.banner({ kicker: 'Cộng đồng ủng hộ', title: `Cộng đồng đạt cấp ${level}!`, sub: `+${bonus} điểm yêu thương cho cô dâu chú rể`, style: 'pink', ms: 3600 });
    audio.sfx('chime');
    fx.confettiBoth(120);
    stage.guestsReact('cheer');
  },
  happiness_overflow({ fx, ov, audio, stage }, { bonus }) {
    ov.banner({ kicker: 'Niềm vui ngập tràn', title: 'Niềm vui tràn ngập! 😍', sub: `+${bonus} điểm`, style: 'pink', ms: 3600 });
    audio.sfx('cheer');
    fx.heartBurst(960, 520, 60, 1.4);
    for (const a of stage.allCast()) a.react('hop', 1000);
    stage.guestsReact('cheer');
  },
  top_supporter({ ov, audio }, { user, points }) {
    ov.banner({ kicker: 'Khách quý số 1 mới', title: `👑 ${shortName(user.name, 20)}`, sub: `${points.toLocaleString('vi-VN')} điểm yêu thương`, user, style: 'gold', ms: 3000 });
    audio.sfx('chime');
  }
};

/** Game-mode reactions (see src/gameplay/modes). */
Object.assign(REACTIONS, {
  team_join({ ov, audio, stage }, { user, team, label }) {
    ov.toast({ user, icon: team === 'bride' ? '👰' : '🤵', title: `gia nhập ${label}`, detail: 'Nhà gái đấu nhà trai' });
    audio.sfx('pop');
    (team === 'bride' ? stage.cast.bride : stage.cast.groom).react('hop', 900);
  },
  team_lead({ ov, audio, stage, fx }, { team, label }) {
    const hero = team === 'bride' ? stage.cast.bride : stage.cast.groom;
    hero.setPose('cheer');
    setTimeout(() => hero.setPose('hold'), 2200);
    const p = stage.actorPoint(hero, 'head');
    fx.heartBurst(p.x, p.y, 30);
    audio.sfx('chime');
    ov.banner({ kicker: 'Đổi ngôi dẫn đầu!', title: `${label} vươn lên dẫn trước`, style: team === 'bride' ? 'pink' : 'gold', ms: 2800 });
  },
  round_end({ ov, audio, fx, stage }, { round, label, team, champion, bonus }) {
    audio.sfx('fanfare');
    fx.confettiBoth(120);
    stage.guestsReact('cheer');
    if (champion) {
      ov.banner({ kicker: `Quán quân hiệp ${round}`, title: `👑 ${shortName(champion.name, 20)}`, sub: `${champion.points.toLocaleString('vi-VN')} điểm · +${bonus} cho cô dâu chú rể`, user: champion, style: 'gold', ms: 4000 });
    } else {
      ov.banner({ kicker: `Kết thúc hiệp ${round}`, title: team ? `${label} thắng hiệp!` : 'Hòa nhau!', sub: bonus ? `+${bonus} điểm yêu thương` : '', style: team === 'bride' ? 'pink' : 'gold', ms: 3600 });
    }
  },
  mode_result({ ov, audio, fx, stage }, { success, title, detail }) {
    if (success) {
      audio.sfx('fanfare');
      audio.sfx('fireworks', { count: 3 });
      fx.fireworks(8, { delay: 0.3 });
      fx.confettiBoth(220);
    } else {
      audio.sfx('fail');
      stage.root.classList.add('dim');
      setTimeout(() => stage.root.classList.remove('dim'), 6000);
    }
    ov.megaTitle({ kicker: success ? 'Hoàn thành nhiệm vụ' : 'Kết thúc', title, sub: detail || '', style: success ? 'gold' : 'fail', ms: 6000 });
  },
  mode_mistake({ ov, audio, stage }, { mistakes, max, title }) {
    audio.sfx('fail');
    for (const a of stage.allCast()) a.setExpr('surprised');
    setTimeout(() => stage.allCast().forEach((a) => a.setExpr('happy')), 2500);
    ov.banner({ kicker: `Lỗi ${mistakes}/${max}`, title, sub: 'Tăng tốc lên nào cả nhà!', style: 'night', ms: 3200 });
  }
});

/** Admin-triggered effects (dashboard "Effects" panel). */
export const MANUAL_EFFECTS = {
  petals: ({ fx }) => fx.petalsFall(90),
  hearts: ({ fx }) => fx.heartBurst(960, 480, 60, 1.3),
  confetti: ({ fx, audio }) => {
    fx.confettiBoth(200);
    audio.sfx('champagne');
  },
  fireworks: ({ fx, audio }) => {
    fx.fireworks(8, { delay: 0.3 });
    audio.sfx('fireworks', { count: 4 });
  },
  explosion: ({ fx, audio }) => {
    fx.giftExplosion(960, 520, 'legendary');
    audio.sfx('impact');
  },
  shake: ({ stage }) => stage.shake(1.5),
  sparkles: ({ fx, audio }) => {
    fx.sparkles(80, { x: 960, y: 480, w: 1200, h: 600 });
    audio.sfx('sparkle');
  },
  beams: ({ ov }) => ov.beamPulse(5000, 'gold'),
  bells: ({ audio }) => audio.sfx('bells'),
  applause: ({ audio, stage }) => {
    audio.sfx('applause');
    stage.guestsReact('cheer');
  },
  cheer: ({ audio, stage }) => {
    audio.sfx('cheer');
    stage.guestsReact('cheer');
  },
  flash: ({ ov, audio }) => {
    ov.flash();
    audio.sfx('shutter');
  }
};

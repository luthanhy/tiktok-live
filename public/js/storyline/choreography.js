/**
 * Chapter choreography — what the stage *does* in each wedding chapter.
 * Each chapter declares its scene/music/ambience, a one-shot entrance cinematic
 * (`enter`) and an idle loop (`loop`) that runs until the next chapter aborts it.
 * `ctx.quick` is true when the overlay (re)joins mid-show: skip the long cinematic.
 */
import { wait, pick, rand } from '../core/util.js';

const MC_LINES = {
  preparation: ['Chào mừng quý khách đến với lễ cưới!', 'Mời quý khách an tọa, buổi lễ sắp bắt đầu', 'Cô dâu đang chuẩn bị, mọi người cùng chờ nhé!'],
  ceremony: ['Hôm nay chúng ta cùng chứng kiến tình yêu này', 'Xin mời đôi uyên ương trao lời thề nguyện', 'Tình yêu là sự kiên nhẫn và tử tế'],
  reception: ['Mời quý khách nâng ly chúc mừng!', 'Sàn nhảy đã mở, mời mọi người!', 'Cảm ơn mọi người đã đến chung vui'],
  finale: ['Cảm ơn tất cả quý khách!', 'Chúc đôi vợ chồng mới trăm năm hạnh phúc!']
};

const VOWS = [
  ['Anh hứa sẽ yêu thương em trọn đời', 'Em nguyện cùng anh đi hết cuộc đời'],
  ['Anh sẽ luôn nắm tay em, dù nắng hay mưa', 'Em sẽ luôn là nhà của anh'],
  ['Cảm ơn em đã chọn anh', 'Cảm ơn anh đã đến bên em']
];

const GUEST_SHOUTS = ['Đẹp đôi quá!', 'Chúc mừng!', 'Hạnh phúc nha!', 'Cô dâu xinh quá!', 'Yêu quá đi!'];

/** Loop helper: run `beat` repeatedly until aborted. */
async function every(signal, ms, beat) {
  while (!signal.aborted) {
    await beat();
    await wait(ms, signal);
  }
}

function coupleCenter(stage) {
  const { bride, groom } = stage.cast;
  return stage.toScreen((bride.x + groom.x) / 2, Math.min(bride.y, groom.y) - 330 * groom.scaleAt(groom.y));
}

function resetPoses(stage, expr = 'happy') {
  for (const a of stage.allCast()) {
    a.setPose('idle');
    a.setExpr(expr);
  }
}

/**
 * A busy banquet: waiters carry trays between tables and guests stroll from table to table,
 * a new figure every ~2.4 s, at most four at a time, paused while a showpiece runs.
 */
function banquetBustle({ stage, signal }) {
  let k = 0;
  return every(signal, 2400, async () => {
    if (stage.root.classList.contains('cinematic') || stage.walkers.size >= 4) return;
    const tables = stage.scenes[stage.current]?.tables || [];
    if (tables.length < 2) return;
    k += 1;
    const waiter = k % 2 === 0;
    const a = tables[k % tables.length];
    const b = tables[(k * 3 + 1) % tables.length];
    const fromSide = k % 3 === 0 ? (a.x < 960 ? 'entryLeft' : 'entryRight') : { x: a.x + 120, y: a.y + 30 };
    const npc = stage.spawnWalker({ id: `npc-${k % 9}`, name: '' }, { from: fromSide, carry: waiter ? 'cake' : '', tag: false });
    npc.setPose(waiter ? 'present' : 'idle');
    await npc.moveTo(b.x - 120, b.y + 30, { speed: waiter ? 300 : 200 });
    stage.removeWalker(npc);
  });
}

export const CHAPTERS = {
  // ---------------------------------------------------------------- 1
  preparation: {
    scene: 'garden',
    music: 'vn_prelude',
    ambient: { petals: 0.5, bokeh: 0.35 },
    async enter({ stage, ov, signal, quick }) {
      resetPoses(stage);
      stage.placeCast({ groom: 'groom', gm1: 'gm1', gm2: 'gm2', mc: 'mc', bm1: 'bm1', bm2: 'bmWork1', bride: 'offRight' });
      stage.cast.groom.setExpr('nervous');
      stage.cast.bm1.setPose('present');
      stage.setCamera({ zoom: 1, x: 960, y: 540, ms: quick ? 10 : 2400 });
      if (quick) return;
      await wait(1200, signal);
      ov.bubble(stage.cast.mc, pick(MC_LINES.preparation), { style: 'mc' });
      await wait(2600, signal);
      ov.bubble(stage.cast.groom, 'Hồi hộp quá…', { ms: 2400 });
    },
    async loop({ stage, ov, fx, audio, signal }) {
      const { bm2, groom, gm1, mc, bride } = stage.cast;
      let n = 0;
      await every(signal, 2500, async () => {
        n += 1;
        // bridesmaids carry flowers between the stands
        const a = stage.mark(n % 2 ? 'bmWork2' : 'bmWork1');
        bm2.setPose('present');
        await bm2.moveTo(a.x, a.y, { speed: 160 });
        fx.sparkles(10, { ...stage.toScreen(a.x, a.y - 220), w: 120, h: 80 });
        bm2.setPose('idle');
        groom.react('peek', 1200);
        if (n % 2 === 0) gm1.setPose('wave');
        else gm1.setPose('idle');
        if (n % 3 === 0) ov.bubble(mc, pick(MC_LINES.preparation), { style: 'mc' });
        // the bride peeks in from behind the hedge
        if (n % 4 === 2) {
          bride.show(true);
          await bride.moveTo(1470, 790, { speed: 240 });
          bride.setPose('wave');
          bride.setExpr('joy');
          ov.bubble(bride, 'Em sắp xong rồi!', { ms: 2400 });
          audio.sfx('chime');
          await wait(2600, signal);
          bride.setPose('idle');
          await bride.moveTo(stage.mark('offRight').x, 790, { speed: 260 });
        }
      });
    }
  },

  // ---------------------------------------------------------------- 2
  bride_entrance: {
    scene: 'ceremony',
    music: 'vn_ruoc_dau',
    ambient: { petals: 1, bokeh: 0.3 },
    async enter({ stage, ov, fx, audio, signal, quick }) {
      resetPoses(stage);
      const { bride, groom, bm1, bm2 } = stage.cast;
      stage.placeCast({ groom: 'groom', gm1: 'gm1', gm2: 'gm2', mc: 'mc' });
      groom.setExpr('nervous');
      if (quick) {
        stage.placeCast({ bride: 'bride', bm1: 'bm1', bm2: 'bm2' });
        return;
      }
      const start = stage.mark('aisleStart');
      bride.show(true);
      bride.place(start.x, start.y + 120);
      bm1.place(start.x - 60, start.y);
      bm2.place(start.x + 60, start.y);
      ov.letterbox(true);
      stage.setCamera({ zoom: 1.12, x: 960, y: 640, ms: 2600 });
      audio.sfx('bells');
      await wait(1200, signal);
      const b1 = stage.mark('bm1');
      const b2 = stage.mark('bm2');
      bm1.setPose('present');
      bm2.setPose('present');
      bm1.moveTo(b1.x, b1.y, { ms: 5200 });
      await bm2.moveTo(b2.x, b2.y, { ms: 5600 });
      bm1.setPose('idle');
      bm2.setPose('idle');
      bride.setExpr('joy');
      const mid = stage.mark('aisleMid');
      fx.petalsFall(40, { side: 'left' });
      fx.petalsFall(40, { side: 'right' });
      stage.guestsReact('cheer');
      stage.setCamera({ zoom: 1.28, x: 960, y: 600, ms: 9000 });
      await bride.moveTo(mid.x, mid.y, { ms: 5200 });
      fx.petalsFall(40, { side: 'left' });
      fx.petalsFall(40, { side: 'right' });
      groom.setExpr('love');
      groom.setPose('heart');
      ov.bubble(groom, 'Em đẹp quá…', { ms: 2600 });
      const near = stage.mark('bride');
      await bride.moveTo(near.x, near.y, { ms: 4600 });
      audio.sfx('applause');
      groom.setPose('hold');
      bride.setPose('hold');
      groom.face(1);
      bride.face(-1);
      fx.heartBurst(coupleCenter(stage).x, coupleCenter(stage).y, 26, 0.8);
      await wait(1500, signal);
      ov.letterbox(false);
      stage.setCamera({ zoom: 1.08, x: 960, y: 560, ms: 2400 });
    },
    async loop({ stage, ov, fx, signal }) {
      const { bride, groom } = stage.cast;
      bride.setExpr('joy');
      groom.setExpr('love');
      await every(signal, 6000, async () => {
        fx.petalsFall(18, { side: pick(['left', 'right']) });
        const seat = stage.seatEls.find((s) => s.classList.contains('filled') && Math.random() < 0.3);
        if (seat) ov.bubble(stage.seatAnchor(seat), pick(GUEST_SHOUTS), { ms: 2200, style: 'guest' });
        groom.react('sway', 1600);
      });
    }
  },

  // ---------------------------------------------------------------- 3
  ceremony: {
    scene: 'ceremony',
    music: 'vn_gia_tien',
    ambient: { petals: 0.35, bokeh: 0.6 },
    async enter({ stage, ov, audio, signal, quick }) {
      resetPoses(stage, 'joy');
      stage.placeCast({ groom: 'groom', bride: 'bride', mc: 'mc', gm1: 'gm1', gm2: 'gm2', bm1: 'bm1', bm2: 'bm2' });
      const { groom, bride, mc } = stage.cast;
      groom.face(1);
      bride.face(-1);
      groom.setPose('hold');
      bride.setPose('hold');
      mc.setPose('mic');
      stage.setCamera({ zoom: 1.32, x: 960, y: 560, ms: quick ? 10 : 3000 });
      ov.beams(true, { tint: 'gold' });
      if (quick) return;
      audio.sfx('chime');
      await wait(1600, signal);
      ov.bubble(mc, pick(MC_LINES.ceremony), { style: 'mc', ms: 3400 });
      await wait(3600, signal);
      const [g, b] = pick(VOWS);
      ov.bubble(groom, g, { style: 'vow', ms: 3400 });
      await wait(3600, signal);
      ov.bubble(bride, b, { style: 'vow', ms: 3400 });
    },
    async loop({ stage, ov, fx, signal }) {
      const { groom, bride, mc } = stage.cast;
      let i = 0;
      await every(signal, 7000, async () => {
        i += 1;
        if (i % 3 === 0) ov.bubble(mc, pick(MC_LINES.ceremony), { style: 'mc' });
        else {
          const [g, b] = VOWS[i % VOWS.length];
          ov.bubble(i % 2 ? groom : bride, i % 2 ? g : b, { style: 'vow' });
        }
        const c = coupleCenter(stage);
        fx.heartsRise(4, { x: c.x, y: c.y + 80, spread: 80 });
        groom.setExpr(i % 2 ? 'love' : 'joy');
      });
    },
    exit({ ov }) {
      ov.beams(false);
    }
  },

  // ---------------------------------------------------------------- 4
  ring_exchange: {
    scene: 'ceremony',
    music: 'vn_tinh_ca',
    ambient: { petals: 0.3, bokeh: 0.8 },
    /** The rings are only exchanged when the community fills the Ring Meter (BEATS.ringExchange). */
    async enter({ stage, ov, audio, quick, objectiveDone }) {
      resetPoses(stage, 'joy');
      stage.placeCast({ groom: 'groom', bride: 'bride', mc: 'mc', gm1: 'gm1', gm2: 'gm2', bm1: 'bm1', bm2: 'bm2' });
      const { groom, bride, gm1, mc } = stage.cast;
      groom.face(1);
      bride.face(-1);
      stage.setCamera({ zoom: 1.45, x: 960, y: 545, ms: quick ? 10 : 2600 });
      if (quick) {
        groom.setPose(objectiveDone ? 'hold' : 'present');
        bride.setPose('hold');
        groom.el.classList.toggle('show-ringbox', !objectiveDone);
        return;
      }
      ov.bubble(mc, 'Xin mời phù rể mang nhẫn cưới lên!', { style: 'mc' });
      gm1.setPose('present');
      await gm1.moveTo(groom.x - 60, groom.y + 6, { speed: 120 });
      groom.setPose('present');
      groom.el.classList.add('show-ringbox');
      audio.sfx('sparkle');
      gm1.setPose('idle');
      await gm1.moveTo(stage.mark('gm1').x, stage.mark('gm1').y, { speed: 120 });
      bride.setPose('hold');
      ov.bubble(mc, 'Hãy tặng quà để lấp đầy thanh Nhẫn cưới! 💍', { style: 'mc', ms: 3600 });
    },
    async loop({ stage, ov, fx, audio, signal }) {
      let n = 0;
      await every(signal, 5000, async () => {
        n += 1;
        const waiting = stage.cast.groom.el.classList.contains('show-ringbox');
        const p = stage.actorPoint(waiting ? stage.cast.groom : stage.cast.bride, 'hands');
        fx.sparkles(14, { x: p.x, y: p.y, w: 90, h: 60 });
        if (waiting && n % 3 === 0) ov.bubble(stage.cast.mc, pick(['Còn chút nữa thôi! 💍', 'Cả nhà tặng quà để trao nhẫn nào!', 'Nhẫn cưới đang chờ…']), { style: 'mc' });
        if (!waiting && n % 4 === 0) {
          audio.sfx('sparkle');
          await ov.ringCloseup(3000);
        }
      });
    }
  },

  // ---------------------------------------------------------------- 5
  kiss: {
    scene: 'ceremony',
    music: 'vn_hon_le',
    ambient: { petals: 0.8, bokeh: 0.5 },
    async enter({ stage, ov, fx, audio, signal, quick, couple }) {
      resetPoses(stage, 'joy');
      stage.placeCast({ groom: 'groom', bride: 'bride', mc: 'mc', gm1: 'gm1', gm2: 'gm2', bm1: 'bm1', bm2: 'bm2' });
      const { groom, bride, mc } = stage.cast;
      groom.face(1);
      bride.face(-1);
      const kissY = stage.mark('groom').y;
      if (quick) {
        stage.placeCast({ mc: { x: 820, y: 694 }, groom: { x: 926, y: kissY }, bride: { x: 994, y: kissY } });
        stage.setCamera({ zoom: 1.12, x: 960, y: 560, ms: 10 });
        return;
      }
      ov.letterbox(true);
      stage.setCamera({ zoom: 1.65, x: 960, y: 520, ms: 2800 });
      ov.bubble(mc, 'Chú rể có thể hôn cô dâu!', { style: 'mc', ms: 2800 });
      await wait(2600, signal);
      // the officiant steps aside so nothing stands between the couple
      mc.moveTo(820, 694, { speed: 160 });
      await wait(700, signal);
      groom.moveTo(926, kissY, { ms: 900 });
      await bride.moveTo(994, kissY, { ms: 900 });
      groom.face(1);
      bride.face(-1);
      groom.setPose('kiss');
      bride.setPose('kiss');
      groom.setExpr('kiss');
      bride.setExpr('kiss');
      audio.sfx('kiss');
      const c = coupleCenter(stage);
      fx.heartBurst(c.x, c.y + 30, 44, 1.2);
      await wait(900, signal);
      ov.flash('#fff6ea', 900);
      stage.shake(1.2);
      ov.megaTitle({ kicker: '💍 Nên duyên vợ chồng', title: 'ĐÁM CƯỚI VIÊN MÃN!', sub: `${couple.groomName} & ${couple.brideName}`, style: 'gold', ms: 3600 });
      audio.sfx('bells');
      audio.sfx('impact');
      audio.sfx('fireworks', { count: 4 });
      fx.fireworks(7, { delay: 0.35 });
      fx.confettiBoth(220);
      ov.beams(true, { tint: 'pink' });
      stage.guestsReact('cheer', 2200);
      audio.sfx('cheer');
      stage.setCamera({ zoom: 1.08, x: 960, y: 560, ms: 3200 });
      await wait(3000, signal);
      ov.banner({ kicker: 'Vợ chồng son', title: `${couple.groomName} & ${couple.brideName}`, sub: 'Chính thức thành vợ chồng! 💍', style: 'married', ms: 5200 });
      await wait(1200, signal);
      groom.setPose('cheer');
      bride.setPose('cheer');
      groom.setExpr('joy');
      bride.setExpr('joy');
      await wait(2200, signal);
      ov.letterbox(false);
      ov.beams(false);
    },
    async loop({ stage, fx, audio, signal }) {
      const { groom, bride } = stage.cast;
      let n = 0;
      await every(signal, 6500, async () => {
        n += 1;
        fx.fireworks(2, { delay: 0.5 });
        audio.sfx('fireworks', { count: 1 });
        fx.confettiRain(30);
        if (n % 2 === 0) {
          groom.setPose('kiss');
          bride.setPose('kiss');
          groom.setExpr('kiss');
          bride.setExpr('kiss');
          await wait(1500, signal);
          groom.setExpr('joy');
          bride.setExpr('joy');
        }
        groom.setPose('hold');
        bride.setPose('hold');
      });
    }
  },

  // ---------------------------------------------------------------- 6
  reception: {
    scene: 'reception',
    music: 'vn_celebration',
    ambient: { petals: 0.2, bokeh: 0.9 },
    async enter({ stage, ov, audio, signal, quick }) {
      resetPoses(stage, 'joy');
      stage.placeCast({ groom: 'cakeGroom', bride: 'cakeBride', mc: 'mc', gm1: 'gm1', gm2: 'gm2', bm1: 'bm1', bm2: 'bm2' });
      stage.cast.mc.setPose('mic');
      stage.setCamera({ zoom: 1, x: 960, y: 540, ms: 10 });
      if (quick) return;
      audio.sfx('champagne');
      ov.bubble(stage.cast.mc, pick(MC_LINES.reception), { style: 'mc' });
      await wait(1200, signal);
    },
    /** Cake, champagne and first dance are triggered by their meters (BEATS); in between the party mingles. */
    async loop(ctx) {
      const { stage, ov, signal } = ctx;
      const { mc, gm2, bm2 } = stage.cast;
      let n = 0;
      const bustle = banquetBustle(ctx).catch(() => {}); // ends with the chapter (AbortError)
      await every(signal, 9000, async () => {
        n += 1;
        if (n % 5 === 0) {
          await ctx.runBeat('bouquetToss');
          return;
        }
        if (n % 2) ov.bubble(mc, pick(MC_LINES.reception), { style: 'mc' });
        else ov.bubble(pick([gm2, bm2]), pick(['Dzô! 🥂', 'Nhảy thôi!', 'Bánh cưới ngon quá!']), { ms: 2200 });
        stage.guestsReact(n % 2 ? 'cheer' : 'dance', 1200);
      });
      await bustle;
    }
  },

  // ---------------------------------------------------------------- 7
  finale: {
    scene: 'grand',
    music: 'vn_tram_nam',
    ambient: { petals: 0.4, bokeh: 1.1 },
    async enter({ stage, ov, fx, audio, signal, quick, couple, summary }) {
      resetPoses(stage, 'joy');
      stage.placeCast({ mc: 'mc', gm1: 'gm1', gm2: 'gm2', bm1: 'bm1', bm2: 'bm2' });
      const { groom, bride } = stage.cast;
      if (quick) {
        stage.placeCast({ groom: 'groom', bride: 'bride' });
        groom.setPose('wave');
        bride.setPose('wave');
        stage.setCamera({ zoom: 1, x: 960, y: 540, ms: 10 });
        ov.showSummary(summary, couple, { compactAfterMs: 1 });
        return;
      }
      ov.letterbox(true);
      groom.place(930, 1120);
      bride.place(990, 1120);
      stage.setCamera({ zoom: 1.15, x: 960, y: 600, ms: 10 });
      await wait(400, signal);
      const g = stage.mark('groom');
      const b = stage.mark('bride');
      groom.moveTo(g.x, g.y, { ms: 4200 });
      await bride.moveTo(b.x, b.y, { ms: 4200 });
      groom.face(1);
      bride.face(-1);
      groom.setPose('cheer');
      bride.setPose('cheer');
      audio.sfx('fireworks', { count: 5 });
      fx.fireworks(10, { delay: 0.3 });
      fx.confettiBoth(200);
      ov.beams(true, { tint: 'gold' });
      ov.flash('#fff0d8', 900);
      ov.banner({ kicker: 'Trăm năm hạnh phúc', title: `${couple.groomName} & ${couple.brideName}`, sub: 'Hạnh phúc trọn đời ♥', style: 'married', ms: 5600 });
      stage.setCamera({ zoom: 1, x: 960, y: 540, ms: 3400 });
      await wait(5200, signal);
      ov.letterbox(false);
      ov.showSummary(summary, couple);
      ov.bubble(stage.cast.mc, pick(MC_LINES.finale), { style: 'mc' });
      groom.setPose('wave');
      bride.setPose('wave');
    },
    async loop({ stage, fx, audio, signal }) {
      let n = 0;
      await every(signal, 4200, async () => {
        n += 1;
        fx.fireworks(3, { delay: 0.45 });
        audio.sfx('fireworks', { count: 2 });
        if (n % 3 === 0) fx.confettiRain(60);
        if (n % 4 === 0) {
          stage.cast.groom.setPose('kiss');
          stage.cast.bride.setPose('kiss');
          await wait(1400, signal);
          stage.cast.groom.setPose('wave');
          stage.cast.bride.setPose('wave');
        }
      });
    },
    exit({ ov }) {
      ov.showSummary(null);
      ov.beams(false);
    }
  }
};

/**
 * Reusable story beats. The director runs them inside the cinematic lock when the
 * matching community meter fills (meter_full), or from a chapter loop via ctx.runBeat().
 */
export const BEATS = {
  async prepComplete({ stage, ov, fx, audio }) {
    stage.setPrepLevel(4);
    audio.sfx('chime');
    fx.sparkles(80, { x: 960, y: 520, w: 1100, h: 500 });
    fx.petalsFall(70);
    stage.guestsReact('cheer');
    ov.banner({ kicker: 'Chuẩn bị hoàn tất', title: 'Lễ đường đã sẵn sàng! 🌿', sub: 'Cảm ơn cả nhà đã cùng trang trí', style: 'gold', ms: 3600 });
    await wait(1800);
  },

  async ringExchange({ stage, ov, fx, audio, signal }) {
    const { groom, bride } = stage.cast;
    groom.face(1);
    bride.face(-1);
    groom.setPose('present');
    groom.el.classList.add('show-ringbox');
    stage.setCamera({ zoom: 1.65, x: 960, y: 520, ms: 1600 });
    ov.letterbox(true);
    audio.sfx('sparkle');
    ov.ringCloseup(4200);
    await wait(1400, signal);
    const from = stage.actorPoint(groom, 'hands');
    const to = stage.actorPoint(bride, 'hands');
    fx.sparkleTrail(from.x, from.y, to.x, to.y, 34);
    ov.beams(true, { tint: 'gold' });
    audio.sfx('chime');
    bride.setExpr('surprised');
    await wait(1500, signal);
    groom.el.classList.remove('show-ringbox');
    bride.setExpr('love');
    bride.setPose('heart');
    ov.bubble(bride, 'Em đồng ý! 💍', { style: 'vow' });
    const c = coupleCenter(stage);
    fx.giftExplosion(c.x, c.y + 120, 'epic');
    fx.heartBurst(c.x, c.y, 36);
    audio.sfx('bells');
    audio.sfx('applause');
    stage.guestsReact('cheer');
    ov.banner({ kicker: 'Trao nhẫn cưới', title: 'Nhẫn cưới đã được trao! 💍', sub: 'Cả cộng đồng đã cùng chứng giám', style: 'gold', ms: 3600 });
    await wait(2400, signal);
    groom.setPose('hold');
    bride.setPose('hold');
    ov.letterbox(false);
    ov.beams(false);
    stage.setCamera({ zoom: 1.4, x: 960, y: 550, ms: 1600 });
  },

  async cakeCutting({ stage, ov, fx, audio, signal }) {
    const { groom, bride, mc } = stage.cast;
    if (stage.current !== 'reception') await stage.setScene('reception', { ms: 1000 });
    stage.placeCast({ groom: 'cakeGroom', bride: 'cakeBride', mc: 'mc', gm1: 'gm1', gm2: 'gm2', bm1: 'bm1', bm2: 'bm2' });
    groom.face(1);
    bride.face(-1);
    stage.setCamera({ zoom: 1.42, x: 700, y: 560, ms: 2000 });
    ov.bubble(mc, 'Bánh cưới đã sẵn sàng — mời cô dâu chú rể cắt bánh!', { style: 'mc' });
    await wait(1700, signal);
    groom.setPose('cut');
    bride.setPose('cut');
    await wait(900, signal);
    const p = stage.toScreen(700, 560);
    fx.sparkles(50, { x: p.x, y: p.y, w: 260, h: 260 });
    fx.giftExplosion(p.x, p.y + 60, 'rare');
    audio.sfx('applause');
    stage.guestsReact('cheer');
    ov.banner({ kicker: 'Bánh cưới', title: 'Cắt bánh cưới! 🎂', style: 'pink', ms: 3000 });
    await wait(3200, signal);
    groom.setPose('idle');
    bride.setPose('idle');
    stage.setCamera({ zoom: 1, x: 960, y: 540, ms: 1800 });
  },

  async champagneToast({ stage, ov, fx, audio, signal }) {
    const { groom, bride, gm2, bm2 } = stage.cast;
    if (stage.current !== 'reception') await stage.setScene('reception', { ms: 1000 });
    stage.setCamera({ zoom: 1.32, x: 1240, y: 560, ms: 2200 });
    const a = stage.mark('towerGroom');
    const b = stage.mark('towerBride');
    groom.moveTo(a.x, a.y, { speed: 260 });
    await bride.moveTo(b.x, b.y, { speed: 260 });
    groom.face(1);
    bride.face(-1);
    groom.setPose('toast');
    bride.setPose('toast');
    audio.sfx('champagne');
    const p = stage.toScreen(1240, 520);
    fx.bubbles(p.x, p.y, 60);
    fx.confettiCannon(p.x, p.y + 80, -90, 60, 0.6);
    ov.beams(true, { tint: 'gold' });
    await wait(1200, signal);
    audio.sfx('glassClink');
    ov.bubble(gm2, 'Dzô! 🥂', { ms: 2000 });
    ov.bubble(bm2, 'Trăm phần trăm!', { ms: 2000 });
    ov.banner({ kicker: 'Rượu mừng', title: 'Nâng ly chúc mừng! Một, hai, ba, dzô! 🥂', style: 'gold', ms: 3000 });
    await wait(3000, signal);
    ov.beams(false);
    groom.setPose('idle');
    bride.setPose('idle');
    stage.setCamera({ zoom: 1, x: 960, y: 540, ms: 1800 });
  },

  async firstDance({ stage, ov, fx, audio, signal }) {
    const { groom, bride, gm1, gm2, bm1, bm2 } = stage.cast;
    await stage.setScene('dance', { ms: 1200 });
    audio.sfx('transition');
    stage.placeCast({ groom: 'groom', bride: 'bride', gm1: 'gm1', bm1: 'bm1', gm2: 'gm2', bm2: 'bm2', mc: 'mc' });
    stage.setCamera({ zoom: 1.2, x: 960, y: 600, ms: 2000 });
    for (const a of [groom, bride, gm1, gm2, bm1, bm2]) a.setPose('dance');
    groom.face(1);
    bride.face(-1);
    ov.banner({ kicker: 'Văn nghệ', title: 'Cô dâu chú rể song ca tặng cả nhà! 🎤', style: 'night', ms: 3000 });
    fx.setAmbient({ petals: 0.6, bokeh: 1.4 });
    for (let i = 0; i < 4 && !signal.aborted; i++) {
      groom.react('spin', 1600);
      bride.react('spin', 1600);
      if (i % 2) {
        gm1.react('spin', 1600);
        bm2.react('spin', 1600);
      }
      stage.guestsReact('dance', 1600);
      await wait(2400, signal);
    }
    for (const a of [gm1, gm2, bm1, bm2]) a.setPose('idle');
    await stage.setScene('reception', { ms: 1200 });
    stage.placeCast({ groom: 'centerGroom', bride: 'centerBride', mc: 'mc', gm1: 'gm1', gm2: 'gm2', bm1: 'bm1', bm2: 'bm2' });
    groom.setPose('hold');
    bride.setPose('hold');
    stage.setCamera({ zoom: 1, x: 960, y: 540, ms: 10 });
    fx.setAmbient(CHAPTERS.reception.ambient);
  },

  async bouquetToss({ stage, ov, fx, audio, signal }) {
    const { bride, bm1, bm2 } = stage.cast;
    stage.setCamera({ zoom: 1.1, x: 960, y: 580, ms: 1600 });
    bride.setPose('throw');
    bride.face(-1);
    ov.bubble(bride, 'Ai bắt được hoa nào? 💐', { ms: 2400 });
    await wait(1400, signal);
    bride.el.classList.add('no-bouquet');
    const from = stage.actorPoint(bride, 'head');
    fx.roseFlight(from.x, from.y, rand(600, 1300), 760, { count: 3 });
    audio.sfx('whoosh');
    bm1.react('hop', 1200);
    bm2.react('hop', 1200);
    await wait(1600, signal);
    audio.sfx('cheer');
    stage.guestsReact('cheer');
    await wait(1600, signal);
    bride.el.classList.remove('no-bouquet');
    bride.setPose('idle');
    stage.setCamera({ zoom: 1, x: 960, y: 540, ms: 1600 });
  },

  async celebrationShow({ stage, ov, fx, audio, signal }) {
    ov.beams(true, { tint: 'gold' });
    ov.banner({ kicker: 'Pháo hoa mừng', title: 'Pháo hoa mừng hạnh phúc! 🎆', style: 'night', ms: 3600 });
    for (let i = 0; i < 3 && !signal.aborted; i++) {
      fx.fireworks(4, { delay: 0.25 });
      audio.sfx('fireworks', { count: 2 });
      await wait(1500, signal);
    }
    fx.confettiRain(100);
    stage.guestsReact('cheer');
    ov.beams(false);
  }
};

/** Which beat a full meter plays. */
export const METER_BEATS = { preparation: 'prepComplete', ring: 'ringExchange', cake: 'cakeCutting', champagne: 'champagneToast', dance: 'firstDance', celebration: 'celebrationShow' };

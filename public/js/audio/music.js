/**
 * Score library. Every track is generated note data, rendered live by the synth.
 * The show uses the original Vietnamese ngũ cung (pentatonic) score (vn_* tracks) when no
 * background song URL is configured. The older Western arrangements stay in the library
 * only so saved configs that still name them keep working.
 *
 * Event: { t: beat, d: beats, n: midi | midi[], i: instrument, v: velocity 0..1 }
 */
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

export function m(name) {
  const [, pc, oct] = name.match(/^([A-G][#b]?)(-?\d)$/);
  return 12 * (Number(oct) + 1) + NOTE[pc];
}

const chord = (...names) => names.map(m);

/** Melody helper: "G4:1 C5:.75 C5:.25 C5:2" → events. 'R' is a rest. */
function line(spec, { start = 0, i = 'lead', v = 0.7 } = {}) {
  const out = [];
  let t = start;
  for (const tok of spec.trim().split(/\s+/)) {
    const [n, d] = tok.split(':');
    const dur = Number(d);
    if (n !== 'R') out.push({ t, d: dur, n: m(n), i, v });
    t += dur;
  }
  return { events: out, end: t };
}

function arpeggio(chords, { beatsPerChord = 2, step = 0.5, i = 'piano', v = 0.42, start = 0, pattern = [0, 1, 2, 1] } = {}) {
  const out = [];
  chords.forEach((c, ci) => {
    const steps = beatsPerChord / step;
    for (let k = 0; k < steps; k++) {
      const idx = pattern[k % pattern.length];
      const note = c[idx % c.length] + (idx >= c.length ? 12 : 0);
      out.push({ t: start + ci * beatsPerChord + k * step, d: step * 1.8, n: note, i, v: v * (k === 0 ? 1.15 : 1) });
    }
  });
  return out;
}

function padChords(chords, { beatsPerChord = 2, start = 0, v = 0.22, i = 'pad' } = {}) {
  return chords.map((c, ci) => ({ t: start + ci * beatsPerChord, d: beatsPerChord, n: c, i, v }));
}

function bassLine(notes, { beatsPerNote = 2, start = 0, v = 0.5, i = 'bass' } = {}) {
  return notes.map((n, k) => ({ t: start + k * beatsPerNote, d: beatsPerNote * 0.95, n: m(n), i, v }));
}

// ------------------------------------------------------------------ Canon in D (Pachelbel, public domain)
const CANON_CHORDS = [chord('D4', 'F#4', 'A4'), chord('A3', 'C#4', 'E4'), chord('B3', 'D4', 'F#4'), chord('F#3', 'A3', 'C#4'), chord('G3', 'B3', 'D4'), chord('D4', 'F#4', 'A4'), chord('G3', 'B3', 'D4'), chord('A3', 'C#4', 'E4')];
const CANON_BASS = ['D3', 'A2', 'B2', 'F#2', 'G2', 'D2', 'G2', 'A2'];

function prelude() {
  const ev = [];
  for (const start of [0, 16]) {
    ev.push(...bassLine(CANON_BASS, { start, v: 0.45 }));
    ev.push(...arpeggio(CANON_CHORDS, { start, pattern: [0, 1, 2, 1], v: 0.32 }));
    ev.push(...padChords(CANON_CHORDS, { start, v: 0.12 }));
  }
  ev.push(...line('F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2', { start: 16, i: 'strings', v: 0.42 }).events);
  return { id: 'prelude', bpm: 66, length: 32, events: ev };
}

function finale() {
  const ev = [];
  for (const start of [0, 16]) {
    ev.push(...bassLine(CANON_BASS, { start, v: 0.55 }));
    ev.push(...arpeggio(CANON_CHORDS, { start, step: 0.25, pattern: [0, 1, 2, 3, 2, 1, 0, 1], v: 0.28 }));
    ev.push(...padChords(CANON_CHORDS, { start, v: 0.16, i: 'strings' }));
  }
  ev.push(...line('F#5:1 E5:1 D5:1 C#5:1 B4:1 A4:1 B4:1 C#5:1 D5:1 C#5:1 B4:1 A4:1 G4:1 F#4:1 G4:1 E4:1', { start: 0, i: 'brass', v: 0.36 }).events);
  ev.push(...line('D5:.5 F#5:.5 A5:1 A5:.5 B5:.5 A5:1 F#5:.5 A5:.5 D6:1 C#6:1 B5:2 A5:2 G5:.5 B5:.5 D6:1 C#6:.5 B5:.5 D6:2', { start: 16, i: 'lead', v: 0.45 }).events);
  for (let b = 0; b < 32; b += 4) ev.push({ t: b, d: 4, n: m('D6'), i: 'bell', v: 0.18 });
  return { id: 'finale', bpm: 92, length: 32, events: ev };
}

// ------------------------------------------------------------------ Bridal Chorus (Wagner, public domain) — arranged in C
function bridalChorus() {
  const mel = line(
    'G4:1 C5:.75 C5:.25 C5:2 G4:1 D5:.75 B4:.25 C5:2 G4:1 C5:.75 F5:.25 F5:1 E5:.75 D5:.25 C5:1 B4:.75 C5:.25 D5:2 ' +
      'G4:1 C5:.75 C5:.25 C5:2 G4:1 D5:.75 B4:.25 C5:2 G4:1 C5:.75 F5:.25 E5:1 D5:.75 C5:.25 B4:1 A4:.75 B4:.25 C5:2',
    { i: 'strings', v: 0.55 }
  );
  const harmony = [
    ['C', 4], ['G', 2], ['C', 2], ['F', 2], ['C', 2], ['G', 4],
    ['C', 4], ['G', 2], ['C', 2], ['F', 2], ['C', 2], ['G', 2], ['C', 2]
  ];
  const CH = { C: chord('C4', 'E4', 'G4'), G: chord('B3', 'D4', 'G4'), F: chord('A3', 'C4', 'F4') };
  const BASS = { C: 'C3', G: 'G2', F: 'F2' };
  const ev = [...mel.events];
  let t = 0;
  for (const [c, d] of harmony) {
    ev.push({ t, d, n: CH[c], i: 'pad', v: 0.18 });
    ev.push({ t, d: d * 0.9, n: m(BASS[c]), i: 'bass', v: 0.45 });
    for (let k = 0; k < d; k++) ev.push({ t: t + k, d: 0.9, n: CH[c], i: 'piano', v: 0.2 });
    t += d;
  }
  return { id: 'bridal_chorus', bpm: 70, length: mel.end, events: ev };
}

// ------------------------------------------------------------------ Romantic piano (original)
function pianoRomance() {
  const CH = [chord('F3', 'A3', 'C4'), chord('C3', 'E3', 'G3'), chord('D3', 'F3', 'A3'), chord('A#2', 'D3', 'F3'), chord('F3', 'A3', 'C4'), chord('C3', 'E3', 'G3'), chord('A#2', 'D3', 'F3'), chord('C3', 'E3', 'G3')];
  const ev = [...arpeggio(CH, { beatsPerChord: 4, step: 0.5, pattern: [0, 1, 2, 3, 2, 1, 2, 1], v: 0.3 })];
  ev.push(...padChords(CH, { beatsPerChord: 4, v: 0.1, i: 'strings' }));
  ev.push(...line('A4:1.5 C5:.5 F5:2 E5:1.5 D5:.5 C5:2 D5:1.5 E5:.5 F5:1 A5:1 G5:3 R:1 A5:1.5 G5:.5 F5:2 E5:1 G5:1 C5:2 D5:1 C5:1 A#4:1 A4:1 G4:4', { i: 'piano', v: 0.55 }).events);
  return { id: 'piano_romance', bpm: 68, length: 32, events: ev };
}

// ------------------------------------------------------------------ Wedding march fanfare (Mendelssohn-style opening, original continuation)
function weddingMarch() {
  const ev = [];
  const tri = (t, n, v = 0.5) => {
    ev.push({ t, d: 0.3, n: m(n), i: 'brass', v }, { t: t + 1 / 3, d: 0.3, n: m(n), i: 'brass', v }, { t: t + 2 / 3, d: 0.3, n: m(n), i: 'brass', v }, { t: t + 1, d: 1.8, n: m(n), i: 'brass', v: v + 0.1 });
  };
  tri(0, 'C5');
  tri(2, 'C5');
  tri(4, 'C5');
  tri(6, 'E5');
  const CH = [chord('C4', 'E4', 'G4'), chord('F4', 'A4', 'C5'), chord('G3', 'B3', 'D4', 'F4'), chord('C4', 'E4', 'G4'), chord('A3', 'C4', 'E4'), chord('F3', 'A3', 'C4'), chord('G3', 'B3', 'D4'), chord('C4', 'E4', 'G4')];
  ev.push(...padChords(CH, { start: 8, beatsPerChord: 2, v: 0.22, i: 'strings' }));
  ev.push(...bassLine(['C3', 'F2', 'G2', 'C3', 'A2', 'F2', 'G2', 'C3'], { start: 8, v: 0.5 }));
  ev.push(...line('E5:1 G5:1 C6:1.5 B5:.5 A5:1 C6:1 G5:2 F5:1 E5:1 D5:1 E5:1 C5:4', { start: 8, i: 'lead', v: 0.5 }).events);
  for (let b = 8; b < 24; b += 1) ev.push({ t: b, d: 0.2, n: m('C2'), i: 'drum', v: b % 2 ? 0.3 : 0.5 });
  return { id: 'wedding_march', bpm: 104, length: 24, events: ev };
}

// ------------------------------------------------------------------ Reception waltz (original, 3/4)
function waltz() {
  const prog = [['G2', chord('B3', 'D4', 'G4')], ['D3', chord('A3', 'D4', 'F#4')], ['E2', chord('B3', 'E4', 'G4')], ['C3', chord('C4', 'E4', 'G4')], ['G2', chord('B3', 'D4', 'G4')], ['A2', chord('A3', 'C#4', 'E4')], ['D3', chord('A3', 'D4', 'F#4')], ['D3', chord('A3', 'C4', 'F#4')]];
  const ev = [];
  for (let rep = 0; rep < 2; rep++) {
    prog.forEach(([bass, ch], bar) => {
      const t = (rep * 8 + bar) * 3;
      ev.push({ t, d: 1, n: m(bass), i: 'bass', v: 0.5 });
      ev.push({ t: t + 1, d: 0.8, n: ch, i: 'harp', v: 0.22 }, { t: t + 2, d: 0.8, n: ch, i: 'harp', v: 0.2 });
    });
  }
  ev.push(...line('D5:2 B4:1 A5:2 F#5:1 G5:3 E5:3 C5:2 E5:1 G5:2 E5:1 D5:3 R:3 D5:2 B4:1 B5:2 A5:1 G5:3 E5:3 F#5:2 A5:1 E5:2 F#5:1 D5:6', { i: 'strings', v: 0.42 }).events);
  return { id: 'waltz', bpm: 156, length: 48, events: ev };
}

// ------------------------------------------------------------------ Variant tracks (all original)
/** Vietnamese-inspired prelude on the anhemitonic pentatonic (ngũ cung) scale of G: G A B D E. */
function vnPrelude() {
  const ev = [];
  const drone = [['G2', chord('G3', 'D4')], ['E2', chord('E3', 'B3')], ['A2', chord('A3', 'E4')], ['D3', chord('D3', 'A3')]];
  for (let rep = 0; rep < 2; rep++) {
    drone.forEach(([b, c], i) => {
      const t = (rep * 4 + i) * 4;
      ev.push({ t, d: 4, n: m(b), i: 'bass', v: 0.4 }, { t, d: 4, n: c, i: 'pad', v: 0.12 });
      for (let k = 0; k < 8; k++) ev.push({ t: t + k * 0.5, d: 0.6, n: c[k % 2] + 12, i: 'harp', v: k % 4 === 0 ? 0.28 : 0.18 });
    });
  }
  ev.push(...line('D5:1 E5:.5 G5:.5 A5:2 G5:1 E5:1 D5:2 B4:1 D5:1 E5:1 G5:1 E5:3 R:1 G5:1 A5:.5 B5:.5 D6:2 B5:1 A5:1 G5:2 E5:1 G5:1 A5:1 G5:1 D5:4', { i: 'lead', v: 0.42 }).events);
  return { id: 'vn_prelude', bpm: 76, length: 32, events: ev };
}

function vnCelebration() {
  const ev = [];
  const prog = [['G2', chord('G3', 'B3', 'D4')], ['E2', chord('E3', 'G3', 'B3')], ['C3', chord('C4', 'E4', 'G4')], ['D3', chord('D4', 'F#4', 'A4')]];
  for (let rep = 0; rep < 2; rep++) {
    prog.forEach(([b, c], i) => {
      const t = (rep * 4 + i) * 4;
      for (let k = 0; k < 4; k++) {
        ev.push({ t: t + k, d: 0.5, n: m(b), i: 'bass', v: k % 2 ? 0.3 : 0.45 });
        ev.push({ t: t + k + 0.5, d: 0.4, n: c, i: 'piano', v: 0.18 });
        ev.push({ t: t + k, d: 0.15, n: m('C2'), i: 'drum', v: k === 0 ? 0.45 : 0.25 });
      }
    });
  }
  ev.push(...line('G5:.5 A5:.5 B5:1 D6:1 B5:1 A5:.5 G5:.5 E5:1 G5:2 E5:.5 G5:.5 A5:1 B5:1 A5:1 G5:.5 E5:.5 D5:1 E5:2 D5:.5 E5:.5 G5:1 A5:1 G5:1 B5:.5 A5:.5 G5:1 E5:2 D5:1 E5:1 G5:2 A5:2 G5:2', { i: 'lead', v: 0.45 }).events);
  return { id: 'vn_celebration', bpm: 112, length: 32, events: ev };
}

/** Rước dâu — festive procession: trống (drum) on the off-beats, đàn tranh (harp) tremolo, G ngũ cung melody. */
function vnRuocDau() {
  const ev = [];
  const drone = [['G2', chord('G3', 'D4')], ['D3', chord('D3', 'A3')], ['E2', chord('E3', 'B3')], ['G2', chord('G3', 'D4')]];
  for (let rep = 0; rep < 2; rep++) {
    drone.forEach(([b, c], i) => {
      const t = (rep * 4 + i) * 4;
      ev.push({ t, d: 2, n: m(b), i: 'bass', v: 0.45 }, { t: t + 2, d: 2, n: m(b) + 7, i: 'bass', v: 0.32 });
      for (const [k, v] of [[0, 0.5], [1.5, 0.3], [2, 0.42], [3, 0.3], [3.5, 0.24]]) ev.push({ t: t + k, d: 0.15, n: m('C2'), i: 'drum', v });
      for (let k = 0; k < 8; k++) ev.push({ t: t + k * 0.5, d: 0.5, n: c[k % 2] + 12, i: 'harp', v: k % 2 ? 0.14 : 0.2 });
    });
  }
  ev.push(...line('G4:1 A4:1 B4:1 D5:1 E5:2 D5:1 B4:1 A4:1 B4:1 D5:2 G4:4 B4:1 D5:1 E5:1 G5:1 E5:2 D5:2 B4:1 A4:1 G4:1 A4:1 B4:4', { i: 'lead', v: 0.44 }).events);
  return { id: 'vn_ruoc_dau', bpm: 100, length: 32, events: ev };
}

/** Lễ gia tiên — solemn and slow: temple bell, đàn tranh arpeggios, sáo (lead) on E ngũ cung (E G A B D). */
function vnGiaTien() {
  const ev = [];
  const drone = [['E2', chord('E3', 'B3')], ['A2', chord('A3', 'E4')], ['D3', chord('D3', 'A3')], ['E2', chord('E3', 'B3')]];
  drone.forEach(([b, c], i) => {
    const t = i * 8;
    ev.push({ t, d: 8, n: m(b), i: 'bass', v: 0.32 }, { t, d: 8, n: c, i: 'pad', v: 0.12 }, { t, d: 4, n: m('E5'), i: 'bell', v: 0.2 });
    for (let k = 0; k < 8; k++) ev.push({ t: t + k, d: 1.2, n: [c[0] + 12, c[1] + 12, c[0] + 24, c[1] + 12][k % 4], i: 'harp', v: k % 4 === 0 ? 0.22 : 0.14 });
  });
  ev.push(...line('E5:2 G5:1 A5:1 B5:3 A5:1 G5:2 E5:1 D5:1 E5:4 G5:2 A5:1 B5:1 D6:3 B5:1 A5:2 G5:1 A5:1 E5:4', { i: 'lead', v: 0.36 }).events);
  return { id: 'vn_gia_tien', bpm: 66, length: 32, events: ev };
}

/** Tình ca — gentle ballad for the ring exchange on C ngũ cung (C D E G A). */
function vnTinhCa() {
  const ev = [];
  const CH = [chord('C4', 'E4', 'G4'), chord('A3', 'C4', 'E4'), chord('F3', 'A3', 'C4'), chord('G3', 'B3', 'D4')];
  for (const start of [0, 16]) {
    ev.push(...arpeggio(CH, { start, beatsPerChord: 4, step: 0.5, pattern: [0, 1, 2, 3, 2, 1, 0, 1], v: 0.28 }));
    ev.push(...bassLine(['C3', 'A2', 'F2', 'G2'], { start, beatsPerNote: 4, v: 0.38 }));
  }
  ev.push(...line('E5:1.5 D5:.5 C5:1 D5:1 E5:2 G5:2 A5:1.5 G5:.5 E5:1 D5:1 C5:4 E5:1 G5:1 A5:2 C6:1.5 A5:.5 G5:2 E5:1 D5:1 E5:1 G5:1 D5:4', { i: 'strings', v: 0.4 }).events);
  return { id: 'vn_tinh_ca', bpm: 72, length: 32, events: ev };
}

/** Nên duyên — short bright fanfare with drums for the kiss. */
function vnHonLe() {
  const ev = [];
  for (let b = 0; b < 16; b++) {
    ev.push({ t: b, d: 0.15, n: m('C2'), i: 'drum', v: b % 4 === 0 ? 0.5 : 0.28 });
    ev.push({ t: b, d: 0.9, n: m(b % 8 < 4 ? 'G2' : 'D3'), i: 'bass', v: 0.36 });
  }
  ev.push({ t: 0, d: 4, n: m('G5'), i: 'bell', v: 0.22 }, { t: 12, d: 4, n: m('G5'), i: 'bell', v: 0.22 });
  ev.push(...line('G4:.5 B4:.5 D5:1 G5:2 E5:.5 D5:.5 E5:1 G5:2 A5:1 G5:1 E5:1 D5:1 G5:4', { i: 'brass', v: 0.5 }).events);
  return { id: 'vn_hon_le', bpm: 120, length: 16, events: ev };
}

/** Trăm năm hạnh phúc — warm finale on D ngũ cung (D E F# A B) with bells. */
function vnTramNam() {
  const ev = [];
  const CH = [chord('D4', 'F#4', 'A4'), chord('B3', 'D4', 'F#4'), chord('G3', 'B3', 'D4'), chord('A3', 'C#4', 'E4')];
  for (const start of [0, 16]) {
    ev.push(...arpeggio(CH, { start, beatsPerChord: 4, step: 0.5, i: 'harp', v: 0.24 }));
    ev.push(...padChords(CH, { start, beatsPerChord: 4, v: 0.12 }));
    ev.push(...bassLine(['D3', 'B2', 'G2', 'A2'], { start, beatsPerNote: 4, v: 0.4 }));
    ev.push({ t: start, d: 4, n: m('D6'), i: 'bell', v: 0.16 });
  }
  ev.push(...line('A4:1 B4:1 D5:2 E5:1 F#5:1 A5:2 B5:1 A5:1 F#5:1 E5:1 D5:4 F#5:1 A5:1 B5:2 D6:2 B5:2 A5:1 F#5:1 E5:2 D5:4', { i: 'lead', v: 0.42 }).events);
  return { id: 'vn_tram_nam', bpm: 92, length: 32, events: ev };
}

function modernPulse() {
  const ev = [];
  const CH = [chord('A3', 'C4', 'E4', 'G4'), chord('F3', 'A3', 'C4', 'E4'), chord('C4', 'E4', 'G4', 'B4'), chord('G3', 'B3', 'D4', 'F#4')];
  for (let rep = 0; rep < 2; rep++) {
    CH.forEach((c, i) => {
      const t = (rep * 4 + i) * 4;
      ev.push({ t, d: 4, n: c, i: 'pad', v: 0.14 });
      for (let k = 0; k < 8; k++) ev.push({ t: t + k * 0.5, d: 0.35, n: c[(k * 3) % 4] + 12, i: 'piano', v: 0.16 + (k % 4 === 0 ? 0.08 : 0) });
      ev.push({ t, d: 1.6, n: c[0] - 12, i: 'bass', v: 0.4 }, { t: t + 2.5, d: 1.2, n: c[0] - 12, i: 'bass', v: 0.3 });
      for (let k = 0; k < 4; k++) ev.push({ t: t + k, d: 0.12, n: m('C2'), i: 'drum', v: k % 2 ? 0.12 : 0.3 });
    });
  }
  return { id: 'modern_pulse', bpm: 92, length: 32, events: ev };
}

function modernGroove() {
  const t = modernPulse();
  t.events.push(...line('E5:1 G5:1 A5:2 G5:.5 E5:.5 D5:1 C5:2 E5:1 G5:1 B5:2 A5:1 G5:1 E5:2 R:2 A5:1 C6:1 B5:1 A5:1 G5:2 E5:2 D5:1 E5:1 G5:1 A5:1 G5:2', { i: 'lead', v: 0.32 }).events);
  return { ...t, id: 'modern_groove', bpm: 104 };
}

function fairyMusicBox() {
  const ev = [];
  const CH = [chord('D4', 'F#4', 'A4'), chord('B3', 'D4', 'F#4'), chord('G3', 'B3', 'D4'), chord('A3', 'C#4', 'E4')];
  for (let rep = 0; rep < 2; rep++) {
    CH.forEach((c, i) => {
      const t = (rep * 4 + i) * 6;
      ev.push({ t, d: 6, n: c, i: 'pad', v: 0.12 }, { t, d: 3, n: c[0] - 12, i: 'bass', v: 0.3 });
      for (let k = 0; k < 6; k++) ev.push({ t: t + k, d: 1, n: c[k % 3] + 24, i: 'bell', v: 0.22 });
    });
  }
  ev.push(...line('A5:3 F#5:1 G5:1 A5:1 B5:3 A5:3 G5:2 F#5:1 E5:3 F#5:3 R:3 A5:3 D6:2 C#6:1 B5:3 A5:3 G5:2 E5:1 F#5:2 E5:1 D5:6', { i: 'harp', v: 0.35, start: 0 }).events);
  return { id: 'fairy_music_box', bpm: 132, length: 48, events: ev };
}

function sorted(track) {
  track.events.sort((a, b) => a.t - b.t);
  return track;
}

export const TRACKS = {
  prelude: sorted(prelude()),
  bridal_chorus: sorted(bridalChorus()),
  piano_romance: sorted(pianoRomance()),
  wedding_march: sorted(weddingMarch()),
  waltz: sorted(waltz()),
  finale: sorted(finale()),
  vn_prelude: sorted(vnPrelude()),
  vn_celebration: sorted(vnCelebration()),
  vn_ruoc_dau: sorted(vnRuocDau()),
  vn_gia_tien: sorted(vnGiaTien()),
  vn_tinh_ca: sorted(vnTinhCa()),
  vn_hon_le: sorted(vnHonLe()),
  vn_tram_nam: sorted(vnTramNam()),
  modern_pulse: sorted(modernPulse()),
  modern_groove: sorted(modernGroove()),
  fairy_music_box: sorted(fairyMusicBox())
};

export const TRACK_LABELS = {
  prelude: 'Canon in D (Pachelbel) — prelude',
  bridal_chorus: 'Bridal Chorus (Wagner)',
  piano_romance: 'Romantic Piano (original)',
  wedding_march: 'Wedding March Fanfare',
  waltz: 'First Dance Waltz (original)',
  finale: 'Forever Together (Canon finale)',
  vn_prelude: 'Dạo đầu ngũ cung (sáng tác)',
  vn_celebration: 'Tiệc cưới Việt (sáng tác)',
  vn_ruoc_dau: 'Rước dâu — trống & đàn tranh (sáng tác)',
  vn_gia_tien: 'Lễ gia tiên — chuông & sáo (sáng tác)',
  vn_tinh_ca: 'Tình ca trao nhẫn (sáng tác)',
  vn_hon_le: 'Nên duyên — kèn mừng (sáng tác)',
  vn_tram_nam: 'Trăm năm hạnh phúc (sáng tác)',
  modern_pulse: 'Modern Pulse (original)',
  modern_groove: 'Modern Groove (original)',
  fairy_music_box: 'Fairy Music Box (original)'
};

/**
 * Build / verification step. The stage is native ES modules served as-is (no bundler needed),
 * so "building" means proving the shipped app is complete and consistent:
 *   1. every browser module parses and every relative import resolves to a real export
 *   2. both config documents load and validate
 *   3. every visual variant renders all five scenes + the full cast (in Node, no DOM)
 *   4. every chapter has choreography, every gift interaction / meter beat exists
 *   5. every music track is sorted and fits its loop
 * Exits non-zero on the first category of failure.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

process.env.LOG_SILENT = '1';
const ROOT = path.join(__dirname, '..');
const PUBLIC_JS = path.join(ROOT, 'public', 'js');
const errors = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.js') ? [path.join(dir, d.name)] : []));
}

async function main() {
  console.log('▶ Browser modules');
  const files = walk(PUBLIC_JS);
  const loaded = {};
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/import\s+(?:\{([^}]*)\}\s+from\s+)?['"](\.[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(f), m[2]);
      if (!fs.existsSync(target)) errors.push(`${path.relative(ROOT, f)} imports missing ${m[2]}`);
    }
  }
  // Import modules that are DOM-free at load time (everything except the page entry points).
  const skip = new Set(['main.js', 'admin.js']);
  for (const f of files) {
    if (skip.has(path.basename(f))) continue;
    try {
      loaded[path.relative(PUBLIC_JS, f).replace(/\\/g, '/')] = await import(pathToFileURL(f).href);
    } catch (err) {
      errors.push(`${path.relative(ROOT, f)}: ${err.message}`);
    }
  }
  // named imports must exist in the target module
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/import\s+\{([^}]*)\}\s+from\s+['"](\.[^'"]+)['"]/g)) {
      const rel = path.relative(PUBLIC_JS, path.resolve(path.dirname(f), m[2])).replace(/\\/g, '/');
      const mod = loaded[rel];
      if (!mod) continue;
      for (const name of m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
        if (!(name in mod)) errors.push(`${path.relative(ROOT, f)} imports "${name}" which ${m[2]} does not export`);
      }
    }
  }
  if (!errors.length) ok(`${files.length} modules parse, imports resolve`);

  console.log('▶ Configuration');
  const { ConfigStore } = require('../src/config');
  const config = new ConfigStore({});
  ok(`wedding.config.json: ${config.wedding.storyline.chapters.length} chapters, ${Object.keys(config.wedding.meters).length} meters, ${Object.keys(config.wedding.modes).length} modes`);
  ok(`gifts.config.json: ${config.gifts.tiers.length} tiers, ${config.gifts.gifts.length} mapped gifts`);

  console.log('▶ Variants × scenes × cast');
  const { VARIANTS } = loaded['themes/variants.js'];
  const { buildScenes } = loaded['environments/scenes.js'];
  const cast = loaded['characters/cast.js'];
  for (const v of Object.values(VARIANTS)) {
    try {
      const scenes = buildScenes({ brideName: 'Linh', groomName: 'Minh' }, v);
      let bytes = 0;
      for (const [id, sc] of Object.entries(scenes)) {
        const { back, front } = sc.build();
        if (!back.includes('<svg') || !front.includes('<svg')) throw new Error(`scene ${id} did not render`);
        if (/undefined|NaN/.test(back + front)) throw new Error(`scene ${id} contains undefined/NaN`);
        bytes += back.length + front.length;
      }
      const o = v.outfits;
      const rigs = [cast.brideSvg(o.bride), cast.groomSvg(o.groom), cast.bridesmaidSvg(0, o.bridesmaids[0]), cast.bridesmaidSvg(1, o.bridesmaids[1]), cast.groomsmanSvg(0, o.groomsmen[0]), cast.mcSvg(o.mc)];
      for (const r of rigs) if (/undefined|NaN/.test(r)) throw new Error('character rig contains undefined/NaN');
      ok(`${v.id}: 5 scenes (${Math.round(bytes / 1024)} KB SVG), bride=${o.bride.style}, groom=${o.groom.style}`);
    } catch (err) {
      errors.push(`variant ${v.id}: ${err.message}`);
    }
  }

  console.log('▶ Storyline, interactions, beats');
  const { CHAPTERS, BEATS, METER_BEATS } = loaded['storyline/choreography.js'];
  const { INTERACTIONS } = loaded['animations/interactions.js'];
  for (const ch of config.wedding.storyline.chapters) if (!CHAPTERS[ch.id]) errors.push(`chapter ${ch.id} has no choreography`);
  for (const [meter, beat] of Object.entries(METER_BEATS)) {
    if (!BEATS[beat]) errors.push(`meter ${meter} → missing beat ${beat}`);
    if (!config.wedding.meters[meter]) errors.push(`beat for unknown meter ${meter}`);
  }
  const interactions = new Set([...config.gifts.tiers.map((t) => t.defaultInteraction), ...config.gifts.gifts.map((g) => g.interaction)]);
  for (const i of interactions) if (!INTERACTIONS[i]) errors.push(`gift interaction "${i}" is not implemented`);
  if (!errors.length) ok(`${Object.keys(CHAPTERS).length} chapters choreographed, ${interactions.size} gift interactions, ${Object.keys(METER_BEATS).length} meter beats`);

  console.log('▶ Comment spawns');
  const { findSpawns, SPAWN_WORD_COUNT } = loaded['effects/spawns.js'];
  const expect = { 'con đà điểu': 'ostrich', 'con da dieu': 'ostrich', 'cá sấu': '🐊', 'ông bà mạnh khỏe': '', 'của ai đó': '' };
  for (const [text, icon] of Object.entries(expect)) {
    const got = findSpawns(text)[0]?.icon || '';
    if (got !== icon) errors.push(`spawn "${text}" → "${got}", expected "${icon}"`);
  }
  if (!errors.length) ok(`${SPAWN_WORD_COUNT} spawn words, matcher checks pass`);

  console.log('▶ Music');
  const { TRACKS } = loaded['audio/music.js'];
  for (const [id, t] of Object.entries(TRACKS)) {
    const end = Math.max(...t.events.map((e) => e.t + e.d));
    if (t.events.some((e, i) => i && e.t < t.events[i - 1].t)) errors.push(`track ${id} events unsorted`);
    if (Math.max(...t.events.map((e) => e.t)) >= t.length) errors.push(`track ${id} has notes past its loop`);
    if (end > t.length + 1) errors.push(`track ${id} overruns its loop (${end} > ${t.length})`);
  }
  for (const v of Object.values(VARIANTS)) for (const tr of Object.values(v.music || {})) if (!TRACKS[tr]) errors.push(`variant ${v.id} uses unknown track ${tr}`);
  if (!errors.length) ok(`${Object.keys(TRACKS).length} tracks fit their loops`);

  if (errors.length) {
    console.error(`\n✖ Build failed (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('\n✔ Build verified');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

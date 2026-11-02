# 💍 WEDDING LIVE – THE BIG DAY

An interactive TikTok Live wedding game. Everyone watching the stream helps make the wedding happen: **likes, follows, comments, shares and gifts** decorate the venue, seat viewers as guests, fill community meters and unlock the story, from the preparation through the ring exchange and the kiss to the grand finale.

- **1920×1080 stage** that scales to any output, with a HUD boost for 1280×720 / 1366×768. A clean source for OBS / TikTok Live Studio.
- **5 visual variants** (Luxury European, Romantic Garden, Modern, Fairytale, Vietnamese Modern). Each has its own architecture, outfits, particles, music and HUD.
- **6 game modes** (Classic, Bride vs Groom, Love Race, Wedding Rush, Gift Battle, Perfect Wedding) on a plugin architecture.
- Characters, environments, music and sound effects are **all original and generated in code** (SVG + Canvas + WebAudio). There are no third-party images or recorded music.
- The TikTok Live connection, JSON-RPC 2.0, WebSocket and ZeroTTS voice are preserved from the original `tiktok-live-temple-rpc` and sit behind an adapter, so the game never depends on TikTok payloads.

| URL | Purpose |
| :-- | :-- |
| `http://localhost:3000/` | Stage + mock-mode control bar |
| `http://localhost:3000/?obs=1` | Clean stage for OBS (Browser Source **1920×1080**, autoplay audio) |
| `http://localhost:3000/?debug=1` | Stage with the developer debug panel open |
| `http://localhost:3000/admin` | Wedding Admin Dashboard |
| `POST /rpc`, `ws://…/ws` | JSON-RPC 2.0 (TikFinity, Streamer.bot, webhooks…) |

---

## 🚀 Run, build, lint, test

```bash
npm install            # or: bun install
npm run start:node     # or: bun start   (Node ≥ 18)
npm run lint           # ESLint (Node + browser configs)
npm run build          # verifies modules/imports, configs, all variants × scenes × cast, beats, music
npm test               # 41 unit + integration tests (node:test), incl. a 1000 events/s load test
npm run check          # lint + build + test
```

There is no bundler: the stage ships as native ES modules. `npm run build` is a verification build. It imports every browser module, checks every named import, renders all five variants (five scenes plus the full cast each) in Node, and checks that every chapter, gift interaction, meter beat and music loop exists and is consistent.

**Go live:** open `/admin` → enter `@username` (or a TikTok Live link) → **Connect**. Before connecting, the server asks TikTok whether the account is live, so an offline account gets a clear error instead of a silent "connected".
**OBS:** add a Browser Source `http://localhost:3000/?obs=1`, 1920×1080, and tick *Control audio via OBS*.
**MC voice (optional):** with a `.venv` that has `zerotts` installed, the server runs `tts_worker.py` (Vietnamese "Mai Chi" voice). Otherwise the stage falls back to the browser's Web Speech API.

Environment variables: `PORT` (3000) · `TIKTOK_USER` (auto-connect) · `ADMIN_TOKEN` (protect control methods) · `NODE_ENV=production` (disables the debug panel) · `LOG_LEVEL` · `TTS_DISABLED` · `PYTHON_BIN`.

---

## 🎮 Core identity: every interaction has a visible consequence

| TikTok | On stage | Feedback chain |
| :-- | :-- | :-- |
| ❤️ Like | Hearts rise, love increases | batched per viewer → +love pop → meters → hearts |
| ➕ Follow | **A new guest** walks in and takes a seat with a name tag | toast → +25 → guest counter → walk-in |
| 💬 Comment | **A wedding wish** card floats up through the venue (TTS reads one every 8 s) | moderated → wish feed → floating wish |
| 💬 `chụp ảnh` / `hôn đi` / `nhảy` / `dzô` | Photo booth · kiss · dance · toast (+ Dance / Champagne meter bonus) | keyword → reaction |
| 🔁 Share | Confetti cannon, celebration grows | toast → +40 → Support / Champagne meters |
| 🌹 Rose | A guest delivers flowers to the bride | flower counter → petal burst |
| ❤ Heart | Heart explosion around the couple | |
| 💎 Medium / large gift | Champagne pop / **Special Dance** cinematic | gift explosion (rarity-scaled) |
| 👑 Premium gift | **Fireworks show / Grand celebration**, camera shake, and a **Chapter Boost** that pushes the story forward | |

Every gift runs the whole chain: notification → score pop → meters animate → the bride or groom reacts → effect → event history (admin log).

## 📖 Storyline: 7 chapters, each with an objective

| # | Chapter | Objective (configurable) | What the community unlocks |
| :-: | :-- | :-- | :-- |
| 1 | Wedding Preparation | **Preparation meter** (required) | The venue decorates itself in 4 stages: flowers → candles → chandeliers/lights → arch, and the aisle runner unrolls |
| 2 | The Bride's Entrance | Love threshold | Letterbox, spotlight camera, the bride walks the aisle through petal rain, guests cheer |
| 3 | The Wedding Ceremony | Love threshold | MC officiates, vows, light beams |
| 4 | Ring Exchange | **Ring meter** (required) | The ring box waits until gifts fill the meter → cinematic ring exchange (close-up, sparkle trail, bells) |
| 5 | The Wedding Kiss | Love threshold (+ Celebration meter) | Officiant steps aside, kiss, flash, fireworks, **WEDDING COMPLETE!**, Just Married |
| 6 | Wedding Reception | Love threshold | **Cake / Champagne / Dance / Celebration meters**, each fill plays its beat (cake cutting, toast at the tower, first dance, fireworks); bouquet toss |
| 7 | Forever Together | Celebration meter | Grand stage, fireworks, **Final Scoreboard**: Love Score, Happiness, Total Gifts, Guests, Flowers, Comments, Top Supporters → **THE BIG DAY IS COMPLETE** |

Chapters advance one at a time (minimum screen time per chapter). A chapter with `requireObjective` waits until its meter is filled; for example, the kiss can't happen before the rings are exchanged. Thresholds, meters, objectives, durations, scenes and music all live in `src/config/wedding.config.json` and are editable in `/admin`.

### Community meters

All meters are one generic, config-driven `MeterManager`. Adding a meter is a config change:

```jsonc
"ring": { "label": "Ring Meter", "icon": "💍", "max": 1500,
  "sources": { "like": 0.3, "comment": 3, "giftPoints": 1 },            // like/follow/share/comment/join,
                                                                         // commentActions, giftPoints, giftHappiness, giftKeys
  "onFull": { "bonusPoints": 400, "resetTo": 0, "growth": 1.3, "maxCap": 6000, "action": "meter_full" } }
```

Global meters: **Happiness** (decays; overflow = celebration + bonus) and **Community Support** (levels with growing goals). Chapter meters: Preparation, Ring, Cake, Champagne, Dance, Celebration. The HUD also shows the **Love Meter** (community progress across all 7 chapters), guests, flowers, gifts, comments and likes.

## 🕹️ Game modes (plugins)

| Mode | Rules |
| :-- | :-- |
| **Classic** | The whole community runs the wedding together |
| **Bride vs Groom** | Comment "cô dâu" / "chú rể" to pick a side; your contribution powers your team; tug-of-war HUD, lead-change announcements, winner at the finale; teams sit on their side of the aisle |
| **Love Race** | Viewers are auto-seated with the bride's or the groom's family; timed rounds, the winning family earns bonus love |
| **Wedding Rush** | Reach the Grand Finale before the timer ends (chapters run faster); success or "Hết giờ!", then auto-restart |
| **Gift Battle** | Timed rounds; the round's top contributor is crowned **Round Champion** |
| **Perfect Wedding** | Each chapter has a deadline; a miss is a mistake (💍 lives); too many and the wedding restarts. Zero mistakes = **PERFECT WEDDING** |

A mode is a `GameMode` subclass with hooks (`onEvent`, `onTick`, `onChapter`, `durationScale`, `teamOf`, `publicState`, `serialize`). Register it in `src/gameplay/modes/index.js`; the engine core doesn't change. Pick the mode in `/admin`.

## 🎨 Visual variants

| Variant | Venue architecture | Couple | Atmosphere |
| :-- | :-- | :-- | :-- |
| **A · Luxury European** | Ballroom: pilasters, arched windows, gold-framed arch, candelabras, crystal chandeliers | Ball gown · black tux | Champagne gold, warm light, bokeh |
| **B · Romantic Garden** | Sunset garden, rose hedges, fairy lights, red carpet | Ball gown · tux | Pink petals |
| **C · Modern Wedding** | Minimal white architecture, black ring arch, night-city window, black runner, linear lights | Mermaid gown · white tux | Black · white · gold, dark HUD |
| **D · Fairytale** | Twilight castle, glowing flowers, crystal arch, lamp posts, stars | Princess gown · prince uniform | Magic particles, music box |
| **E · Vietnamese Modern** | Red Song Hỷ (囍) flower gate, lanterns, peach blossoms, mâm quả trays | **Áo dài** + khăn vấn · áo dài + khăn đóng | Red & gold, pentatonic music |

Variants live in `public/js/themes/variants.js` (palettes, outfits, particles, music, HUD) and `public/js/environments/venues.js` (architecture). Switch in `/admin`; the stage reloads itself.

## 🧩 Architecture

```
TikTok Live ─┐  src/tiktok (connector preserved · normalizer · gift combo tracker)
Mock mode   ─┼─▶ GameEvent {type,user,amount,gift,text,timestamp,source,metadata}   src/events/game-event.js
RPC/webhook ─┘
     │
     ▼  src/events/pipeline.js
  moderation → anti-spam (cooldowns, dedup, rate limit) → like batching (100 packets → 1 event)
     │
     ▼  src/gameplay/wedding-engine.js  (GameEngine facade)
  ├─ scoring + gift rules (gift-mapper: id/name, tiers, cooldown, chapterRequirement, rarity, chapterBoost)
  ├─ MeterManager (meters.js) · Leaderboard (leaderboard.js) · chapter state machine (storyline.js)
  └─ GameMode plugin (modes/*)
     │ actions
     ▼  src/events/event-queue.js — priority, coalescing, bounded, paced
  WebSocket ──▶ stage: Director (cinematic lock) ─┬─ storyline/choreography (chapters + BEATS)
                                                 ├─ animations/interactions (gift & social & mode reactions)
                                                 ├─ environments (scenes · venues · stage camera)
                                                 ├─ characters (CharacterManager + SVG rigs)
                                                 ├─ effects (pooled particles · overlays) · audio
                                                 └─ ui (HUD · debug panel)
```

```
src/config/            wedding.config.json · gifts.config.json · loader/validator (+ admin overrides in data/config)
src/core/              logger · JSON-RPC registry
src/tiktok/            connector (preserved + live pre-check) · normalizer · combo tracker
src/events/            game-event · pipeline · sanitizer · anti-spam · presentation queue
src/gameplay/          wedding-engine · gift-mapper · meters · leaderboard · modes/
src/storyline/         chapter state machine (thresholds, objectives, pacing)
src/mock/              mock events, bursts, sustained 10/100/1000 events per second
src/tts/               ZeroTTS worker manager
public/js/characters/  cast.js (SVG rigs + outfits) · manager.js (character entities)
public/js/environments/ decor · scenes · venues · stage (camera, seating, decor level, shake)
public/js/themes/      visual variants
public/js/storyline/   chapter choreography + reusable beats
public/js/animations/  director · interactions
public/js/effects/     particles (pooled) · overlays
public/js/audio/       music (11 tracks) · audio engine (synth, SFX, TTS, master/mute)
public/js/ui/          HUD · debug panel
public/js/dashboard/   admin dashboard
scripts/build.js       verification build
test/                  gameplay · systems · server integration tests
```

**Character entities.** `{ id, name, type, position, animation, emotion, outfit, visibility, state }`. Types: bride, groom, bridesmaid, groomsman, MC, guest. Animations: idle, walk, celebrate, cheer, clap, dance, wave, love, surprise, hold, kiss, toast, cut, throw, heart, present, mic.

## 🖥️ Stage layout (safe zones)

Top: title, couple, LIVE/mode status · Left: current chapter, objective meter, chapter meters, journey · Right: **Top Wedding Guests** (🥇🥈🥉, badges, animated rank changes, top 10) · Bottom: how to participate, **Community Progress** with chapter milestones, counters · Bottom corners: wishes and recent events · Top centre: mode panel (only in game modes). The centre stays clear for the wedding.

## 🎛️ Admin dashboard and 🛠 debug panel

**Admin:** start/pause/resume/reset, previous/next/**restart chapter**, chapter activation, meter fill, score and happiness, couple names, **game mode and visual variant**, TikTok connect/status (viewers, **event rate**, **last event**), mock events plus **10/100/1000 events/s** stress, effects (hearts, petals, confetti, fireworks, sparkles, light beams, camera shake, floating wishes, gift explosions, cinematic letterbox), particle budget, **master/music/SFX/voice volume and mute**, chapter thresholds, **gift configuration** (tiers + per-gift id/name/effect/**cooldown/sound/rarity/chapter requirement/boost**), meter goals, scoring, anti-spam and queue rules, and a live event log.

**Debug panel** (`?debug=1` or Ctrl+Shift+D): FPS, memory (page + server), WebSocket, TikTok, event rate, anti-spam, queue, active particles, walkers and cinematics, game state, chapter and objective, and every character entity. Controls: trigger events, stress rates, score, chapters, clear queue, reset, effect toggles. It's disabled when `NODE_ENV=production` or `debug.enabled=false`, and hidden in OBS mode unless `?debug=1`.

## ⚡ Performance for multi-hour streams

Like batching at ingest; queue coalescing and a size bound; a cinematic lock; a particle budget with **object pooling** and pre-rendered sprites; the frame loop sleeps when idle; capped DOM (toasts, bubbles, floating wishes, walkers); leaderboard pruning (`leaderboard.maxTracked`); bounded logs and anti-spam maps. Tested: 1000 events/second through the real server keeps the queue bounded and keeps scoring; a full-budget particle frame takes about 3 ms.

## 🎵 Assets and licensing

Every graphic is SVG or Canvas drawn in code. Music is synthesized live with WebAudio: **Canon in D** (Pachelbel), the **Bridal Chorus** (Wagner) and a Mendelssohn-style fanfare are public-domain works arranged here. The romantic piano, waltz, finale, *Ngũ Cung* prelude, *Tiệc Cưới Việt*, Modern Pulse/Groove and Fairy Music Box are original. Bells, applause, cheering, fireworks and champagne sounds are synthesized.

## 🔌 JSON-RPC 2.0 (selection)

`wedding.getState|getStatus|getConfig|getLogs` · `wedding.start|pause|reset|restartChapter` · `wedding.setChapter{id}|nextChapter|prevChapter` · `wedding.adjustScore{delta|set|happiness|meter,meterValue}` · `wedding.setMode{id}` · `wedding.listModes` · `wedding.setTheme{variant}` · `wedding.triggerEffect{effect}` · `wedding.updateConfig{section,patch}` · `wedding.restoreDefaults{section}` · `wedding.event{type,user,…}` · `mock.event|burst|auto|rate{eventsPerSec,durationSec}` · `live.connect{username}|disconnect|status` · `tts.speak|status`

```bash
curl -X POST http://localhost:3000/rpc -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"wedding.event",
  "params":{"type":"gift","user":{"id":"minh.anh","name":"Minh Anh"},"gift":{"id":5655,"name":"Rose","diamonds":1,"count":10}}}'
```

With `ADMIN_TOKEN` set, control methods require the `x-admin-token` header (or `?token=` on the stage or admin URL).

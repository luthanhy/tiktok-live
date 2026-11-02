/**
 * Wedding Admin Dashboard — all controls go through JSON-RPC (same API OBS tools can use).
 */
import { WeddingSocket } from '../core/net.js';
import { escapeHtml, fmt } from '../core/util.js';
import { INTERACTIONS, MANUAL_EFFECTS } from '../animations/interactions.js';
import { TRACK_LABELS } from '../audio/music.js';

const $ = (s) => document.querySelector(s);
const INTERACTION_NAMES = Object.keys(INTERACTIONS);
const SCENE_NAMES = ['garden', 'ceremony', 'reception', 'dance', 'grand'];
const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const SOUNDS = ['gift', 'heart', 'sparkle', 'chime', 'fanfare', 'bells', 'champagne', 'pop', 'impact'];
const THEMES = [
  ['luxury', 'A · Luxury European', 'Ballroom, champagne gold, crystal chandeliers'],
  ['garden', 'B · Romantic Garden', 'Sunset garden, pink flowers, fairy lights'],
  ['modern', 'C · Modern Wedding', 'Black · white · gold, minimal architecture'],
  ['fairytale', 'D · Fairytale', 'Castle, glowing flowers, stars, magic'],
  ['vietnamese', 'E · Vietnamese Modern', 'Áo dài, cổng hoa, đèn lồng, Song Hỷ']
];
const EFFECT_LABELS = { petals: '🌸 Cánh hoa', hearts: '💗 Tim bay', confetti: '🎊 Pháo giấy', fireworks: '🎆 Pháo hoa', sparkles: '✨ Lấp lánh', lightBeams: '🔦 Tia sáng', cinematicTransitions: '🎬 Letterbox điện ảnh', cameraShake: '📳 Rung camera', floatingWishes: '💌 Lời chúc bay', giftExplosions: '💥 Nổ quà', commentSpawns: '🦤 Bình luận gọi con vật/đồ vật', commentBubbles: '💬 Bong bóng thoại trên khách' };
const AUDIO_LABELS = { musicEnabled: '🎼 Nhạc nền', sfxEnabled: '🔔 Hiệu ứng âm thanh', ttsEnabled: '🎙 Giọng MC (TTS)', muted: '🔇 Tắt tiếng tất cả' };

const tokenInput = $('#admin-token');
try {
  tokenInput.value = localStorage.getItem('wedding_admin_token') || '';
} catch (_) {}
const net = new WeddingSocket({ role: 'admin', token: tokenInput.value });
tokenInput.addEventListener('change', () => {
  net.token = tokenInput.value.trim();
  try {
    localStorage.setItem('wedding_admin_token', net.token);
  } catch (_) {}
  toast('Đã lưu token');
});

let config = null;
let logs = [];

function toast(msg, bad = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast show${bad ? ' bad' : ''}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = 'toast'), 2600);
}

async function call(method, params = {}, okMsg) {
  try {
    const res = await net.call(method, params);
    if (okMsg) toast(okMsg);
    return res;
  } catch (err) {
    toast(`${method}: ${err.message}`, true);
    throw err;
  }
}

function pill(id, text, kind) {
  const p = $(id);
  p.textContent = text;
  p.className = `pill ${kind || ''}`;
}

// ------------------------------------------------------------------ state rendering
function renderState(s) {
  const prog = s.progress;
  $('#now-title').textContent = `${prog.current.order}. ${prog.current.title}`;
  $('#now-sub').textContent = prog.current.subtitle || '';
  $('#st-love').textContent = fmt(s.love);
  $('#st-next').textContent = prog.next ? `${fmt(prog.pointsToNext)} → ${prog.next.title}` : 'Hoàn thành';
  $('#st-happy').textContent = `${Math.round(s.happiness)}%`;
  $('#st-elapsed').textContent = `${s.chapterElapsedSec}s`;
  $('#st-bar').style.width = `${prog.chapterPct}%`;
  pill('#game-pill', s.status === 'running' ? 'Đang chạy' : s.status === 'paused' ? 'Tạm dừng' : s.status, s.status === 'running' ? 'ok' : 'warn');

  $('#chapter-list').innerHTML = prog.chapters
    .map(
      (c) => `<li class="${c.state}">
        <span class="ch-ord">${c.order}</span>
        <span class="ch-name"><b>${escapeHtml(c.title)}</b><small>${escapeHtml(c.subtitle || '')} · ${fmt(c.threshold)} điểm · ${c.scene}</small></span>
        <span class="ch-state">${{ done: '✓ Đã qua', active: '● Đang diễn', ready: '◎ Đủ điểm', locked: '🔒 Khóa' }[c.state]}</span>
        <button class="btn sm" data-chapter="${c.id}">Kích hoạt</button></li>`
    )
    .join('');

  $('#meter-list').innerHTML = (s.meters || [])
    .filter((m) => m.active)
    .map((m) => `<div class="meter-row"><span>${m.icon} ${escapeHtml(m.label)}${m.completions ? ` ×${m.completions}` : ''}</span><div class="progress sm"><i style="width:${m.pct}%"></i></div><b>${fmt(Math.round(m.value))}/${fmt(m.max)}</b><button class="btn sm" data-fill="${m.id}">Lấp đầy</button></div>`)
    .join('');
  renderChoices(s);
  const c = s.counters;
  $('#counters').innerHTML = [
    ['👥', 'Khách', c.guests],
    ['🌹', 'Hoa', c.flowers],
    ['🎁', 'Quà', c.gifts],
    ['💎', 'Kim cương', c.diamonds],
    ['💗', 'Like', c.likes],
    ['💬', 'Bình luận', c.comments],
    ['💌', 'Lời chúc', c.wishes],
    ['🔁', 'Share', c.shares],
    ['➕', 'Follow', c.follows],
    ['📸', 'Ảnh', c.photos],
    ['🤝', `Support Lv.${s.support.level}`, `${Math.round(s.support.pct)}%`]
  ]
    .map(([i, l, v]) => `<div><span>${i}</span><b>${typeof v === 'number' ? fmt(v) : v}</b><small>${l}</small></div>`)
    .join('');
  $('#lb').innerHTML = s.leaderboard.map((l) => `<li><b>${l.rank}. ${escapeHtml(l.name)}</b><span>${fmt(l.points)} điểm · ${l.gifts} quà · ${fmt(l.diamonds)}💎</span></li>`).join('') || '<li class="muted">Chưa có</li>';
  $('#gs').innerHTML = s.giftStats.map((g) => `<li><b>${escapeHtml(g.label)}</b><span>×${fmt(g.count)} · ${fmt(g.diamonds)}💎</span></li>`).join('') || '<li class="muted">Chưa có</li>';
}

function renderChoices(s) {
  const modeSig = `${s.mode?.id}|${s.theme}`;
  if (modeSig === renderChoices.sig) return;
  renderChoices.sig = modeSig;
  $('#mode-list').innerHTML = (s.modes || [])
    .map((m) => `<button class="choice${m.id === s.mode?.id ? ' active' : ''}" data-mode="${m.id}"><b>${escapeHtml(m.label)}</b><small>${escapeHtml(m.description || '')}</small></button>`)
    .join('');
  $('#theme-list').innerHTML = THEMES.map(([id, label, desc]) => `<button class="choice${id === s.theme ? ' active' : ''}" data-theme="${id}"><b>${label}</b><small>${desc}</small></button>`).join('');
}

function renderStatus(st) {
  const q = st.queue;
  $('#pipeline-kv').innerHTML = kv({
    'Hàng đợi': `${q.size} (đã phát ${fmt(q.dispatched)}, gộp ${fmt(q.coalesced)}, bỏ ${fmt(q.dropped)})`,
    'Anti-spam': `${fmt(st.antiSpam.accepted)} nhận · ${fmt(st.antiSpam.rejected)} chặn`,
    'Lý do chặn': Object.entries(st.antiSpam.reasons).map(([k, v]) => `${k}: ${v}`).join(', ') || '—',
    'Màn hình đang mở': st.clients,
    'Mock auto': st.mock.running ? `Bật (${st.mock.intervalMs}ms)` : 'Tắt',
    Uptime: `${Math.round(st.uptimeSec / 60)} phút`
  });
  $('#auto-sim').checked = st.mock.running;
  renderLive(st.live);
  renderTts(st.tts);
  const pl = st.pipeline;
  $('#rate-kv').innerHTML = kv({
    'Tốc độ': `${pl.ratePerSec} sự kiện/giây`,
    'Đã nhận': `${fmt(pl.received)} (${Object.entries(pl.byType).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ') || '—'})`,
    'Like đã gộp': fmt(pl.batchedLikes),
    'Sự kiện cuối': pl.lastEvent ? `${pl.lastEvent.type} · ${pl.lastEvent.user} ×${pl.lastEvent.amount} (${pl.lastEvent.source}) · ${new Date(pl.lastEvent.at).toLocaleTimeString('vi-VN')}` : '—',
    'Mock rate': st.mock.rate ? `${st.mock.rate.eventsPerSec}/s · còn ${st.mock.rate.remainingSec}s` : 'tắt',
    'Bộ nhớ server': `${st.memory.rssMb} MB`
  });
}

function renderLive(l) {
  pill('#live-pill', l.connected ? `LIVE @${l.username}` : l.connecting ? 'Đang kết nối…' : 'TikTok offline', l.connected ? 'ok' : l.connecting ? 'warn' : 'bad');
  $('#live-kv').innerHTML = kv({
    'Trạng thái': l.connected ? '🟢 Đã kết nối' : l.connecting ? '🟡 Đang kết nối' : '⚪ Chưa kết nối',
    'Tài khoản': l.username ? `@${l.username}` : '—',
    'Room ID': l.roomId || '—',
    'Người xem': fmt(l.viewerCount || 0),
    'Sự kiện nhận': fmt(l.eventsReceived || 0),
    'Kết nối lúc': l.connectedAt ? new Date(l.connectedAt).toLocaleTimeString('vi-VN') : '—',
    'Lỗi gần nhất': l.lastError || '—'
  });
}

function renderTts(t) {
  pill('#tts-pill', t.ready ? 'ZeroTTS sẵn sàng' : `TTS: ${t.status} (dùng giọng trình duyệt)`, t.ready ? 'ok' : 'warn');
}

function kv(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`)
    .join('');
}

// ------------------------------------------------------------------ config forms
function renderConfig() {
  const w = config.wedding;
  $('#auto-advance').checked = w.storyline.autoAdvance !== false;
  $('#auto-connect').checked = Boolean(w.tiktok?.autoConnect);
  $('#live-user').value = w.tiktok?.username || '';
  $('#groom-name').value = w.couple.groomName;
  $('#bride-name').value = w.couple.brideName;

  $('#effect-toggles').innerHTML = Object.entries(EFFECT_LABELS)
    .map(([k, l]) => `<label class="switch"><input type="checkbox" data-effect="${k}" ${w.effects[k] !== false ? 'checked' : ''}/> <span>${l}</span></label>`)
    .join('');
  $('#particle-budget').value = w.effects.particleBudget;
  $('#particle-budget-out').textContent = w.effects.particleBudget;
  $('#audio-toggles').innerHTML = Object.entries(AUDIO_LABELS)
    .map(([k, l]) => `<label class="switch"><input type="checkbox" data-audio="${k}" ${(k === 'muted' ? w.audio[k] === true : w.audio[k] !== false) ? 'checked' : ''}/> <span>${l}</span></label>`)
    .join('');
  $('#master-volume').value = w.audio.masterVolume ?? 0.9;
  $('#music-volume').value = w.audio.musicVolume;
  $('#sfx-volume').value = w.audio.sfxVolume;
  $('#tts-volume').value = w.audio.ttsVolume;

  const chapters = [...w.storyline.chapters].sort((a, b) => a.order - b.order);
  $('#chapter-table tbody').innerHTML = chapters
    .map(
      (c) => `<tr data-id="${c.id}">
      <td>${c.order}</td>
      <td><input data-f="title" value="${escapeHtml(c.title)}"/></td>
      <td><input data-f="subtitle" value="${escapeHtml(c.subtitle || '')}"/></td>
      <td><input data-f="threshold" type="number" min="0" value="${c.threshold}"/></td>
      <td><input data-f="minDurationSec" type="number" min="0" value="${c.minDurationSec}"/></td>
      <td><select data-f="scene">${SCENE_NAMES.map((s) => `<option ${s === c.scene ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td><select data-f="music">${Object.entries(TRACK_LABELS).map(([k, l]) => `<option value="${k}" ${k === c.music ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}</select></td></tr>`
    )
    .join('');

  const g = config.gifts;
  const interSel = (val, field = 'interaction') => `<select data-f="${field}">${INTERACTION_NAMES.map((n) => `<option ${n === val ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  $('#tier-table tbody').innerHTML = g.tiers
    .map(
      (t) => `<tr data-id="${t.id}"><td><b>${t.id}</b></td>
      <td><input data-f="label" value="${escapeHtml(t.label)}"/></td>
      <td><input data-f="minDiamonds" type="number" min="1" value="${t.minDiamonds}"/></td>
      <td><input data-f="pointsPerDiamond" type="number" min="0" step="0.5" value="${t.pointsPerDiamond}"/></td>
      <td><input data-f="maxPoints" type="number" min="0" value="${t.maxPoints ?? ''}" placeholder="∞"/></td>
      <td><input data-f="happiness" type="number" min="0" value="${t.happiness}"/></td>
      <td>${interSel(t.defaultInteraction, 'defaultInteraction')}</td>
      <td><input data-f="cooldownMs" type="number" min="0" step="250" value="${t.cooldownMs || 0}"/></td>
      <td>${opts('rarity', RARITIES, t.rarity)}</td>
      <td><input data-f="chapterBoost" type="checkbox" ${t.chapterBoost ? 'checked' : ''}/></td>
      <td><input data-f="announce" type="checkbox" ${t.announce ? 'checked' : ''}/></td></tr>`
    )
    .join('');
  $('#gift-table tbody').innerHTML = g.gifts.map((m) => giftRow(m, interSel)).join('');
  $('#add-gift').onclick = () => {
    $('#gift-table tbody').insertAdjacentHTML('beforeend', giftRow({ key: `gift_${Date.now().toString(36)}`, label: 'Quà mới', ids: [], names: [], interaction: 'sparkle_shower', counters: {} }, interSel));
  };

  const sc = w.scoring;
  const as = w.antiSpam;
  const qu = w.queue;
  const me = w.meters;
  const field = (path, label, val, step = 1) => `<label><span>${label}</span><input data-path="${path}" type="number" step="${step}" value="${val}"/></label>`;
  $('#rules').innerHTML = `
    <fieldset><legend>Điểm</legend>
      ${field('scoring.like.pointsPerLike', 'Điểm / like', sc.like.pointsPerLike)}
      ${field('scoring.like.maxLikesPerEvent', 'Like tối đa / gói', sc.like.maxLikesPerEvent)}
      ${field('scoring.follow.points', 'Follow', sc.follow.points)}
      ${field('scoring.share.points', 'Share', sc.share.points)}
      ${field('scoring.comment.points', 'Bình luận', sc.comment.points)}
      ${field('scoring.join.points', 'Vào phòng', sc.join.points)}
    </fieldset>
    <fieldset><legend>Meters</legend>
      ${field('meters.happiness.decayPerMinute', 'Happiness giảm / phút', me.happiness.decayPerMinute, 0.5)}
      ${field('meters.happiness.onFull.bonusPoints', 'Thưởng khi tràn vui', me.happiness.onFull.bonusPoints)}
      ${field('meters.support.onFull.growth', 'Support: hệ số tăng mục tiêu', me.support.onFull.growth, 0.05)}
      ${field('meters.support.onFull.bonusPoints', 'Thưởng Support', me.support.onFull.bonusPoints)}
      ${field('antiSpam.likeAggregateWindowMs', 'Gộp like (ms)', as.likeAggregateWindowMs, 100)}
    </fieldset>
    <fieldset><legend>Chống spam</legend>
      ${field('antiSpam.commentCooldownMs', 'Cooldown bình luận (ms)', as.commentCooldownMs, 100)}
      ${field('antiSpam.duplicateCommentWindowMs', 'Chặn trùng (ms)', as.duplicateCommentWindowMs, 1000)}
      ${field('antiSpam.maxCommentLength', 'Độ dài bình luận tối đa', as.maxCommentLength)}
      ${field('antiSpam.shareCooldownMs', 'Cooldown share (ms)', as.shareCooldownMs, 1000)}
      ${field('antiSpam.maxEventsPerUserPerMinute', 'Sự kiện / người / phút', as.maxEventsPerUserPerMinute)}
    </fieldset>
    <fieldset><legend>Mục tiêu meter (điểm để đầy)</legend>
      ${Object.entries(w.meters).map(([id, m]) => field(`meters.${id}.max`, `${m.icon} ${m.label}`, m.max)).join('')}
    </fieldset>
    <fieldset><legend>Hàng đợi hiệu ứng</legend>
      ${field('queue.maxSize', 'Kích thước tối đa', qu.maxSize)}
      ${field('queue.dispatchIntervalMs', 'Nhịp phát (ms)', qu.dispatchIntervalMs, 10)}
      ${field('queue.maxBurst', 'Số hiệu ứng / nhịp', qu.maxBurst)}
    </fieldset>`;
}

function giftRow(m, interSel) {
  return `<tr>
    <td><input data-f="key" value="${escapeHtml(m.key)}"/></td>
    <td><input data-f="label" value="${escapeHtml(m.label || '')}"/></td>
    <td><input data-f="ids" value="${escapeHtml((m.ids || []).join(', '))}" placeholder="5655, …"/></td>
    <td><input data-f="names" value="${escapeHtml((m.names || []).join(', '))}" placeholder="rose, hoa hồng"/></td>
    <td>${interSel(m.interaction)}</td>
    <td><select data-f="forceTier"><option value="">—</option>${config.gifts.tiers.map((t) => `<option ${t.id === m.forceTier ? 'selected' : ''}>${t.id}</option>`).join('')}</select></td>
    <td><input data-f="cooldownMs" type="number" min="0" step="250" value="${m.cooldownMs ?? ''}" placeholder="tier"/></td>
    <td>${opts('sound', ['', ...SOUNDS], m.sound || '')}</td>
    <td>${opts('rarity', ['', ...RARITIES], m.rarity || '')}</td>
    <td>${opts('chapterRequirement', ['', ...config.wedding.storyline.chapters.map((c) => c.id)], m.chapterRequirement || '')}</td>
    <td><input data-f="chapterBoost" type="checkbox" ${m.chapterBoost ? 'checked' : ''}/></td>
    <td><input data-f="flowers" type="number" min="0" value="${m.counters?.flowers || 0}"/></td>
    <td><button class="btn sm danger" data-remove-row>✕</button></td></tr>`;
}

const opts = (field, values, current) => `<select data-f="${field}">${values.map((v) => `<option value="${v}" ${v === current ? 'selected' : ''}>${v || '—'}</option>`).join('')}</select>`;

function readTable(sel, map) {
  return [...document.querySelectorAll(`${sel} tbody tr`)].map((tr) => {
    const get = (f) => tr.querySelector(`[data-f="${f}"]`);
    return map(tr, get);
  });
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => (o = o[k] = o[k] || {}));
  o[keys[keys.length - 1]] = value;
}

async function loadConfig() {
  config = await call('wedding.getConfig');
  renderConfig();
}

// ------------------------------------------------------------------ logs
function addLog(entry) {
  logs.unshift(entry);
  if (logs.length > 400) logs.length = 400;
  renderLogs();
}

function logLine(e) {
  if (e.level) return { cls: `server ${e.level}`, type: 'server', html: `<b>[${e.scope || 'server'}]</b> ${escapeHtml(e.message)}` };
  switch (e.type) {
    case 'gift':
      return { cls: 'gift', type: 'gift', html: `🎁 <b>${escapeHtml(e.user)}</b> tặng ${e.count}× ${escapeHtml(e.gift)} · ${fmt(e.diamonds)}💎 · ${e.tier}/${e.rarity || ''} · +${fmt(e.points)} điểm${e.boost ? ' · ⚡ boost' : ''}${e.note ? ` · ${e.note}` : ''}` };
    case 'comment':
      return { cls: 'comment', type: 'comment', html: `💬 <b>${escapeHtml(e.user)}</b> [${e.action}] ${escapeHtml(e.text)} · +${fmt(e.points || 0)}` };
    case 'follow':
      return { cls: 'follow', type: 'follow', html: `➕ <b>${escapeHtml(e.user)}</b> follow → khách mời mới` };
    case 'share':
      return { cls: 'share', type: 'share', html: `🔁 <b>${escapeHtml(e.user)}</b> chia sẻ → pháo giấy` };
    case 'chapter':
      return { cls: 'chapter', type: 'chapter', html: `📖 Chương: <b>${escapeHtml(e.title)}</b>${e.manual ? ' (thủ công)' : ' (tự động)'}` };
    case 'meter_full':
      return { cls: 'chapter', type: 'chapter', html: `✨ Meter <b>${escapeHtml(e.label)}</b> đầy (lần ${e.completions}) · +${fmt(e.bonus)} điểm` };
    case 'rejected':
      return { cls: 'rejected', type: 'rejected', html: `⛔ Chặn ${escapeHtml(e.event || '')} từ <b>${escapeHtml(e.user || '?')}</b>: ${escapeHtml(e.reason)}` };
    default:
      return { cls: 'misc', type: e.type, html: `• ${escapeHtml(e.type)} ${escapeHtml(JSON.stringify({ ...e, id: undefined, ts: undefined }))}` };
  }
}

function renderLogs() {
  const filter = $('#log-filter').value;
  const rows = logs.map((e) => ({ e, l: logLine(e) })).filter(({ l }) => !filter || l.type === filter);
  $('#log').innerHTML = rows
    .slice(0, 200)
    .map(({ e, l }) => `<li class="${l.cls}"><time>${new Date(e.ts).toLocaleTimeString('vi-VN')}</time>${l.html}</li>`)
    .join('');
  $('#log-count').textContent = `(${rows.length})`;
}

// ------------------------------------------------------------------ events
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.rpc) {
    if (t.dataset.confirm && !confirm(t.dataset.confirm)) return;
    await call(t.dataset.rpc, {}, '✓ Đã gửi');
  } else if (t.dataset.chapter) {
    await call('wedding.setChapter', { id: t.dataset.chapter }, `✓ Kích hoạt ${t.dataset.chapter}`);
  } else if (t.dataset.score) {
    await call('wedding.adjustScore', { delta: Number(t.dataset.score) }, `✓ ${t.dataset.score} điểm`);
  } else if (t.dataset.mock) {
    await call('mock.event', JSON.parse(t.dataset.mock));
  } else if (t.dataset.effect !== undefined && t.closest('#manual-effects')) {
    await call('wedding.triggerEffect', { effect: t.dataset.effect });
  } else if (t.dataset.restore) {
    if (!confirm(`Khôi phục cấu hình ${t.dataset.restore} về mặc định?`)) return;
    await call('wedding.restoreDefaults', { section: t.dataset.restore }, '✓ Đã khôi phục');
    await loadConfig();
  } else if (t.dataset.mode) {
    if (!confirm('Đổi game mode sẽ bắt đầu lại đám cưới. Tiếp tục?')) return;
    await call('wedding.setMode', { id: t.dataset.mode }, `✓ Mode: ${t.dataset.mode}`);
  } else if (t.dataset.theme) {
    await call('wedding.setTheme', { variant: t.dataset.theme }, `✓ Variant: ${t.dataset.theme}`);
  } else if (t.dataset.fill) {
    await call('wedding.adjustScore', { meter: t.dataset.fill, meterValue: 1e9 }, `✓ ${t.dataset.fill} đầy`);
  } else if (t.dataset.rate !== undefined) {
    const r = await call('mock.rate', { eventsPerSec: Number(t.dataset.rate), durationSec: 10 });
    toast(r.rate ? `⚡ ${r.rate.eventsPerSec} sự kiện/giây trong 10 giây` : 'Đã dừng mock rate');
  } else if (t.hasAttribute('data-remove-row')) {
    t.closest('tr').remove();
  }
});

$('#live-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#live-user').value.trim();
  if (!username) return toast('Nhập @username', true);
  toast('Đang kết nối…');
  await call('live.connect', { username }, '✓ Đã kết nối TikTok Live').catch(() => {});
});
$('#auto-connect').addEventListener('change', (e) => call('wedding.updateConfig', { section: 'wedding', patch: { tiktok: { autoConnect: e.target.checked, username: $('#live-user').value.trim().replace(/^@/, '') } } }, '✓ Đã lưu'));
$('#auto-advance').addEventListener('change', (e) => call('wedding.updateConfig', { section: 'wedding', patch: { storyline: { autoAdvance: e.target.checked } } }, '✓ Đã lưu'));

$('#score-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const params = {};
  if ($('#score-set').value !== '') params.set = Number($('#score-set').value);
  if ($('#happy-set').value !== '') params.happiness = Number($('#happy-set').value);
  await call('wedding.adjustScore', params, '✓ Đã cập nhật điểm');
});
$('#couple-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await call('wedding.updateConfig', { section: 'wedding', patch: { couple: { groomName: $('#groom-name').value.trim() || 'Minh', brideName: $('#bride-name').value.trim() || 'Linh' } } }, '✓ Đã lưu tên cặp đôi (màn hình stage sẽ tải lại)');
});

$('#mock-custom').addEventListener('submit', (e) => {
  e.preventDefault();
  call('mock.event', { type: 'gift', gift: $('#mock-gift-name').value, diamonds: Number($('#mock-gift-diamonds').value), count: Number($('#mock-gift-count').value) });
});
$('#mock-burst').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await call('mock.burst', { count: Number($('#burst-count').value) });
  toast(`⚡ ${r.count} sự kiện: ${Object.entries(r.types).map(([k, v]) => `${k} ${v}`).join(', ')}`);
});
$('#auto-sim').addEventListener('change', (e) => call('mock.auto', { enabled: e.target.checked, intervalMs: Number($('#auto-sim-ms').value) }));

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.effect !== undefined && t.type === 'checkbox') {
    call('wedding.updateConfig', { section: 'wedding', patch: { effects: { [t.dataset.effect]: t.checked } } });
  } else if (t.dataset.audio) {
    call('wedding.updateConfig', { section: 'wedding', patch: { audio: { [t.dataset.audio]: t.checked } } });
  }
});
$('#particle-budget').addEventListener('change', (e) => {
  $('#particle-budget-out').textContent = e.target.value;
  call('wedding.updateConfig', { section: 'wedding', patch: { effects: { particleBudget: Number(e.target.value) } } });
});
for (const k of ['master', 'music', 'sfx', 'tts']) {
  $(`#${k}-volume`).addEventListener('change', (e) => call('wedding.updateConfig', { section: 'wedding', patch: { audio: { [`${k}Volume`]: Number(e.target.value) } } }));
}

$('#save-chapters').addEventListener('click', async () => {
  const edits = readTable('#chapter-table', (tr, get) => ({ id: tr.dataset.id, title: get('title').value, subtitle: get('subtitle').value, threshold: Number(get('threshold').value), minDurationSec: Number(get('minDurationSec').value), scene: get('scene').value, music: get('music').value }));
  const chapters = config.wedding.storyline.chapters.map((c) => ({ ...c, ...edits.find((e) => e.id === c.id) }));
  try {
    await call('wedding.updateConfig', { section: 'wedding', patch: { storyline: { chapters } } }, '✓ Đã lưu cấu hình chương');
    $('#chapter-msg').textContent = '';
    await loadConfig();
  } catch (err) {
    $('#chapter-msg').textContent = err.message;
  }
});

$('#save-gifts').addEventListener('click', async () => {
  const tiers = readTable('#tier-table', (tr, get) => {
    const base = config.gifts.tiers.find((t) => t.id === tr.dataset.id);
    const maxPoints = get('maxPoints').value === '' ? undefined : Number(get('maxPoints').value);
    return { ...base, label: get('label').value, minDiamonds: Number(get('minDiamonds').value), pointsPerDiamond: Number(get('pointsPerDiamond').value), maxPoints, happiness: Number(get('happiness').value), defaultInteraction: get('defaultInteraction').value, cooldownMs: Number(get('cooldownMs').value), rarity: get('rarity').value, chapterBoost: get('chapterBoost').checked, announce: get('announce').checked };
  });
  const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const gifts = readTable('#gift-table', (tr, get) => {
    const g = { key: get('key').value.trim(), label: get('label').value.trim(), ids: list(get('ids').value).map(Number).filter(Number.isFinite), names: list(get('names').value), interaction: get('interaction').value, counters: {} };
    if (get('forceTier').value) g.forceTier = get('forceTier').value;
    if (get('cooldownMs').value !== '') g.cooldownMs = Number(get('cooldownMs').value);
    for (const f of ['sound', 'rarity', 'chapterRequirement']) if (get(f).value) g[f] = get(f).value;
    if (get('chapterBoost').checked) g.chapterBoost = true;
    const flowers = Number(get('flowers').value);
    if (flowers > 0) g.counters.flowers = flowers;
    return g;
  }).filter((g) => g.key);
  try {
    await call('wedding.updateConfig', { section: 'gifts', patch: { tiers, gifts } }, '✓ Đã lưu gift mapping');
    $('#gift-msg').textContent = '';
    await loadConfig();
  } catch (err) {
    $('#gift-msg').textContent = err.message;
  }
});

$('#save-rules').addEventListener('click', async () => {
  const patch = {};
  document.querySelectorAll('#rules [data-path]').forEach((inp) => setPath(patch, inp.dataset.path, Number(inp.value)));
  try {
    await call('wedding.updateConfig', { section: 'wedding', patch }, '✓ Đã lưu quy tắc');
    $('#rules-msg').textContent = '';
  } catch (err) {
    $('#rules-msg').textContent = err.message;
  }
});

$('#log-filter').addEventListener('change', renderLogs);
$('#clear-logs').addEventListener('click', () => {
  logs = [];
  renderLogs();
});

// manual effects + mock gift catalog
$('#manual-effects').innerHTML = Object.keys(MANUAL_EFFECTS)
  .map((k) => `<button class="btn sm" data-effect="${k}">${k}</button>`)
  .join('');

// ------------------------------------------------------------------ socket wiring
net.on('socket.open', async () => {
  pill('#ws-pill', 'Server ✓', 'ok');
  try {
    renderState(await call('wedding.getState'));
    renderStatus(await call('wedding.getStatus'));
    await loadConfig();
    const { gifts } = await call('mock.catalog');
    $('#mock-gifts').innerHTML = gifts.map((g) => `<button class="btn sm" data-mock='${JSON.stringify({ type: 'gift', gift: g.name })}'>${escapeHtml(g.name)} · ${fmt(g.diamonds)}💎</button>`).join('');
    const l = await call('wedding.getLogs', { limit: 150 });
    logs = [...l.events, ...l.server.filter((x) => x.level !== 'debug')].sort((a, b) => (a.ts < b.ts ? 1 : -1));
    renderLogs();
  } catch (_) {}
});
net.on('socket.close', () => pill('#ws-pill', 'Mất kết nối server', 'bad'));
net.on('wedding.state', renderState);
net.on('wedding.status', renderStatus);
net.on('live.status', renderLive);
net.on('tts.status', renderTts);
net.on('wedding.log', addLog);
net.on('server.log', addLog);
net.on('config.updated', ({ section, value }) => {
  if (!config) return;
  config[section] = value;
});
net.connect();

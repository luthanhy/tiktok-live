/**
 * Resolves a TikTok gift (by id, then by name) into a wedding interaction.
 * Pure function over the gifts config so it is trivially testable and hot-reloadable.
 */
function normalizeName(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/^\d+\s*x\s*/, '')
    .trim();
}

function sortedTiers(cfg) {
  return [...(cfg.tiers || [])].sort((a, b) => Number(a.minDiamonds) - Number(b.minDiamonds));
}

function tierForDiamonds(cfg, diamonds) {
  const tiers = sortedTiers(cfg);
  let found = tiers[0];
  for (const t of tiers) if (diamonds >= Number(t.minDiamonds)) found = t;
  return found;
}

function tierRank(cfg, tierId) {
  return sortedTiers(cfg).findIndex((t) => t.id === tierId);
}

function findMapping(cfg, { id, name }) {
  const gifts = cfg.gifts || [];
  const numericId = Number(id);
  if (Number.isFinite(numericId) && numericId > 0) {
    const byId = gifts.find((g) => (g.ids || []).map(Number).includes(numericId));
    if (byId) return byId;
  }
  const n = normalizeName(name);
  if (!n) return null;
  return (
    gifts.find((g) => (g.names || []).some((alias) => normalizeName(alias) === n)) ||
    gifts.find((g) => (g.names || []).some((alias) => normalizeName(alias).length > 3 && n.includes(normalizeName(alias)))) ||
    null
  );
}

/**
 * @param {object} cfg gifts config
 * @param {{id?:number|string, name?:string, diamonds?:number, count?:number}} gift
 */
function resolveGift(cfg, gift) {
  const unitDiamonds = Math.max(1, Number(gift.diamonds) || 1);
  const count = Math.max(1, Number(gift.count) || 1);
  const totalDiamonds = unitDiamonds * count;
  const mapping = findMapping(cfg, gift);

  const tiers = sortedTiers(cfg);
  const unitTier = mapping?.forceTier
    ? tiers.find((t) => t.id === mapping.forceTier) || tierForDiamonds(cfg, unitDiamonds)
    : tierForDiamonds(cfg, unitDiamonds);
  const totalTier = tierForDiamonds(cfg, totalDiamonds);
  const tier = tierRank(cfg, totalTier.id) > tierRank(cfg, unitTier.id) ? totalTier : unitTier;

  const interaction = mapping?.interaction || tier.defaultInteraction;
  // A big combo of a cheap gift keeps its own effect and *also* earns the tier's showpiece.
  const bonusInteraction =
    tier !== unitTier && tier.defaultInteraction !== interaction ? tier.defaultInteraction : null;

  const pointsPerDiamond = Number(mapping?.pointsPerDiamond ?? unitTier.pointsPerDiamond ?? 10);
  const counters = {};
  for (const [k, v] of Object.entries(mapping?.counters || {})) counters[k] = Number(v) * count;

  return {
    key: mapping?.key || `gift:${normalizeName(gift.name) || gift.id || 'unknown'}`,
    label: mapping?.label || String(gift.name || 'Quà tặng'),
    mapped: Boolean(mapping),
    tier: tier.id,
    tierLabel: tier.label,
    interaction,
    bonusInteraction,
    priority: Number(tier.priority ?? 1),
    happiness: Number(tier.happiness ?? 1) * (tier === unitTier ? Math.min(count, 5) : 1),
    announce: Boolean(tier.announce),
    unitDiamonds,
    count,
    totalDiamonds,
    // Diminishing returns + a per-gift cap keep one whale gift from finishing the whole story alone.
    points: Math.round(Math.min(Number(tier.maxPoints ?? Infinity), totalDiamonds * pointsPerDiamond)),
    counters,
    rarity: mapping?.rarity || tier.rarity || 'common',
    sound: mapping?.sound || (tier.priority >= 7 ? 'fanfare' : 'gift'),
    cooldownMs: Number(mapping?.cooldownMs ?? tier.cooldownMs ?? 0),
    chapterRequirement: mapping?.chapterRequirement || '',
    chapterBoost: Boolean(mapping?.chapterBoost ?? tier.chapterBoost)
  };
}

module.exports = { resolveGift, findMapping, tierForDiamonds, normalizeName };

/**
 * CharacterManager — characters are data-driven entities, not hard-coded scene art.
 *
 *   { id, name, type, position, animation, emotion, outfit, visibility, state }
 *
 * Types: bride, groom, bridesmaid, groomsman, mc, guest. A new type only needs a builder
 * in BUILDERS. Animations (poses): idle, walk, celebrate, clap, dance, wave, surprise, love,
 * cheer, hold, kiss, toast, cut, throw, heart, present, mic — see stage.css.
 */
import { brideSvg, groomSvg, bridesmaidSvg, groomsmanSvg, mcSvg, guestWalkerSvg, Actor } from './cast.js';

const BUILDERS = {
  bride: (o, outfits) => brideSvg(outfits?.bride),
  groom: (o, outfits) => groomSvg(outfits?.groom),
  bridesmaid: (o, outfits) => bridesmaidSvg(o.index || 0, { style: outfits?.bridesmaids?.[o.index || 0]?.style, avatar: o.user?.avatar }),
  groomsman: (o, outfits) => groomsmanSvg(o.index || 0, { tie: outfits?.groomsmen?.[o.index || 0]?.tie, avatar: o.user?.avatar }),
  mc: (o, outfits) => mcSvg({ tie: outfits?.mc?.tie }),
  guest: (o) => guestWalkerSvg(o.user?.id || o.user?.name || o.id, { avatar: o.user?.avatar, carry: o.carry })
};

/** Poses that are an emotion as much as a body pose. */
const POSE_EMOTION = { love: 'love', surprise: 'surprised', celebrate: 'joy', cheer: 'joy', kiss: 'kiss' };

export class CharacterManager {
  constructor(layer, { depth, outfits } = {}) {
    this.layer = layer;
    this.depth = depth;
    this.outfits = outfits;
    this.characters = new Map();
  }

  static types() {
    return Object.keys(BUILDERS);
  }

  create(opts) {
    const build = BUILDERS[opts.type];
    if (!build) throw new Error(`Unknown character type: ${opts.type}`);
    const actor = new Actor(this.layer, {
      id: opts.id,
      svg: build(opts, this.outfits),
      depth: this.depth,
      size: opts.size || 1,
      x: opts.x ?? 960,
      y: opts.y ?? 800,
      name: opts.tag ? opts.name : ''
    });
    actor.type = opts.type;
    actor.name = opts.name || opts.type;
    actor.outfit = opts.type in (this.outfits || {}) ? this.outfits[opts.type]?.style || 'default' : 'default';
    this.characters.set(opts.id, actor);
    return actor;
  }

  get(id) {
    return this.characters.get(id);
  }

  remove(id) {
    const a = this.characters.get(id);
    if (a) a.remove();
    this.characters.delete(id);
  }

  ofType(type) {
    return [...this.characters.values()].filter((a) => a.type === type);
  }

  /** Play a named animation on one or more characters (with its matching emotion). */
  animate(ids, animation) {
    for (const id of [].concat(ids)) {
      const a = this.characters.get(id);
      if (!a) continue;
      a.setPose(animation);
      if (POSE_EMOTION[animation]) a.setExpr(POSE_EMOTION[animation]);
    }
  }

  snapshot() {
    return [...this.characters.values()].map((a) => a.snapshot());
  }
}

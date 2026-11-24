export const SAVE_KEY = 'lootmobSave1';

export function makeDefaultSave() {
  const stick = {
    id: 1, slot: 'weapon', r: 0, il: 1, lvl: 0, leg: null,
    name: 'Épée de recrue', wm: 1.1, rg: 38, rt: 0.65,
    st: { dmg: 4 }, classRestriction: 'chevalier', locked: false
  };
  return {
    archetype: 'chevalier',
    autoSellJunk: false,
    secretChest: [
      { id: 0, name: '60% IV', affixes: ['', ''], minRarity: 0, minIv: 60, items: [] },
      { id: 1, name: '75% IV', affixes: ['', ''], minRarity: 0, minIv: 75, items: [] },
      { id: 2, name: '90% IV', affixes: ['', ''], minRarity: 0, minIv: 90, items: [] }
    ],
gold: 100, best: 0, bridgeBest: 0, won: false, seen: false, nid: 2, pact: 'none', worldTheme: 'land1',
    stats: { runs: 0, wins: 0, bosses: 0, fusions: 0, curses: 0 },
    inv: Array.of(stick),
    eq: { weapon: 1, helm: null, armor: null, legs: null, boots: null, charm: null },
    unlocked: 1, landSel: 1,
    skills: {
      whirl: 0, quake: 0, heal: 0, rage: 0, chain: 0, frost: 0, shield: 0,
      p_atk: 0, p_hp: 0, p_crit: 0, p_ms: 0,
      k_war: 0, k_guard: 0, k_crit: 0, k_tempo: 0
    },
    slots: { e: null, r: null, c: null }
  };
}

export function loadSave() {
  const def = makeDefaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.inv) && s.eq && typeof s.eq === 'object') {
        return {
          ...def, ...s,
          worldTheme: typeof s.worldTheme === 'string' && s.worldTheme ? s.worldTheme : def.worldTheme,
          stats: { ...def.stats, ...(s.stats || {}) },
          eq: { ...def.eq, ...s.eq },
          skills: { ...def.skills, ...(s.skills || {}) },
          slots: { ...def.slots, ...(s.slots || {}) }
        };
      }
    }
  } catch (err) { /* ok */ }
  return def;
}
export let save = loadSave();

export function setSave(nextSave) {
  save = nextSave;
  return save;
}

export function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (err) { /* ok */ }
}
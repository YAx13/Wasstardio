import { save, persist } from '../core/state.js';

export const SKILLS = new Map();
// Épée
SKILLS.set('whirl', { n: 'Tourbillon', i: '🌀', cost: 60, cd: 5, d: 'Frappe à 360° autour de toi', stat: (lv) => `${200 + lv * 50}% Dégâts` });
SKILLS.set('lunge', { n: 'Estoc Éclair', i: '⚡', cost: 80, cd: 4.5, d: 'Bondit vers la cible avec une frappe perçante', stat: (lv) => `${180 + lv * 45}% Dégâts` });
SKILLS.set('shield', { n: 'Parade Égide', i: '🛡️', cost: 110, cd: 12, d: 'Bloque tous les dégâts subis', stat: (lv) => `${2 + lv * 0.5} s Invuln.` });
SKILLS.set('bladestorm', { n: 'Danse des Lames', i: '🗡️', cost: 140, cd: 9, d: 'Lacère tous les ennemis proches en rafale', stat: (lv) => `${3 + lv} Entailles` });

// Lance
SKILLS.set('pierce', { n: 'Percée Fulgurante', i: '🔱', cost: 70, cd: 4.5, d: 'Transperce tous les ennemis sur une longue ligne', stat: (lv) => `${210 + lv * 50}% Dégâts` });
SKILLS.set('quake', { n: 'Séisme', i: '💥', cost: 110, cd: 8, d: 'Onde de choc : dégâts et repousse', stat: (lv) => `${160 + lv * 40}% Dégâts` });
SKILLS.set('heal', { n: 'Second Souffle', i: '💚', cost: 90, cd: 13, d: 'Restaure instantanément des PV', stat: (lv) => `${25 + lv * 5}% PV max` });
SKILLS.set('chain', { n: 'Éclair en Chaîne', i: '🌩️', cost: 120, cd: 6, d: 'Foudroie plusieurs cibles proches', stat: (lv) => `${4 + lv} Cibles` });

// Hache
SKILLS.set('cleave', { n: 'Fendoir Sanglant', i: '🪓', cost: 75, cd: 5, d: 'Large coup frontal qui draine la vie', stat: (lv) => `${230 + lv * 55}% Dégâts` });
SKILLS.set('rage', { n: 'Rage Berserk', i: '🔥', cost: 130, cd: 14, d: "+60% vit. d'attaque et +30% dégâts", stat: (lv) => `${5.5 + lv * 0.6} s Durée` });
SKILLS.set('warcry', { n: 'Cri de Guerre', i: '📯', cost: 100, cd: 11, d: 'Repousse les ennemis et octroie un bouclier', stat: (lv) => `${2 + lv * 0.4} s Garde` });

// Bâton
SKILLS.set('meteor', { n: 'Météore', i: '☄️', cost: 130, cd: 8.5, d: 'Fait chuter un météore dévastateur sur la cible', stat: (lv) => `${280 + lv * 65}% Dégâts` });
SKILLS.set('frost', { n: 'Nova de Givre', i: '❄️', cost: 100, cd: 9, d: 'Gèle et ralentit les ennemis autour de toi', stat: (lv) => `${3 + lv * 0.5} s Givre` });
SKILLS.set('orb', { n: 'Orbe Arcanique', i: '🔮', cost: 85, cd: 5.5, d: 'Libère une sphère énergétique perforante', stat: (lv) => `${200 + lv * 45}% Dégâts` });

// Arc
SKILLS.set('volley', { n: 'Pluie de Flèches', i: '🌧️', cost: 95, cd: 7, d: 'Criblage de flèches sur une large zone', stat: (lv) => `${190 + lv * 45}% Dégâts` });
SKILLS.set('snipe', { n: 'Flèche Perçante', i: '🎯', cost: 80, cd: 5, d: 'Tir de précision à très haut taux critique', stat: (lv) => `${250 + lv * 60}% Dégâts` });
SKILLS.set('frostshot', { n: 'Salve de Givre', i: '🧊', cost: 105, cd: 8, d: 'Projette des flèches glacées ralentissantes', stat: (lv) => `${2.5 + lv * 0.5} s Givre` });
SKILLS.set('backflip', { n: 'Bond Arrière', i: '💨', cost: 75, cd: 6, d: 'Saute en arrière et tire une onde de choc', stat: (lv) => `${140 + lv * 35}% Dégâts` });

export const PASSIVE_NODES = new Map();
// Passives
PASSIVE_NODES.set('p_atk', { n: 'Force Astrale', i: '⚔️', cost: 45, d: 'Augmente les dégâts globaux', stat: (lv) => `+${lv * 6}% Dégâts` });
PASSIVE_NODES.set('p_aspd', { n: 'Lame Vive', i: '⚡', cost: 50, d: "Augmente la vitesse d'attaque", stat: (lv) => `+${lv * 6}% Vit. attaque` });
PASSIVE_NODES.set('p_hp', { n: 'Vitalité Stellaire', i: '❤️', cost: 45, d: 'Augmente les PV maximums', stat: (lv) => `+${lv * 8}% PV max` });
PASSIVE_NODES.set('p_crit', { n: 'Œil du Faucon', i: '🎯', cost: 55, d: 'Augmente les chances de critique', stat: (lv) => `+${lv * 3.5}% Critique` });
PASSIVE_NODES.set('p_ms', { n: 'Pas Céleste', i: '👟', cost: 50, d: 'Augmente la vitesse de déplacement', stat: (lv) => `+${lv * 4.5}% Vitesse` });
PASSIVE_NODES.set('p_leech', { n: 'Soif de Sang', i: '🩸', cost: 60, d: 'Soigne un pourcentage des dégâts infligés', stat: (lv) => `+${(lv * 1.5).toFixed(1)}% Vol de vie` });
PASSIVE_NODES.set('p_reach', { n: 'Allonge Mortelle', i: '📏', cost: 55, d: 'Augmente la portée des attaques et dégâts', stat: (lv) => `+${lv * 3} Portée · +${lv * 4}% Dégâts` });
PASSIVE_NODES.set('p_cdr', { n: 'Flux Éthéré', i: '⏳', cost: 65, d: 'Réduit la recharge des compétences et esquive', stat: (lv) => `-${lv * 5}% Recharge` });

// Synergies (Dual-Parent Evolutions — revealed when BOTH parents reach Lv 1+)
PASSIVE_NODES.set('syn_vortex', { n: 'Synergie : Vortex Tranchant', i: '🌪️', cost: 150, d: 'Tourbillon attire les ennemis et projette une onde tranchante', stat: (lv) => `+${lv * 25}% Rayon & Dégâts Vortex` });
PASSIVE_NODES.set('syn_phantom', { n: 'Synergie : Assaut Fantôme', i: '👻', cost: 160, d: 'Estoc Éclair est un critique garanti et rend du soin sur kill', stat: (lv) => `+${lv * 20}% Dégâts Crit. Estoc` });
PASSIVE_NODES.set('syn_mirage', { n: 'Synergie : Mirage Riposte', i: '🪞', cost: 150, d: 'Parade Égide déclenche une contre-attaque et accélère le héros', stat: (lv) => `${120 + lv * 40}% Dégâts Riposte` });

PASSIVE_NODES.set('syn_skylance', { n: 'Synergie : Lance Céleste', i: '☄️', cost: 160, d: 'Percée Fulgurante déclenche un éclair secondaire sur chaque cible', stat: (lv) => `+${lv * 25}% Dégâts Foudre` });
PASSIVE_NODES.set('syn_aftershock', { n: 'Synergie : Réplique Sismique', i: '🌋', cost: 155, d: 'Séisme génère une seconde onde de choc élargie', stat: (lv) => `+${lv * 20}% Zone & Dégâts` });
PASSIVE_NODES.set('syn_sanctuary', { n: 'Synergie : Sanctuaire Vital', i: '💖', cost: 150, d: 'Second Souffle octroie un bouclier temporaire après le soin', stat: (lv) => `${1 + lv * 0.4} s Bouclier` });

PASSIVE_NODES.set('syn_crimson', { n: 'Synergie : Moisson Écarlate', i: '💀', cost: 165, d: 'Fendoir Sanglant soigne double et fait exploser les ennemis tués', stat: (lv) => `+${lv * 30}% Dégâts Explosion` });
PASSIVE_NODES.set('syn_cataclysm', { n: 'Synergie : Cataclysme', i: '🌋', cost: 160, d: 'Séisme embrase le sol et augmente les dégâts critiques', stat: (lv) => `+${lv * 25}% Dégâts Séisme` });
PASSIVE_NODES.set('syn_unstoppable', { n: 'Synergie : Colosse Implacable', i: '👑', cost: 170, d: 'Rage Berserk octroie une réduction de dégâts et plus de PV', stat: (lv) => `-${lv * 6}% Dégâts subis` });

PASSIVE_NODES.set('syn_starfall', { n: 'Synergie : Pluie Astrale', i: '🌌', cost: 170, d: 'Météore fait tomber des éclats arcaniques supplémentaires', stat: (lv) => `+${lv} Météores secondaires` });
PASSIVE_NODES.set('syn_shatter', { n: 'Synergie : Brise-Glace', i: '💎', cost: 155, d: 'Nova de Givre inflige des dégâts critiques aux cibles gelées', stat: (lv) => `+${lv * 30}% Dégâts Givre` });
PASSIVE_NODES.set('syn_overcharge', { n: 'Synergie : Surcharge Arcanique', i: '⚡', cost: 160, d: 'Éclair en Chaîne rebondit plus loin et étourdit brièvement', stat: (lv) => `+${lv * 20}% Dégâts Chaîne` });

PASSIVE_NODES.set('syn_tempest', { n: 'Synergie : Déluge Perçant', i: '🏹', cost: 165, d: 'Pluie de Flèches ralentit les ennemis et gagne en cadence', stat: (lv) => `+${lv * 25}% Dégâts Pluie` });
PASSIVE_NODES.set('syn_headshot', { n: 'Synergie : Tir Mortel', i: '💀', cost: 160, d: 'Flèche Perçante ignore armure et augmente les dégâts critiques', stat: (lv) => `+${lv * 30}% Multiplicateur Crit.` });
PASSIVE_NODES.set('syn_windstep', { n: 'Synergie : Pas du Vent', i: '🌪️', cost: 150, d: 'Bond Arrière gèle les poursuivants et accélère le déplacement', stat: (lv) => `+${lv * 15}% Vitesse post-bond` });

export const CONSTELLATIONS_CONFIG = {
  'Épée': [
    { id: 'center', x: 0, y: 0, parents: [], isCenter: true, i: '⚔️' },
    // 3 Independent Passives
    { id: 'p_aspd', x: -135, y: -65, parents: ['center'], passive: true },
    { id: 'p_crit', x: 135, y: -65, parents: ['center'], passive: true },
    { id: 'p_ms', x: 0, y: 135, parents: ['center'], passive: true },
    // 4 Independent Actives
    { id: 'whirl', x: -245, y: -165, parents: ['center'], passive: false },
    { id: 'lunge', x: 245, y: -165, parents: ['center'], passive: false },
    { id: 'shield', x: 225, y: 125, parents: ['center'], passive: false },
    { id: 'bladestorm', x: -225, y: 125, parents: ['center'], passive: false },
    // 3 Synergies (hidden until BOTH parents reach Lv 1+)
    { id: 'syn_vortex', x: -340, y: -70, parents: ['p_aspd', 'whirl'], synergy: true },
    { id: 'syn_phantom', x: 340, y: -70, parents: ['p_crit', 'lunge'], synergy: true },
    { id: 'syn_mirage', x: 145, y: 245, parents: ['p_ms', 'shield'], synergy: true }
  ],
  'Lance': [
    { id: 'center', x: 0, y: 0, parents: [], isCenter: true, i: '🔱' },
    // 3 Independent Passives
    { id: 'p_reach', x: -135, y: -65, parents: ['center'], passive: true },
    { id: 'p_atk', x: 135, y: -65, parents: ['center'], passive: true },
    { id: 'p_hp', x: 0, y: 135, parents: ['center'], passive: true },
    // 4 Independent Actives
    { id: 'pierce', x: -245, y: -165, parents: ['center'], passive: false },
    { id: 'quake', x: 245, y: -165, parents: ['center'], passive: false },
    { id: 'heal', x: 225, y: 125, parents: ['center'], passive: false },
    { id: 'chain', x: -225, y: 125, parents: ['center'], passive: false },
    // 3 Synergies
    { id: 'syn_skylance', x: -340, y: -70, parents: ['p_reach', 'pierce'], synergy: true },
    { id: 'syn_aftershock', x: 340, y: -70, parents: ['p_atk', 'quake'], synergy: true },
    { id: 'syn_sanctuary', x: 145, y: 245, parents: ['p_hp', 'heal'], synergy: true }
  ],
  'Hache': [
    { id: 'center', x: 0, y: 0, parents: [], isCenter: true, i: '🪓' },
    // 3 Independent Passives
    { id: 'p_leech', x: -135, y: -65, parents: ['center'], passive: true },
    { id: 'p_atk', x: 135, y: -65, parents: ['center'], passive: true },
    { id: 'p_hp', x: 0, y: 135, parents: ['center'], passive: true },
    // 4 Independent Actives
    { id: 'cleave', x: -245, y: -165, parents: ['center'], passive: false },
    { id: 'quake', x: 245, y: -165, parents: ['center'], passive: false },
{ id: 'rage', x: 225, y: 125, parents: ['center'], passive: false },
{ id: 'warcry', x: -225, y: 125, parents: ['center'], passive: false },
// 3 Synergies
{ id: 'syn_crimson', x: -340, y: -70, parents: ['p_leech', 'cleave'], synergy: true },
{ id: 'syn_cataclysm', x: 340, y: -70, parents: ['p_atk', 'quake'], synergy: true },
{ id: 'syn_unstoppable', x: 145, y: 245, parents: ['p_hp', 'rage'], synergy: true }
],
'Bâton': [
{ id: 'center', x: 0, y: 0, parents: [], isCenter: true, i: '🪄' },
// 3 Independent Passives
{ id: 'p_cdr', x: -135, y: -65, parents: ['center'], passive: true },
{ id: 'p_atk', x: 135, y: -65, parents: ['center'], passive: true },
{ id: 'p_hp', x: 0, y: 135, parents: ['center'], passive: true },
// 4 Independent Actives
{ id: 'meteor', x: -245, y: -165, parents: ['center'], passive: false },
{ id: 'chain', x: 245, y: -165, parents: ['center'], passive: false },
{ id: 'frost', x: 225, y: 125, parents: ['center'], passive: false },
{ id: 'orb', x: -225, y: 125, parents: ['center'], passive: false },
// 3 Synergies
{ id: 'syn_starfall', x: -340, y: -70, parents: ['p_cdr', 'meteor'], synergy: true },
{ id: 'syn_overcharge', x: 340, y: -70, parents: ['p_atk', 'chain'], synergy: true },
{ id: 'syn_shatter', x: 145, y: 245, parents: ['p_hp', 'frost'], synergy: true }
],
'Arc': [
{ id: 'center', x: 0, y: 0, parents: [], isCenter: true, i: '🏹' },
// 3 Independent Passives
{ id: 'p_aspd', x: -135, y: -65, parents: ['center'], passive: true },
{ id: 'p_crit', x: 135, y: -65, parents: ['center'], passive: true },
{ id: 'p_ms', x: 0, y: 135, parents: ['center'], passive: true },
// 4 Independent Actives
{ id: 'volley', x: -245, y: -165, parents: ['center'], passive: false },
{ id: 'snipe', x: 245, y: -165, parents: ['center'], passive: false },
{ id: 'backflip', x: 225, y: 125, parents: ['center'], passive: false },
{ id: 'frostshot', x: -225, y: 125, parents: ['center'], passive: false },
// 3 Synergies
{ id: 'syn_tempest', x: -340, y: -70, parents: ['p_aspd', 'volley'], synergy: true },
{ id: 'syn_headshot', x: 340, y: -70, parents: ['p_crit', 'snipe'], synergy: true },
{ id: 'syn_windstep', x: 145, y: 245, parents: ['p_ms', 'backflip'], synergy: true }
]
};
let hooks = {
getItem: (id) => save.inv.find((i) => i.id === id) || null,
getStats: () => ({}),
renderCamp: () => {},
renderConstellation: () => {},
showToast: () => {},
sfx: () => {},
isConstellationOpen: () => false
};
export function configureConstellations(nextHooks) {
hooks = { ...hooks, ...nextHooks };
}
export function skillLv(k) {
return Reflect.get(save.skills, k) || 0;
}
export function nodeDef(k) {
return SKILLS.get(k) || PASSIVE_NODES.get(k);
}
export function skillCost(k) {
return Math.round(nodeDef(k).cost * (1 + skillLv(k) * 0.9));
}
export function getWeaponCategory(w) {
if (w) {
if (w.name.includes('Bâton') || w.name.includes('Baguette')) return 'Bâton';
if (w.name.includes('Lance')) return 'Lance';
if (w.name.includes('Hache')) return 'Hache';
if (save.archetype === 'archer') return 'Arc';
} else if (save.archetype === 'archer') {
return 'Arc';
}
return 'Épée';
}
export function getActiveWeaponCategory() {
return getWeaponCategory(hooks.getItem(save.eq.weapon));
}
export function isTreeLocked(cat = getActiveWeaponCategory()) {
return Boolean(save.lockedTrees && save.lockedTrees[cat]);
}
export function syncLockedTreeSnapshot(cat = getActiveWeaponCategory()) {
if (!save.lockedTrees) save.lockedTrees = {};
if (save.lockedTrees[cat]) {
save.lockedTrees[cat] = {
skills: { ...save.skills },
slots: { ...save.slots }
};
}
}
export function toggleConstellationLock() {
  if (!save.lockedTrees) save.lockedTrees = {};
  const cat = getActiveWeaponCategory();
  if (save.lockedTrees[cat]) {
    delete save.lockedTrees[cat];
    hooks.showToast(`🔓 Verrou retiré pour : ${cat.toUpperCase()}`);
  } else {
    save.lockedTrees[cat] = {
      skills: { ...save.skills },
      slots: { ...save.slots }
    };
    hooks.showToast(`🔒 Set de compétences verrouillé pour : ${cat.toUpperCase()} !`);
  }
  hooks.sfx('ui');
  persist();
  if (hooks.isConstellationOpen()) hooks.renderConstellation();
}
export function computeSpentSkillGold() {
let refund = 0;
Object.keys(save.skills || {}).forEach((id) => {
const def = nodeDef(id);
if (!def) return;
const lv = skillLv(id);
for (let i = 0; i < lv; i++) refund += Math.round(def.cost * (1 + i * 0.9));
});
return refund;
}
export function getActiveTreeNodes() {
const category = getActiveWeaponCategory();
return CONSTELLATIONS_CONFIG[category] || CONSTELLATIONS_CONFIG['Épée'];
}
export function isNodeUnlocked(k) {
const currentTree = getActiveTreeNodes();
const node = currentTree.find((n) => n.id === k);
if (!node || !node.parents || node.parents.length === 0) return true;
return node.parents.every((pid) => pid === 'center' || skillLv(pid) > 0);
}
export function isNodeVisible(n) {
if (!n.synergy) return true;
return isNodeUnlocked(n.id) || skillLv(n.id) > 0;
}
export function hasChildDependencies(k) {
const currentTree = getActiveTreeNodes();
return currentTree.some((n) => (n.parents || []).includes(k) && skillLv(n.id) > 0);
}
export function buySkill(k) {
  if (!isNodeUnlocked(k)) {
    const currentTree = getActiveTreeNodes();
    const node = currentTree.find((n) => n.id === k);
    const reqNames = (node.parents || []).filter((p) => p !== 'center').map((p) => nodeDef(p).n.toUpperCase()).join(' + ');
    hooks.showToast(`Requiert : ${reqNames} !`);
    return;
  }
  const lv = skillLv(k), cost = skillCost(k);
  if (lv >= 5 || save.gold < cost) return;
  save.gold -= cost;
  Reflect.set(save.skills, k, lv + 1);
  if (lv === 0 && SKILLS.has(k)) {
    if (!save.slots.e) save.slots.e = k;
    else if (!save.slots.r) save.slots.r = k;
    else if (!save.slots.c) save.slots.c = k;
  }
  syncLockedTreeSnapshot();
  hooks.sfx('loot', 2);
  persist();
  hooks.renderCamp();
  if (hooks.isConstellationOpen()) hooks.renderConstellation();
}

export function refundSkillIndividual(k, ev) {
  if (ev) ev.preventDefault();
  const lv = skillLv(k);
  if (lv <= 0) return;

  if (lv === 1 && hasChildDependencies(k)) {
    hooks.showToast('Impossible : Une synergie active dépend encore de ce nœud.');
    return;
  }

  const baseCost = nodeDef(k).cost;
  const refundAmount = Math.round(baseCost * (1 + (lv - 1) * 0.9));

  save.gold += refundAmount;
  Reflect.set(save.skills, k, lv - 1);

  if (lv === 1) {
    if (save.slots.e === k) save.slots.e = null;
    if (save.slots.r === k) save.slots.r = null;
    if (save.slots.c === k) save.slots.c = null;
  }

  syncLockedTreeSnapshot();
  hooks.sfx('ui');
  persist();
  hooks.renderCamp();
  if (hooks.isConstellationOpen()) hooks.renderConstellation();
  hooks.showToast(`Remboursé : +${refundAmount} or.`);
}

export function cycleSlot(slot) {
  const activeTreeIds = new Set(getActiveTreeNodes().map((n) => n.id));
  const un = Array.from(SKILLS.keys()).filter((k) => activeTreeIds.has(k) && skillLv(k) > 0);
  if (un.length === 0) return;
  const idx = un.indexOf(Reflect.get(save.slots, slot));
  Reflect.set(save.slots, slot, un.at((idx + 1) % un.length));
  syncLockedTreeSnapshot();
  persist();
  hooks.renderCamp();
  if (hooks.isConstellationOpen()) hooks.renderConstellation();
}

export function unassignSlot(slot) {
  if (!Reflect.get(save.slots, slot)) return;
  Reflect.set(save.slots, slot, null);
  syncLockedTreeSnapshot();
  hooks.sfx('ui');
  persist();
  hooks.renderCamp();
  if (hooks.isConstellationOpen()) hooks.renderConstellation();
  hooks.showToast(`Touche [${slot.toUpperCase()}] libérée.`);
}

let cResetArm = false;

export function resetConstellation() {
  let refund = 0;
  const treeNodes = getActiveTreeNodes();
  treeNodes.forEach((n) => {
    if (n.isCenter) return;
    const lv = skillLv(n.id);
    const base = nodeDef(n.id).cost;
    for (let i = 0; i < lv; i++) refund += Math.round(base * (1 + i * 0.9));
  });
  const resetBtn = document.getElementById('c-reset-btn');
  if (refund === 0) { hooks.showToast('Aucune compétence à réinitialiser.'); return; }
  if (!cResetArm) {
    cResetArm = true;
    if (resetBtn) resetBtn.textContent = `CONFIRMER (+${refund} OR)`;
    setTimeout(() => { cResetArm = false; if (resetBtn) resetBtn.textContent = 'RÉINIT.'; }, 3000);
    return;
  }
  cResetArm = false;
  if (resetBtn) resetBtn.textContent = 'RÉINIT.';
  save.gold += refund;
  Object.keys(save.skills).forEach((k) => { save.skills[k] = 0; });
  save.slots = { e: null, r: null, c: null };
  if (save.lockedTrees) delete save.lockedTrees[getActiveWeaponCategory()];
  hooks.sfx('ui');
  persist();
  hooks.renderCamp();
  hooks.renderConstellation();
  hooks.showToast(`Compétences réinitialisées (+${refund} or).`);
}

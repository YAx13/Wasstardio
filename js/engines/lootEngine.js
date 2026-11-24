import { save } from '../core/state.js';

const pick = (arr) => arr.at(Math.floor(Math.random() * arr.length));

export const RAR = Array.of(
  { n: 'Commun', code: 'C', c: '#a0aec0', m: 1, w: 60, sell: 1, aff: 0 },
  { n: 'Peu commun', code: 'U', c: '#48bb78', m: 1.25, w: 25, sell: 2, aff: 1 },
  { n: 'Rare', code: 'R', c: '#4299e1', m: 1.6, w: 10, sell: 4, aff: 2 },
  { n: 'Épique', code: 'E', c: '#9f7aea', m: 2.1, w: 4, sell: 8, aff: 3 },
  { n: 'Légendaire', code: 'L', c: '#ed8936', m: 3, w: 1, sell: 25, aff: 3 }
);

export const STAT = new Map();
STAT.set('dmg', { n: 'Dégâts', u: '', w: 3 });
STAT.set('hp', { n: 'PV', u: '', w: 0.5 });
STAT.set('pdmg', { n: '% Dégâts', u: '%', w: 2 });
STAT.set('php', { n: '% PV', u: '%', w: 2 });
STAT.set('aspd', { n: '% Vit. attaque', u: '%', w: 2 });
STAT.set('crit', { n: '% Critique', u: '%', w: 2 });
STAT.set('ms', { n: '% Vit. déplacement', u: '%', w: 1 });
STAT.set('gold', { n: '% Or', u: '%', w: 1 });

export const AFFIXES = Array.of('pdmg', 'php', 'aspd', 'crit', 'ms', 'gold');

export const WEAPONS = new Map();
WEAPONS.set('Bâton', { rg: 34, rt: 0.75, m: 1 });
WEAPONS.set('Épée', { rg: 38, rt: 0.65, m: 1.1 });
WEAPONS.set('Lance', { rg: 52, rt: 0.85, m: 1.15 });
WEAPONS.set('Hache', { rg: 32, rt: 0.95, m: 1.6 });

export const SLOT_ICON = new Map();
SLOT_ICON.set('weapon', '⚔️'); SLOT_ICON.set('armor', '🛡️'); SLOT_ICON.set('charm', '💍');
SLOT_ICON.set('helm', '🪖'); SLOT_ICON.set('legs', '👖'); SLOT_ICON.set('boots', '🥾');

export const SLOT_NAME = new Map();
SLOT_NAME.set('weapon', 'Arme'); SLOT_NAME.set('armor', 'Armure'); SLOT_NAME.set('charm', 'Charme');
SLOT_NAME.set('helm', 'Casque'); SLOT_NAME.set('legs', 'Jambières'); SLOT_NAME.set('boots', 'Bottes');

export const SLOTS = Array.of('weapon', 'helm', 'armor', 'legs', 'boots', 'charm');

export const NAMES = new Map();
NAMES.set('armor', Array.of('Tunique', 'Cotte de mailles', 'Plastron'));
NAMES.set('helm', Array.of('Casque', 'Heaume', 'Capuche'));
NAMES.set('legs', Array.of('Jambières', 'Grèves', 'Pantalon'));
NAMES.set('boots', Array.of('Bottes', 'Souliers', 'Sandales'));
NAMES.set('charm', Array.of('Amulette', 'Anneau', 'Talisman'));

export const ARCHETYPES_DB = {
  chevalier: {
    label: 'Chevalier',
    weapons: ['Épée'],
    names: { helm: ['Heaume de Fer', 'Salade Lourde'], armor: ['Plastron de Plaque', 'Harnois Royal'], legs: ["Grèves d'Acier"], boots: ['Solerets Militaires'] },
    skinColor: 0xd9a06b, torsoColor: 0x4a5568
  },
  orc: {
    label: 'Orc',
    weapons: ['Hache'],
    names: { helm: ['Masque de Fureur', 'Crâne de Guerre'], armor: ['Harnais de Cuir Brut', "Plastron d'Os"], legs: ['Jambières de Fourrure'], boots: ['Bottes Cloutées'] },
    skinColor: 0x5a8f5a, torsoColor: 0x7c2d12
  },
  mage: {
    label: 'Mage',
    weapons: ['Bâton'],
    names: { helm: ['Chaperon Runique', "Tiare d'Éther"], armor: ["Robe d'Arcane", 'Tunique de Soie-Nuit'], legs: ['Chausses Tissées'], boots: ['Souliers de Givre'] },
    skinColor: 0xfbd38d, torsoColor: 0x3182ce
  },
  archer: {
    label: 'Archer',
    weapons: ['Épée'],
    names: { helm: ['Capuche de Pisteur', 'Bandeau de Visée'], armor: ['Pourpoint de Cuir', 'Veste de Camouflage'], legs: ['Braies de Mailles'], boots: ['Bottes de Voltige'] },
    skinColor: 0xe2e8f0, torsoColor: 0x276749
  },
  lancier: {
    label: 'Lancier',
    weapons: ['Lance'],
    names: { helm: ['Casque à Cimier', "Barbute d'Avant-garde"], armor: ['Brigandine Renforcée', 'Écrevisse de Fer'], legs: ['Tassettes Articulées'], boots: ['Cuissards de Marche'] },
    skinColor: 0xed8936, torsoColor: 0x744210
  }
};

export const CLASSES_LIST = ['chevalier', 'orc', 'mage', 'archer', 'lancier'];

export const LEG = Array.of(
  { k: 'thunder', slot: 'weapon', name: 'Bâton du Tonnerre', wt: 'Bâton', d: 'Tous les 4 coups, la foudre frappe les ennemis proches' },
  { k: 'vamp', slot: 'weapon', name: 'Lame Vampirique', wt: 'Épée', d: 'Vole 8% des dégâts infligés en PV' },
  { k: 'thorns', slot: 'armor', name: 'Armure Épineuse', d: 'Renvoie 300% des dégâts aux ennemis proches' },
  { k: 'midas', slot: 'charm', name: 'Amulette de Midas', d: '+60% Or' },
  { k: 'nova', slot: 'charm', name: 'Talisman Nova', d: 'Chaque ennemi tué explose' },
  { k: 'berserk', slot: 'helm', name: 'Heaume du Berserker', d: '+35% dégâts sous 50% de PV' },
  { k: 'wind', slot: 'boots', name: 'Bottes du Vent', d: 'Esquive deux fois plus rapide' },
  { k: 'iron', slot: 'legs', name: 'Jambières de Fer', d: '-20% dégâts subis' },
  { k: 'crit3', slot: 'weapon', name: 'Lame du Chasseur', wt: 'Épée', d: 'Les coups critiques font x3 au lieu de x2' },
  { k: 'regen', slot: 'charm', name: 'Anneau de Vie', d: 'Régénère 1,2% des PV max par seconde' },
  { k: 'lifekill', slot: 'armor', name: 'Cuirasse Solaire', d: 'Chaque ennemi tué rend 4% des PV max' }
);

export function getAffixRange(slotOrKey, rarityIdx, il) {
  const multipliers = [1.0, 1.3, 1.7, 2.2, 3.0];
  const m = multipliers[rarityIdx];
  let baseMin = 1, baseMax = 2;

  if (slotOrKey === 'weapon' || slotOrKey === 'dmg') { baseMin = 4 + il * 2.0; baseMax = 6 + il * 2.4; }
  else if (slotOrKey === 'armor' || slotOrKey === 'hp') { baseMin = 14 + il * 6.5; baseMax = 16 + il * 7.5; }
  else if (slotOrKey === 'legs') { baseMin = 9 + il * 4.2; baseMax = 11 + il * 4.8; }
  else if (slotOrKey === 'helm' || slotOrKey === 'php') { baseMin = 2 + il * 0.4; baseMax = 3 + il * 0.6; }
  else if (slotOrKey === 'boots' || slotOrKey === 'ms') { baseMin = 2 + il * 0.25; baseMax = 3 + il * 0.35; }
  else if (slotOrKey === 'charm' || slotOrKey === 'pdmg') { baseMin = 3 + il * 0.5; baseMax = 4 + il * 0.7; }
  else if (slotOrKey === 'aspd' || slotOrKey === 'crit' || slotOrKey === 'gold') { baseMin = (2 + il * 0.4) * 0.6; baseMax = (3 + il * 0.6) * 0.6; }

  return {
    min: Math.max(1, Math.round(baseMin * m)),
    max: Math.max(2, Math.round(baseMax * m))
  };
}

export function genStats(it) {
  const r = RAR.at(it.r), st = {};
  let totalRollRatio = 0, totalAffixesCount = 0;

  const mainKey = it.slot === 'weapon' ? 'dmg' : (it.slot === 'armor' || it.slot === 'legs' ? 'hp' : (it.slot === 'helm' ? 'php' : (it.slot === 'boots' ? 'ms' : 'pdmg')));
  const mainRange = getAffixRange(it.slot === 'legs' ? 'legs' : mainKey, it.r, it.il);
  const mainRoll = Math.floor(mainRange.min + Math.random() * (mainRange.max - mainRange.min + 1));
  const mainWeight = it.slot === 'weapon' ? it.wm : 1;
  const finalMainVal = Math.round(mainRoll * mainWeight);

  Reflect.set(st, mainKey, finalMainVal);
  totalRollRatio += mainRange.max > mainRange.min ? (mainRoll - mainRange.min) / (mainRange.max - mainRange.min) : 1;
  totalAffixesCount++;

  for (let i = 0; i < r.aff; i++) {
    let k = pick(AFFIXES);
    while (Reflect.has(st, k)) k = pick(AFFIXES);
    const affRange = getAffixRange(k, it.r, it.il);
    const affRoll = Math.floor(affRange.min + Math.random() * (affRange.max - affRange.min + 1));
    Reflect.set(st, k, affRoll);
    totalRollRatio += affRange.max > affRange.min ? (affRoll - affRange.min) / (affRange.max - affRange.min) : 1;
    totalAffixesCount++;
  }

  it.st = st;
  it.iv = Math.round((totalRollRatio / totalAffixesCount) * 100);
}

export function rollRarity(boost, forcedMinRar) {
  const pBoost = save.pact === 'titan' ? 1.8 : 1;
  const effBoost = (boost || 1) * pBoost;
  if (typeof forcedMinRar === 'number') {
    if (forcedMinRar >= 4) return 4;
    if (Math.random() < 0.25) return Math.min(4, forcedMinRar + 1);
    return forcedMinRar;
  }
  let total = 0;
  RAR.forEach((x, i) => { total += x.w * (i > 0 ? effBoost : 1); });
  let roll = Math.random() * total;
  for (let i = 0; i < RAR.length; i++) {
    roll -= RAR.at(i).w * (i > 0 ? effBoost : 1);
    if (roll <= 0) return i;
  }
  return 0;
}

export function newItem(il, boost, forcedRar) {
  const r = typeof forcedRar === 'number' ? forcedRar : rollRarity(boost);
  const it = { id: save.nid++, r: r, il: il, lvl: 0, leg: null, wm: 1, rg: 34, rt: 0.75, classRestriction: 'all', locked: false };

  if (r === 4) {
    const l = pick(LEG);
    it.slot = l.slot; it.leg = l.k; it.name = l.name;
    if (it.slot === 'weapon') {
      const wt = l.wt || 'Épée';
      const w = WEAPONS.get(wt);
      it.wm = w.m; it.rg = w.rg; it.rt = w.rt;
      for (const [cKey, db] of Object.entries(ARCHETYPES_DB)) {
        if (db.weapons.includes(wt)) { it.classRestriction = cKey; break; }
      }
    } else if (it.slot !== 'charm') {
      it.classRestriction = save.archetype;
    }
  } else {
    it.slot = pick(SLOTS);
    if (it.slot === 'charm') {
      it.classRestriction = 'all';
      it.name = pick(NAMES.get('charm'));
    } else {
      let targetClass = save.archetype;
      if (Math.random() > 0.70) {
        const altClasses = CLASSES_LIST.filter(c => c !== save.archetype);
        targetClass = pick(altClasses);
      }
      it.classRestriction = targetClass;
      const db = ARCHETYPES_DB[targetClass];

      if (it.slot === 'weapon') {
        const wType = pick(db.weapons);
        const w = WEAPONS.get(wType);
        it.name = wType + ' de ' + db.label;
        it.wm = w.m; it.rg = w.rg; it.rt = w.rt;
      } else {
        it.name = pick(db.names[it.slot]);
      }
    }
  }
  genStats(it);
  return it;
}
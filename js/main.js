import { SAVE_KEY, makeDefaultSave, loadSave, save, setSave, persist } from './core/state.js';
import {
  RAR, STAT, AFFIXES, WEAPONS, SLOT_ICON, SLOT_NAME, SLOTS, NAMES,
  ARCHETYPES_DB, CLASSES_LIST, LEG, getAffixRange, genStats, rollRarity, newItem
} from './engines/lootEngine.js';
import {
  updateSecretConfig, autoSortLoot, withdrawSecretItem, routeItemToSecretChest, configureFilterSystem
} from './engines/filterSystem.js';
import {
  campTab, sortMode, sellCart, setCampTabValue, setSortModeValue,
  sortInv, fusionCandidates, fuseFour, toggleCart, addRarityToCart,
  addAllSurplusToCart, confirmSellCart, selectItem, upgradeItem, rerollItem,
  autoEquip, configureMerchantEngine
} from './engines/merchantEngine.js';
import {
  SKILLS, PASSIVE_NODES, CONSTELLATIONS_CONFIG, skillLv, nodeDef, skillCost,
  getWeaponCategory, getActiveWeaponCategory, isTreeLocked,
  toggleConstellationLock, computeSpentSkillGold,
  getActiveTreeNodes, isNodeUnlocked, isNodeVisible, hasChildDependencies, buySkill,
  refundSkillIndividual, cycleSlot, unassignSlot, resetConstellation,
  configureConstellations
} from './entities/constellations.js';
import {
  BRIDGE_SECTORS, SECTOR_LEN, BRIDGE_HALF_W, ROOM_HALF, DIRS, roomCenterX, roomCenterZ,
  gameState, runMode, lastRunMode, endless, floorNo, wave, sector, sectorWave,
  activeDoors, leftDoorChoice, rightDoorChoice, puzzleState,
  runGold, ending, endMsg, endVictory, runItems,
  setGameState, setRunMode, setLastRunMode, setEndless, setFloorNo, setWave,
  setSector, setSectorWave, setRunGold, setEnding, setEndMsg, setEndVictory, setRunItems,
  startRun, openCamp, replayLastMode, returnCampFromEnd, configureRunDirector,
  setActiveWorldTheme
} from './core/runDirector.js';
import {
  enemies, projectiles, lootOrbs, lootItems,
  setEnemies, setProjectiles, setLootOrbs, setLootItems,
  clearEntities, itemLevel, sectorMinZ, sectorMaxZ, spawnEnemy, spawnWave,
  configureSpawnFactory
} from './entities/spawnFactory.js';
import {
  keys, touch, joyMove, pollGamepad, getGpIndex, initInputListeners,
  configureInputHandler
} from './input/inputHandler.js';
import {
  S, initRender3D, getRenderContext, setRendererQuality, resize,
  matCache, mat, boxGeo, box, limb, shadowGeo, shadowMat, addShadow,
  buildWeaponOnGroup, setPlayerWeaponGroup, buildWeapon,
  makeEnemy, updEnemy, projMat, makeProj, updProj,
  goldMat, makeOrb, updOrb, makeLoot, updLoot,
  makePart, updPart, makeEffect, updEffect
} from './rendering/gameRender3D.js';
import {
  playerHeightY, setPlayerHeightY, camPos, setCamPos,
  shake, setShake, addShake,
  occlusionRaycaster, occlusionOrigin, occlusionDir,
  configurePhysicsEngine, updateCombat
} from './engines/physicsEngine.js';
import {
  ac, muted, audio, tone, noise, SFX, sfx, MUS, musicStep, startMusic, setMutedState
} from './engines/audioProcedural.js';
import {
  campOccluders, arenaPlatforms, configureWorldFactory,
  updateWorldEnvironment, applyCampTheme, buildEnv
} from './entities/worldFactory.js';

if (typeof THREE === 'undefined') {
  document.body.innerHTML = '<div style="padding:40px;font-size:26px;color:#fff">⚠️ Impossible de charger la 3D (three.js). Vérifie ta connexion.</div>';
  throw new Error('three.js manquant');
}

const $ = (id) => document.getElementById(id);
const pick = (arr) => arr.at(Math.floor(Math.random() * arr.length));
const canvas = $('game-canvas');
const ARENA_H = 240;

const { scene, camera, sun } = initRender3D(canvas, () => {
  document.body.innerHTML = '<div style="padding:40px;font-size:26px;color:#fff">⚠️ Impossible de charger WebGL.</div>';
});

const LANDS = Array.of(
  { n: 'Plaine Verte', boss: 'Roi Slime', lm: 1, col: '#38a169', col2: '#68d391', ground: '#2d4a35', sym: '☉' },
  { n: 'Forêt Maudite', boss: 'Ent Ancestral', lm: 3, col: '#975a16', col2: '#d69e2e', ground: '#3a3326', sym: '🌲' },
  { n: 'Crypte Glacée', boss: 'Seigneur Squelette', lm: 8, col: '#3182ce', col2: '#90cdf4', ground: '#26354a', sym: '❄' }
);
const PACTS = Array.of(
  { id: 'none', n: 'Pacte : Aucun', d: 'Run standard' },
  { id: 'haste', n: 'Pacte : Hâte (+45% Or)', d: 'Ennemis +30% vitesse, +45% Or' },
  { id: 'titan', n: 'Pacte : Titans (+60% Butin)', d: 'Ennemis +35% PV/Dégâts, butin rare x1.8' }
);
const CURSE_POOL = Array.of(
  { id: 'fastMobs', n: 'Célérité Maudite', d: 'Ennemis +30% vitesse de déplacement' },
  { id: 'heavyHits', n: 'Coups Lourds', d: 'Ennemis +35% dégâts infligés' },
  { id: 'fragileBody', n: 'Chair Fragile', d: '-20% PV max pendant cette run' },
  { id: 'armoredMobs', n: 'Carapaces Sombres', d: 'Ennemis +35% PV max' },
  { id: 'slowDash', n: 'Esquive Pesante', d: "+35% temps de recharge de l'esquive" }
);

let selId = null;
function getItem(id) {
  const inInv = save.inv.find((i) => i.id === id);
  if (inInv) return inInv;
  if (save.secretChest) {
    for (const tab of save.secretChest) {
      const inSec = tab.items.find((i) => i.id === id);
      if (inSec) return inSec;
    }
  }
  return null;
}
function isInSecretChest(id) {
  return Boolean(save.secretChest && save.secretChest.some((t) => t.items.some((i) => i.id === id)));
}
function isEquipped(it) { return Reflect.get(save.eq, it.slot) === it.id; }
function equippedItems() { return SLOTS.map((k) => getItem(Reflect.get(save.eq, k))).filter(Boolean); }
function statVal(it, k) { return it && Reflect.has(it.st, k) ? Math.round(Reflect.get(it.st, k) * (1 + 0.1 * it.lvl)) : 0; }
function sellValue(it) { return Math.round((5 + it.il * 4) * RAR.at(it.r).sell) + it.lvl * 8; }
function upgCost(it) { return Math.round((10 + it.il * 6) * (1 + it.lvl * 0.8) * (1 + it.r * 0.4)); }
function rerollCost(it) { return Math.round((8 + it.il * 5) * (1 + it.r * 0.8)); }
function score(it) {
  let s = it.leg ? 40 : 0;
  for (const k in it.st) s += statVal(it, k) * STAT.get(k).w;
  return s;
}

const player = { x: 0, z: 44, angle: -1.57, moveAngle: -1.57, hp: 60, maxHp: 60, walkTime: 0, swingTime: 0, invuln: 0, dashT: 0, rage: 0, shield: 0, spin: 0 };

let activeCurses = new Array();
let guaranteedCurseLoot = 0;
let altarChoices = new Array();
let altarShownKeys = new Set();

function hasCurse(id) { return activeCurses.some((c) => c.id === id); }

function computeSetBonuses() {
  const counts = [0, 0, 0, 0, 0];
  equippedItems().forEach((it) => { counts[it.r]++; });
  return {
    counts,
    speed2: counts[1] >= 2,
    speed4: counts[1] >= 4,
    leech2: counts[2] >= 2,
    leech4: counts[2] >= 4,
    crit2: counts[3] >= 2,
    crit4: counts[3] >= 4,
    gold2: counts[4] >= 2,
    gold4: counts[4] >= 4
  };
}

function getStats(includeRage = false) {
  const s = { dmg: 3, hp: 60, pdmg: 0, php: 0, aspd: 0, crit: 5, ms: 0, gold: 0, range: 26, rate: 1.0, legs: new Set(), leechPct: 0, lifeOnKillPct: 0, critMult: 2, dashCdMult: 1 };
  equippedItems().forEach((it) => {
    const m = 1 + 0.1 * it.lvl;
    for (const k in it.st) Reflect.set(s, k, Reflect.get(s, k) + Reflect.get(it.st, k) * m);
    if (it.slot === 'weapon') { s.range = it.rg; s.rate = it.rt; }
    if (it.leg) s.legs.add(it.leg);
  });
  s.pdmg += skillLv('p_atk') * 6 + skillLv('p_reach') * 4;
  s.range += skillLv('p_reach') * 3;
  s.aspd += skillLv('p_aspd') * 6;
  s.php += skillLv('p_hp') * 8;
  s.leechPct += skillLv('p_leech') * 1.5;
  s.crit += skillLv('p_crit') * 3.5;
  s.ms += skillLv('p_ms') * 4.5;
  s.skillCdMult = Math.max(0.5, 1 - skillLv('p_cdr') * 0.05);
  s.dashCdMult *= s.skillCdMult;

  const sets = computeSetBonuses();
  if (sets.speed2) s.ms += 15;
  if (sets.speed4) { s.aspd += 25; s.dashCdMult *= 0.8; }
  if (sets.leech2) s.leechPct += 6;
  if (sets.leech4) s.lifeOnKillPct += 5;
  if (sets.crit2) s.crit += 12;
  if (sets.crit4) s.critMult += 0.45;
  if (sets.gold2) s.gold += 25;
  if (sets.gold4) { s.pdmg += 20; s.php += 15; }
  if (s.legs.has('crit3')) s.critMult = Math.max(s.critMult, 3);
  if (s.legs.has('lifekill')) s.lifeOnKillPct += 4;

  const rageActive = includeRage && player.rage > 0;
  const fragileMult = hasCurse('fragileBody') ? 0.8 : 1;
  s.maxHP = Math.max(10, Math.round(s.hp * (1 + s.php / 100) * fragileMult));
  s.atk = s.dmg * (1 + s.pdmg / 100) * (rageActive ? 1.3 : 1);
  s.def = Math.round(s.maxHP * 0.15 + (s.legs.has('iron') ? 25 : 0));
  s.atkRate = s.rate / (1 + s.aspd / 100) / (rageActive ? 1.6 : 1);
  s.speed = 68 * (1 + s.ms / 100);
  const pactGold = save.pact === 'haste' ? 45 : 0;
  s.goldMult = 1 + (s.gold + pactGold + (s.legs.has('midas') ? 60 : 0)) / 100;
  const curseDashMult = hasCurse('slowDash') ? 1.35 : 1;
  s.dashMaxCd = (s.legs.has('wind') ? 0.7 : 1.4) * s.dashCdMult * curseDashMult;

  s.power = Math.round(s.maxHP * 0.6 + s.atk * 5 + (1 / s.atkRate) * 18 + s.crit * 1.5 + s.speed * 0.4);
  return s;
}

function lookColors() {
  const col = (k) => { const it = getItem(Reflect.get(save.eq, k)); return it ? RAR.at(it.r).c : null; };
  const w = getItem(save.eq.weapon);
  let topRar = 0;
  equippedItems().forEach((it) => { if (it.r > topRar) topRar = it.r; });
  return { rg: w ? w.rg : 34, w: col('weapon') || '#e2e8f0', a: col('armor'), c: col('charm'), h: col('helm'), l: col('legs'), b: col('boots'), topCol: RAR.at(topRar).c };
}

function maybeOpenCurseAltar(key) {
  if (altarShownKeys.has(key)) return false;
  altarShownKeys.add(key);
  const avail = CURSE_POOL.filter((c) => !hasCurse(c.id));
  if (avail.length === 0) return false;
  const shuffled = avail.slice().sort(() => Math.random() - 0.5);
  altarChoices = shuffled.slice(0, Math.min(3, shuffled.length));
  $('altar-sub').innerHTML = `Malédictions actives : <b>${activeCurses.length}</b> · Butin garanti en fin de run si victoire : <b class="gold-text">+${guaranteedCurseLoot}</b><br>Choisis 1 malus pour ajouter <b>+1 butin garanti</b>, ou passe sans risque.`;
  $('altar-choices').innerHTML = altarChoices.map((c, idx) => `
    <button class="curse-card" onclick="pickCurse(${idx})">
      <div class="curse-top"><span>☠️ ${c.n}</span><span style="color:#ffd700">+1 BUTIN GARANTI</span></div>
      <div class="curse-desc">${c.d}</div>
    </button>
  `).join('');
  $('altar-overlay').style.display = 'flex';
  return true;
}
function pickCurse(idx) {
  const c = altarChoices.at(idx);
  if (!c) return;
  activeCurses.push(c);
  guaranteedCurseLoot++;
  save.stats.curses = (save.stats.curses || 0) + 1;
  const st = getStats(false);
  player.maxHp = st.maxHP;
  player.hp = Math.min(player.maxHp, player.hp);
  $('altar-overlay').style.display = 'none';
  persist();
  showToast(`Malus accepté : ${c.n} (+${guaranteedCurseLoot} butin garanti si victoire) !`, 3500);
  proceedAfterAltar();
}
function skipCurseAltar() {
  $('altar-overlay').style.display = 'none';
  showToast('Autel passé sans malus.');
  proceedAfterAltar();
}
function proceedAfterAltar() {
  if (runMode === 'bridge') {
    setSector(sector + 1); setSectorWave(1);
    if (sector > save.bridgeBest) save.bridgeBest = sector;
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.25);
    spawnWave();
  } else if (endless) {
    setFloorNo(floorNo + 1); setWave(1);
    if (floorNo > save.best) save.best = floorNo;
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.3);
    const th = ((floorNo - 1) % 3) + 1;
    if (th !== landNo) { landNo = th; buildEnv(th); }
    spawnWave();
  } else if (runMode === 'arena') {
    spawnWave();
  }
  persist();
}

let landNo = 1, hits = 0, attackTimer = 0, dashCd = 0, dashMaxCd = 1.4, hitStopT = 0;
let effects = new Array(), floatTexts = new Array(), particles = new Array();
let look = lookColors();

function addFloatText(x, z, text, color) { floatTexts.push({ x, z, y: 18, text, color, life: 0.7 }); }
function burst(x, z, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 50;
    particles.push({ x, z, y: 6, vx: Math.cos(a) * s, vz: Math.sin(a) * s * 0.5, vy: 30 + Math.random() * 40, life: 0.4 + Math.random() * 0.3, color });
  }
}
function damageEnemy(e, amount, crit) {
  const dmg = Math.max(1, Math.round(amount));
  sfx(crit ? 'crit' : 'hit');
  e.hp -= dmg;
  e.flash = 0.12;

  // Knockback nudge away from player
  const kdx = e.x - player.x, kdz = e.z - player.z;
  const kd = Math.hypot(kdx, kdz);
  if (kd > 0.01 && !e.isBoss) {
    const push = crit ? 4.5 : 2.5;
    e.x += (kdx / kd) * push;
    e.z += (kdz / kd) * push;
  }

  if (crit || e.hp <= 0) hitStopT = Math.max(hitStopT, e.isBoss && e.hp <= 0 ? 0.065 : 0.026);
  addShake(crit ? 1.8 : 0.7);
  addFloatText(e.x, e.z, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffd700' : '#ffffff');
  burst(e.x, e.z, e.col2, crit ? 5 : 3);

  // Death explosion burst & shockwave ring
  if (e.hp <= 0 && !e._deathBursted) {
    e._deathBursted = true;
    burst(e.x, e.z, e.col, e.isBoss ? 28 : 12);
    burst(e.x, e.z, e.col2, e.isBoss ? 18 : 6);
    effects.push({
      type: 'ring',
      x: e.x,
      z: e.z,
      r: e.isBoss ? 46 : 20,
      color: e.col2 || '#ffffff',
      life: 0.24,
      maxLife: 0.24
    });
    addShake(e.isBoss ? 6.0 : 1.6);
  }

  if (e.isBoss) $('boss-hp-fill').style.width = `${Math.max(0, (e.hp / e.maxHp) * 100)}%`;
}
function hurtPlayer(amount, stats) {
  if (gameState !== 'COMBAT') return;
  if (player.shield > 0) { addFloatText(player.x, player.z, 'Bloqué', '#90cdf4'); return; }
  if (player.invuln > 0) return;
  const armorMitigation = 100 / (100 + Math.max(0, stats.def || 0));
  const synUnstoppable = Math.max(0.65, 1 - skillLv('syn_unstoppable') * 0.06);
  const ironMult = stats.legs.has('iron') ? 0.8 : 1;
  const dmg = Math.max(1, Math.round(amount * armorMitigation * ironMult * (player.rage > 0 ? synUnstoppable : 1)));
  sfx('hurt');
  player.hp -= dmg; player.invuln = 0.45; addShake(3);
  addFloatText(player.x, player.z, `-${dmg}`, '#fc8181');
  burst(player.x, player.z, '#e53e3e', 6);
  if (stats.legs.has('thorns')) {
    effects.push({ type: 'ring', x: player.x, z: player.z, r: 40, color: '#ed8936', life: 0.25, maxLife: 0.25 });
    for (const e of enemies) if (Math.hypot(e.x - player.x, e.z - player.z) <= 40) damageEnemy(e, stats.atk * 3, false);
  }
}

function performAutoAttack(stats) {
  const wCat = getActiveWeaponCategory();
  const isRangedCat = wCat === 'Arc' || wCat === 'Bâton';
  const effectiveRange = isRangedCat ? Math.max(stats.range + 45, 115) : stats.range + 6;

  let target = null, min = effectiveRange;
  for (const e of enemies) {
    const d = Math.hypot(e.x - player.x, e.z - player.z) - e.w / 2;
    if (d <= min) { min = d; target = e; }
  }
  if (!target) return false;

  player.angle = Math.atan2(target.z - player.z, target.x - player.x);
  player.swingTime = 0.16;
  hits++;
  const fx = Math.cos(player.angle), fz = Math.sin(player.angle);
  const crit = Math.random() * 100 < stats.crit;
  const baseDmg = stats.atk * (crit ? stats.critMult : 1) * (0.9 + Math.random() * 0.2);

  if (wCat === 'Arc') {
    projectiles.push({
      x: player.x + fx * 6, z: player.z + fz * 6,
      vx: fx * 245, vz: fz * 245,
      dmg: baseDmg, crit, friendly: true, kind: 'arrow', pierce: 2, hitIds: new Set(), life: 0.85
    });
    sfx('dash');
  } else if (wCat === 'Bâton') {
    projectiles.push({
      x: player.x + fx * 6, z: player.z + fz * 6,
      vx: fx * 195, vz: fz * 195,
      dmg: baseDmg * 1.05, crit, friendly: true, kind: 'bolt', pierce: 1, hitIds: new Set(), life: 0.95
    });
    sfx('chain');
  } else if (wCat === 'Lance') {
    const reach = effectiveRange * 1.35;
    effects.push({ type: 'chain', pts: [{ x: player.x, z: player.z }, { x: player.x + fx * reach, z: player.z + fz * reach }], x: player.x, z: player.z, r: 0, color: look.w, life: 0.16, maxLife: 0.16 });
    let totalDealt = 0;
    for (const e of enemies) {
      const rx = e.x - player.x, rz = e.z - player.z;
      const along = rx * fx + rz * fz;
      const perp = Math.abs(rx * fz - rz * fx);
      if (along >= -4 && along <= reach + e.w / 2 && perp <= 13 + e.w / 2) {
        damageEnemy(e, baseDmg, crit);
        totalDealt += baseDmg;
      }
    }
    const leechTotal = stats.leechPct + (stats.legs.has('vamp') ? 8 : 0);
    if (leechTotal > 0 && totalDealt > 0) player.hp = Math.min(player.maxHp, player.hp + totalDealt * (leechTotal / 100));
  } else {
    const isAxe = wCat === 'Hache';
    const arcR = isAxe ? effectiveRange * 1.12 : effectiveRange;
    const arcDmg = isAxe ? baseDmg * 1.16 : baseDmg;
    effects.push({ type: 'arc', x: player.x, z: player.z, r: arcR, a: player.angle, color: look.w, life: 0.16, maxLife: 0.16 });
    let totalDealt = 0;
    for (const e of enemies) {
      const rx = e.x - player.x, rz = e.z - player.z, d = Math.hypot(rx, rz);
      if (d <= arcR + e.w / 2 && (d < 18 || (rx * fx + rz * fz) / d > (isAxe ? -0.45 : -0.2))) {
        damageEnemy(e, arcDmg, crit);
        totalDealt += arcDmg;
      }
    }
    const leechTotal = stats.leechPct + (stats.legs.has('vamp') ? 8 : 0);
    if (leechTotal > 0 && totalDealt > 0) player.hp = Math.min(player.maxHp, player.hp + totalDealt * (leechTotal / 100));
  }

  if (stats.legs.has('thunder') && hits % 4 === 0) {
    effects.push({ type: 'ring', x: player.x, z: player.z, r: 70, color: '#faf089', life: 0.3, maxLife: 0.3 });
    addShake(2);
    for (const e of enemies) if (Math.hypot(e.x - player.x, e.z - player.z) <= 70) damageEnemy(e, stats.atk * 1.5, true);
  }
  return true;
}
function triggerDash() {
  if (gameState !== 'COMBAT' || dashCd > 0) return;
  const st = getStats(true);
  dashMaxCd = st.dashMaxCd;
  dashCd = dashMaxCd;
  player.dashT = 0.16;
  sfx('dash');
  player.invuln = Math.max(player.invuln, 0.25);
  burst(player.x, player.z, '#ecc94b', 6);
}
function collectItem(it) {
  sfx('loot', it.r);
  const col = RAR.at(it.r).c;
  addFloatText(player.x, player.z, it.name, col);
  if (save.inv.length >= 40) { const g = sellValue(it); save.gold += g; setRunGold(runGold + g); return; }
  save.inv.push(it);
  runItems.push(it);
  if (it.r >= 3) showToast(`${RAR.at(it.r).n.toUpperCase()} : ${it.name} !`);
}

const skillCd = { e: 0, r: 0, c: 0 };
let cPanX = 0, cPanY = 0, cZoom = 1, cDrag = false, cDragSX = 0, cDragSY = 0, starAnimId = null;
function applyConstellationTransform() {
  $('constellation-stage').style.transform = `translate(${cPanX}px, ${cPanY}px) scale(${cZoom})`;
}
function openConstellation() {
  closePanel();
  $('constellation-overlay').style.display = 'block';
  $('prompt').style.display = 'none';
  $('wizard-guide').style.display = 'none';
  centerConstellation();
  renderConstellation();
  startStarfield();
  updateTopNav();
}
function closeConstellation() {
  $('constellation-overlay').style.display = 'none';
  $('c-tooltip').style.display = 'none';
  if (starAnimId) { cancelAnimationFrame(starAnimId); starAnimId = null; }
  updateTopNav();
}
function centerConstellation() {
  cPanX = 0; cPanY = 0; cZoom = 1;
  applyConstellationTransform();
}
function showConstellationTip(ev, id) {
  const def = nodeDef(id);
  const tip = $('c-tooltip');
  if (!def || !tip) return;
  const lv = skillLv(id);
  const unlocked = isNodeUnlocked(id);
  const maxed = lv >= 5;
  const cost = skillCost(id);
  const curStat = def.stat(lv);
  const nextStat = def.stat(Math.min(5, lv + 1));
  const parents = (getActiveTreeNodes().find((n) => n.id === id)?.parents || []).filter((p) => p !== 'center');
  const reqHtml = !unlocked && parents.length
    ? `<div style="color:#f56565;font-size:13px;margin-bottom:4px;">🔒 Requiert : <b>${parents.map((p) => nodeDef(p).n.toUpperCase()).join(' + ')}</b></div>`
    : '';
  tip.innerHTML = `
    <div style="font-size:18px;font-weight:bold;color:#e2b740;">${def.n.toUpperCase()}</div>
    <div style="font-size:13px;color:${maxed ? '#48bb78' : (unlocked && save.gold >= cost ? '#e2b740' : '#f56565')};margin:2px 0 4px;">${maxed ? 'RANG MAXIMUM' : 'Amélioration - ' + cost + ' or'} · Niv ${lv}/5</div>
    ${reqHtml}
    <div style="color:#cbd5e0;font-size:14px;margin-bottom:5px;">${def.d}</div>
    <div style="background:#181d26;border:1px solid #384152;border-radius:3px;padding:4px 6px;font-size:14px;">
      ${maxed ? `<span style="color:#48bb78">${curStat}</span>` : `${curStat} → <b style="color:#48bb78">${nextStat}</b>`}
    </div>
  `;
  tip.style.display = 'block';
  moveConstellationTip(ev);
}
function moveConstellationTip(ev) {
  const tip = $('c-tooltip');
  if (!tip || tip.style.display !== 'block') return;
  let x = ev.clientX + 14, y = ev.clientY + 14;
  const r = tip.getBoundingClientRect();
  if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - 14;
  if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}
function hideConstellationTip() { $('c-tooltip').style.display = 'none'; }

function renderConstellation() {
  getStats(false);
  if ($('top-gold-val')) $('top-gold-val').textContent = `OR : ${save.gold}`;
  let linesHtml = '';
  let nodesHtml = '';
  const currentTree = getActiveTreeNodes();
  const nodeMap = new Map(currentTree.map((n) => [n.id, n]));

  currentTree.forEach((n) => {
    if (!isNodeVisible(n)) return;
    (n.parents || []).forEach((pid) => {
      const p = nodeMap.get(pid);
      if (!p) return;
      const activeLine = skillLv(n.id) > 0;
      const strokeCol = n.synergy ? (activeLine ? '#ffd700' : '#b794f4') : (activeLine ? '#ffd700' : '#4a5568');
      linesHtml += `<line x1="${p.x}" y1="${p.y}" x2="${n.x}" y2="${n.y}" stroke="${strokeCol}" stroke-width="${activeLine || n.synergy ? 2.5 : 1.5}" />`;
    });
    if (n.isCenter) {
      nodesHtml += `<div class="c-node center" style="left:${n.x}px;top:${n.y}px;"><div class="c-ring">${n.i}</div></div>`;
      return;
    }
    const def = nodeDef(n.id);
    const lv = skillLv(n.id);
    const cost = skillCost(n.id);
    const maxed = lv >= 5;
    const unlocked = isNodeUnlocked(n.id);
    const statusCls = !unlocked ? 'locked' : (lv > 0 ? 'learned' : (save.gold >= cost ? 'avail' : 'poor'));
    const extraCls = n.synergy ? 'synergy' : (n.passive ? 'passive' : '');
    nodesHtml += `
      <div class="c-node ${statusCls} ${extraCls}" style="left:${n.x}px;top:${n.y}px;"
        onclick="buySkill('${n.id}')"
        oncontextmenu="refundSkillIndividual('${n.id}', event)"
        onmouseenter="showConstellationTip(event, '${n.id}')"
        onmousemove="moveConstellationTip(event)"
        onmouseleave="hideConstellationTip()">
        <div class="c-ring">${unlocked ? def.i : '🔒'}<span class="c-lv">${lv}/5</span></div>
        <div class="c-cost">${maxed ? 'MAX' : cost + ' OR'}</div>
      </div>`;
  });

  $('constellation-lines').innerHTML = linesHtml;
  $('constellation-nodes').innerHTML = nodesHtml;

  const lockBtn = $('c-lock-btn');
  if (lockBtn) {
    const cat = getActiveWeaponCategory();
    const locked = isTreeLocked(cat);
    lockBtn.textContent = locked ? `🔒 VERROUILLÉ (${cat.toUpperCase()})` : `🔓 VERROUILLER (${cat.toUpperCase()})`;
    lockBtn.classList.toggle('sel', locked);
  }

  $('c-keybind-bar').innerHTML = Array.of('e', 'r', 'c').map((s) => {
    const k = Reflect.get(save.slots, s);
    const sk = k ? SKILLS.get(k) : null;
    return `<button class="c-kb-slot" title="Clic gauche : changer · Clic droit : vider" onclick="cycleSlot('${s}')" oncontextmenu="event.preventDefault(); unassignSlot('${s}');"><b style="color:#e2b740;">[${s.toUpperCase()}]</b> <span>${sk ? sk.i + ' ' + sk.n.toUpperCase() : 'VIDE'}</span></button>`;
  }).join('');
}

function startStarfield() {
  const c = $('starfield-canvas');
  if (!c || starAnimId) return;
  const ctx = c.getContext('2d');
  const stars = Array.from({ length: 130 }, () => ({
    x: Math.random(), y: Math.random(),
    s: Math.random() < 0.75 ? 2 : 3,
    p: Math.random() * Math.PI * 2,
    sp: 1.2 + Math.random() * 2.5
  }));
  function drawStars(now) {
    if ($('constellation-overlay').style.display !== 'block') { starAnimId = null; return; }
    if (c.width !== window.innerWidth || c.height !== window.innerHeight) {
      c.width = window.innerWidth; c.height = window.innerHeight;
    }
    ctx.clearRect(0, 0, c.width, c.height);
    const t = now * 0.001;
    stars.forEach((st) => {
      const alpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.sp + st.p));
      ctx.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(2)})`;
      ctx.fillRect(Math.floor(st.x * c.width), Math.floor(st.y * c.height), st.s, st.s);
    });
    starAnimId = requestAnimationFrame(drawStars);
  }
  starAnimId = requestAnimationFrame(drawStars);
}

$('constellation-overlay').addEventListener('pointerdown', (ev) => {
  if (ev.target.closest('.c-node, button, #c-keybind-bar')) return;
  cDrag = true; cDragSX = ev.clientX - cPanX; cDragSY = ev.clientY - cPanY;
});
$('constellation-overlay').addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const delta = ev.deltaY > 0 ? -0.12 : 0.12;
  cZoom = Math.max(0.55, Math.min(1.85, Number((cZoom + delta).toFixed(2))));
  applyConstellationTransform();
}, { passive: false });
window.addEventListener('pointermove', (ev) => {
  if (!cDrag) return;
  cPanX = ev.clientX - cDragSX; cPanY = ev.clientY - cDragSY;
  applyConstellationTransform();
});
window.addEventListener('pointerup', () => { cDrag = false; });

function castSkill(slot) {
  if (gameState !== 'COMBAT') return;
  const k = Reflect.get(save.slots, slot);
  if (!k || Reflect.get(skillCd, slot) > 0) return;
  const lv = skillLv(k), st = getStats(true);
  Reflect.set(skillCd, slot, SKILLS.get(k).cd * (st.skillCdMult || 1));
  sfx(['whirl', 'quake', 'heal', 'rage', 'chain', 'frost', 'shield'].includes(k) ? k : 'crit');

  const findNearest = (maxR = 180) => {
    let best = null, bd = maxR;
    for (const e of enemies) {
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };

  if (k === 'whirl') {
    const syn = skillLv('syn_vortex');
    const r = (62 + lv * 6) * (1 + syn * 0.12);
    effects.push({ type: 'whirl', x: player.x, z: player.z, r, color: syn > 0 ? '#b794f4' : '#38b2ac', life: 0.5, maxLife: 0.5 });
    effects.push({ type: 'ring', x: player.x, z: player.z, r: r * 1.05, color: '#b2f5ea', life: 0.35, maxLife: 0.35 });
    player.spin = 0.5; burst(player.x, player.z, '#38b2ac', 16); addShake(3);
    for (const e of enemies) {
      const dx = player.x - e.x, dz = player.z - e.z, d = Math.hypot(dx, dz);
      if (d <= r + e.w / 2) {
        if (syn > 0 && d > 8 && !e.isBoss) { e.x += (dx / d) * 14; e.z += (dz / d) * 14; }
        damageEnemy(e, st.atk * (2 + lv * 0.5) * (1 + syn * 0.25), syn > 0);
      }
    }
  } else if (k === 'lunge') {
    const syn = skillLv('syn_phantom');
    const tgt = findNearest(160);
    if (tgt) player.angle = Math.atan2(tgt.z - player.z, tgt.x - player.x);
    const fx = Math.cos(player.angle), fz = Math.sin(player.angle);
    player.x += fx * 34; player.z += fz * 34; player.invuln = Math.max(player.invuln, 0.3);
    effects.push({ type: 'arc', x: player.x, z: player.z, r: 46, a: player.angle, color: syn > 0 ? '#ffd700' : '#63b3ed', life: 0.22, maxLife: 0.22 });
    burst(player.x, player.z, '#90cdf4', 12); addShake(2.5);
    for (const e of enemies) {
      if (Math.hypot(e.x - player.x, e.z - player.z) <= 46 + e.w / 2) {
        const wasAlive = e.hp > 0;
        damageEnemy(e, st.atk * (1.8 + lv * 0.45) * (1 + syn * 0.2), syn > 0 || Math.random() * 100 < st.crit);
        if (syn > 0 && wasAlive && e.hp <= 0) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.08);
      }
    }
  } else if (k === 'bladestorm') {
    const hitsCount = 3 + lv;
    effects.push({ type: 'whirl', x: player.x, z: player.z, r: 58, color: '#f6ad55', life: 0.45, maxLife: 0.45 });
    player.spin = 0.45; addShake(2.5);
    for (const e of enemies) {
      if (Math.hypot(e.x - player.x, e.z - player.z) <= 58 + e.w / 2) {
        damageEnemy(e, st.atk * (0.75 * hitsCount), Math.random() * 100 < st.crit);
      }
    }
  } else if (k === 'pierce') {
    const syn = skillLv('syn_skylance');
    const tgt = findNearest(200);
    if (tgt) player.angle = Math.atan2(tgt.z - player.z, tgt.x - player.x);
    const fx = Math.cos(player.angle), fz = Math.sin(player.angle);
    const pts = [{ x: player.x, z: player.z }, { x: player.x + fx * 115, z: player.z + fz * 115 }];
    effects.push({ type: 'chain', pts, x: player.x, z: player.z, r: 0, color: syn > 0 ? '#ffd700' : '#90cdf4', life: 0.35, maxLife: 0.35 });
    addShake(2.5);
    for (const e of enemies) {
      const rx = e.x - player.x, rz = e.z - player.z;
      const along = rx * fx + rz * fz;
      const perp = Math.abs(rx * fz - rz * fx);
      if (along >= -6 && along <= 115 && perp <= 16 + e.w / 2) {
        damageEnemy(e, st.atk * (2.1 + lv * 0.5) * (1 + syn * 0.25), true);
        if (syn > 0) burst(e.x, e.z, '#faf089', 8);
      }
    }
  } else if (k === 'cleave') {
    const syn = skillLv('syn_crimson');
    const tgt = findNearest(120);
    if (tgt) player.angle = Math.atan2(tgt.z - player.z, tgt.x - player.x);
    effects.push({ type: 'arc', x: player.x, z: player.z, r: 56, a: player.angle, color: '#e53e3e', life: 0.26, maxLife: 0.26 });
    burst(player.x, player.z, '#fc8181', 14); addShake(3.2);
    let dealt = 0;
    for (const e of enemies) {
      if (Math.hypot(e.x - player.x, e.z - player.z) <= 56 + e.w / 2) {
        const dmg = st.atk * (2.3 + lv * 0.55);
        const wasAlive = e.hp > 0;
        damageEnemy(e, dmg, true);
        dealt += dmg;
        if (syn > 0 && wasAlive && e.hp <= 0) {
          effects.push({ type: 'ring', x: e.x, z: e.z, r: 44, color: '#f56565', life: 0.3, maxLife: 0.3 });
          for (const e2 of enemies) if (e2 !== e && Math.hypot(e2.x - e.x, e2.z - e.z) <= 44) damageEnemy(e2, st.atk * (1 + syn * 0.3), false);
        }
      }
    }
    if (dealt > 0) player.hp = Math.min(player.maxHp, player.hp + dealt * (syn > 0 ? 0.14 : 0.07));
  } else if (k === 'warcry') {
    player.shield = Math.max(player.shield, 2 + lv * 0.4);
    effects.push({ type: 'ring', x: player.x, z: player.z, r: 78, color: '#f6ad55', life: 0.35, maxLife: 0.35 });
    addShake(3.5);
    for (const e of enemies) {
      const dx = e.x - player.x, dz = e.z - player.z, d = Math.max(1, Math.hypot(dx, dz));
      if (d <= 78 && !e.isBoss) { e.x += (dx / d) * 32; e.z += (dz / d) * 32; e.slowT = 2.5; }
    }
  } else if (k === 'meteor') {
    const syn = skillLv('syn_starfall');
    const tgt = findNearest(170) || { x: player.x + Math.cos(player.angle) * 50, z: player.z + Math.sin(player.angle) * 50 };
    const dropMeteor = (mx, mz, scale) => {
      effects.push({ type: 'quake', x: mx, z: mz, r: 64 * scale, color: '#ff5a1f', life: 0.7, maxLife: 0.7 });
      burst(mx, mz, '#ed8936', 20);
      for (const e of enemies) if (Math.hypot(e.x - mx, e.z - mz) <= 64 * scale + e.w / 2) damageEnemy(e, st.atk * (2.8 + lv * 0.65) * scale, true);
    };
    dropMeteor(tgt.x, tgt.z, 1);
    for (let s = 0; s < syn; s++) {
      const a = (s / Math.max(1, syn)) * Math.PI * 2;
      dropMeteor(tgt.x + Math.cos(a) * 38, tgt.z + Math.sin(a) * 38, 0.55);
    }
    addShake(6);
  } else if (k === 'orb') {
    const tgt = findNearest(190);
    if (tgt) player.angle = Math.atan2(tgt.z - player.z, tgt.x - player.x);
    const fx = Math.cos(player.angle), fz = Math.sin(player.angle);
    const pts = [{ x: player.x, z: player.z }, { x: player.x + fx * 130, z: player.z + fz * 130 }];
    effects.push({ type: 'chain', pts, x: player.x, z: player.z, r: 0, color: '#d6bcfa', life: 0.4, maxLife: 0.4 });
    for (const e of enemies) {
      const rx = e.x - player.x, rz = e.z - player.z;
      const along = rx * fx + rz * fz;
      if (along >= 0 && along <= 130 && Math.abs(rx * fz - rz * fx) <= 22 + e.w / 2) {
        damageEnemy(e, st.atk * (2.0 + lv * 0.45), true);
      }
    }
  } else if (k === 'volley') {
    const syn = skillLv('syn_tempest');
    const tgt = findNearest(170) || { x: player.x + Math.cos(player.angle) * 55, z: player.z + Math.sin(player.angle) * 55 };
    effects.push({ type: 'ring', x: tgt.x, z: tgt.z, r: 68, color: syn > 0 ? '#63b3ed' : '#68d391', life: 0.45, maxLife: 0.45 });
    burst(tgt.x, tgt.z, '#9ae6b4', 18);
    for (const e of enemies) {
      if (Math.hypot(e.x - tgt.x, e.z - tgt.z) <= 68 + e.w / 2) {
        damageEnemy(e, st.atk * (1.9 + lv * 0.45) * (1 + syn * 0.25), syn > 0);
        if (syn > 0) e.slowT = 2.5;
      }
    }
  } else if (k === 'snipe') {
    const syn = skillLv('syn_headshot');
    const tgt = findNearest(220);
    if (tgt) {
      player.angle = Math.atan2(tgt.z - player.z, tgt.x - player.x);
      effects.push({ type: 'chain', pts: [{ x: player.x, z: player.z }, { x: tgt.x, z: tgt.z }], x: player.x, z: player.z, r: 0, color: '#ffd700', life: 0.3, maxLife: 0.3 });
      damageEnemy(tgt, st.atk * (2.5 + lv * 0.6) * (1 + syn * 0.3), true);
      addShake(3);
    }
  } else if (k === 'frostshot') {
    const tgt = findNearest(180);
    if (tgt) player.angle = Math.atan2(tgt.z - player.z, tgt.x - player.x);
    effects.push({ type: 'arc', x: player.x, z: player.z, r: 95, a: player.angle, color: '#9be7ff', life: 0.35, maxLife: 0.35 });
    for (const e of enemies) {
      if (Math.hypot(e.x - player.x, e.z - player.z) <= 95 + e.w / 2) {
        damageEnemy(e, st.atk * (1.5 + lv * 0.35), false);
        e.slowT = 2.5 + lv * 0.5;
      }
    }
  } else if (k === 'backflip') {
    const syn = skillLv('syn_windstep');
    const tgt = findNearest(160);
    if (tgt) player.angle = Math.atan2(tgt.z - player.z, tgt.x - player.x);
    player.x -= Math.cos(player.angle) * 32;
    player.z -= Math.sin(player.angle) * 32;
    player.invuln = Math.max(player.invuln, 0.35);
    effects.push({ type: 'ring', x: player.x, z: player.z, r: 58, color: '#90cdf4', life: 0.35, maxLife: 0.35 });
    for (const e of enemies) {
      if (Math.hypot(e.x - player.x, e.z - player.z) <= 58 + e.w / 2) {
        damageEnemy(e, st.atk * (1.4 + lv * 0.35), false);
        if (syn > 0) e.slowT = 3.0;
      }
    }
  } else if (k === 'quake') {
    const syn = Math.max(skillLv('syn_aftershock'), skillLv('syn_cataclysm'));
    const currentY = typeof playerHeightY === 'number' ? playerHeightY : 0;
    const gravityBonusMult = 1.0 + (currentY * 0.4);
    const r = (95 + lv * 8) * (1.0 + currentY * 0.15) * (1 + syn * 0.12);
    effects.push({ type: 'quake', x: player.x, z: player.z, r, color: currentY > 1 || syn > 0 ? '#e53e3e' : '#ed8936', life: 0.9, maxLife: 0.9 });
    burst(player.x, player.z, '#a0723a', Math.round(28 * gravityBonusMult));
    burst(player.x, player.z, '#e2c58a', 16);
    setShake(Math.max(9, 9 + currentY * 3));
    for (const e of enemies) {
      const dx = e.x - player.x, dz = e.z - player.z, d = Math.max(1, Math.hypot(dx, dz));
      if (d <= r) {
        damageEnemy(e, st.atk * (1.6 + lv * 0.4) * gravityBonusMult * (1 + syn * 0.25), true);
        e.x += (dx / d) * (e.isBoss ? 8 : 26) * (1 + currentY * 0.2);
        e.z += (dz / d) * (e.isBoss ? 8 : 26) * (1 + currentY * 0.2);
      }
    }
  } else if (k === 'heal') {
    const syn = skillLv('syn_sanctuary');
    const amount = player.maxHp * (0.25 + lv * 0.05);
    player.hp = Math.min(player.maxHp, player.hp + amount);
    if (syn > 0) player.shield = Math.max(player.shield, 1 + syn * 0.4);
    addFloatText(player.x, player.z, `+${Math.round(amount)}`, '#68d391');
    effects.push({ type: 'heal', x: player.x, z: player.z, r: 20, color: '#68d391', life: 1.0, maxLife: 1.0 });
    for (let i = 0; i < 18; i++) spawnPart(player.x + (Math.random() - 0.5) * 24, player.z + (Math.random() - 0.5) * 24, 0, 0, 0, 40 + Math.random() * 40, 0.9, '#9ae6b4', 20);
  } else if (k === 'rage') {
    const syn = skillLv('syn_unstoppable');
    player.rage = 5.5 + lv * 0.6;
    if (syn > 0) player.shield = Math.max(player.shield, 1.5 + syn * 0.3);
    addFloatText(player.x, player.z, 'RAGE !', '#fc8181');
    effects.push({ type: 'rage', x: player.x, z: player.z, r: 20, color: '#ff5a1f', life: player.rage, maxLife: player.rage });
    effects.push({ type: 'ring', x: player.x, z: player.z, r: 50, color: '#ff4040', life: 0.4, maxLife: 0.4 });
    burst(player.x, player.z, '#e53e3e', 20); addShake(4);
  } else if (k === 'chain') {
    const syn = skillLv('syn_overcharge');
    const pts = Array.of({ x: player.x, z: player.z }), hit = new Set();
    let from = { x: player.x, z: player.z };
    for (let i = 0; i < 4 + lv; i++) {
      let best = null, bd = i === 0 ? 170 : 130;
      for (const e of enemies) {
        if (hit.has(e)) continue;
        const d = Math.hypot(e.x - from.x, e.z - from.z);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      hit.add(best); pts.push({ x: best.x, z: best.z });
      damageEnemy(best, st.atk * (2.2 + lv * 0.4) * (1 + syn * 0.2) * Math.pow(0.85, i), true);
      if (syn > 0) best.slowT = 1.5;
      burst(best.x, best.z, '#7fd0ff', 6);
      from = best;
    }
    effects.push({ type: 'chain', pts, x: player.x, z: player.z, r: 0, color: '#9be7ff', life: 0.45, maxLife: 0.45 });
    addShake(2);
  } else if (k === 'frost') {
    const syn = skillLv('syn_shatter');
    const r = 85 + lv * 8;
    effects.push({ type: 'frost', x: player.x, z: player.z, r, color: '#9be7ff', life: 0.8, maxLife: 0.8 });
    burst(player.x, player.z, '#bee3f8', 24);
    for (const e of enemies) {
      if (Math.hypot(e.x - player.x, e.z - player.z) <= r + e.w / 2) {
        damageEnemy(e, st.atk * (1.2 + lv * 0.3) * (1 + syn * 0.3), syn > 0);
        e.slowT = 3 + lv * 0.5;
      }
    }
  } else if (k === 'shield') {
    const syn = skillLv('syn_mirage');
    player.shield = 2 + lv * 0.5;
    effects.push({ type: 'shield', x: player.x, z: player.z, r: 20, color: '#63b3ed', life: player.shield, maxLife: player.shield });
    if (syn > 0) {
      effects.push({ type: 'ring', x: player.x, z: player.z, r: 52, color: '#b794f4', life: 0.35, maxLife: 0.35 });
      for (const e of enemies) if (Math.hypot(e.x - player.x, e.z - player.z) <= 52) damageEnemy(e, st.atk * (1.2 + syn * 0.4), true);
    }
  }
}
    function setSk(id, icon, cd) {
  const el = $(id);
  el.children.item(1).textContent = icon;
  const o = el.children.item(2);
  o.style.display = cd > 0 ? 'block' : 'none';
  o.textContent = cd.toFixed(1);
}
function updateSkillBar() {
  $('skillbar').style.display = gameState === 'COMBAT' ? 'flex' : 'none';
  if (gameState !== 'COMBAT') return;
  setSk('sk-d', '💨', dashCd);
  Array.of('e', 'r', 'c').forEach((s) => {
    const k = Reflect.get(save.slots, s);
    setSk(`sk-${s}`, k ? SKILLS.get(k).i : '🔒', k ? Reflect.get(skillCd, s) : 0);
  });
}

function setCampTab(tab) { setCampTabValue(tab); renderCamp(); }
function setPact(pactId) { save.pact = pactId; persist(); renderCamp(); renderStargateUI(); }

function statLines(it) {
  let h = '';
  const eqCur = getItem(Reflect.get(save.eq, it.slot));
  const compare = eqCur && eqCur.id !== it.id && eqCur.slot === it.slot;
  for (const k in it.st) {
    const d = STAT.get(k);
    const val = statVal(it, k);
    let diffHtml = '';
    if (compare) {
      const delta = val - statVal(eqCur, k);
      if (delta !== 0) {
        const sign = delta > 0 ? '+' : '';
        const col = delta > 0 ? '#68d391' : '#fc8181';
        diffHtml = ` <span style="color:${col}">(${sign}${delta}${d.u})</span>`;
      }
    }
    h += `<div>+${val}${d.u} ${d.n}${diffHtml}</div>`;
  }
  if (it.slot === 'weapon') h += `<div style="color:#a0aec0">Portée ${it.rg} · ${(1 / it.rt).toFixed(1)} coups/s</div>`;
  if (it.leg) h += `<div style="color:#ed8936">★ ${LEG.find((l) => l.k === it.leg).d}</div>`;
  return h;
}

let activeSecretTab = 0;
let stashView = 'normal';

function setStashView(view) {
  stashView = view;
  renderCamp();
}

function setSecretTab(idx) {
  activeSecretTab = idx;
  renderCamp();
}

function toggleAutoSellJunk() {
  save.autoSellJunk = !save.autoSellJunk;
  persist();
  renderCamp();
  showToast(save.autoSellJunk ? '💰 Vente automatique activée en fin de run !' : '📦 Vente automatique désactivée.');
}

function handleChestItemClick(id) {
  if (campTab === 'merchant') {
    const it = getItem(id);
    if (!it) return;
    selId = id;
    if (!isEquipped(it) && !it.locked) {
      toggleCart(id);
      return;
    }
  }
  selectItem(id);
}

function renderSecretChestControls() {
  const t = save.secretChest[activeSecretTab];
  const aff1 = (t.affixes && t.affixes[0]) || '';
  const aff2 = (t.affixes && t.affixes[1]) || '';
  const buildAffOpts = (cur) => `<option value="">Aucun</option>` + Array.from(STAT.keys()).map((k) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${STAT.get(k).n}</option>`).join('');
  const rarityOptions = RAR.map((r, idx) => `<option value="${idx}" ${Number(t.minRarity) === idx ? 'selected' : ''}>${r.n}</option>`).join('');

  let tabsHtml = `<div style="display:flex;gap:5px;margin-bottom:8px;align-items:center;">`;
  save.secretChest.forEach((tab, idx) => {
    tabsHtml += `<button class="btn mini ${idx === activeSecretTab ? 'sel' : ''}" style="flex:1;text-align:center;" onclick="setSecretTab(${idx})">${tab.name} (${tab.items.length})</button>`;
  });
  tabsHtml += `<button class="btn mini green-action" onclick="autoSortLoot()" title="Trier l'inventaire vers les 3 onglets">TRIER AUTO</button></div>`;

  return `
    ${tabsHtml}
    <div style="background:#181d26;border:1px solid #384152;padding:7px 8px;border-radius:4px;margin-bottom:8px;font-size:13px;display:grid;grid-template-columns:1fr 1fr 1fr 72px;gap:6px;">
      <div>
        <label style="color:#94a3b8;">Affixe 1</label>
        <select style="background:#0b0d12;color:#fff;border:1px solid #384152;width:100%;font-size:14px;" onchange="updateSecretConfig(${activeSecretTab}, 'affix1', this.value)">
          ${buildAffOpts(aff1)}
        </select>
      </div>
      <div>
        <label style="color:#94a3b8;">Affixe 2</label>
        <select style="background:#0b0d12;color:#fff;border:1px solid #384152;width:100%;font-size:14px;" onchange="updateSecretConfig(${activeSecretTab}, 'affix2', this.value)">
          ${buildAffOpts(aff2)}
        </select>
      </div>
      <div>
        <label style="color:#94a3b8;">Rareté Min</label>
        <select style="background:#0b0d12;color:#fff;border:1px solid #384152;width:100%;font-size:14px;" onchange="updateSecretConfig(${activeSecretTab}, 'minRarity', this.value)">
          ${rarityOptions}
        </select>
      </div>
      <div>
        <label style="color:#94a3b8;">IV Min %</label>
        <input type="number" min="0" max="100" value="${t.minIv}" style="background:#0b0d12;color:#e2b740;font-weight:bold;border:1px solid #384152;width:100%;text-align:center;font-size:14px;" onchange="updateSecretConfig(${activeSecretTab}, 'minIv', this.value)">
      </div>
    </div>
  `;
}

function upgradePreviewLines(it) {
  let h = '';
  for (const k in it.st) {
    const d = STAT.get(k);
    const cur = statVal(it, k);
    const next = Math.round(Reflect.get(it.st, k) * (1 + 0.1 * (it.lvl + 1)));
    h += `<div>${d.n} : <span style="color:#a0aec0">${cur}${d.u}</span> → <b style="color:#48bb78">${next}${d.u}</b></div>`;
  }
  return h;
}

function renderRightPane(st) {
  const pane = $('right-pane');
  if (campTab === 'merchant') {
    let cartGold = 0, cartCount = 0;
    sellCart.forEach((id) => { const it = getItem(id); if (it && !isEquipped(it) && !isInSecretChest(id)) { cartGold += sellValue(it); cartCount++; } });
    let filterBtns = '';
    Array.of(0, 1, 2).forEach((idx) => {
      const r = RAR.at(idx);
      filterBtns += `<button class="rar-filter nav-item" style="border-color:${r.c};color:${r.c}" onclick="addRarityToCart(${idx})" title="Ajouter ${r.n}">${r.code}</button>`;
    });
    const it = getItem(selId);
    let selHtml = '<div style="color:#94a3b8;font-size:15px;">Clique sur un objet du coffre à droite pour l\'ajouter ou le retirer du panier.</div>';
    if (it) {
      const eqd = isEquipped(it), inCart = sellCart.has(it.id);
      selHtml = `<b style="color:${RAR.at(it.r).c};font-size:18px">${it.name.toUpperCase()} +${it.lvl}</b> <span style="color:#e2b740">(+${sellValue(it)} OR)</span>${statLines(it)}
        <div style="margin-top:6px"><button class="btn nav-item" ${eqd ? 'disabled' : ''} onclick="toggleCart(${it.id})">${eqd ? 'ÉQUIPÉ' : (inCart ? 'RETIRER DU PANIER' : 'AJOUTER AU PANIER')}</button></div>`;
    }
    save.inv.forEach((it) => { if (it.locked && sellCart.has(it.id)) sellCart.delete(it.id); });

    pane.innerHTML = `<h3>MARCHAND — COMPTOIR</h3>
      <div style="background:#181d26;border:1px solid #384152;padding:10px;border-radius:4px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:18px;margin-bottom:8px;">
          <span>PANIER : <b>${cartCount}</b> OBJ.</span>
          <span class="gold-text">+${cartGold} OR</span>
        </div>
        <div class="row" style="margin-bottom:8px;align-items:center;">
          ${filterBtns}
          <button class="btn nav-item mini" onclick="addAllSurplusToCart()">SURPLUS</button>
          <button class="btn nav-item mini" ${cartCount === 0 ? 'disabled' : ''} onclick="sellCart.clear(); renderCamp();">VIDER</button>
        </div>
        <button class="btn nav-item green-action" style="width:100%;text-align:center;" ${cartCount === 0 ? 'disabled' : ''} onclick="confirmSellCart()">VENDRE TOUT (+${cartGold} OR)</button>
      </div>
      <div style="background:#181d26;border:1px solid #384152;padding:8px 10px;border-radius:4px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:15px;color:#e2b740;font-weight:bold;">VENTE AUTO FIN DE RUN</div>
          <div style="font-size:12px;color:#94a3b8;">Vend auto ce qui ne va pas au Coffre Secret</div>
        </div>
        <button class="btn mini ${save.autoSellJunk ? 'sel' : ''}" onclick="toggleAutoSellJunk()">${save.autoSellJunk ? '✔ ACTIVÉE' : 'OFF'}</button>
      </div>
      <div id="detail">${selHtml}</div>`;
    return;
  }

  const it = getItem(selId);
  const inSec = it ? isInSecretChest(it.id) : false;
  let anvilHtml = `
    <div class="anvil-wrap">
      <div class="anvil-slot" style="border-color:#384152;opacity:0.5;"><span>—</span></div>
      <div style="color:#94a3b8;font-size:15px;margin-top:6px;">Clique sur un objet équipé, du Coffre ou du Coffre Secret pour le forger.</div>
    </div>`;

  if (it) {
    const eqd = isEquipped(it), maxed = it.lvl >= 10;
    const rCol = RAR.at(it.r).c;
    const leftActionBtn = inSec
      ? `<button class="btn nav-item mini" onclick="withdrawSecretItem(${activeSecretTab}, ${it.id})">RETIRER</button>`
      : `<button class="btn nav-item mini" ${eqd ? 'disabled' : ''} onclick="equipItem(${it.id})">${eqd ? 'ÉQUIPÉ' : 'ÉQUIPER'}</button>`;
    const rightActionBtn = inSec
      ? `<span style="font-size:13px;color:#63b3ed;">🔒 SECRET</span>`
      : `<button class="btn nav-item mini" ${eqd ? 'disabled' : ''} onclick="setCampTab('merchant'); if(!isEquipped(getItem(${it.id}))) sellCart.add(${it.id}); renderCamp();">VENDRE</button>`;

    anvilHtml = `
      <div class="anvil-wrap">
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
          ${leftActionBtn}
          <div class="anvil-slot" style="border-color:${rCol};box-shadow:0 0 12px ${rCol}44;">
            ${SLOT_ICON.get(it.slot)}
            <small>+${it.lvl}</small>
          </div>
          ${rightActionBtn}
        </div>
        <div style="margin-top:6px;"><b style="color:${rCol};font-size:18px;">${it.name.toUpperCase()} +${it.lvl}</b> <span style="color:#94a3b8">(${RAR.at(it.r).n})</span></div>
        <div style="font-size:15px;margin-top:4px;text-align:left;background:#10141c;padding:6px;border:1px solid #384152;border-radius:4px;">
          ${maxed ? statLines(it) : upgradePreviewLines(it)}
          ${it.leg ? `<div style="color:#ed8936;margin-top:2px;">★ ${LEG.find((l) => l.k === it.leg).d}</div>` : ''}
        </div>
        <div class="row" style="margin-top:8px;">
          <button class="btn nav-item green-action" ${maxed || save.gold < upgCost(it) ? 'disabled' : ''} onclick="upgradeItem(${it.id})">${maxed ? 'NIVEAU MAX' : 'FORGER +1 (' + upgCost(it) + ' OR)'}</button>
          <button class="btn nav-item" ${save.gold < rerollCost(it) ? 'disabled' : ''} onclick="rerollItem(${it.id})">RELANCER (${rerollCost(it)} OR)</button>
        </div>
      </div>`;
  }

  let fuseHtml = '<div style="background:#181d26;border:1px solid #384152;border-radius:4px;padding:7px;margin-bottom:8px;"><div style="font-size:15px;color:#e2b740;margin-bottom:5px;">FUSION DE RARETÉ (4 → 1)</div><div class="row">';
  for (let r = 0; r < RAR.length - 1; r++) {
    const cnt = fusionCandidates(r).length;
    const ok = cnt >= 4;
    fuseHtml += `<button class="btn nav-item mini" style="border-color:${RAR.at(r).c};color:${ok ? RAR.at(r + 1).c : '#94a3b8'}" ${ok ? '' : 'disabled'} onclick="fuseFour(${r})">4×${RAR.at(r).code}→${RAR.at(r + 1).code} (${cnt}/4)</button>`;
  }
  fuseHtml += '</div></div>';

  pane.innerHTML = `<h3>FORGERON & ENCLUME</h3>
    ${anvilHtml}
    ${fuseHtml}
    <div class="row">
      <button class="btn nav-item" onclick="setCampTab('merchant')">ALLER AU MARCHAND 💰</button>
    </div>`;
}

let draggedItemId = null;
function onDragItem(ev, id) {
  draggedItemId = id;
  if (ev.dataTransfer) ev.dataTransfer.setData('text/plain', String(id));
}
function onDropEquip(ev, targetSlot) {
  ev.preventDefault();
  const id = draggedItemId || Number(ev.dataTransfer && ev.dataTransfer.getData('text/plain'));
  const it = getItem(id);
  if (!it) return;
  if (targetSlot && it.slot !== targetSlot) {
    showToast(`Cet emplacement requiert : ${SLOT_NAME.get(targetSlot).toUpperCase()}`);
    return;
  }
  equipItem(it.id);
}
function toggleEquipItem(id) {
  const it = getItem(id);
  if (!it) return;
  if (isEquipped(it)) {
    Reflect.set(save.eq, it.slot, null);
    persist(); renderCamp();
    showToast(`${it.name} déséquipé.`);
  } else {
    equipItem(id);
    showToast(`${it.name} équipé !`);
  }
}
function showItemTooltip(ev, id) {
  const it = getItem(id);
  const tip = $('item-tooltip');
  if (!it || !tip) return;
  const rObj = RAR.at(it.r);
  const eqd = isEquipped(it);
  const eqCur = getItem(Reflect.get(save.eq, it.slot));
  const compare = eqCur && eqCur.id !== it.id;
  const sets = computeSetBonuses();
  const setNames = ['Aucun', 'Set Vitesse', 'Set Vol de Vie', 'Set Critique', 'Set Souverain'];
  const setCount = sets.counts[it.r] || 0;
  let statsHtml = '';
  for (const k in it.st) {
    const d = STAT.get(k);
    const val = statVal(it, k);
    let diff = '';
    if (compare) {
      const delta = val - statVal(eqCur, k);
      if (delta !== 0) {
        const col = delta > 0 ? '#48bb78' : '#f56565';
        diff = ` <b style="color:${col}">(${delta > 0 ? '+' : ''}${delta}${d.u})</b>`;
      }
    }
    statsHtml += `<div class="tt-stat"><span>+${val}${d.u} ${d.n}</span><span>${diff}</span></div>`;
  }
  if (it.slot === 'weapon') {
    statsHtml += `<div style="color:#94a3b8;font-size:13px;margin-top:2px;">Portée ${it.rg} · ${(1 / it.rt).toFixed(1)} coups/s</div>`;
  }
  if (it.leg) {
    statsHtml += `<div style="color:#ed8936;font-size:13px;margin-top:4px;">★ ${LEG.find((l) => l.k === it.leg).d}</div>`;
  }
  tip.style.borderColor = rObj.c;
  const ivDisplay = it.iv !== undefined ? `<span style="color:#63b3ed;margin-left:8px;">IV ${it.iv}%</span>` : '';
  tip.innerHTML = `<div class="tt-head" style="color:${rObj.c}">${it.name.toUpperCase()} ${it.lvl > 0 ? '+' + it.lvl : ''}</div>
    <div class="tt-sub">
      <span>${SLOT_NAME.get(it.slot).toUpperCase()} · ${rObj.n.toUpperCase()}${ivDisplay}</span>
      <span style="color:#e2b740;">PUISSANCE ${Math.round(score(it))}</span>
    </div>
    ${statsHtml}
    ${it.r > 0 ? `<div class="tt-set">Ensemble : ${setNames[it.r]} (${setCount}/4)</div>` : ''}
    <div class="tt-foot">[Clic gauche] Sélectionner · [Clic droit] ${eqd ? 'Déséquiper' : 'Équiper'}</div>`;
  tip.style.display = 'block';
  moveItemTooltip(ev);
}
function moveItemTooltip(ev) {
  const tip = $('item-tooltip');
  if (!tip || tip.style.display !== 'block') return;
  const pad = 14;
  let x = ev.clientX + pad;
  let y = ev.clientY + pad;
  const rect = tip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 8) x = ev.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - pad;
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}
function hideItemTooltip() {
  const tip = $('item-tooltip');
  if (tip) tip.style.display = 'none';
}
function renderHeroSkillsRow() {
  const st = getStats(false);
  const wItem = getItem(save.eq.weapon);
  const passifDesc = wItem && wItem.leg
    ? LEG.find((l) => l.k === wItem.leg).d
    : `Attaque automatique avec ${wItem ? wItem.name : 'tes poings'} (${(1 / st.atkRate).toFixed(1)} coups/s).`;
  const slotsData = [
    { key: 'AUTO', icon: '⚔️', name: 'ATTAQUE AUTO', cd: `${st.atkRate.toFixed(2)} S DE RECHARGE`, desc: passifDesc },
    { key: 'ESP', icon: '💨', name: 'ESQUIVE', cd: `${st.dashMaxCd.toFixed(1)} S DE RECHARGE`, desc: 'Propulse le héros et octroie une brève invulnérabilité.' }
  ];
  Array.of('e', 'r', 'c').forEach((s) => {
    const k = Reflect.get(save.slots, s);
    if (k) {
      const sk = SKILLS.get(k);
      const lv = skillLv(k);
      slotsData.push({ key: s.toUpperCase(), icon: sk.i, name: `${sk.n.toUpperCase()} (NIV ${lv})`, cd: `${sk.cd} S DE RECHARGE`, desc: sk.d });
    } else {
      slotsData.push({ key: s.toUpperCase(), icon: '🔒', name: 'EMPLACEMENT VIDE', cd: 'NON DÉBLOQUÉ', desc: "Débloque une compétence dans l'onglet Compétences [E]." });
    }
  });
  $('hero-skills-row').innerHTML = slotsData.map((sl) => `<div class="h-sk" onclick="openConstellation();"><b>${sl.key}</b><span>${sl.icon}</span><div class="h-sk-tip"><div class="sk-t-name">${sl.name}</div><div class="sk-t-cd">${sl.cd}</div><div class="sk-t-desc">${sl.desc}</div></div></div>`).join('');
}
function renderHeroEquipSlots() {
  const leftSlots = Array.of('helm', 'armor', 'legs', 'boots');
  const buildSlotHtml = (slotKey) => {
    const it = getItem(Reflect.get(save.eq, slotKey));
    const lbl = SLOT_NAME.get(slotKey).toUpperCase();
    if (it) {
      const rCol = RAR.at(it.r).c;
      const onSel = it.id === selId ? 'on' : '';
      return `<div class="eq-float-slot ${onSel}" style="border-color:${rCol};box-shadow:0 0 10px ${rCol}44" draggable="true" ondragstart="onDragItem(event, ${it.id})" ondragover="event.preventDefault()" ondrop="onDropEquip(event, '${slotKey}')" onclick="selectItem(${it.id})" oncontextmenu="event.preventDefault(); toggleEquipItem(${it.id});" onmouseenter="showItemTooltip(event, ${it.id})" onmousemove="moveItemTooltip(event)" onmouseleave="hideItemTooltip()">${SLOT_ICON.get(slotKey)}<small>${it.lvl > 0 ? '+' + it.lvl : lbl}</small></div>`;
    }
    return `<div class="eq-float-slot empty" title="${lbl}" ondragover="event.preventDefault()" ondrop="onDropEquip(event, '${slotKey}')">${SLOT_ICON.get(slotKey)}<small>${lbl}</small></div>`;
  };
  $('eq-col-left').innerHTML = leftSlots.map(buildSlotHtml).join('');
  $('eq-col-right').innerHTML = buildSlotHtml('weapon') + buildSlotHtml('charm');
}
function renderCamp() {
  look = lookColors();
  if ($('hud-gold')) $('hud-gold').textContent = `OR : ${save.gold}`;
  if ($('top-gold-val')) $('top-gold-val').textContent = `OR : ${save.gold}`;
  updateTopNav();
  const isMerchant = campTab === 'merchant';
  if ($('hero-panel')) $('hero-panel').style.display = isMerchant ? 'none' : 'flex';
  if ($('stash-tabs-bar')) {
    $('tab-stash-secret').style.display = isMerchant ? 'none' : 'inline-block';
    if (isMerchant && stashView === 'secret') stashView = 'normal';
    $('tab-stash-normal').classList.toggle('active', stashView === 'normal');
    $('tab-stash-secret').classList.toggle('active', stashView === 'secret');
  }
  if ($('btn-stash-auto')) $('btn-stash-auto').style.display = (!isMerchant && stashView === 'normal') ? 'inline-block' : 'none';
  if ($('btn-stash-sort')) $('btn-stash-sort').style.display = stashView === 'normal' ? 'inline-block' : 'none';
  const st = getStats(false);
  if (!isMerchant) {
    $('hero-power-val').textContent = `${st.power}`;
    renderHeroSkillsRow();
    renderHeroEquipSlots();
    const totalLeech = Math.round(st.leechPct + (st.legs.has('vamp') ? 8 : 0));
    const armorPct = Math.round((1 - 100 / (100 + Math.max(0, st.def))) * 100);
    $('hero-stats-2col').innerHTML = `<div class="stat-col-box"><div class="stat-col-title">ATTAQUE</div><div class="stat-line"><span class="stat-lbl"><i style="background:#f56565"></i>DÉGÂTS</span><span class="stat-val">${Math.round(st.atk)}</span></div><div class="stat-line"><span class="stat-lbl"><i style="background:#ed8936"></i>VIT. ATTAQUE</span><span class="stat-val">${(1 / st.atkRate).toFixed(2)}/s</span></div><div class="stat-line"><span class="stat-lbl"><i style="background:#e2b740"></i>CRITIQUE</span><span class="stat-val">${Math.round(st.crit)}%</span></div></div><div class="stat-col-box"><div class="stat-col-title">DÉFENSE</div><div class="stat-line"><span class="stat-lbl"><i style="background:#48bb78"></i>PV MAX</span><span class="stat-val">${st.maxHP}</span></div><div class="stat-line"><span class="stat-lbl"><i style="background:#63b3ed"></i>ARMURE</span><span class="stat-val">${st.def} (-${armorPct}%)</span></div><div class="stat-line"><span class="stat-lbl"><i style="background:#9f7aea"></i>VOL DE VIE</span><span class="stat-val">${totalLeech}%</span></div></div>`;
  }
  $('inv-count-lbl').textContent = `${save.inv.length}/40`;
  const secretCtrl = $('stash-secret-controls');
  let invHtml = '';
  if (stashView === 'secret' && !isMerchant) {
    if (secretCtrl) {
      secretCtrl.style.display = 'block';
      secretCtrl.innerHTML = renderSecretChestControls();
    }
    const secTab = save.secretChest[activeSecretTab];
    for (let i = 0; i < 40; i++) {
      const it = secTab.items[i];
      if (it) {
        const onSel = it.id === selId ? 'on' : '';
        const rCol = RAR.at(it.r).c;
        invHtml += `<button class="slot nav-item ${onSel}" style="border-color:${rCol};box-shadow:0 0 8px ${rCol}33" onclick="selectItem(${it.id})" oncontextmenu="event.preventDefault(); withdrawSecretItem(${activeSecretTab}, ${it.id});" onmouseenter="showItemTooltip(event, ${it.id})" onmousemove="moveItemTooltip(event)" onmouseleave="hideItemTooltip()">${SLOT_ICON.get(it.slot)}<small>🔒${it.lvl > 0 ? '+' + it.lvl : ''}</small></button>`;
      } else {
        invHtml += `<div class="slot empty-slot"></div>`;
      }
    }
  } else {
    if (secretCtrl) secretCtrl.style.display = 'none';
    for (let i = 0; i < 40; i++) {
      const it = save.inv.at(i);
      if (it) {
        const onSel = it.id === selId ? 'on' : '';
        const inCart = sellCart.has(it.id) ? 'in-cart' : '';
        const rCol = RAR.at(it.r).c;
        invHtml += `<button class="slot nav-item ${onSel} ${inCart}" style="border-color:${rCol};box-shadow:0 0 8px ${rCol}33" draggable="true" ondragstart="onDragItem(event, ${it.id})" onclick="handleChestItemClick(${it.id})" oncontextmenu="event.preventDefault(); toggleEquipItem(${it.id});" onmouseenter="showItemTooltip(event, ${it.id})" onmousemove="moveItemTooltip(event)" onmouseleave="hideItemTooltip()">${SLOT_ICON.get(it.slot)}<small>${isEquipped(it) ? '✔' : ''}${it.lvl > 0 ? '+' + it.lvl : ''}</small></button>`;
      } else {
        invHtml += `<div class="slot empty-slot"></div>`;
}
}
}
$('inv').innerHTML = invHtml;
$('right-pane').style.display = 'block';
renderRightPane(st);
}
function applyLockedTreeToSave(cat) {
  const snap = save.lockedTrees && save.lockedTrees[cat];
  if (!snap) return false;
  Object.keys(save.skills).forEach((k) => { save.skills[k] = 0; });
  Object.assign(save.skills, snap.skills || {});
  save.slots = { e: null, r: null, c: null, ...(snap.slots || {}) };
  return true;
}

function equipItem(id) {
  const it = getItem(id);
  if (!it) return;
  sellCart.delete(id);

  if (it.slot === 'weapon') {
    const oldWeapon = getItem(save.eq.weapon);
    const oldCat = getWeaponCategory(oldWeapon);
    const newCat = getWeaponCategory(it);

    if (oldCat !== newCat) {
      // Save current snapshot if old category is locked
      if (isTreeLocked(oldCat)) {
        save.lockedTrees[oldCat] = { skills: { ...save.skills }, slots: { ...save.slots } };
      }

      // If the new weapon already has a locked skillset, load it automatically with no prompt!
      if (isTreeLocked(newCat)) {
        applyLockedTreeToSave(newCat);
        Reflect.set(save.eq, it.slot, id);
        persist();
        renderCamp();
        showToast(`🔒 Set verrouillé chargé pour : ${newCat.toUpperCase()} !`);
        return;
      }

      // Otherwise, if the player has spent points, ask whether to lock or reassign
      const spentGold = computeSpentSkillGold();
      if (spentGold > 0) {
        pendingWeaponSwapId = id;
        $('wt-modal-desc').innerHTML = `Tu passes de <b>${oldCat.toUpperCase()}</b> à <b style="color:#e2b740;">${newCat.toUpperCase()}</b> (aucun verrou actif sur ${newCat.toUpperCase()}).<br>Tu as <b class="gold-text">${spentGold} OR</b> investis dans ta Constellation actuelle :`;
        $('weapon-tree-modal').style.display = 'flex';
        return;
      }
    }
  }

  Reflect.set(save.eq, it.slot, id);
  persist();
  renderCamp();
}

function resolveWeaponSwap(choice) {
  $('weapon-tree-modal').style.display = 'none';
  const id = pendingWeaponSwapId;
  pendingWeaponSwapId = null;
  if (choice === 'cancel' || !id) return;

  const it = getItem(id);
  if (!it) return;
  const oldCat = getWeaponCategory(getItem(save.eq.weapon));
  const newCat = getWeaponCategory(it);
  if (!save.lockedTrees) save.lockedTrees = {};

  if (choice === 'lock_prev_and_refund') {
    save.lockedTrees[oldCat] = { skills: { ...save.skills }, slots: { ...save.slots } };
    const refund = computeSpentSkillGold();
    save.gold += refund;
    Object.keys(save.skills).forEach((k) => { save.skills[k] = 0; });
    save.slots = { e: null, r: null, c: null };
    showToast(`🔒 ${oldCat.toUpperCase()} verrouillé · +${refund} OR remboursés pour ${newCat.toUpperCase()} !`, 3500);
  } else if (choice === 'refund_only') {
    const refund = computeSpentSkillGold();
    save.gold += refund;
    Object.keys(save.skills).forEach((k) => { save.skills[k] = 0; });
    save.slots = { e: null, r: null, c: null };
    showToast(`♻️ Compétences réinitialisées (+${refund} OR remboursés) !`, 3000);
  } else if (choice === 'keep_and_lock_new') {
    save.lockedTrees[newCat] = { skills: { ...save.skills }, slots: { ...save.slots } };
    showToast(`📌 Compétences conservées et verrouillées sur ${newCat.toUpperCase()} !`, 3200);
  }

  Reflect.set(save.eq, it.slot, id);
  persist();
  renderCamp();
}

function lootSummary() {
  if (runItems.length === 0) return '';
  let best = 0;
  runItems.forEach((it) => { if (it.r > best) best = it.r; });
  return ` Butin : ${runItems.length} objets (meilleur : ${RAR.at(best).n}).`;
}

const DHD_MODES = [
  { mode: 'arena', label: 'TERRE', sym: '☉', env: 1 },
  { mode: 'bridge', label: 'PONT', sym: '🌉', env: 4, vortexHex: 0x3182ce, rippleHex: 0x90cdf4, chevHex: 0x63b3ed },
  { mode: 'endless', label: 'INFINI', sym: '∞', env: 3, vortexHex: 0x805ad5, rippleHex: 0xd6bcfa, chevHex: 0xb794f4 }
];
const LAND_VORTEX_COLORS = [
  { vortexHex: 0x2f855a, rippleHex: 0x9ae6b4, chevHex: 0x68d391 },
  { vortexHex: 0xb7791f, rippleHex: 0xfbd38d, chevHex: 0xf6ad55 },
  { vortexHex: 0x2b6cb0, rippleHex: 0xbee3f8, chevHex: 0x63b3ed }
];

function getActivePortalTheme() {
  const m = DHD_MODES[dhdModeIdx];
  if (m.mode === 'arena') return LAND_VORTEX_COLORS[Math.max(0, Math.min(2, save.landSel - 1))];
  return m;
}

let gateDialing = false;
let dhdActiveRing = 0;
let dhdModeIdx = 0;
let dhdOuterTarget = 0, dhdInnerTarget = 0;
let dhdHandAnim = 0;
let gateChev1 = null, gateChev2 = null, gateTargetYaw = 0, gateOpen = false, gateReadyMode = null;
let selectedCampTheme = save.worldTheme || 'land1';

function resolveWorldThemeKey(mode, landIdx) {
  if (mode === 'arena' && landIdx === 1) return 'sakura';
  if (mode === 'arena' && landIdx === 2) return 'land2';
  if (mode === 'arena' && landIdx === 3) return 'land3';
  return mode === 'arena' ? `land${landIdx}` : mode;
}
function setCampThemeSelection(themeKey) {
  const validKeys = ['land1', 'sakura', 'land2', 'land3', 'endless', 'bridge'];
  selectedCampTheme = validKeys.includes(themeKey) ? themeKey : 'land1';
  save.worldTheme = selectedCampTheme;
  setActiveWorldTheme(selectedCampTheme);
  persist();
  if (gameState === 'CAMP') {
    applyCampTheme(selectedCampTheme);
  }
}
function syncThemeButtonLabel() {
  const btn = $('theme-btn');
  const activeKey = selectedCampTheme || 'land1';
  if (btn) {
    btn.textContent = `THÈME : ${activeKey.toUpperCase()}`;
    btn.dataset.theme = activeKey;
  }
}
function cycleCampTheme() {
  const order = ['land1', 'sakura', 'land2', 'land3'];
  const idx = order.indexOf(selectedCampTheme);
  const next = order[idx >= 0 ? (idx + 1) % order.length : 0];
  setCampThemeSelection(next);
  syncThemeButtonLabel();
  showToast(`Thème actif : ${next.toUpperCase()}`);
}
function resetStargateDial() {
  gateChev1 = null;
  gateChev2 = null;
  gateOpen = false;
  gateReadyMode = null;
  gateTargetYaw = 0;
  dhdOuterTarget = 0;
  dhdInnerTarget = 0;
  selectedCampTheme = 'land1';
  save.worldTheme = 'land1';
  setActiveWorldTheme('land1');
  persist();
}
function enterDhdDialing() {
  closePanel();
  if ($('constellation-overlay').style.display === 'block') closeConstellation();
  gateDialing = true;
  dhdActiveRing = 0;
  dhdModeIdx = 0;
  player.x = -1.9 / S;
  player.z = -5.5 / S;
  player.angle = -1.57;
  player.walkTime = 0;
  $('dhd-hud').style.display = 'flex';
  $('prompt').style.display = 'none';
  $('wizard-guide').style.display = 'none';
  renderDhdHud();
  sfx('ui');
}

function exitDhdDialing() {
  gateDialing = false;
  $('dhd-hud').style.display = 'none';
  if (!gateOpen) {
    applyCampTheme(selectedCampTheme);
    gateChevMeshes.forEach((ch) => { ch.crystal.material = mat(0x718096); });
  }
}

function selectDhdRing(ringIdx) {
  const m = DHD_MODES[dhdModeIdx];
  if (ringIdx === 1 && m.mode !== 'arena') {
    showToast("L'anneau 2 ne s'utilise que pour le mode TERRE.");
    return;
  }
  dhdActiveRing = ringIdx;
  sfx('ui');
  renderDhdHud();
}

function rotateDhdRing(dir) {
  dhdHandAnim = 0.25;
  if (dhdActiveRing === 0) {
    dhdModeIdx = (dhdModeIdx + dir + DHD_MODES.length) % DHD_MODES.length;
    if (DHD_MODES[dhdModeIdx].mode === 'endless' && !save.won) {
      showToast('Mode Infini verrouillé (bats le boss de la Crypte Glacée).');
      dhdModeIdx = (dhdModeIdx + dir + DHD_MODES.length) % DHD_MODES.length;
    }
    dhdOuterTarget += dir * (Math.PI / 4);
    gateTargetYaw += dir * (Math.PI / 5);
  } else {
    const maxLand = Math.max(1, save.unlocked);
    save.landSel = ((save.landSel - 1 + dir + maxLand) % maxLand) + 1;
    persist();
    dhdInnerTarget += dir * (Math.PI / 3);
    gateTargetYaw -= dir * (Math.PI / 4);
  }
  sfx('wave');
  renderDhdHud();
}

function syncDhdPreviewEnv() {
  const m = DHD_MODES[dhdModeIdx];
  const themeKey = resolveWorldThemeKey(m.mode, save.landSel);
  selectedCampTheme = themeKey;
  save.worldTheme = themeKey;
  setActiveWorldTheme(themeKey);
  persist();
  applyCampTheme(themeKey);
  const theme = getActivePortalTheme();
  if (gateLight) {
    gateLight.color.setHex(theme.chevHex);
    gateLight.intensity = 2.2;
    setTimeout(() => { if (gateLight && !gateOpen) gateLight.intensity = 0.65; }, 220);
  }
  gateChevMeshes.forEach((ch) => {
    ch.crystal.material = mat(theme.chevHex);
  });
}

function activateDhdPortal() {
  const m = DHD_MODES[dhdModeIdx];
  if (m.mode === 'endless' && !save.won) {
    showToast('Mode Infini verrouillé !');
    return;
  }
  const destName = m.mode === 'arena' ? LANDS.at(save.landSel - 1).n : m.label;
  gateChev1 = { label: m.label };
  gateChev2 = { label: destName };
  gateOpen = true;
  gateReadyMode = m.mode;
  gateKawooshT = 1.0;
  addShake(4.0);
  sfx('kawoosh');
  syncDhdPreviewEnv();
  exitDhdDialing();
  showToast(`Vortex ouvert vers ${destName.toUpperCase()} — Monte la rampe !`, 3500);
}
function renderDhdHud() {
  const m = DHD_MODES[dhdModeIdx];
  const l = LANDS.at(save.landSel - 1);
  $('dhd-val-1').textContent = `${m.sym} ${m.label}`;
  $('dhd-val-2').textContent = m.mode === 'arena' ? `TERRE ${save.landSel}` : 'DIRECT';
  $('dhd-pill-1').classList.toggle('active', dhdActiveRing === 0);
  $('dhd-pill-2').classList.toggle('active', dhdActiveRing === 1);
  $('dhd-pill-2').classList.toggle('disabled', m.mode !== 'arena');

  if (m.mode === 'bridge') {
    $('dhd-dest-title').textContent = '🌉 PONT DU CHÂTEAU';
    $('dhd-dest-sub').textContent = `8 SECTEURS · RECORD S.${save.bridgeBest || 0}/${BRIDGE_SECTORS}`;
  } else if (m.mode === 'endless') {
    $('dhd-dest-title').textContent = '∞ DONJON INFINI';
    $('dhd-dest-sub').textContent = save.won ? `SURVIE SANS FIN · RECORD É.${save.best || 0}` : 'VERROUILLÉ';
  } else {
    $('dhd-dest-title').textContent = `${l.sym} ${l.n.toUpperCase()}`;
    $('dhd-dest-sub').textContent = `TERRE ${save.landSel}/${LANDS.length} · BOSS : ${l.boss.toUpperCase()}`;
  }

  const pactLabels = { none: 'AUCUN', haste: 'HÂTE +45% OR', titan: 'TITANS +60% BUTIN' };
  $('gate-pact-bar').innerHTML = PACTS.map((p) => `<button class="pact-btn ${save.pact === p.id ? 'active' : ''}" onclick="setPact('${p.id}')" title="${p.d}">${pactLabels[p.id]}</button>`).join('');
}
function renderStargateUI() { if (gateDialing) renderDhdHud(); }

let runKills = 0;

function showRunEndScreen(victory, reasonMsg) {
  setGameState('END');
  setEndVictory(victory);
  let isNewRecord = false;
  let oldRecord = 0;
  let currentStep = 1;
  let maxSteps = 5;
  let subLabel = '';

  if (runMode === 'bridge') {
    oldRecord = save.bridgeBest || 0;
    currentStep = sector;
    maxSteps = BRIDGE_SECTORS;
    subLabel = `PONT DU CHÂTEAU · SECTEUR ${sector}/${BRIDGE_SECTORS}`;
    if (sector > oldRecord) { save.bridgeBest = sector; isNewRecord = true; }
  } else if (runMode === 'endless') {
    oldRecord = save.best || 0;
    currentStep = floorNo;
    maxSteps = Math.max(floorNo, oldRecord, 10);
    subLabel = `MODE INFINI · ÉTAGE ${floorNo}`;
    if (floorNo > oldRecord) { save.best = floorNo; isNewRecord = true; }
  } else {
    oldRecord = save.unlocked || 1;
    currentStep = wave;
    maxSteps = 10;
    subLabel = `TERRE ${landNo} · ${LANDS.at(landNo - 1).n.toUpperCase()}`;
    if (victory && landNo >= oldRecord) isNewRecord = true;
  }

  if (victory) {
    save.stats.wins = (save.stats.wins || 0) + 1;
    if (guaranteedCurseLoot > 0) {
      const il = itemLevel();
      for (let i = 0; i < guaranteedCurseLoot; i++) {
        const bonusIt = newItem(il, 5, Math.random() < 0.35 ? 4 : 3);
        collectItem(bonusIt);
      }
      reasonMsg += ` (+${guaranteedCurseLoot} butin de séparation)`;
    }
  }

  if (runItems.length > 0) {
    let autoGoldEarned = 0;
    for (let k = runItems.length - 1; k >= 0; k--) {
      const item = runItems[k];
      if (routeItemToSecretChest(item)) {
        save.inv = save.inv.filter((invIt) => invIt.id !== item.id);
      } else if (save.autoSellJunk) {
        const value = Math.round((5 + item.il * 4) * RAR.at(item.r).sell) + item.lvl * 8;
        autoGoldEarned += value;
        save.inv = save.inv.filter((invIt) => invIt.id !== item.id);
        runItems.splice(k, 1);
      }
    }
    if (autoGoldEarned > 0) {
      save.gold += autoGoldEarned;
      setRunGold(runGold + autoGoldEarned);
    }
  }

  const pct = victory ? 100 : Math.min(100, Math.max(5, Math.round(((currentStep - 1) / maxSteps) * 100)));

  $('end-record-banner').style.display = isNewRecord ? 'block' : 'none';
  $('end-title').textContent = victory ? 'VICTOIRE' : 'SE REPLIER';
  $('end-sub').textContent = subLabel;
  $('end-big-num').textContent = runMode === 'bridge' ? `S.${sector}` : (runMode === 'endless' ? `É.${floorNo}` : `V.${wave}`);
  $('end-old-rec').textContent = `ANCIEN RECORD ${oldRecord}`;
  $('end-prog-fill').style.width = `${pct}%`;
  $('end-prog-mob').style.left = `${pct}%`;
  $('end-prog-pct').textContent = `${pct}%`;

  $('end-kills').textContent = `${runKills}`;
  $('end-gold').textContent = `+${runGold}`;
  $('end-loot-count').textContent = `${runItems.length}`;

  if (runItems.length === 0) {
    $('end-loot-list').innerHTML = '<span style="color:#64748b;font-size:15px;">AUCUN OBJET CETTE FOIS</span>';
  } else {
    $('end-loot-list').innerHTML = runItems.map((it) => `
      <div class="end-loot-icon" style="border-color:${RAR.at(it.r).c};color:${RAR.at(it.r).c}" title="${it.name} +${it.lvl} (${RAR.at(it.r).n})">
        ${SLOT_ICON.get(it.slot)}
        <small>${RAR.at(it.r).code}</small>
      </div>
    `).join('');
  }
  $('run-end-overlay').style.display = 'flex';
  persist();
}

function showToast(msg, ms) {
  const t = $('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { t.style.display = 'none'; }, ms || 2400);
}

configureWorldFactory({ scene, sun, pick, arenaH: ARENA_H, getPlayer: () => player });
function spawnPart(x, z, y, vx, vz, vy, life, color, g) {
  particles.push({ x, z, y, vx, vz, vy, life, color, g });
}
const SKIN = 0xd9a06b;
const pl = new THREE.Group();
scene.add(pl);
const plBody = new THREE.Group();
pl.add(plBody);
addShadow(pl, 1.1);
const legL = limb(plBody, -0.22, 0.8, 0, 0.38, 0.8, 0.4, SKIN);
const legR = limb(plBody, 0.22, 0.8, 0, 0.38, 0.8, 0.4, SKIN);
const plTorso = box(0.9, 0.9, 0.5, SKIN, 0, 1.25, 0, plBody);
box(0.7, 0.7, 0.7, SKIN, 0, 2.05, 0, plBody);
box(0.76, 0.3, 0.76, 0x5a3a22, 0, 2.38, -0.03, plBody);
const eyeL = box(0.1, 0.1, 0.05, 0x111111, -0.15, 2.1, 0.36, plBody);
const eyeR = box(0.1, 0.1, 0.05, 0x111111, 0.15, 2.1, 0.36, plBody);
const plCharm = box(0.22, 0.22, 0.08, 0xffd700, 0, 1.4, 0.3, plBody);
const armL = limb(plBody, -0.6, 1.65, 0, 0.3, 0.8, 0.3, SKIN);
const armR = limb(plBody, 0.6, 1.65, 0, 0.3, 0.8, 0.3, SKIN);
const plWeapon = new THREE.Group();
armR.add(plWeapon);
setPlayerWeaponGroup(plWeapon);
const bootL = box(0.42, 0.22, 0.5, 0x3b2a1a, 0, -0.72, 0.05, legL);
const bootR = box(0.42, 0.22, 0.5, 0x3b2a1a, 0, -0.72, 0.05, legR);
const helm = box(0.84, 0.42, 0.84, 0xffffff, 0, 2.34, -0.02, plBody);
helm.visible = false;
box(0.94, 0.14, 0.54, 0x5a3a22, 0, 0.88, 0, plBody);
box(0.78, 0.1, 0.78, 0xc53030, 0, 2.2, -0.02, plBody);
const padL = box(0.42, 0.2, 0.42, 0xffffff, -0.6, 1.76, 0, plBody);
const padR = box(0.42, 0.2, 0.42, 0xffffff, 0.6, 1.76, 0, plBody);
padL.visible = false; padR.visible = false;

const fire = new THREE.Group();
scene.add(fire);
box(1.4, 0.22, 0.22, 0x5a3a22, 0, 0.11, 0, fire).rotation.y = 0.6;
box(1.4, 0.22, 0.22, 0x5a3a22, 0, 0.11, 0, fire).rotation.y = -0.6;
const flames = Array.of(0xffd23f, 0xff9d2e, 0xff5a1f).map((c) => {
  const m = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: c }));
  fire.add(m);
  return m;
});
const fireLight = new THREE.PointLight(0xff9a40, 1.3, 14);
fireLight.position.set(0, 1.3, 0);
fire.add(fireLight);
fire.position.set(0, 0, 0);
let appliedLook = null;

const fxHost = { add: (el) => $('fx').appendChild(el), remove: (el) => el.remove() };
const projV = new THREE.Vector3();
function makeText(ft) {
  const el = document.createElement('div');
  el.className = 'dmg'; el.textContent = ft.text; el.style.color = ft.color;
  return el;
}
function updText(el, ft) {
  projV.set(ft.x * S, 2.4 + (ft.y - 18) * S * 2, ft.z * S).project(camera);
  el.style.transform = `translate(${(projV.x * 0.5 + 0.5) * window.innerWidth}px, ${(-projV.y * 0.5 + 0.5) * window.innerHeight}px)`;
  el.style.opacity = Math.min(1, ft.life / 0.3);
}
function disposeObj3D(obj) {
  if (!obj || !obj.traverse) return;
  obj.traverse((child) => {
    if (child.geometry && child.geometry !== boxGeo && child.geometry !== shadowGeo) {
      child.geometry.dispose();
    }
    if (child.material && child.material !== projMat && child.material !== goldMat && child.material !== shadowMat) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mt) => { if (!matCache.has(mt.color?.getHex())) mt.dispose(); });
      } else if (!child.material.color || matCache.get(child.material.color.getHex()) !== child.material) {
        child.material.dispose();
      }
    }
  });
}
function sync(list, map, host, make, update) {
  for (const o of list) {
    let m = map.get(o);
    if (!m) { m = make(o); host.add(m); map.set(o, m); }
    update(m, o);
  }
  map.forEach((m, o) => {
    if (!list.includes(o)) {
      host.remove(m);
      disposeObj3D(m);
      map.delete(o);
    }
  });
}
const mEnemies = new Map(), mProjs = new Map(), mEffects = new Map(), mOrbs = new Map(), mLoot = new Map(), mParts = new Map(), mTexts = new Map();

const campGroup = new THREE.Group();
scene.add(campGroup);
const STATIONS = new Array(), obstacles = new Array(), camAnims = new Array();
const campColliders = [
  { x: 0, z: -2.5 / S, hx: 1.15 / S, hz: 1.15 / S },      // Feu de camp central
  { x: -10.2 / S, z: 4.2 / S, hx: 2.35 / S, hz: 1.85 / S }, // Forgeron (établi + enclume + brasero)
  { x: 10.2 / S, z: 4.2 / S, hx: 2.15 / S, hz: 1.75 / S },  // Marchand (comptoir)
  { x: 10.2 / S, z: -7.8 / S, hx: 1.45 / S, hz: 1.45 / S }, // Piédestal Compétences
  { x: -1.9 / S, z: -7.5 / S, hx: 0.95 / S, hz: 0.95 / S }, // Piédestal DHD
  { x: -10.4 / S, z: 8.2 / S, hx: 1.6 / S, hz: 1.6 / S },   // Escalier décoratif gauche
  { x: 10.4 / S, z: 8.2 / S, hx: 1.6 / S, hz: 1.6 / S }     // Escalier décoratif droit
];
let campPanelOpen = false, campNear = null;
function glow(c, o) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o }); }
function addStation(id, name, icon, wx, wz, build, interactWx = wx, interactWz = wz, obsR = 11) {
  const g = new THREE.Group();
  g.position.set(wx, 0, wz);
  g.rotation.y = Math.PI / 2 - Math.atan2(-wz, -wx);
  build(g);
  campGroup.add(g);
  const el = document.createElement('div');
  el.className = 'slabel'; el.textContent = name.toUpperCase();
  $('fx').appendChild(el);
  STATIONS.push({ id, name, icon, x: interactWx / S, z: interactWz / S, el });
  obstacles.push({ x: interactWx / S, z: interactWz / S, r: obsR });
}

let gateRingRotor = null, dhdRingOuter = null, dhdRingInner = null, gateVortexMesh = null, gateRippleMesh = null, gateKawooshMesh = null, gateKawooshT = 0, gateLight = null, gateChevMeshes = new Array();
const dhdHitTargets = new Array();
addStation('stargate', 'Cadran', '', 0, -16.5, (g) => {
    box(24.4, 1.35, 3.8, 0x434959, 0, 0.675, 0.6, g);
  box(4.8, 2.8, 3.6, 0x363c4a, -9.4, 1.4, 0.6, g);
  box(4.8, 2.8, 3.6, 0x363c4a, 9.4, 1.4, 0.6, g);
  box(1.1, 1.5, 5.2, 0x3b4150, -6.4, 0.75, 4.2, g);
  box(1.1, 1.5, 5.2, 0x3b4150, 6.4, 0.75, 4.2, g);

  const ramp = box(3.8, 0.4, 4.6, 0x5c6478, 0, 0.72, 4.2, g);
  ramp.rotation.x = 0.28;
  box(0.32, 0.65, 4.6, 0x454c5c, -2.0, 0.9, 4.2, g).rotation.x = 0.28;
  box(0.32, 0.65, 4.6, 0x454c5c, 2.0, 0.9, 4.2, g).rotation.x = 0.28;

  const gateY = 5.15;
  const outer = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.48, 14, 42), mat(0x4b5363));
  outer.position.set(0, gateY, 0.2);
  outer.castShadow = true;
  g.add(outer);
  const topMarker = box(0.42, 0.56, 1.12, 0xffd700, 0, gateY + 4.48, 0.3, g);
  topMarker.material = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  gateRingRotor = new THREE.Group();
  gateRingRotor.position.set(0, gateY, 0.2);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(3.82, 0.28, 12, 36), mat(0x2d3442));
  gateRingRotor.add(inner);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const glyph = box(0.24, 0.52, 0.32, i % 2 === 0 ? 0x90cdf4 : 0xd4a73a, Math.cos(a) * 3.82, Math.sin(a) * 3.82, 0, gateRingRotor);
    glyph.rotation.z = a - Math.PI / 2;
  }
  g.add(gateRingRotor);

  for (let c = 0; c < 9; c++) {
    const a = Math.PI / 2 + (c - 4) * 0.56;
    const chGrp = new THREE.Group();
    box(0.92, 1.05, 1.02, 0x363d4d, 0, 0, 0, chGrp);
    const crystal = box(0.42, 0.62, 1.1, 0x718096, 0, -0.06, 0, chGrp);
    chGrp.rotation.z = a - Math.PI / 2;
    g.add(chGrp);
    gateChevMeshes.push({ grp: chGrp, crystal, ang: a, baseR: 4.74 });
  }

  gateVortexMesh = new THREE.Mesh(new THREE.CircleGeometry(3.62, 36), glow(0x2b6cb0, 0.82));
  gateVortexMesh.position.set(0, gateY, 0.24);
  gateVortexMesh.visible = false;
  g.add(gateVortexMesh);

  gateRippleMesh = new THREE.Mesh(new THREE.RingGeometry(0.5, 3.45, 36), glow(0x90cdf4, 0.45));
  gateRippleMesh.position.set(0, gateY, 0.28);
  gateRippleMesh.visible = false;
  g.add(gateRippleMesh);

  gateLight = new THREE.PointLight(0x4299e1, 0, 22);
  gateLight.position.set(0, gateY, 1.8);
  g.add(gateLight);

  gateKawooshMesh = new THREE.Mesh(new THREE.SphereGeometry(2.95, 20, 16), glow(0xbee3f8, 0.88));
  gateKawooshMesh.position.set(0, gateY, 0.4);
  gateKawooshMesh.visible = false;
  g.add(gateKawooshMesh);

  const dhd = new THREE.Group();
  dhd.position.set(-1.9, 0, 9.0);
  box(1.5, 0.25, 1.5, 0x343946, 0, 0.12, 0, dhd);
  box(0.85, 1.35, 0.85, 0x4a5060, 0, 0.8, 0, dhd);
  const dialHead = new THREE.Group();
  dialHead.position.set(0, 1.55, 0.05);
  dialHead.rotation.x = -0.95;
  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.86, 0.18, 20), mat(0x262d3b));
  baseDisc.rotation.x = Math.PI / 2;
  dialHead.add(baseDisc);

  dhdRingOuter = new THREE.Group();
  dhdRingOuter.position.z = 0.11;
  for (let k = 0; k < 12; k++) {
    const ka = (k / 12) * Math.PI * 2;
    const km = box(0.16, 0.24, 0.08, k % 3 === 0 ? 0xe2b740 : 0x718096, Math.cos(ka) * 0.72, Math.sin(ka) * 0.72, 0, dhdRingOuter);
    km.rotation.z = ka - Math.PI / 2;
  }
  dialHead.add(dhdRingOuter);
  dhdHitTargets.push({ mesh: dhdRingOuter, action: 'outer' });

  dhdRingInner = new THREE.Group();
  dhdRingInner.position.z = 0.13;
  for (let m = 0; m < 8; m++) {
    const ma = (m / 8) * Math.PI * 2;
    const mm = box(0.14, 0.2, 0.08, 0x90cdf4, Math.cos(ma) * 0.44, Math.sin(ma) * 0.44, 0, dhdRingInner);
    mm.rotation.z = ma - Math.PI / 2;
  }
  dialHead.add(dhdRingInner);
  dhdHitTargets.push({ mesh: dhdRingInner, action: 'inner' });

  const centerDome = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.18, 16), glow(0x63b3ed, 0.92));
  centerDome.rotation.x = Math.PI / 2;
  centerDome.position.z = 0.16;
  dialHead.add(centerDome);
  dhdHitTargets.push({ mesh: centerDome, action: 'center' });

  dhd.add(dialHead);
  g.add(dhd);

  camAnims.push((t) => {
    dhdHandAnim = Math.max(0, dhdHandAnim - 0.02);
    const activeOuter = gateDialing && dhdActiveRing === 0 ? dhdOuterTarget + Math.sin(t * 5) * 0.06 : dhdOuterTarget;
    const activeInner = gateDialing && dhdActiveRing === 1 ? dhdInnerTarget + Math.sin(t * 5) * 0.06 : dhdInnerTarget;
    if (dhdRingOuter) dhdRingOuter.rotation.z += (activeOuter - dhdRingOuter.rotation.z) * 0.2;
    if (dhdRingInner) dhdRingInner.rotation.z += (activeInner - dhdRingInner.rotation.z) * 0.2;

    if (gateRingRotor) {
      gateRingRotor.rotation.z += (gateTargetYaw - gateRingRotor.rotation.z) * 0.14;
    }
    const theme = getActivePortalTheme();
    gateChevMeshes.forEach((ch, idx) => {
      const lit = gateOpen || (gateChev1 && idx === 3) || (gateChev2 && idx === 5);
      const r = lit ? ch.baseR + 0.16 : ch.baseR;
      ch.grp.position.set(Math.cos(ch.ang) * r, gateY + Math.sin(ch.ang) * r, 0.24);
      ch.crystal.material = lit ? mat(theme.chevHex) : mat(0x718096);
    });
    if (gateVortexMesh && gateRippleMesh) {
      if (gateOpen) {
        gateVortexMesh.visible = true;
        gateRippleMesh.visible = true;
        gateVortexMesh.material.color.setHex(theme.vortexHex);
        gateRippleMesh.material.color.setHex(theme.rippleHex);
        const pulse = 1 + Math.sin(t * 7) * 0.035;
        gateVortexMesh.scale.set(pulse, pulse, 1);
        gateVortexMesh.rotation.z = t * 0.9;
        const rScale = 0.45 + ((t * 0.75) % 0.65);
        gateRippleMesh.scale.set(rScale, rScale, 1);
        gateRippleMesh.material.opacity = 0.55 * (1 - ((t * 0.75) % 1));
        if (gateLight) { gateLight.color.setHex(theme.vortexHex); gateLight.intensity = 1.6 + Math.sin(t * 8) * 0.3; }
      } else {
        gateVortexMesh.visible = false;
        gateRippleMesh.visible = false;
        if (gateLight) gateLight.intensity = 0;
      }
    }
    if (gateKawooshMesh) {
      if (gateKawooshT > 0) {
        gateKawooshT = Math.max(0, gateKawooshT - 0.035);
        const p = 1 - gateKawooshT;
        const ext = p < 0.35 ? p / 0.35 : 1 - (p - 0.35) / 0.65;
        gateKawooshMesh.visible = ext > 0.02;
        gateKawooshMesh.scale.set(0.75 + ext * 0.35, 0.75 + ext * 0.35, 0.4 + ext * 2.2);
        gateKawooshMesh.material.opacity = 0.85 * ext;
      } else {
        gateKawooshMesh.visible = false;
      }
    }
  });
}, -1.9, -7.5, 6);

let anvilMesh = null;
addStation('smith', 'Forgeron', '🔨', -10.2, 4.2, (g) => {
  box(3.2, 0.4, 2.4, 0x3b404e, 0, 0.2, 0, g);
  box(2.8, 0.9, 2.0, 0x6f4726, 0, 0.85, 0, g);
  anvilMesh = box(1.2, 0.6, 0.75, 0x9aa3b2, 0, 1.6, 0, g);
  box(0.45, 0.35, 0.55, 0x7d8696, 0.7, 1.55, 0, g);
  box(1.1, 0.4, 1.1, 0x4a4e58, 2.4, 0.2, -0.6, g);
  box(0.8, 0.5, 0.8, 0x2d3038, 2.4, 0.65, -0.6, g);
  for (let i = 0; i < 6; i++) {
    const c = box(0.28, 0.22, 0.55, 0x9e5628, 2.1 + (i % 3) * 0.25, 1.0 + Math.floor(i / 3) * 0.2, -0.6, g);
    c.rotation.y = (i - 2) * 0.35;
  }
});
let merchantSign = null;
addStation('merchant', 'Marchand', '💰', 10.2, 4.2, (g) => {
  box(3.6, 0.3, 2.6, 0x5c3c20, 0, 0.15, 0, g);
  box(3.4, 1.0, 2.2, 0x7c4f29, 0, 0.8, 0, g);
  for (let i = 0; i < 4; i++) {
    const px = -1.1 + i * 0.72, pz = 0.2 + (i % 2) * 0.45;
    box(0.32, 0.32, 0.32, 0xf2c12e, px, 1.4, pz, g);
  }
  box(0.18, 2.6, 0.18, 0x5c3c20, -1.6, 2.3, -0.9, g);
  box(0.18, 2.6, 0.18, 0x5c3c20, 1.6, 2.3, -0.9, g);
  merchantSign = box(3.5, 0.75, 0.22, 0xd4a73a, 0, 3.4, -0.9, g);
  camAnims.push((t) => {
    if (anvilMesh) anvilMesh.scale.y = 1 + Math.sin(t * 2) * 0.03;
    if (merchantSign) merchantSign.rotation.z = Math.sin(t * 1.5) * 0.04;
  });
});

let skillOrb = null, skillRing = null;
addStation('skills', 'Compétences', '✨', 10.2, -7.8, (g) => {
  box(2.2, 0.4, 2.2, 0x3a3f4d, 0, 0.2, 0, g);
  box(1.5, 1.1, 1.5, 0x4b5264, 0, 0.95, 0, g);
  skillOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), glow(0x52c4ff, 0.9));
  skillOrb.position.set(0, 2.35, 0);
  g.add(skillOrb);
  skillRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 8, 24), glow(0xffd700, 0.75));
  skillRing.position.set(0, 2.35, 0);
  g.add(skillRing);
  camAnims.push((t) => {
    if (skillOrb) { skillOrb.rotation.y = t * 2; skillOrb.position.y = 2.35 + Math.sin(t * 3) * 0.15; }
    if (skillRing) { skillRing.rotation.x = t * 1.5; skillRing.rotation.y = t; }
  });
});

const pointerNDC = new THREE.Vector2();
const uiMouseNDC = { x: 0, y: 0 };
window.addEventListener('pointermove', (ev) => {
  uiMouseNDC.x = (ev.clientX / window.innerWidth) * 2 - 1;
  uiMouseNDC.y = -(ev.clientY / window.innerHeight) * 2 + 1;
});
canvas.addEventListener('pointermove', (ev) => {
  if (!gateDialing || gameState !== 'CAMP') {
    canvas.classList.remove('dhd-hover');
    return;
  }
  const rect = canvas.getBoundingClientRect();
  pointerNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  occlusionRaycaster.setFromCamera(pointerNDC, camera);
  let hitAction = null;
  for (const tgt of dhdHitTargets) {
    if (occlusionRaycaster.intersectObject(tgt.mesh, true).length > 0) {
      hitAction = tgt.action;
      break;
    }
  }
  canvas.classList.toggle('dhd-hover', Boolean(hitAction));
});
canvas.addEventListener('pointerdown', (ev) => {
  if (!gateDialing || gameState !== 'CAMP') return;
  const rect = canvas.getBoundingClientRect();
  pointerNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  occlusionRaycaster.setFromCamera(pointerNDC, camera);
  for (const tgt of dhdHitTargets) {
    if (occlusionRaycaster.intersectObject(tgt.mesh, true).length > 0) {
      if (tgt.action === 'outer') { selectDhdRing(0); rotateDhdRing(ev.button === 2 ? -1 : 1); }
      else if (tgt.action === 'inner') { selectDhdRing(1); rotateDhdRing(ev.button === 2 ? -1 : 1); }
      else if (tgt.action === 'center') { activateDhdPortal(); }
      break;
    }
  }
});

function openPanel(tab) {
  if (gameState !== 'CAMP') return;
  campPanelOpen = true;
  setCampTabValue(tab || 'smith');
  if (campTab !== 'merchant') {
    player.angle = Math.PI / 2;
    player.walkTime = 0;
  }
  $('camp-overlay').style.display = 'flex';
  $('prompt').style.display = 'none';
  $('wizard-guide').style.display = 'none';
  renderCamp();
}
function closePanel() {
  campPanelOpen = false;
  $('camp-overlay').style.display = 'none';
  hideItemTooltip();
  if (gameState === 'CAMP' && campNear && !gateDialing) {
    $('prompt').style.display = 'block';
  }
  updateTopNav();
}
function navSelect(tab) {
  if (tab === 'skills') {
    if ($('constellation-overlay').style.display === 'block') { closeConstellation(); return; }
    if (gameState === 'COMBAT') openCamp('Retour au camp.');
    openConstellation();
    return;
  }
  if ($('constellation-overlay').style.display === 'block') closeConstellation();
  if (gateDialing) exitDhdDialing();
  if (gameState === 'COMBAT') openCamp('Retour au camp.');
  setCampTabValue(tab);
  if (campPanelOpen && $('camp-overlay').style.display === 'flex') {
    renderCamp();
  } else {
    openPanel(tab);
  }
  updateTopNav();
}
function updateTopNav() {
  const constOpen = $('constellation-overlay') && $('constellation-overlay').style.display === 'block';
  const panelOpen = campPanelOpen && $('camp-overlay').style.display === 'flex';
  if ($('top-nav')) $('top-nav').style.display = (panelOpen || constOpen) ? 'flex' : 'none';
  if ($('nav-smith')) $('nav-smith').classList.toggle('active', panelOpen && campTab === 'smith');
  if ($('nav-merchant')) $('nav-merchant').classList.toggle('active', panelOpen && campTab === 'merchant');
  if ($('nav-skills')) $('nav-skills').classList.toggle('active', constOpen);
}
function interact() {
  if (!campNear || campPanelOpen || gateDialing) return;
  if (campNear.id === 'stargate') enterDhdDialing();
  else if (campNear.id === 'skills') openConstellation();
  else openPanel(campNear.id);
}

function updateWizardGuide() {
  const guide = $('wizard-guide');
  const textEl = $('wizard-text');
  if (!guide || !textEl) return;
  const constOpen = $('constellation-overlay') && $('constellation-overlay').style.display === 'block';
  if (gameState !== 'CAMP' || campPanelOpen || gateDialing || constOpen || save.seen) {
    guide.style.display = 'none';
    return;
  }
  guide.style.display = 'flex';
  if (!save.eq.weapon || save.inv.length <= 1) {
    textEl.textContent = 'Approche-toi de la Porte des Étoiles au nord [F] ou clique sur Lancer la run.';
  } else if (save.gold >= 45 && skillLv('p_atk') === 0) {
    textEl.textContent = 'Tu as de l\'or ! Visite l\'Arbre de Compétences [E] ou le Forgeron [B] pour te renforcer.';
  } else {
    textEl.textContent = 'L\'arène t\'attend : lance une run [Espace] pour récupérer de l\'équipement.';
  }
}
function skipTutorial() {
  save.seen = true;
  persist();
  updateWizardGuide();
}

const DEFAULT_CAMP_CAM = { y: 6.2, z: 9.4, ly: 3.8, fov: 67 };
let campCamCfg = { ...DEFAULT_CAMP_CAM };

function syncCamTunerUI() {
  if ($('ct-y')) {
    $('ct-y').value = campCamCfg.y;
    $('ct-z').value = campCamCfg.z;
    $('ct-ly').value = campCamCfg.ly;
    $('ct-fov').value = campCamCfg.fov;
    $('ct-val-y').textContent = campCamCfg.y.toFixed(1);
    $('ct-val-z').textContent = campCamCfg.z.toFixed(1);
    $('ct-val-ly').textContent = campCamCfg.ly.toFixed(1);
    $('ct-val-fov').textContent = String(Math.round(campCamCfg.fov));
  }
}
function updateCamTuner() {
  if (!$('ct-y')) return;
  campCamCfg.y = parseFloat($('ct-y').value);
  campCamCfg.z = parseFloat($('ct-z').value);
  campCamCfg.ly = parseFloat($('ct-ly').value);
  campCamCfg.fov = parseFloat($('ct-fov').value);
  syncCamTunerUI();
}
function resetCamConfig() {
  campCamCfg = { ...DEFAULT_CAMP_CAM };
  syncCamTunerUI();
  showToast('Caméra camp réinitialisée.');
}
function copyCamConfig() {
  const snippet = `{ y: ${campCamCfg.y.toFixed(1)}, z: ${campCamCfg.z.toFixed(1)}, ly: ${campCamCfg.ly.toFixed(1)}, fov: ${Math.round(campCamCfg.fov)} }`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(snippet).catch(() => {});
  }
  showToast(`Copié : ${snippet}`);
}
function toggleCamTuner() {
  const el = $('cam-tuner');
  if (!el) return;
  const open = el.style.display === 'flex';
  el.style.display = open ? 'none' : 'flex';
  if (!open) syncCamTunerUI();
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyT' && !e.repeat && gameState === 'CAMP') toggleCamTuner();
});

function updateCamp(dt, gpMove) {
  let mx = gpMove.mx, mz = gpMove.mz;
  if (!campPanelOpen && !gateDialing) {
    if (keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp')) mz -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) mz += 1;
    if (keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  }
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= Math.max(1, len); mz /= Math.max(1, len);
    player.moveAngle = Math.atan2(mz, mx); player.angle = player.moveAngle; player.walkTime += dt * 16;
    player.x += mx * 76 * dt; player.z += mz * 76 * dt;
  } else player.walkTime = 0;

  if (!gateDialing) {
    const minCampZ = gateOpen ? -140 : -114;
    player.x = Math.max(-86, Math.min(86, player.x));
    player.z = Math.max(minCampZ, Math.min(88, player.z));

    const wx = player.x * S;
    const wz = player.z * S;
    if (wz < -13.6 && Math.abs(wx) >= 1.6) {
      player.z = -13.6 / S;
    }
    if (wz < -9.9 && Math.abs(wx) >= 1.6 && Math.abs(wx) <= 2.35) {
      player.x = (Math.sign(wx) * (Math.abs(wx) < 1.95 ? 1.55 : 2.35)) / S;
    }

    const pRad = 4.2;
    campColliders.forEach((b) => {
      const dx = player.x - b.x;
      const dz = player.z - b.z;
      const ox = (b.hx + pRad) - Math.abs(dx);
      const oz = (b.hz + pRad) - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) player.x += dx >= 0 ? ox : -ox;
        else player.z += dz >= 0 ? oz : -oz;
      }
    });
  }

  if (gateOpen && gateReadyMode && !gateDialing) {
    const px = player.x * S, pz = player.z * S;
    const gateMouthZ = -16.65;
    if (Math.abs(px) < 3.4 && pz < gateMouthZ && pz > -18.5) {
      const modeToLaunch = gateReadyMode;
      const destTitle = modeToLaunch === 'arena' ? LANDS.at(save.landSel - 1).n : (modeToLaunch === 'bridge' ? 'Pont du Château' : 'Donjon Infini');
      gateOpen = false;
      gateReadyMode = null;
      showToast(`Traversée du vortex vers ${destTitle.toUpperCase()} !`, 2500);
      startRun(modeToLaunch);
      return;
    }
  }

  let near = null, best = 26;
  STATIONS.forEach((s) => {
    const maxDist = s.id === 'stargate' ? 14 : 26;
    const d = Math.hypot(player.x - s.x, player.z - s.z);
    if (d < best && d < maxDist) { best = d; near = s; }
  });
  campNear = near;
  const pr = $('prompt');
  if (!campPanelOpen && !gateDialing && near) {
    pr.style.display = 'block';
    const actHint = getGpIndex() !== null ? 'A / F' : 'F';
    pr.textContent = `[${actHint}] ${near.name}`;
  } else pr.style.display = 'none';
  updateWizardGuide();
  STATIONS.forEach((s) => {
    projV.set(s.x * S, 3.6, s.z * S).project(camera);
    s.el.style.transform = `translate(${(projV.x * 0.5 + 0.5) * window.innerWidth}px, ${(-projV.y * 0.5 + 0.5) * window.innerHeight}px)`;
    s.el.style.display = (campPanelOpen || gateDialing) ? 'none' : 'block';
  });
}

let gameT = 0;
function updatePlayerVisual() {
  const px = player.x * S, pz = player.z * S;
  let campRampY = 0;
  if (gameState === 'CAMP' && Math.abs(px) < 1.75 && pz < -10.0 && pz >= -18.5) {
    const t = Math.min(1, Math.max(0, (-10.0 - pz) / 4.4));
    campRampY = t * 1.35;
  }
  const py = (typeof playerHeightY === 'number' && gameState === 'COMBAT') ? playerHeightY : campRampY;
  pl.position.set(px, py, pz);
  pl.rotation.y = Math.PI / 2 - player.angle;
  plBody.position.y = Math.abs(Math.sin(player.walkTime)) * 0.14;
  const sw = Math.sin(player.walkTime) * 0.65;
  legL.rotation.x = sw; legR.rotation.x = -sw;
  armL.rotation.x = -sw * 0.7; armR.rotation.x = sw * 0.7;
  if (player.swingTime > 0) armR.rotation.x = -1.2 - Math.sin((1 - player.swingTime / 0.16) * Math.PI) * 1.4;
  if (player.spin > 0) { plBody.rotation.y = (0.5 - player.spin) * Math.PI * 8; player.spin = Math.max(0, player.spin - 0.016); }
  else plBody.rotation.y = 0;
  const eyeTrack = gameState === 'CAMP' && campPanelOpen && campTab !== 'merchant';
  const targetEyeOX = eyeTrack ? Math.max(-0.07, Math.min(0.07, (uiMouseNDC.x + 0.25) * 0.09)) : 0;
  const targetEyeOY = eyeTrack ? Math.max(-0.06, Math.min(0.06, uiMouseNDC.y * 0.08)) : 0;
  eyeL.position.x += (-0.15 + targetEyeOX - eyeL.position.x) * 0.22;
  eyeR.position.x += (0.15 + targetEyeOX - eyeR.position.x) * 0.22;
  eyeL.position.y += (2.1 + targetEyeOY - eyeL.position.y) * 0.22;
  eyeR.position.y += (2.1 + targetEyeOY - eyeR.position.y) * 0.22;
  pl.visible = player.invuln <= 0 || Math.floor(player.invuln * 20) % 2 === 0;
  const k = `${look.rg}|${look.w}|${look.a}|${look.c}|${look.h}|${look.l}|${look.b}`;
  if (k !== appliedLook) {
    appliedLook = k;
    buildWeapon(look.rg, look.w);
    const ac = look.a ? mat(look.a) : mat(SKIN);
    plTorso.material = ac; armL.material = ac; armR.material = ac;
    legL.material = look.l ? mat(look.l) : mat(SKIN);
    legR.material = look.l ? mat(look.l) : mat(SKIN);
    bootL.material = look.b ? mat(look.b) : mat(0x3b2a1a);
    bootR.material = look.b ? mat(look.b) : mat(0x3b2a1a);
    helm.visible = Boolean(look.h); if (look.h) helm.material = mat(look.h);
    padL.visible = Boolean(look.a); padR.visible = Boolean(look.a);
    if (look.a) { padL.material = mat(look.a); padR.material = mat(look.a); }
    plCharm.visible = Boolean(look.c); if (look.c) plCharm.material = mat(look.c);
  }
  const hasFire = gameState === 'CAMP';
  fire.visible = hasFire;
  if (hasFire) {
    fire.position.set(0, 0, -2.5);
    flames.forEach((fl, i) => {
      fl.scale.set(0.55 - i * 0.1, 0.75 + Math.sin(gameT * 10 + i * 2) * 0.2, 0.55 - i * 0.1);
      fl.position.set(Math.sin(gameT * 6 + i) * 0.08, 0.4 + i * 0.22, Math.cos(gameT * 5 + i) * 0.08);
    });
    fireLight.intensity = 1.2 + Math.sin(gameT * 14) * 0.25;
  }
}

function updateCampOcclusion() {
  if (!campOccluders || campOccluders.length === 0) return;
  occlusionOrigin.set(player.x * S, 1.3, player.z * S);
  occlusionDir.copy(camera.position).sub(occlusionOrigin);
  const distToCam = occlusionDir.length();
  if (distToCam < 0.01) return;
  occlusionDir.normalize();
  occlusionRaycaster.set(occlusionOrigin, occlusionDir);
  occlusionRaycaster.near = 0.1;
  occlusionRaycaster.far = distToCam;
  const hitsList = occlusionRaycaster.intersectObjects(campOccluders, false);
  const occludedSet = new Set(hitsList.map((h) => h.object));
  campOccluders.forEach((m) => {
    const targetOp = occludedSet.has(m) ? 0.25 : 1.0;
    m.material.opacity += (targetOp - m.material.opacity) * 0.22;
  });
}

function makeWorldLabel(defaultCol = '#ffd700') {
  const el = document.createElement('div');
  el.className = 'slabel';
  el.style.display = 'none';
  el.style.color = defaultCol;
  $('fx').appendChild(el);
  return el;
}

const doorLabelL = makeWorldLabel('#68d391');
const doorLabelR = makeWorldLabel('#68d391');
const runeVisuals = [0, 1, 2].map(() => {
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, label: makeWorldLabel('#ffffff') };
});

function updateDungeonOverlays() {
  const inArena = gameState === 'COMBAT' && runMode === 'arena';
  const doorsOpen = inArena && activeDoors.length > 0;
  const cxW = roomCenterX() * S;
  const czW = roomCenterZ() * S;
  const archOff = (ROOM_HALF * S) + 0.7;

  const projectLabel = (el, wx, wy, wz, text, col) => {
    projV.set(wx, wy, wz).project(camera);
    if (projV.z > 1) { el.style.display = 'none'; return; }
    el.textContent = text;
    el.style.color = col;
    el.style.borderColor = col;
    el.style.transform = `translate(${(projV.x * 0.5 + 0.5) * window.innerWidth}px, ${(-projV.y * 0.5 + 0.5) * window.innerHeight}px)`;
    el.style.display = 'block';
  };

  const labelEls = [doorLabelL, doorLabelR];
  labelEls.forEach((el, idx) => {
    const ad = doorsOpen ? activeDoors[idx] : null;
    if (!ad) { el.style.display = 'none'; return; }
    const d = DIRS[ad.dir];
    projectLabel(el, cxW + d.dx * archOff, 5.4, czW + d.dz * archOff, `${ad.arrow} ${ad.choice.label}`, ad.choice.col);
  });

  const hasPuzzle = inArena && puzzleState && Array.isArray(puzzleState.runes);
  runeVisuals.forEach((rv, idx) => {
    if (!hasPuzzle || !puzzleState.runes[idx]) {
      rv.mesh.visible = false;
      rv.label.style.display = 'none';
      return;
    }
    const r = puzzleState.runes[idx];
    rv.mesh.visible = true;
    rv.mesh.position.set(r.x * S, 1.05 + Math.sin(gameT * 4 + idx) * 0.16, r.z * S);
    rv.mesh.rotation.y = gameT * 2.2;
    rv.mesh.scale.setScalar(r.hit ? 0.55 : 1.0);
    rv.mesh.material.color.set(r.hit ? '#48bb78' : r.col);
    projectLabel(rv.label, r.x * S, 2.35, r.z * S, r.hit ? `✔ ${r.name}` : `◆ ${r.name}`, r.hit ? '#48bb78' : r.col);
  });
}

const campLookCurrent = new THREE.Vector3(0, 3.8, -1.5);
let campCamInitialized = false;

function renderScene() {
  const { renderer } = getRenderContext();
  if (!renderer) return;
  const s = shake * S;
  const sx = (Math.random() - 0.5) * s, sz = (Math.random() - 0.5) * s;
  if (gameState === 'CAMP') {
    const isPanelView = campPanelOpen && $('camp-overlay').style.display === 'flex' && campTab !== 'merchant';
    const px = player.x * S;
    const pz = player.z * S;
    let targetCamPos, targetLook, targetFov, lerpSpeed;

    if (gateDialing) {
      targetFov = 50;
      targetCamPos = new THREE.Vector3(-1.35, 3.35, -3.25);
      targetLook = new THREE.Vector3(-0.4, 3.85, -15.8);
      lerpSpeed = 0.14;
    } else if (isPanelView) {
      targetFov = 44;
      const stageEl = document.querySelector('.hero-stage');
      let ndcX = -0.25, ndcY = 0.02;
      if (stageEl) {
        const r = stageEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          ndcX = ((r.left + r.width * 0.5) / window.innerWidth) * 2 - 1;
          ndcY = -(((r.top + r.height * 0.52) / window.innerHeight) * 2 - 1);
        }
      }
      const distZ = 8.4;
      const halfH = Math.tan(THREE.MathUtils.degToRad(targetFov * 0.5)) * distZ;
      const halfW = halfH * camera.aspect;
      const offsetX = -ndcX * halfW;
      const offsetY = -ndcY * halfH;
      targetCamPos = new THREE.Vector3(px + offsetX, 1.24 + offsetY, pz + distZ);
      targetLook = new THREE.Vector3(px + offsetX, 1.20 + offsetY, pz);
      lerpSpeed = 0.22;
    } else {
      targetFov = campCamCfg.fov;
      const clampedCamX = Math.max(-4.6, Math.min(4.6, px * 0.65)) + sx;
      const clampedCamZ = Math.max(-3.5, Math.min(15.2, pz + campCamCfg.z + 1.2)) + sz;
      const southFactor = Math.max(0, Math.min(1, (pz - 2.0) / 8.0));
      const dynamicLy = campCamCfg.ly - southFactor * 1.45;
      targetCamPos = new THREE.Vector3(clampedCamX, campCamCfg.y + southFactor * 0.6, clampedCamZ);
      targetLook = new THREE.Vector3(px * 0.72, dynamicLy, Math.min(8.5, pz - 1.2));
      lerpSpeed = 0.12;
    }

    if (!campCamInitialized) {
      camera.fov = targetFov;
      camera.position.copy(targetCamPos);
      campLookCurrent.copy(targetLook);
      campCamInitialized = true;
    } else {
      camera.fov += (targetFov - camera.fov) * lerpSpeed;
      camera.position.lerp(targetCamPos, lerpSpeed);
      campLookCurrent.lerp(targetLook, lerpSpeed);
    }
    camera.updateProjectionMatrix();
    camera.lookAt(campLookCurrent);
    updateCampOcclusion();
  } else {
    const combatFov = 65;
    if (Math.abs(camera.fov - combatFov) > 0.1) { camera.fov = combatFov; camera.updateProjectionMatrix(); }
    const focusX = runMode === 'bridge' ? player.x * 0.65 : camPos.x;
    const focusZ = runMode === 'bridge' ? player.z - 8 : camPos.z;
    const py = typeof playerHeightY === 'number' ? playerHeightY : 0;
    camera.position.set(focusX * S + sx, 8.8 + py * 0.4, focusZ * S + 11.8 + sz);
    camera.lookAt(focusX * S, 2.4 + py * 0.5, focusZ * S - 2.2);
  }
  sun.position.set(camera.position.x - 10, 22, camera.position.z + 8);
  sun.target.position.set(camera.position.x, 0, camera.position.z - 8);
  sun.target.updateMatrixWorld();
  updateWorldEnvironment(camera, gameT);
  const isCamp = gameState === 'CAMP';
  campGroup.visible = isCamp;
  if ($('combat-hud-panel')) $('combat-hud-panel').style.display = isCamp ? 'none' : 'block';
  if ($('o-camp')) $('o-camp').style.display = isCamp ? 'none' : 'block';
  STATIONS.forEach((s) => { s.el.style.display = isCamp && !campPanelOpen && !gateDialing ? 'block' : 'none'; });
  updateDungeonOverlays();
  if (isCamp) camAnims.forEach((fn) => fn(gameT));
  updatePlayerVisual();
  sync(enemies, mEnemies, scene, (e) => makeEnemy(e, () => player, () => gameT), updEnemy);
  sync(projectiles, mProjs, scene, makeProj, updProj);
  sync(effects, mEffects, scene, makeEffect, (m, ef) => updEffect(m, ef, player));
  sync(lootOrbs, mOrbs, scene, makeOrb, (m, o) => updOrb(m, o, gameT));
  sync(lootItems, mLoot, scene, makeLoot, (m, li) => updLoot(m, li, gameT));
  sync(particles, mParts, scene, makePart, updPart);
  sync(floatTexts, mTexts, fxHost, makeText, updText);
  renderer.render(scene, camera);
}

function toggleMute() {
  setMutedState(!muted);
  $('o-mute').textContent = muted ? 'MUET' : 'SON';
  if (!muted) {
    audio();
    startMusic(() => ({ gameState, isBoss: $('boss-hud').style.display === 'block' }));
    sfx('ui');
  }
}
let qHigh = true;
function toggleQ() {
  qHigh = !qHigh;
  setRendererQuality(qHigh);
  $('o-q').textContent = `Q : ${qHigh ? 'HAUTE' : 'BASSE'}`;
}
function resetSave() {
  localStorage.removeItem(SAVE_KEY);
  setSave(makeDefaultSave());
  persist();
  location.reload();
}

if (!save.secretChest || save.secretChest.length !== 3) {
  const rescued = Array.isArray(save.secretChest) ? save.secretChest.flatMap((t) => t.items || []) : [];
  save.secretChest = [
    { id: 0, name: '60% IV', affixes: ['', ''], minRarity: 0, minIv: 60, items: [] },
    { id: 1, name: '75% IV', affixes: ['', ''], minRarity: 0, minIv: 75, items: [] },
    { id: 2, name: '90% IV', affixes: ['', ''], minRarity: 0, minIv: 90, items: [] }
  ];
  rescued.forEach((it) => { if (!routeItemToSecretChest(it) && save.inv.length < 40) save.inv.push(it); });
}

configureFilterSystem({
  getGameState: () => gameState,
  isEquipped,
  renderCamp,
  showToast
});

configureMerchantEngine({
  getItem,
  isEquipped,
  sellValue,
  upgCost,
  rerollCost,
  score,
  getSelId: () => selId,
  setSelId: (id) => { selId = id; },
  renderCamp,
  showToast,
  sfx
});

configureConstellations({
  getItem,
  getStats,
  renderCamp,
  renderConstellation,
  showToast,
  sfx,
  isConstellationOpen: () => $('constellation-overlay') && $('constellation-overlay').style.display === 'block'
});

configureRunDirector({
  clearEntities: () => {
    clearEntities();
    effects.length = 0;
    particles.length = 0;
    floatTexts.length = 0;
    if ($('banner')) $('banner').classList.remove('show');
  },
  resetCurseRunState: () => {
    activeCurses = new Array();
    guaranteedCurseLoot = 0;
    altarShownKeys = new Set();
  },
  resetStargateDial,
  getStats,
  lookColors,
  setLook: (l) => { look = l; },
  getPlayer: () => player,
  setCamPos: (x, z) => { setCamPos(x, z); setPlayerHeightY(0); },
  setDashCd: (v) => { dashCd = v; },
  setDashMaxCd: (v) => { dashMaxCd = v; },
  setSkillCd: (obj) => { skillCd.e = obj.e; skillCd.r = obj.r; skillCd.c = obj.c; },
  setAttackTimer: (v) => { attackTimer = v; },
  setRunKills: (v) => { runKills = v; },
  setHits: (v) => { hits = v; },
  setCampPanelOpen: (v) => { campPanelOpen = v; },
  buildEnv,
  spawnWave,
  lootSummary,
  renderCamp,
  showToast,
  getLandNo: () => landNo,
  setLandNo: (n) => { landNo = n; }
});

configureSpawnFactory({
  getLandNo: () => landNo,
  getLands: () => LANDS,
  getArenaH: () => ARENA_H,
  getPlayer: () => player,
  hasCurse,
  sfx,
  bannerShow
});

configurePhysicsEngine({
  $,
  save,
  keys,
  player,
  get arenaPlatforms() { return arenaPlatforms; },
  arenaH: ARENA_H,
  lands: LANDS,
  hasCurse,
  getStats,
  performAutoAttack,
  damageEnemy,
  hurtPlayer,
  collectItem,
  burst,
  addFloatText,
  showRunEndScreen,
  showToast,
  maybeOpenCurseAltar,
  proceedAfterAltar,
  bannerShow,
  persist,
  sfx,
  getLandNo: () => landNo,
  setLandNo: (n) => { landNo = n; },
  buildEnv,
  getSkillCd: () => skillCd,
  getDashCd: () => dashCd,
  setDashCd: (v) => { dashCd = v; },
  getDashMaxCd: () => dashMaxCd,
  getAttackTimer: () => attackTimer,
  setAttackTimer: (v) => { attackTimer = v; },
  getRunKills: () => runKills,
  setRunKills: (v) => { runKills = v; },
  effects,
  floatTexts,
  particles,
  openCamp
});

configureInputHandler({
  getGameState: () => gameState,
  isGateDialing: () => gateDialing,
  isCampPanelOpen: () => campPanelOpen,
  getCampTab: () => campTab,
  getDhdActiveRing: () => dhdActiveRing,
  getPacts: () => PACTS,
  getSave: () => save,
  getSelId: () => selId,
  getItem,
  isEquipped,
  rotateDhdRing,
  selectDhdRing,
  activateDhdPortal,
  exitDhdDialing,
  replayLastMode,
  returnCampFromEnd,
  startRun,
  navSelect,
  openConstellation,
  closeConstellation,
  centerConstellation,
  cycleSlot,
  skipCurseAltar,
  openCamp,
  closePanel,
  triggerDash,
  castSkill,
  toggleMute,
  interact,
  setPact,
  setCampTab,
  autoEquip,
  toggleEquipItem,
  applyConstellationTransform,
  getConstellationPanZoom: () => ({ cPanX, cPanY, cZoom }),
  setConstellationPanZoom: (px, py, pz) => { cPanX = px; cPanY = py; cZoom = pz; },
  showToast,
  renderCamp,
  sfx
});

initInputListeners();

Object.assign(window, {
  ac, audio, tone, noise, SFX, sfx, MUS, musicStep, startMusic, muted,
  resize, matCache, mat, boxGeo, box, limb, shadowGeo, shadowMat, addShadow,
  buildWeaponOnGroup, buildWeapon, makeEnemy, updEnemy, makeProj, updProj,
  makeOrb, updOrb, makeLoot, updLoot, makePart, updPart, makeEffect, updEffect,
  navSelect, openPanel, closePanel, setCampTab, selectItem, toggleCart, sortInv, autoEquip,
  confirmSellCart, addRarityToCart, addAllSurplusToCart, upgradeItem, rerollItem, fuseFour,
  updateSecretConfig, autoSortLoot, withdrawSecretItem, setStashView, setSecretTab, renderCamp, toggleAutoSellJunk, handleChestItemClick,
  selectDhdRing, rotateDhdRing, activateDhdPortal, exitDhdDialing,
  startRun, openCamp, replayLastMode, returnCampFromEnd,
  toggleCamTuner, updateCamTuner, resetCamConfig, copyCamConfig,
  buySkill, refundSkillIndividual, cycleSlot, resetConstellation, centerConstellation, closeConstellation, toggleConstellationLock, resolveWeaponSwap,
  showConstellationTip, moveConstellationTip, hideConstellationTip,
  toggleMute, toggleQ, resetSave, skipCurseAltar, pickCurse, setPact,
  equipItem, unassignSlot, triggerDash, castSkill, interact,
  onDragItem, onDropEquip, showItemTooltip, moveItemTooltip, hideItemTooltip,
  setCampThemeSelection, cycleCampTheme
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  gameT += dt;
  const gpMove = pollGamepad(dt);
  const move = touch.on ? { mx: touch.x, mz: touch.z } : gpMove;
  if (hitStopT > 0) {
    hitStopT = Math.max(0, hitStopT - dt);
  } else if (gameState === 'COMBAT') {
    updateCombat(dt, move);
  } else if (gameState === 'CAMP') {
    updateCamp(dt, move);
  }
  updateSkillBar();
  renderScene();
  requestAnimationFrame(loop);
}

function bannerShow(title, sub) {
  const b = $('banner');
  b.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
}

const initMusic = () => {
  audio();
  startMusic(() => ({ gameState, isBoss: $('boss-hud').style.display === 'block' }));
};
window.addEventListener('pointerdown', initMusic, { once: true });
window.addEventListener('keydown', initMusic, { once: true });

setActiveWorldTheme(selectedCampTheme);
buildEnv(1);
applyCampTheme(selectedCampTheme);
syncThemeButtonLabel();
renderCamp();
$('loading').style.display = 'none';
bannerShow('BIENVENUE AU CAMP', 'Porte des Étoiles [F] · Compétences [E] · Forgeron [B]');
requestAnimationFrame(loop);

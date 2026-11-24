import { save } from '../core/state.js';
import { newItem } from '../engines/lootEngine.js';
import {
  runMode, endless, floorNo, wave, sector, sectorWave,
  BRIDGE_SECTORS, SECTOR_LEN, BRIDGE_HALF_W, DUNGEON_ROOMS, ROOM_HALF, roomCenterX, roomCenterZ,
  currentRoomType, setPuzzleState
} from '../core/runDirector.js';

export let enemies = new Array();
export let projectiles = new Array();
export let lootOrbs = new Array();
export let lootItems = new Array();

export function setEnemies(arr) { enemies = arr; }
export function setProjectiles(arr) { projectiles = arr; }
export function setLootOrbs(arr) { lootOrbs = arr; }
export function setLootItems(arr) { lootItems = arr; }

let hooks = {
  getLandNo: () => 1,
  getLands: () => [],
  getArenaH: () => 240,
  getPlayer: () => ({ x: 0, z: 0 }),
  hasCurse: () => false,
  sfx: () => {},
  bannerShow: () => {}
};

export function configureSpawnFactory(nextHooks) {
  hooks = { ...hooks, ...nextHooks };
}

export function clearEntities() {
  enemies = new Array();
  projectiles = new Array();
  lootOrbs = new Array();
  lootItems = new Array();
}

export function itemLevel() {
  const landNo = hooks.getLandNo();
  if (runMode === 'bridge') return 1 + sector * 3 + sectorWave;
  return endless ? Math.round(1 + floorNo * 2.2 + wave) : 1 + (landNo - 1) * 8 + wave;
}

export function sectorMinZ(sec) { return -(sec * SECTOR_LEN); }
export function sectorMaxZ(sec) { return -((sec - 1) * SECTOR_LEN); }

export function spawnEnemy(kind, fixedX, fixedZ) {
  const landNo = hooks.getLandNo();
  const land = hooks.getLands().at(landNo - 1);
  const pactMult = save.pact === 'titan' ? 1.35 : 1;
  const pactSpeed = (save.pact === 'haste' ? 1.3 : 1) * (hooks.hasCurse('fastMobs') ? 1.3 : 1);
  const curseHpMult = hooks.hasCurse('armoredMobs') ? 1.35 : 1;
  const curseDmgMult = hooks.hasCurse('heavyHits') ? 1.35 : 1;

  const waveHpStep = runMode === 'arena' ? (1 + 0.15 * (wave - 1)) : (1 + 0.25 * (wave - 1));
  const waveDmgStep = runMode === 'arena' ? (1 + 0.08 * (wave - 1)) : (1 + 0.12 * wave);
  const scaleStep = (runMode === 'bridge' ? (1 + sector * 0.35 + sectorWave * 0.15) : (land.lm * (endless ? Math.pow(1.2, floorNo - 1) : 1) * waveHpStep)) * pactMult * curseHpMult;
  const dmgScale = (runMode === 'bridge' ? Math.pow(1 + sector * 0.22, 0.85) : Math.pow(land.lm, 0.8) * waveDmgStep) * pactMult * curseDmgMult;

  const player = hooks.getPlayer();
  const ARENA_H = hooks.getArenaH();
  let ex = fixedX, ez = fixedZ;
  if (ex === undefined || ez === undefined) {
    if (runMode === 'bridge') {
      ex = (Math.random() * 2 - 1) * (BRIDGE_HALF_W - 8);
      ez = sectorMinZ(sector) + 14 + Math.random() * (SECTOR_LEN - 28);
    } else {
      const a = Math.random() * Math.PI * 2, dd = 120 + Math.random() * 50, lim = ARENA_H - 12;
      ex = player.x + Math.cos(a) * dd; ez = player.z + Math.sin(a) * dd;
      if (Math.abs(ex) > lim || Math.abs(ez) > lim) { ex = player.x - Math.cos(a) * dd; ez = player.z - Math.sin(a) * dd; }
      ex = Math.max(-lim, Math.min(lim, ex)); ez = Math.max(-lim, Math.min(lim, ez));
    }
  }

  const hpBase = 18 * scaleStep, dmgBase = 3 * dmgScale;
  const isMiniBoss = kind === 'guardian';
  const isBig = kind === 'boss' || isMiniBoss;
  const e = {
    kind: kind, x: ex, z: ez, atkCd: 0.6, flash: 0, slowT: 0,
    slamTimer: 3.5, slamTarget: null, enraged: false,
    telegraph: 0, aimX: player.x, aimZ: player.z, fuse: -1,
    w: 10, h: 12, col: land.col, col2: land.col2, stop: 11,
    isBoss: isBig, isMiniBoss: isMiniBoss, isRanged: kind === 'ranged', isBomber: kind === 'bomber'
  };
  if (kind === 'boss') Object.assign(e, { maxHp: Math.round(260 * scaleStep), speed: 24 * pactSpeed, dmg: Math.round(9 * dmgScale), w: 22, h: 26, stop: 18 });
  else if (kind === 'guardian') Object.assign(e, { maxHp: Math.round(170 * scaleStep), speed: 26 * pactSpeed, dmg: Math.round(7.5 * dmgScale), w: 19, h: 22, stop: 16, col: '#c05621', col2: '#fbd38d' });
  else if (kind === 'ranged') Object.assign(e, { maxHp: Math.round(hpBase * 0.75), speed: 22 * pactSpeed, dmg: Math.round(dmgBase * 1.15), w: 9, h: 12, stop: 95, col: '#9f7aea', col2: '#d6bcfa' });
  else if (kind === 'bomber') Object.assign(e, { maxHp: Math.round(hpBase * 0.65), speed: 46 * pactSpeed, dmg: Math.round(dmgBase * 2.2), w: 9, h: 11, stop: 14, col: '#dd6b20', col2: '#fbd38d' });
  else if (kind === 'runner') Object.assign(e, { maxHp: Math.round(hpBase * 0.6), speed: 52 * pactSpeed, dmg: Math.round(dmgBase * 0.7), w: 8, h: 10 });
  else if (kind === 'tank') Object.assign(e, { maxHp: Math.round(hpBase * 2.8), speed: 18 * pactSpeed, dmg: Math.round(dmgBase * 1.5), w: 15, h: 17, stop: 14 });
  else Object.assign(e, { maxHp: Math.round(hpBase), speed: (28 + Math.random() * 8) * pactSpeed, dmg: Math.round(dmgBase) });
  e.hp = e.maxHp;
  enemies.push(e);
}

export function spawnWave() {
  const $ = (id) => document.getElementById(id);
  if (runMode === 'bridge') {
    const isCastleGate = sector === BRIDGE_SECTORS && sectorWave === 2;
    const isMidBridgeGuardian = sector === 4 && sectorWave === 2;
    const maxW = 2;
    hooks.sfx('wave');
    if ($('hud-floor')) $('hud-floor').textContent = `PONT · SECTEUR ${sector}/${BRIDGE_SECTORS}`;
    if ($('hud-wave')) $('hud-wave').textContent = isCastleGate ? 'PORTE DU CHÂTEAU' : (isMidBridgeGuardian ? 'GARDIEN DU PONT' : `VAGUE ${sectorWave}/${maxW}`);
    if (isCastleGate) {
      hooks.bannerShow('🏰 PORTE DU CHÂTEAU', 'Gardien du Donjon');
      if ($('boss-title')) $('boss-title').textContent = '🏰 GARDIEN DE LA PORTE';
      if ($('boss-hud')) $('boss-hud').style.display = 'block';
      if ($('boss-hp-fill')) $('boss-hp-fill').style.width = '100%';
      spawnEnemy('boss', 0, sectorMinZ(sector) + 32);
      spawnEnemy('ranged', -24, sectorMinZ(sector) + 45);
      spawnEnemy('bomber', 24, sectorMinZ(sector) + 45);
      return;
    }
    if (isMidBridgeGuardian) {
      hooks.bannerShow('⚔️ GARDIEN DU PONT', 'Mini-boss du Secteur 4');
      if ($('boss-title')) $('boss-title').textContent = '⚔️ GARDIEN DU PONT (SECTEUR 4)';
      if ($('boss-hud')) $('boss-hud').style.display = 'block';
      if ($('boss-hp-fill')) $('boss-hp-fill').style.width = '100%';
      spawnEnemy('guardian', 0, sectorMinZ(sector) + 34);
      spawnEnemy('ranged', -20, sectorMinZ(sector) + 48);
      spawnEnemy('bomber', 20, sectorMinZ(sector) + 48);
      return;
    }
    if ($('boss-hud')) $('boss-hud').style.display = 'none';
    hooks.bannerShow(`SECTEUR ${sector}/${BRIDGE_SECTORS}`, `Vague ${sectorWave}/${maxW}`);
    const count = 4 + sector + sectorWave;
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const kind = r < 0.22 ? 'bomber' : (r < 0.44 ? 'ranged' : (r < 0.62 && sector >= 2 ? 'tank' : (r < 0.8 ? 'runner' : 'grunt')));
      const sx = (Math.random() * 2 - 1) * (BRIDGE_HALF_W - 8);
      const sz = sectorMinZ(sector) + 18 + Math.random() * (SECTOR_LEN - 36);
      spawnEnemy(kind, sx, sz);
    }
    return;
  }

  const landNo = hooks.getLandNo();
  const land = hooks.getLands().at(landNo - 1);
  const maxWaves = endless ? 3 : DUNGEON_ROOMS;
  hooks.sfx('wave');
  if ($('hud-floor')) $('hud-floor').textContent = endless ? `ÉTAGE ${floorNo} : ${land.n.toUpperCase()}` : `TERRE ${landNo} : ${land.n.toUpperCase()}`;

  const cx = roomCenterX();
  const cz = roomCenterZ();
  const spawnInRoom = (kind, rx, rz, isElite = false) => {
    const sx = cx + (rx !== undefined ? rx : (Math.random() * 2 - 1) * (ROOM_HALF - 18));
    const sz = cz + (rz !== undefined ? rz : (Math.random() * 2 - 1) * (ROOM_HALF - 18));
    spawnEnemy(kind, sx, sz);
    if (isElite && enemies.length > 0) {
      const e = enemies[enemies.length - 1];
      e.maxHp = Math.round(e.maxHp * 1.45);
      e.hp = e.maxHp;
      e.dmg = Math.round(e.dmg * 1.25);
      e.isElite = true;
      e.col2 = '#ffd700';
    }
  };

  if (!endless && wave === 5) {
    hooks.bannerShow('⚔️ GARDIEN INTERMÉDIAIRE', 'Épreuve de mi-parcours (Salle 5/10)');
    if ($('hud-wave')) $('hud-wave').textContent = 'GARDIEN 5/10';
    if ($('boss-title')) $('boss-title').textContent = '⚔️ GARDIEN DU DONJON';
    if ($('boss-hud')) $('boss-hud').style.display = 'block';
    if ($('boss-hp-fill')) $('boss-hp-fill').style.width = '100%';
    spawnInRoom('guardian', 0, -22);
    spawnInRoom('ranged', -26, -12);
    spawnInRoom('bomber', 26, -12);
    return;
  }

  if (!endless && wave === maxWaves) {
    hooks.bannerShow(`⚠️ ${land.boss.toUpperCase()} ⚠️`, 'Sanctuaire du Boss (Salle 10/10)');
    if ($('hud-wave')) $('hud-wave').textContent = 'BOSS 10/10';
    if ($('boss-title')) $('boss-title').textContent = `⚠️ ${land.boss.toUpperCase()} ⚠️`;
    if ($('boss-hud')) $('boss-hud').style.display = 'block';
    if ($('boss-hp-fill')) $('boss-hp-fill').style.width = '100%';
    spawnInRoom('boss', 0, -24);
    spawnInRoom('ranged', -28, -14);
    spawnInRoom('bomber', 28, -14);
    return;
  }

  if ($('boss-hud')) $('boss-hud').style.display = 'none';
  if ($('hud-wave')) $('hud-wave').textContent = endless ? `VAGUE ${wave}/${maxWaves}` : `SALLE ${wave}/${maxWaves}`;

  if (!endless && currentRoomType === 'sanctuary') {
    const p = hooks.getPlayer();
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.45);
    hooks.bannerShow('💖 SANCTUAIRE', '+45% PV restaurés · Trésor d\'or !');
    for (let b = -1; b <= 1; b++) {
      lootOrbs.push({ x: cx + b * 24, z: cz - 12, amount: 12 + landNo * 8 });
    }
    return;
  }

  if (!endless && currentRoomType === 'puzzle') {
    const runes = [
      { id: 0, name: 'ROUGE', col: '#f56565', x: cx - 32, z: cz - 12, hit: false },
      { id: 1, name: 'BLEU', col: '#63b3ed', x: cx, z: cz - 24, hit: false },
      { id: 2, name: 'OR', col: '#ffd700', x: cx + 32, z: cz - 12, hit: false }
    ];
    const order = [0, 1, 2].sort(() => Math.random() - 0.5);
    setPuzzleState({ runes, order, step: 0, solved: false });
    const seqText = order.map((idx) => runes[idx].name).join(' → ');
    hooks.bannerShow('🧩 ÉNIGME RUNIQUE', `Approche les cristaux dans l'ordre : ${seqText}`);
    return;
  }

  const isEliteRoom = !endless && currentRoomType === 'elite';
  hooks.bannerShow(
    endless ? `ÉTAGE ${floorNo}` : (isEliteRoom ? '👑 SALLE D\'ÉLITE' : `SALLE ${wave}/${maxWaves}`),
    isEliteRoom ? 'Ennemis renforcés · Butin Rare garanti !' : land.n.toUpperCase()
  );

  const count = endless ? 3 + wave * 2 + Math.floor(floorNo / 2) : (isEliteRoom ? 3 + landNo : 3 + wave + landNo);
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    const kind = r < 0.18 ? 'bomber' : (r < 0.36 ? 'ranged' : (landNo >= 2 && r < 0.5 ? 'tank' : (wave >= 2 && r < 0.72 ? 'runner' : 'grunt')));
    if (endless) spawnEnemy(kind);
    else spawnInRoom(kind, undefined, undefined, isEliteRoom && i < 2);
  }
}

export function createLootDrop(il, boost, forcedRar) {
  return newItem(il, boost, forcedRar);
}
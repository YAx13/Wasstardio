import { save, persist } from './state.js';
import { sellCart } from '../engines/merchantEngine.js';

export const BRIDGE_SECTORS = 8;
export const SECTOR_LEN = 120;
export const BRIDGE_HALF_W = 46;
export const DUNGEON_ROOMS = 10;
export const ROOM_HALF = 76;
export const ROOM_CORRIDOR = 28;
export const ROOM_STEP = ROOM_HALF * 2 + ROOM_CORRIDOR;

export const DIRS = {
  N: { id: 'N', dx: 0, dz: -1, opp: 'S', arrow: '↑' },
  W: { id: 'W', dx: -1, dz: 0, opp: 'E', arrow: '←' },
  E: { id: 'E', dx: 1, dz: 0, opp: 'W', arrow: '→' },
  S: { id: 'S', dx: 0, dz: 1, opp: 'N', arrow: '↓' }
};

export const ROOM_TYPES = [
  { id: 'combat', label: '⚔️ ESCARMOUCHE', col: '#68d391', hex: 0x48bb78 },
  { id: 'elite', label: '👑 ÉLITE (RARE+)', col: '#f6ad55', hex: 0xed8936 },
  { id: 'sanctuary', label: '💖 SANCTUAIRE (+PV)', col: '#63b3ed', hex: 0x4299e1 },
  { id: 'curse', label: '☠️ AUTEL MAUDIT', col: '#fc8181', hex: 0xe53e3e },
  { id: 'puzzle', label: '🧩 ÉNIGME RUNIQUE', col: '#d6bcfa', hex: 0x9f7aea }
];

export let gameState = 'CAMP';
export let runMode = 'arena';
export let lastRunMode = 'arena';
export let endless = false;
export let floorNo = 1;
export let wave = 1;
export let sector = 1;
export let sectorWave = 1;
export let currentRoomType = 'combat';
export let dungeonNodes = new Map();
export let currentRoomKey = '0,0';
export let activeDoors = [];
export let leftDoorChoice = null;
export let rightDoorChoice = null;
export let roomTransitionT = 0;
export let puzzleState = null;
export let runGold = 0;
export let ending = 0;
export let endMsg = '';
export let endVictory = false;
export let runItems = new Array();
export let activeWorldTheme = 'sakura';

export function setActiveWorldTheme(v) {
  activeWorldTheme = v || 'land1';
}

export function roomKey(gx, gz) { return `${gx},${gz}`; }
export function getActiveRoom() {
  return dungeonNodes.get(currentRoomKey) || { gx: 0, gz: 0, cx: 0, cz: 0, entryDir: null, exits: [] };
}
export function roomCenterX() { return getActiveRoom().cx; }
export function roomCenterZ() { return getActiveRoom().cz; }

export function setCurrentRoomType(v) { currentRoomType = v; }
export function setDoorChoices(l, r) { leftDoorChoice = l; rightDoorChoice = r; if (!l && !r) activeDoors = []; }
export function setRoomTransitionT(v) { roomTransitionT = v; }
export function setPuzzleState(v) { puzzleState = v; }

export function initDungeonGraph() {
  dungeonNodes = new Map();
  currentRoomKey = '0,0';
  activeDoors = [];
  dungeonNodes.set('0,0', { gx: 0, gz: 0, cx: 0, cz: 0, entryDir: null, exits: [], built: false });
}

export function enterDungeonRoom(gx, gz, entryDir, roomTypeId) {
  const k = roomKey(gx, gz);
  let node = dungeonNodes.get(k);
  if (!node) {
    node = { gx, gz, cx: gx * ROOM_STEP, cz: gz * ROOM_STEP, entryDir, exits: [], built: false };
    dungeonNodes.set(k, node);
  }
  currentRoomKey = k;
  currentRoomType = roomTypeId;
  activeDoors = [];
  leftDoorChoice = null;
  rightDoorChoice = null;
  puzzleState = null;
  return node;
}

export function rollNextDoorChoices(nextWave) {
  const cur = getActiveRoom();
  const candidates = ['W', 'N', 'E'].filter((dId) => {
    if (dId === cur.entryDir) return false;
    const d = DIRS[dId];
    return !dungeonNodes.has(roomKey(cur.gx + d.dx, cur.gz + d.dz));
  });
  const chosenDirs = (candidates.length >= 2 ? candidates : ['W', 'N', 'E'].filter((d) => d !== cur.entryDir))
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  const isBossNext = nextWave >= DUNGEON_ROOMS;
  const pool = ROOM_TYPES.slice().sort(() => Math.random() - 0.5);
  const bossChoice = { id: 'boss', label: '⚠️ SANCTUAIRE DU BOSS', col: '#ffd700', hex: 0xffd700 };

  activeDoors = chosenDirs.map((dId, idx) => {
    const d = DIRS[dId];
    const choice = isBossNext ? bossChoice : pool[idx % pool.length];
    return {
      dir: dId,
      arrow: d.arrow,
      targetGx: cur.gx + d.dx,
      targetGz: cur.gz + d.dz,
      choice
    };
  });
  cur.exits = activeDoors.map((ad) => ad.dir);
  leftDoorChoice = activeDoors[0] ? activeDoors[0].choice : null;
  rightDoorChoice = activeDoors[1] ? activeDoors[1].choice : null;
}

export function setGameState(v) { gameState = v; }
export function setRunMode(v) { runMode = v; }
export function setLastRunMode(v) { lastRunMode = v; }
export function setEndless(v) { endless = v; }
export function setFloorNo(v) { floorNo = v; }
export function setWave(v) { wave = v; }
export function setSector(v) { sector = v; }
export function setSectorWave(v) { sectorWave = v; }
export function setRunGold(v) { runGold = v; }
export function setEnding(v) { ending = v; }
export function setEndMsg(v) { endMsg = v; }
export function setEndVictory(v) { endVictory = v; }
export function setRunItems(arr) { runItems = arr; }

let hooks = {
  clearEntities: () => {},
  resetCurseRunState: () => {},
  resetStargateDial: () => {},
  getStats: () => ({ maxHP: 60, dashMaxCd: 1.4 }),
  lookColors: () => ({}),
  setLook: () => {},
  getPlayer: () => ({}),
  setCamPos: () => {},
  setDashCd: () => {},
  setDashMaxCd: () => {},
  setSkillCd: () => {},
  setAttackTimer: () => {},
  setRunKills: () => {},
  setHits: () => {},
  setCampPanelOpen: () => {},
  buildEnv: () => {},
  spawnWave: () => {},
  lootSummary: () => '',
  renderCamp: () => {},
  showToast: () => {},
  getLandNo: () => 1,
  setLandNo: () => {}
};

export function configureRunDirector(nextHooks) {
  hooks = { ...hooks, ...nextHooks };
}

export function startRun(mode) {
  runMode = mode || 'arena';
  lastRunMode = runMode;
  endless = runMode === 'endless';
  hooks.clearEntities();
  sellCart.clear();
  hooks.resetCurseRunState();
  hooks.resetStargateDial();
  save.stats.runs = (save.stats.runs || 0) + 1;
  floorNo = 1; sector = 1; sectorWave = 1; ending = 0; endVictory = false;
  initDungeonGraph();
  currentRoomType = 'combat'; leftDoorChoice = null; rightDoorChoice = null; roomTransitionT = 0; puzzleState = null;
  const nextLandNo = runMode === 'arena' ? save.landSel : (runMode === 'bridge' ? 2 : 1);
  hooks.setLandNo(nextLandNo);
  wave = 1; runGold = 0; hooks.setRunKills(0); hooks.setHits(0); runItems = new Array();
  const st = hooks.getStats(false);
  hooks.setLook(hooks.lookColors());
  const player = hooks.getPlayer();
  player.maxHp = st.maxHP; player.hp = st.maxHP;
  const startZ = runMode === 'bridge' ? -30 : (runMode === 'arena' ? 42 : 0);
  Object.assign(player, { x: 0, z: startZ, invuln: 0.5, dashT: 0, swingTime: 0, rage: 0, shield: 0, spin: 0 });
  hooks.setCamPos(0, startZ);
  hooks.setDashCd(0);
  hooks.setDashMaxCd(st.dashMaxCd);
  hooks.setSkillCd({ e: 0, r: 0, c: 0 });
  hooks.setAttackTimer(0.3);

  const $ = (id) => document.getElementById(id);
  if ($('camp-overlay')) $('camp-overlay').style.display = 'none';
  if ($('run-end-overlay')) $('run-end-overlay').style.display = 'none';
  if ($('altar-overlay')) $('altar-overlay').style.display = 'none';
  hooks.setCampPanelOpen(false);
  if ($('prompt')) $('prompt').style.display = 'none';
  if ($('wizard-guide')) $('wizard-guide').style.display = 'none';
  if (!save.seen) {
    save.seen = true;
    hooks.showToast('Attaque automatique ! Bouge : ZQSD · Esquive : Espace · Compétences : E / R / C', 7500);
    persist();
  }
  gameState = 'COMBAT';
  hooks.buildEnv(runMode === 'bridge' ? 4 : nextLandNo);
  hooks.spawnWave();
}

export function openCamp(msg) {
  gameState = 'CAMP'; ending = 0;
  const $ = (id) => document.getElementById(id);
  if ($('run-end-overlay')) $('run-end-overlay').style.display = 'none';
  if ($('altar-overlay')) $('altar-overlay').style.display = 'none';
  if ($('bridge-progress')) $('bridge-progress').style.display = 'none';
  const player = hooks.getPlayer();
  player.x = 0; player.z = 44; player.angle = -1.57; player.walkTime = 0; player.swingTime = 0; player.rage = 0; player.shield = 0;
  const sum = hooks.lootSummary();
  hooks.clearEntities();
  persist();
  if ($('boss-hud')) $('boss-hud').style.display = 'none';
  if ($('camp-status')) $('camp-status').textContent = msg + sum;
  hooks.setCampPanelOpen(false);
  if ($('camp-overlay')) $('camp-overlay').style.display = 'none';
  hooks.buildEnv(1);
  hooks.renderCamp();
  hooks.showToast(msg + sum, 6500);
}

export function replayLastMode() {
  const el = document.getElementById('run-end-overlay');
  if (el) el.style.display = 'none';
  startRun(lastRunMode);
}

export function returnCampFromEnd() {
  const el = document.getElementById('run-end-overlay');
  if (el) el.style.display = 'none';
  openCamp(endVictory ? 'Victoire ! De retour au camp.' : 'De retour au camp.');
}
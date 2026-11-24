import { S } from '../rendering/gameRender3D.js';
import {
  BRIDGE_SECTORS, BRIDGE_HALF_W, DUNGEON_ROOMS, ROOM_HALF, ROOM_STEP, DIRS,
  getActiveRoom, roomCenterX, roomCenterZ, activeDoors, enterDungeonRoom,
  gameState, runMode, endless, floorNo, wave, sector, sectorWave,
  currentRoomType, leftDoorChoice, rightDoorChoice, puzzleState,
  setCurrentRoomType, setDoorChoices, setPuzzleState, rollNextDoorChoices,
  setFloorNo, setWave, setSector, setSectorWave, setRunGold, setEnding, setEndMsg, setEndVictory,
  runGold, ending, endMsg, endVictory, runItems
} from '../core/runDirector.js';
import {
  enemies, projectiles, lootOrbs, lootItems,
  itemLevel, sectorMinZ, sectorMaxZ, spawnEnemy, spawnWave
} from '../entities/spawnFactory.js';
import { RAR, newItem } from './lootEngine.js';

export let playerHeightY = 0;
export function setPlayerHeightY(v) { playerHeightY = v; }

export let camPos = { x: 0, z: 0 };
export function setCamPos(x, z) { camPos.x = x; camPos.z = z; }

export let shake = 0;
export function setShake(v) { shake = v; }
export function addShake(v) { shake = Math.max(shake, v); }

export const occlusionRaycaster = new THREE.Raycaster();
export const occlusionOrigin = new THREE.Vector3();
export const occlusionDir = new THREE.Vector3();

let deps = null;
export function configurePhysicsEngine(d) {
  deps = d;
}

export function updateCombat(dt, gpMove) {
  if (!deps) return;
  const {
    $, save, keys, player, arenaPlatforms, arenaH, lands,
    hasCurse, getStats, performAutoAttack, damageEnemy, hurtPlayer,
    collectItem, burst, addFloatText, showRunEndScreen, showToast,
    maybeOpenCurseAltar, proceedAfterAltar, bannerShow, persist, sfx,
    getLandNo, setLandNo, buildEnv, getSkillCd, getDashCd, setDashCd,
    getDashMaxCd, getAttackTimer, setAttackTimer, getRunKills, setRunKills,
    effects, floatTexts, particles, openCamp
  } = deps;

  if ($('altar-overlay').style.display === 'flex') return;
  if (ending > 0) {
    setEnding(ending - dt);
    if (ending <= 0) {
      setEnding(0);
      if (endVictory) {
        showRunEndScreen(true, endMsg);
      } else {
        openCamp(endMsg);
      }
      return;
    }
  }

  const stats = getStats(true);
  if (stats.legs.has('berserk') && player.hp < player.maxHp * 0.5) stats.atk *= 1.35;
  if (stats.legs.has('regen')) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.012 * dt);

  let mx = gpMove.mx, mz = gpMove.mz;
  if (keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp')) mz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) mz += 1;
  if (keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;

  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= Math.max(1, len); mz /= Math.max(1, len);
    player.moveAngle = Math.atan2(mz, mx);
    player.angle = player.moveAngle;
    player.walkTime += dt * 16;
  } else {
    player.walkTime = 0;
  }

  let vx = mx, vz = mz, speed = stats.speed;
  if (player.dashT > 0) {
    player.dashT -= dt;
    speed = 280;
    vx = Math.cos(player.moveAngle);
    vz = Math.sin(player.moveAngle);
  }
  player.x += vx * speed * dt;
  player.z += vz * speed * dt;

  // --- Strict Boundary & Ramp Collision ---
  playerHeightY = 0;
  let onRampOrPlatform = false;

  if (Array.isArray(arenaPlatforms)) {
    for (const pf of arenaPlatforms) {
      const hx = player.x * S, hz = player.z * S;
      const marginX = 2, marginZ = 2;
      if (Math.abs(hx - pf.x * S) <= (pf.w * S / 2) + marginX && Math.abs(hz - pf.z * S) <= (pf.d * S / 2) + marginZ) {
        if (pf.isRamp) {
          const startZ = pf.z * S - pf.d * S / 2;
          const deltaZ = Math.max(0, Math.min(1, (hz - startZ) / (pf.d * S)));
          playerHeightY = pf.dirZ > 0 ? (1 - deltaZ) * pf.topY : deltaZ * pf.topY;
        } else {
          playerHeightY = pf.topY;
        }
        onRampOrPlatform = true;
        break;
      }
    }
  }

  if (runMode === 'bridge') {
    player.x = Math.max(-(BRIDGE_HALF_W - 4), Math.min(BRIDGE_HALF_W - 4, player.x));
    const minZ = sectorMinZ(sector) + 4;
    const maxZ = sectorMaxZ(sector) - 4;
    player.z = Math.max(minZ, Math.min(maxZ, player.z));
    const totalSteps = BRIDGE_SECTORS * 2;
    const doneSteps = (sector - 1) * 2 + (sectorWave - 1) + (enemies.length === 0 ? 1 : 0);
    const pct = Math.min(100, Math.round((doneSteps / totalSteps) * 100));
    $('bridge-progress').style.display = 'block';
    $('bp-label').textContent = `PONT · SECTEUR ${sector}/${BRIDGE_SECTORS}`;
    $('bp-pct').textContent = `${pct}% CHÂTEAU`;
    $('bp-fill').style.width = `${pct}%`;
  } else if (runMode === 'arena') {
    $('bridge-progress').style.display = 'none';
    const room = getActiveRoom();
    const cx = room.cx, cz = room.cz;
    const bound = ROOM_HALF - 6;
    const doorsOpen = activeDoors.length > 0;
    const corrHalfW = 10;

    let minX = cx - bound, maxX = cx + bound;
    let minZ = cz - bound, maxZ = cz + bound;

    if (doorsOpen) {
      for (const ad of activeDoors) {
        if (ad.dir === 'N' && Math.abs(player.x - cx) < corrHalfW) {
          minZ = cz - ROOM_STEP + ROOM_HALF - 10;
        } else if (ad.dir === 'W' && Math.abs(player.z - cz) < corrHalfW) {
          minX = cx - ROOM_STEP + ROOM_HALF - 10;
        } else if (ad.dir === 'E' && Math.abs(player.z - cz) < corrHalfW) {
          maxX = cx + ROOM_STEP - ROOM_HALF + 10;
        }
      }
    }

    // Keep player inside corridor rails while crossing between rooms
    if (player.z < cz - ROOM_HALF + 2) {
      minX = Math.max(minX, cx - corrHalfW + 1);
      maxX = Math.min(maxX, cx + corrHalfW - 1);
    }
    if (player.x < cx - ROOM_HALF + 2 || player.x > cx + ROOM_HALF - 2) {
      minZ = Math.max(minZ, cz - corrHalfW + 1);
      maxZ = Math.min(maxZ, cz + corrHalfW - 1);
    }

    player.x = Math.max(minX, Math.min(maxX, player.x));
    player.z = Math.max(minZ, Math.min(maxZ, player.z));

    // Check Rune Puzzle step-on crystals
    if (puzzleState && !puzzleState.solved) {
      for (const r of puzzleState.runes) {
        if (r.hit) continue;
        if (Math.hypot(player.x - r.x, player.z - r.z) < 12) {
          const expectedId = puzzleState.order[puzzleState.step];
          if (r.id === expectedId) {
            r.hit = true;
            puzzleState.step++;
            sfx('coin');
            addFloatText(r.x, r.z, `✔ ${r.name}`, r.col);
            burst(r.x, r.z, r.col, 12);
            if (puzzleState.step >= puzzleState.order.length) {
              puzzleState.solved = true;
              sfx('win');
              bannerShow('✨ ÉNIGME RÉSOLUE !', 'Coffre Rare débloqué !');
              lootItems.push({ x: cx, z: cz - 14, item: newItem(itemLevel(), 4, 3) });
              for (let g = 0; g < 4; g++) lootOrbs.push({ x: cx + (g - 1.5) * 10, z: cz - 8, amount: 15 });
            }
          } else {
            puzzleState.runes.forEach((ru) => { ru.hit = false; });
            puzzleState.step = 0;
            sfx('hurt');
            addFloatText(r.x, r.z, '✖ MAUVAIS ORDRE !', '#fc8181');
            showToast('Mauvaise rune ! Embuscade déclenchée !');
            setPuzzleState(null);
            spawnWave();
          }
          break;
        }
      }
    }

    // Check crossing into the next connected room via N, W, or E corridor
    if (doorsOpen) {
      for (const ad of activeDoors) {
        const entered =
          (ad.dir === 'N' && player.z <= cz - ROOM_STEP + ROOM_HALF - 8) ||
          (ad.dir === 'W' && player.x <= cx - ROOM_STEP + ROOM_HALF - 8) ||
          (ad.dir === 'E' && player.x >= cx + ROOM_STEP - ROOM_HALF + 8);
        if (entered) {
          const nextNode = enterDungeonRoom(ad.targetGx, ad.targetGz, DIRS[ad.dir].opp, ad.choice.id);
          setWave(wave + 1);
          player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.15);
          if (ad.choice.id === 'elite') {
            lootItems.push({ x: nextNode.cx, z: nextNode.cz - 20, item: newItem(itemLevel(), 3, 2) });
          }
          if (ad.choice.id === 'curse' && maybeOpenCurseAltar(`r_${wave}`)) {
            return;
          }
          spawnWave();
          return;
        }
      }
    }
  } else {
    $('bridge-progress').style.display = 'none';
    const boundLimit = (arenaH || 240) - 14;
    player.x = Math.max(-boundLimit, Math.min(boundLimit, player.x));
    player.z = Math.max(-boundLimit, Math.min(boundLimit, player.z));
  }

  if (player.swingTime > 0) player.swingTime -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  camPos.x += (player.x - camPos.x) * 10 * dt;
  camPos.z += (player.z - camPos.z) * 10 * dt;
  shake = Math.max(0, shake - dt * 14);

  let atkT = getAttackTimer() - dt;
  if (atkT <= 0) atkT = performAutoAttack(stats) ? stats.atkRate : 0.08;
  setAttackTimer(atkT);

  let dCd = getDashCd();
  if (dCd > 0) setDashCd(Math.max(0, dCd - dt));

  const skillCd = getSkillCd();
  skillCd.e = Math.max(0, skillCd.e - dt);
  skillCd.r = Math.max(0, skillCd.r - dt);
  skillCd.c = Math.max(0, skillCd.c - dt);

  if (player.rage > 0) player.rage = Math.max(0, player.rage - dt);
  if (player.shield > 0) player.shield = Math.max(0, player.shield - dt);

  const landNo = getLandNo();
  const il = itemLevel();
  const lm = runMode === 'bridge' ? (1 + sector * 0.4) : lands.at(landNo - 1).lm;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies.at(i);
    if (e.flash > 0) e.flash -= dt;
    if (e.hp <= 0) {
      setRunKills(getRunKills() + 1);
      lootOrbs.push({ x: e.x, z: e.z, amount: Math.round((e.isBoss ? 35 * lm : 2 + il) * stats.goldMult) });
      const drops = e.isBoss ? (e.isMiniBoss ? 2 : 3) : (Math.random() < 0.18 ? 1 : 0);
      for (let d = 0; d < drops; d++) {
        lootItems.push({
          x: e.x + (Math.random() - 0.5) * 14,
          z: e.z + (Math.random() - 0.5) * 8,
          item: newItem(il, e.isBoss ? 6 : 1, e.isMiniBoss && d === 0 ? 2 : undefined)
        });
      }
      burst(e.x, e.z, e.col, e.isBoss ? 30 : 8);
      if (e.isBoss) {
        save.stats.bosses = (save.stats.bosses || 0) + 1;
        addShake(6);
        sfx('win');
      }
      if (stats.lifeOnKillPct > 0) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * (stats.lifeOnKillPct / 100));
      if (stats.legs.has('nova')) {
        effects.push({ type: 'ring', x: e.x, z: e.z, r: 36, color: '#ed8936', life: 0.2, maxLife: 0.2 });
        for (const o of enemies) if (o !== e && Math.hypot(o.x - e.x, o.z - e.z) <= 36) damageEnemy(o, stats.atk * 0.6, false);
      }
      enemies.splice(i, 1);
      continue;
    }

    if (e.isBoss && !e.enraged && e.hp < e.maxHp * 0.5) {
      e.enraged = true;
      e.speed *= 1.4;
      if (!e.isMiniBoss && landNo === 1) {
        showToast('🟢 Roi Slime se divise en deux !');
        spawnEnemy('grunt', e.x - 18, e.z + 8);
        spawnEnemy('grunt', e.x + 18, e.z + 8);
        enemies.slice(-2).forEach((m) => { m.maxHp = Math.round(e.maxHp * 0.25); m.hp = m.maxHp; m.w = 14; m.h = 16; });
      } else if (!e.isMiniBoss && landNo === 3) {
        showToast('💀 Seigneur Squelette invoque sa garde !');
        spawnEnemy('runner', e.x - 20, e.z + 10);
        spawnEnemy('ranged', e.x + 20, e.z + 10);
      } else {
        showToast('Le boss entre en rage !');
      }
    }

    const dx = player.x - e.x, dz = player.z - e.z, dist = Math.hypot(dx, dz);
    const sp = e.speed * (e.slowT > 0 ? 0.35 : 1);
    if (e.slowT > 0) e.slowT -= dt;

    if (e.isBomber) {
      if (e.fuse > 0) {
        e.fuse -= dt;
        if (e.fuse <= 0) {
          effects.push({ type: 'ring', x: e.x, z: e.z, r: 38, color: '#dd6b20', life: 0.3, maxLife: 0.3 });
          burst(e.x, e.z, '#f6ad55', 14);
          addShake(4);
          if (Math.hypot(player.x - e.x, player.z - e.z) <= 38) hurtPlayer(e.dmg, stats);
          for (const o of enemies) if (o !== e && Math.hypot(o.x - e.x, o.z - e.z) <= 38) damageEnemy(o, e.dmg * 0.8, false);
          enemies.splice(i, 1);
          continue;
        }
      } else {
        if (dist > e.stop) { e.x += (dx / dist) * sp * dt; e.z += (dz / dist) * sp * dt; }
        if (dist < 28) {
          e.fuse = 0.8;
          effects.push({ type: 'ring', x: e.x, z: e.z, r: 38, color: '#fbd38d', life: 0.8, maxLife: 0.8 });
        }
      }
    } else if (e.isRanged) {
      if (e.telegraph > 0) {
        e.telegraph -= dt;
        if (e.telegraph <= 0) {
          const ang = Math.atan2(e.aimZ - e.z, e.aimX - e.x);
          projectiles.push({ x: e.x, z: e.z, vx: Math.cos(ang) * 115, vz: Math.sin(ang) * 115, dmg: e.dmg, life: 1.8 });
          e.atkCd = 1.65;
        }
      } else {
        if (dist > e.stop) { e.x += (dx / dist) * sp * dt; e.z += (dz / dist) * sp * dt; }
        e.atkCd -= dt;
        if (e.atkCd <= 0 && dist < 175) {
          e.telegraph = 0.55;
          e.aimX = player.x;
          e.aimZ = player.z;
          effects.push({ type: 'ring', x: e.aimX, z: e.aimZ, r: 14, color: '#d6bcfa', life: 0.55, maxLife: 0.55 });
        }
      }
    } else {
      let navTargetX = player.x, navTargetZ = player.z;
      if (playerHeightY > 1.5 && Array.isArray(arenaPlatforms)) {
        let bestRamp = null, minRampDist = 9999;
        for (const pf of arenaPlatforms) {
          if (pf.isRamp) {
            const rDist = Math.hypot(pf.x - e.x, pf.z - e.z);
            if (rDist < minRampDist) { minRampDist = rDist; bestRamp = pf; }
          }
        }
        if (bestRamp) { navTargetX = bestRamp.x; navTargetZ = bestRamp.z; }
      }
      const tDx = navTargetX - e.x, tDz = navTargetZ - e.z, tDist = Math.hypot(tDx, tDz);
      if (tDist > e.stop) {
        e.x += (tDx / Math.max(1, tDist)) * sp * dt;
        e.z += (tDz / Math.max(1, tDist)) * sp * dt;
      } else {
        e.atkCd -= dt;
        if (e.atkCd <= 0) { hurtPlayer(e.dmg, stats); e.atkCd = 1.0; }
      }
    }

    // Keep enemies strictly inside active room / arena bounds
    if (runMode === 'arena') {
      const rCx = roomCenterX();
      const rCz = roomCenterZ();
      const rLim = ROOM_HALF - 8;
      e.x = Math.max(rCx - rLim, Math.min(rCx + rLim, e.x));
      e.z = Math.max(rCz - rLim, Math.min(rCz + rLim, e.z));
    }
    else if (runMode !== 'bridge') {
      const enemyBound = (arenaH || 240) - 14;
      e.x = Math.max(-enemyBound, Math.min(enemyBound, e.x));
      e.z = Math.max(-enemyBound, Math.min(enemyBound, e.z));
    }
    if (e.isBoss) {
      e.slamTimer -= dt;
      if (e.slamTimer <= 1.2 && !e.slamTarget) e.slamTarget = { x: player.x, z: player.z };
      if (e.slamTimer <= 0) {
        addShake(5);
        if (e.slamTarget && Math.hypot(player.x - e.slamTarget.x, player.z - e.slamTarget.z) <= 42) hurtPlayer(e.dmg * 2.2, stats);

        if (!e.isMiniBoss && landNo === 2) {
          // Ent Ancestral: 3-way sweeping root projectiles
          const baseA = Math.atan2(player.z - e.z, player.x - e.x);
          [-0.35, 0, 0.35].forEach((off) => {
            projectiles.push({ x: e.x, z: e.z, vx: Math.cos(baseA + off) * 125, vz: Math.sin(baseA + off) * 125, dmg: Math.round(e.dmg * 1.1), life: 1.9 });
          });
        } else if (!e.isMiniBoss && landNo === 3) {
          // Seigneur Squelette: 8-way radial frost-bolt nova
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            projectiles.push({ x: e.x, z: e.z, vx: Math.cos(a) * 110, vz: Math.sin(a) * 110, dmg: Math.round(e.dmg * 0.95), life: 2.0 });
          }
        }

        e.slamTarget = null;
        e.slamTimer = e.enraged ? 2.8 : 4.2;
      }
    }
  }

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles.at(i);
    p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt;

    if (p.friendly) {
      let consumed = false;
      for (const e of enemies) {
        if (p.hitIds && p.hitIds.has(e)) continue;
        if (Math.hypot(p.x - e.x, p.z - e.z) <= e.w / 2 + 7) {
          if (p.hitIds) p.hitIds.add(e);
          damageEnemy(e, p.dmg, Boolean(p.crit));
          const leechTotal = stats.leechPct + (stats.legs.has('vamp') ? 8 : 0);
          if (leechTotal > 0) player.hp = Math.min(player.maxHp, player.hp + p.dmg * (leechTotal / 100));

          if (p.kind === 'bolt') {
            effects.push({ type: 'ring', x: p.x, z: p.z, r: 28, color: '#d6bcfa', life: 0.22, maxLife: 0.22 });
            for (const o of enemies) if (o !== e && Math.hypot(o.x - p.x, o.z - p.z) <= 28) damageEnemy(o, p.dmg * 0.5, false);
          }

          p.pierce = (p.pierce || 1) - 1;
          if (p.pierce <= 0) { consumed = true; break; }
        }
      }
      if (consumed || p.life <= 0) projectiles.splice(i, 1);
      continue;
    }

    if (Math.hypot(p.x - player.x, p.z - player.z) < 9) {
      hurtPlayer(p.dmg, stats);
      projectiles.splice(i, 1);
      continue;
    }
    if (p.life <= 0) projectiles.splice(i, 1);
  }

  for (let i = 0; i < enemies.length; i++) {
    const a = enemies.at(i);
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies.at(j), dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = (a.w + b.w) * 0.45;
      if (d > 0.01 && d < min) {
        const push = (min - d) * 0.5;
        a.x -= (dx / d) * push; a.z -= (dz / d) * push;
        b.x += (dx / d) * push; b.z += (dz / d) * push;
      }
    }
  }

  const clear = enemies.length === 0;
  for (let i = lootOrbs.length - 1; i >= 0; i--) {
    const o = lootOrbs.at(i), dx = player.x - o.x, dz = player.z - o.z, d = Math.hypot(dx, dz);
    if (d < 48 || clear) {
      o.x += (dx / Math.max(1, d)) * (clear ? 220 : 130) * dt;
      o.z += (dz / Math.max(1, d)) * (clear ? 220 : 130) * dt;
    }
    if (d < 9) {
      save.gold += o.amount;
      setRunGold(runGold + o.amount);
      sfx('coin');
      if ($('hud-gold')) $('hud-gold').textContent = `OR : ${save.gold}`;
      if ($('top-gold-val')) $('top-gold-val').textContent = `OR : ${save.gold}`;
      lootOrbs.splice(i, 1);
    }
  }

  for (let i = lootItems.length - 1; i >= 0; i--) {
    const li = lootItems.at(i), dx = player.x - li.x, dz = player.z - li.z, d = Math.hypot(dx, dz);
    if (d < 40 || clear) {
      li.x += (dx / Math.max(1, d)) * (clear ? 220 : 110) * dt;
      li.z += (dz / Math.max(1, d)) * (clear ? 220 : 110) * dt;
    }
    if (d < 9) { collectItem(li.item); lootItems.splice(i, 1); }
  }

for (let i = effects.length - 1; i >= 0; i--) {
  const ef = effects.at(i);
  ef.life -= dt;
  if (ef.life <= 0) effects.splice(i, 1);
}
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const ft = floatTexts.at(i);
    ft.y += 18 * dt; ft.life -= dt;
    if (ft.life <= 0) floatTexts.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles.at(i);
    pt.x += pt.vx * dt; pt.z += pt.vz * dt;
    pt.y = Math.max(0, pt.y + pt.vy * dt);
    pt.vy -= (pt.g === undefined ? 140 : pt.g) * dt;
    pt.life -= dt;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  $('hp-fill').style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
  $('hp-text').textContent = `PV ${Math.ceil(Math.max(0, player.hp))}/${player.maxHp}`;
  const dMax = getDashMaxCd();
  const dCur = getDashCd();
  const dashPct = dMax > 0 ? Math.max(0, Math.min(100, (1 - dCur / dMax) * 100)) : 100;
  $('dash-fill').style.width = `${dashPct}%`;
  $('dash-text').textContent = dCur <= 0 ? 'ESQUIVE PRÊTE (ESPACE)' : `ESQUIVE ${dCur.toFixed(1)}s`;

  if (player.hp <= 0) {
    sfx('lose');
    const detail = runMode === 'bridge' ? `secteur ${sector}/${BRIDGE_SECTORS}` : (endless ? `étage ${floorNo}` : `vague ${wave}`);
    showRunEndScreen(false, `Tu es tombé au ${detail}. Ton butin (+${runGold} or) est conservé.`);
  } else if (clear && ending <= 0 && lootOrbs.length === 0 && lootItems.length === 0) {
    if (runMode === 'bridge') {
      if (sector > save.bridgeBest) save.bridgeBest = sector;
      if (sector === BRIDGE_SECTORS && sectorWave === 2) {
        save.bridgeBest = BRIDGE_SECTORS;
        const bonus = 120;
        save.gold += bonus; setRunGold(runGold + bonus);
        setEndVictory(true);
        setEndMsg(`🏰 Entrée du Château atteinte ! Bonus +${bonus} or.`);
        setEnding(1.6);
        bannerShow('🏰 CHÂTEAU ATTEINT !', `+${bonus} or`);
      } else if (sectorWave < 2) {
        setSectorWave(sectorWave + 1);
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.15);
        spawnWave();
      } else {
        if (!maybeOpenCurseAltar(`b_${sector}`)) proceedAfterAltar();
      }
      persist();
    } else if (!endless && wave >= DUNGEON_ROOMS) {
      const bonus = 25 * lm;
      save.gold += bonus; setRunGold(runGold + bonus);
      if (landNo < lands.length && save.unlocked <= landNo) save.unlocked = landNo + 1;
      if (landNo === lands.length) save.won = true;
      setEndVictory(true);
      setEndMsg(`🏆 ${lands.at(landNo - 1).boss} vaincu ! Bonus +${bonus} or.`);
      setEnding(2.0);
      bannerShow('🏆 TERRE NETTOYÉE !', `+${bonus} or`);
    } else if (!endless && runMode === 'arena') {
      const puzzlePending = puzzleState && !puzzleState.solved;
      if (!puzzlePending && activeDoors.length === 0) {
        rollNextDoorChoices(wave + 1);
        bannerShow('PORTES OUVERTES !', activeDoors.map((d) => `${d.arrow} ${d.choice.label}`).join('   |   '));
      }
    } else if (endless && wave >= 3) {
      if (!maybeOpenCurseAltar(`e_${floorNo}`)) proceedAfterAltar();
    } else {
      setWave(wave + 1);
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.15);
      spawnWave();
    }
  }
}
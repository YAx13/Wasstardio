import { enemies, projectiles, lootOrbs, lootItems } from '../entities/spawnFactory.js';
import {
  S, matCache, boxGeo, shadowGeo, projMat, goldMat, shadowMat,
  makeEnemy, updEnemy, makeProj, updProj,
  makeOrb, updOrb, makeLoot, updLoot,
  makePart, updPart, makeEffect, updEffect
} from './gameRender3D.js';

export {
  makeEnemy, updEnemy, makeProj, updProj,
  makeOrb, updOrb, makeLoot, updLoot,
  makePart, updPart, makeEffect, updEffect
};

export const effects = [];
export const floatTexts = [];
export const particles = [];

export const mEnemies = new Map();
export const mProjs = new Map();
export const mEffects = new Map();
export const mOrbs = new Map();
export const mLoot = new Map();
export const mParts = new Map();
export const mTexts = new Map();

let ctx = {};
const projV = new THREE.Vector3();

export function configureFxVisualEngine(dependencies) {
  ctx = dependencies;
}

export function addFloatText(x, z, text, color) {
  floatTexts.push({ x, z, y: 18, text, color, life: 0.7 });
}

export function spawnPart(x, z, y, vx, vz, vy, life, color, g) {
  particles.push({ x, z, y, vx, vz, vy, life, color, g });
}

export function burst(x, z, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 20 + Math.random() * 50;
    particles.push({
      x,
      z,
      y: 6,
      vx: Math.cos(a) * s,
      vz: Math.sin(a) * s * 0.5,
      vy: 30 + Math.random() * 40,
      life: 0.4 + Math.random() * 0.3,
      color
    });
  }
}

export function makeText(ft) {
  const el = document.createElement('div');
  el.className = 'dmg';
  el.textContent = ft.text;
  el.style.color = ft.color;
  return el;
}

export function updText(el, ft) {
  projV.set(ft.x * S, 2.4 + (ft.y - 18) * S * 2, ft.z * S).project(ctx.camera);
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

export function sync(list, map, host, make, update) {
  for (const o of list) {
    let m = map.get(o);
    if (!m) {
      m = make(o);
      host.add(m);
      map.set(o, m);
    }
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

export function renderAllFx(scene, player, gameT) {
  const fxHost = {
    add: (el) => ctx.$('fx').appendChild(el),
    remove: (el) => el.remove()
  };
  sync(enemies, mEnemies, scene, (e) => makeEnemy(e, () => player, () => gameT), updEnemy);
  sync(projectiles, mProjs, scene, makeProj, updProj);
  sync(effects, mEffects, scene, makeEffect, (m, ef) => updEffect(m, ef, player));
  sync(lootOrbs, mOrbs, scene, makeOrb, (m, o) => updOrb(m, o, gameT));
  sync(lootItems, mLoot, scene, makeLoot, (m, li) => updLoot(m, li, gameT));
  sync(particles, mParts, scene, makePart, updPart);
  sync(floatTexts, mTexts, fxHost, makeText, updText);
}
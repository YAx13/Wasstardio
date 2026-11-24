import { RAR } from '../engines/lootEngine.js';

export const S = 0.125;

let renderer = null;
let scene = null;
let camera = null;
let sun = null;
let canvasEl = null;

export function initRender3D(canvas, onFatalError) {
  canvasEl = canvas;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    if (onFatalError) onFatalError(err);
    throw err;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 260);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667766, 0.9));

  sun = new THREE.DirectionalLight(0xfff1d0, 0.75);
  sun.position.set(-10, 22, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0008;
  const sc = sun.shadow.camera;
  sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 70;
  scene.add(sun);
  scene.add(sun.target);

  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, sun };
}

export function getRenderContext() {
  return { renderer, scene, camera, sun, canvas: canvasEl };
}

export function setRendererQuality(high) {
  if (!renderer) return;
  renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 1.5) : 0.75);
}

export function resize() {
  if (!renderer || !camera) return;
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

export const matCache = new Map();
export function mat(c) {
  const k = new THREE.Color(c).getHex();
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color: k }));
  return matCache.get(k);
}

export const boxGeo = new THREE.BoxGeometry(1, 1, 1);
export function box(w, h, d, c, x, y, z, parent) {
  const m = new THREE.Mesh(boxGeo, mat(c));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function limb(parent, x, y, z, w, h, d, c) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  box(w, h, d, c, 0, -h / 2, 0, p);
  parent.add(p);
  return p;
}

export const shadowGeo = new THREE.CircleGeometry(0.6, 16);
export const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 });
export function addShadow(g, r) {
  const s = new THREE.Mesh(shadowGeo, shadowMat);
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.04;
  s.scale.set(r, r, r);
  g.add(s);
}

export function buildWeaponOnGroup(grp, rg, c) {
  while (grp.children.length) grp.remove(grp.children.at(0));
  const wood = 0x8a5a2b;
  if (rg === 38) {
    box(0.1, 0.4, 0.1, wood, 0, -0.6, 0, grp);
    box(0.55, 0.12, 0.16, 0xc9a227, 0, -0.82, 0, grp);
    box(0.26, 1.3, 0.07, c, 0, -1.5, 0, grp);
    box(0.14, 0.18, 0.07, c, 0, -2.2, 0, grp);
  } else if (rg === 52) {
    box(0.1, 2.3, 0.1, wood, 0, -1.3, 0, grp);
    box(0.22, 0.5, 0.1, c, 0, -2.65, 0, grp);
  } else if (rg === 32) {
    box(0.1, 1.6, 0.1, wood, 0, -1.0, 0, grp);
    box(0.75, 0.5, 0.1, c, 0.3, -1.65, 0, grp);
  } else {
    box(0.14, 1.7, 0.14, wood, 0, -1.0, 0, grp);
    box(0.2, 0.3, 0.2, c, 0, -1.95, 0, grp);
  }
}

let plWeaponRef = null;
export function setPlayerWeaponGroup(grp) { plWeaponRef = grp; }
export function buildWeapon(rg, c) {
  if (plWeaponRef) buildWeaponOnGroup(plWeaponRef, rg, c);
}

export function makeEnemy(e, getPlayer, getGameT) {
  const g = new THREE.Group(), f = new THREE.Group(), sz = e.w * S * 1.35;
  g.add(f);
  addShadow(g, sz * 1.3);
  const body = box(sz, sz * 0.9, sz, e.col, 0, sz * 0.45, 0, f);
  box(sz * 0.7, sz * 0.2, sz * 0.7, e.col2, 0, sz * 0.95, 0, f);
  box(sz * 0.26, sz * 0.3, 0.05, 0xffffff, -sz * 0.22, sz * 0.58, sz / 2 + 0.01, f);
  box(sz * 0.26, sz * 0.3, 0.05, 0xffffff, sz * 0.22, sz * 0.58, sz / 2 + 0.01, f);
  box(sz * 0.12, sz * 0.2, 0.05, 0x111111, -sz * 0.2, sz * 0.56, sz / 2 + 0.05, f);
  box(sz * 0.12, sz * 0.2, 0.05, 0x111111, sz * 0.2, sz * 0.56, sz / 2 + 0.05, f);
  if (e.isRanged) box(sz * 0.85, sz * 0.25, sz * 0.85, 0x6b46c1, 0, sz * 1.08, 0, f);
  if (e.isBomber) box(sz * 0.45, sz * 0.45, sz * 0.45, 0xf56565, 0, sz * 1.15, 0, f);
  if (e.kind === 'tank') {
    for (let i = -1; i <= 1; i++) box(sz * 0.14, sz * 0.3, sz * 0.14, 0xdddddd, i * sz * 0.25, sz * 1.1, 0, f);
  }
  if (e.kind === 'runner') {
    box(sz * 0.12, sz * 0.3, sz * 0.12, e.col2, -sz * 0.28, sz * 1.1, 0, f);
    box(sz * 0.12, sz * 0.3, sz * 0.12, e.col2, sz * 0.28, sz * 1.1, 0, f);
  }
  if (e.isElite) {
    box(sz * 0.65, sz * 0.22, sz * 0.65, 0xffd700, 0, sz * 1.14, 0, f);
  }
  if (e.isBoss) {
    box(sz * 0.8, sz * 0.25, sz * 0.8, 0xffd700, 0, sz * 1.15, 0, f);
    box(sz * 0.14, sz * 0.4, sz * 0.14, 0xb91c1c, -sz * 0.45, sz * 1.1, 0, f);
    box(sz * 0.14, sz * 0.4, sz * 0.14, 0xb91c1c, sz * 0.45, sz * 1.1, 0, f);
    const sl = new THREE.Mesh(
      new THREE.CircleGeometry(42 * S, 32),
      new THREE.MeshBasicMaterial({ color: 0xe53e3e, transparent: true, opacity: 0.4 })
    );
    sl.rotation.x = -Math.PI / 2;
    sl.position.y = 0.08;
    sl.visible = false;
    g.add(sl);
    g.userData.slam = sl;
  }
  if (!e.isBoss) {
    const hpW = Math.max(1.2, sz * 1.15);
    const hpGrp = new THREE.Group();
    hpGrp.position.set(0, sz * 1.38, 0);
    hpGrp.rotation.x = -0.65;
    hpGrp.visible = false;

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(hpW + 0.14, 0.24),
      new THREE.MeshBasicMaterial({ color: 0x0b0d12, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
    );
    hpGrp.add(bg);

    const fillMat = new THREE.MeshBasicMaterial({ color: 0x48bb78, side: THREE.DoubleSide });
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(hpW, 0.14), fillMat);
    fill.position.z = 0.01;
    hpGrp.add(fill);

    g.add(hpGrp);
    g.userData.hpGrp = hpGrp;
    g.userData.hpFill = fill;
    g.userData.hpFillMat = fillMat;
    g.userData.hpW = hpW;
  }

  g.userData.f = f;
  g.userData.body = body;
  g.userData.base = mat(e.col);
  g.userData.getPlayer = getPlayer;
  g.userData.getGameT = getGameT;
  return g;
}

export function updEnemy(g, e) {
  const player = g.userData.getPlayer ? g.userData.getPlayer() : { x: 0, z: 0 };
  const gameT = g.userData.getGameT ? g.userData.getGameT() : 0;
  g.position.set(e.x * S, 0, e.z * S);
  const dx = player.x - e.x, dz = player.z - e.z;
  g.userData.f.rotation.y = Math.PI / 2 - Math.atan2(dz, dx);
  const blink = e.fuse > 0 && Math.floor(gameT * 24) % 2 === 0;
  const hitSquash = e.flash > 0 ? 1.2 : 1;
  g.userData.f.scale.x = hitSquash;
  g.userData.f.scale.z = hitSquash;
  g.userData.f.scale.y = (1 + Math.sin(gameT * 8 + e.x) * 0.07) * (blink ? 1.25 : 1) * (e.flash > 0 ? 0.82 : 1);
  g.userData.body.material = (e.flash > 0 || blink)
    ? mat(0xffffff)
    : (e.telegraph > 0 ? mat(0xf6ad55) : (e.slowT > 0 ? mat(0x9be7ff) : (e.enraged ? mat(0xe53e3e) : g.userData.base)));
  const hpGrp = g.userData.hpGrp;
  if (hpGrp) {
    const ratio = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
    hpGrp.visible = ratio < 0.999 && ratio > 0;
    if (hpGrp.visible) {
      const fill = g.userData.hpFill;
      fill.scale.x = Math.max(0.01, ratio);
      fill.position.x = -g.userData.hpW * 0.5 * (1 - ratio);
      g.userData.hpFillMat.color.setHex(ratio > 0.5 ? 0x48bb78 : (ratio > 0.25 ? 0xed8936 : 0xf56565));
    }
  }
  const sl = g.userData.slam;
  if (sl) {
    sl.visible = Boolean(e.slamTarget);
    if (e.slamTarget) sl.position.set(e.slamTarget.x * S - g.position.x, 0.08, e.slamTarget.z * S - g.position.z);
  }
}

export const projMat = new THREE.MeshBasicMaterial({ color: 0xd6bcfa });
export const arrowMat = new THREE.MeshBasicMaterial({ color: 0xf6e05e });
export const boltMat = new THREE.MeshBasicMaterial({ color: 0x63b3ed });
export function makeProj(p) {
  const isArrow = p && p.kind === 'arrow';
  const isBolt = p && p.kind === 'bolt';
  const m = new THREE.Mesh(boxGeo, isArrow ? arrowMat : (isBolt ? boltMat : projMat));
  if (isArrow) m.scale.set(0.16, 0.16, 1.15);
  else if (isBolt) m.scale.set(0.55, 0.55, 0.55);
  else m.scale.set(0.36, 0.36, 0.36);
  return m;
}
export function updProj(m, p) {
  m.position.set(p.x * S, 1.0, p.z * S);
  if (p.kind === 'arrow') m.rotation.y = Math.atan2(p.vx, p.vz);
  else m.rotation.y += 0.2;
}

export const goldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
export function makeOrb() {
  const m = new THREE.Mesh(boxGeo, goldMat);
  m.scale.set(0.35, 0.35, 0.35);
  return m;
}
export function updOrb(m, o, gameT = 0) {
  m.position.set(o.x * S, 0.6 + Math.sin(gameT * 5) * 0.12, o.z * S);
  m.rotation.y = gameT * 3;
}

export function makeLoot(li) {
  const g = new THREE.Group(), col = RAR.at(li.item.r).c;
  const gem = box(0.55, 0.55, 0.55, 0xffffff, 0, 0, 0, g);
  gem.material = new THREE.MeshBasicMaterial({ color: col });
  if (li.item.r >= 2) {
    const b = box(0.25, 7, 0.25, 0xffffff, 0, 3.5, 0, g);
    b.material = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35 });
  }
  return g;
}
export function updLoot(g, li, gameT = 0) {
  g.position.set(li.x * S, 0.8 + Math.sin(gameT * 4) * 0.15, li.z * S);
  g.rotation.y = gameT * 2;
}

export function makePart(pt) {
  const m = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: pt.color }));
  m.scale.set(0.14, 0.14, 0.14);
  return m;
}
export function updPart(m, pt) {
  m.position.set(pt.x * S, pt.y * S + 0.2, pt.z * S);
}

export function makeEffect(ef) {
  const op = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false });
  const g = new THREE.Group();
  if (ef.type === 'whirl') {
    const mt = op(ef.color, 0.8), bm = op(0xe6ffff, 0.95);
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Mesh(new THREE.RingGeometry(ef.r * S * 0.5, ef.r * S, 20, 1, i * 2.09, 1.5), mt);
      a.rotation.x = -Math.PI / 2;
      a.position.y = 0.4 + i * 0.35;
      g.add(a);
    }
    for (let i = 0; i < 6; i++) {
      const an = i * Math.PI / 3, b = new THREE.Mesh(boxGeo, bm);
      b.scale.set(0.9, 0.12, 0.25);
      b.position.set(Math.cos(an) * ef.r * S * 0.85, 1.2, Math.sin(an) * ef.r * S * 0.85);
      b.rotation.y = Math.PI / 2 - an;
      g.add(b);
    }
    g.userData.follow = true;
    g.userData.upd = (k) => {
      g.rotation.y = k * Math.PI * 5;
      const s = 0.55 + Math.min(1, k * 3) * 0.45;
      g.scale.set(s, 1, s);
      mt.opacity = 0.8 * (1 - k * k);
      bm.opacity = 0.95 * (1 - k * k);
    };
    return g;
  }
  if (ef.type === 'quake') {
    const mt = op(0x3a2a1a, 0.9), dm = op(ef.color, 0.35), rm = op(0xffd9a0, 0.8), cg = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const an = i * 0.628 + Math.random() * 0.3, L = ef.r * S * (0.6 + Math.random() * 0.4);
      const c = new THREE.Mesh(boxGeo, mt);
      c.scale.set(L, 0.05, 0.22);
      c.position.set(Math.cos(an) * L / 2, 0.08, Math.sin(an) * L / 2);
      c.rotation.y = -an;
      cg.add(c);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dm);
    const rg = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40), rm);
    rg.rotation.x = -Math.PI / 2;
    rg.position.y = 0.12;
    g.add(cg); g.add(dome); g.add(rg);
    g.userData.upd = (k) => {
      const e = Math.min(1, k * 4), R = ef.r * S;
      dome.scale.set(R * e, R * 0.5 * e, R * e);
      rg.scale.set(R * e, R * e, 1);
      cg.scale.set(e, 1, e);
      dm.opacity = 0.35 * (1 - e * 0.5) * (1 - k);
      mt.opacity = 0.9 * (1 - k * k);
      rm.opacity = 0.8 * (1 - k);
    };
    return g;
  }
  if (ef.type === 'chain' && Array.isArray(ef.pts) && ef.pts.length >= 2) {
    const bm = op(ef.color, 0.95);
    for (let i = 0; i < ef.pts.length - 1; i++) {
      const p1 = ef.pts[i], p2 = ef.pts[i + 1];
      const dx = (p2.x - p1.x) * S, dz = (p2.z - p1.z) * S;
      const dist = Math.max(0.05, Math.hypot(dx, dz));
      const beam = new THREE.Mesh(boxGeo, bm);
      beam.scale.set(0.24, 0.24, dist);
      beam.position.set((p1.x + p2.x) * 0.5 * S, 1.1, (p1.z + p2.z) * 0.5 * S);
      beam.rotation.y = Math.atan2(dx, dz);
      g.add(beam);
    }
    g.userData.abs = true;
    g.userData.upd = (k) => { bm.opacity = 0.95 * (1 - k); };
    return g;
  }
  if (ef.type === 'heal' || ef.type === 'rage' || ef.type === 'shield') {
    const rm = op(ef.color, 0.75);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 32), rm);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    g.add(ring);
    g.userData.follow = true;
    g.userData.upd = (k) => {
      const pulse = 1 + Math.sin(k * Math.PI * 6) * 0.12;
      ring.scale.set(pulse, pulse, 1);
      rm.opacity = 0.75 * (1 - k * 0.5);
    };
    return g;
  }
  if (ef.type === 'frost') {
    const fm = op(ef.color, 0.55);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(ef.r * S, 36), fm);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.1;
    g.add(disc);
    g.userData.upd = (k) => {
      const s = 0.35 + 0.65 * Math.min(1, k * 3);
      disc.scale.set(s, s, 1);
      fm.opacity = 0.55 * (1 - k);
    };
    return g;
  }
  const ang = Number.isFinite(ef.a) ? ef.a : 0;
  const geo = ef.type === 'ring'
    ? new THREE.RingGeometry(ef.r * S * 0.85, ef.r * S, 40)
    : new THREE.RingGeometry(ef.r * S * 0.35, ef.r * S, 24, 1, -ang - 1.2, 2.4);
  const m = new THREE.Mesh(geo, op(ef.color, 0.8));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function updEffect(m, ef, player) {
  const k = 1 - Math.max(0, ef.life / ef.maxLife);
  if (m.userData.follow && player) m.position.set(player.x * S, 0.05, player.z * S);
  else if (m.userData.abs) m.position.set(0, 0, 0);
  else m.position.set(ef.x * S, 0.15, ef.z * S);
  if (m.userData.upd) { m.userData.upd(k, ef); return; }
  if (ef.type === 'ring') {
    const s = 0.45 + 0.55 * Math.min(1, k * 2.5);
    m.scale.set(s, s, 1);
  }
  m.material.opacity = 0.8 * Math.max(0, ef.life / ef.maxLife);
}
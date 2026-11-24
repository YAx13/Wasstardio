import {
  BRIDGE_SECTORS, SECTOR_LEN, BRIDGE_HALF_W, DUNGEON_ROOMS, ROOM_HALF, ROOM_STEP, DIRS,
  gameState, runMode, sector, dungeonNodes, activeDoors, activeWorldTheme
} from '../core/runDirector.js';
import { S, mat, boxGeo, box } from '../rendering/gameRender3D.js';

let ctx = {};
export let envGroup = null;
export let clouds = [];
export let motes = [];
export let moteMesh = null;
export let campRefs = null;
export let currentCampTheme = 'land1';
export let campOccluders = [];
export let arenaPlatforms = [];

let envLand = 0;
let envAnims = [];
let themePropsGroup = null;
let themePropGeos = [];
let themePropMats = [];
const moteD = new THREE.Object3D();

const GROUND = [0x58b84a, 0x8a7a45, 0x5d6b82, 0x2b4257];
const ARENAC = [0x69c957, 0x9c8b52, 0x74849c, 0x7a5c3a];
const SKYC = [0xcfeaff, 0xf0d9a0, 0x2a3350, 0x567799];
const TOPC = ['#4f9fe8', '#b9803f', '#090b16', '#283d54'];

export const CAMP_THEMES = {
  land1: {
    sky: 'linear-gradient(#4f9fe8 0%, #9fd4ff 45%, #cfeaff 100%)',
    fog: 0xb8defc, sunCol: 0xfff3d6, sunInt: 0.92,
    tileA: 0x526158, tileB: 0x627368,
    wallMain: 0x56616e, wallBase: 0x434c57, wallTrim: 0x768394,
    pillarBody: 0x647080, pillarFlute: 0x4b5563, pillarCap: 0x8290a3,
    torchCol: 0xff9d2e, lightCol: 0xffb35c, lightInt: 0.85, moteCol: 0xfff3a0
  },
land2: {
    sky: 'linear-gradient(#0c2230 0%, #163a4a 52%, #1d4e5e 100%)',
    fog: 0x153545, sunCol: 0x9be7ff, sunInt: 0.85,
    tileA: 0x2a3742, tileB: 0x364654,
    wallMain: 0x7c5332, wallBase: 0x4a311e, wallTrim: 0x9e6c43,
    pillarBody: 0x5e4129, pillarFlute: 0x3d2919, pillarCap: 0xb07c4f,
    torchCol: 0xff9d2e, lightCol: 0x4fd1c5, lightInt: 1.1, moteCol: 0x7ef9ea,
    props: 'forest_cyan'
  }, 
land3: {
    sky: 'linear-gradient(#0a0c1a 0%, #161830 52%, #241838 100%)',
    fog: 0x18152e, sunCol: 0xd6bcfa, sunInt: 0.72,
    tileA: 0x161a24, tileB: 0x222836,
    wallMain: 0x2a2f3d, wallBase: 0x181b24, wallTrim: 0x434b61,
    pillarBody: 0x353b4d, pillarFlute: 0x212530, pillarCap: 0x56607a,
    torchCol: 0xf97316, lightCol: 0xd946ef, lightInt: 1.1, moteCol: 0xe879f9,
    props: 'neon_lanterns'
  },
    endless: {
    sky: 'linear-gradient(#0b081c 0%, #1c143d 45%, #2d1f5e 100%)',
    fog: 0x221747, sunCol: 0xc4a8ff, sunInt: 0.62,
    tileA: 0x352c54, tileB: 0x433869,
    wallMain: 0x382e59, wallBase: 0x282042, wallTrim: 0x5b4b8a,
    pillarBody: 0x463a6e, pillarFlute: 0x31284f, pillarCap: 0x6e5ca6,
    torchCol: 0xb794f4, lightCol: 0xd6bcfa, lightInt: 0.95, moteCol: 0xd6bcfa
  },
  bridge: {
    sky: 'linear-gradient(#141c2b 0%, #24344d 45%, #374f73 100%)',
    fog: 0x293b57, sunCol: 0xb8d4ff, sunInt: 0.72,
    tileA: 0x2a313d, tileB: 0x353e4d,
    wallMain: 0x29303b, wallBase: 0x1e232b, wallTrim: 0x434f61,
    pillarBody: 0x343d4c, pillarFlute: 0x232933, pillarCap: 0x526075,
    torchCol: 0x4299e1, lightCol: 0x63b3ed, lightInt: 1.0, moteCol: 0x90cdf4
  },
  sakura: {
    sky: 'linear-gradient(#121426 0%, #241838 52%, #3b1c36 100%)',
    fog: 0x221733, sunCol: 0xffb6d9, sunInt: 0.72,
    tileA: 0x1a1f2b, tileB: 0x262d3d,
    wallMain: 0x6e1b24, wallBase: 0x3b1118, wallTrim: 0x9c2b38,
    pillarBody: 0x541822, pillarFlute: 0x361017, pillarCap: 0xb83746,
    torchCol: 0xff85b3, lightCol: 0xff7eb6, lightInt: 1.05, moteCol: 0xffb7d5,
    props: 'sakura'
  }
};

export function configureWorldFactory(dependencies) {
  ctx = dependencies;
  envGroup = new THREE.Group();
  ctx.scene.add(envGroup);
}

export function updateWorldEnvironment(camera, gameT) {
  clouds.forEach((c) => {
    c.position.x += 0.015;
    if (c.position.x > 110) c.position.x = -110;
  });
  if (moteMesh) {
    motes.forEach((m, i) => {
      moteD.position.set(m.x + camera.position.x, m.y + Math.sin(gameT * 2 + m.p) * 0.4, m.z + camera.position.z);
      moteD.scale.setScalar(0.08 + Math.sin(gameT * 3 + m.p) * 0.02);
      moteD.updateMatrix();
      moteMesh.setMatrixAt(i, moteD.matrix);
    });
    moteMesh.instanceMatrix.needsUpdate = true;
  }
  envAnims.forEach((fn) => fn(gameT));
}

export function addMotes(col) {
  moteMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshBasicMaterial({ color: col }), 70);
  for (let i = 0; i < 70; i++) {
    motes.push({ x: (Math.random() - 0.5) * 60, y: 0.6 + Math.random() * 5, z: (Math.random() - 0.5) * 60, p: Math.random() * 6 });
  }
  envGroup.add(moteMesh);
}

export function addClouds() {
  const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(boxGeo, cm);
      b.scale.set(8 + Math.random() * 8, 2.5, 5 + Math.random() * 4);
      b.position.set(k * 5 - 8, Math.random() * 1.5, Math.random() * 3);
      c.add(b);
    }
    c.position.set((Math.random() - 0.5) * 190, 19 + Math.random() * 5, -50 - Math.random() * 50);
    envGroup.add(c);
    clouds.push(c);
  }
}

export function tree(x, z, n, occluders = null) {
  const { pick } = ctx;
  const h = 2.6 + Math.random() * 3.0;
  const g = new THREE.Group();
  const lc = n === 1 ? [0x2f8f3a, 0x3aa845, 0x287a32] : [0xd9822b, 0xb35a1f, 0xc9a227];
  const parts = [
    box(1.1, h, 1.1, 0x6b3f1d, 0, h / 2, 0, g),
    box(4.6, 2.0, 4.6, pick(lc), 0, h + 0.4, 0, g),
    box(3.2, 1.8, 3.2, pick(lc), 0, h + 2.1, 0, g),
    box(1.8, 1.4, 1.8, pick(lc), 0, h + 3.5, 0, g)
  ];
  if (occluders) {
    parts.forEach((p) => {
      p.material = p.material.clone();
      p.material.transparent = true;
      p.material.opacity = 1.0;
      occluders.push(p);
    });
  }
  g.position.set(x, 0, z);
  envGroup.add(g);
}

export function buildBridgeEnv() {
  const totalLen = BRIDGE_SECTORS * SECTOR_LEN * S;
  const w = BRIDGE_HALF_W * S * 2;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat(0x234c6e));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -2.2;
  envGroup.add(water);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, totalLen + 10), mat(0x7c5834));
  deck.position.set(0, -0.25, -totalLen / 2 + 2);
  deck.receiveShadow = true;
  envGroup.add(deck);

  for (let z = 2; z >= -totalLen - 2; z -= 2.2) {
    box(0.6, 1.1, 1.8, 0x5c4024, -w / 2 + 0.3, 0.55, z, envGroup);
    box(0.6, 1.1, 1.8, 0x5c4024, w / 2 - 0.3, 0.55, z, envGroup);
  }
  const gates = [];
  for (let s = 1; s <= BRIDGE_SECTORS; s++) {
    const sz = -s * SECTOR_LEN * S;
    box(1.4, 5.5, 1.4, 0x5a6270, -w / 2 + 0.5, 2.75, sz, envGroup);
    box(1.4, 5.5, 1.4, 0x5a6270, w / 2 - 0.5, 2.75, sz, envGroup);
    box(w, 0.6, 0.8, 0x8a6d2f, 0, 5.4, sz, envGroup);
    const portcullis = box(w - 1.2, 3.6, 0.3, 0x4a5568, 0, 1.8, sz, envGroup);
    gates.push({ sec: s, mesh: portcullis });
  }
  envAnims.push(() => {
    gates.forEach((g) => {
      const open = sector > g.sec;
      const targetY = open ? 4.4 : 1.8;
      g.mesh.position.y += (targetY - g.mesh.position.y) * 0.1;
    });
  });

  const gateZ = -totalLen - 4;
  const castle = new THREE.Group();
  box(16, 11, 6, 0x565d6b, 0, 5.5, 0, castle);
  box(4.2, 14, 4.5, 0x454b57, -7.5, 7, 0, castle);
  box(4.2, 14, 4.5, 0x454b57, 7.5, 7, 0, castle);
  box(5.5, 7, 6.4, 0x2c2017, 0, 3.5, 0, castle);
  for (let c = -6; c <= 6; c += 3) box(1.4, 1.4, 1.4, 0x3f4552, c, 11.7, 2.2, castle);
  castle.position.set(0, 0, gateZ);
  envGroup.add(castle);
  addMotes(0x90cdf4);
}

export function buildOutdoor(n, H) {
  const { pick } = ctx;
  const blocks = [];
  const d = new THREE.Object3D();
  for (let i = -H; i <= H; i += 2.2) {
    blocks.push({ x: i, z: -H - 1 }, { x: i, z: H + 1 }, { x: -H - 1, z: i }, { x: H + 1, z: i });
  }
const pal = getCombatThemePalette(n);
  const wm = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), blocks.length);
  const wc = [pal.wall, pal.trim, pal.arena];
  blocks.forEach((b, i) => {
    const h = 1.2 + Math.random() * 0.8;
    d.position.set(b.x, h / 2, b.z);
    d.scale.set(2.1, h, 2.1);
    d.rotation.y = 0;
    d.updateMatrix();
    wm.setMatrixAt(i, d.matrix);
    wm.setColorAt(i, new THREE.Color(pick(wc)));
  });  if (wm.instanceColor) wm.instanceColor.needsUpdate = true;
  wm.instanceMatrix.needsUpdate = true;
  wm.castShadow = true;
  wm.receiveShadow = true;
  envGroup.add(wm);

  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    const t = new THREE.Group();
    box(3.4, 8, 3.4, 0x7d838d, 0, 4, 0, t);
    box(4.2, 0.8, 4.2, 0x5f656f, 0, 8.2, 0, t);
    box(3, 1, 3, 0xb23a3a, 0, 9, 0, t);
    box(1.8, 1, 1.8, 0xb23a3a, 0, 10, 0, t);
    box(0.3, 1.5, 0.3, 0x5a3a22, 0, 11.2, 0, t);
    t.position.set(sx * (H + 1.5), 0, sz * (H + 1.5));
    envGroup.add(t);
  }));

  if (n === 1) {
    const w = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x3b82c4, transparent: true, opacity: 0.85 }));
    w.scale.set(10, 0.1, 7);
    w.position.set(-18, 0.06, 14);
    envGroup.add(w);
  }
  const count = 90;
  for (let i = 0; i < count; i++) {
    let x = 0, z = 0, tries = 0;
    do {
      x = (Math.random() * 2 - 1) * (H + 55);
      z = (Math.random() * 2 - 1) * (H + 55);
      tries++;
    } while (((Math.abs(x) < H + 4 && Math.abs(z) < H + 4)) && tries < 20);
    tree(x, z, n);
  }
  addClouds();
  addMotes(n === 1 ? 0xfff3a0 : 0xffb347);
}

export function buildCrypt(H) {
  const tiles = [];
  const d = new THREE.Object3D();
  const flames = [];
  for (let i = -14; i <= 14; i++) for (let j = -14; j <= 14; j++) tiles.push({ i, j });
  const tm = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), tiles.length);
  tiles.forEach((t, k) => {
    d.position.set(t.i * 2.05, 0.04, t.j * 2.05);
    d.scale.set(2, 0.05, 2);
    d.rotation.y = 0;
    d.updateMatrix();
    tm.setMatrixAt(k, d.matrix);
    tm.setColorAt(k, new THREE.Color([0x7584a0, 0x5e6b84].at(Math.abs(t.i + t.j) % 2)));
  });
  if (tm.instanceColor) tm.instanceColor.needsUpdate = true;
  tm.instanceMatrix.needsUpdate = true;
  tm.receiveShadow = true;
  envGroup.add(tm);

  [-1, 1].forEach((s) => {
    for (let k = -H; k < H; k += 6) {
      box(6.1, s < 0 ? 10 : 2.5, 2.2, 0x6b5a4a, k + 3, s < 0 ? 5 : 1.25, s * (H + 1.1), envGroup);
      box(2.2, 10, 6.1, 0x5c4d40, s * (H + 1.1), 5, k + 3, envGroup);
    }
  });
  envAnims.push((t) => {
    flames.forEach((f, i) => { f.scale.y = 0.5 + Math.sin(t * 12 + i * 1.7) * 0.15; });
  });
  addMotes(0x7fd0ff);
}

function trackPropGeo(geo) {
  themePropGeos.push(geo);
  return geo;
}

function trackPropMat(material) {
  themePropMats.push(material);
  return material;
}

export function clearThemeProps() {
  if (!themePropsGroup) return;
  while (themePropsGroup.children.length) {
    themePropsGroup.remove(themePropsGroup.children.at(0));
  }
  themePropGeos.forEach((g) => g.dispose());
  themePropMats.forEach((m) => m.dispose());
  themePropGeos = [];
  themePropMats = [];
}

function buildSakuraTree(group, x, y, z, scale = 1) {
  const treeGrp = new THREE.Group();
  const trunkMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x5a3622 }));
  const pinkDark = trackPropMat(new THREE.MeshLambertMaterial({ color: 0xd55b8a }));
  const pinkMid = trackPropMat(new THREE.MeshLambertMaterial({ color: 0xf48fb1 }));
  const pinkLight = trackPropMat(new THREE.MeshLambertMaterial({ color: 0xfbcfe8 }));

  const addVoxel = (w, h, d, vx, vy, vz, material) => {
    const m = new THREE.Mesh(boxGeo, material);
    m.scale.set(w, h, d);
    m.position.set(vx, vy, vz);
    m.castShadow = true;
    m.receiveShadow = true;
    treeGrp.add(m);
  };

  addVoxel(0.75, 3.2, 0.75, 0, 1.6, 0, trunkMat);
  addVoxel(0.42, 1.4, 0.42, -0.55, 2.7, 0.25, trunkMat);
  addVoxel(0.42, 1.3, 0.42, 0.55, 2.8, -0.2, trunkMat);

  addVoxel(2.8, 1.1, 2.4, 0, 3.5, 0, pinkDark);
  addVoxel(2.2, 1.1, 2.0, -0.65, 4.1, 0.3, pinkMid);
  addVoxel(2.1, 1.0, 1.9, 0.65, 4.2, -0.25, pinkMid);
  addVoxel(1.5, 0.9, 1.5, 0, 4.85, 0, pinkLight);

  treeGrp.scale.setScalar(scale);
  treeGrp.position.set(x, y, z);
  group.add(treeGrp);
}

function buildKoiPond(group, cx, cz, rx, rz, anims, phaseOffset = 0) {
  const pondGrp = new THREE.Group();
  const stoneMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x475569 }));
  const waterMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x1d6fa5, transparent: true, opacity: 0.85 }));
  const glowMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x4fd1c5 }));

  const water = new THREE.Mesh(trackPropGeo(new THREE.CircleGeometry(1, 24)), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.scale.set(rx, rz, 1);
  water.position.y = 0.045;
  pondGrp.add(water);

  const rim = new THREE.Mesh(trackPropGeo(new THREE.RingGeometry(0.92, 1.04, 24)), glowMat);
  rim.rotation.x = -Math.PI / 2;
  rim.scale.set(rx, rz, 1);
  rim.position.y = 0.06;
  pondGrp.add(rim);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const st = new THREE.Mesh(boxGeo, stoneMat);
    st.scale.set(0.62, 0.24, 0.56);
    st.position.set(Math.cos(a) * (rx + 0.12), 0.12, Math.sin(a) * (rz + 0.12));
    st.rotation.y = -a;
    st.castShadow = true;
    st.receiveShadow = true;
    pondGrp.add(st);
  }

  const koi1 = new THREE.Mesh(boxGeo, trackPropMat(new THREE.MeshBasicMaterial({ color: 0xff7b29 })));
  koi1.scale.set(0.22, 0.09, 0.52);
  koi1.position.y = 0.075;
  pondGrp.add(koi1);

  const koi2 = new THREE.Mesh(boxGeo, trackPropMat(new THREE.MeshBasicMaterial({ color: 0xffffff })));
  koi2.scale.set(0.2, 0.09, 0.46);
  koi2.position.y = 0.075;
  pondGrp.add(koi2);

  pondGrp.position.set(cx, 0, cz);
  group.add(pondGrp);

  anims.push((t) => {
    const a1 = t * 1.35 + phaseOffset;
    koi1.position.x = Math.cos(a1) * (rx * 0.48);
    koi1.position.z = Math.sin(a1) * (rz * 0.48);
    koi1.rotation.y = -a1;

    const a2 = -t * 1.1 + phaseOffset + 2.1;
    koi2.position.x = Math.cos(a2) * (rx * 0.42);
    koi2.position.z = Math.sin(a2) * (rz * 0.42);
    koi2.rotation.y = -a2 + Math.PI;
  });
}

function buildSakuraProps(group, anims) {
  const redShrineMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0xc53030 }));
  const darkRoofMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x1e2433 }));
  const screenGoldMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xe2a83e }));
  const screenFrameMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x2d241e }));
  const neonPinkMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xf472b6 }));
  const neonCyanMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));

  const addPropBox = (w, h, d, x, y, z, material) => {
    const m = new THREE.Mesh(boxGeo, material);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  };

  const shrine = new THREE.Group();
  const sBox = (w, h, d, x, y, z, matRef) => {
    const m = new THREE.Mesh(boxGeo, matRef);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    shrine.add(m);
  };
  sBox(3.4, 0.5, 2.6, 0, 0.25, 0, darkRoofMat);
  sBox(0.35, 3.6, 0.35, -1.25, 2.2, -0.7, redShrineMat);
  sBox(0.35, 3.6, 0.35, 1.25, 2.2, -0.7, redShrineMat);
  sBox(0.35, 3.4, 0.35, -1.25, 2.1, 0.7, redShrineMat);
  sBox(0.35, 3.4, 0.35, 1.25, 2.1, 0.7, redShrineMat);
  sBox(4.2, 0.45, 3.2, 0, 4.1, 0, redShrineMat);
  sBox(3.1, 0.4, 2.3, 0, 4.5, 0, darkRoofMat);
  shrine.position.set(-9.4, 0, -13.2);
  shrine.rotation.y = 0.25;
  group.add(shrine);

  for (let i = 0; i < 3; i++) {
    const px = -5.6 + i * 1.45;
    const pz = -15.8 - (i % 2) * 0.25;
    addPropBox(1.4, 3.2, 0.16, px, 1.6, pz, screenGoldMat);
    addPropBox(1.48, 0.16, 0.22, px, 3.2, pz, screenFrameMat);
    addPropBox(1.48, 0.16, 0.22, px, 0.1, pz, screenFrameMat);
  }

  [-12.1, 12.1].forEach((wx, idx) => {
    addPropBox(0.14, 4.2, 0.22, wx, 5.2, -8.5, idx === 0 ? neonCyanMat : neonPinkMat);
    addPropBox(0.14, 4.2, 0.22, wx, 5.2, 1.5, idx === 0 ? neonPinkMat : neonCyanMat);
  });

  buildSakuraTree(group, 7.6, 0, -12.6, 1.15);
  buildSakuraTree(group, 10.6, 0, -3.2, 1.05);
  buildSakuraTree(group, 10.8, 0, 8.8, 1.1);

  buildKoiPond(group, -5.6, 1.8, 1.75, 1.25, anims, 0.4);
  buildKoiPond(group, 5.6, 1.8, 1.75, 1.25, anims, 2.2);
}

export function applyCampTheme(themeKey) {
  const { scene, sun } = ctx;
  const th = CAMP_THEMES[themeKey] || CAMP_THEMES.land1;
  currentCampTheme = themeKey;
  if (gameState !== 'CAMP') return;
  document.body.style.background = th.sky;
  scene.fog = new THREE.Fog(th.fog, 36, 92);
  sun.color.setHex(th.sunCol);
  sun.intensity = th.sunInt;
  if (!campRefs) return;

  campRefs.tiles.forEach((t, i) => {
    campRefs.tileMesh.setColorAt(i, new THREE.Color(t.alt ? th.tileA : th.tileB));
  });
  if (campRefs.tileMesh.instanceColor) campRefs.tileMesh.instanceColor.needsUpdate = true;

  campRefs.wallMains.forEach((m) => { m.material.color.setHex(th.wallMain); });
  campRefs.wallBases.forEach((m) => { m.material.color.setHex(th.wallBase); });
  campRefs.wallTrims.forEach((m) => { m.material.color.setHex(th.wallTrim); });
  campRefs.pillarBodies.forEach((m) => { m.material.color.setHex(th.pillarBody); });
  campRefs.pillarFlutes.forEach((m) => { m.material.color.setHex(th.pillarFlute); });
  campRefs.pillarCaps.forEach((m) => { m.material.color.setHex(th.pillarCap); });
  campRefs.torchFlames.forEach((fl) => { fl.material.color.setHex(th.torchCol); });
  campRefs.warmGlow.color.setHex(th.lightCol);
  campRefs.warmGlow.intensity = th.lightInt;
  if (moteMesh) moteMesh.material.color.setHex(th.moteCol);

clearThemeProps();
  if (themePropsGroup && th.props === 'sakura') {
    buildSakuraProps(themePropsGroup, envAnims);
  } else if (themePropsGroup && th.props === 'forest_cyan') {
    buildForestCyanProps(themePropsGroup, envAnims);
  } else if (themePropsGroup && th.props === 'neon_lanterns') {
    buildNeonLanternProps(themePropsGroup, envAnims);
  }
}

function buildHangingLantern(group, x, y, z, anims, phase = 0) {
  const lanGrp = new THREE.Group();
  const cordMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x1e293b }));
  const capMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x1f2430 }));
  const bodyMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  const trimMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));

  const cord = new THREE.Mesh(boxGeo, cordMat);
  cord.scale.set(0.06, 1.1, 0.06);
  cord.position.set(0, 1.05, 0);
  lanGrp.add(cord);

  const topCap = new THREE.Mesh(boxGeo, capMat);
  topCap.scale.set(0.62, 0.14, 0.62);
  topCap.position.set(0, 0.45, 0);
  lanGrp.add(topCap);

  const body = new THREE.Mesh(boxGeo, bodyMat);
  body.scale.set(0.68, 0.72, 0.68);
  body.position.set(0, 0.04, 0);
  lanGrp.add(body);

  const band = new THREE.Mesh(boxGeo, trimMat);
  band.scale.set(0.72, 0.08, 0.72);
  band.position.set(0, 0.04, 0);
  lanGrp.add(band);

  const botCap = new THREE.Mesh(boxGeo, capMat);
  botCap.scale.set(0.54, 0.12, 0.54);
  botCap.position.set(0, -0.36, 0);
  lanGrp.add(botCap);

  lanGrp.position.set(x, y, z);
  group.add(lanGrp);

  anims.push((t) => {
    lanGrp.rotation.z = Math.sin(t * 2.1 + phase) * 0.06;
    lanGrp.position.y = y + Math.sin(t * 2.8 + phase) * 0.04;
  });
}

function buildNeonLanternProps(group, anims) {
  const neonPinkMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xe879f9 }));
  const neonCyanMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  const vendRedMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
  const vendBlueMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x2563eb }));
  const vendScreenMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xbae6fd }));
  const curbRedMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0xb91c1c }));
  const curbGoldMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xfacc15 }));

  const addNeonBox = (w, h, d, x, y, z, matRef, rotY = 0) => {
    const m = new THREE.Mesh(boxGeo, matRef);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    group.add(m);
  };

  // Néons horizontaux au plafond et verticaux sur les murs latéraux
  for (let z = -12; z <= 8; z += 5) {
    addNeonBox(3.4, 0.14, 0.22, -4.5, 12.6, z, neonCyanMat);
    addNeonBox(3.4, 0.14, 0.22, 4.5, 12.6, z, neonPinkMat);
  }

  [-11.8, 11.8].forEach((wx, idx) => {
    addNeonBox(0.16, 4.4, 0.26, wx * 0.98, 5.4, -7.5, idx === 0 ? neonCyanMat : neonPinkMat);
    addNeonBox(0.16, 4.4, 0.26, wx * 0.98, 5.4, 1.5, idx === 0 ? neonPinkMat : neonCyanMat);
    addNeonBox(0.16, 4.4, 0.26, wx * 0.98, 5.4, 9.5, idx === 0 ? neonCyanMat : neonPinkMat);
  });

  // Bornes / distributeurs à gauche près du Forgeron
  const vend1 = new THREE.Group();
  const v1Body = new THREE.Mesh(boxGeo, vendRedMat);
  v1Body.scale.set(1.6, 2.9, 1.2);
  v1Body.position.set(0, 1.45, 0);
  v1Body.castShadow = true;
  vend1.add(v1Body);
  const v1Win = new THREE.Mesh(boxGeo, vendScreenMat);
  v1Win.scale.set(1.1, 1.2, 0.12);
  v1Win.position.set(0, 1.85, 0.62);
  vend1.add(v1Win);
  vend1.position.set(-10.8, 0, -2.5);
  vend1.rotation.y = Math.PI / 2;
  group.add(vend1);

  const vend2 = new THREE.Group();
  const v2Body = new THREE.Mesh(boxGeo, vendBlueMat);
  v2Body.scale.set(1.5, 2.7, 1.15);
  v2Body.position.set(0, 1.35, 0);
  v2Body.castShadow = true;
  vend2.add(v2Body);
  const v2Win = new THREE.Mesh(boxGeo, vendScreenMat);
  v2Win.scale.set(1.0, 1.1, 0.12);
  v2Win.position.set(0, 1.75, 0.6);
  vend2.add(v2Win);
  vend2.position.set(-10.8, 0, -0.6);
  vend2.rotation.y = Math.PI / 2;
  group.add(vend2);

  // Bordures rouges & dorées le long du tapis central
  for (let rz = 1.8; rz <= 10.6; rz += 1.1) {
    [-1.85, 1.85].forEach((rx) => {
      const block = new THREE.Mesh(boxGeo, curbRedMat);
      block.scale.set(0.36, 0.34, 0.72);
      block.position.set(rx, 0.17, rz);
      block.castShadow = true;
      block.receiveShadow = true;
      group.add(block);

      const cap = new THREE.Mesh(boxGeo, curbGoldMat);
      cap.scale.set(0.38, 0.06, 0.74);
      cap.position.set(rx, 0.35, rz);
      group.add(cap);
    });
  }

  // Lanternes rouges suspendues
  const lanternCoords = [
    [-8.5, 8.2, -10.5], [-4.5, 8.6, -12.5], [4.5, 8.6, -12.5], [8.5, 8.2, -10.5],
    [-9.2, 8.0, -2.0], [9.2, 8.0, -2.0], [-9.2, 8.0, 6.5], [9.2, 8.0, 6.5]
  ];
  lanternCoords.forEach(([lx, ly, lz], i) => {
    buildHangingLantern(group, lx, ly, lz, anims, i * 0.85);
  });
}
function buildForestCyanProps(group, anims) {
  const leafPanelMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x2f855a }));
  const leafTrimMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x5a3a22 }));
  const cyanStripMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));

  const addPanel = (x, y, z, rotY = 0) => {
    const pGrp = new THREE.Group();
    const frame = new THREE.Mesh(boxGeo, leafTrimMat);
    frame.scale.set(3.2, 2.5, 0.22);
    pGrp.add(frame);

    const leaves = new THREE.Mesh(boxGeo, leafPanelMat);
    leaves.scale.set(2.8, 2.1, 0.28);
    pGrp.add(leaves);

    pGrp.position.set(x, y, z);
    pGrp.rotation.y = rotY;
    group.add(pGrp);
  };

  [-11.8, 11.8].forEach((wx, idx) => {
    const rot = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
    addPanel(wx, 5.2, -5.5, rot);
    addPanel(wx, 5.2, 5.5, rot);

    const strip = new THREE.Mesh(boxGeo, cyanStripMat);
    strip.scale.set(0.16, 4.8, 0.24);
    strip.position.set(wx * 0.98, 5.6, 0);
    group.add(strip);
  });

  buildCanopyTree(group, -7.8, 0, -11.5, 1.1);
  buildCanopyTree(group, 7.8, 0, -11.5, 1.1);

  buildStoneLantern(group, -7.2, -4.5);
  buildStoneLantern(group, 7.2, -4.5);

  buildCyanChannel(group, -6.4, 4.5, 2.8, 14.0, anims, 1);
  buildCyanChannel(group, 6.4, 4.5, 2.8, 14.0, anims, -1);
}

function buildCanopyTree(group, x, y, z, scale = 1) {  const treeGrp = new THREE.Group();
  const barkMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x5c3a21 }));
  const leafDark = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x276749 }));
  const leafMid = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x2f855a }));
  const leafLight = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x48bb78 }));

  const addBlock = (w, h, d, vx, vy, vz, material) => {
    const m = new THREE.Mesh(boxGeo, material);
    m.scale.set(w, h, d);
    m.position.set(vx, vy, vz);
    m.castShadow = true;
    m.receiveShadow = true;
    treeGrp.add(m);
  };

  addBlock(0.85, 3.6, 0.85, 0, 1.8, 0, barkMat);
  addBlock(0.45, 1.4, 0.45, -0.65, 2.9, 0.2, barkMat);
  addBlock(0.45, 1.3, 0.45, 0.65, 3.0, -0.2, barkMat);

  addBlock(3.2, 1.4, 2.8, 0, 4.0, 0, leafDark);
  addBlock(2.5, 1.3, 2.2, -0.6, 4.9, 0.25, leafMid);
  addBlock(2.4, 1.2, 2.1, 0.6, 5.0, -0.2, leafMid);
  addBlock(1.7, 1.0, 1.7, 0, 5.8, 0, leafLight);

  treeGrp.scale.setScalar(scale);
  treeGrp.position.set(x, y, z);
  group.add(treeGrp);
}

function buildStoneLantern(group, x, z) {
  const lanGrp = new THREE.Group();
  const stoneMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x718096 }));
  const stoneDarkMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x4a5568 }));
  const glowMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x9ef9f0 }));

  const addPart = (w, h, d, vx, vy, vz, matRef, isGlow = false) => {
    const m = new THREE.Mesh(boxGeo, matRef);
    m.scale.set(w, h, d);
    m.position.set(vx, vy, vz);
    if (!isGlow) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    lanGrp.add(m);
  };

  addPart(1.15, 0.26, 1.15, 0, 0.13, 0, stoneDarkMat);
  addPart(0.55, 1.1, 0.55, 0, 0.8, 0, stoneMat);
  addPart(0.82, 0.55, 0.82, 0, 1.62, 0, glowMat, true);
  addPart(1.35, 0.24, 1.35, 0, 2.0, 0, stoneMat);
  addPart(0.82, 0.22, 0.82, 0, 2.22, 0, stoneDarkMat);

  lanGrp.position.set(x, 0, z);
  group.add(lanGrp);
}

function buildCyanChannel(group, cx, cz, w, d, anims, dirSign = 1) {
  const chGrp = new THREE.Group();
  const waterMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.78 }));
  const edgeMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x67e8f9 }));
  const woodMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x7c5332 }));

  const water = new THREE.Mesh(boxGeo, waterMat);
  water.scale.set(w, 0.04, d);
  water.position.set(0, 0.045, 0);
  chGrp.add(water);

  const edgeL = new THREE.Mesh(boxGeo, edgeMat);
  edgeL.scale.set(0.18, 0.05, d);
  edgeL.position.set(-w * 0.5, 0.055, 0);
  chGrp.add(edgeL);

  const edgeR = new THREE.Mesh(boxGeo, edgeMat);
  edgeR.scale.set(0.18, 0.05, d);
  edgeR.position.set(w * 0.5, 0.055, 0);
  chGrp.add(edgeR);

  const bridge = new THREE.Mesh(boxGeo, woodMat);
  bridge.scale.set(w + 0.6, 0.22, 2.8);
  bridge.position.set(0, 0.14, 1.5);
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  chGrp.add(bridge);

  const fishList = [];
  const fishMatA = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
  const fishMatB = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xf97316 }));
  for (let i = 0; i < 3; i++) {
    const fm = new THREE.Mesh(boxGeo, i % 2 === 0 ? fishMatA : fishMatB);
    fm.scale.set(0.24, 0.1, 0.65);
    fm.position.set((i - 1) * 0.65, 0.075, 0);
    chGrp.add(fm);
    fishList.push({ mesh: fm, offset: i * 2.1 });
  }

  chGrp.position.set(cx, 0, cz);
  group.add(chGrp);

  anims.push((t) => {
    const span = d * 0.36;
    fishList.forEach((f) => {
      const zPos = Math.sin(t * 1.15 * dirSign + f.offset) * span;
      f.mesh.position.z = zPos;
      f.mesh.rotation.y = Math.cos(t * 1.15 * dirSign + f.offset) >= 0 ? 0 : Math.PI;
    });
  });
}

// Définition unique de buildForestCyanProps conservée plus haut dans le fichier
function buildForestCyanProps_Unused(group, anims) {  const leafPanelMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x2f855a }));
  const leafTrimMat = trackPropMat(new THREE.MeshLambertMaterial({ color: 0x5a3a22 }));
  const cyanStripMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));

  const addPanel = (x, y, z, rotY = 0) => {
    const pGrp = new THREE.Group();
    const frame = new THREE.Mesh(boxGeo, leafTrimMat);
    frame.scale.set(3.2, 2.5, 0.22);
    pGrp.add(frame);

    const leaves = new THREE.Mesh(boxGeo, leafPanelMat);
    leaves.scale.set(2.8, 2.1, 0.28);
    pGrp.add(leaves);

    pGrp.position.set(x, y, z);
    pGrp.rotation.y = rotY;
    group.add(pGrp);
  };

  [-11.8, 11.8].forEach((wx, idx) => {
    const rot = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
    addPanel(wx, 5.2, -5.5, rot);
    addPanel(wx, 5.2, 5.5, rot);

    const strip = new THREE.Mesh(boxGeo, cyanStripMat);
    strip.scale.set(0.16, 4.8, 0.24);
    strip.position.set(wx * 0.98, 5.6, 0);
    group.add(strip);
  });

  buildCanopyTree(group, -7.8, 0, -11.5, 1.1);
  buildCanopyTree(group, 7.8, 0, -11.5, 1.1);

  buildStoneLantern(group, -7.2, -4.5);
  buildStoneLantern(group, 7.2, -4.5);

  buildCyanChannel(group, -6.4, 4.5, 2.8, 14.0, anims, 1);
  buildCyanChannel(group, 6.4, 4.5, 2.8, 14.0, anims, -1);
}
export function buildCampEnv() {
  campOccluders = [];
  const d = new THREE.Object3D();
  const tiles = [];
  for (let gx = -13.5; gx <= 13.5; gx += 1) {
    for (let gz = -17.5; gz <= 16.5; gz += 1) {
      tiles.push({ x: gx, z: gz, alt: Math.abs(Math.round(gx + 14) + Math.round(gz + 18)) % 2 });
    }
  }
  const tm = new THREE.InstancedMesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), tiles.length);
  tiles.forEach((t, i) => {
    d.position.set(t.x, -0.05, t.z);
    d.scale.set(0.98, 0.1, 0.98);
    d.rotation.y = 0;
    d.updateMatrix();
    tm.setMatrixAt(i, d.matrix);
    tm.setColorAt(i, new THREE.Color(t.alt ? 0x526158 : 0x627368));
  });
  if (tm.instanceColor) tm.instanceColor.needsUpdate = true;
  tm.instanceMatrix.needsUpdate = true;
  tm.receiveShadow = true;
  envGroup.add(tm);

  const wallMains = [], wallBases = [], wallTrims = [], pillarBodies = [], pillarFlutes = [], pillarCaps = [], torchFlames = [];
  const reg = (mesh, arr, occlude = true) => {
    mesh.material = mesh.material.clone();
    mesh.material.transparent = true;
    mesh.material.opacity = 1.0;
    arr.push(mesh);
    if (occlude) campOccluders.push(mesh);
    return mesh;
  };

  reg(box(5.2, 0.04, 5.2, 0x434c57, 0, 0.01, -1.5, envGroup), wallBases, false);
  reg(box(3.8, 0.06, 3.8, 0x56616e, 0, 0.02, -1.5, envGroup), wallMains, false);
  reg(box(2.0, 0.08, 2.0, 0x768394, 0, 0.03, -1.5, envGroup), wallTrims, false);

  reg(box(46.0, 2.2, 2.4, 0x434c57, 0, 1.1, -18.7, envGroup), wallBases);
  reg(box(46.4, 0.45, 2.6, 0x768394, 0, 2.35, -18.6, envGroup), wallTrims);
  reg(box(48.0, 7.6, 4.6, 0x56616e, 0, 6.0, -19.2, envGroup), wallMains);
  reg(box(48.4, 0.55, 5.0, 0x768394, 0, 10.0, -19.1, envGroup), wallTrims);
  reg(box(52.0, 9.0, 5.2, 0x434c57, 0, 13.5, -21.4, envGroup), wallBases);
  reg(box(52.4, 0.65, 5.6, 0x768394, 0, 18.2, -21.3, envGroup), wallTrims);
  reg(box(56.0, 8.0, 6.0, 0x56616e, 0, 20.0, -23.8, envGroup), wallMains);
  reg(box(56.4, 0.7, 6.4, 0x768394, 0, 24.1, -23.7, envGroup), wallTrims);

  [-8.8, 8.8].forEach((bx) => {
    reg(box(4.8, 13.5, 3.6, 0x56616e, bx, 6.75, -17.6, envGroup), wallMains);
    reg(box(5.2, 0.6, 4.0, 0x768394, bx, 13.7, -17.5, envGroup), wallTrims);
    reg(box(2.6, 5.4, 0.9, 0x434c57, bx, 4.6, -15.7, envGroup), wallBases);
  });

  [-1, 1].forEach((sx) => {
    reg(box(2.6, 2.0, 42.0, 0x434c57, sx * 13.4, 1.0, -4.5, envGroup), wallBases);
    reg(box(2.9, 0.4, 42.4, 0x768394, sx * 13.3, 2.15, -4.5, envGroup), wallTrims);
    reg(box(3.4, 7.6, 44.0, 0x56616e, sx * 15.1, 5.8, -5.0, envGroup), wallMains);
    reg(box(3.8, 0.5, 44.4, 0x768394, sx * 15.0, 9.8, -5.0, envGroup), wallTrims);
    reg(box(4.4, 9.5, 46.0, 0x434c57, sx * 17.5, 13.5, -5.5, envGroup), wallBases);
    reg(box(4.8, 0.6, 46.4, 0x768394, sx * 17.4, 18.4, -5.5, envGroup), wallTrims);
    reg(box(5.2, 8.0, 48.0, 0x56616e, sx * 20.2, 20.0, -6.0, envGroup), wallMains);
    reg(box(5.6, 0.65, 48.4, 0x768394, sx * 20.1, 24.1, -6.0, envGroup), wallTrims);

    [-10.5, 3.5].forEach((az) => {
      reg(box(1.5, 7.6, 1.4, 0x56616e, sx * 12.9, 4.8, az - 2.3, envGroup), wallMains);
      reg(box(1.5, 7.6, 1.4, 0x56616e, sx * 12.9, 4.8, az + 2.3, envGroup), wallMains);
      reg(box(1.7, 1.2, 6.2, 0x768394, sx * 12.9, 8.8, az, envGroup), wallTrims);
    });

    for (let st = 0; st < 5; st++) {
      reg(box(0.55, 0.42 * (st + 1), 2.4, 0x56616e, sx * (10.3 + st * 0.45), 0.21 * (st + 1), 8.2, envGroup), wallMains);
    }
  });

  // Tapis central reliant l'entrée sud au feu de camp
  const rug = box(3.2, 0.03, 9.5, 0x8b2635, 0, 0.015, 6.2, envGroup);
  const rugTrim = box(3.6, 0.02, 9.9, 0xd4a73a, 0, 0.01, 6.2, envGroup);
  rug.receiveShadow = true; rugTrim.receiveShadow = true;

  // Bannières décoratives dans les coins sud
  [-10.8, 10.8].forEach((bx) => {
    reg(box(0.28, 6.5, 0.28, 0x434c57, bx, 3.25, 12.2, envGroup), wallBases);
    const banner = box(1.5, 3.6, 0.12, 0x8b2635, bx, 4.4, 12.0, envGroup);
    banner.material = banner.material.clone(); banner.material.transparent = true;
    campOccluders.push(banner);
  });

  // Mur Sud reculé à z = 16.2 pour garder la caméra toujours bien cadrée
  reg(box(28.4, 2.2, 1.6, 0x434c57, 0, 1.1, 16.2, envGroup), wallBases);
  reg(box(28.6, 0.4, 1.8, 0x768394, 0, 2.35, 16.2, envGroup), wallTrims);
  reg(box(29.0, 11.2, 2.0, 0x56616e, 0, 8.0, 16.4, envGroup), wallMains);
  reg(box(29.2, 0.6, 2.2, 0x768394, 0, 13.7, 16.4, envGroup), wallTrims);

  // Plafond fermé avec poutres transversales de pierre
  reg(box(31.0, 0.8, 37.0, 0x3b434f, 0, 14.3, -1.0, envGroup), wallBases);
  for (let bz = -16; bz <= 14; bz += 4.5) {
    reg(box(28.0, 0.85, 0.95, 0x4b5563, 0, 13.5, bz, envGroup), wallMains);
    reg(box(28.2, 0.22, 1.15, 0x768394, 0, 13.0, bz, envGroup), wallTrims);
  }

  const addPillar = (px, pz, h, withTorch, tx, tz, baseY = 0) => {
    const p = new THREE.Group();
    reg(box(1.5, 0.7, 1.5, 0x434c57, 0, 0.35, 0, p), wallBases);
    reg(box(1.1, h, 1.1, 0x647080, 0, h / 2 + 0.5, 0, p), pillarBodies);
    reg(box(0.26, h - 0.5, 1.24, 0x4b5563, 0, h / 2 + 0.5, 0, p), pillarFlutes);
    reg(box(1.24, h - 0.5, 0.26, 0x4b5563, 0, h / 2 + 0.5, 0, p), pillarFlutes);
    reg(box(1.55, 0.65, 1.55, 0x8290a3, 0, h + 0.75, 0, p), pillarCaps);
    p.position.set(px, baseY, pz);
    envGroup.add(p);

    if (withTorch) {
      const sconce = box(0.36, 0.5, 0.36, 0x232732, tx, baseY + 3.4, tz, envGroup);
      sconce.material = sconce.material.clone();
      sconce.material.transparent = true;
      campOccluders.push(sconce);
      const fl = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xff9d2e }));
      fl.scale.set(0.3, 0.48, 0.3);
      fl.position.set(tx, baseY + 3.85, tz);
      envGroup.add(fl);
      torchFlames.push(fl);
    }
  };

  for (let z = -14; z <= 10; z += 6) {
    addPillar(-12.3, z, 8.2, true, -11.5, z);
    addPillar(12.3, z, 8.2, true, 11.5, z);
  }
  [-11.2, -6.4, 6.4, 11.2].forEach((x) => {
    addPillar(x, -15.6, 9.2, Math.abs(x) < 8, x, -14.8);
  });
  for (let z = -12; z <= 6; z += 9) {
    addPillar(-14.6, z, 7.2, false, 0, 0, 2.2);
    addPillar(14.6, z, 7.2, false, 0, 0, 2.2);
  }

  const warmGlow = new THREE.PointLight(0xffb35c, 0.85, 34);
  warmGlow.position.set(-4, 5.5, -3);
  envGroup.add(warmGlow);

  themePropsGroup = new THREE.Group();
  envGroup.add(themePropsGroup);

  campRefs = { tileMesh: tm, tiles, wallMains, wallBases, wallTrims, pillarBodies, pillarFlutes, pillarCaps, torchFlames, warmGlow };

  envAnims.push((t) => {
    torchFlames.forEach((f, i) => {
      f.scale.y = 0.42 + Math.sin(t * 11 + i * 1.9) * 0.12;
    });
  });
  addMotes(0xfff3a0);
  applyCampTheme(currentCampTheme);
}

function getCombatThemePalette(n) {
  const th = CAMP_THEMES[activeWorldTheme];
  if (activeWorldTheme === 'sakura' && th) {
    return {
      ground: 0x2a1424,
      arena: 0x3b1b30,
      wall: th.wallMain,
      trim: th.wallTrim
    };
  }
  if (activeWorldTheme === 'land2' && th) {
    return {
      ground: 0x18343d,
      arena: 0x224652,
      wall: th.wallMain,
      trim: th.wallTrim
    };
  }
  if (activeWorldTheme === 'land3' && th) {
    return {
      ground: 0x161426,
      arena: 0x221d38,
      wall: th.wallMain,
      trim: th.wallTrim
    };
  }
  return {
    ground: GROUND.at(n - 1),
    arena: ARENAC.at(n - 1),
    wall: n === 1 ? 0x6f747d : (n === 2 ? 0x6e553b : 0x425678),
    trim: n === 1 ? 0x9aa0a8 : (n === 2 ? 0x8f7150 : 0x63b3ed)
  };
}

function buildCombatThemeAccents(H) {  if (!themePropsGroup) return;
  const edge = Math.max(22, H + 10);
  if (activeWorldTheme === 'sakura') {
    const spots = [
      [-edge, -edge, 1.4],
      [edge, -edge, 1.45],
      [-edge, edge * 0.75, 1.3],
      [edge, edge * 0.75, 1.35]
    ];
    spots.forEach(([sx, sz, sc]) => buildSakuraTree(themePropsGroup, sx, 0, sz, sc));
} else if (activeWorldTheme === 'land2') {
    const spots = [
      [-edge, -edge, 1.35],
      [edge, -edge, 1.35],
      [-edge, edge * 0.75, 1.25],
      [edge, edge * 0.75, 1.25]
    ];
    spots.forEach(([sx, sz, sc]) => buildCanopyTree(themePropsGroup, sx, 0, sz, sc));
  } else if (activeWorldTheme === 'land3') {
    const pillarMat = trackPropMat(new THREE.MeshBasicMaterial({ color: 0xd946ef }));
    const spots = [
      [-edge, -edge],
      [edge, -edge],
      [-edge, edge * 0.75],
      [edge, edge * 0.75]
    ];
    spots.forEach(([sx, sz]) => {
      const p = new THREE.Mesh(boxGeo, pillarMat);
      p.scale.set(0.6, 9.0, 0.6);
      p.position.set(sx, 4.5, sz);
      themePropsGroup.add(p);
    });
  }
}export function buildEnv(n) {
  const { scene, sun, arenaH } = ctx;
  const isCampMode = gameState === 'CAMP';
  const themeKey = activeWorldTheme || 'land1';
  const cacheKey = isCampMode ? `CAMP_${themeKey}` : `${runMode}_${n}_${themeKey}`;
  if (envLand === cacheKey) return;
  envLand = cacheKey;
  clearThemeProps();
  themePropsGroup = null;
  while (envGroup.children.length) envGroup.remove(envGroup.children.at(0));
  clouds = [];
  motes = [];
  moteMesh = null;
  envAnims = [];
  scene.background = null;

  if (isCampMode) {
    buildCampEnv();
    return;
  }

  const th = CAMP_THEMES[themeKey];
  const isSakura = themeKey === 'sakura' && th;
  document.body.style.background = isSakura
    ? th.sky
    : `linear-gradient(${TOPC.at(n - 1)} 0%, #${SKYC.at(n - 1).toString(16).padStart(6, '0')} 38%, #${SKYC.at(n - 1).toString(16).padStart(6, '0')} 100%)`;
  scene.fog = new THREE.Fog(isSakura ? th.fog : SKYC.at(n - 1), 30, 95);
  sun.color.set(isSakura ? th.sunCol : [0xfff1d0, 0xffc880, 0x9fb4ff, 0xfff0d4].at(n - 1));
  sun.intensity = isSakura ? th.sunInt : [0.85, 0.8, 0.55, 0.9].at(n - 1);

  themePropsGroup = new THREE.Group();
  envGroup.add(themePropsGroup);

const H = arenaH * S;
  buildCombatThemeAccents(H);  if (n === 4) {
    buildBridgeEnv();
    return;
  }

  if (runMode === 'arena') {
    buildConnectedDungeon(n);
    return;
  }

const pal = getCombatThemePalette(n);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), mat(pal.ground));
  g.rotation.x = -Math.PI / 2;
  g.receiveShadow = true;
  envGroup.add(g);

  const a = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2), mat(pal.arena));
  a.rotation.x = -Math.PI / 2;
  a.position.y = 0.02;
  a.receiveShadow = true;
  envGroup.add(a);

  arenaPlatforms = [];
  if (!isCampMode && n !== 4) {
    box(16, 4.0, 16, pal.arena, -25, 2.0, -15, envGroup);
    box(16, 4.0, 16, pal.arena, 25, 2.0, 15, envGroup);    arenaPlatforms.push({ x: -25 / S, z: -15 / S, w: 16 / S, d: 16 / S, topY: 4.0, isRamp: false });
    arenaPlatforms.push({ x: 25 / S, z: 15 / S, w: 16 / S, d: 16 / S, topY: 4.0, isRamp: false });

    const r1 = box(6, 0.2, 18, 0x4a5568, -25, 2.0, -2, envGroup);
    r1.rotation.x = 0.24;
    arenaPlatforms.push({ x: -25 / S, z: -2 / S, w: 6 / S, d: 18 / S, topY: 4.0, isRamp: true, dirZ: 1 });

    const r2 = box(6, 0.2, 18, 0x4a5568, 25, 2.0, 2, envGroup);
    r2.rotation.x = -0.24;
    arenaPlatforms.push({ x: 25 / S, z: 2 / S, w: 6 / S, d: 18 / S, topY: 4.0, isRamp: true, dirZ: -1 });
  }

  if (n === 3) buildCrypt(H);
  else buildOutdoor(n, H);
}

function buildConnectedDungeon(n) {
  arenaPlatforms = [];
  const R = ROOM_HALF * S;
  const stepW = ROOM_STEP * S;
  const corrLen = stepW - R * 2;
  const pal = getCombatThemePalette(n);
  const wallCol = pal.wall;
  const trimCol = pal.trim;
  const floorCol = pal.arena;

  const g = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat(pal.ground));  g.rotation.x = -Math.PI / 2;
  g.position.set(0, 0, -stepW * 2);
  g.receiveShadow = true;
  envGroup.add(g);

  if (n !== 3) addClouds();
  addMotes(n === 1 ? 0xfff3a0 : (n === 2 ? 0xffb347 : 0x7fd0ff));

  const builtCorridors = new Set();
  const doorMeshes = new Map();
  const frontWalls = [];

  const regFrontWall = (m) => {
    m.material = m.material.clone();
    m.material.transparent = true;
    m.material.opacity = 1;
    frontWalls.push(m);
    return m;
  };

  const buildArchWall = (cx, cz, dirId, hasOpening, isSouthWall) => {
    const addW = (w, h, d, x, y, z) => {
      const m = box(w, h, d, wallCol, x, y, z, envGroup);
      if (isSouthWall) regFrontWall(m);
      return m;
    };
    const isNS = dirId === 'N' || dirId === 'S';
    const offset = (dirId === 'N' || dirId === 'W') ? -(R + 0.7) : (R + 0.7);
    const doorHalf = 1.65;
    const sideLen = R - doorHalf;

    if (!hasOpening) {
      if (isNS) addW(R * 2 + 2, isSouthWall ? 2.1 : 3.2, 1.4, cx, isSouthWall ? 1.05 : 1.6, cz + offset);
      else addW(1.4, 3.0, R * 2 + 2, cx + offset, 1.5, cz);
      return;
    }

    if (isNS) {
      addW(sideLen, isSouthWall ? 2.1 : 3.2, 1.4, cx - (doorHalf + sideLen * 0.5), isSouthWall ? 1.05 : 1.6, cz + offset);
      addW(sideLen, isSouthWall ? 2.1 : 3.2, 1.4, cx + (doorHalf + sideLen * 0.5), isSouthWall ? 1.05 : 1.6, cz + offset);
      addW(0.75, 4.4, 1.6, cx - doorHalf, 2.2, cz + offset);
      addW(0.75, 4.4, 1.6, cx + doorHalf, 2.2, cz + offset);
      box(4.2, 0.65, 1.8, trimCol, cx, 4.6, cz + offset, envGroup);
    } else {
      addW(1.4, 3.2, sideLen, cx + offset, 1.6, cz - (doorHalf + sideLen * 0.5));
      addW(1.4, 3.2, sideLen, cx + offset, 1.6, cz + (doorHalf + sideLen * 0.5));
      addW(1.6, 4.4, 0.75, cx + offset, 2.2, cz - doorHalf);
      addW(1.6, 4.4, 0.75, cx + offset, 2.2, cz + doorHalf);
      box(1.8, 0.65, 4.2, trimCol, cx + offset, 4.6, cz, envGroup);
    }

    const gate = isNS
      ? box(2.8, 3.8, 0.35, 0x2d3748, cx, 1.9, cz + offset, envGroup)
      : box(0.35, 3.8, 2.8, 0x2d3748, cx + offset, 1.9, cz, envGroup);

    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 3.8),
      new THREE.MeshBasicMaterial({ color: 0x48bb78, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    if (isNS) portal.position.set(cx, 1.9, cz + offset + (dirId === 'N' ? 0.08 : -0.08));
    else {
      portal.rotation.y = Math.PI / 2;
      portal.position.set(cx + offset + (dirId === 'W' ? 0.08 : -0.08), 1.9, cz);
    }
    portal.visible = false;
    envGroup.add(portal);
    doorMeshes.set(`${Math.round(cx / stepW)},${Math.round(cz / stepW)}_${dirId}`, { gate, portal });
  };

  const ensureRoomBuilt = (node) => {
    if (node.built) return;
    node.built = true;
    const cx = node.gx * stepW;
    const cz = node.gz * stepW;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), mat(floorCol));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.02, cz);
    floor.receiveShadow = true;
    envGroup.add(floor);

    const isBossRoom = dungeonNodes.size >= DUNGEON_ROOMS;
    const hasNorth = !isBossRoom;
    const hasWest = !isBossRoom;
    const hasEast = !isBossRoom;
    const hasSouth = node.entryDir === 'S';

    buildArchWall(cx, cz, 'N', hasNorth, false);
    buildArchWall(cx, cz, 'W', hasWest, false);
    buildArchWall(cx, cz, 'E', hasEast, false);
    buildArchWall(cx, cz, 'S', hasSouth, true);

    if (n !== 3) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const dist = R + 7.5 + Math.random() * 14;
        const tx = cx + Math.cos(a) * dist;
        const tz = cz + Math.sin(a) * dist;
        // Never spawn trees inside a room or directly south of a room where the camera looks in
        let blocked = false;
        dungeonNodes.forEach((dn) => {
          const dcx = dn.gx * stepW, dcz = dn.gz * stepW;
          if (Math.abs(tx - dcx) < R + 5.5 && tz > dcz - R - 4 && tz < dcz + R + 15) blocked = true;
        });
        if (blocked) continue;
        tree(tx, tz, n, frontWalls);
      }
    }
  };

  const ensureCorridorBuilt = (gx1, gz1, dirId) => {
    const d = DIRS[dirId];
    const gx2 = gx1 + d.dx, gz2 = gz1 + d.dz;
    const edgeKey = [ `${gx1},${gz1}`, `${gx2},${gz2}` ].sort().join('<->');
    if (builtCorridors.has(edgeKey)) return;
    builtCorridors.add(edgeKey);

    const midX = (gx1 + gx2) * 0.5 * stepW;
    const midZ = (gz1 + gz2) * 0.5 * stepW;
    const isNS = dirId === 'N' || dirId === 'S';

    const cFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(isNS ? 3.2 : corrLen + 1.4, isNS ? corrLen + 1.4 : 3.2),
      mat(0x4a5568)
    );
    cFloor.rotation.x = -Math.PI / 2;
    cFloor.position.set(midX, 0.03, midZ);
    cFloor.receiveShadow = true;
    envGroup.add(cFloor);

    if (isNS) {
      box(0.45, 1.1, corrLen + 1.4, wallCol, midX - 1.7, 0.55, midZ, envGroup);
      box(0.45, 1.1, corrLen + 1.4, wallCol, midX + 1.7, 0.55, midZ, envGroup);
    } else {
      box(corrLen + 1.4, 1.1, 0.45, wallCol, midX, 0.55, midZ - 1.7, envGroup);
      box(corrLen + 1.4, 1.1, 0.45, wallCol, midX, 0.55, midZ + 1.7, envGroup);
    }
  };

  envAnims.push((t) => {
    const player = ctx.getPlayer ? ctx.getPlayer() : null;
    dungeonNodes.forEach((node) => ensureRoomBuilt(node));

    const openMap = new Map();
    activeDoors.forEach((ad) => {
      const curGx = Math.round((player ? player.x * S : 0) / stepW);
      const curGz = Math.round((player ? player.z * S : 0) / stepW);
      ensureCorridorBuilt(curGx, curGz, ad.dir);
      openMap.set(`${curGx},${curGz}_${ad.dir}`, ad.choice);
    });

    doorMeshes.forEach((dm, key) => {
      const choice = openMap.get(key);
      const isOpen = Boolean(choice);
      const targetY = isOpen ? 5.2 : 1.9;
      dm.gate.position.y += (targetY - dm.gate.position.y) * 0.14;
      dm.portal.visible = isOpen;
      if (isOpen && choice) {
        dm.portal.material.color.setHex(choice.hex);
        dm.portal.material.opacity = 0.35 + Math.sin(t * 6) * 0.12;
      }
    });

    // Fade front South walls & any tree parts between camera and player
    if (player) {
      const px = player.x * S, pz = player.z * S;
      const wp = new THREE.Vector3();
      frontWalls.forEach((fw) => {
        fw.getWorldPosition(wp);
        const dz = wp.z - pz;
        const nearCamRay = dz > -1.5 && dz < 13.5 && Math.abs(wp.x - px) < 7.5;
        const targetOp = nearCamRay ? 0.18 : 1.0;
        fw.material.opacity += (targetOp - fw.material.opacity) * 0.22;
      });
    }
  });
}

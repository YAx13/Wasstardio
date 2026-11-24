export const keys = new Set();
export const touch = { on: false, x: 0, z: 0 };

let gpIndex = null, navIndex = 0, altarNavIdx = 0, constNavIdx = 0, navCooldown = 0;
let prevA = false, prevB = false, prevStart = false, prevX = false, prevY = false, prevLB = false, prevRB = false;

let hooks = {
  getGameState: () => 'CAMP',
  isGateDialing: () => false,
  isCampPanelOpen: () => false,
  getCampTab: () => 'smith',
  getDhdActiveRing: () => 0,
  getPacts: () => [],
  getSave: () => ({ pact: 'none', inv: [] }),
  getSelId: () => null,
  getItem: () => null,
  isEquipped: () => false,
  rotateDhdRing: () => {},
  selectDhdRing: () => {},
  activateDhdPortal: () => {},
  exitDhdDialing: () => {},
  replayLastMode: () => {},
  returnCampFromEnd: () => {},
  startRun: () => {},
  navSelect: () => {},
  openConstellation: () => {},
  closeConstellation: () => {},
  centerConstellation: () => {},
  cycleSlot: () => {},
  skipCurseAltar: () => {},
  openCamp: () => {},
  closePanel: () => {},
  triggerDash: () => {},
  castSkill: () => {},
  toggleMute: () => {},
  interact: () => {},
  setPact: () => {},
  setCampTab: () => {},
  autoEquip: () => {},
  toggleEquipItem: () => {},
  applyConstellationTransform: () => {},
  getConstellationPanZoom: () => ({ cPanX: 0, cPanY: 0, cZoom: 1 }),
  setConstellationPanZoom: () => {},
  showToast: () => {},
  renderCamp: () => {},
  sfx: () => {}
};

export function configureInputHandler(nextHooks) {
  hooks = { ...hooks, ...nextHooks };
}

export function getGpIndex() {
  return gpIndex;
}

export function joyMove(ev) {
  const joy = document.getElementById('joy');
  const knob = document.getElementById('knob');
  if (!joy) return;
  const r = joy.getBoundingClientRect(), t = ev.touches.item(0);
  let dx = t.clientX - (r.left + r.width / 2), dz = t.clientY - (r.top + r.height / 2);
  const m = Math.hypot(dx, dz), R = r.width / 2;
  if (m > R) { dx = (dx / m) * R; dz = (dz / m) * R; }
  touch.on = true; touch.x = dx / R; touch.z = dz / R;
  if (knob) knob.style.transform = `translate(${dx}px, ${dz}px)`;
  ev.preventDefault();
}

function isBtn(gp, idx) {
  const b = gp.buttons && gp.buttons.at(idx);
  return Boolean(b && b.pressed);
}

function axisVal(gp, idx) {
  return (gp.axes && gp.axes.at(idx)) || 0;
}

export function pollGamepad(dt) {
  const none = { mx: 0, mz: 0 };
  if (gpIndex === null) return none;
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : new Array();
  const gp = pads.at(gpIndex);
  if (!gp) return none;

  const btnA = isBtn(gp, 0), btnB = isBtn(gp, 1), btnX = isBtn(gp, 2), btnY = isBtn(gp, 3);
  const btnLB = isBtn(gp, 4), btnRB = isBtn(gp, 5), btnRT = isBtn(gp, 7), btnStart = isBtn(gp, 9);
  const justA = btnA && !prevA, justB = btnB && !prevB, justX = btnX && !prevX, justY = btnY && !prevY;
  const justLB = btnLB && !prevLB, justRB = btnRB && !prevRB, justStart = btnStart && !prevStart;

  const lx = Math.abs(axisVal(gp, 0)) > 0.2 ? axisVal(gp, 0) : 0;
  const ly = Math.abs(axisVal(gp, 1)) > 0.2 ? axisVal(gp, 1) : 0;
  const up = isBtn(gp, 12) || ly < -0.55;
  const down = isBtn(gp, 13) || ly > 0.55;
  const left = isBtn(gp, 14) || lx < -0.55;
  const right = isBtn(gp, 15) || lx > 0.55;

  navCooldown = Math.max(0, navCooldown - dt);

  const finishFrame = (res) => {
    prevA = btnA; prevB = btnB; prevX = btnX; prevY = btnY;
    prevLB = btnLB; prevRB = btnRB; prevStart = btnStart;
    return res;
  };

  const $ = (id) => document.getElementById(id);
  const gameState = hooks.getGameState();
  const gateDialing = hooks.isGateDialing();
  const campPanelOpen = hooks.isCampPanelOpen();

  // 1. Écran de fin de run
  if ($('run-end-overlay') && $('run-end-overlay').style.display === 'flex') {
    if (justA) hooks.replayLastMode();
    else if (justB) hooks.returnCampFromEnd();
    return finishFrame(none);
  }

  // 2. Autel des malédictions
  if ($('altar-overlay') && $('altar-overlay').style.display === 'flex') {
    const btns = Array.from($('altar-overlay').querySelectorAll('.curse-card, .row .btn'));
    btns.forEach((el) => el.classList.remove('gp-focus'));
    if (btns.length > 0) {
      if (altarNavIdx >= btns.length) altarNavIdx = 0;
      if (navCooldown <= 0 && (up || down)) {
        altarNavIdx = down ? (altarNavIdx + 1) % btns.length : (altarNavIdx - 1 + btns.length) % btns.length;
        navCooldown = 0.18;
      }
      const cur = btns.at(altarNavIdx);
      if (cur) cur.classList.add('gp-focus');
      if (justA && cur) cur.click();
    }
    if (justB) hooks.skipCurseAltar();
    return finishFrame(none);
  }

  // 3. Arbre de compétences Constellation
  if ($('constellation-overlay') && $('constellation-overlay').style.display === 'block') {
    let { cPanX, cPanY, cZoom } = hooks.getConstellationPanZoom();
    let pzChanged = false;
    if (lx !== 0 || ly !== 0) {
      cPanX -= lx * 380 * dt;
      cPanY -= ly * 380 * dt;
      pzChanged = true;
    }
    const ry = Math.abs(axisVal(gp, 3)) > 0.2 ? axisVal(gp, 3) : 0;
    if (ry !== 0) {
      cZoom = Math.max(0.55, Math.min(1.85, cZoom - ry * 1.1 * dt));
      pzChanged = true;
    }
    if (pzChanged) {
      hooks.setConstellationPanZoom(cPanX, cPanY, cZoom);
      hooks.applyConstellationTransform();
    }
    const nodes = Array.from($('constellation-nodes').querySelectorAll('.c-node:not(.center)'));
    nodes.forEach((el) => el.classList.remove('gp-focus'));
    if (nodes.length > 0) {
      if (constNavIdx >= nodes.length) constNavIdx = 0;
      const dUp = isBtn(gp, 12), dDown = isBtn(gp, 13), dLeft = isBtn(gp, 14), dRight = isBtn(gp, 15);
      if (navCooldown <= 0 && (dUp || dDown || dLeft || dRight)) {
        if (dDown || dRight) constNavIdx = (constNavIdx + 1) % nodes.length;
        else constNavIdx = (constNavIdx - 1 + nodes.length) % nodes.length;
        navCooldown = 0.18;
        const targetNode = nodes.at(constNavIdx);
        if (targetNode) {
          const rect = targetNode.getBoundingClientRect();
          const pad = 90;
          let { cPanX: px, cPanY: py, cZoom: pz } = hooks.getConstellationPanZoom();
          if (rect.left < pad) px += pad - rect.left;
          else if (rect.right > window.innerWidth - pad) px -= rect.right - (window.innerWidth - pad);
          if (rect.top < pad) py += pad - rect.top;
          else if (rect.bottom > window.innerHeight - pad) py -= rect.bottom - (window.innerHeight - pad);
          hooks.setConstellationPanZoom(px, py, pz);
          hooks.applyConstellationTransform();
        }
      }
      const curNode = nodes.at(constNavIdx);
      if (curNode) {
        curNode.classList.add('gp-focus');
        if (justA) curNode.click();
      }
    }
    if (justX) hooks.cycleSlot('e');
    else if (justY) hooks.cycleSlot('r');
    else if (justRB) hooks.cycleSlot('c');
    else if (justLB) hooks.centerConstellation();
    else if (justB) hooks.closeConstellation();
    return finishFrame(none);
  }

  // 4. Composition sur le pupitre DHD
  if (gateDialing && gameState === 'CAMP') {
    if (navCooldown <= 0 && (left || right)) {
      hooks.rotateDhdRing(left ? -1 : 1);
      navCooldown = 0.22;
    } else if (navCooldown <= 0 && (up || down)) {
      hooks.selectDhdRing(hooks.getDhdActiveRing() === 0 ? 1 : 0);
      navCooldown = 0.22;
    }
    if (justLB || justRB) {
      const pacts = hooks.getPacts();
      const save = hooks.getSave();
      const idx = pacts.findIndex((p) => p.id === save.pact);
      const dir = justRB ? 1 : -1;
      hooks.setPact(pacts.at((idx + dir + pacts.length) % pacts.length).id);
      hooks.sfx('ui');
    }
    if (justA) hooks.activateDhdPortal();
    else if (justB) hooks.exitDhdDialing();
    return finishFrame(none);
  }

  // 5. Panneau Coffre / Forgeron / Marchand au Camp
  if (campPanelOpen && gameState === 'CAMP') {
    if (justLB || justRB) {
      hooks.setCampTab(hooks.getCampTab() === 'smith' ? 'merchant' : 'smith');
      navIndex = 0;
      hooks.sfx('ui');
    }
    const items = Array.from(document.querySelectorAll('#camp-overlay .nav-item'));
    items.forEach((el) => el.classList.remove('gp-focus'));
    if (items.length > 0) {
      if (navIndex >= items.length) navIndex = 0;
      if (navCooldown <= 0 && (up || down || left || right)) {
        if (down || right) navIndex = (navIndex + 1) % items.length;
        else navIndex = (navIndex - 1 + items.length) % items.length;
        navCooldown = 0.16;
      }
      const cur = items.at(navIndex);
      if (cur) cur.classList.add('gp-focus');
      if (justA && cur) cur.click();
    }
    const selId = hooks.getSelId();
    if (justX && selId) hooks.toggleEquipItem(selId);
    else if (justY) hooks.autoEquip();
    else if (justB) hooks.closePanel();
    return finishFrame(none);
  }

  // 6. Exploration libre au Camp
  if (gameState === 'CAMP') {
    if (justA) hooks.interact();
    else if (justStart) hooks.startRun('arena');
    else if (justLB) hooks.navSelect('smith');
    else if (justRB) hooks.navSelect('merchant');
    else if (justY) hooks.openConstellation();
    let mx = axisVal(gp, 0), mz = axisVal(gp, 1);
    if (Math.hypot(mx, mz) < 0.18) { mx = 0; mz = 0; }
    return finishFrame({ mx: mx, mz: mz });
  }

  // 7. Combat actif
  if (justStart && gameState === 'COMBAT') hooks.openCamp('Pause au camp.');
  if (justA || justB || (btnRT && !prevA)) hooks.triggerDash();
  if (justX) hooks.castSkill('e');
  if (justY) hooks.castSkill('r');
  if (justRB) hooks.castSkill('c');
  let mx = axisVal(gp, 0), mz = axisVal(gp, 1);
  if (Math.hypot(mx, mz) < 0.18) { mx = 0; mz = 0; }
  return finishFrame({ mx: mx, mz: mz });
}

export function initInputListeners() {
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    const $ = (id) => document.getElementById(id);
    const gameState = hooks.getGameState();
    const gateDialing = hooks.isGateDialing();
    const campPanelOpen = hooks.isCampPanelOpen();

    if (gateDialing && gameState === 'CAMP') {
      if (e.code === 'KeyA' || e.code === 'KeyQ' || e.code === 'ArrowLeft') { e.preventDefault(); hooks.rotateDhdRing(-1); return; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { e.preventDefault(); hooks.rotateDhdRing(1); return; }
      if (e.code === 'KeyW' || e.code === 'KeyZ' || e.code === 'ArrowUp' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault(); hooks.selectDhdRing(hooks.getDhdActiveRing() === 0 ? 1 : 0); return;
      }
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); hooks.activateDhdPortal(); return; }
      if (e.code === 'Escape') { e.preventDefault(); hooks.exitDhdDialing(); return; }
      return;
    }
    if (e.code === 'Space') {
      if ($('run-end-overlay') && $('run-end-overlay').style.display === 'flex') { e.preventDefault(); hooks.replayLastMode(); return; }
      if (($('altar-overlay') && $('altar-overlay').style.display === 'flex') || ($('constellation-overlay') && $('constellation-overlay').style.display === 'block')) return;
      if (gameState === 'CAMP') { e.preventDefault(); hooks.startRun('arena'); return; }
      e.preventDefault(); hooks.triggerDash();
    }
    if (e.code === 'KeyB' && !e.repeat && gameState === 'CAMP') { hooks.navSelect('smith'); return; }
    if (e.code === 'KeyV' && !e.repeat && gameState === 'CAMP') { hooks.navSelect('merchant'); return; }
    if (e.code === 'KeyE' && !e.repeat) {
      if (gameState === 'CAMP') {
        if ($('constellation-overlay') && $('constellation-overlay').style.display === 'block') hooks.closeConstellation();
        else hooks.openConstellation();
        return;
      }
      hooks.castSkill('e');
    }
    if (e.code === 'KeyR' && !e.repeat) hooks.castSkill('r');
    if (e.code === 'KeyC' && !e.repeat) {
      if ($('constellation-overlay') && $('constellation-overlay').style.display === 'block') { hooks.centerConstellation(); return; }
      if ($('run-end-overlay') && $('run-end-overlay').style.display === 'flex') { hooks.returnCampFromEnd(); return; }
      hooks.castSkill('c');
    }
    if (e.code === 'KeyM') hooks.toggleMute();
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) hooks.triggerDash();
    if (e.code === 'Escape') {
      if ($('constellation-overlay') && $('constellation-overlay').style.display === 'block') hooks.closeConstellation();
      else if ($('altar-overlay') && $('altar-overlay').style.display === 'flex') hooks.skipCurseAltar();
      else if ($('run-end-overlay') && $('run-end-overlay').style.display === 'flex') hooks.returnCampFromEnd();
      else if (gameState === 'COMBAT') hooks.openCamp('Retraite au camp.');
      else hooks.closePanel();
    }
    if ((e.code === 'KeyF' || e.code === 'Enter') && gameState === 'CAMP' && !campPanelOpen && !gateDialing && !e.repeat) hooks.interact();
  });

  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  window.addEventListener('gamepadconnected', (e) => {
    gpIndex = e.gamepad.index;
    const badge = document.getElementById('ctrl-badge');
    if (badge) badge.style.display = 'block';
    if (hooks.getGameState() === 'CAMP') hooks.renderCamp();
    hooks.showToast('Manette connectée !');
  });

  window.addEventListener('gamepaddisconnected', () => {
    gpIndex = null;
    const badge = document.getElementById('ctrl-badge');
    if (badge) badge.style.display = 'none';
    if (hooks.getGameState() === 'CAMP') hooks.renderCamp();
  });

  const joy = document.getElementById('joy');
  if (joy) {
    joy.addEventListener('touchstart', joyMove, { passive: false });
    joy.addEventListener('touchmove', joyMove, { passive: false });
    joy.addEventListener('touchend', () => {
      touch.x = 0; touch.z = 0;
      const knob = document.getElementById('knob');
      if (knob) knob.style.transform = 'translate(0px, 0px)';
    });
  }
}
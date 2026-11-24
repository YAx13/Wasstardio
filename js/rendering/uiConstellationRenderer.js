import { save } from '../core/state.js';
import {
  SKILLS, skillLv, nodeDef, skillCost, getActiveTreeNodes, isNodeUnlocked
} from '../entities/constellations.js';

let ctx = {};
export let cPanX = 0;
export let cPanY = 0;
export let cZoom = 1;
let cDrag = false;
let cDragSX = 0;
let cDragSY = 0;
let starAnimId = null;

export function configureUiConstellationRenderer(dependencies) {
  ctx = dependencies;
}

export function getConstellationPanZoom() {
  return { cPanX, cPanY, cZoom };
}

export function setConstellationPanZoom(px, py, pz) {
  cPanX = px;
  cPanY = py;
  cZoom = pz;
}

export function applyConstellationTransform() {
  const el = ctx.$('constellation-stage');
  if (el) el.style.transform = `translate(${cPanX}px, ${cPanY}px) scale(${cZoom})`;
}

export function centerConstellation() {
  cPanX = 0;
  cPanY = 0;
  cZoom = 1;
  applyConstellationTransform();
}

export function openConstellation() {
  const { $, closePanel, updateTopNav } = ctx;
  closePanel();
  $('constellation-overlay').style.display = 'block';
  $('prompt').style.display = 'none';
  $('wizard-guide').style.display = 'none';
  centerConstellation();
  renderConstellation();
  startStarfield();
  updateTopNav();
}

export function closeConstellation() {
  const { $, updateTopNav } = ctx;
  $('constellation-overlay').style.display = 'none';
  $('c-tooltip').style.display = 'none';
  if (starAnimId) {
    cancelAnimationFrame(starAnimId);
    starAnimId = null;
  }
  updateTopNav();
}

export function showConstellationTip(ev, id) {
  const def = nodeDef(id);
  const tip = ctx.$('c-tooltip');
  if (!def || !tip) return;
  const lv = skillLv(id);
  const unlocked = isNodeUnlocked(id);
  const maxed = lv >= 5;
  const cost = skillCost(id);
  const curStat = def.stat(lv);
  const nextStat = def.stat(Math.min(5, lv + 1));
  const parentId = getActiveTreeNodes().find((n) => n.id === id)?.parent;
  const reqHtml = !unlocked && parentId
    ? `<div style="color:#f56565;font-size:13px;margin-bottom:4px;">🔒 Requiert : <b>${nodeDef(parentId).n.toUpperCase()}</b> (Niv 1)</div>`
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

export function moveConstellationTip(ev) {
  const tip = ctx.$('c-tooltip');
  if (!tip || tip.style.display !== 'block') return;
  let x = ev.clientX + 14;
  let y = ev.clientY + 14;
  const r = tip.getBoundingClientRect();
  if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - 14;
  if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}

export function hideConstellationTip() {
  const tip = ctx.$('c-tooltip');
  if (tip) tip.style.display = 'none';
}

export function renderConstellation() {
  const { $, getStats } = ctx;
  getStats(false);
  let currentSpent = 0;
  Object.keys(save.skills).forEach((sk) => { currentSpent += save.skills[sk]; });
  if ($('top-gold-val')) $('top-gold-val').textContent = `OR : ${save.gold} · TALENTS : ${currentSpent}/${save.totalTalentPoints} PTS`;

  let linesHtml = '';
  let nodesHtml = '';
  const currentTree = getActiveTreeNodes();
  const nodeMap = new Map(currentTree.map((n) => [n.id, n]));

  currentTree.forEach((n) => {
    if (n.parent) {
      const p = nodeMap.get(n.parent);
      const activeLine = skillLv(n.id) > 0;
      const unlockedLine = isNodeUnlocked(n.id);
      const strokeCol = activeLine ? '#48bb78' : (unlockedLine ? '#4a5568' : '#1e2433');
      const dashAttr = unlockedLine ? '' : 'stroke-dasharray="4 4"';
      linesHtml += `<line x1="${p.x}" y1="${p.y}" x2="${n.x}" y2="${n.y}" stroke="${strokeCol}" stroke-width="${activeLine ? 2.5 : 1.5}" ${dashAttr} />`;
    }
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
    const extraCls = n.keystone ? 'keystone' : (n.passive ? 'passive' : '');
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

  $('c-keybind-bar').innerHTML = Array.of('e', 'r', 'c').map((s) => {
    const k = Reflect.get(save.slots, s);
    const sk = k ? SKILLS.get(k) : null;
    return `<button class="c-kb-slot" title="Clic gauche : changer · Clic droit : vider" onclick="cycleSlot('${s}')" oncontextmenu="event.preventDefault(); unassignSlot('${s}');"><b style="color:#e2b740;">[${s.toUpperCase()}]</b> <span>${sk ? sk.i + ' ' + sk.n.toUpperCase() : 'VIDE'}</span></button>`;
  }).join('');
}

export function startStarfield() {
  const { $ } = ctx;
  const c = $('starfield-canvas');
  if (!c || starAnimId) return;
  const ctx2d = c.getContext('2d');
  const stars = Array.from({ length: 130 }, () => ({
    x: Math.random(),
    y: Math.random(),
    s: Math.random() < 0.75 ? 2 : 3,
    p: Math.random() * Math.PI * 2,
    sp: 1.2 + Math.random() * 2.5
  }));
  function drawStars(now) {
    if ($('constellation-overlay').style.display !== 'block') {
      starAnimId = null;
      return;
    }
    if (c.width !== window.innerWidth || c.height !== window.innerHeight) {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    ctx2d.clearRect(0, 0, c.width, c.height);
    const t = now * 0.001;
    stars.forEach((st) => {
      const alpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.sp + st.p));
      ctx2d.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(2)})`;
      ctx2d.fillRect(Math.floor(st.x * c.width), Math.floor(st.y * c.height), st.s, st.s);
    });
    starAnimId = requestAnimationFrame(drawStars);
  }
  starAnimId = requestAnimationFrame(drawStars);
}

export function initConstellationListeners() {
  const overlay = ctx.$('constellation-overlay');
  if (!overlay) return;
  overlay.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('.c-node, button, #c-keybind-bar')) return;
    cDrag = true;
    cDragSX = ev.clientX - cPanX;
    cDragSY = ev.clientY - cPanY;
  });
  overlay.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const delta = ev.deltaY > 0 ? -0.12 : 0.12;
    cZoom = Math.max(0.55, Math.min(1.85, Number((cZoom + delta).toFixed(2))));
    applyConstellationTransform();
  }, { passive: false });
  window.addEventListener('pointermove', (ev) => {
    if (!cDrag) return;
    cPanX = ev.clientX - cDragSX;
    cPanY = ev.clientY - cDragSY;
    applyConstellationTransform();
  });
  window.addEventListener('pointerup', () => { cDrag = false; });
}
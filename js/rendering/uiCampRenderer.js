import { save, persist } from '../core/state.js';
import { RAR, STAT, SLOT_ICON, SLOT_NAME, SLOTS, LEG } from '../engines/lootEngine.js';
import { SKILLS, skillLv } from '../entities/constellations.js';
import { campTab, sellCart, fusionCandidates } from '../engines/merchantEngine.js';
import { getGpIndex } from '../input/inputHandler.js';

let ctx = {};
let activeSecretTab = 0;
let draggedItemId = null;

export function configureUiCampRenderer(dependencies) {
  ctx = dependencies;
}

export function setActiveSecretTab(idx) {
  activeSecretTab = idx;
}

export function computeSetBonuses() {
  const counts = [0, 0, 0, 0, 0];
  ctx.equippedItems().forEach((it) => { counts[it.r]++; });
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

export function statLines(it) {
  const { getItem, statVal } = ctx;
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

export function upgradePreviewLines(it) {
  const { statVal } = ctx;
  let h = '';
  for (const k in it.st) {
    const d = STAT.get(k);
    const cur = statVal(it, k);
    const next = Math.round(Reflect.get(it.st, k) * (1 + 0.1 * (it.lvl + 1)));
    h += `<div>${d.n} : <span style="color:#a0aec0">${cur}${d.u}</span> → <b style="color:#48bb78">${next}${d.u}</b></div>`;
  }
  return h;
}

export function renderSecretChestUI() {
  const t = save.secretChest[activeSecretTab];
  const affsOptions = Array.from(STAT.keys()).map((k) => `<option value="${k}">${STAT.get(k).n}</option>`).join('');
  const rarityOptions = RAR.map((r, idx) => `<option value="${idx}">${r.n}</option>`).join('');

  let tabsHtml = `<div style="display:flex;gap:4px;margin-bottom:8px;">`;
  save.secretChest.forEach((tab, idx) => {
    tabsHtml += `<button class="btn mini ${idx === activeSecretTab ? 'sel' : ''}" onclick="setActiveSecretTab(${idx}); renderCamp();">${tab.name} (${tab.items.length})</button>`;
  });
  tabsHtml += `</div>`;

  let gridHtml = `<div style="display:grid;grid-template-columns:repeat(8, 48px);gap:5px;justify-content:center;margin-bottom:8px;">`;
  for (let i = 0; i < 40; i++) {
    const it = t.items[i];
    if (it) {
      const rCol = RAR.at(it.r).c;
      gridHtml += `<button class="slot" style="border-color:${rCol};position:relative;"
        onclick="withdrawSecretItem(${activeSecretTab}, ${it.id})"
        onmouseenter="showItemTooltip(event, ${it.id})" onmousemove="moveItemTooltip(event)" onmouseleave="hideItemTooltip()">
        ${SLOT_ICON.get(it.slot)}<small>🔒</small>
      </button>`;
    } else {
      gridHtml += `<div class="slot empty-slot"></div>`;
    }
  }
  gridHtml += `</div>`;

  return `
    <div style="border-top:1px solid #384152;margin-top:10px;padding-top:10px;">
      <div style="font-size:16px;color:#e2b740;font-weight:bold;margin-bottom:6px;display:flex;justify-content:between;align-items:center;">
        <span>COFFRE SECRET FILTRÉ</span>
        <button class="btn mini green-action" onclick="autoSortLoot()">FILTRER L'INVENTAIRE</button>
      </div>
      ${tabsHtml}
      <div style="background:#181d26;border:1px solid #384152;padding:8px;border-radius:4px;margin-bottom:8px;font-size:14px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div>
          <label>Affixe 1:</label>
          <select style="background:#0b0d12;color:#fff;border:1px solid #384152;width:100%;" onchange="updateSecretConfig(${activeSecretTab}, 'affix1', this.value)">
            <option value="">Aucun</option>${affsOptions}
          </select>
        </div>
        <div>
          <label>Affixe 2:</label>
          <select style="background:#0b0d12;color:#fff;border:1px solid #384152;width:100%;" onchange="updateSecretConfig(${activeSecretTab}, 'affix2', this.value)">
            <option value="">Aucun</option>${affsOptions}
          </select>
        </div>
        <div>
          <label>Rareté Min:</label>
          <select style="background:#0b0d12;color:#fff;border:1px solid #384152;width:100%;" onchange="updateSecretConfig(${activeSecretTab}, 'minRarity', this.value)">
            ${rarityOptions}
          </select>
        </div>
        <div>
          <label>IV Minimum:</label>
          <input type="number" min="0" max="100" value="${t.minIv}" style="background:#0b0d12;color:#fff;border:1px solid #384152;width:100%;text-align:center;" onchange="updateSecretConfig(${activeSecretTab}, 'minIv', this.value)">
        </div>
      </div>
      ${gridHtml}
    </div>
  `;
}

export function renderSetBonusesBox() {
  const sets = computeSetBonuses();
  const defs = [
    { idx: 1, name: 'Set Vitesse', b2: '+15% Vitesse', b4: '+25% Vit. Atq & -20% CD Esquive' },
    { idx: 2, name: 'Set Vol de Vie', b2: '+6% Vol de vie', b4: '+5% PV par élimination' },
    { idx: 3, name: 'Set Critique', b2: '+12% Chance Crit.', b4: '+45% Dégâts Critiques' },
    { idx: 4, name: 'Set Souverain', b2: '+25% Or trouvé', b4: '+20% Dégâts & +15% PV Max' }
  ];
  return defs.map((d) => {
    const cnt = sets.counts[d.idx] || 0;
    if (cnt === 0) return '';
    const rCol = RAR.at(d.idx).c;
    return `<div style="font-size:13px;border-left:3px solid ${rCol};padding-left:6px;margin-bottom:4px;">
      <b style="color:${rCol}">${d.name} (${cnt}/4)</b> :
      <span style="color:${cnt >= 2 ? '#68d391' : '#64748b'}">[2] ${d.b2}</span> ·
      <span style="color:${cnt >= 4 ? '#68d391' : '#64748b'}">[4] ${d.b4}</span>
    </div>`;
  }).join('');
}

export function renderRightPane(st) {
  const { $, getItem, isEquipped, sellValue, upgCost, rerollCost, getSelId } = ctx;
  const pane = $('right-pane');
  const selId = getSelId();

  if (campTab === 'merchant') {
    let cartGold = 0, cartCount = 0;
    sellCart.forEach((id) => { const it = getItem(id); if (it && !isEquipped(it)) { cartGold += sellValue(it); cartCount++; } });
    let filterBtns = '';
    Array.of(0, 1, 2).forEach((idx) => {
      const r = RAR.at(idx);
      filterBtns += `<button class="rar-filter nav-item" style="border-color:${r.c};color:${r.c}" onclick="addRarityToCart(${idx})" title="Ajouter ${r.n}">${r.code}</button>`;
    });
    const it = getItem(selId);
    let selHtml = '<div style="color:#94a3b8;font-size:15px;">Clique sur un objet du coffre pour l\'ajouter ou le retirer du panier.</div>';
    if (it) {
      const eqd = isEquipped(it), inCart = sellCart.has(it.id);
      selHtml = `<b style="color:${RAR.at(it.r).c};font-size:18px">${it.name.toUpperCase()} +${it.lvl}</b> <span style="color:#e2b740">(+${sellValue(it)} OR)</span>${statLines(it)}
        <div style="margin-top:6px"><button class="btn nav-item" ${eqd ? 'disabled' : ''} onclick="toggleCart(${it.id})">${eqd ? 'ÉQUIPÉ' : (inCart ? 'RETIRER DU PANIER' : 'AJOUTER AU PANIER')}</button></div>`;
    }
    save.inv.forEach((item) => { if (item.locked && sellCart.has(item.id)) sellCart.delete(item.id); });

    pane.innerHTML = `<h3>MARCHAND — VENTE</h3>
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
      <div id="detail">${selHtml}</div>
      ${renderSecretChestUI()}`;
    return;
  }

  const it = getItem(selId);
  let anvilHtml = `
    <div class="anvil-wrap">
      <div class="anvil-slot" style="border-color:#384152;opacity:0.5;"><span>—</span></div>
      <div style="color:#94a3b8;font-size:16px;">Sélectionne un objet du coffre ou équipé pour le placer sur l'enclume.</div>
    </div>`;

  if (it) {
    const eqd = isEquipped(it), maxed = it.lvl >= 10;
    const rCol = RAR.at(it.r).c;
    anvilHtml = `
      <div class="anvil-wrap">
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
          <button class="btn nav-item mini" ${eqd ? 'disabled' : ''} onclick="equipItem(${it.id})">${eqd ? 'ÉQUIPÉ' : 'ÉQUIPER'}</button>
          <div class="anvil-slot" style="border-color:${rCol};box-shadow:0 0 12px ${rCol}44;">
            ${SLOT_ICON.get(it.slot)}
            <small>+${it.lvl}</small>
          </div>
          <button class="btn nav-item mini" onclick="setCampTab('merchant'); if(!isEquipped(getItem(${it.id}))) sellCart.add(${it.id}); renderCamp();">VENDRE</button>
        </div>
        <div style="margin-top:6px;"><b style="color:${rCol};font-size:18px;">${it.name.toUpperCase()} +${it.lvl}</b> <span style="color:#94a3b8">(${RAR.at(it.r).n})</span></div>
        <div style="font-size:15px;margin-top:4px;text-align:left;background:#10141c;padding:6px;border:1px solid #384152;border-radius:4px;">
          ${maxed ? statLines(it) : upgradePreviewLines(it)}
          ${it.leg ? `<div style="color:#ed8936;margin-top:2px;">★ ${LEG.find((l) => l.k === it.leg).d}</div>` : ''}
        </div>
        <div class="row" style="margin-top:8px;">
          <button class="btn nav-item green-action" ${maxed || save.gold < upgCost(it) ? 'disabled' : ''} onclick="upgradeItem(${it.id})">${maxed ? 'NIVEAU MAX' : 'FORGER +1 (' + upgCost(it) + ' OR)'}</button>
          <button class="btn nav-item" ${save.gold < rerollCost(it) ? 'disabled' : ''} onclick="rerollItem(${it.id})">RELANCER AFFIXES (${rerollCost(it)} OR)</button>
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

  pane.innerHTML = `<h3>${campTab === 'smith' ? 'FORGERON & ENCLUME' : 'COFFRE & FORGE'}</h3>
    ${anvilHtml}
    ${fuseHtml}
    <div class="row">
      <button class="btn nav-item" onclick="autoEquip()">ÉQUIPER LE MEILLEUR</button>
      <button class="btn nav-item" onclick="setCampTab('merchant')">MARCHAND</button>
    </div>`;
}

export function onDragItem(ev, id) {
  draggedItemId = id;
  if (ev.dataTransfer) ev.dataTransfer.setData('text/plain', String(id));
}

export function onDropEquip(ev, targetSlot) {
  const { getItem, equipItem, showToast } = ctx;
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

export function toggleEquipItem(id) {
  const { getItem, isEquipped, equipItem, showToast } = ctx;
  const it = getItem(id);
  if (!it) return;
  if (isEquipped(it)) {
    Reflect.set(save.eq, it.slot, null);
    persist();
    renderCamp();
    showToast(`${it.name} déséquipé.`);
  } else {
    equipItem(id);
    showToast(`${it.name} équipé !`);
  }
}

export function showItemTooltip(ev, id) {
  const { $, getItem, isEquipped, statVal, score } = ctx;
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
  tip.innerHTML = `
    <div class="tt-head" style="color:${rObj.c}">${it.name.toUpperCase()} ${it.lvl > 0 ? '+' + it.lvl : ''}</div>
    <div class="tt-sub">
      <span>${SLOT_NAME.get(it.slot).toUpperCase()} · ${rObj.n.toUpperCase()}${ivDisplay}</span>
      <span style="color:#e2b740;">PUISSANCE ${Math.round(score(it))}</span>
    </div>
    ${statsHtml}
    ${it.r > 0 ? `<div class="tt-set">Ensemble : ${setNames[it.r]} (${setCount}/4)</div>` : ''}
    <div class="tt-foot">[Clic gauche] Sélectionner · [Clic droit] ${eqd ? 'Déséquiper' : 'Équiper'}</div>
  `;
  tip.style.display = 'block';
  moveItemTooltip(ev);
}

export function moveItemTooltip(ev) {
  const tip = ctx.$('item-tooltip');
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

export function hideItemTooltip() {
  const tip = ctx.$('item-tooltip');
  if (tip) tip.style.display = 'none';
}

export function renderHeroSkillsRow() {
  const { $, getStats, getItem } = ctx;
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

  $('hero-skills-row').innerHTML = slotsData.map((sl) => `
    <div class="h-sk" onclick="openConstellation();">
      <b>${sl.key}</b>
      <span>${sl.icon}</span>
      <div class="h-sk-tip">
        <div class="sk-t-name">${sl.name}</div>
        <div class="sk-t-cd">${sl.cd}</div>
        <div class="sk-t-desc">${sl.desc}</div>
      </div>
    </div>
  `).join('');
}

export function renderHeroEquipSlots() {
  const { $, getItem, getSelId } = ctx;
  const selId = getSelId();
  const leftSlots = Array.of('helm', 'armor', 'legs', 'boots');
  const buildSlotHtml = (slotKey) => {
    const it = getItem(Reflect.get(save.eq, slotKey));
    const lbl = SLOT_NAME.get(slotKey).toUpperCase();
    if (it) {
      const rCol = RAR.at(it.r).c;
      const onSel = it.id === selId ? 'on' : '';
      return `<div class="eq-float-slot ${onSel}" style="border-color:${rCol};box-shadow:0 0 10px ${rCol}44"
        draggable="true" ondragstart="onDragItem(event, ${it.id})"
        ondragover="event.preventDefault()" ondrop="onDropEquip(event, '${slotKey}')"
        onclick="selectItem(${it.id})" oncontextmenu="event.preventDefault(); toggleEquipItem(${it.id});"
        onmouseenter="showItemTooltip(event, ${it.id})" onmousemove="moveItemTooltip(event)" onmouseleave="hideItemTooltip()">
        ${SLOT_ICON.get(slotKey)}
        <small>${it.lvl > 0 ? '+' + it.lvl : lbl}</small>
      </div>`;
    }
    return `<div class="eq-float-slot empty" title="${lbl}"
      ondragover="event.preventDefault()" ondrop="onDropEquip(event, '${slotKey}')">
      ${SLOT_ICON.get(slotKey)}
      <small>${lbl}</small>
    </div>`;
  };
  $('eq-col-left').innerHTML = leftSlots.map(buildSlotHtml).join('');
  $('eq-col-right').innerHTML = buildSlotHtml('weapon') + buildSlotHtml('charm');
}

export function renderCamp() {
  const { $, lookColors, setLook, updateTopNav, getStats, getSelId, isEquipped, getLands } = ctx;
  setLook(lookColors());
  $('hud-gold').textContent = `OR : ${save.gold}`;
  if ($('top-gold-val')) $('top-gold-val').textContent = `OR : ${save.gold}`;
  updateTopNav();

  const st = getStats(false);
  const selId = getSelId();
  $('hero-power-val').textContent = `${st.power}`;
  renderHeroSkillsRow();
  renderHeroEquipSlots();

  const totalLeech = Math.round(st.leechPct + (st.legs.has('vamp') ? 8 : 0));
  $('hero-stats-2col').innerHTML = `
    <div class="stat-col-box">
      <div class="stat-col-title">ATTAQUE</div>
      <div class="stat-line"><span class="stat-lbl"><i style="background:#f56565"></i>DÉGÂTS</span><span class="stat-val">${Math.round(st.atk)}</span></div>
      <div class="stat-line"><span class="stat-lbl"><i style="background:#ed8936"></i>VIT. ATTAQUE</span><span class="stat-val">${(1 / st.atkRate).toFixed(2)}/s</span></div>
      <div class="stat-line"><span class="stat-lbl"><i style="background:#e2b740"></i>CRITIQUE</span><span class="stat-val">${Math.round(st.crit)}%</span></div>
    </div>
    <div class="stat-col-box">
      <div class="stat-col-title">DÉFENSE</div>
      <div class="stat-line"><span class="stat-lbl"><i style="background:#48bb78"></i>PV MAX</span><span class="stat-val">${st.maxHP}</span></div>
      <div class="stat-line"><span class="stat-lbl"><i style="background:#63b3ed"></i>ARMURE</span><span class="stat-val">${st.def}</span></div>
      <div class="stat-line"><span class="stat-lbl"><i style="background:#9f7aea"></i>VOL DE VIE</span><span class="stat-val">${totalLeech}%</span></div>
    </div>
  `;

  $('inv-count-lbl').textContent = `${save.inv.length}/40`;
  let invHtml = '';
  for (let i = 0; i < 40; i++) {
    const it = save.inv.at(i);
    if (it) {
      const onSel = it.id === selId ? 'on' : '';
      const inCart = sellCart.has(it.id) ? 'in-cart' : '';
      const rCol = RAR.at(it.r).c;
      invHtml += `<button class="slot nav-item ${onSel} ${inCart}" style="border-color:${rCol};box-shadow:0 0 8px ${rCol}33"
        draggable="true" ondragstart="onDragItem(event, ${it.id})"
        onclick="selectItem(${it.id})" oncontextmenu="event.preventDefault(); toggleEquipItem(${it.id});"
        onmouseenter="showItemTooltip(event, ${it.id})" onmousemove="moveItemTooltip(event)" onmouseleave="hideItemTooltip()">
        ${SLOT_ICON.get(it.slot)}<small>${isEquipped(it) ? '✔' : ''}${it.lvl > 0 ? '+' + it.lvl : ''}</small>
      </button>`;
    } else {
      invHtml += `<div class="slot empty-slot"></div>`;
    }
  }
  $('inv').innerHTML = invHtml;

  const isSubTab = campTab === 'smith' || campTab === 'merchant';
  $('right-pane').style.display = isSubTab ? 'block' : 'none';
  if (isSubTab) renderRightPane(st);

  if ($('bottom-launch-btn')) {
    const launchHint = getGpIndex() !== null ? '[START / ESPACE]' : '[ESPACE]';
    $('bottom-launch-btn').textContent = `LANCER ${getLands().at(save.landSel - 1).n.toUpperCase()} ${launchHint}`;
  }
}
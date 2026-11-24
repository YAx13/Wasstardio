import { save, persist } from '../core/state.js';
import { RAR, SLOTS, genStats, newItem } from './lootEngine.js';

export let campTab = 'smith';
export let sortMode = 0;
export const sellCart = new Set();

export function setCampTabValue(tab) {
  campTab = tab;
}

export function setSortModeValue(mode) {
  sortMode = mode;
}

let hooks = {
  getItem: (id) => save.inv.find((i) => i.id === id) || null,
  isEquipped: (it) => Reflect.get(save.eq, it.slot) === it.id,
  sellValue: (it) => Math.round((5 + it.il * 4) * RAR.at(it.r).sell) + it.lvl * 8,
  upgCost: (it) => Math.round((10 + it.il * 6) * (1 + it.lvl * 0.8) * (1 + it.r * 0.4)),
  rerollCost: (it) => Math.round((8 + it.il * 5) * (1 + it.r * 0.8)),
  score: (it) => (it.leg ? 40 : 0),
  getSelId: () => null,
  setSelId: () => {},
  renderCamp: () => {},
  showToast: () => {},
  sfx: () => {}
};

export function configureMerchantEngine(nextHooks) {
  hooks = { ...hooks, ...nextHooks };
}

export function sortInv() {
  sortMode = (sortMode + 1) % 2;
  if (sortMode === 0) save.inv.sort((a, b) => b.r - a.r || b.il - a.il || b.lvl - a.lvl);
  else save.inv.sort((a, b) => a.slot.localeCompare(b.slot) || b.r - a.r || b.il - a.il);
  persist();
  hooks.renderCamp();
}

export function fusionCandidates(rarIdx) {
  if (rarIdx >= RAR.length - 1) return new Array();
  return save.inv.filter((it) => !hooks.isEquipped(it) && it.r === rarIdx);
}

export function fuseFour(rarIdx) {
  const pool = fusionCandidates(rarIdx);
  if (pool.length < 4 || rarIdx >= RAR.length - 1) return;
  const used = pool.slice(0, 4);
  const usedIds = new Set(used.map((x) => x.id));
  const avgIl = Math.max(1, Math.round(used.reduce((acc, x) => acc + x.il, 0) / 4));
  const nextRar = rarIdx + 1;
  save.inv = save.inv.filter((it) => !usedIds.has(it.id));
  usedIds.forEach((id) => sellCart.delete(id));
  if (usedIds.has(hooks.getSelId())) hooks.setSelId(null);
  const created = newItem(avgIl, 2, nextRar);
  save.inv.push(created);
  hooks.setSelId(created.id);
  save.stats.fusions = (save.stats.fusions || 0) + 1;
  hooks.sfx('loot', nextRar);
  persist();
  hooks.renderCamp();
  hooks.showToast(`Fusion réussie : ${created.name} (${RAR.at(nextRar).n}) !`, 3500);
}

export function toggleCart(id) {
  const it = hooks.getItem(id);
  if (!it || hooks.isEquipped(it)) return;
  if (sellCart.has(id)) sellCart.delete(id);
  else sellCart.add(id);
  hooks.renderCamp();
}

export function addRarityToCart(rarIdx) {
  let added = 0;
  save.inv.forEach((it) => {
    if (!hooks.isEquipped(it) && it.r === rarIdx && !sellCart.has(it.id)) {
      sellCart.add(it.id);
      added++;
    }
  });
  hooks.renderCamp();
  if (added > 0) hooks.showToast(`${added} objet(s) ajouté(s) au panier.`);
}

export function addAllSurplusToCart() {
  let added = 0;
  save.inv.forEach((it) => {
    if (!hooks.isEquipped(it) && it.r <= 2 && !sellCart.has(it.id)) {
      sellCart.add(it.id);
      added++;
    }
  });
  hooks.renderCamp();
  hooks.showToast(added > 0 ? `${added} objet(s) (≤ Rare) ajouté(s).` : 'Aucun surplus à ajouter.');
}

export function confirmSellCart() {
  let total = 0, count = 0;
  sellCart.forEach((id) => {
    const it = hooks.getItem(id);
    if (it && !hooks.isEquipped(it) && !it.locked) {
      total += hooks.sellValue(it);
      count++;
    }
  });
  if (count === 0) return;
  save.inv = save.inv.filter((it) => !sellCart.has(it.id) || hooks.isEquipped(it));
  save.gold += total;
  sellCart.clear();
  if (!hooks.getItem(hooks.getSelId())) hooks.setSelId(null);
  persist();
  hooks.renderCamp();
  hooks.showToast(`Vendu ${count} objet(s) : +${total} or !`);
}

export function selectItem(id) {
  hooks.setSelId(id);
  if (campTab === 'merchant') {
    const it = hooks.getItem(id);
    if (it && !hooks.isEquipped(it)) {
      if (sellCart.has(id)) sellCart.delete(id);
      else sellCart.add(id);
    }
  }
  hooks.renderCamp();
}

export function upgradeItem(id) {
  const it = hooks.getItem(id);
  if (!it || it.lvl >= 10 || save.gold < hooks.upgCost(it)) return;
  save.gold -= hooks.upgCost(it);
  it.lvl++;
  persist();
  hooks.renderCamp();
}

export function rerollItem(id) {
  const it = hooks.getItem(id);
  if (!it || save.gold < hooks.rerollCost(it)) return;
  save.gold -= hooks.rerollCost(it);
  genStats(it);
  persist();
  hooks.renderCamp();
}

export function autoEquip() {
  SLOTS.forEach((k) => {
    let best = null;
    save.inv.forEach((it) => {
      if (it.slot === k && (!best || hooks.score(it) > hooks.score(best))) best = it;
    });
    if (best) {
      sellCart.delete(best.id);
      Reflect.set(save.eq, k, best.id);
    }
  });
  persist();
  hooks.renderCamp();
}
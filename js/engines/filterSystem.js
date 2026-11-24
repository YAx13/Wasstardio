import { save, persist } from '../core/state.js';

let hooks = {
  getGameState: () => 'CAMP',
  isEquipped: () => false,
  renderCamp: () => {},
  showToast: () => {}
};

export function configureFilterSystem(nextHooks) {
  hooks = { ...hooks, ...nextHooks };
}

export function updateSecretConfig(tabIdx, key, val) {
  const t = save.secretChest[tabIdx];
  if (!t) return;
  if (key === 'affix1') t.affixes[0] = val || null;
  else if (key === 'affix2') t.affixes[1] = val || null;
  else if (key === 'minRarity') t.minRarity = parseInt(val, 10) || 0;
  else if (key === 'minIv') t.minIv = parseInt(val, 10) || 0;
  persist();
  hooks.renderCamp();
}

export function routeItemToSecretChest(it) {
  if (!save.secretChest || !Array.isArray(save.secretChest)) return false;
  const sortedTabs = save.secretChest
    .map((tab, idx) => ({ tab, idx }))
    .sort((a, b) => (b.tab.minIv - a.tab.minIv) || (b.tab.minRarity - a.tab.minRarity));

  for (const { tab } of sortedTabs) {
    if (tab.items.length >= 40) continue;
    if (it.r < tab.minRarity) continue;
    if ((it.iv || 0) < tab.minIv) continue;

    const filterAffs = (tab.affixes || []).filter(Boolean);
    const matchesAffixes = filterAffs.every((aff) => Reflect.has(it.st, aff));
    if (!matchesAffixes) continue;

    it.locked = true;
    tab.items.push(it);
    return true;
  }
  return false;
}

export function autoSortLoot() {
  if (hooks.getGameState() !== 'CAMP') return;
  let sortedCount = 0;

  for (let i = save.inv.length - 1; i >= 0; i--) {
    const it = save.inv[i];
    if (hooks.isEquipped(it) || it.locked) continue;

    if (routeItemToSecretChest(it)) {
      save.inv.splice(i, 1);
      sortedCount++;
    }
  }

  if (sortedCount > 0) {
    persist();
    hooks.renderCamp();
    hooks.showToast(`${sortedCount} objet(s) routé(s) et verrouillé(s) dans le coffre secret.`, 3000);
  } else {
    hooks.showToast('Aucun objet ne correspond aux filtres actifs.');
  }
}

export function withdrawSecretItem(tabIdx, itemId) {
  const tab = save.secretChest[tabIdx];
  if (!tab || save.inv.length >= 40) { hooks.showToast('Inventaire plein !'); return; }
  const idx = tab.items.findIndex(it => it.id === itemId);
  if (idx === -1) return;
  const it = tab.items[idx];
  it.locked = false;
  save.inv.push(it);
  tab.items.splice(idx, 1);
  persist();
  hooks.renderCamp();
}
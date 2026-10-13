import { useCallback, useSyncExternalStore } from 'react';

/** Panier du catalogue Données foncières — séparé du panier de la carte cadastrale. */
export interface AnalyticsCartItem {
  tab_key: string;
  item_key: string;
  title: string;
  tab_label: string;
  price_usd: number;
}

const STORAGE_KEY = 'bic-analytics-cart';
const listeners = new Set<() => void>();
let cache: AnalyticsCartItem[] | null = null;

const read = (): AnalyticsCartItem[] => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as AnalyticsCartItem[]) : [];
  } catch {
    cache = [];
  }
  return cache;
};

const write = (items: AnalyticsCartItem[]) => {
  cache = items;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* stockage indisponible */ }
  listeners.forEach(l => l());
};

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const same = (a: { tab_key: string; item_key: string }, b: { tab_key: string; item_key: string }) =>
  a.tab_key === b.tab_key && a.item_key === b.item_key;

export function useAnalyticsCart() {
  const items = useSyncExternalStore(subscribe, read, () => []);
  const add = useCallback((it: AnalyticsCartItem | AnalyticsCartItem[]) => {
    const list = Array.isArray(it) ? it : [it];
    const cur = read();
    write([...cur, ...list.filter(n => !cur.some(c => same(c, n)))]);
  }, []);
  const remove = useCallback((tab_key: string, item_key: string) => {
    write(read().filter(c => !same(c, { tab_key, item_key })));
  }, []);
  const removeMany = useCallback((keys: { tab_key: string; item_key: string }[]) => {
    write(read().filter(c => !keys.some(k => same(c, k))));
  }, []);
  const clear = useCallback(() => write([]), []);
  const has = useCallback((tab_key: string, item_key: string) => items.some(c => same(c, { tab_key, item_key })), [items]);
  const total = items.reduce((t, i) => t + i.price_usd, 0);
  return { items, add, remove, removeMany, clear, has, total };
}

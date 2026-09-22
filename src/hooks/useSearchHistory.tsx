import { useState, useEffect } from 'react';

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters?: any;
  timestamp: number;
}

export interface FavoriteParcel {
  id: string;
  parcel_number: string;
  parcel_id: string;
  owner_name: string;
  location: string;
  timestamp: number;
}

const HISTORY_KEY = 'cadastral_search_history';
const FAVORITES_KEY = 'cadastral_favorites';
const MAX_HISTORY = 20;
const MAX_FAVORITES = 50;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

/** Lecture tolérante : une entrée corrompue ne doit pas casser la recherche. */
function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (e) {
    console.error(`Erreur chargement ${key}:`, e);
    localStorage.removeItem(key);
    return [];
  }
}

function writeList(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Écriture ${key} impossible:`, e);
  }
}

export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteParcel[]>([]);

  // Charger l'historique au démarrage
  useEffect(() => {
    setHistory(readList<SearchHistoryItem>(HISTORY_KEY));
    setFavorites(readList<FavoriteParcel>(FAVORITES_KEY));
  }, []);

  const addToHistory = (query: string, filters?: any) => {
    const newItem: SearchHistoryItem = { id: newId(), query, filters, timestamp: Date.now() };
    // Mise à jour fonctionnelle : deux ajouts rapprochés ne s'écrasent plus.
    setHistory(prev => {
      const updated = [newItem, ...prev.filter(item => item.query !== query)].slice(0, MAX_HISTORY);
      writeList(HISTORY_KEY, updated);
      return updated;
    });
  };

  const removeFromHistory = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      writeList(HISTORY_KEY, updated);
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const addToFavorites = (parcel: Omit<FavoriteParcel, 'id' | 'timestamp'>) => {
    const newFavorite: FavoriteParcel = { ...parcel, id: newId(), timestamp: Date.now() };

    setFavorites(prev => {
      const updated = [newFavorite, ...prev.filter(f => f.parcel_id !== parcel.parcel_id)]
        .slice(0, MAX_FAVORITES);
      writeList(FAVORITES_KEY, updated);
      return updated;
    });
  };

  const removeFromFavorites = (id: string) => {
    setFavorites(prev => {
      const updated = prev.filter(fav => fav.id !== id);
      writeList(FAVORITES_KEY, updated);
      return updated;
    });
  };

  const isFavorite = (parcelId: string) => {
    return favorites.some(fav => fav.parcel_id === parcelId);
  };

  return {
    history,
    favorites,
    addToHistory,
    removeFromHistory,
    clearHistory,
    addToFavorites,
    removeFromFavorites,
    isFavorite
  };
};

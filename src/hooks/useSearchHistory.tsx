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

export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteParcel[]>([]);

  // Charger l'historique au démarrage
  useEffect(() => {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    const storedFavorites = localStorage.getItem(FAVORITES_KEY);
    
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error('Erreur chargement historique:', e);
      }
    }
    
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch (e) {
        console.error('Erreur chargement favoris:', e);
      }
    }
  }, []);

  const addToHistory = (query: string, filters?: any) => {
    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query,
      filters,
      timestamp: Date.now()
    };

    const updatedHistory = [newItem, ...history.filter(item => item.query !== query)]
      .slice(0, MAX_HISTORY);
    
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const removeFromHistory = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const addToFavorites = (parcel: Omit<FavoriteParcel, 'id' | 'timestamp'>) => {
    const newFavorite: FavoriteParcel = {
      ...parcel,
      id: Date.now().toString(),
      timestamp: Date.now()
    };

    const updatedFavorites = [newFavorite, ...favorites.filter(f => f.parcel_id !== parcel.parcel_id)];
    setFavorites(updatedFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
  };

  const removeFromFavorites = (id: string) => {
    const updatedFavorites = favorites.filter(fav => fav.id !== id);
    setFavorites(updatedFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
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

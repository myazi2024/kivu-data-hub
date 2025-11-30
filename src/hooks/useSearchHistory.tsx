import { useState, useEffect } from 'react';

interface SearchHistoryItem {
  id: string;
  filters: any;
  label: string;
  timestamp: number;
}

interface FavoriteSearch {
  id: string;
  filters: any;
  name: string;
  createdAt: number;
}

const HISTORY_KEY = 'cadastral_search_history';
const FAVORITES_KEY = 'cadastral_search_favorites';
const MAX_HISTORY = 20;

export const useSearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteSearch[]>([]);

  useEffect(() => {
    loadHistory();
    loadFavorites();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement favoris:', error);
    }
  };

  const addToHistory = (filters: any, label: string) => {
    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      filters,
      label,
      timestamp: Date.now()
    };

    const updatedHistory = [newItem, ...history.filter(h => h.label !== label)].slice(0, MAX_HISTORY);
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const removeFromHistory = (id: string) => {
    const updatedHistory = history.filter(h => h.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const addToFavorites = (filters: any, name: string) => {
    const newFavorite: FavoriteSearch = {
      id: Date.now().toString(),
      filters,
      name,
      createdAt: Date.now()
    };

    const updatedFavorites = [...favorites, newFavorite];
    setFavorites(updatedFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
  };

  const removeFromFavorites = (id: string) => {
    const updatedFavorites = favorites.filter(f => f.id !== id);
    setFavorites(updatedFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
  };

  return {
    history,
    favorites,
    addToHistory,
    clearHistory,
    removeFromHistory,
    addToFavorites,
    removeFromFavorites
  };
};

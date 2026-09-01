import { useCallback, useEffect, useRef, useState } from 'react';

export type SearchHintKey = 'parcel' | 'title';

export interface SearchHintFlowOptions {
  /** Délai avant apparition pour le mode parcelle (défaut : 10 s). */
  parcelDelayMs?: number;
  /** Délai avant apparition pour le mode titre (défaut : 4 s). */
  titleDelayMs?: number;
}

/**
 * Machine à états légère pour les infobulles contextuelles de la recherche
 * cadastrale (une par mode de recherche) :
 *
 *  - l'infobulle du mode actif apparaît après un délai sans saisie ;
 *  - elle disparaît dès que l'utilisateur tape, sélectionne une parcelle
 *    (`hasInteracted`) ou la ferme ;
 *  - chaque mode n'affiche son infobulle qu'une seule fois par session.
 */
export const useSearchHintFlow = (
  activeKey: SearchHintKey,
  hasInteracted: boolean,
  opts: SearchHintFlowOptions = {},
) => {
  const { parcelDelayMs = 10_000, titleDelayMs = 4_000 } = opts;
  const delayMs = activeKey === 'title' ? titleDelayMs : parcelDelayMs;

  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef<Set<SearchHintKey>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Planifie l'apparition pour le mode actif (si pas encore vu et pas d'interaction)
  useEffect(() => {
    setVisible(false);
    if (dismissedRef.current.has(activeKey) || hasInteracted) return;
    timerRef.current = setTimeout(() => setVisible(true), delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeKey, hasInteracted, delayMs]);

  // Toute interaction (frappe, sélection) masque l'infobulle du mode actif définitivement
  useEffect(() => {
    if (hasInteracted && visible) {
      dismissedRef.current.add(activeKey);
      setVisible(false);
    }
  }, [hasInteracted, visible, activeKey]);

  const dismiss = useCallback(() => {
    dismissedRef.current.add(activeKey);
    setVisible(false);
  }, [activeKey]);

  return { showHint: visible, dismiss };
};

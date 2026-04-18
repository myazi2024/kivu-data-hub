import { useEffect, useReducer, useRef } from 'react';

/**
 * Tiny state machine replacing the cascade of setTimeout flags.
 *
 * States:
 *  - hidden: nothing shown
 *  - button-visible: the "Demander un titre foncier" button is rendered
 *  - notification-visible: the popover hint is shown
 *  - dismissed: the user interacted; we never re-show
 *
 * Timings (ms) are configurable.
 */

export interface LandTitleNotificationOptions {
  showButtonAfterMs?: number;
  showNotificationAfterMs?: number;
}

type State = 'hidden' | 'button' | 'notification' | 'dismissed';

type Action =
  | { type: 'SHOW_BUTTON' }
  | { type: 'SHOW_NOTIFICATION' }
  | { type: 'DISMISS' };

const reducer = (state: State, action: Action): State => {
  if (state === 'dismissed') return 'dismissed';
  switch (action.type) {
    case 'SHOW_BUTTON':
      return state === 'hidden' ? 'button' : state;
    case 'SHOW_NOTIFICATION':
      return state === 'button' ? 'notification' : state;
    case 'DISMISS':
      return 'dismissed';
  }
};

export const useLandTitleNotificationFlow = (
  hasUserInteracted: boolean,
  opts: LandTitleNotificationOptions = {}
) => {
  const { showButtonAfterMs = 10_000, showNotificationAfterMs = 20_000 } = opts;
  const [state, dispatch] = useReducer(reducer, 'hidden');
  const buttonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule "show button" once on mount
  useEffect(() => {
    buttonTimer.current = setTimeout(() => dispatch({ type: 'SHOW_BUTTON' }), showButtonAfterMs);
    return () => {
      if (buttonTimer.current) clearTimeout(buttonTimer.current);
    };
  }, [showButtonAfterMs]);

  // Schedule "show notification" after button is visible (and only if user hasn't interacted)
  useEffect(() => {
    if (state !== 'button') return;
    if (hasUserInteracted) return;
    notifTimer.current = setTimeout(() => dispatch({ type: 'SHOW_NOTIFICATION' }), showNotificationAfterMs - showButtonAfterMs);
    return () => {
      if (notifTimer.current) clearTimeout(notifTimer.current);
    };
  }, [state, hasUserInteracted, showNotificationAfterMs, showButtonAfterMs]);

  // User interaction dismisses the notification (but keeps the button visible)
  useEffect(() => {
    if (hasUserInteracted && state === 'notification') {
      dispatch({ type: 'DISMISS' });
    }
  }, [hasUserInteracted, state]);

  return {
    showButton: state === 'button' || state === 'notification',
    showNotification: state === 'notification',
    dismiss: () => dispatch({ type: 'DISMISS' }),
  };
};

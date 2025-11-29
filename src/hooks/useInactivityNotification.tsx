import { useState, useEffect, useRef } from 'react';

interface UseInactivityNotificationProps {
  delay?: number; // délai en ms avant d'afficher la notification
  enabled?: boolean;
}

export const useInactivityNotification = ({ 
  delay = 5000, 
  enabled = true 
}: UseInactivityNotificationProps = {}) => {
  const [showNotification, setShowNotification] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hasInteractedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasInteractedRef.current) return;

    timeoutRef.current = setTimeout(() => {
      setShowNotification(true);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay, enabled]);

  const dismissNotification = () => {
    setShowNotification(false);
    hasInteractedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const resetInactivity = () => {
    setShowNotification(false);
    hasInteractedRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        setShowNotification(true);
      }, delay);
    }
  };

  return {
    showNotification,
    dismissNotification,
    resetInactivity
  };
};

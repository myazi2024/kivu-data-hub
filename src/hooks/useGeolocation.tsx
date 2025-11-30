import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const useGeolocation = () => {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      const errorMsg = 'La géolocalisation n\'est pas supportée par votre navigateur';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLoading(false);
        toast.success('Position actuelle obtenue');
      },
      (err) => {
        const errorMsg = 'Impossible d\'obtenir votre position';
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
        console.error('Erreur géolocalisation:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  const clearPosition = () => {
    setCoords(null);
    setError(null);
  };

  return {
    coords,
    loading,
    error,
    getCurrentPosition,
    clearPosition
  };
};

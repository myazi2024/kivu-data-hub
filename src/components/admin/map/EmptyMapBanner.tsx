import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

/**
 * Bandeau affiché quand 0 contribution réelle approuvée à afficher sur la carte admin.
 */
export const EmptyMapBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(0);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const { count: realApproved } = await supabase
        .from('cadastral_contributions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .not('parcel_number', 'ilike', 'TEST-%');
      const { count: pendingCount } = await supabase
        .from('cadastral_contributions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setShow((realApproved || 0) === 0);
      setPending(pendingCount || 0);
    })();
  }, []);

  if (!show) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Carte vide — aucune contribution réelle approuvée</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          La carte affiche uniquement les contributions cadastrales validées (hors données de test).
          Aucune contribution réelle n'a encore été approuvée.
        </p>
        <Button size="sm" variant="outline" onClick={() => nav('/admin?tab=ccc')}>
          {pending > 0 ? `Voir les ${pending} contributions en attente` : 'Aller au module CCC'}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};

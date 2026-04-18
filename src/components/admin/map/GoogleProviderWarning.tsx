import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

/**
 * Avertissement légal affiché dans AdminMapProviders concernant l'utilisation des tuiles Google.
 */
export const GoogleProviderWarning: React.FC = () => (
  <Alert variant="destructive">
    <ShieldAlert className="h-4 w-4" />
    <AlertTitle>Avertissement légal — Tuiles Google Maps</AlertTitle>
    <AlertDescription className="text-xs">
      L'utilisation directe des tuiles Google (roadmap, satellite, hybrid) sans contrat
      Google Maps Platform constitue une violation des CGU. Les fournisseurs Google ont été
      désactivés par défaut. Activez-les uniquement si votre organisation dispose d'un
      contrat valide.
    </AlertDescription>
  </Alert>
);

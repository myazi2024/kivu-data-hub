import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const AdminParcelTooltipConfig = () => {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuration de l'Infobulle Cadastrale</h2>
        <p className="text-muted-foreground mt-2">
          L'infobulle de la carte cadastrale affiche les informations de base de chaque parcelle
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Panneau d'information de la parcelle</CardTitle>
          <CardDescription>
            Cette infobulle s'affiche automatiquement lorsqu'un utilisateur sélectionne une parcelle sur la carte cadastrale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Informations affichées :</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Numéro de la parcelle</li>
                <li>Surface calculée ou déclarée (m²)</li>
                <li>Localisation complète (Province, Ville, Commune, Quartier)</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Boutons d'action disponibles :</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Afficher plus de données</strong> : Redirige vers les services cadastraux pour consulter l'historique complet</li>
                <li><strong>Besoin d'aide ?</strong> : Ouvre une conversation WhatsApp avec l'assistance</li>
                <li><strong>Données manquantes</strong> : Permet de compléter les informations incomplètes (affiché uniquement si nécessaire)</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              L'infobulle affiche uniquement les parcelles des contributions CCC validées (statut : approuvé)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminParcelTooltipConfig;

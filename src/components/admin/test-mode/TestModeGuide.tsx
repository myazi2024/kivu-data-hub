import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const guidelines = [
  <>Activez le <strong>mode test</strong> avant de tester les flux critiques (paiements, contributions, etc.)</>,
  <>Toutes les données créées en mode test auront le préfixe <strong>TEST-</strong> dans leur numéro de parcelle</>,
  <>Utilisez <strong>"Générer données de test"</strong> pour créer rapidement des jeux de données de test</>,
  <>Le <strong>nettoyage automatique</strong> supprimera les données de test après le délai configuré (cron quotidien)</>,
  <>Utilisez <strong>"Nettoyer tout"</strong> pour supprimer manuellement toutes les données de test</>,
  <><strong>Important :</strong> Désactivez le mode test en production pour éviter la pollution des données</>,
];

const TestModeGuide: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Guide d'utilisation</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 text-sm text-muted-foreground">
      {guidelines.map((text, i) => (
        <div key={i} className="flex gap-2">
          <div className="shrink-0 mt-0.5">•</div>
          <p>{text}</p>
        </div>
      ))}
    </CardContent>
  </Card>
);

export default TestModeGuide;

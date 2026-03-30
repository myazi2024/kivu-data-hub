import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const guidelines = [
  <>Activez le <strong>mode test</strong> avant de tester les flux critiques (paiements, contributions, etc.)</>,
  <>Toutes les données créées en mode test auront le préfixe <strong>TEST-</strong> dans leur numéro de parcelle ou référence</>,
  <>Utilisez <strong>"Générer données de test"</strong> pour créer un jeu complet : parcelles, contributions, factures, paiements, codes CCC, titres, expertises, litiges, conflits, historique et certificats</>,
  <>Le <strong>nettoyage automatique</strong> supprimera les données de test après le délai configuré (via cron quotidien)</>,
  <>Utilisez <strong>"Nettoyer tout"</strong> pour supprimer manuellement toutes les données de test (respecte l'ordre FK)</>,
  <><strong>Important :</strong> Les données test sont isolées dans l'environnement <code>/test/*</code> et n'apparaissent plus dans les routes de production</>,
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
      <div className="pt-3 border-t">
        <p className="font-medium text-foreground mb-2">Accéder à l'environnement de test :</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/test/cadastral-map" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Carte cadastrale (test)
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/test/map" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Carte (test)
            </a>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default TestModeGuide;

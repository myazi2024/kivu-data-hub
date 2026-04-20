import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, BarChart3, Map as MapIcon } from 'lucide-react';
import { useTestMode } from '@/hooks/useTestMode';

const guidelines = [
  <>Activez le <strong>mode test</strong> avant de tester les flux critiques (paiements, contributions, etc.)</>,
  <>Toutes les données créées en mode test auront le préfixe <strong>TEST-</strong> dans leur numéro de parcelle ou référence</>,
  <>À l'activation, un <strong>jeu complet de données</strong> est généré automatiquement : ~3 510 parcelles (26 provinces × densité variable), ~3 510 contributions, ~1 170 factures, ~700 paiements, ~500 historiques propriété/taxes, ~350 autorisations, ~290 hypothèques, ~230 bornages, 52 litiges, 52 conflits, 52 certificats, 52 mutations, 26 lotissements</>,
  <>Le <strong>nettoyage manuel</strong> s'effectue via le bouton « Nettoyer tout » (RPC <code>cleanup_all_test_data()</code>) — purge immédiate de toutes les données <code>TEST-</code>.</>,
  <>Le <strong>nettoyage automatique</strong> est exécuté chaque jour à 03:00 UTC (cron <code>cleanup-test-data-daily-rpc</code>) lorsque l'option « Nettoyage automatique » est activée. Seules les données plus anciennes que la durée de rétention configurée sont supprimées.</>,
  <>Utilisez <strong>"Nettoyer tout"</strong> pour purger immédiatement (respecte l'ordre FK via la RPC serveur)</>,
  <>Utilisez <strong>"Régénérer"</strong> pour supprimer et recréer un jeu de données test frais en une seule action</>,
  <><strong>Important :</strong> Les données test sont isolées dans l'environnement <code>/test/*</code> et sont exclues des analytics de production. Pour vérifier les visuels analytics, ouvrez <code>/test/map</code> (Données foncières test). La navigation reste dans l'environnement test automatiquement.</>,
];

const TestModeGuide: React.FC = () => {
  const { isTestModeActive } = useTestMode();

  return (
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
        {isTestModeActive && (
          <div className="pt-3 border-t">
            <p className="font-medium text-foreground mb-2">Accéder à l'environnement de test :</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" asChild>
                <a href="/test/map" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir Analytics test dans un nouvel onglet">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  Analytics / Données foncières (test)
                  <ExternalLink className="h-3 w-3 ml-1.5" aria-hidden="true" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/test/cadastral-map" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir Carte cadastrale test dans un nouvel onglet">
                  <MapIcon className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  Carte cadastrale (test)
                  <ExternalLink className="h-3 w-3 ml-1.5" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestModeGuide;

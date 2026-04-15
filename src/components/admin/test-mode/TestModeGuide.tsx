import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const guidelines = [
  <>Activez le <strong>mode test</strong> avant de tester les flux critiques (paiements, contributions, etc.)</>,
  <>Toutes les données créées en mode test auront le préfixe <strong>TEST-</strong> dans leur numéro de parcelle ou référence</>,
  <>À l'activation, un <strong>jeu complet de données</strong> est généré automatiquement : ~7 020 parcelles (26 provinces × densité variable), ~7 020 contributions, ~2 340 factures, ~1 000 historiques propriété/taxes, <>À l'activation, un <strong>jeu complet de données</strong> est généré automatiquement : ~7 020 parcelles (26 provinces × densité variable), ~7 020 contributions, ~2 340 factures, ~1 000 historiques propriété/taxes, ~700 autorisations, ~585 hypothèques, ~470 bornages, 52 litiges, 52 conflits, 52 certificats, 52 mutations, 26 lotissements</>,, ~585 hypothèques, ~470 bornages, 52 litiges, 52 conflits, 52 certificats, 52 mutations, 26 lotissements</>,
  <>Le <strong>nettoyage automatique</strong> peut être configuré via une tâche cron SQL directe (<code>SELECT cleanup_all_test_data()</code>) — le nettoyage via Edge Function n'est plus recommandé</>,
  <>Utilisez <strong>"Nettoyer tout"</strong> pour supprimer manuellement toutes les données de test (respecte l'ordre FK via la RPC serveur)</>,
  <>Utilisez <strong>"Régénérer"</strong> pour supprimer et recréer un jeu de données test frais en une seule action</>,
  <><strong>Important :</strong> Les données test sont isolées dans l'environnement <code>/test/*</code> et sont exclues des analytics de production. Pour vérifier les visuels analytics, ouvrez <code>/test/map</code> (Données foncières test). La navigation reste dans l'environnement test automatiquement.</>,
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
          <Button variant="default" size="sm" asChild>
            <a href="/test/map" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              📊 Analytics / Données foncières (test)
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/test/cadastral-map" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              🗺️ Carte cadastrale (test)
            </a>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default TestModeGuide;

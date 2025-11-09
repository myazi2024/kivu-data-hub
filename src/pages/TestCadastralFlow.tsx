import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import CadastralFlowTestRunner from '@/components/cadastral/CadastralFlowTestRunner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TestCadastralFlow = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* En-tête */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Badge variant="outline">Tests de validation</Badge>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Test du Flux Cadastral</h1>
            <p className="text-muted-foreground">
              Validation complète du comportement de la recherche cadastrale et du catalogue de services
            </p>
          </div>

          {/* Composant de test principal */}
          <CadastralFlowTestRunner />

          {/* Informations supplémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">✅ Comportement attendu</CardTitle>
                <CardDescription>Ce qui doit se passer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">1.</span>
                  <span>Recherche cadastrale trouve une parcelle</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">2.</span>
                  <span>Le ParcelInfoPanel s'affiche sur la carte avec infos de base</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">3.</span>
                  <span>Le dialogue modal NE s'affiche PAS automatiquement</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">4.</span>
                  <span>Clic sur "Afficher plus de données" → redirection vers /services</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">5.</span>
                  <span>Catalogue de services cadastraux s'affiche avec 6 services + prix</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Tests via Console
                </CardTitle>
                <CardDescription>Commandes disponibles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="bg-muted p-3 rounded font-mono text-xs space-y-2">
                  <div>
                    <div className="text-muted-foreground mb-1">// Lancer tous les tests</div>
                    <div>await runCadastralFlowTests()</div>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="text-muted-foreground mb-1">// Voir les instructions</div>
                    <div>cadastralFlowValidator.getManualTestInstructions()</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ouvrez la console du navigateur (F12) pour exécuter ces commandes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Notes importantes */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">📝 Modifications apportées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ul className="space-y-2 list-disc list-inside">
                <li>
                  <strong>Suppression de l'affichage automatique:</strong> Le CadastralResultsDialog ne s'affiche plus automatiquement après une recherche
                </li>
                <li>
                  <strong>Affichage du ParcelInfoPanel:</strong> Quand une recherche réussit, le ParcelInfoPanel s'affiche sur la carte
                </li>
                <li>
                  <strong>Navigation vers services:</strong> Le bouton "Afficher plus de données" redirige vers /services?parcel=XXX
                </li>
                <li>
                  <strong>Catalogue adaptatif:</strong> La page /services affiche le catalogue cadastral quand un paramètre parcel est présent
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TestCadastralFlow;

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { runFullIntegrationTest } from '@/utils/testCadastralIntegration';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const CadastralTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const handleRunTests = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    try {
      const testSummary = await runFullIntegrationTest();
      setResults(testSummary.results);
      setSummary(testSummary);
    } catch (error) {
      console.error('Erreur lors de l\'exécution des tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Réussi</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Avertissement</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">🧪 Test d'Intégration Cadastrale</CardTitle>
          <CardDescription>
            Validation complète du système de cadastre collaboratif (front-end et back-end)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleRunTests} 
            disabled={isRunning}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Tests en cours...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Lancer les tests
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Résumé des Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-600">{summary.success}</div>
                <div className="text-sm text-green-700">Réussis</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-3xl font-bold text-yellow-600">{summary.warnings}</div>
                <div className="text-sm text-yellow-700">Avertissements</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-3xl font-bold text-red-600">{summary.errors}</div>
                <div className="text-sm text-red-700">Erreurs</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">{summary.successRate}%</div>
                <div className="text-sm text-blue-700">Taux de réussite</div>
              </div>
            </div>

            {summary.successRate === 100 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-2xl mb-2">🎉</div>
                <div className="font-semibold text-green-800">
                  Tous les tests sont passés avec succès !
                </div>
              </div>
            )}

            {(summary.errors > 0 || summary.warnings > 0) && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-semibold text-yellow-800 mb-2">💡 Recommandations</div>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  {summary.errors > 0 && (
                    <li>Des erreurs ont été détectées. Consultez les détails ci-dessous.</li>
                  )}
                  {summary.warnings > 0 && (
                    <li>Des avertissements ont été détectés. Ils n'empêchent pas le fonctionnement mais pourraient être améliorés.</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Détails des Tests</CardTitle>
            <CardDescription>
              {results.length} test(s) exécuté(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <Card key={index} className="border-l-4" style={{
                    borderLeftColor: result.status === 'success' ? '#22c55e' : 
                                    result.status === 'warning' ? '#eab308' : '#ef4444'
                  }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(result.status)}
                          <div className="flex-1">
                            <div className="font-semibold text-sm mb-1">{result.name}</div>
                            <div className="text-sm text-muted-foreground">{result.message}</div>
                          </div>
                        </div>
                        {getStatusBadge(result.status)}
                      </div>
                    </CardHeader>
                    {result.details && (
                      <>
                        <Separator />
                        <CardContent className="pt-3">
                          <div className="text-xs">
                            <div className="font-semibold mb-2 text-muted-foreground">Détails:</div>
                            <pre className="bg-muted p-3 rounded-md overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CadastralTestRunner;

// Exporter une fonction pour exécuter les tests depuis la console
export const runTestsFromConsole = async () => {
  console.log('🚀 Lancement des tests depuis la console...\n');
  return await runFullIntegrationTest();
};

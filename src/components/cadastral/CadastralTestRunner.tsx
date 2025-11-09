import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cadastralTests } from '@/utils/testCadastralIntegration';

interface TestResultDisplay {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const CadastralTestRunner: React.FC = () => {
  const [parcelNumber, setParcelNumber] = useState('GOM/NOR/ZLE/065');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResultDisplay[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const handleRunTests = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    try {
      const testResults = await cadastralTests.runAllTests(parcelNumber);
      setResults(testResults);
      setSummary(cadastralTests.getSummary());
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
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Succès</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Avertissement</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tests de Validation Cadastrale</CardTitle>
          <CardDescription>
            Exécuter les tests de validation pour l'intégration cadastrale (front-end et back-end)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parcelNumber">Numéro de Parcelle (optionnel)</Label>
            <Input
              id="parcelNumber"
              value={parcelNumber}
              onChange={(e) => setParcelNumber(e.target.value)}
              placeholder="Ex: GOM/NOR/ZLE/065"
            />
            <p className="text-xs text-muted-foreground">
              Si fourni, des tests spécifiques à cette parcelle seront exécutés
            </p>
          </div>

          <Button 
            onClick={handleRunTests} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exécution des tests...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Lancer les tests
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé des Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-500">{summary.success}</div>
                <div className="text-sm text-muted-foreground">Succès</div>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                <div className="text-2xl font-bold text-yellow-500">{summary.warnings}</div>
                <div className="text-sm text-muted-foreground">Avertissements</div>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{summary.errors}</div>
                <div className="text-sm text-muted-foreground">Erreurs</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-3xl font-bold text-primary">{summary.healthScore}</div>
              <div className="text-sm text-muted-foreground">Score de Santé</div>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <Card key={index} className="border-l-4" style={{
              borderLeftColor: result.status === 'success' ? '#22c55e' : 
                              result.status === 'warning' ? '#eab308' : '#ef4444'
            }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <CardTitle className="text-base">{result.name}</CardTitle>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary hover:underline">
                      Voir les détails
                    </summary>
                    <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CadastralTestRunner;

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react';
import CadastralFlowValidator from '@/utils/testCadastralFlowValidation';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

const CadastralFlowTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{
    passed: number;
    failed: number;
    warnings: number;
  } | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    const validator = new CadastralFlowValidator();
    const testResults = await validator.runAllTests();

    setResults(testResults.results);
    setSummary({
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings
    });
    setIsRunning(false);
  };

  const getIcon = (message: string) => {
    if (message.includes('✅')) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (message.includes('❌')) return <XCircle className="h-5 w-5 text-red-500" />;
    if (message.includes('ℹ️') || message.includes('⚠️')) return <Info className="h-5 w-5 text-blue-500" />;
    return <Info className="h-5 w-5 text-muted-foreground" />;
  };

  const getVariant = (message: string): "default" | "destructive" | "outline" | "secondary" => {
    if (message.includes('✅')) return 'default';
    if (message.includes('❌')) return 'destructive';
    return 'secondary';
  };

  const successRate = summary 
    ? ((summary.passed / (summary.passed + summary.failed)) * 100).toFixed(1)
    : '0';

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Test de Validation du Flux Cadastral
        </CardTitle>
        <CardDescription>
          Vérifie que le catalogue de services ne s'affiche que via le bouton "Afficher plus de données"
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bouton d'exécution */}
        <div className="flex gap-2">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="w-full sm:w-auto"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tests en cours...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Lancer les tests
              </>
            )}
          </Button>
        </div>

        {/* Résumé des résultats */}
        {summary && (
          <Alert className={summary.failed === 0 ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}>
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge variant="default" className="bg-green-500">
                    ✅ Réussis: {summary.passed}
                  </Badge>
                  <Badge variant="secondary">
                    ℹ️ Informatifs: {summary.warnings}
                  </Badge>
                  {summary.failed > 0 && (
                    <Badge variant="destructive">
                      ❌ Échecs: {summary.failed}
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-semibold">
                  🎯 Taux de réussite: {successRate}%
                </div>
                {summary.failed === 0 && (
                  <div className="text-sm text-green-700 font-medium">
                    ✨ Tous les tests sont passés ! Le système fonctionne correctement.
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Liste des résultats */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Résultats détaillés:</h3>
            {results.map((result, index) => (
              <Card key={index} className="border-l-4" style={{
                borderLeftColor: result.message.includes('✅') ? 'rgb(34, 197, 94)' :
                                 result.message.includes('❌') ? 'rgb(239, 68, 68)' :
                                 'rgb(59, 130, 246)'
              }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getIcon(result.message)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getVariant(result.message)} className="text-xs">
                          Test {index + 1}
                        </Badge>
                        <span className="text-sm font-medium">{result.message}</span>
                      </div>
                      {result.details && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Instructions manuelles */}
        {!isRunning && results.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold text-sm">📋 Tests manuels recommandés:</p>
                <ol className="text-sm space-y-1 ml-4 list-decimal">
                  <li>Rechercher une parcelle sur la page d'accueil</li>
                  <li>Vérifier que le ParcelInfoPanel s'affiche (pas le dialogue modal)</li>
                  <li>Cliquer sur "Afficher plus de données"</li>
                  <li>Vérifier la redirection vers le catalogue de services cadastraux</li>
                  <li>Vérifier que les 6 services avec prix s'affichent</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default CadastralFlowTestRunner;

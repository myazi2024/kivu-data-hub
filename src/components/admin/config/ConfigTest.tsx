import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useConfigValidation, ValidationError } from '@/hooks/useConfigValidation';

interface ConfigTestProps {
  config: any;
  configType: 'validation' | 'ccc' | 'map';
}

export const ConfigTest: React.FC<ConfigTestProps> = ({ config, configType }) => {
  const [testResults, setTestResults] = useState<ValidationError[]>([]);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const {
    validateValidationRules,
    validateCccCalculation,
    validateMapPreviewSettings
  } = useConfigValidation();

  const runTest = async () => {
    setTesting(true);
    setTested(false);

    // Simuler un délai pour l'effet visuel
    await new Promise(resolve => setTimeout(resolve, 1000));

    let results: ValidationError[] = [];

    switch (configType) {
      case 'validation':
        results = validateValidationRules(config);
        break;
      case 'ccc':
        results = validateCccCalculation(config);
        break;
      case 'map':
        results = validateMapPreviewSettings(config);
        break;
    }

    setTestResults(results);
    setTesting(false);
    setTested(true);
  };

  const hasErrors = testResults.some(r => r.severity === 'error');
  const hasWarnings = testResults.some(r => r.severity === 'warning');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Test de configuration</CardTitle>
            <CardDescription className="text-xs">
              Validez votre configuration avant de la sauvegarder
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={runTest}
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Lancer le test
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!tested && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Cliquez sur "Lancer le test" pour valider la configuration
            </AlertDescription>
          </Alert>
        )}

        {tested && testResults.length === 0 && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs text-green-600">
              ✓ La configuration est valide. Aucune erreur détectée.
            </AlertDescription>
          </Alert>
        )}

        {tested && testResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {hasErrors && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {testResults.filter(r => r.severity === 'error').length} erreur(s)
                </Badge>
              )}
              {hasWarnings && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {testResults.filter(r => r.severity === 'warning').length} avertissement(s)
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {testResults.map((result, index) => (
                <Alert
                  key={index}
                  className={result.severity === 'error' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'}
                >
                  {result.severity === 'error' ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <AlertDescription className={`text-xs ${result.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                    <span className="font-medium">{result.field}:</span> {result.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

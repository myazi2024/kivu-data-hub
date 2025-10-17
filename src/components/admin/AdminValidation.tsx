import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateCadastralSystem, ValidationResult } from '@/utils/cadastralValidation';
import { CheckCircle, XCircle, AlertTriangle, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminValidation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runValidation = async () => {
    setLoading(true);
    try {
      const validationResults = await validateCadastralSystem();
      setResults(validationResults);
      setLastRun(new Date());

      const hasErrors = validationResults.some(r => r.status === 'error');
      const hasWarnings = validationResults.some(r => r.status === 'warning');

      if (hasErrors) {
        toast.error('Validation terminée avec des erreurs');
      } else if (hasWarnings) {
        toast.warning('Validation terminée avec des avertissements');
      } else {
        toast.success('Validation réussie : tous les indicateurs sont cohérents');
      }
    } catch (error: any) {
      console.error('Erreur lors de la validation:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default">Validé</Badge>;
      case 'warning':
        return <Badge variant="secondary">Avertissement</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return null;
    }
  };

  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Validation des Indicateurs Cadastraux</CardTitle>
              <CardDescription>
                Vérification de la cohérence entre le front-end et le back-end
              </CardDescription>
            </div>
            <Button onClick={runValidation} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validation en cours...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Lancer la validation
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {lastRun && (
        <Alert>
          <AlertDescription>
            Dernière validation: {lastRun.toLocaleString('fr-FR')}
            {summary.total > 0 && (
              <span className="ml-2">
                - {summary.success}/{summary.total} validés, {summary.warnings} avertissements, {summary.errors} erreurs
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Indicateurs</p>
                    <p className="text-2xl font-bold">{summary.total}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Validés</p>
                    <p className="text-2xl font-bold">{summary.success}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avertissements</p>
                    <p className="text-2xl font-bold">{summary.warnings}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Erreurs</p>
                    <p className="text-2xl font-bold">{summary.errors}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Résultats Détaillés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <h4 className="font-semibold">{result.indicator}</h4>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                    {result.details && result.status !== 'success' && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-primary hover:underline">
                          Voir les détails
                        </summary>
                        <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminValidation;

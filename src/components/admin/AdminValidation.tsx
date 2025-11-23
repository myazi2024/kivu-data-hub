import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateCadastralSystem, ValidationResult } from '@/utils/cadastralValidation';
import { testCatalogReactivity, printCatalogTestResults, CatalogTest } from '@/utils/testCatalogReactivity';
import { validateSearchBarReactivity } from '@/utils/testSearchBarReactivity';
import { validateResultsReactivity, printResultsValidation, ResultsValidationResult } from '@/utils/testResultsReactivity';
import { testContributionReactivity, printContributionTestResults } from '@/utils/testContributionReactivity';
import { CheckCircle, XCircle, AlertTriangle, Play, Loader2, Database, Search, FileEdit } from 'lucide-react';
import { toast } from 'sonner';

const AdminValidation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [catalogTestLoading, setCatalogTestLoading] = useState(false);
  const [searchBarTestLoading, setSearchBarTestLoading] = useState(false);
  const [resultsTestLoading, setResultsTestLoading] = useState(false);
  const [contributionTestLoading, setContributionTestLoading] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [catalogTests, setCatalogTests] = useState<CatalogTest[]>([]);
  const [searchBarTests, setSearchBarTests] = useState<any[]>([]);
  const [resultsTests, setResultsTests] = useState<ResultsValidationResult[]>([]);
  const [contributionTests, setContributionTests] = useState<ValidationResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [lastCatalogTest, setLastCatalogTest] = useState<Date | null>(null);
  const [lastSearchBarTest, setLastSearchBarTest] = useState<Date | null>(null);
  const [lastResultsTest, setLastResultsTest] = useState<Date | null>(null);
  const [lastContributionTest, setLastContributionTest] = useState<Date | null>(null);

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

  const runCatalogTest = async () => {
    setCatalogTestLoading(true);
    try {
      const testResults = await testCatalogReactivity();
      setCatalogTests(testResults);
      setLastCatalogTest(new Date());
      printCatalogTestResults(testResults);

      const hasErrors = testResults.some(r => r.status === 'error');
      const hasWarnings = testResults.some(r => r.status === 'warning');

      if (hasErrors) {
        toast.error('Tests catalogue : des erreurs détectées');
      } else if (hasWarnings) {
        toast.warning('Tests catalogue : des avertissements');
      } else {
        toast.success('✅ Tests catalogue : tous les tests passés avec succès');
      }
    } catch (error: any) {
      console.error('Erreur lors des tests catalogue:', error);
      toast.error('Erreur lors des tests catalogue');
    } finally {
      setCatalogTestLoading(false);
    }
  };

  const runSearchBarTest = async () => {
    setSearchBarTestLoading(true);
    try {
      const testResults = await validateSearchBarReactivity();
      setSearchBarTests(testResults);
      setLastSearchBarTest(new Date());

      const hasErrors = testResults.some(r => r.status === 'error');
      const hasWarnings = testResults.some(r => r.status === 'warning');

      if (hasErrors) {
        toast.error('Tests barre de recherche : des erreurs détectées');
      } else if (hasWarnings) {
        toast.warning('Tests barre de recherche : des avertissements');
      } else {
        toast.success('✅ Tests barre de recherche : tous les tests passés avec succès');
      }
    } catch (error: any) {
      console.error('Erreur lors des tests barre de recherche:', error);
      toast.error('Erreur lors des tests barre de recherche');
    } finally {
      setSearchBarTestLoading(false);
    }
  };

  const runResultsTest = async () => {
    setResultsTestLoading(true);
    try {
      const testResults = await validateResultsReactivity();
      setResultsTests(testResults);
      setLastResultsTest(new Date());
      printResultsValidation(testResults);

      const hasErrors = testResults.some(r => r.status === 'error');
      const hasWarnings = testResults.some(r => r.status === 'warning');

      if (hasErrors) {
        toast.error('Tests résultats cadastraux : des erreurs détectées');
      } else if (hasWarnings) {
        toast.warning('Tests résultats cadastraux : des avertissements');
      } else {
        toast.success('✅ Tests résultats cadastraux : tous les tests passés avec succès');
      }
    } catch (error: any) {
      console.error('Erreur lors des tests résultats:', error);
      toast.error('Erreur lors des tests résultats');
    } finally {
      setResultsTestLoading(false);
    }
  };

  const runContributionTest = async () => {
    setContributionTestLoading(true);
    try {
      const testResults = await testContributionReactivity();
      setContributionTests(testResults);
      setLastContributionTest(new Date());
      printContributionTestResults(testResults);

      const hasErrors = testResults.some(r => r.status === 'error');
      const hasWarnings = testResults.some(r => r.status === 'warning');

      if (hasErrors) {
        toast.error('Tests formulaire CCC : des erreurs détectées');
      } else if (hasWarnings) {
        toast.warning('Tests formulaire CCC : des avertissements');
      } else {
        toast.success('✅ Tests formulaire CCC : tous les tests passés avec succès');
      }
    } catch (error: any) {
      console.error('Erreur lors des tests formulaire CCC:', error);
      toast.error('Erreur lors des tests formulaire CCC');
    } finally {
      setContributionTestLoading(false);
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

  const catalogSummary = {
    total: catalogTests.length,
    success: catalogTests.filter(r => r.status === 'success').length,
    warnings: catalogTests.filter(r => r.status === 'warning').length,
    errors: catalogTests.filter(r => r.status === 'error').length,
  };

  const searchBarSummary = {
    total: searchBarTests.length,
    success: searchBarTests.filter(r => r.status === 'success').length,
    warnings: searchBarTests.filter(r => r.status === 'warning').length,
    errors: searchBarTests.filter(r => r.status === 'error').length,
  };

  const resultsSummary = {
    total: resultsTests.length,
    success: resultsTests.filter(r => r.status === 'success').length,
    warnings: resultsTests.filter(r => r.status === 'warning').length,
    errors: resultsTests.filter(r => r.status === 'error').length,
  };

  const contributionSummary = {
    total: contributionTests.length,
    success: contributionTests.filter(r => r.status === 'success').length,
    warnings: contributionTests.filter(r => r.status === 'warning').length,
    errors: contributionTests.filter(r => r.status === 'error').length,
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
            <div>
              <CardTitle className="text-base sm:text-lg">Validation des Indicateurs</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Vérification de la cohérence
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <Button onClick={runValidation} disabled={loading} size="sm" className="text-xs">
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                    <span className="hidden sm:inline">Validation...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Validation</span>
                    <span className="sm:hidden">Valid.</span>
                  </>
                )}
              </Button>
              <Button 
                onClick={runCatalogTest} 
                disabled={catalogTestLoading}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {catalogTestLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                    <span className="hidden sm:inline">Test...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Catalogue</span>
                    <span className="sm:hidden">Cat.</span>
                  </>
                )}
              </Button>
              <Button 
                onClick={runSearchBarTest} 
                disabled={searchBarTestLoading}
                variant="outline"
              >
                {searchBarTestLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Test...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Test Recherche
                  </>
                )}
              </Button>
              <Button 
                onClick={runResultsTest} 
                disabled={resultsTestLoading}
                variant="outline"
              >
                {resultsTestLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Test...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Test Résultats
                  </>
                )}
              </Button>
              <Button 
                onClick={runContributionTest} 
                disabled={contributionTestLoading}
                variant="outline"
              >
                {contributionTestLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Test...
                  </>
                ) : (
                  <>
                    <FileEdit className="h-4 w-4 mr-2" />
                    Test Formulaire CCC
                  </>
                )}
              </Button>
            </div>
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

      {lastCatalogTest && (
        <Alert>
          <Database className="h-4 w-4 mr-2 inline" />
          <AlertDescription>
            Dernier test catalogue: {lastCatalogTest.toLocaleString('fr-FR')}
            {catalogSummary.total > 0 && (
              <span className="ml-2">
                - {catalogSummary.success}/{catalogSummary.total} réussis, {catalogSummary.warnings} avertissements, {catalogSummary.errors} erreurs
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {lastSearchBarTest && (
        <Alert>
          <Search className="h-4 w-4 mr-2 inline" />
          <AlertDescription>
            Dernier test barre de recherche: {lastSearchBarTest.toLocaleString('fr-FR')}
            {searchBarSummary.total > 0 && (
              <span className="ml-2">
                - {searchBarSummary.success}/{searchBarSummary.total} réussis, {searchBarSummary.warnings} avertissements, {searchBarSummary.errors} erreurs
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {lastResultsTest && (
        <Alert>
          <CheckCircle className="h-4 w-4 mr-2 inline" />
          <AlertDescription>
            Dernier test résultats: {lastResultsTest.toLocaleString('fr-FR')}
            {resultsSummary.total > 0 && (
              <span className="ml-2">
                - {resultsSummary.success}/{resultsSummary.total} réussis, {resultsSummary.warnings} avertissements, {resultsSummary.errors} erreurs
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {lastContributionTest && (
        <Alert>
          <FileEdit className="h-4 w-4 mr-2 inline" />
          <AlertDescription>
            Dernier test formulaire CCC: {lastContributionTest.toLocaleString('fr-FR')}
            {contributionSummary.total > 0 && (
              <span className="ml-2">
                - {contributionSummary.success}/{contributionSummary.total} réussis, {contributionSummary.warnings} avertissements, {contributionSummary.errors} erreurs
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {catalogTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Tests de Réactivité du Catalogue
            </CardTitle>
            <CardDescription>
              Vérification de la synchronisation Admin → Front-end
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {catalogTests.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      <h4 className="font-semibold">{test.testName}</h4>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{test.message}</p>
                  {test.details && test.status !== 'success' && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary hover:underline">
                        Voir les détails
                      </summary>
                      <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {searchBarTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Tests Barre de Recherche
            </CardTitle>
            <CardDescription>
              Vérification des configurations et de la cohérence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchBarTests.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      <Badge variant="outline">{test.category}</Badge>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{test.message}</p>
                  {test.details && test.status !== 'success' && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary hover:underline">
                        Voir les détails
                      </summary>
                      <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {resultsTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Tests Configuration Résultats Cadastraux
            </CardTitle>
            <CardDescription>
              Vérification des modules, affichage et cohérence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resultsTests.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      <h4 className="font-semibold">{test.test}</h4>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{test.message}</p>
                  {test.details && test.status !== 'success' && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary hover:underline">
                        Voir les détails
                      </summary>
                      <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {contributionTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Tests Configuration Formulaire CCC
            </CardTitle>
            <CardDescription>
              Vérification des sections, champs et réactivité du formulaire de contribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contributionTests.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      <h4 className="font-semibold">{test.indicator}</h4>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{test.message}</p>
                  {test.details && test.status !== 'success' && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary hover:underline">
                        Voir les détails
                      </summary>
                      <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-x-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

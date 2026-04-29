import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Info, Trash2, RefreshCw, RotateCcw, Play } from 'lucide-react';
import type { TestDataStats } from './types';
import TestDataExportButton from './TestDataExportButton';
import TestDryRunButton from './TestDryRunButton';
import { loadTestEntities, TEST_ENTITIES, type TestEntity } from '@/constants/testEntities';

interface TestDataStatsCardProps {
  stats: TestDataStats;
  total: number;
  cleaningUp: boolean;
  statsLoading: boolean;
  regenerating?: boolean;
  generatingData?: boolean;
  isTestModeActive?: boolean;
  onCleanup: () => void;
  onRefresh: () => void;
  onRegenerate?: () => void;
  onGenerate?: () => void;
}

/** Extra label for the 'payments' key (not in the registry — derived from invoices). */
const EXTRA_LABELS: Record<string, string> = { payments: 'Paiements' };

/** Build displayed list from the registry, ensuring `payments` (not in registry) stays visible. */
function buildStatItems(entities: TestEntity[], stats: TestDataStats): { key: keyof TestDataStats; label: string }[] {
  const items = entities.map((e) => ({ key: e.labelKey as keyof TestDataStats, label: e.label }));
  if ('payments' in stats && !entities.some((e) => e.labelKey === 'payments')) {
    const idx = items.findIndex((i) => i.key === 'invoices');
    items.splice(idx >= 0 ? idx + 1 : items.length, 0, {
      key: 'payments' as keyof TestDataStats,
      label: EXTRA_LABELS.payments,
    });
  }
  return items;
}

const TestDataStatsCard: React.FC<TestDataStatsCardProps> = ({
  stats,
  total,
  cleaningUp,
  statsLoading,
  regenerating,
  generatingData,
  isTestModeActive,
  onCleanup,
  onRefresh,
  onRegenerate,
  onGenerate,
}) => {
  const [entities, setEntities] = useState<TestEntity[]>(TEST_ENTITIES);
  useEffect(() => {
    let cancelled = false;
    loadTestEntities()
      .then((list) => { if (!cancelled) setEntities(list); })
      .catch(() => { /* keep static fallback */ });
    return () => { cancelled = true; };
  }, []);
  const statItems = buildStatItems(entities, stats);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Données de test existantes
        </CardTitle>
        <CardDescription>
          Vue d'ensemble des données de test actuellement dans le système
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {statItems.map(({ key, label }) => (
            <StatItem key={key} label={label} value={stats[key] ?? 0} loading={statsLoading} />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={statsLoading}>
            {statsLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualiser
          </Button>

          <TestDataExportButton disabled={total === 0 || cleaningUp || generatingData || regenerating} />

          <TestDryRunButton disabled={cleaningUp || generatingData || regenerating} />

          {onGenerate && isTestModeActive && total === 0 && (
            <Button
              variant="default"
              onClick={onGenerate}
              disabled={generatingData || cleaningUp}
            >
              {generatingData ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Générer les données
            </Button>
          )}

          {onRegenerate && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={regenerating || cleaningUp || total === 0}
                >
                  {regenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Régénérer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Régénérer les données de test ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action va <strong>supprimer</strong> toutes les données de test existantes
                    ({total} enregistrements) puis <strong>générer</strong> un nouveau jeu complet.
                    <br />
                    <strong>Cette action est irréversible.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onRegenerate}>
                    Régénérer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={cleaningUp || total === 0}
              >
                {cleaningUp ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Nettoyer tout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer toutes les données de test ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera <strong>{total}</strong> enregistrement(s) de test
                  répartis sur <strong>{entities.length} entités</strong> (parcelles, contributions, factures, paiements, bornages, hypothèques, autorisations, mutations, lotissements, etc.).
                  <br />
                  <strong>Cette action est irréversible.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCleanup}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer tout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

const StatItem: React.FC<{ label: string; value: number; loading?: boolean }> = ({
  label,
  value,
  loading,
}) => (
  <div className="p-3 rounded-lg border bg-card">
    <p className="text-xs text-muted-foreground">{label}</p>
    {loading ? (
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-1" />
    ) : (
      <p className="text-2xl font-bold">{value}</p>
    )}
  </div>
);

export default TestDataStatsCard;

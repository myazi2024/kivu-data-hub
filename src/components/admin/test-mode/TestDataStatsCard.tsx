import React from 'react';
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
import { Loader2, Info, Trash2, Upload, RefreshCw } from 'lucide-react';
import type { TestDataStats, GenerationStep } from './types';
import GenerationProgress from './GenerationProgress';

interface TestDataStatsCardProps {
  stats: TestDataStats;
  total: number;
  isTestModeActive: boolean;
  cleaningUp: boolean;
  generatingData: boolean;
  statsLoading: boolean;
  generationSteps: GenerationStep[];
  currentStep: number;
  onGenerate: () => void;
  onCleanup: () => void;
  onRefresh: () => void;
}

const STAT_ITEMS: { key: keyof TestDataStats; label: string }[] = [
  { key: 'parcels', label: 'Parcelles' },
  { key: 'contributions', label: 'Contributions' },
  { key: 'invoices', label: 'Factures' },
  { key: 'payments', label: 'Paiements' },
  { key: 'cccCodes', label: 'Codes CCC' },
  { key: 'serviceAccess', label: 'Accès services' },
  { key: 'titleRequests', label: 'Demandes titres' },
  { key: 'expertiseRequests', label: 'Expertises' },
  { key: 'disputes', label: 'Litiges' },
  
  { key: 'ownershipHistory', label: 'Hist. propriété' },
  { key: 'taxHistory', label: 'Hist. taxes' },
  { key: 'boundaryHistory', label: 'Hist. bornages' },
  { key: 'mortgages', label: 'Hypothèques' },
  { key: 'buildingPermits', label: 'Permis bâtir' },
  { key: 'fraudAttempts', label: 'Fraudes' },
  { key: 'certificates', label: 'Certificats' },
];

const TestDataStatsCard: React.FC<TestDataStatsCardProps> = ({
  stats,
  total,
  isTestModeActive,
  cleaningUp,
  generatingData,
  statsLoading,
  generationSteps,
  currentStep,
  onGenerate,
  onCleanup,
  onRefresh,
}) => {
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
          {STAT_ITEMS.map(({ key, label }) => (
            <StatItem key={key} label={label} value={stats[key]} loading={statsLoading} />
          ))}
        </div>

        {/* Generation progress */}
        <GenerationProgress
          steps={generationSteps}
          currentStep={currentStep}
          visible={generatingData}
        />

        <div className="flex flex-wrap gap-2">
          {/* Generate button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={generatingData || !isTestModeActive}
              >
                {generatingData ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Générer données de test
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Générer des données de test ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action créera un jeu complet de données de test incluant :
                  <br />
                  <strong>5 parcelles</strong>, <strong>5 contributions</strong>,{' '}
                  <strong>3 factures</strong>, <strong>paiements</strong>,{' '}
                  <strong>3 codes CCC</strong>, <strong>3 demandes de titres</strong>,{' '}
                  <strong>3 expertises</strong>, <strong>3 litiges</strong>,{' '}
                  <strong>2 conflits de limites</strong>, <strong>historique de propriété et taxes</strong>,{' '}
                  <strong>tentatives de fraude</strong> et <strong>certificats</strong>.
                  <br /><br />
                  Toutes les données seront préfixées <strong>TEST-</strong> et pourront être
                  nettoyées facilement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onGenerate}>
                  Générer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" onClick={onRefresh} disabled={statsLoading}>
            {statsLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualiser
          </Button>

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
                  répartis sur 17 tables (parcelles, contributions, factures, paiements, bornages, hypothèques, permis, etc.).
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

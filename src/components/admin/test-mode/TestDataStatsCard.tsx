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
import type { TestDataStats } from './types';

interface TestDataStatsCardProps {
  stats: TestDataStats;
  total: number;
  isTestModeActive: boolean;
  cleaningUp: boolean;
  generatingData: boolean;
  onGenerate: () => void;
  onCleanup: () => void;
  onRefresh: () => void;
}

const TestDataStatsCard: React.FC<TestDataStatsCardProps> = ({
  stats,
  total,
  isTestModeActive,
  cleaningUp,
  generatingData,
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatItem label="Contributions" value={stats.contributions} />
          <StatItem label="Factures" value={stats.invoices} />
          <StatItem label="Paiements" value={stats.payments} />
          <StatItem label="Codes CCC" value={stats.cccCodes} />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Fix #5: Disable generate button when test mode not saved as active on server */}
          <Button
            variant="outline"
            onClick={onGenerate}
            disabled={generatingData || !isTestModeActive}
          >
            {generatingData ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Générer données de test
          </Button>

          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>

          {/* Fix #8: Replace confirm() with AlertDialog for cleanup */}
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
                  ({stats.contributions} contributions, {stats.invoices} factures,{' '}
                  {stats.payments} paiements, {stats.cccCodes} codes CCC).
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

const StatItem: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="p-3 rounded-lg border bg-card">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

export default TestDataStatsCard;

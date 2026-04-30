import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface ExpertiseStats {
  total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  completed: number;
  rejected: number;
  overdue: number;
  unpaid: number;
}

const Tile: React.FC<{ value: number; label: string; tone?: string }> = ({ value, label, tone }) => (
  <Card>
    <CardContent className="p-3 text-center">
      <p className={`text-xl font-bold ${tone || ''}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

const ExpertiseStatsCards: React.FC<{ stats: ExpertiseStats }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
    <Tile value={stats.total} label="Total" />
    <Tile value={stats.pending} label="En attente" tone="text-amber-600" />
    <Tile value={stats.assigned} label="Assignées" tone="text-sky-600" />
    <Tile value={stats.in_progress} label="En cours" tone="text-blue-600" />
    <Tile value={stats.completed} label="Terminées" tone="text-green-600" />
    <Tile value={stats.overdue} label="En retard" tone="text-red-600" />
    <Tile value={stats.unpaid} label="Impayées" tone="text-orange-600" />
  </div>
);

export default ExpertiseStatsCards;

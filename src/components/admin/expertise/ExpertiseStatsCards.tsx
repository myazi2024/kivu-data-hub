import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface ExpertiseStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

const ExpertiseStatsCards: React.FC<{ stats: ExpertiseStats }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-bold">{stats.total}</p>
        <p className="text-xs text-muted-foreground">Total</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        <p className="text-xs text-muted-foreground">En attente</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        <p className="text-xs text-muted-foreground">En cours</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        <p className="text-xs text-muted-foreground">Terminées</p>
      </CardContent>
    </Card>
  </div>
);

export default ExpertiseStatsCards;

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface MutationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  onHold: number;
  revenue: number;
}

interface Props {
  stats: MutationStats;
}

const MutationStatsCards: React.FC<Props> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">Total</div>
        <div className="text-xl font-bold">{stats.total}</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">En attente</div>
        <div className="text-xl font-bold text-orange-600">{stats.pending}</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">Approuvées</div>
        <div className="text-xl font-bold text-green-600">{stats.approved}</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">Rejetées</div>
        <div className="text-xl font-bold text-destructive">{stats.rejected}</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">Annulées</div>
        <div className="text-xl font-bold text-muted-foreground">{stats.cancelled}</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">Suspendues</div>
        <div className="text-xl font-bold text-amber-600">{stats.onHold}</div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">Revenus</div>
        <div className="text-xl font-bold text-primary">${stats.revenue.toFixed(2)}</div>
      </CardContent>
    </Card>
  </div>
);

export default MutationStatsCards;

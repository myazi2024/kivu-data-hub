import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, Users, Ban } from 'lucide-react';

export interface FraudStatsData {
  totalAttempts: number;
  highSeverity: number;
  blockedUsers: number;
  usersWithStrikes: number;
}

interface Props {
  stats: FraudStatsData;
}

const FraudStats: React.FC<Props> = ({ stats }) => {
  // Detection rate = part des utilisateurs avec strikes qui ont été bloqués
  const detectionRate =
    stats.usersWithStrikes > 0
      ? ((stats.blockedUsers / stats.usersWithStrikes) * 100).toFixed(0)
      : '0';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <Card>
        <CardHeader className="pb-1 p-2">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Tentatives totales
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <div className="text-lg md:text-xl font-bold">{stats.totalAttempts}</div>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">
            {stats.highSeverity} haute gravité
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 p-2">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            Utilisateurs suspects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <div className="text-lg md:text-xl font-bold">{stats.usersWithStrikes}</div>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Avec avertissements</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 p-2">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Ban className="h-3 w-3" />
            Utilisateurs bloqués
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <div className="text-lg md:text-xl font-bold text-destructive">{stats.blockedUsers}</div>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Actuellement</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 p-2">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Taux de blocage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <div className="text-lg md:text-xl font-bold text-success">{detectionRate}%</div>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">
            Bloqués / signalés
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FraudStats;

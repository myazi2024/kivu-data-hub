import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export interface CCCStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspicious: number;
}

const CCCStatsCards: React.FC<{ stats: CCCStats }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{stats.total}</p>
          </div>
          <Users className="h-5 w-5 text-blue-500" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Attente</p>
            <p className="text-lg font-bold">{stats.pending}</p>
          </div>
          <Badge variant="secondary" className="text-xs">{stats.pending}</Badge>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Approuvés</p>
            <p className="text-lg font-bold">{stats.approved}</p>
          </div>
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Rejetés</p>
            <p className="text-lg font-bold">{stats.rejected}</p>
          </div>
          <XCircle className="h-5 w-5 text-red-500" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Suspects</p>
            <p className="text-lg font-bold">{stats.suspicious}</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-orange-500" />
        </div>
      </CardContent>
    </Card>
  </div>
);

export default CCCStatsCards;

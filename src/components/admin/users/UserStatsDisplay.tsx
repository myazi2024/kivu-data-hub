import React from 'react';
import { UserStatistics } from '@/hooks/useUserStatistics';

interface UserStatsDisplayProps {
  stats: UserStatistics | null;
  loading?: boolean;
}

export const UserStatsDisplay: React.FC<UserStatsDisplayProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3 text-sm md:text-base">Statistiques</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-3 bg-muted rounded animate-pulse">
              <div className="h-3 bg-muted-foreground/20 rounded w-20 mb-2" />
              <div className="h-6 bg-muted-foreground/20 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="border-t pt-4">
      <h4 className="font-semibold mb-3 text-sm md:text-base">Statistiques</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
        <div className="p-3 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Factures</p>
          <p className="text-lg md:text-xl font-bold">{stats.total_invoices || 0}</p>
        </div>
        <div className="p-3 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Codes CCC</p>
          <p className="text-lg md:text-xl font-bold">{stats.ccc_codes_earned || 0}</p>
        </div>
        <div className="p-3 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Dépenses</p>
          <p className="text-lg md:text-xl font-bold">{stats.total_spent || 0}$</p>
        </div>
        <div className="p-3 bg-success/10 rounded">
          <p className="text-xs text-muted-foreground">Contributions</p>
          <p className="text-lg md:text-xl font-bold text-success">{stats.contributions_count || 0}</p>
        </div>
        <div className="p-3 bg-warning/10 rounded">
          <p className="text-xs text-muted-foreground">Approuvées</p>
          <p className="text-lg md:text-xl font-bold text-warning">{stats.approved_contributions || 0}</p>
        </div>
        <div className="p-3 bg-muted rounded">
          <p className="text-xs text-muted-foreground">Services</p>
          <p className="text-lg md:text-xl font-bold">{stats.services_accessed || 0}</p>
        </div>
      </div>
    </div>
  );
};

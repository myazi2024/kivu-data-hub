import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserActivity } from '@/hooks/useUserActivity';
import { Activity, LogIn, Search, FileText, CreditCard, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveTable, ResponsiveTableBody, ResponsiveTableCell, ResponsiveTableHead, ResponsiveTableHeader, ResponsiveTableRow } from '@/components/ui/responsive-table';

interface AdminUserActivityProps {
  userId: string;
}

const activityIcons: Record<string, any> = {
  login: LogIn,
  search: Search,
  contribution: FileText,
  payment: CreditCard,
};

const activityColors: Record<string, string> = {
  login: 'text-blue-500',
  search: 'text-purple-500',
  contribution: 'text-green-500',
  payment: 'text-orange-500',
};

export const AdminUserActivity: React.FC<AdminUserActivityProps> = ({ userId }) => {
  const { activities, stats, loading, fetchActivities, fetchStats } = useUserActivity(userId);

  useEffect(() => {
    if (userId) {
      fetchActivities(100);
      fetchStats();
    }
  }, [userId, fetchActivities, fetchStats]);

  const getActivityIcon = (type: string) => {
    const Icon = activityIcons[type] || Activity;
    const color = activityColors[type] || 'text-gray-500';
    return <Icon className={`w-4 h-4 ${color}`} />;
  };

  return (
    <div className="space-y-3">
      {/* Stats Overview */}
      {stats && (
        <Card>
          <CardHeader className="p-2 md:p-3">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Statistiques d'Activité
            </CardTitle>
          </CardHeader>
          <CardContent className="p-1.5 md:p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
              <div className="p-1.5 bg-muted rounded">
                <p className="text-[9px] text-muted-foreground">Total</p>
                <p className="text-base font-bold">{stats.total_activities}</p>
              </div>
              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/20 rounded">
                <p className="text-[9px] text-muted-foreground">Connexions</p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {stats.login_count}
                </p>
              </div>
              <div className="p-1.5 bg-purple-50 dark:bg-purple-950/20 rounded">
                <p className="text-[9px] text-muted-foreground">Recherches</p>
                <p className="text-base font-bold text-purple-600 dark:text-purple-400">
                  {stats.search_count}
                </p>
              </div>
              <div className="p-1.5 bg-green-50 dark:bg-green-950/20 rounded">
                <p className="text-[9px] text-muted-foreground">Contributions</p>
                <p className="text-base font-bold text-green-600 dark:text-green-400">
                  {stats.contribution_count}
                </p>
              </div>
              <div className="p-1.5 bg-orange-50 dark:bg-orange-950/20 rounded">
                <p className="text-[9px] text-muted-foreground">Paiements</p>
                <p className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {stats.payment_count}
                </p>
              </div>
            </div>
            {stats.last_activity && (
              <div className="mt-1.5 flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                Dernière activité:{' '}
                {format(new Date(stats.last_activity), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader className="p-2 md:p-3">
          <CardTitle className="text-sm md:text-base">Historique d'Activité</CardTitle>
          <CardDescription className="text-[10px] md:text-xs">
            Les 100 dernières activités de l'utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-3">
          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-4">Chargement...</div>
          ) : activities.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">
              Aucune activité enregistrée
            </div>
          ) : (
            <ResponsiveTable>
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead priority="high">Type</ResponsiveTableHead>
                  <ResponsiveTableHead priority="medium">Détails</ResponsiveTableHead>
                  <ResponsiveTableHead priority="high">Date</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {activities.map((activity) => (
                  <ResponsiveTableRow key={activity.id}>
                    <ResponsiveTableCell priority="high" label="Type">
                      <div className="flex items-center gap-1.5">
                        {getActivityIcon(activity.activity_type)}
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">
                          {activity.activity_type}
                        </Badge>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="medium" label="Détails">
                      <span className="text-xs line-clamp-1">
                        {activity.activity_details
                          ? JSON.stringify(activity.activity_details)
                          : '-'}
                      </span>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell priority="high" label="Date">
                      <span className="text-xs">
                        {format(new Date(activity.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                      </span>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

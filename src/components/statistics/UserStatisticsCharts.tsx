import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, FileText, CheckCircle, Tag } from 'lucide-react';
import { useUserStatistics } from '@/hooks/useUserStatistics';
import { subDays } from 'date-fns';

const UserStatisticsCharts: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('30');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const { statistics, loading } = useUserStatistics(startDate, endDate);

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    const days = parseInt(value);
    setStartDate(subDays(new Date(), days));
    setEndDate(new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mes statistiques</CardTitle>
              <CardDescription>Vue d'ensemble de votre activité</CardDescription>
            </div>
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
                <SelectItem value="365">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiques de facturation */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Facturation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total dépensé</p>
                  <p className="text-2xl font-bold">${statistics?.total_spent?.toFixed(2) || '0.00'}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {statistics?.total_invoices || 0} factures
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Factures en attente</p>
                  <p className="text-2xl font-bold">{statistics?.pending_invoices || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Services utilisés</p>
                  <p className="text-2xl font-bold">{statistics?.services_accessed || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistiques de contributions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Contributions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contributions soumises</p>
                  <p className="text-2xl font-bold">{statistics?.contributions_count || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {statistics?.approved_contributions || 0} approuvées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taux d'approbation</p>
                  <p className="text-2xl font-bold">
                    {statistics?.contributions_count && statistics.contributions_count > 0
                      ? `${((statistics.approved_contributions / statistics.contributions_count) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Codes CCC */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Codes Contributeur (CCC)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Codes gagnés</p>
                  <p className="text-2xl font-bold">{statistics?.ccc_codes_earned || 0}</p>
                </div>
                <Tag className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valeur gagnée</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${statistics?.ccc_value_earned?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Codes utilisés</p>
                  <p className="text-2xl font-bold">{statistics?.ccc_codes_used || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {statistics?.ccc_codes_earned && statistics.ccc_codes_earned > 0
                  ? `${((statistics.ccc_codes_used / statistics.ccc_codes_earned) * 100).toFixed(0)}% utilisés`
                  : 'Aucun code'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserStatisticsCharts;

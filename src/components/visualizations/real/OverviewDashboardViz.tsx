import React from 'react';
import { Card } from '@/components/ui/card';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Map, Users, FileText, DollarSign, AlertTriangle, Landmark, Shield, ScrollText } from 'lucide-react';

const KPI = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) => (
  <Card className="p-3 sm:p-4 flex flex-col items-center text-center gap-1 border-border/40">
    <Icon className={`h-5 w-5 ${color || 'text-primary'}`} />
    <div className="text-xl sm:text-2xl font-bold text-foreground">{value}</div>
    <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{label}</div>
    {sub && <div className="text-[9px] text-muted-foreground/70">{sub}</div>}
  </Card>
);

export const OverviewDashboardViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const t = data.totals;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
      <KPI icon={Map} label="Parcelles enregistrées" value={t.totalParcels.toLocaleString()} sub={`${t.totalProvinces} provinces • ${t.withGps} GPS`} />
      <KPI icon={Users} label="Contributions CCC" value={t.totalContributions.toLocaleString()} color="text-accent-foreground" />
      <KPI icon={FileText} label="Factures émises" value={t.totalInvoices.toLocaleString()} />
      <KPI icon={DollarSign} label="Revenus totaux" value={`$${t.totalRevenue.toFixed(0)}`} color="text-emerald-500" />
      <KPI icon={DollarSign} label="Taxes collectées" value={`$${t.totalTaxCollected.toFixed(0)}`} color="text-emerald-500" />
      <KPI icon={AlertTriangle} label="Litiges fonciers" value={t.totalDisputes.toLocaleString()} color="text-destructive" />
      <KPI icon={Landmark} label="Hypothèques" value={t.totalMortgages.toLocaleString()} sub={`$${data.mortgageStats.totalAmount.toFixed(0)}`} />
      <KPI icon={ScrollText} label="Demandes de titres" value={t.totalTitleRequests.toLocaleString()} sub={`$${data.titleRequestStats.totalAmount.toFixed(0)}`} />
      <KPI icon={Shield} label="Permis de construire" value={t.totalPermits.toLocaleString()} />
      <KPI icon={Users} label="Codes CCC" value={data.cccCodeStats.total.toLocaleString()} sub={`${data.cccCodeStats.used} utilisés • $${data.cccCodeStats.totalValue.toFixed(0)}`} />
      <KPI icon={Map} label="Sup. moyenne" value={`${(t.avgArea / 10000).toFixed(2)} ha`} sub={`${t.avgArea.toLocaleString()} m²`} />
      <KPI icon={Map} label="Couverture GPS" value={t.totalParcels > 0 ? `${((t.withGps / t.totalParcels) * 100).toFixed(0)}%` : '0%'} sub={`${t.withGps}/${t.totalParcels}`} />
    </div>
  );
};

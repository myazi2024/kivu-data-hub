import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Users, Home, Calendar } from 'lucide-react';

export interface TenantEntry {
  id: string;
  unitName: string;
  tenantName: string;
  monthlyRentUsd: number;
  arrivalDate: string;
  departureDate: string;
  hasDepartureDate: boolean;
}

interface IRLTenantsListProps {
  tenants: TenantEntry[];
  setTenants: React.Dispatch<React.SetStateAction<TenantEntry[]>>;
  fiscalYear: number;
}

const createEmptyTenant = (): TenantEntry => ({
  id: crypto.randomUUID(),
  unitName: '',
  tenantName: '',
  monthlyRentUsd: 0,
  arrivalDate: '',
  departureDate: '',
  hasDepartureDate: false,
});

/** Calculate occupied months within the fiscal year for a tenant */
export const calculateOccupiedMonths = (
  arrivalDate: string,
  departureDate: string,
  fiscalYear: number
): number => {
  const yearStart = new Date(fiscalYear, 0, 1);
  const yearEnd = new Date(fiscalYear, 11, 31);

  const arrival = arrivalDate ? new Date(arrivalDate) : yearStart;
  const departure = departureDate ? new Date(departureDate) : yearEnd;

  const effectiveStart = arrival < yearStart ? yearStart : arrival;
  const effectiveEnd = departure > yearEnd ? yearEnd : departure;

  if (effectiveStart > effectiveEnd) return 0;

  const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.44);
  return Math.max(0, Math.min(12, Math.round(months * 10) / 10));
};

/** Total annual rental income from all tenants for a given fiscal year */
export const calculateTotalRentalIncome = (
  tenants: TenantEntry[],
  fiscalYear: number
): { totalIncome: number; details: { tenant: TenantEntry; months: number; income: number }[] } => {
  const details = tenants.map(t => {
    const months = calculateOccupiedMonths(t.arrivalDate, t.departureDate, fiscalYear);
    return { tenant: t, months, income: Math.round(t.monthlyRentUsd * months * 100) / 100 };
  });
  const totalIncome = details.reduce((sum, d) => sum + d.income, 0);
  return { totalIncome, details };
};

const IRLTenantsList: React.FC<IRLTenantsListProps> = ({ tenants, setTenants, fiscalYear }) => {
  const addTenant = () => setTenants(prev => [...prev, createEmptyTenant()]);

  const removeTenant = (id: string) => {
    setTenants(prev => prev.length <= 1 ? prev : prev.filter(t => t.id !== id));
  };

  const updateTenant = (id: string, field: keyof TenantEntry, value: string | number | boolean) => {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const { totalIncome, details } = calculateTotalRentalIncome(tenants, fiscalYear);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <Label className="text-sm font-semibold">Locataires & unités louées</Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTenant}
          className="h-8 text-xs rounded-xl gap-1"
        >
          <Plus className="h-3 w-3" />
          Ajouter
        </Button>
      </div>

      {tenants.map((tenant, idx) => {
        const detail = details.find(d => d.tenant.id === tenant.id);
        const months = detail?.months ?? 0;
        const income = detail?.income ?? 0;

        return (
          <Card key={tenant.id} className="rounded-xl border-border/50 overflow-hidden">
            <CardContent className="p-3 space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  Unité {idx + 1}
                </span>
                {tenants.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTenant(tenant.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Unit name + Tenant name */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Unité</Label>
                  <Input
                    value={tenant.unitName}
                    onChange={(e) => updateTenant(tenant.id, 'unitName', e.target.value)}
                    placeholder="App. A, Studio 2…"
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Locataire</Label>
                  <Input
                    value={tenant.tenantName}
                    onChange={(e) => updateTenant(tenant.id, 'tenantName', e.target.value)}
                    placeholder="Nom du locataire"
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>

              {/* Rent */}
              <div className="space-y-1">
                <Label className="text-xs">Loyer mensuel (USD)</Label>
                <Input
                  type="number"
                  value={tenant.monthlyRentUsd || ''}
                  onChange={(e) => updateTenant(tenant.id, 'monthlyRentUsd', parseFloat(e.target.value) || 0)}
                  placeholder="500"
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" /> Arrivée
                  </Label>
                  <Input
                    type="date"
                    value={tenant.arrivalDate}
                    onChange={(e) => updateTenant(tenant.id, 'arrivalDate', e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" /> Date de départ connue ?
                    </Label>
                    <Switch
                      checked={tenant.hasDepartureDate}
                      onCheckedChange={(v) => {
                        updateTenant(tenant.id, 'hasDepartureDate', v);
                        if (!v) updateTenant(tenant.id, 'departureDate', '');
                      }}
                      className="scale-75"
                    />
                  </div>
                  {tenant.hasDepartureDate && (
                    <Input
                      type="date"
                      value={tenant.departureDate}
                      onChange={(e) => updateTenant(tenant.id, 'departureDate', e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* Auto-calculated summary */}
              {tenant.monthlyRentUsd > 0 && (
                <div className="text-xs bg-muted/50 rounded-lg px-2 py-1.5 flex justify-between">
                  <span className="text-muted-foreground">
                    {months.toFixed(1)} mois occupés en {fiscalYear}
                  </span>
                  <span className="font-semibold">{income.toLocaleString()} USD</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Total */}
      {tenants.some(t => t.monthlyRentUsd > 0) && (
        <div className="flex justify-between items-center px-2 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Revenu locatif brut total ({fiscalYear})
          </span>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
            {totalIncome.toLocaleString()} USD
          </span>
        </div>
      )}
    </div>
  );
};

export { createEmptyTenant };
export default IRLTenantsList;

import React from 'react';
import { ProvinceData } from '@/types/province';

interface TooltipLineConfig {
  key: string;
  visible: boolean;
  title: string;
}

interface ProvinceTooltipProps {
  province: ProvinceData;
  /** Config-driven visibility & titles for each tooltip line */
  lineConfigs?: TooltipLineConfig[];
}

const formatNumber = (num: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);

const formatCurrency = (num: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);

/** Default tooltip lines mapping ProvinceData fields to real cadastral labels */
const DEFAULT_LINES: { key: string; field: keyof ProvinceData; label: string; format: 'number' | 'currency' | 'badge'; color: string }[] = [
  { key: 'tooltip-parcels', field: 'parcelsCount', label: 'Parcelles', format: 'number', color: 'text-primary' },
  { key: 'tooltip-titles', field: 'titleRequestsCount', label: 'Titres dem.', format: 'number', color: 'text-blue-600' },
  { key: 'tooltip-contributions', field: 'contributionsCount', label: 'Contributions', format: 'number', color: 'text-emerald-600' },
  { key: 'tooltip-mutations', field: 'mutationsCount', label: 'Mutations', format: 'number', color: 'text-violet-600' },
  { key: 'tooltip-disputes', field: 'disputesCount', label: 'Litiges', format: 'number', color: 'text-orange-500' },
  { key: 'tooltip-expertises', field: 'expertisesCount', label: 'Expertises', format: 'number', color: 'text-blue-600' },
  { key: 'tooltip-certificates', field: 'certificatesCount', label: 'Certificats', format: 'number', color: 'text-emerald-600' },
  { key: 'tooltip-invoices', field: 'invoicesCount', label: 'Factures', format: 'number', color: 'text-blue-600' },
  { key: 'tooltip-revenue', field: 'revenueUsd', label: 'Revenus', format: 'currency', color: 'text-primary' },
  { key: 'tooltip-fiscal', field: 'fiscalRevenueUsd', label: 'Rec. fiscales', format: 'currency', color: 'text-emerald-700' },
];

const ProvinceTooltip: React.FC<ProvinceTooltipProps> = ({ province, lineConfigs }) => {
  // Build a lookup from lineConfigs
  const configMap = new Map<string, TooltipLineConfig>();
  lineConfigs?.forEach(c => configMap.set(c.key, c));

  const isVisible = (key: string) => configMap.get(key)?.visible ?? true;
  const getTitle = (key: string, fallback: string) => configMap.get(key)?.title || fallback;

  return (
    <div className="w-32 sm:w-36 md:w-40 p-2 bg-background/90 backdrop-blur-md border border-border/60 shadow-lg rounded-md">
      <div className="space-y-1">
        <h3 className="font-semibold text-xs text-foreground border-b border-border/50 pb-0.5 mb-1">
          {province.name}
        </h3>
        
        <div className="grid grid-cols-1 gap-0.5 text-[10px] leading-tight">
          {DEFAULT_LINES.map(line => {
            if (!isVisible(line.key)) return null;
            const value = province[line.field] as number;
            const formatted = line.format === 'currency' ? formatCurrency(value) : formatNumber(value);
            return (
              <div key={line.key} className="flex justify-between items-center">
                <span className="text-muted-foreground text-[9px]">{getTitle(line.key, line.label)} :</span>
                <span className={`font-medium ${line.color} text-right text-[9px]`}>{formatted}</span>
              </div>
            );
          })}
          
          {/* Density badge */}
          {isVisible('tooltip-density') && (
            <div className="flex justify-between items-center pt-0.5 border-t border-border/30">
              <span className="text-muted-foreground truncate">{getTitle('tooltip-density', 'Densité')} :</span>
              <span className={`font-semibold px-1 py-0.5 rounded text-[9px] ${
                province.densityLevel === 'Très élevé' ? 'bg-red-100/80 text-red-700 dark:bg-red-900/60 dark:text-red-300' :
                province.densityLevel === 'Élevé' ? 'bg-orange-100/80 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300' :
                province.densityLevel === 'Modéré' ? 'bg-yellow-100/80 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-300' :
                'bg-green-100/80 text-green-700 dark:bg-green-900/60 dark:text-green-300'
              }`}>
                {province.densityLevel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProvinceTooltip;

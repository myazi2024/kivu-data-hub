import React from 'react';
import { ProvinceData } from '@/types/province';

interface TooltipLineConfig {
  key: string;
  visible: boolean;
  title: string;
}

interface ProvinceTooltipProps {
  province: ProvinceData;
  lineConfigs?: TooltipLineConfig[];
}

const fmtN = (num: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);

const fmtAvg = (num: number, unit: string) =>
  num > 0 ? `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num)} ${unit}` : '—';

const DEFAULT_LINES: { key: string; field: keyof ProvinceData; label: string; format: 'number' | 'avg-sqm' | 'avg-m'; color: string }[] = [
  { key: 'tooltip-cert-enreg', field: 'certEnregCount', label: 'Certif. enregistrement', format: 'number', color: 'text-primary' },
  { key: 'tooltip-contrat-loc', field: 'contratLocCount', label: 'Contrat location', format: 'number', color: 'text-blue-600' },
  { key: 'tooltip-fiche-parc', field: 'ficheParcCount', label: 'Fiche parcellaire', format: 'number', color: 'text-emerald-600' },
  { key: 'tooltip-title-req', field: 'titleRequestsCount', label: 'Titres demandés', format: 'number', color: 'text-violet-600' },
  { key: 'tooltip-disputes', field: 'disputesCount', label: 'Litiges fonciers', format: 'number', color: 'text-orange-500' },
  { key: 'tooltip-mortgages', field: 'activeMortgagesCount', label: 'Hypothèques actives', format: 'number', color: 'text-red-600' },
  { key: 'tooltip-mutations', field: 'pendingMutationsCount', label: 'Mutations en cours', format: 'number', color: 'text-violet-600' },
  { key: 'tooltip-expertises', field: 'pendingExpertisesCount', label: 'Expertises en cours', format: 'number', color: 'text-blue-600' },
  { key: 'tooltip-avg-surface', field: 'avgParcelSurfaceSqm', label: 'Sup. moy. parcelle', format: 'avg-sqm', color: 'text-emerald-700' },
  { key: 'tooltip-avg-building', field: 'avgBuildingSurfaceSqm', label: 'Sup. moy. construction', format: 'avg-sqm', color: 'text-emerald-600' },
  { key: 'tooltip-avg-height', field: 'avgBuildingHeightM', label: 'Haut. moy. construction', format: 'avg-m', color: 'text-blue-600' },
];

const ProvinceTooltip: React.FC<ProvinceTooltipProps> = ({ province, lineConfigs }) => {
  const configMap = new Map<string, TooltipLineConfig>();
  lineConfigs?.forEach(c => configMap.set(c.key, c));

  const isVisible = (key: string) => configMap.get(key)?.visible ?? true;
  const getTitle = (key: string, fallback: string) => configMap.get(key)?.title || fallback;

  // Profile mode: when extraTooltipLines is provided by the active Analytics tab profile,
  // render those instead of the default lines.
  const useProfile = Array.isArray(province.extraTooltipLines) && province.extraTooltipLines.length > 0;

  return (
    <div className="w-36 sm:w-40 md:w-44 p-2 bg-background/90 backdrop-blur-md border border-border/60 shadow-lg rounded-md">
      <div className="space-y-1">
        <h3 className="font-semibold text-xs text-foreground border-b border-border/50 pb-0.5 mb-1">
          {province.name}
        </h3>
        <div className="grid grid-cols-1 gap-0.5 text-[10px] leading-tight">
          {useProfile
            ? province.extraTooltipLines!.map((line, idx) => (
                <div key={`profile-${idx}`} className="flex justify-between items-center gap-1">
                  <span className="text-muted-foreground text-[9px] truncate">{line.label} :</span>
                  <span className={`font-medium ${line.color || 'text-foreground'} text-right text-[9px] truncate`}>{line.value}</span>
                </div>
              ))
            : DEFAULT_LINES.map(line => {
                if (!isVisible(line.key)) return null;
                const value = province[line.field] as number;
                const formatted = line.format === 'avg-sqm' ? fmtAvg(value, 'm²')
                  : line.format === 'avg-m' ? fmtAvg(value, 'm')
                  : fmtN(value);
                return (
                  <div key={line.key} className="flex justify-between items-center">
                    <span className="text-muted-foreground text-[9px]">{getTitle(line.key, line.label)} :</span>
                    <span className={`font-medium ${line.color} text-right text-[9px]`}>{formatted}</span>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
};

export default ProvinceTooltip;

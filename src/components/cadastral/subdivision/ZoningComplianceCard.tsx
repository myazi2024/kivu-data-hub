import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, Info } from 'lucide-react';
import type { ZoningComplianceResult } from './hooks/useZoningCompliance';

interface Props {
  compliance: ZoningComplianceResult;
}

export const ZoningComplianceCard: React.FC<Props> = ({ compliance }) => {
  const { loading, rule, sectionType, matchedLocation, violations, hasErrors, hasWarnings, metrics } = compliance;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Vérification de la conformité au zonage…
        </CardContent>
      </Card>
    );
  }

  if (!rule) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Info className="h-3 w-3" /> Conformité zonage
          </div>
          <p className="text-xs text-muted-foreground">
            Aucune règle de zonage active n'a été trouvée pour cette localisation
            ({sectionType === 'urban' ? 'urbain' : 'rural'}). Le plan sera évalué
            par l'administration lors de l'examen.
          </p>
        </CardContent>
      </Card>
    );
  }

  const headerColor = hasErrors
    ? 'text-destructive'
    : hasWarnings
      ? 'text-amber-600'
      : 'text-emerald-600';
  const HeaderIcon = hasErrors ? ShieldX : hasWarnings ? ShieldAlert : ShieldCheck;
  const headerLabel = hasErrors
    ? 'Non conforme'
    : hasWarnings
      ? 'Conforme avec avertissements'
      : 'Conforme aux règles de zonage';

  return (
    <Card className={hasErrors ? 'border-destructive/40' : hasWarnings ? 'border-amber-500/40' : 'border-emerald-500/40'}>
      <CardContent className="pt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${headerColor}`}>
            <HeaderIcon className="h-3.5 w-3.5" />
            {headerLabel}
          </div>
          <Badge variant="outline" className="text-[10px]">
            {sectionType === 'urban' ? 'Urbain' : 'Rural'} · {matchedLocation === '*' ? 'Règle par défaut RDC' : matchedLocation}
          </Badge>
        </div>

        {/* Critères de la règle vs plan */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <CriterionRow
            label="Surface min/lot"
            ruleText={`≥ ${rule.min_lot_area_sqm} m²`}
            planText={`min ${Math.round(metrics.minLotSqm)} m²`}
            ok={metrics.minLotSqm >= rule.min_lot_area_sqm || metrics.lotCount === 0}
          />
          {rule.max_lot_area_sqm && (
            <CriterionRow
              label="Surface max/lot"
              ruleText={`≤ ${rule.max_lot_area_sqm} m²`}
              planText={`max ${Math.round(metrics.maxLotSqm)} m²`}
              ok={metrics.maxLotSqm <= rule.max_lot_area_sqm || metrics.lotCount === 0}
            />
          )}
          {rule.min_road_width_m > 0 && (
            <CriterionRow
              label="Largeur voirie"
              ruleText={`≥ ${rule.min_road_width_m} m`}
              planText={metrics.minRoadWidthM === Infinity ? 'aucune voie' : `min ${metrics.minRoadWidthM} m`}
              ok={metrics.minRoadWidthM === Infinity ? true : metrics.minRoadWidthM >= rule.min_road_width_m}
            />
          )}
          {rule.min_common_space_pct > 0 && (
            <CriterionRow
              label="Espaces communs"
              ruleText={`≥ ${rule.min_common_space_pct}%`}
              planText={`${metrics.commonSpacePct.toFixed(1)}%`}
              ok={metrics.commonSpacePct >= rule.min_common_space_pct}
            />
          )}
          {rule.max_lots_per_request && (
            <CriterionRow
              label="Nombre de lots"
              ruleText={`≤ ${rule.max_lots_per_request}`}
              planText={`${metrics.lotCount}`}
              ok={metrics.lotCount <= rule.max_lots_per_request}
            />
          )}
        </div>

        {/* Violations détaillées */}
        {violations.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t">
            {violations.map((v, i) => (
              <Alert
                key={i}
                variant={v.severity === 'error' ? 'destructive' : 'default'}
                className={`py-1.5 ${v.severity === 'warning' ? 'border-amber-500/40 bg-amber-50/50' : ''}`}
              >
                <AlertDescription className="text-[11px]">
                  <span className="font-semibold">{v.target} :</span> {v.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {rule.notes && (
          <p className="text-[10px] text-muted-foreground italic border-t pt-1.5">
            {rule.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const CriterionRow: React.FC<{ label: string; ruleText: string; planText: string; ok: boolean }> = ({
  label, ruleText, planText, ok,
}) => (
  <>
    <div className="text-muted-foreground">{label}</div>
    <div className={`text-right font-mono ${ok ? 'text-foreground' : 'text-destructive font-semibold'}`}>
      {planText} <span className="text-muted-foreground">/ {ruleText}</span>
    </div>
  </>
);

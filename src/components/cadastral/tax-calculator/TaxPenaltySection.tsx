import React from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { getLatePenaltyInfo } from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';

interface TaxPenaltySectionProps {
  fiscalYear: number;
  /** #24 fix: Now supports 'building' tax type with June 30 deadline */
  taxType: 'property' | 'irl' | 'building';
}

const TAX_TYPE_LABELS: Record<string, string> = {
  property: 'impôt foncier',
  irl: 'IRL',
  building: 'taxe de bâtisse',
};

const TAX_TYPE_HELP: Record<string, string> = {
  property: "Janvier : constat. Avant le 1er février : dépôt de la déclaration. Janvier–mars : paiement. Au-delà du 31 mars : pénalités de retard (2% par mois, plafonnées à 24%). Majoration de 25% au-delà de 3 mois.",
  irl: "L'IRL est exigible au 1er trimestre. À Kinshasa, l'échéance est fixée au 28 février. Après cette date : intérêts de 2%/mois (max 24%) et majoration de 25% au-delà de 3 mois.",
  building: "La taxe de bâtisse est un impôt provincial annuel. L'échéance de paiement est fixée au 30 juin. Après cette date : intérêts de 2%/mois (max 24%) et majoration de 25% au-delà de 3 mois.",
};

const TAX_TYPE_TITLE: Record<string, string> = {
  property: 'Calendrier fiscal — RDC',
  irl: 'Calendrier IRL — DGRK',
  building: 'Calendrier taxe de bâtisse — Province',
};

const TaxPenaltySection: React.FC<TaxPenaltySectionProps> = ({ fiscalYear, taxType }) => {
  const info = getLatePenaltyInfo(fiscalYear, taxType);
  const typeLabel = TAX_TYPE_LABELS[taxType] || taxType;

  return (
    <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Retard de paiement
          <SectionHelpPopover
            title={TAX_TYPE_TITLE[taxType] || 'Calendrier fiscal'}
            description={TAX_TYPE_HELP[taxType] || TAX_TYPE_HELP.property}
          />
        </Label>

        {!info.isLate ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Pas de retard</p>
              <p className="text-xs text-muted-foreground">
                Échéance {typeLabel} : {info.deadlineStr}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/30 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm font-semibold text-destructive">
                Retard de {info.monthsLate} mois
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Échéance dépassée : {info.deadlineStr}
            </p>
            <div className="text-xs space-y-1 pl-6">
              <p>• Intérêts moratoires : <span className="font-semibold">{info.penaltyRate}%</span> ({info.monthsLate} × 2%)</p>
              {info.hasSurcharge && (
                <p>• Majoration supplémentaire : <span className="font-semibold">25%</span> (retard &gt; 3 mois)</p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Exercice fiscal {fiscalYear} — Échéance légale : {info.deadlineStr}
        </p>
      </CardContent>
    </Card>
  );
};

export default TaxPenaltySection;

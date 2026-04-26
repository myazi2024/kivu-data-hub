import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import type { ValidationResult } from '../../utils/geometry';

interface Props {
  validation: ValidationResult;
  /** Show a positive "Plan conforme" badge when there are no errors/warnings. */
  showSuccessBadge?: boolean;
}

/**
 * Presentational validation summary panel.
 * Extracted from StepLotDesigner to reduce monolith size.
 */
const ValidationPanel: React.FC<Props> = ({ validation, showSuccessBadge = true }) => {
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const isClean = !hasErrors && !hasWarnings;

  if (isClean && !showSuccessBadge) return null;

  return (
    <Card className={hasErrors ? 'border-destructive/30' : hasWarnings ? 'border-amber-500/30' : 'border-emerald-500/30'}>
      <CardContent className="pt-3 space-y-1">
        {isClean && (
          <div className="flex items-start gap-1.5 text-[11px] text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            ✅ Plan conforme — aucune erreur ni avertissement
          </div>
        )}
        {validation.errors.map((err, i) => (
          <div key={`e-${i}`} className="flex items-start gap-1.5 text-[10px] text-destructive">
            <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
            {err}
          </div>
        ))}
        {validation.warnings.map((warn, i) => (
          <div key={`w-${i}`} className="flex items-start gap-1.5 text-[10px] text-amber-600">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
            {warn}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ValidationPanel;

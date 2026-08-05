import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, ArrowRight } from 'lucide-react';
import type { Contribution, ValidationResult } from './types';
import {
  buildValidationIssues,
  groupIssuesByTab,
  type CCCValidationTab,
} from './cccValidationRules';

interface CCCValidationPanelProps {
  contribution: Contribution;
  validationResult: ValidationResult | null;
  isValidating?: boolean;
  onValidate: (id: string) => void;
  onNavigate: (tab: CCCValidationTab) => void;
}

export const CCCValidationPanel: React.FC<CCCValidationPanelProps> = ({
  contribution,
  validationResult,
  isValidating,
  onValidate,
  onNavigate,
}) => {
  const issues = React.useMemo(
    () => buildValidationIssues(contribution, validationResult),
    [contribution, validationResult],
  );
  const groups = React.useMemo(() => groupIssuesByTab(issues), [issues]);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.length - errorCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {validationResult ? (
            validationResult.valid ? (
              <Badge className="gap-1"><CheckCircle className="h-3 w-3" /> Validation réussie</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Validation échouée</Badge>
            )
          ) : (
            <Badge variant="outline">Validation serveur non exécutée</Badge>
          )}
          {validationResult && (
            <Badge variant="secondary">Score : {validationResult.completeness_score}%</Badge>
          )}
          <Badge variant={errorCount > 0 ? 'destructive' : 'outline'}>{errorCount} bloquante(s)</Badge>
          <Badge variant="outline">{warningCount} avertissement(s)</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isValidating}
          onClick={() => onValidate(contribution.id)}
          className="gap-2 h-8 text-xs md:text-sm"
        >
          <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
          {validationResult ? 'Revalider' : 'Lancer la validation'}
        </Button>
      </div>

      {issues.length === 0 && (
        <Alert className="py-2">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-xs md:text-sm">
            {validationResult
              ? 'Aucun problème détecté : tous les champs contrôlés sont conformes.'
              : 'Aucune incohérence locale détectée. Lancez la validation serveur pour un contrôle complet.'}
          </AlertDescription>
        </Alert>
      )}

      {groups.map((group) => (
        <div key={group.tab} className="rounded-md border">
          <div className="flex items-center justify-between px-2 md:px-3 py-1.5 border-b bg-muted/40">
            <span className="text-xs md:text-sm font-medium">{group.label}</span>
            <Badge variant="outline" className="text-[10px] md:text-xs">{group.items.length}</Badge>
          </div>
          <ul className="divide-y">
            {group.items.map((issue, idx) => (
              <li key={`${issue.fieldId}-${idx}`} className="p-2 md:p-3 flex items-start gap-2">
                {issue.severity === 'error' ? (
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs md:text-sm font-medium">{issue.fieldLabel}</p>
                    <Badge
                      variant={issue.severity === 'error' ? 'destructive' : 'secondary'}
                      className="text-[10px] px-1 py-0"
                    >
                      {issue.severity === 'error' ? 'Bloquant' : 'Avertissement'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">{issue.fieldId}</span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{issue.message}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                    Valeur actuelle :{' '}
                    <span className="font-medium text-foreground">
                      {issue.currentValue ?? 'Non renseigné'}
                    </span>
                  </p>
                </div>
                {issue.tab !== 'other' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs shrink-0 gap-1"
                    onClick={() => onNavigate(issue.tab)}
                  >
                    Voir <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default CCCValidationPanel;

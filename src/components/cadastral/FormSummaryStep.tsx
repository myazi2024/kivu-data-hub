import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, 
  FileText, MapPin, User, Calendar, DollarSign, Building,
  Edit, ExternalLink, Home, Camera, Droplets, Zap, Wifi, Trees
} from 'lucide-react';

export interface SummaryField {
  label: string;
  value: string | number | boolean | undefined | null;
  type?: 'text' | 'date' | 'currency' | 'boolean' | 'file' | 'badge' | 'list' | 'files';
  required?: boolean;
  section?: string;
  navigateTo?: string; // Tab or section to navigate to for editing
}

export interface SummarySection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  fields: SummaryField[];
}

export interface ValidationError {
  field: string;
  message: string;
  section?: string;
  navigateTo?: string;
}

interface FormSummaryStepProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  bgColor?: string;
  sections: SummarySection[];
  validationErrors?: ValidationError[];
  onBack: () => void;
  onSubmit: () => void;
  onNavigateToSection?: (sectionId: string) => void;
  submitLabel?: string;
  backLabel?: string;
  loading?: boolean;
  showWarning?: boolean;
  warningMessage?: string;
  totalAmount?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

const FormSummaryStep: React.FC<FormSummaryStepProps> = ({
  title,
  subtitle = 'Vérifiez les informations avant de continuer',
  icon,
  iconColor = 'text-primary',
  bgColor = 'bg-primary/10',
  sections,
  validationErrors = [],
  onBack,
  onSubmit,
  onNavigateToSection,
  submitLabel = 'Continuer',
  backLabel = 'Modifier',
  loading = false,
  showWarning = true,
  warningMessage,
  totalAmount,
  gradientFrom = 'from-primary',
  gradientTo = 'to-primary/80'
}) => {
  const hasErrors = validationErrors.length > 0;

  const formatValue = (field: SummaryField): React.ReactNode => {
    if (field.value === undefined || field.value === null || field.value === '') {
      return field.required ? (
        <span className="text-orange-600 font-medium">⚠️ Non renseigné</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    }

    switch (field.type) {
      case 'boolean':
        return (
          <Badge variant={field.value ? "default" : "secondary"} className="text-xs">
            {field.value ? '✓ Oui' : 'Non'}
          </Badge>
        );
      case 'currency':
        return (
          <span className="font-semibold text-primary">
            {Number(field.value).toLocaleString()} USD
          </span>
        );
      case 'date':
        if (typeof field.value === 'string') {
          try {
            return new Date(field.value).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
          } catch {
            return field.value;
          }
        }
        return String(field.value);
      case 'file':
        return (
          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
            <FileText className="h-3 w-3 mr-1" />
            Fichier joint
          </Badge>
        );
      case 'files':
        const count = typeof field.value === 'number' ? field.value : 0;
        return count > 0 ? (
          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
            <Camera className="h-3 w-3 mr-1" />
            {count} document{count > 1 ? 's' : ''}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Aucun document</span>
        );
      case 'list':
        if (Array.isArray(field.value)) {
          return (
            <div className="flex flex-wrap gap-1 justify-end">
              {(field.value as string[]).slice(0, 4).map((item, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
              {(field.value as string[]).length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{(field.value as string[]).length - 4}
                </Badge>
              )}
            </div>
          );
        }
        return String(field.value);
      case 'badge':
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            {String(field.value)}
          </Badge>
        );
      default:
        return <span className="font-medium">{String(field.value)}</span>;
    }
  };

  const isFieldMissing = (field: SummaryField): boolean => {
    if (!field.required) return false;
    if (field.value === undefined || field.value === null || field.value === '') return true;
    if (field.type === 'files' && typeof field.value === 'number' && field.value === 0) return true;
    return false;
  };

  const getMissingFields = (): SummaryField[] => {
    return sections.flatMap(section => 
      section.fields.filter(field => isFieldMissing(field))
    );
  };

  const missingFields = getMissingFields();
  const completedFieldsCount = sections.reduce((acc, section) => 
    acc + section.fields.filter(f => !isFieldMissing(f) && f.value !== undefined && f.value !== null && f.value !== '').length, 0
  );
  const totalFieldsCount = sections.reduce((acc, section) => acc + section.fields.length, 0);
  const completionPercentage = totalFieldsCount > 0 ? Math.round((completedFieldsCount / totalFieldsCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* En-tête fixe */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden shrink-0">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`h-10 w-10 rounded-xl ${bgColor} flex items-center justify-center`}>
                <span className={iconColor}>{icon}</span>
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            {/* Indicateur de complétion */}
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{completionPercentage}%</div>
              <div className="text-[10px] text-muted-foreground">complet</div>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                completionPercentage === 100 ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          {/* Avertissement */}
          {showWarning && (
            <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                {warningMessage || 'Veuillez vérifier attentivement toutes les informations. Une fois soumis, le formulaire ne pourra plus être modifié.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Erreurs de validation */}
          {hasErrors && (
            <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-xs text-red-700 dark:text-red-300">
                <p className="font-medium mb-2">Données manquantes ou invalides ({validationErrors.length}) :</p>
                <ul className="space-y-1.5">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-center justify-between gap-2 py-1 border-b border-red-200/50 last:border-0">
                      <span className="flex-1">• {error.message}</span>
                      {error.navigateTo && onNavigateToSection && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigateToSection(error.navigateTo!)}
                          className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-100"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Corriger
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Champs manquants détectés automatiquement */}
          {!hasErrors && missingFields.length > 0 && (
            <Alert className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-xs text-orange-700 dark:text-orange-300">
                <p className="font-medium mb-2">Champs obligatoires non renseignés ({missingFields.length}) :</p>
                <ul className="space-y-1.5">
                  {missingFields.map((field, index) => (
                    <li key={index} className="flex items-center justify-between gap-2 py-1 border-b border-orange-200/50 last:border-0">
                      <span className="flex-1">• {field.label}</span>
                      {field.navigateTo && onNavigateToSection && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigateToSection(field.navigateTo!)}
                          className="h-6 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-100"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Compléter
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sections de données avec ScrollArea */}
      <ScrollArea className="flex-1 mt-3 pr-1" style={{ height: 'calc(100% - 280px)', minHeight: '200px' }}>
        <div className="space-y-3 pb-4">
          {sections.map((section) => (
            <Card key={section.id} className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {section.icon && <span className="text-primary">{section.icon}</span>}
                    <h4 className="text-sm font-semibold">{section.title}</h4>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {section.fields.filter(f => !isFieldMissing(f) && f.value).length}/{section.fields.length}
                    </Badge>
                  </div>
                  {onNavigateToSection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigateToSection(section.id)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                  )}
                </div>

                <div className="divide-y divide-border/30">
                  {section.fields.map((field, index) => {
                    const isMissing = isFieldMissing(field);
                    return (
                      <div
                        key={index}
                        className={`flex justify-between items-start py-2 gap-3 ${
                          isMissing ? 'bg-orange-50/50 dark:bg-orange-950/20 -mx-3 px-3 rounded-lg' : ''
                        }`}
                      >
                        <span className={`text-xs ${isMissing ? 'text-orange-700 font-medium' : 'text-muted-foreground'}`}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </span>
                        <div className="text-right max-w-[60%] text-xs">
                          {formatValue(field)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Pied fixe avec montant et actions */}
      <div className="shrink-0 mt-3 space-y-3">
        {/* Montant total */}
        {totalAmount !== undefined && (
          <Card className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Montant total à payer</span>
                </div>
                <span className="text-xl font-bold text-primary">
                  {totalAmount.toLocaleString()} USD
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 h-11 rounded-xl gap-2"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading || hasErrors || missingFields.length > 0}
            className={`flex-1 h-11 rounded-xl bg-gradient-to-r ${gradientFrom} ${gradientTo} hover:opacity-90 shadow-md`}
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                {submitLabel}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Indicateur de complétion */}
        {!hasErrors && missingFields.length === 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-green-600 py-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Toutes les informations sont complètes</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormSummaryStep;

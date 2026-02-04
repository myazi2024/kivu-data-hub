import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, 
  FileText, MapPin, User, Calendar, DollarSign, Building,
  Edit, ExternalLink
} from 'lucide-react';

export interface SummaryField {
  label: string;
  value: string | number | boolean | undefined | null;
  type?: 'text' | 'date' | 'currency' | 'boolean' | 'file' | 'badge';
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

  const formatValue = (field: SummaryField): string => {
    if (field.value === undefined || field.value === null || field.value === '') {
      return field.required ? '⚠️ Non renseigné' : '—';
    }

    switch (field.type) {
      case 'boolean':
        return field.value ? 'Oui' : 'Non';
      case 'currency':
        return `${Number(field.value).toLocaleString()} USD`;
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
        return typeof field.value === 'string' ? '✓ Fichier joint' : '—';
      default:
        return String(field.value);
    }
  };

  const isFieldMissing = (field: SummaryField): boolean => {
    return field.required && (field.value === undefined || field.value === null || field.value === '');
  };

  const getMissingFields = (): SummaryField[] => {
    return sections.flatMap(section => 
      section.fields.filter(field => isFieldMissing(field))
    );
  };

  const missingFields = getMissingFields();

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`h-10 w-10 rounded-xl ${bgColor} flex items-center justify-center`}>
                <span className={iconColor}>{icon}</span>
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {/* Avertissement */}
          {showWarning && (
            <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                {warningMessage || 'Veuillez vérifier attentivement toutes les informations. Une fois soumis, le formulaire ne pourra plus être modifié et devra être resoumis en cas d\'erreur.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Erreurs de validation */}
          {hasErrors && (
            <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-xs text-red-700 dark:text-red-300">
                <p className="font-medium mb-2">Données manquantes ou invalides :</p>
                <ul className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <span>• {error.message}</span>
                      {error.navigateTo && onNavigateToSection && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigateToSection(error.navigateTo!)}
                          className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
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
                <p className="font-medium mb-2">Champs obligatoires non renseignés :</p>
                <ul className="space-y-1">
                  {missingFields.map((field, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <span>• {field.label}</span>
                      {field.navigateTo && onNavigateToSection && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigateToSection(field.navigateTo!)}
                          className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100"
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

      {/* Sections de données */}
      <ScrollArea className="max-h-[40vh]">
        <div className="space-y-3 pr-2">
          {sections.map((section) => (
            <Card key={section.id} className="rounded-xl border-border/50">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {section.icon && <span className="text-muted-foreground">{section.icon}</span>}
                    <h4 className="text-sm font-semibold">{section.title}</h4>
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

                <div className="space-y-1.5">
                  {section.fields.map((field, index) => {
                    const isMissing = isFieldMissing(field);
                    return (
                      <div
                        key={index}
                        className={`flex justify-between items-start py-1.5 text-sm ${
                          index < section.fields.length - 1 ? 'border-b border-border/30' : ''
                        }`}
                      >
                        <span className="text-muted-foreground text-xs">{field.label}</span>
                        <span 
                          className={`text-right max-w-[60%] text-xs font-medium ${
                            isMissing ? 'text-orange-600' : ''
                          } ${field.type === 'badge' ? '' : ''}`}
                        >
                          {field.type === 'badge' && field.value ? (
                            <Badge variant="secondary" className="text-xs">
                              {String(field.value)}
                            </Badge>
                          ) : (
                            formatValue(field)
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Montant total */}
      {totalAmount !== undefined && (
        <Card className="rounded-xl bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Montant total</span>
              </div>
              <span className="text-lg font-bold text-primary">
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
          className={`flex-1 h-11 rounded-xl bg-gradient-to-r ${gradientFrom} ${gradientTo} hover:opacity-90`}
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
        <div className="flex items-center justify-center gap-2 text-xs text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>Toutes les informations sont complètes</span>
        </div>
      )}
    </div>
  );
};

export default FormSummaryStep;

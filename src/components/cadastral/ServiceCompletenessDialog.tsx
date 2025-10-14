import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Plus, ArrowRight } from 'lucide-react';
import { ServiceCompleteness } from '@/utils/cadastralDataCompleteness';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ServiceCompletenessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  completeness: ServiceCompleteness;
  onContribute: (missingField: string) => void;
  onProceed: () => void;
}

const ServiceCompletenessDialog: React.FC<ServiceCompletenessDialogProps> = ({
  open,
  onOpenChange,
  serviceName,
  completeness,
  onContribute,
  onProceed,
}) => {
  const completionPercentage = Math.round((completeness.filledFields / completeness.totalFields) * 100);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-orange-600">⚠️</span>
            Données incomplètes
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3 pt-2">
            <p className="text-sm">
              Le service <strong>{serviceName}</strong> contient des informations partielles.
            </p>
            
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Complétude</span>
                <Badge variant="secondary" className="text-xs">
                  {completionPercentage}%
                </Badge>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completeness.filledFields} sur {completeness.totalFields} informations disponibles
              </p>
            </div>

            {/* Informations disponibles */}
            {completeness.availableFields.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Informations disponibles
                </h4>
                <ScrollArea className="h-20 rounded border border-green-200 bg-green-50/50 p-2">
                  <ul className="space-y-1">
                    {completeness.availableFields.map((field, index) => (
                      <li key={index} className="text-xs flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{field}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* Informations manquantes */}
            {completeness.missingFields.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-600" />
                  Informations manquantes
                </h4>
                <ScrollArea className="h-24 rounded border border-red-200 bg-red-50/50 p-2">
                  <ul className="space-y-1.5">
                    {completeness.missingFields.map((field, index) => (
                      <li key={index} className="text-xs flex items-center justify-between gap-2 group">
                        <span className="flex items-start gap-1 flex-1">
                          <XCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>{field}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs opacity-70 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            onContribute(field);
                            onOpenChange(false);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Ajouter
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 mt-3">
              <p className="text-xs text-blue-900">
                💡 <strong>Gagnez une récompense!</strong> Contribuez à enrichir les données cadastrales et obtenez un code CCC valable sur vos prochains achats.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="mt-0 text-xs">Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onProceed();
              onOpenChange(false);
            }}
            className="text-xs"
          >
            Continuer quand même
            <ArrowRight className="h-3 w-3 ml-1" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ServiceCompletenessDialog;

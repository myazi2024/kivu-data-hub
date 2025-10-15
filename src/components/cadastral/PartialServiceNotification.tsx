import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
import { ServiceCompleteness } from '@/hooks/useCadastralDataCompleteness';

interface PartialServiceNotificationProps {
  service: ServiceCompleteness;
  serviceName: string;
  onClose: () => void;
  onContinueAnyway: () => void;
  onContribute: (missingFields: string[]) => void;
}

const PartialServiceNotification: React.FC<PartialServiceNotificationProps> = ({
  service,
  serviceName,
  onClose,
  onContinueAnyway,
  onContribute
}) => {
  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <AlertCircle className="h-5 w-5 text-amber-600" />
      <AlertDescription className="space-y-4">
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
            ⚠️ Ce service contient des données partielles
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Le service <span className="font-semibold">{serviceName}</span> est incomplet à {Math.round(100 - service.completionPercentage)}%.
            Vous pouvez contribuer à enrichir ces données pour améliorer votre recherche.
          </p>
        </div>

        {/* Données disponibles */}
        {service.availableFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              ✅ Données disponibles ({service.availableFields.length})
            </p>
            <ul className="text-xs space-y-1 ml-4">
              {service.availableFields.slice(0, 5).map((field) => (
                <li key={field.key} className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                  {field.label}
                </li>
              ))}
              {service.availableFields.length > 5 && (
                <li className="text-amber-600 dark:text-amber-400 italic">
                  ... et {service.availableFields.length - 5} autres
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Données manquantes */}
        {service.missingFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              ❌ Données manquantes ({service.missingFields.length})
            </p>
            <ul className="text-xs space-y-2 ml-4">
              {service.missingFields.slice(0, 5).map((field) => (
                <li key={field.key} className="flex items-center justify-between gap-2 text-amber-700 dark:text-amber-300">
                  <span>{field.label}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => onContribute([field.key])}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </li>
              ))}
              {service.missingFields.length > 5 && (
                <li className="text-amber-600 dark:text-amber-400 italic">
                  ... et {service.missingFields.length - 5} autres données manquantes
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => onContribute(service.missingFields.map(f => f.key))}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Contribuer tous les champs manquants
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onContinueAnyway}
              className="flex-1"
            >
              Acheter quand même
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default PartialServiceNotification;

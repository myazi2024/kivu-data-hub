import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Calendar, AlertTriangle, HelpCircle } from 'lucide-react';
import { DAILY_LATE_FEE_USD, LATE_FEE_CAP_USD } from '@/types/mutation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LateFeeCalculation {
  days: number;
  fee: number;
  applicable: boolean;
  capped: boolean;
}

interface MutationLateFeeSectionProps {
  ownerAcquisitionDate: string | null;
  ownerAcquisitionDateAutoDetected: boolean;
  manualAcquisitionDate: string;
  onManualAcquisitionDateChange: (val: string) => void;
  lateFeesCalculation: LateFeeCalculation;
}

const MutationLateFeeSection: React.FC<MutationLateFeeSectionProps> = ({
  ownerAcquisitionDate,
  ownerAcquisitionDateAutoDetected,
  manualAcquisitionDate,
  onManualAcquisitionDateChange,
  lateFeesCalculation
}) => {
  return (
    <Card className="border-2 border-orange-200 dark:border-orange-700 rounded-xl">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Traitement de mutation hors délai légal
          </h4>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100">
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-background border shadow-lg" align="start" sideOffset={5}>
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Frais de retard de mutation
                </p>
                <p className="text-xs text-muted-foreground">
                  Le non-respect du délai légal de mutation immobilière (20 jours) entraîne des frais supplémentaires.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">Référence :</span> Note circulaire n°1.441/SG/AFF.F/003/2016 du 07 décembre 2016
                </p>
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  Tarif : {DAILY_LATE_FEE_USD} USD par jour à partir du 21ème jour après l'acquisition.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              Date d'acquisition par le propriétaire actuel
              {ownerAcquisitionDateAutoDetected && (
                <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded">
                  détectée automatiquement
                </span>
              )}
            </Label>
            {ownerAcquisitionDate ? (
              <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {format(new Date(ownerAcquisitionDate), 'd MMMM yyyy', { locale: fr })}
                </span>
              </div>
            ) : (
              <Input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={manualAcquisitionDate}
                onChange={(e) => onManualAcquisitionDateChange(e.target.value)}
                className="h-9 text-sm"
                placeholder="Sélectionnez la date d'acquisition"
              />
            )}
          </div>

          {lateFeesCalculation.applicable && (
            <div className="flex items-start gap-3 p-3 rounded-xl transition-colors bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-700">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-lg mt-0.5">
                <Clock className="h-4 w-4 text-orange-700 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    Frais de retard ({lateFeesCalculation.days} jours)
                    <span className="ml-1.5 text-[10px] text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-1.5 py-0.5 rounded">
                      calculé
                    </span>
                  </span>
                  <span className="text-sm font-bold text-orange-700 dark:text-orange-400 whitespace-nowrap">
                    ${lateFeesCalculation.fee.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lateFeesCalculation.days} jours × {DAILY_LATE_FEE_USD} USD/jour
                  {lateFeesCalculation.capped && (
                    <span className="block text-orange-600 font-medium mt-0.5">
                      ⚠ Plafonné à ${LATE_FEE_CAP_USD} USD (plafond légal)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MutationLateFeeSection;

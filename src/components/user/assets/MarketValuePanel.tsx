import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, FileSearch, ExternalLink, AlertTriangle } from 'lucide-react';
import { useUserAssets } from '@/hooks/useUserAssets';
import { openSignedStorageFile } from '@/utils/storageSignedUrl';
import { formatUsd, formatDateFr } from '@/utils/userRentalMarket';

/** Vue « Valeur & expertise » : prix de revente et expertises déclarées. */
export const MarketValuePanel: React.FC = () => {
  const { marketValues, loading } = useUserAssets();

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (marketValues.length === 0) {
    return (
      <div className="text-center py-10 bg-background rounded-2xl border">
        <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Aucune valeur marchande déclarée</p>
      </div>
    );
  }

  const outdated = marketValues.filter((m) => m.appraisalOutdated);

  return (
    <div className="space-y-3">
      {outdated.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {outdated.length} expertise(s) datent de plus de 12 mois. Une réévaluation est
            recommandée pour refléter la valeur actuelle du bien.
          </AlertDescription>
        </Alert>
      )}

      {marketValues.map((m) => (
        <div key={m.contributionId} className="bg-background rounded-2xl border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">{m.parcelNumber}</p>
            <Badge variant="outline" className="text-[9px]">
              {m.wouldSell === true
                ? 'Vendrait si offre'
                : m.wouldSell === false
                  ? 'Ne vendrait pas'
                  : 'Disposition non renseignée'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Prix de revente
              </span>
              <p className="font-semibold">
                {m.resalePriceAmount !== null
                  ? `${Number(m.resalePriceAmount).toLocaleString('fr-FR')} ${m.resalePriceCurrency || 'USD'}`
                  : formatUsd(m.resalePriceUsd)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <FileSearch className="h-3 w-3" /> Valeur expertisée
              </span>
              <p className="font-semibold">{formatUsd(m.appraisedValueUsd)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Date d'expertise</span>
              <p className={m.appraisalOutdated ? 'font-medium text-destructive' : 'font-medium'}>
                {formatDateFr(m.appraisalDate)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Expert</span>
              <p className="font-medium">{m.appraiserName || 'Non renseigné'}</p>
            </div>
          </div>

          {m.appraisalReportUrl && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => { void openSignedStorageFile(m.appraisalReportUrl); }}
            >
              <ExternalLink className="h-3 w-3" />
              Rapport d'expertise
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default MarketValuePanel;

import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import SignedStorageImage from '@/components/shared/SignedStorageImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp, Megaphone, FileSearch } from 'lucide-react';
import { parseMarketListings } from './cccConsistency';
import { openSignedStorageFile } from '@/utils/storageSignedUrl';

interface Props {
  contribution: any;
}

const CHARGE_LABELS: Record<string, string> = {
  water: 'Eau',
  electricity: 'Électricité',
  security: 'Sécurité',
  waste: 'Déchets',
  internet: 'Internet',
};

const LEASE_LABELS: Record<string, string> = {
  meuble: 'Meublé',
  non_meuble: 'Non meublé',
  court_sejour: 'Court séjour',
  bureau: 'Bureau',
};

const fmtMoney = (amount: number | null | undefined, currency?: string | null) =>
  amount === null || amount === undefined
    ? 'Non renseigné'
    : `${Number(amount).toLocaleString('fr-FR')} ${currency || 'USD'}`;

/** Panneau admin : valeur marchande (revente, expertise, annonces). */
export const CCCMarketValuePanel: React.FC<Props> = ({ contribution }) => {
  const listings = useMemo(() => parseMarketListings(contribution?.market_listings), [contribution]);

  const hasResale = contribution?.would_sell_if_offered !== null && contribution?.would_sell_if_offered !== undefined;
  const hasAppraisal = contribution?.has_recent_appraisal === true;

  if (!hasResale && !hasAppraisal && listings.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune donnée de valeur marchande renseignée.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Revente */}
      <div className="p-2 md:p-3 border rounded space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <Label className="text-xs md:text-sm font-semibold">Disposition à la revente</Label>
          <Badge variant="outline" className="text-[10px]">
            {contribution.would_sell_if_offered === true
              ? 'Vendrait si offre'
              : contribution.would_sell_if_offered === false
                ? 'Ne vendrait pas'
                : 'Non renseigné'}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Prix de revente déclaré</Label>
            <p className="text-sm">{fmtMoney(contribution.resale_price_amount, contribution.resale_price_currency)}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Équivalent USD</Label>
            <p className="text-sm">{fmtMoney(contribution.resale_price_usd, 'USD')}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Superficie déclarée</Label>
            <p className="text-sm">
              {contribution.area_sqm
                ? `${Number(contribution.area_sqm).toLocaleString('fr-FR')} m²${
                    contribution.resale_price_usd
                      ? ` · ${(Number(contribution.resale_price_usd) / Number(contribution.area_sqm)).toFixed(1)} USD/m²`
                      : ''
                  }`
                : 'Non renseignée'}
            </p>
          </div>
        </div>
      </div>

      {/* Expertise */}
      <div className="p-2 md:p-3 border rounded space-y-2">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-primary" />
          <Label className="text-xs md:text-sm font-semibold">Expertise immobilière récente</Label>
          <Badge variant="outline" className="text-[10px]">{hasAppraisal ? 'Oui' : 'Non'}</Badge>
        </div>
        {hasAppraisal && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Date d'expertise</Label>
              <p className="text-sm">
                {contribution.appraisal_date
                  ? new Date(contribution.appraisal_date).toLocaleDateString('fr-FR')
                  : 'Non renseignée'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Expert</Label>
              <p className="text-sm">{contribution.appraiser_name || 'Non renseigné'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Valeur expertisée</Label>
              <p className="text-sm">
                {fmtMoney(contribution.appraised_value_amount, contribution.appraised_value_currency)}
                {contribution.appraised_value_usd
                  ? ` (${Number(contribution.appraised_value_usd).toLocaleString('fr-FR')} USD)`
                  : ''}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rapport</Label>
              {contribution.appraisal_report_url ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-6 px-0 text-xs"
                  onClick={() => { void openSignedStorageFile(contribution.appraisal_report_url); }}
                >
                  Ouvrir le rapport <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <p className="text-sm">Non fourni</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Annonces */}
      <div className="p-2 md:p-3 border rounded space-y-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <Label className="text-xs md:text-sm font-semibold">Annonces de mise sur le marché ({listings.length})</Label>
        </div>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune annonce déclarée.</p>
        ) : (
          <div className="space-y-2">
            {listings.map((l, i) => (
              <div key={i} className="p-2 bg-secondary rounded space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">
                    {l.unitLabel || `Annonce ${i + 1}`}
                    {l.constructionRef ? ` · ${l.constructionRef === 'main' ? 'Construction principale' : l.constructionRef}` : ''}
                  </span>
                  <Badge variant={l.listForRent ? 'default' : 'outline'} className="text-[9px]">
                    {l.listForRent ? 'Publiée' : 'Non publiée'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Loyer demandé : {fmtMoney(l.rentAmount, l.rentCurrency)}
                  {l.targetRentUsd ? ` (${l.targetRentUsd} USD)` : ''}
                  {l.leaseType ? ` · ${LEASE_LABELS[l.leaseType] || l.leaseType}` : ''}
                  {l.availableFrom ? ` · Dispo. ${new Date(l.availableFrom).toLocaleDateString('fr-FR')}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.depositMonths ? `Caution ${l.depositMonths} mois · ` : ''}
                  {l.minLeaseMonths ? `Bail min. ${l.minLeaseMonths} mois · ` : ''}
                  Charges incluses :{' '}
                  {l.chargesIncluded.length > 0
                    ? l.chargesIncluded.map((c) => CHARGE_LABELS[c] || c).join(', ')
                    : 'aucune'}
                </p>
                {l.contactValue && (
                  <p className="text-xs text-muted-foreground">
                    Contact ({l.contactChannel || 'non précisé'}) : {l.contactValue}
                    {l.visitSlots ? ` · Visites : ${l.visitSlots}` : ''}
                  </p>
                )}
                {l.description && <p className="text-xs">{l.description}</p>}
                {l.coverImageUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {l.coverImageUrls.map((url, j) => (
                      <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="relative">
                        <SignedStorageImage
                          src={url}
                          alt={`Photo ${j + 1} de l'annonce ${l.unitLabel || i + 1}`}
                          loading="lazy"
                          className="h-16 w-20 object-cover rounded border"
                        />
                        {url === l.coverImageMainUrl && (
                          <Badge className="absolute bottom-0 left-0 text-[8px] px-1 py-0">Couverture</Badge>
                        )}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-destructive">Aucune photo fournie pour cette annonce.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CCCMarketValuePanel;

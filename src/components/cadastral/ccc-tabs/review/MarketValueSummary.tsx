import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import type { CadastralContributionData } from '@/hooks/useCadastralContribution';
import { openSignedStorageFile } from '@/utils/storageSignedUrl';

interface MarketValueSummaryProps {
  formData: CadastralContributionData;
  handleTabChange: (tab: string) => void;
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: 'Immédiate',
  conditional: 'Sous conditions',
};
const CONTACT_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Téléphone',
  email: 'E-mail',
};
const LEASE_TYPE_LABELS: Record<string, string> = {
  meuble: 'Meublé',
  non_meuble: 'Non meublé',
  court_sejour: 'Court séjour',
  bureau: 'Bureau',
};

/** Bloc « Valeur marchande » du récapitulatif (revente, expertise, annonces). */
export const MarketValueSummary: React.FC<MarketValueSummaryProps> = ({ formData, handleTabChange }) => {
  const listings = formData.marketListings || [];
  const sale = formData.saleListing;

  return (
    <Card className="rounded-2xl shadow-sm border-border/50">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold flex items-center gap-1.5"><span>💰</span> Valeur marchande</h4>
          <Button type="button" variant="ghost" size="sm" onClick={() => handleTabChange('market-value')} className="text-xs h-6 px-2">Modifier</Button>
        </div>

        <div className="space-y-2 text-xs">
          {/* Revente */}
          <div>
            <div className="font-medium">Disposition à vendre:</div>
            {formData.wouldSellIfOffered === undefined || formData.wouldSellIfOffered === null ? (
              <div className="ml-2 text-muted-foreground italic">Non renseigné</div>
            ) : formData.wouldSellIfOffered === false ? (
              <div className="ml-2 text-muted-foreground">Non — le propriétaire ne souhaite pas vendre</div>
            ) : (
              <div className="ml-2 text-muted-foreground space-y-0.5">
                <div>Oui — prix proposé: {formData.resalePriceAmount
                  ? `${Number(formData.resalePriceAmount).toLocaleString('fr-FR')} ${formData.resalePriceCurrency || ''}`
                  : 'Non renseigné'}</div>
                {formData.resalePriceUsd ? <div>Équivalent: {Number(formData.resalePriceUsd).toLocaleString('fr-FR')} USD</div> : null}
              </div>
            )}
          </div>

          {/* Expertise */}
          <div className="pt-1 border-t border-border/50">
            <div className="font-medium">Expertise immobilière récente:</div>
            {formData.hasRecentAppraisal === undefined || formData.hasRecentAppraisal === null ? (
              <div className="ml-2 text-muted-foreground italic">Non renseigné</div>
            ) : formData.hasRecentAppraisal === false ? (
              <div className="ml-2 text-muted-foreground">Aucune expertise de moins de 6 mois</div>
            ) : (
              <div className="ml-2 text-muted-foreground space-y-0.5">
                {formData.appraisalDate && <div>Date: {fmtDate(formData.appraisalDate)}</div>}
                {formData.appraiserName && <div>Expert: {formData.appraiserName}</div>}
                {formData.appraisedValueAmount ? (
                  <div>Valeur expertisée: {Number(formData.appraisedValueAmount).toLocaleString('fr-FR')} {formData.appraisedValueCurrency || ''}</div>
                ) : null}
                {formData.appraisalReportUrl && (
                  <div className="flex items-center gap-1 text-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-primary"
                      onClick={() => { void openSignedStorageFile(formData.appraisalReportUrl); }}
                    >
                      Rapport d'expertise joint
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Annonce de vente */}
          {formData.wouldSellIfOffered === true && sale && (
            <div className="pt-1 border-t border-border/50">
              <div className="font-medium">Annonce de vente:</div>
              <div className="ml-2 text-muted-foreground space-y-0.5">
                <div>Photos: {sale.coverImageUrls?.length || 0}{sale.coverImageMainUrl ? ' (couverture définie)' : ''}</div>
                <div>Prix: {sale.priceNegotiable ? 'Négociable' : 'Ferme'}</div>
                {sale.availability && (
                  <div>Disponibilité: {AVAILABILITY_LABELS[sale.availability] || sale.availability}
                    {sale.availabilityNote ? ` — ${sale.availabilityNote}` : ''}</div>
                )}
                {sale.description && (
                  <div>Description: {sale.description.length > 80 ? `${sale.description.substring(0, 80)}…` : sale.description}</div>
                )}
                {sale.contactValue && (
                  <div>Contact: {CONTACT_LABELS[sale.contactChannel || ''] || sale.contactChannel} — {sale.contactValue}</div>
                )}
                {sale.visitSlots && <div>Créneaux de visite: {sale.visitSlots}</div>}
              </div>
            </div>
          )}

          {/* Annonces de location des locaux vacants */}
          {listings.length > 0 && (
            <div className="pt-1 border-t border-border/50">
              <div className="font-medium">Locaux mis sur le marché ({listings.filter(l => l.listForRent).length}/{listings.length}):</div>
              {listings.filter(l => l.listForRent).map((l, idx) => (
                <div key={idx} className="ml-2 mt-1 p-2 bg-muted/50 rounded-lg space-y-0.5 text-muted-foreground">
                  <div className="font-medium text-foreground">{l.unitLabel || l.constructionRef}</div>
                  {(l.rentAmount || l.targetRentUsd) && (
                    <div>Loyer demandé: {l.rentAmount
                      ? `${Number(l.rentAmount).toLocaleString('fr-FR')} ${l.rentCurrency || 'USD'}`
                      : `${Number(l.targetRentUsd).toLocaleString('fr-FR')} USD`}</div>
                  )}
                  {l.availableFrom && <div>Disponible dès: {fmtDate(l.availableFrom)}</div>}
                  {l.leaseType && <div>Type de bail: {LEASE_TYPE_LABELS[l.leaseType] || l.leaseType}</div>}
                  {l.depositMonths ? <div>Caution: {l.depositMonths} mois</div> : null}
                  {l.minLeaseMonths ? <div>Durée minimale: {l.minLeaseMonths} mois</div> : null}
                  {l.chargesIncluded && Object.values(l.chargesIncluded).some(Boolean) && (
                    <div>Charges incluses: {Object.entries(l.chargesIncluded).filter(([, v]) => v).map(([k]) => k).join(', ')}</div>
                  )}
                  <div>Photos: {l.coverImageUrls?.length || 0}</div>
                  {l.contactValue && (
                    <div>Contact: {CONTACT_LABELS[l.contactChannel || ''] || l.contactChannel} — {l.contactValue}</div>
                  )}
                  {l.visitSlots && <div>Créneaux de visite: {l.visitSlots}</div>}
                </div>
              ))}
            </div>
          )}

          {formData.wouldSellIfOffered === undefined && formData.hasRecentAppraisal === undefined && listings.length === 0 && (
            <div className="text-muted-foreground italic">Aucune information de valeur marchande</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketValueSummary;

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Megaphone, ImageOff, Phone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserAssets } from '@/hooks/useUserAssets';
import { formatUsd, formatDateFr } from '@/utils/userRentalMarket';

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

/** Vue « Annonces » : annonces déclarées + contrôle de publication. */
export const ListingsPanel: React.FC = () => {
  const { rows, listings, loading, refetch } = useUserAssets();
  const [saving, setSaving] = useState<string | null>(null);

  const publishedMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      const raw = Array.isArray(row.market_listings) ? row.market_listings : [];
      raw.forEach((l: any, i: number) => {
        map[`${row.id}-${i}`] = l?.isPublished !== false;
      });
    }
    return map;
  }, [rows]);

  const togglePublication = async (contributionId: string, index: number, next: boolean) => {
    const key = `${contributionId}-${index}`;
    setSaving(key);
    try {
      const row = rows.find((r) => r.id === contributionId);
      const raw = Array.isArray(row?.market_listings) ? [...(row!.market_listings as any[])] : [];
      if (!raw[index]) throw new Error('Annonce introuvable');
      raw[index] = { ...raw[index], isPublished: next };

      const { error } = await supabase
        .from('cadastral_contributions')
        .update({ market_listings: raw })
        .eq('id', contributionId);
      if (error) throw error;

      toast.success(next ? 'Annonce publiée' : 'Annonce retirée de la publication');
      await refetch();
    } catch (e) {
      console.error('toggle listing publication', e);
      toast.error("Impossible de modifier la publication de cette annonce");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-10 bg-background rounded-2xl border">
        <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Aucune annonce publiée</p>
        <p className="text-xs text-muted-foreground mt-1">
          Créez une annonce depuis l'onglet « Valeur marchande » du formulaire cadastral.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((l) => {
        const key = `${l.contributionId}-${l.index}`;
        const published = publishedMap[key] ?? true;
        const cover = l.coverImageMainUrl || l.coverImageUrls?.[0] || null;
        return (
          <div key={key} className="bg-background rounded-2xl border overflow-hidden">
            <div className="flex gap-3 p-3">
              <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
                {cover ? (
                  <img
                    src={cover}
                    alt={`Annonce ${l.unitLabel || l.parcelNumber}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <ImageOff className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{l.unitLabel || l.parcelNumber}</p>
                  <Badge variant={l.listForRent ? 'default' : 'secondary'} className="text-[9px]">
                    {l.listForRent ? 'Location' : 'Vente'}
                  </Badge>
                  {!published && (
                    <Badge variant="outline" className="text-[9px]">
                      Masquée
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Parcelle {l.parcelNumber}</p>
                <p className="text-sm font-bold">
                  {l.rentAmount !== null
                    ? `${Number(l.rentAmount).toLocaleString('fr-FR')} ${l.rentCurrency || 'USD'}`
                    : formatUsd(l.targetRentUsd)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {[
                    l.leaseType ? LEASE_LABELS[l.leaseType] || l.leaseType : null,
                    l.availableFrom ? `Dispo. ${formatDateFr(l.availableFrom)}` : null,
                    l.minLeaseMonths ? `Min. ${l.minLeaseMonths} mois` : null,
                    l.depositMonths ? `Caution ${l.depositMonths} mois` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ') || 'Conditions non renseignées'}
                </p>
                {l.chargesIncluded.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {l.chargesIncluded.map((c) => (
                      <Badge key={c} variant="outline" className="text-[9px]">
                        {CHARGE_LABELS[c] || c}
                      </Badge>
                    ))}
                  </div>
                )}
                {l.contactValue && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {l.contactChannel ? `${l.contactChannel} — ` : ''}
                    {l.contactValue}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {published ? 'Visible publiquement' : 'Non visible'}
              </span>
              <div className="flex items-center gap-2">
                {saving === key && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Switch
                  checked={published}
                  disabled={saving === key}
                  onCheckedChange={(v) => togglePublication(l.contributionId, l.index, v)}
                  aria-label="Publier cette annonce"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ListingsPanel;

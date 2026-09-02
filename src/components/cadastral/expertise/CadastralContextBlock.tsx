import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Landmark, Sparkles } from 'lucide-react';
import { SOUND_LABELS } from '@/constants/expertiseLabels';
import type { ParcelExpertisePrefill } from '@/hooks/useParcelExpertisePrefill';

interface Props {
  prefill: ParcelExpertisePrefill | null | undefined;
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

/**
 * Bloc lecture seule : indicateurs déclarés dans le formulaire CCC et utiles à
 * l'expert (hauteur, standing, environnement sonore, statut locatif, occupation).
 */
const CadastralContextBlock: React.FC<Props> = ({ prefill }) => {
  if (!prefill) return null;

  const rows: Array<{ label: string; value: React.ReactNode }> = [];

  if (prefill.building_height) rows.push({ label: 'Hauteur déclarée', value: `${prefill.building_height} m` });
  if (prefill.standing) rows.push({ label: 'Standing', value: prefill.standing });
  if (prefill.sound_environment) {
    rows.push({
      label: 'Environnement sonore',
      value: SOUND_LABELS[prefill.sound_environment as keyof typeof SOUND_LABELS] || prefill.sound_environment,
    });
  }
  if (prefill.is_rented !== null && prefill.is_rented !== undefined) {
    rows.push({ label: 'Bien en location', value: prefill.is_rented ? 'Oui' : 'Non' });
  }
  if (prefill.is_rented && prefill.monthly_rent_usd) {
    rows.push({ label: 'Loyer mensuel déclaré', value: `${prefill.monthly_rent_usd} USD` });
  }
  if (prefill.is_rented && prefill.rental_units_count) {
    rows.push({ label: 'Nombre de locaux', value: prefill.rental_units_count });
  }
  if (prefill.hosting_capacity) rows.push({ label: "Capacité d'accueil", value: prefill.hosting_capacity });
  if (prefill.occupant_count !== null && prefill.occupant_count !== undefined) {
    rows.push({ label: 'Occupants déclarés', value: prefill.occupant_count });
  }
  if (prefill.apartment_orientation) rows.push({ label: 'Orientation appartement', value: prefill.apartment_orientation });

  if (rows.length === 0) return null;

  return (
    <Card className="border rounded-xl bg-muted/40">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Contexte cadastral déclaré</h4>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Sparkles className="h-3 w-3" /> Lecture seule
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Ces informations proviennent de la fiche cadastrale (formulaire CCC) et sont transmises à l'expert.
        </p>
        <div className="space-y-1.5 pt-1">
          {rows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CadastralContextBlock;

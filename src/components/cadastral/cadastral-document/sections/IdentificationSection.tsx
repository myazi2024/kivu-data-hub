import React from 'react';
import { Building, Info, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SectionCard, DataGrid, DataField } from '../primitives';
import { CadastralParcel } from '@/types/cadastral';
import { PROPERTY_TITLE_TYPES } from '../../PropertyTitleTypeSelect';
import DocumentAttachment from '../../DocumentAttachment';

interface IdentificationSectionProps {
  number: number;
  parcel: CadastralParcel;
}

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatArea = (sqm: number) => {
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha (${sqm.toLocaleString()} m²)`;
  return `${sqm.toLocaleString()} m²`;
};

const IdentificationSection: React.FC<IdentificationSectionProps> = ({ number, parcel }) => {
  const surfaceVariance = parcel.surface_calculee_bornes && parcel.area_sqm
    ? ((parcel.surface_calculee_bornes - parcel.area_sqm) / parcel.area_sqm * 100)
    : null;

  return (
    <SectionCard number={number} icon={<Building className="h-4 w-4" />} title="Identification de la parcelle">
      <DataGrid>
        <DataField label="Type de titre" value={
          <span className="flex items-center gap-1.5">
            {parcel.property_title_type}
            <Popover>
              <PopoverTrigger asChild>
                <button className="print:hidden"><Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" /></button>
              </PopoverTrigger>
              <PopoverContent side="right" className="max-w-sm text-sm">
                {PROPERTY_TITLE_TYPES.find(t => t.value === parcel.property_title_type)?.details ||
                  "Type de titre de propriété reconnu par la législation foncière de la RDC."}
              </PopoverContent>
            </Popover>
          </span>
        } />
        {parcel.title_reference_number && <DataField label="Référence du titre" value={parcel.title_reference_number} mono />}
        {parcel.title_issue_date && <DataField label="Date d'émission" value={formatDate(parcel.title_issue_date)} />}
        {parcel.location && <DataField label="Adresse" value={parcel.location} />}
        <DataField label="Superficie déclarée" value={formatArea(parcel.area_sqm)} highlight />
        {parcel.surface_calculee_bornes != null && (
          <DataField label="Superficie mesurée (GPS)" value={
            <span className="flex items-center gap-2">
              {formatArea(parcel.surface_calculee_bornes)}
              {surfaceVariance !== null && Math.abs(surfaceVariance) > 1 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={`text-xs font-medium inline-flex items-center gap-0.5 ${Math.abs(surfaceVariance) > 10 ? 'text-destructive' : 'text-[hsl(var(--warning))]'}`}
                      aria-label="Explication de l'écart de superficie"
                    >
                      <AlertTriangle className="inline h-3 w-3 mr-0.5" />
                      {surfaceVariance > 0 ? '+' : ''}{surfaceVariance.toFixed(1)}%
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="max-w-sm text-sm">
                    Écart entre la superficie déclarée au titre de propriété et celle calculée à partir des coordonnées GPS des bornes. Un écart {'>'} 10 % peut indiquer une erreur de bornage ou de relevé.
                  </PopoverContent>
                </Popover>
              )}
            </span>
          } />
        )}
        {parcel.declared_usage && <DataField label="Usage déclaré" value={parcel.declared_usage} />}
        {parcel.lease_type && <DataField label="Type de bail" value={parcel.lease_type} />}
        {parcel.standing && <DataField label="Standing" value={parcel.standing} />}
        {parcel.is_subdivided != null && (
          <DataField label="Parcelle subdivisée" value={
            <Badge variant={parcel.is_subdivided ? 'secondary' : 'outline'} className="text-xs">
              {parcel.is_subdivided ? 'Oui — Lotie' : 'Non'}
            </Badge>
          } />
        )}
      </DataGrid>

      {parcel.property_title_document_url && (
        <div className="mt-3">
          <DocumentAttachment documentUrl={parcel.property_title_document_url} label="Titre de propriété" description="Document officiel" />
        </div>
      )}
    </SectionCard>
  );
};

export default IdentificationSection;

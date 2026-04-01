import React from 'react';
import { MapPin, Map, Ruler } from 'lucide-react';
import { SectionCard, DataGrid, DataField, DocTable } from '../primitives';
import { CadastralParcel } from '@/types/cadastral';
import { BoundaryHistory } from '@/hooks/useCadastralSearch';
import ParcelSketchSVG from '../../ParcelSketchSVG';
import DocumentAttachment from '../../DocumentAttachment';

interface LocationSectionProps {
  number: number;
  parcel: CadastralParcel;
  boundaryHistory: BoundaryHistory[];
}

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

interface ParcelSide {
  side?: string;
  length?: number;
  orientation?: string;
  [key: string]: any;
}

const LocationSection: React.FC<LocationSectionProps> = ({ number, parcel, boundaryHistory }) => {
  const gpsCoords = Array.isArray(parcel.gps_coordinates)
    ? (parcel.gps_coordinates as Array<{ lat: number | string; lng: number | string; borne: string }>)
    : [];
  const hasSketch = gpsCoords.length >= 3;

  const parcelSides: ParcelSide[] = Array.isArray(parcel.parcel_sides)
    ? (parcel.parcel_sides as ParcelSide[]).filter(s => s && (s.side || s.length))
    : [];

  const sketchSides = parcelSides.map(s => ({
    name: s.side || '',
    length: String(s.length ?? ''),
    orientation: s.orientation,
  }));

  return (
    <SectionCard number={number} icon={<MapPin className="h-4 w-4" />} title="Localisation">
      <DataGrid>
        <DataField label="Province" value={parcel.province} />
        {parcel.parcel_type === 'SU' ? (
          <>
            {parcel.ville && <DataField label="Ville" value={parcel.ville} />}
            {parcel.commune && <DataField label="Commune" value={parcel.commune} />}
            {parcel.quartier && <DataField label="Quartier" value={parcel.quartier} />}
            {parcel.avenue && <DataField label="Avenue" value={parcel.avenue} />}
            {parcel.house_number && <DataField label="N° Maison" value={parcel.house_number} />}
          </>
        ) : (
          <>
            {parcel.territoire && <DataField label="Territoire" value={parcel.territoire} />}
            {parcel.collectivite && <DataField label="Collectivité" value={parcel.collectivite} />}
            {parcel.groupement && <DataField label="Groupement" value={parcel.groupement} />}
            {parcel.village && <DataField label="Village" value={parcel.village} />}
          </>
        )}
        {parcel.latitude && parcel.longitude && (
          <DataField label="Coordonnées GPS" value={`${parcel.latitude.toFixed(6)}, ${parcel.longitude.toFixed(6)}`} mono />
        )}
        {parcel.nombre_bornes && <DataField label="Nombre de bornes" value={parcel.nombre_bornes} />}
      </DataGrid>

      {/* Parcel sides */}
      {parcelSides.length > 0 && (
        <div className="mt-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5" /> Dimensions des côtés
          </h4>
          <DocTable headers={['Côté', 'Longueur (m)', 'Orientation']}>
            {parcelSides.map((s, i) => (
              <tr key={i}>
                <td className="text-xs font-medium">{s.side || `Côté ${i + 1}`}</td>
                <td className="font-mono text-xs">{s.length != null ? `${s.length} m` : '—'}</td>
                <td className="text-xs">{s.orientation || '—'}</td>
              </tr>
            ))}
          </DocTable>
        </div>
      )}

      {/* Sketch SVG */}
      {hasSketch && (
        <div className="mt-4 print:break-before-page">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Map className="h-3.5 w-3.5" /> Croquis du terrain
          </h4>
          <div className="relative z-0 rounded-lg overflow-hidden border border-border/50 bg-background p-2">
            <ParcelSketchSVG
              coordinates={gpsCoords}
              parcelSides={sketchSides}
              buildingShapes={[]}
              roadSides={[]}
            />
          </div>
        </div>
      )}

      {/* Boundary history */}
      {boundaryHistory.length > 0 && (
        <div className="mt-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Historique de bornage
          </h4>
          <DocTable headers={['Réf. PV', 'Objet', 'Géomètre', 'Date']}>
            {boundaryHistory.map((b) => (
              <tr key={b.id}>
                <td className="font-mono text-xs">{b.pv_reference_number}</td>
                <td className="text-xs">{b.boundary_purpose}</td>
                <td className="text-xs">{b.surveyor_name}</td>
                <td className="text-xs">{formatDate(b.survey_date)}</td>
              </tr>
            ))}
          </DocTable>
          {boundaryHistory.filter(b => b.boundary_document_url).map(b => (
            <div key={b.id} className="mt-2">
              <DocumentAttachment documentUrl={b.boundary_document_url} label={`PV ${b.pv_reference_number}`} description="Procès-verbal de bornage" />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

export default LocationSection;

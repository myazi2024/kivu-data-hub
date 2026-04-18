import React from 'react';
import { Building, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionCard, DataGrid, DataField, DocTable } from '../primitives';
import { CadastralParcel } from '@/types/cadastral';
import { BuildingPermit } from '@/hooks/useCadastralSearch';
import DocumentAttachment from '../../DocumentAttachment';

interface ConstructionSectionProps {
  number: number;
  parcel: CadastralParcel;
  buildingPermits: BuildingPermit[];
}

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const ConstructionSection: React.FC<ConstructionSectionProps> = ({ number, parcel, buildingPermits }) => {
  const hasConstruction = parcel.construction_type || parcel.construction_nature || parcel.construction_materials || parcel.construction_year;
  if (!hasConstruction && buildingPermits.length === 0) return null;

  return (
    <SectionCard number={number} icon={<Building className="h-4 w-4" />} title="Construction & Autorisations">
      {hasConstruction && (
        <DataGrid>
          {parcel.construction_type && <DataField label="Type" value={parcel.construction_type} />}
          {parcel.construction_nature && <DataField label="Nature" value={parcel.construction_nature} />}
          {parcel.construction_materials && <DataField label="Matériaux" value={parcel.construction_materials} />}
          {parcel.construction_year && <DataField label="Année" value={parcel.construction_year} />}
          {(parcel as any).declared_usage === 'Location' && (parcel as any).rental_start_date && (
            <DataField label="En location depuis" value={formatDate((parcel as any).rental_start_date)} />
          )}
        </DataGrid>
      )}

      {buildingPermits.length > 0 && (
        <div className={hasConstruction ? 'mt-5' : ''}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Autorisations de bâtir
          </h4>
          <DocTable headers={['N° Permis', 'Émission', 'Validité', 'Statut', 'Service']}>
            {buildingPermits.map((permit) => {
              const issueDate = new Date(permit.issue_date);
              const endDate = new Date(issueDate);
              endDate.setMonth(endDate.getMonth() + permit.validity_period_months);
              const isValid = endDate > new Date();
              return (
                <tr key={permit.id}>
                  <td className="font-mono text-xs">{permit.permit_number}</td>
                  <td className="text-xs">{formatDate(permit.issue_date)}</td>
                  <td className={isValid ? 'text-green-600' : 'text-destructive'}>
                    <span className="text-xs">{isValid ? '✅ Valide' : '❌ Expiré'} — {endDate.toLocaleDateString('fr-FR')}</span>
                  </td>
                  <td>
                    <Badge variant={['Conforme', 'Approuvé', 'Délivré', 'Delivre'].includes(permit.administrative_status) ? 'default' :
                      permit.administrative_status === 'En attente' ? 'secondary' : 'destructive'} className="text-xs">
                      {permit.administrative_status}
                    </Badge>
                  </td>
                  <td className="text-xs">{permit.issuing_service}</td>
                </tr>
              );
            })}
          </DocTable>

          {/* Permit documents & contacts */}
          {buildingPermits.map((permit) => (
            <React.Fragment key={`doc-${permit.id}`}>
              {permit.issuing_service_contact && (
                <p className="text-xs text-muted-foreground mt-1">
                  Contact — {permit.issuing_service}: <span className="font-medium text-foreground">{permit.issuing_service_contact}</span>
                </p>
              )}
              {permit.permit_document_url && (
                <div className="mt-2">
                  <DocumentAttachment
                    documentUrl={permit.permit_document_url}
                    label={`Autorisation ${permit.permit_number}`}
                    description="Document d'autorisation de bâtir"
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

export default ConstructionSection;

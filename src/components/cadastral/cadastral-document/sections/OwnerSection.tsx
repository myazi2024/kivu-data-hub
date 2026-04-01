import React from 'react';
import { User } from 'lucide-react';
import { SectionCard, DataGrid, DataField } from '../primitives';
import { CadastralParcel } from '@/types/cadastral';
import DocumentAttachment from '../../DocumentAttachment';

interface OwnerSectionProps {
  number: number;
  parcel: CadastralParcel;
}

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const OwnerSection: React.FC<OwnerSectionProps> = ({ number, parcel }) => (
  <SectionCard number={number} icon={<User className="h-4 w-4" />} title="Propriétaire actuel">
    <DataGrid>
      <DataField label="Nom complet" value={parcel.current_owner_name} highlight />
      <DataField label="Statut juridique" value={parcel.current_owner_legal_status} />
      <DataField label="Propriétaire depuis" value={formatDate(parcel.current_owner_since)} />
      {parcel.whatsapp_number && (
        <DataField label="WhatsApp" value={
          <a href={`https://wa.me/${parcel.whatsapp_number.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary underline print:no-underline">
            {parcel.whatsapp_number}
          </a>
        } />
      )}
    </DataGrid>
    {parcel.owner_document_url && (
      <div className="mt-3">
        <DocumentAttachment documentUrl={parcel.owner_document_url} label="Document d'identité" description="Justificatif du propriétaire" />
      </div>
    )}
  </SectionCard>
);

export default OwnerSection;

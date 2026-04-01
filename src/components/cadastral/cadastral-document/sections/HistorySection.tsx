import React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionCard, DocTable } from '../primitives';
import { CadastralParcel } from '@/types/cadastral';
import { OwnershipHistory } from '@/hooks/useCadastralSearch';
import DocumentAttachment from '../../DocumentAttachment';

interface HistorySectionProps {
  number: number;
  parcel: CadastralParcel;
  ownershipHistory: OwnershipHistory[];
}

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const HistorySection: React.FC<HistorySectionProps> = ({ number, parcel, ownershipHistory }) => (
  <SectionCard number={number} icon={<Clock className="h-4 w-4" />} title="Historique de propriété">
    <DocTable headers={['Propriétaire', 'Statut juridique', 'Du', 'Au', 'Type de mutation']}>
      <tr className="bg-primary/5">
        <td className="font-semibold text-sm">{parcel.current_owner_name}</td>
        <td className="text-xs">{parcel.current_owner_legal_status}</td>
        <td className="text-xs">{formatDate(parcel.current_owner_since)}</td>
        <td><Badge variant="default" className="text-xs">Actuel</Badge></td>
        <td className="text-xs">—</td>
      </tr>
      {ownershipHistory.map((owner) => (
        <tr key={owner.id}>
          <td className="text-sm">{owner.owner_name}</td>
          <td className="text-xs">{owner.legal_status}</td>
          <td className="text-xs">{formatDate(owner.ownership_start_date)}</td>
          <td className="text-xs">{formatDate(owner.ownership_end_date)}</td>
          <td className="text-xs">{owner.mutation_type || '—'}</td>
        </tr>
      ))}
    </DocTable>

    {ownershipHistory.length === 0 && (
      <p className="text-sm text-muted-foreground italic mt-3">Aucun ancien propriétaire enregistré</p>
    )}

    {ownershipHistory.filter(o => o.ownership_document_url).map(o => (
      <div key={o.id} className="mt-2">
        <DocumentAttachment documentUrl={o.ownership_document_url} label={`Titre — ${o.owner_name}`} />
      </div>
    ))}
  </SectionCard>
);

export default HistorySection;

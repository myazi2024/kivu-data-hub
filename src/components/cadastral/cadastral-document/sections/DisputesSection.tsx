import React from 'react';
import { Scale, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionCard, DocTable, StatusAlert } from '../primitives';
import { LandDispute } from '@/hooks/useCadastralSearch';

interface DisputesSectionProps {
  number: number;
  landDisputes: LandDispute[];
}

const DisputesSection: React.FC<DisputesSectionProps> = ({ number, landDisputes }) => (
  <SectionCard number={number} icon={<Scale className="h-4 w-4" />} title="Litiges fonciers">
    {landDisputes.length === 0 ? (
      <StatusAlert
        variant="success"
        icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
        title="Aucun litige foncier enregistré"
        description="Cette parcelle ne fait l'objet d'aucun litige connu"
      />
    ) : (
      <DocTable headers={['Référence', 'Nature', 'Déclarant', 'Statut', 'Date']}>
        {landDisputes.map((d) => (
          <tr key={d.id}>
            <td className="font-mono text-xs">{d.reference_number}</td>
            <td className="text-xs">{d.dispute_nature}</td>
            <td className="text-xs">{d.declarant_name}</td>
            <td><Badge variant="outline" className="text-xs">{d.current_status}</Badge></td>
            <td className="text-xs">{d.dispute_start_date ? new Date(d.dispute_start_date).toLocaleDateString('fr-FR') : '—'}</td>
          </tr>
        ))}
      </DocTable>
    )}
  </SectionCard>
);

export default DisputesSection;

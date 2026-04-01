import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionCard, DataGrid, DataField } from '../primitives';
import { LegalVerification } from '@/hooks/useCadastralSearch';
import DocumentAttachment from '../../DocumentAttachment';

interface LegalSectionProps {
  number: number;
  legalVerification: LegalVerification;
}

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const LegalSection: React.FC<LegalSectionProps> = ({ number, legalVerification }) => (
  <SectionCard number={number} icon={<ShieldCheck className="h-4 w-4" />} title="Vérification juridique">
    <DataGrid>
      <DataField label="Type de titre" value={legalVerification.title_type} />
      <DataField label="Référence du titre" value={legalVerification.title_reference} mono />
      <DataField label="Date d'émission" value={formatDate(legalVerification.title_issue_date)} />
      <DataField label="Litige en cours" value={
        legalVerification.has_dispute
          ? <Badge variant="destructive" className="text-xs">⚠ Oui</Badge>
          : <Badge variant="default" className="text-xs">✅ Non</Badge>
      } />
      <DataField label="Parcelle subdivisée" value={
        legalVerification.is_subdivided
          ? <Badge variant="secondary" className="text-xs">Oui</Badge>
          : <Badge variant="default" className="text-xs">Non</Badge>
      } />
    </DataGrid>

    {legalVerification.title_document_url && (
      <div className="mt-3">
        <DocumentAttachment documentUrl={legalVerification.title_document_url} label="Titre de propriété" description="Document officiel vérifié" />
      </div>
    )}
    {legalVerification.owner_document_url && (
      <div className="mt-2">
        <DocumentAttachment documentUrl={legalVerification.owner_document_url} label="Document d'identité" description="Justificatif du propriétaire" />
      </div>
    )}
  </SectionCard>
);

export default LegalSection;

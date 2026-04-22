import { Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const TYPE_TO_TAB: Record<string, { tab: string; label: string }> = {
  ccc: { tab: 'ccc', label: 'CCC' },
  mutation: { tab: 'mutations', label: 'Mutation' },
  expertise: { tab: 'expertise-requests', label: 'Expertise' },
  permit: { tab: 'permits', label: 'Autorisation' },
  land_title: { tab: 'land-title-requests', label: 'Titre foncier' },
  subdivision: { tab: 'subdivision-hub', label: 'Lotissement' },
  catalog: { tab: 'invoices', label: 'Catalogue' },
};

interface Props {
  sourceType: string | null | undefined;
  sourceId: string | null | undefined;
}

export const InvoiceSourceLink = ({ sourceType, sourceId }: Props) => {
  if (!sourceType || !sourceId) return <span className="text-xs text-muted-foreground">—</span>;
  const meta = TYPE_TO_TAB[sourceType];
  if (!meta) return <Badge variant="outline" className="text-[10px]">{sourceType}</Badge>;
  return (
    <Link
      to={`/admin?tab=${meta.tab}&id=${sourceId}`}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <LinkIcon className="h-3 w-3" />
      {meta.label}
    </Link>
  );
};

export default InvoiceSourceLink;

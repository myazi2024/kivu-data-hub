import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const TABLE_ROUTE_MAP: Record<string, (id: string) => string> = {
  cadastral_parcels: (id) => `/admin?tab=parcels&id=${id}`,
  cadastral_contributions: (id) => `/admin?tab=ccc-contributions&id=${id}`,
  cadastral_invoices: (id) => `/admin?tab=billing-commerce&invoice=${id}`,
  payments: (id) => `/admin?tab=billing-commerce&payment=${id}`,
  cadastral_land_disputes: (id) => `/admin?tab=requests-procedures&dispute=${id}`,
  cadastral_mortgages: (id) => `/admin?tab=requests-procedures&mortgage=${id}`,
  hr_employees: (id) => `/admin?tab=hr&employee=${id}`,
  hr_leaves: (id) => `/admin?tab=hr&leave=${id}`,
  app_appearance_config: () => `/admin?tab=appearance`,
  cadastral_search_config: () => `/admin?tab=test-mode`,
  system_settings: () => `/admin?tab=system-settings`,
  parcel_actions_config: () => `/admin?tab=parcel-actions`,
};

interface Props {
  tableName?: string | null;
  recordId?: string | null;
}

export default function AuditDrillDownButton({ tableName, recordId }: Props) {
  if (!tableName) return null;
  const builder = TABLE_ROUTE_MAP[tableName];
  if (!builder) {
    return (
      <Button size="sm" variant="ghost" disabled title="Drill-down non disponible pour cette table">
        <ExternalLink className="h-3 w-3 opacity-30" />
      </Button>
    );
  }
  const href = builder(recordId || '');
  return (
    <Button asChild size="sm" variant="ghost" title="Voir l'enregistrement">
      <Link to={href}><ExternalLink className="h-3 w-3" /></Link>
    </Button>
  );
}

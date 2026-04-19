import React from 'react';
import { FileText } from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';

interface BillingHeaderProps {
  parcel: CadastralSearchResult['parcel'];
  servicesCount: number;
}

const BillingHeader: React.FC<BillingHeaderProps> = ({ parcel, servicesCount }) => (
  <CardHeader className="pb-2 p-3 border-b border-border/50">
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-xl bg-primary/10 shadow-sm">
        <FileText className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <CardTitle className="text-sm font-semibold truncate">
          {parcel.parcel_number}
        </CardTitle>
        <p className="text-xs text-muted-foreground truncate">
          {parcel.location} • {parcel.parcel_type === 'SU' ? 'Urbaine' : 'Rurale'}
        </p>
      </div>
      <Badge variant="outline" className="text-xs px-1.5 py-0.5 shrink-0">
        {servicesCount} services
      </Badge>
    </div>
  </CardHeader>
);

export default BillingHeader;

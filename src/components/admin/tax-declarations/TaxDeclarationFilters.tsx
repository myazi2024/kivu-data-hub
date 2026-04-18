import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, RefreshCw } from 'lucide-react';
import { TAX_TYPES } from './taxDeclarationTypes';

interface Props {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterTaxType: string;
  setFilterTaxType: (v: string) => void;
  onExport: () => void;
  onRefresh: () => void;
}

export const TaxDeclarationFilters = ({
  searchTerm, setSearchTerm, filterStatus, setFilterStatus,
  filterTaxType, setFilterTaxType, onExport, onRefresh,
}: Props) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="relative">
      <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        placeholder="Parcelle, propriétaire..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="pl-8 h-8 text-xs w-40"
      />
    </div>
    <Select value={filterStatus} onValueChange={setFilterStatus}>
      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="_all">Tous statuts</SelectItem>
        <SelectItem value="pending">En attente</SelectItem>
        <SelectItem value="approved">Approuvée</SelectItem>
        <SelectItem value="rejected">Rejetée</SelectItem>
        <SelectItem value="returned">Renvoyée</SelectItem>
      </SelectContent>
    </Select>
    <Select value={filterTaxType} onValueChange={setFilterTaxType}>
      <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="_all">Toutes taxes</SelectItem>
        {TAX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
      </SelectContent>
    </Select>
    <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onExport}>
      <Download className="h-3.5 w-3.5" />
    </Button>
    <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onRefresh}>
      <RefreshCw className="h-3.5 w-3.5" />
    </Button>
  </div>
);

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3, Search, Clock, RefreshCw, Download } from 'lucide-react';
import { STATUS_LABELS } from './types';

interface Props {
  pendingCount: number;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  sortBy: 'recent' | 'oldest';
  setSortBy: (v: 'recent' | 'oldest') => void;
  onRefresh: () => void;
  onExport: () => void;
}

export function RequestsToolbar({
  pendingCount, loading, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
  dateFrom, setDateFrom, dateTo, setDateTo, sortBy, setSortBy, onRefresh, onExport,
}: Props) {
  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Grid3X3 className="h-6 w-6 text-primary" />
            Demandes de Lotissement
          </h2>
          <p className="text-muted-foreground">Gérez les demandes de subdivision de parcelles</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Clock className="h-3 w-3" /> {pendingCount} en attente
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onExport} className="gap-1">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="lg:w-[160px]" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="lg:w-[160px]" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'recent' | 'oldest')}>
              <SelectTrigger className="w-full lg:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Plus récentes</SelectItem>
                <SelectItem value="oldest">Plus anciennes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

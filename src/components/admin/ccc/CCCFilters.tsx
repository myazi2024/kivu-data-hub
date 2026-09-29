import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CCCFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  userFilter: string;
  onUserFilterChange: (value: string) => void;
  provinceFilter?: string;
  onProvinceFilterChange?: (value: string) => void;
  provinceOptions?: string[];
  districtFilter?: string;
  onDistrictFilterChange?: (value: string) => void;
  districtOptions?: string[];
}

/** Search + province + circonscription + user-id filter row above the CCC contributions table. */
export const CCCFilters: React.FC<CCCFiltersProps> = ({
  searchQuery,
  onSearchQueryChange,
  userFilter,
  onUserFilterChange,
  provinceFilter = 'all',
  onProvinceFilterChange,
  provinceOptions = [],
  districtFilter = 'all',
  onDistrictFilterChange,
  districtOptions = [],
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_170px_190px_200px] gap-2 mb-3">
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Rechercher par parcelle, province, ville, propriétaire..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="pl-8 h-9 text-sm"
      />
    </div>
    <Select value={provinceFilter} onValueChange={(v) => onProvinceFilterChange?.(v)}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder="Toutes les provinces" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Toutes les provinces</SelectItem>
        {provinceOptions.map((p) => (
          <SelectItem key={p} value={p}>{p}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={districtFilter} onValueChange={(v) => onDistrictFilterChange?.(v)}>
      <SelectTrigger className="h-9 text-sm" aria-label="Circonscription">
        <SelectValue placeholder="Toutes les circonscriptions" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Toutes les circonscriptions</SelectItem>
        {districtOptions.map((d) => (
          <SelectItem key={d} value={d}>{d}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Input
      placeholder="Filtrer par user_id (UUID partiel)"
      value={userFilter}
      onChange={(e) => onUserFilterChange(e.target.value)}
      className="h-9 text-sm font-mono"
    />
  </div>
);

import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface CCCFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  userFilter: string;
  onUserFilterChange: (value: string) => void;
}

/** Search + user-id filter row above the CCC contributions table. */
export const CCCFilters: React.FC<CCCFiltersProps> = ({
  searchQuery,
  onSearchQueryChange,
  userFilter,
  onUserFilterChange,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2 mb-3">
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Rechercher par parcelle, province, ville, propriétaire..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="pl-8 h-9 text-sm"
      />
    </div>
    <Input
      placeholder="Filtrer par user_id (UUID partiel)"
      value={userFilter}
      onChange={(e) => onUserFilterChange(e.target.value)}
      className="h-9 text-sm font-mono"
    />
  </div>
);

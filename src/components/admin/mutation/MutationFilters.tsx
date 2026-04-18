import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { MUTATION_TYPES } from '@/components/cadastral/mutation/MutationConstants';

interface Props {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  typeFilter: string;
  onTypeChange: (v: string) => void;
}

const MutationFilters: React.FC<Props> = ({
  searchQuery, onSearchChange, statusFilter, onStatusChange, typeFilter, onTypeChange,
}) => (
  <div className="flex flex-col sm:flex-row gap-2">
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Rechercher..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-8 h-9 text-sm"
      />
    </div>
    <Select value={statusFilter} onValueChange={onStatusChange}>
      <SelectTrigger className="w-full sm:w-[150px] h-9">
        <SelectValue placeholder="Statut" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_all">Tous statuts</SelectItem>
        <SelectItem value="pending">En attente</SelectItem>
        <SelectItem value="in_review">En cours</SelectItem>
        <SelectItem value="approved">Approuvée</SelectItem>
        <SelectItem value="rejected">Rejetée</SelectItem>
        <SelectItem value="on_hold">Suspendue</SelectItem>
        <SelectItem value="cancelled">Annulée</SelectItem>
      </SelectContent>
    </Select>
    <Select value={typeFilter} onValueChange={onTypeChange}>
      <SelectTrigger className="w-full sm:w-[150px] h-9">
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_all">Tous types</SelectItem>
        {MUTATION_TYPES.map(t => (
          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default MutationFilters;

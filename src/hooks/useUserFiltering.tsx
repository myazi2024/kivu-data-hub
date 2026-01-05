import { useMemo } from 'react';
import { UserProfile } from './useUserManagement';
import { useDebounce } from './useDebounce';

interface UseUserFilteringProps {
  users: UserProfile[];
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  sortBy: 'date' | 'name' | 'email';
  sortOrder: 'asc' | 'desc';
}

export const useUserFiltering = ({
  users,
  searchQuery,
  roleFilter,
  statusFilter,
  sortBy,
  sortOrder
}: UseUserFilteringProps) => {
  // Debounce search query to avoid excessive re-renders
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const filteredAndSortedUsers = useMemo(() => {
    return users
      .filter(user => {
        const matchesSearch = !debouncedSearchQuery ||
          user.full_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          user.organization?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
        
        const matchesRole = roleFilter === '_all' || user.role === roleFilter;
        const matchesStatus = statusFilter === '_all' || 
          (statusFilter === 'active' && !user.is_blocked) ||
          (statusFilter === 'blocked' && user.is_blocked) ||
          (statusFilter === 'suspicious' && user.fraud_strikes > 0);
        
        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'date') {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (sortBy === 'name') {
          comparison = (a.full_name || '').localeCompare(b.full_name || '');
        } else if (sortBy === 'email') {
          comparison = a.email.localeCompare(b.email);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [users, debouncedSearchQuery, roleFilter, statusFilter, sortBy, sortOrder]);

  return filteredAndSortedUsers;
};

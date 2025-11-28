import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface UserSearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string;
}

export const UserSearchSelect: React.FC<UserSearchSelectProps> = ({ value, onValueChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .order('created_at', { ascending: false })
          .limit(50);

        if (debouncedSearch) {
          query = query.or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [debouncedSearch]);

  const selectedProfile = profiles.find(p => p.user_id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between"
        >
          {selectedProfile ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{selectedProfile.full_name || selectedProfile.email}</span>
            </div>
          ) : (
            "Rechercher un utilisateur..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput 
            placeholder="Rechercher par nom ou email..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>
            {loading ? 'Recherche...' : 'Aucun utilisateur trouvé'}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {profiles.map((profile) => (
              <CommandItem
                key={profile.user_id}
                value={profile.user_id}
                onSelect={(currentValue) => {
                  onValueChange(currentValue === value ? "" : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === profile.user_id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{profile.full_name || 'Sans nom'}</span>
                  <span className="text-xs text-muted-foreground">{profile.email}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

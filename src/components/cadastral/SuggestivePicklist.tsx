import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SuggestivePicklistProps {
  picklistKey: string; // e.g. 'noise_sources', 'nearby_amenities'
  label: string;
  placeholder?: string;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  disabled?: boolean;
}

interface PicklistOption {
  value: string;
  usage_count: number;
  is_default: boolean;
}

const SuggestivePicklist: React.FC<SuggestivePicklistProps> = ({
  picklistKey,
  label,
  placeholder = 'Rechercher ou ajouter...',
  selectedValues,
  onSelectionChange,
  disabled = false,
}) => {
  const [options, setOptions] = useState<PicklistOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch options from DB (defaults + user-contributed with usage_count >= 2)
  const fetchOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('suggestive_picklist_values')
        .select('value, usage_count, is_default')
        .eq('picklist_key', picklistKey)
        .or('is_default.eq.true,usage_count.gte.2')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setOptions(data || []);
    } catch (err) {
      console.error('Error fetching picklist options:', err);
    }
  }, [picklistKey]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Track usage: increment count or insert new value
  const trackUsage = async (value: string) => {
    try {
      // Try upsert
      const { data: existing } = await supabase
        .from('suggestive_picklist_values')
        .select('id, usage_count')
        .eq('picklist_key', picklistKey)
        .eq('value', value)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('suggestive_picklist_values')
          .update({ usage_count: existing.usage_count + 1 })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('suggestive_picklist_values')
          .insert({ picklist_key: picklistKey, value, usage_count: 1, is_default: false });
      }
    } catch (err) {
      console.error('Error tracking picklist usage:', err);
    }
  };

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || selectedValues.includes(trimmed)) return;
    onSelectionChange([...selectedValues, trimmed]);
    trackUsage(trimmed);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const removeValue = (value: string) => {
    onSelectionChange(selectedValues.filter(v => v !== value));
  };

  const filteredOptions = options.filter(
    opt => !selectedValues.includes(opt.value) &&
      opt.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showAddCustom = searchQuery.trim() &&
    !options.some(o => o.value.toLowerCase() === searchQuery.trim().toLowerCase()) &&
    !selectedValues.includes(searchQuery.trim());

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label className="text-xs">{label}</Label>

      {/* Selected values */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selectedValues.map((val) => (
            <Badge key={val} variant="secondary" className="text-[10px] pr-1 gap-1">
              {val}
              {!disabled && (
                <button onClick={() => removeValue(val)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      {!disabled && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder={placeholder}
              className="h-9 text-sm rounded-xl border-2 pl-8"
            />
          </div>

          {/* Dropdown */}
          {showDropdown && (searchQuery || filteredOptions.length > 0) && (
            <div className="absolute z-[1300] w-full mt-1 bg-background border rounded-xl shadow-lg max-h-[180px] overflow-y-auto">
              {filteredOptions.slice(0, 8).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => addValue(opt.value)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between"
                >
                  <span>{opt.value}</span>
                  {opt.is_default && (
                    <Badge variant="outline" className="text-[9px] h-4">suggéré</Badge>
                  )}
                </button>
              ))}
              {showAddCustom && (
                <button
                  type="button"
                  onClick={() => addValue(searchQuery.trim())}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 text-primary flex items-center gap-2 border-t"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter "{searchQuery.trim()}"
                </button>
              )}
              {filteredOptions.length === 0 && !showAddCustom && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Aucun résultat</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuggestivePicklist;

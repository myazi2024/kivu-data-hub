import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SuggestivePicklistProps {
  picklistKey: string;
  label: string;
  placeholder?: string;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  disabled?: boolean;
  /** Max number of selections allowed. Use 1 for single-select mode. */
  maxSelection?: number;
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
  maxSelection,
}) => {
  const [options, setOptions] = useState<PicklistOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSingleSelect = maxSelection === 1;

  const fetchOptions = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [picklistKey]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const trackUsage = async (value: string) => {
    try {
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
      // Refetch so newly added values appear for future searches
      fetchOptions();
    } catch (err) {
      console.error('Error tracking picklist usage:', err);
    }
  };

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || selectedValues.includes(trimmed)) return;

    if (isSingleSelect) {
      // Single-select: replace
      onSelectionChange([trimmed]);
    } else if (maxSelection && selectedValues.length >= maxSelection) {
      return; // max reached
    } else {
      onSelectionChange([...selectedValues, trimmed]);
    }

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

  const hasDropdownContent = filteredOptions.length > 0 || showAddCustom;

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

  // For single-select, show selected value in the input-like display
  const singleSelectedLabel = isSingleSelect && selectedValues.length > 0 ? selectedValues[0] : null;

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && <Label className="text-xs">{label}</Label>}

      {/* Selected values - multi-select mode badges */}
      {!isSingleSelect && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selectedValues.map((val) => (
            <Badge key={val} variant="secondary" className="text-[10px] pr-1 gap-1">
              {val}
              {!disabled && (
                <button type="button" onClick={() => removeValue(val)} className="hover:text-destructive">
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
              placeholder={singleSelectedLabel || placeholder}
              className={`h-9 text-sm rounded-xl border-2 pl-8 ${singleSelectedLabel ? 'pr-8' : ''}`}
            />
            {/* Single-select: show clear button */}
            {isSingleSelect && singleSelectedLabel && (
              <button
                type="button"
                onClick={() => { onSelectionChange([]); setSearchQuery(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {loading && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (hasDropdownContent || loading) && (
            <div className="absolute z-[9999] w-full mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-[180px] overflow-y-auto">
              {loading && filteredOptions.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Chargement...
                </div>
              )}
              {filteredOptions.slice(0, 8).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => addValue(opt.value)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
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
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 text-primary flex items-center gap-2 border-t border-border"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter "{searchQuery.trim()}"
                </button>
              )}
              {!loading && filteredOptions.length === 0 && !showAddCustom && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Aucun résultat</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disabled single-select display */}
      {disabled && isSingleSelect && singleSelectedLabel && (
        <div className="h-9 px-3 flex items-center text-sm rounded-xl border-2 bg-muted text-muted-foreground">
          {singleSelectedLabel}
        </div>
      )}
    </div>
  );
};

export default SuggestivePicklist;

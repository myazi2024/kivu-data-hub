import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchBarConfig {
  allowed_characters: {
    digits: boolean;
    letters: string[]; // e.g. ['R', 'S', 'U']
    special: string[]; // e.g. ['.', '/']
  };
  error_message: {
    title: string;
    description: string;
  };
  feedback: {
    sound_enabled: boolean;
    sound_frequency: number;
    sound_duration: number;
    shake_enabled: boolean;
    shake_duration: number;
  };
  placeholder: {
    map_default: string;
    map_compact: string;
    services_placeholder: string;
  };
  appearance: {
    accent_color: string; // CSS variable name e.g. 'primary'
    error_color: string;
    border_radius: string;
  };
  filters: {
    show_advanced_filters: boolean;
    show_search_history: boolean;
  };
}

const DEFAULT_CONFIG: SearchBarConfig = {
  allowed_characters: {
    digits: true,
    letters: ['R', 'S', 'U'],
    special: ['.', '/'],
  },
  error_message: {
    title: 'Caractère non autorisé',
    description: 'Caractères acceptés : 0-9, R, S, U, . et /.',
  },
  feedback: {
    sound_enabled: true,
    sound_frequency: 400,
    sound_duration: 0.15,
    shake_enabled: true,
    shake_duration: 500,
  },
  placeholder: {
    map_default: 'N° parcelle...',
    map_compact: 'N°...',
    services_placeholder: '',
  },
  appearance: {
    accent_color: 'primary',
    error_color: 'destructive',
    border_radius: 'xl',
  },
  filters: {
    show_advanced_filters: true,
    show_search_history: true,
  },
};

export const useSearchBarConfig = () => {
  const [config, setConfig] = useState<SearchBarConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cadastral_search_config')
        .select('config_value')
        .eq('config_key', 'search_bar_config')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Erreur chargement config barre de recherche:', error);
        return;
      }

      if (data?.config_value) {
        setConfig({ ...DEFAULT_CONFIG, ...(data.config_value as unknown as Partial<SearchBarConfig>) });
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();

    const channel = supabase
      .channel('search_bar_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cadastral_search_config',
          filter: 'config_key=eq.search_bar_config',
        },
        () => {
          fetchConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfig]);

  /** Build a regex from the config to validate input */
  const buildAllowedRegex = useCallback((): RegExp => {
    let pattern = '';
    if (config.allowed_characters.digits) pattern += '0-9';
    if (config.allowed_characters.letters.length > 0) {
      pattern += config.allowed_characters.letters.join('');
    }
    // Escape special regex chars
    config.allowed_characters.special.forEach(c => {
      pattern += '\\' + c;
    });
    return new RegExp(`[^${pattern}]`);
  }, [config]);

  /** Build display string for allowed characters */
  const getAllowedCharsDisplay = useCallback((): string => {
    const parts: string[] = [];
    if (config.allowed_characters.digits) parts.push('0-9');
    if (config.allowed_characters.letters.length > 0) {
      parts.push(config.allowed_characters.letters.join(', '));
    }
    if (config.allowed_characters.special.length > 0) {
      parts.push(config.allowed_characters.special.join(' '));
    }
    return parts.join(', ');
  }, [config]);

  return {
    config,
    loading,
    refetch: fetchConfig,
    buildAllowedRegex,
    getAllowedCharsDisplay,
    DEFAULT_CONFIG,
  };
};

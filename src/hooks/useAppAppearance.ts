import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppearanceConfig {
  logo_url?: string;
  favicon_url?: string;
  theme_colors?: Record<string, string>;
  default_theme_mode?: 'light' | 'dark';
  font_family?: string;
}

export const useAppAppearance = () => {
  const [config, setConfig] = useState<AppearanceConfig>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from('app_appearance_config')
          .select('config_key, config_value');

        if (data) {
          const mapped: AppearanceConfig = {};
          for (const row of data) {
            const key = row.config_key as keyof AppearanceConfig;
            mapped[key] = row.config_value as any;
          }
          setConfig(mapped);
          applyConfig(mapped);
        }
      } catch (e) {
        console.error('Failed to load appearance config', e);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading };
};

function applyConfig(config: AppearanceConfig) {
  const root = document.documentElement;

  // Apply theme colors
  if (config.theme_colors) {
    for (const [key, value] of Object.entries(config.theme_colors)) {
      if (value) {
        root.style.setProperty(`--${key}`, value);
      }
    }
  }

  // Apply font family
  if (config.font_family) {
    root.style.setProperty('--font-family', config.font_family);
    root.style.fontFamily = config.font_family;
  }

  // Apply favicon
  if (config.favicon_url) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (link) {
      link.href = config.favicon_url;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = config.favicon_url;
      document.head.appendChild(newLink);
    }
  }

  // Apply theme mode
  if (config.default_theme_mode) {
    root.classList.remove('light', 'dark');
    root.classList.add(config.default_theme_mode);
  }
}

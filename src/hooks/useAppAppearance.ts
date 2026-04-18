import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppearanceConfig {
  logo_url?: string;
  favicon_url?: string;
  theme_colors?: Record<string, string>;
  theme_colors_dark?: Record<string, string>;
  default_theme_mode?: 'light' | 'dark';
  font_family?: string;
  font_size_base?: string;
  border_radius?: string;
  app_name?: string;
  app_tagline?: string;
  hero_image_url?: string;
  hero_title?: string;
  hero_overlay_opacity?: number;
  hero_phrases?: string[];
  hero_secondary_link_label?: string;
  hero_secondary_link_href?: string;
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
            (mapped as any)[key] = row.config_value;
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

  // Apply light theme colors
  if (config.theme_colors) {
    for (const [key, value] of Object.entries(config.theme_colors)) {
      if (value) {
        root.style.setProperty(`--${key}`, value);
      }
    }
  }

  // Apply dark theme colors via a <style> tag
  if (config.theme_colors_dark) {
    let darkStyle = document.getElementById('app-dark-theme-overrides') as HTMLStyleElement | null;
    if (!darkStyle) {
      darkStyle = document.createElement('style');
      darkStyle.id = 'app-dark-theme-overrides';
      document.head.appendChild(darkStyle);
    }
    const rules = Object.entries(config.theme_colors_dark)
      .filter(([, v]) => v)
      .map(([k, v]) => `--${k}: ${v};`)
      .join('\n  ');
    darkStyle.textContent = `.dark {\n  ${rules}\n}`;
  }

  // Apply font family
  if (config.font_family) {
    root.style.setProperty('--font-family', config.font_family);
    root.style.fontFamily = config.font_family;
  }

  // Apply font size base
  if (config.font_size_base) {
    root.style.fontSize = `${config.font_size_base}px`;
  }

  // Apply border radius
  if (config.border_radius) {
    root.style.setProperty('--radius', `${config.border_radius}rem`);
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

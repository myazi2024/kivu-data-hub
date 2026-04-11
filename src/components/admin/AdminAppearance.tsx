import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Save, Paintbrush, Type, Image, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Nunito, sans-serif', label: 'Nunito' },
];

const COLOR_KEYS = [
  { key: 'primary', label: 'Primaire' },
  { key: 'secondary', label: 'Secondaire' },
  { key: 'accent', label: 'Accent' },
  { key: 'destructive', label: 'Destructif' },
  { key: 'muted', label: 'Atténué' },
];

const SUPABASE_URL = 'https://vqrcggcqgnkanngqhcga.supabase.co';

const AdminAppearance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [themeColors, setThemeColors] = useState<Record<string, string>>({});
  const [darkMode, setDarkMode] = useState(false);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  // Load config
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('app_appearance_config')
          .select('config_key, config_value');

        if (data) {
          for (const row of data) {
            switch (row.config_key) {
              case 'logo_url':
                setLogoUrl((row.config_value as any) || '');
                break;
              case 'favicon_url':
                setFaviconUrl((row.config_value as any) || '');
                break;
              case 'theme_colors':
                setThemeColors((row.config_value as Record<string, string>) || {});
                break;
              case 'default_theme_mode':
                setDarkMode((row.config_value as any) === 'dark');
                break;
              case 'font_family':
                setFontFamily((row.config_value as any) || 'Inter, sans-serif');
                break;
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Helpers
  const hslToHex = (hsl: string): string => {
    const match = hsl.match(/([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?/);
    if (!match) return '#000000';
    const [, h, s, l] = match.map(Number);
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0% 0%';
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const uploadFile = async (file: File, path: string, setUploading: (v: boolean) => void): Promise<string | null> => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${path}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('app-assets').upload(fileName, file, { upsert: true });
      if (error) throw error;
      return `${SUPABASE_URL}/storage/v1/object/public/app-assets/${fileName}`;
    } catch (e: any) {
      toast({ title: 'Erreur upload', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, 'logo', setUploadingLogo);
    if (url) setLogoUrl(url);
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, 'favicon', setUploadingFavicon);
    if (url) setFaviconUrl(url);
  };

  const upsertConfig = async (key: string, value: any) => {
    const { error } = await supabase
      .from('app_appearance_config')
      .upsert(
        { config_key: key, config_value: value, updated_by: user?.id },
        { onConflict: 'config_key' }
      );
    if (error) throw error;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        upsertConfig('logo_url', logoUrl),
        upsertConfig('favicon_url', faviconUrl),
        upsertConfig('theme_colors', themeColors),
        upsertConfig('default_theme_mode', darkMode ? 'dark' : 'light'),
        upsertConfig('font_family', fontFamily),
      ]);
      toast({ title: 'Configuration sauvegardée', description: 'Les changements seront appliqués au prochain chargement.' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Apparence de l'application</h2>
        <p className="text-sm text-muted-foreground">Configurez le logo, les couleurs, la typographie et le thème global.</p>
      </div>

      {/* Logo & Favicon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="h-4 w-4" /> Logo & Favicon
          </CardTitle>
          <CardDescription>Uploadez votre logo et favicon personnalisés.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Logo */}
            <div className="space-y-3">
              <Label>Logo</Label>
              {logoUrl && (
                <div className="rounded-md border p-3 bg-muted/30">
                  <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                  <label className="cursor-pointer">
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                    Choisir un fichier
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </Button>
              </div>
              <Input
                placeholder="Ou collez une URL..."
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Favicon */}
            <div className="space-y-3">
              <Label>Favicon</Label>
              {faviconUrl && (
                <div className="rounded-md border p-3 bg-muted/30">
                  <img src={faviconUrl} alt="Favicon" className="max-h-10 object-contain" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild disabled={uploadingFavicon}>
                  <label className="cursor-pointer">
                    {uploadingFavicon ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                    Choisir un fichier
                    <input type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
                  </label>
                </Button>
              </div>
              <Input
                placeholder="Ou collez une URL..."
                value={faviconUrl}
                onChange={e => setFaviconUrl(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Couleurs du thème */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Paintbrush className="h-4 w-4" /> Couleurs du thème
          </CardTitle>
          <CardDescription>Personnalisez les couleurs principales de l'interface.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COLOR_KEYS.map(({ key, label }) => {
              const currentHsl = themeColors[key] || '';
              const hexValue = currentHsl ? hslToHex(currentHsl) : '#000000';
              return (
                <div key={key} className="space-y-2">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={hexValue}
                      onChange={e => {
                        setThemeColors(prev => ({
                          ...prev,
                          [key]: hexToHsl(e.target.value),
                        }));
                      }}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={currentHsl}
                      onChange={e => setThemeColors(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="H S% L%"
                      className="text-xs flex-1"
                    />
                  </div>
                  <div
                    className="h-6 rounded"
                    style={{ backgroundColor: currentHsl ? `hsl(${currentHsl})` : 'transparent' }}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Typographie & Mode */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Type className="h-4 w-4" /> Typographie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="text-xs mb-2 block">Police principale</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    <span style={{ fontFamily: f.value }}>{f.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2" style={{ fontFamily }}>
              Aperçu : Ceci est un exemple de texte avec la police sélectionnée.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Mode par défaut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{darkMode ? 'Mode sombre' : 'Mode clair'}</p>
                <p className="text-xs text-muted-foreground">Thème par défaut au chargement</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder la configuration
        </Button>
      </div>
    </div>
  );
};

export default AdminAppearance;

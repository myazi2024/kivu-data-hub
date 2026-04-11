import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Save, Paintbrush, Type, Image, Moon, Sun, RotateCcw, Trash2, Fingerprint, RectangleHorizontal, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Nunito, sans-serif', label: 'Nunito' },
];

const COLOR_GROUPS = [
  {
    title: 'Base',
    colors: [
      { key: 'background', label: 'Arrière-plan' },
      { key: 'foreground', label: 'Texte principal' },
    ],
  },
  {
    title: 'Sémantique',
    colors: [
      { key: 'primary', label: 'Primaire' },
      { key: 'primary-foreground', label: 'Texte primaire' },
      { key: 'secondary', label: 'Secondaire' },
      { key: 'secondary-foreground', label: 'Texte secondaire' },
      { key: 'accent', label: 'Accent' },
      { key: 'accent-foreground', label: 'Texte accent' },
      { key: 'destructive', label: 'Destructif' },
      { key: 'destructive-foreground', label: 'Texte destructif' },
      { key: 'muted', label: 'Atténué' },
      { key: 'muted-foreground', label: 'Texte atténué' },
    ],
  },
  {
    title: 'Structure',
    colors: [
      { key: 'card', label: 'Carte' },
      { key: 'card-foreground', label: 'Texte carte' },
      { key: 'popover', label: 'Popover' },
      { key: 'popover-foreground', label: 'Texte popover' },
      { key: 'border', label: 'Bordure' },
      { key: 'input', label: 'Input' },
      { key: 'ring', label: 'Ring (focus)' },
    ],
  },
];

const DEFAULT_LIGHT_COLORS: Record<string, string> = {
  'background': '0 0% 100%',
  'foreground': '0 0% 13%',
  'card': '0 0% 100%',
  'card-foreground': '0 0% 13%',
  'popover': '0 0% 100%',
  'popover-foreground': '0 0% 13%',
  'primary': '348 100% 44%',
  'primary-foreground': '0 0% 100%',
  'secondary': '0 0% 96%',
  'secondary-foreground': '0 0% 13%',
  'muted': '0 0% 96%',
  'muted-foreground': '0 0% 45%',
  'accent': '348 100% 44%',
  'accent-foreground': '0 0% 100%',
  'destructive': '0 84% 60%',
  'destructive-foreground': '0 0% 100%',
  'border': '0 0% 91%',
  'input': '0 0% 96%',
  'ring': '348 100% 44%',
};

const DEFAULT_DARK_COLORS: Record<string, string> = {
  'background': '0 0% 7%',
  'foreground': '0 0% 95%',
  'card': '0 0% 10%',
  'card-foreground': '0 0% 95%',
  'popover': '0 0% 10%',
  'popover-foreground': '0 0% 95%',
  'primary': '348 100% 54%',
  'primary-foreground': '0 0% 100%',
  'secondary': '0 0% 15%',
  'secondary-foreground': '0 0% 90%',
  'muted': '0 0% 15%',
  'muted-foreground': '0 0% 65%',
  'accent': '348 100% 54%',
  'accent-foreground': '0 0% 100%',
  'destructive': '0 84% 60%',
  'destructive-foreground': '0 0% 100%',
  'border': '0 0% 20%',
  'input': '0 0% 15%',
  'ring': '348 100% 54%',
};

const SUPABASE_URL = 'https://vqrcggcqgnkanngqhcga.supabase.co';

// --- Helpers ---
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

// --- Color Picker Row ---
const ColorRow = ({ colorKey, label, value, onChange }: { colorKey: string; label: string; value: string; onChange: (key: string, val: string) => void }) => {
  const hexValue = value ? hslToHex(value) : '#000000';
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={hexValue}
        onChange={e => onChange(colorKey, hexToHsl(e.target.value))}
        className="h-8 w-10 cursor-pointer rounded border border-border flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground font-mono truncate">{value || '—'}</p>
      </div>
    </div>
  );
};

// --- Live Preview ---
const LivePreview = ({ colors, fontFamily, borderRadius, fontSizeBase }: {
  colors: Record<string, string>;
  fontFamily: string;
  borderRadius: string;
  fontSizeBase: string;
}) => {
  const style = (key: string) => colors[key] ? `hsl(${colors[key]})` : undefined;

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        backgroundColor: style('background'),
        color: style('foreground'),
        fontFamily,
        fontSize: fontSizeBase,
        borderRadius,
        borderColor: style('border'),
      }}
    >
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: style('muted-foreground') }}>Aperçu en direct</p>
      <div className="flex gap-2 flex-wrap">
        <button
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={{ backgroundColor: style('primary'), color: style('primary-foreground'), borderRadius }}
        >
          Bouton primaire
        </button>
        <button
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={{ backgroundColor: style('secondary'), color: style('secondary-foreground'), borderRadius }}
        >
          Secondaire
        </button>
        <button
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={{ backgroundColor: style('destructive'), color: style('destructive-foreground'), borderRadius }}
        >
          Destructif
        </button>
      </div>
      <div
        className="rounded border p-3 space-y-1"
        style={{ backgroundColor: style('card'), color: style('card-foreground'), borderColor: style('border'), borderRadius }}
      >
        <p className="text-sm font-semibold">Exemple de carte</p>
        <p className="text-xs" style={{ color: style('muted-foreground') }}>Texte descriptif atténué dans une carte.</p>
        <div
          className="rounded px-2 py-1 text-xs inline-block mt-1"
          style={{ backgroundColor: style('accent'), color: style('accent-foreground'), borderRadius }}
        >
          Badge accent
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Champ de saisie..."
          readOnly
          className="rounded border px-2 py-1 text-xs flex-1"
          style={{ backgroundColor: style('input'), borderColor: style('border'), color: style('foreground'), borderRadius }}
        />
      </div>
    </div>
  );
};

// --- Main Component ---
const AdminAppearance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Identity
  const [appName, setAppName] = useState('BIC');
  const [appTagline, setAppTagline] = useState("Bureau d'Informations Cadastrales");
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  // Colors
  const [lightColors, setLightColors] = useState<Record<string, string>>({ ...DEFAULT_LIGHT_COLORS });
  const [darkColors, setDarkColors] = useState<Record<string, string>>({ ...DEFAULT_DARK_COLORS });
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  // Typography & Shape
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontSizeBase, setFontSizeBase] = useState('16');
  const [borderRadius, setBorderRadius] = useState('0.375');

  // Theme mode
  const [darkMode, setDarkMode] = useState(false);

  const currentColors = colorMode === 'light' ? lightColors : darkColors;
  const setCurrentColors = colorMode === 'light' ? setLightColors : setDarkColors;

  // Load config
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('app_appearance_config')
          .select('config_key, config_value');

        if (data) {
          for (const row of data) {
            const val = row.config_value as any;
            switch (row.config_key) {
              case 'app_name': setAppName(val || 'BIC'); break;
              case 'app_tagline': setAppTagline(val || "Bureau d'Informations Cadastrales"); break;
              case 'logo_url': setLogoUrl(val || ''); break;
              case 'favicon_url': setFaviconUrl(val || ''); break;
              case 'theme_colors':
                if (val && typeof val === 'object') setLightColors(prev => ({ ...prev, ...val }));
                break;
              case 'theme_colors_dark':
                if (val && typeof val === 'object') setDarkColors(prev => ({ ...prev, ...val }));
                break;
              case 'default_theme_mode': setDarkMode(val === 'dark'); break;
              case 'font_family': setFontFamily(val || 'Inter, sans-serif'); break;
              case 'font_size_base': setFontSizeBase(val || '16'); break;
              case 'border_radius': setBorderRadius(val || '0.375'); break;
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

  // Upload
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
        upsertConfig('app_name', appName),
        upsertConfig('app_tagline', appTagline),
        upsertConfig('logo_url', logoUrl),
        upsertConfig('favicon_url', faviconUrl),
        upsertConfig('theme_colors', lightColors),
        upsertConfig('theme_colors_dark', darkColors),
        upsertConfig('default_theme_mode', darkMode ? 'dark' : 'light'),
        upsertConfig('font_family', fontFamily),
        upsertConfig('font_size_base', fontSizeBase),
        upsertConfig('border_radius', borderRadius),
      ]);
      toast({ title: 'Configuration sauvegardée', description: 'Les changements seront appliqués au prochain chargement.' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLightColors({ ...DEFAULT_LIGHT_COLORS });
    setDarkColors({ ...DEFAULT_DARK_COLORS });
    setFontFamily('Inter, sans-serif');
    setFontSizeBase('16');
    setBorderRadius('0.375');
    setDarkMode(false);
    setAppName('BIC');
    setAppTagline("Bureau d'Informations Cadastrales");
    toast({ title: 'Valeurs réinitialisées', description: 'Cliquez sur Sauvegarder pour appliquer.' });
  };

  const handleColorChange = (key: string, value: string) => {
    setCurrentColors(prev => ({ ...prev, [key]: value }));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Apparence de l'application</h2>
          <p className="text-sm text-muted-foreground">Identité, couleurs, typographie, forme et thème global.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Left: Config panels */}
        <div className="space-y-6">
          {/* Section 1: Identité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="h-4 w-4" /> Identité
              </CardTitle>
              <CardDescription>Nom, slogan, logo et favicon de l'application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Nom de l'application</Label>
                  <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="BIC" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Slogan / Sous-titre</Label>
                  <Input value={appTagline} onChange={e => setAppTagline(e.target.value)} placeholder="Bureau d'Informations Cadastrales" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Logo */}
                <div className="space-y-2">
                  <Label className="text-xs">Logo</Label>
                  {logoUrl && (
                    <div className="rounded-md border p-2 bg-muted/30 flex items-center justify-between">
                      <img src={logoUrl} alt="Logo" className="max-h-12 object-contain" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLogoUrl('')}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                      <label className="cursor-pointer">
                        {uploadingLogo ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                        Choisir
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </Button>
                  </div>
                  <Input placeholder="Ou collez une URL..." value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="text-xs" />
                </div>
                {/* Favicon */}
                <div className="space-y-2">
                  <Label className="text-xs">Favicon</Label>
                  {faviconUrl && (
                    <div className="rounded-md border p-2 bg-muted/30 flex items-center justify-between">
                      <img src={faviconUrl} alt="Favicon" className="max-h-8 object-contain" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFaviconUrl('')}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild disabled={uploadingFavicon}>
                      <label className="cursor-pointer">
                        {uploadingFavicon ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                        Choisir
                        <input type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
                      </label>
                    </Button>
                  </div>
                  <Input placeholder="Ou collez une URL..." value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} className="text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Couleurs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paintbrush className="h-4 w-4" /> Couleurs du thème
              </CardTitle>
              <CardDescription>Éditez les couleurs pour les modes clair et sombre séparément.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={colorMode} onValueChange={v => setColorMode(v as 'light' | 'dark')} className="space-y-4">
                <TabsList className="h-9">
                  <TabsTrigger value="light" className="text-xs gap-1"><Sun className="h-3 w-3" /> Mode clair</TabsTrigger>
                  <TabsTrigger value="dark" className="text-xs gap-1"><Moon className="h-3 w-3" /> Mode sombre</TabsTrigger>
                </TabsList>
                <TabsContent value={colorMode}>
                  <div className="space-y-5">
                    {COLOR_GROUPS.map(group => (
                      <div key={group.title}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.title}</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {group.colors.map(c => (
                            <ColorRow
                              key={c.key}
                              colorKey={c.key}
                              label={c.label}
                              value={currentColors[c.key] || ''}
                              onChange={handleColorChange}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Section 3: Typographie, Forme, Mode */}
          <div className="grid gap-6 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Type className="h-4 w-4" /> Typographie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">Police</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="h-9 text-xs">
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
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Taille de base : {fontSizeBase}px</Label>
                  <Slider
                    value={[Number(fontSizeBase)]}
                    onValueChange={([v]) => setFontSizeBase(String(v))}
                    min={14}
                    max={18}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <RectangleHorizontal className="h-4 w-4" /> Forme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label className="text-xs mb-1 block">Border radius : {borderRadius}rem</Label>
                <Slider
                  value={[Number(borderRadius) * 100]}
                  onValueChange={([v]) => setBorderRadius((v / 100).toFixed(3))}
                  min={0}
                  max={100}
                  step={5}
                />
                <div className="flex gap-2 mt-2">
                  <div className="h-8 w-8 bg-primary" style={{ borderRadius: `${borderRadius}rem` }} />
                  <div className="h-8 w-16 bg-secondary border border-border" style={{ borderRadius: `${borderRadius}rem` }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{darkMode ? 'Sombre' : 'Clair'}</p>
                    <p className="text-xs text-muted-foreground">Par défaut</p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-4">
          <div className="sticky top-20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Eye className="h-3 w-3" /> Aperçu en direct
            </p>
            <LivePreview
              colors={currentColors}
              fontFamily={fontFamily}
              borderRadius={`${borderRadius}rem`}
              fontSizeBase={`${fontSizeBase}px`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAppearance;

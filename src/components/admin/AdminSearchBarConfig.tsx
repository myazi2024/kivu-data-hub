import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { upsertSearchConfig, logAuditAction } from '@/utils/supabaseConfigUtils';
import { SearchBarConfig, useSearchBarConfig } from '@/hooks/useSearchBarConfig';
import {
  Loader2, Save, Search, Volume2, VolumeX, Type, Palette, SlidersHorizontal, AlertCircle, RotateCcw, Keyboard, Eye
} from 'lucide-react';

const AVAILABLE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const AVAILABLE_SPECIAL = ['.', '/', '-', '_', ' '];

const AdminSearchBarConfig = () => {
  const { config: liveConfig, loading, refetch, DEFAULT_CONFIG } = useSearchBarConfig();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [localConfig, setLocalConfig] = useState<SearchBarConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!loading) {
      setLocalConfig(liveConfig);
      setHasChanges(false);
    }
  }, [liveConfig, loading]);

  const updateConfig = (updater: (prev: SearchBarConfig) => SearchBarConfig) => {
    setLocalConfig(prev => {
      const next = updater(prev);
      setHasChanges(true);
      return next;
    });
  };

  const toggleLetter = (letter: string) => {
    updateConfig(prev => ({
      ...prev,
      allowed_characters: {
        ...prev.allowed_characters,
        letters: prev.allowed_characters.letters.includes(letter)
          ? prev.allowed_characters.letters.filter(l => l !== letter)
          : [...prev.allowed_characters.letters, letter].sort(),
      },
    }));
  };

  const toggleSpecial = (char: string) => {
    updateConfig(prev => ({
      ...prev,
      allowed_characters: {
        ...prev.allowed_characters,
        special: prev.allowed_characters.special.includes(char)
          ? prev.allowed_characters.special.filter(c => c !== char)
          : [...prev.allowed_characters.special, char],
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await upsertSearchConfig('search_bar_config', localConfig as unknown as Record<string, unknown>);
      await logAuditAction('SEARCH_BAR_CONFIG_UPDATED', 'cadastral_search_config');
      toast({ title: 'Succès', description: 'Configuration de la barre de recherche mise à jour' });
      setHasChanges(false);
      await refetch();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  };

  // Build preview of allowed chars
  const previewAllowed = () => {
    const parts: string[] = [];
    if (localConfig.allowed_characters.digits) parts.push('0-9');
    if (localConfig.allowed_characters.letters.length) parts.push(localConfig.allowed_characters.letters.join(', '));
    if (localConfig.allowed_characters.special.length) parts.push(localConfig.allowed_characters.special.map(c => `"${c}"`).join(', '));
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuration de la barre de recherche</h2>
          <p className="text-muted-foreground text-sm">
            Personnalisez le comportement et l'apparence de la barre de recherche cadastrale
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 flex items-center gap-2 text-sm text-accent-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Modifications non enregistrées
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Caractères autorisés */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Keyboard className="h-5 w-5 text-primary" />
              Caractères autorisés
            </CardTitle>
            <CardDescription>Définissez quels caractères peuvent être saisis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Chiffres (0-9)</Label>
              <Switch
                checked={localConfig.allowed_characters.digits}
                onCheckedChange={(checked) =>
                  updateConfig(prev => ({
                    ...prev,
                    allowed_characters: { ...prev.allowed_characters, digits: checked },
                  }))
                }
              />
            </div>

            <Separator />

            <div>
              <Label className="mb-2 block">Lettres autorisées</Label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_LETTERS.map(letter => (
                  <button
                    key={letter}
                    onClick={() => toggleLetter(letter)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                      localConfig.allowed_characters.letters.includes(letter)
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label className="mb-2 block">Caractères spéciaux</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SPECIAL.map(char => (
                  <button
                    key={char}
                    onClick={() => toggleSpecial(char)}
                    className={`h-8 px-3 rounded-lg text-sm font-mono font-bold transition-all ${
                      localConfig.allowed_characters.special.includes(char)
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {char === ' ' ? '⎵' : char}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Aperçu :</p>
              <p className="text-sm font-medium">{previewAllowed() || 'Aucun caractère autorisé'}</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Messages d'erreur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Messages d'erreur
            </CardTitle>
            <CardDescription>Personnalisez les messages affichés lors d'une saisie invalide</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Titre de l'erreur</Label>
              <Input
                value={localConfig.error_message.title}
                onChange={(e) =>
                  updateConfig(prev => ({
                    ...prev,
                    error_message: { ...prev.error_message, title: e.target.value },
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description de l'erreur</Label>
              <Input
                value={localConfig.error_message.description}
                onChange={(e) =>
                  updateConfig(prev => ({
                    ...prev,
                    error_message: { ...prev.error_message, description: e.target.value },
                  }))
                }
                className="mt-1"
              />
            </div>

            {/* Preview */}
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Aperçu du message</Label>
              <div className="bg-destructive text-destructive-foreground text-xs p-3 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-0.5">{localConfig.error_message.title}</p>
                    <p className="opacity-90 text-[11px]">{localConfig.error_message.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Son & Animation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {localConfig.feedback.sound_enabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              Son & Animation
            </CardTitle>
            <CardDescription>Retour haptique et sonore lors d'une erreur de saisie</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Son d'erreur activé</Label>
              <Switch
                checked={localConfig.feedback.sound_enabled}
                onCheckedChange={(checked) =>
                  updateConfig(prev => ({
                    ...prev,
                    feedback: { ...prev.feedback, sound_enabled: checked },
                  }))
                }
              />
            </div>

            {localConfig.feedback.sound_enabled && (
              <>
                <div>
                  <Label className="text-xs">Fréquence du son (Hz)</Label>
                  <Input
                    type="number"
                    min={100}
                    max={1000}
                    value={localConfig.feedback.sound_frequency}
                    onChange={(e) =>
                      updateConfig(prev => ({
                        ...prev,
                        feedback: { ...prev.feedback, sound_frequency: Number(e.target.value) },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Durée du son (secondes)</Label>
                  <Input
                    type="number"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={localConfig.feedback.sound_duration}
                    onChange={(e) =>
                      updateConfig(prev => ({
                        ...prev,
                        feedback: { ...prev.feedback, sound_duration: Number(e.target.value) },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <Label>Animation shake activée</Label>
              <Switch
                checked={localConfig.feedback.shake_enabled}
                onCheckedChange={(checked) =>
                  updateConfig(prev => ({
                    ...prev,
                    feedback: { ...prev.feedback, shake_enabled: checked },
                  }))
                }
              />
            </div>

            {localConfig.feedback.shake_enabled && (
              <div>
                <Label className="text-xs">Durée de l'animation (ms)</Label>
                <Input
                  type="number"
                  min={100}
                  max={2000}
                  step={100}
                  value={localConfig.feedback.shake_duration}
                  onChange={(e) =>
                    updateConfig(prev => ({
                      ...prev,
                      feedback: { ...prev.feedback, shake_duration: Number(e.target.value) },
                    }))
                  }
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Texte placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Type className="h-5 w-5 text-primary" />
              Texte indicatif (Placeholder)
            </CardTitle>
            <CardDescription>Texte affiché dans la barre de recherche vide</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Carte cadastrale (normal)</Label>
              <Input
                value={localConfig.placeholder.map_default}
                onChange={(e) =>
                  updateConfig(prev => ({
                    ...prev,
                    placeholder: { ...prev.placeholder, map_default: e.target.value },
                  }))
                }
                className="mt-1"
                placeholder="N° parcelle..."
              />
            </div>
            <div>
              <Label>Carte cadastrale (compact / mobile)</Label>
              <Input
                value={localConfig.placeholder.map_compact}
                onChange={(e) =>
                  updateConfig(prev => ({
                    ...prev,
                    placeholder: { ...prev.placeholder, map_compact: e.target.value },
                  }))
                }
                className="mt-1"
                placeholder="N°..."
              />
            </div>
            <div>
              <Label>Page Services</Label>
              <Input
                value={localConfig.placeholder.services_placeholder}
                onChange={(e) =>
                  updateConfig(prev => ({
                    ...prev,
                    placeholder: { ...prev.placeholder, services_placeholder: e.target.value },
                  }))
                }
                className="mt-1"
                placeholder="Rechercher une parcelle..."
              />
            </div>
          </CardContent>
        </Card>

        {/* 5. Apparence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5 text-primary" />
              Apparence
            </CardTitle>
            <CardDescription>Couleurs et style de la barre de recherche</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Couleur d'accent</Label>
              <Select
                value={localConfig.appearance.accent_color}
                onValueChange={(v) =>
                  updateConfig(prev => ({ ...prev, appearance: { ...prev.appearance, accent_color: v } }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary (défaut)</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="accent">Accent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Couleur d'erreur</Label>
              <Select
                value={localConfig.appearance.error_color}
                onValueChange={(v) =>
                  updateConfig(prev => ({ ...prev, appearance: { ...prev.appearance, error_color: v } }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="destructive">Destructive (défaut)</SelectItem>
                  <SelectItem value="accent">Accent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arrondi des bordures</Label>
              <Select
                value={localConfig.appearance.border_radius}
                onValueChange={(v) =>
                  updateConfig(prev => ({ ...prev, appearance: { ...prev.appearance, border_radius: v } }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">Extra large (défaut)</SelectItem>
                  <SelectItem value="2xl">Très arrondi</SelectItem>
                  <SelectItem value="full">Pill</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 6. Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Filtres & Historique
            </CardTitle>
            <CardDescription>Options de filtres avancés et historique de recherche</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Filtres avancés</Label>
                <p className="text-xs text-muted-foreground">Afficher le bouton de recherche avancée</p>
              </div>
              <Switch
                checked={localConfig.filters.show_advanced_filters}
                onCheckedChange={(checked) =>
                  updateConfig(prev => ({
                    ...prev,
                    filters: { ...prev.filters, show_advanced_filters: checked },
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Historique de recherche</Label>
                <p className="text-xs text-muted-foreground">Afficher l'historique des recherches récentes</p>
              </div>
              <Switch
                checked={localConfig.filters.show_search_history}
                onCheckedChange={(checked) =>
                  updateConfig(prev => ({
                    ...prev,
                    filters: { ...prev.filters, show_search_history: checked },
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom save bar */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer les modifications
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminSearchBarConfig;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Palette, Plus, Edit2, Trash2, Loader2, RefreshCw,
  Eye, EyeOff, ArrowUp, ArrowDown
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface ArticleTheme {
  id: string;
  name: string;
  short_name: string;
  description: string | null;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export const AdminArticleThemes: React.FC = () => {
  const [themes, setThemes] = useState<ArticleTheme[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ArticleTheme | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [themeName, setThemeName] = useState('');
  const [themeShortName, setThemeShortName] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [themeIcon, setThemeIcon] = useState('FileText');
  const [themeActive, setThemeActive] = useState(true);

  const iconOptions = ['FileText', 'Book', 'Newspaper', 'Globe', 'Building2', 'Map', 'Scale', 'Landmark', 'Users', 'Briefcase', 'Gavel', 'Home', 'TreePine', 'Mountain', 'Layers'];

  const fetchThemes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('article_themes')
        .select('*')
        .order('display_order');

      if (error) throw error;
      const list = (data || []) as ArticleTheme[];
      setThemes(list);

      // Compter les articles liés (non supprimés)
      const ids = list.map(t => t.id);
      if (ids.length) {
        const { data: arts } = await supabase
          .from('articles')
          .select('theme_id')
          .in('theme_id', ids)
          .is('deleted_at', null);
        const map: Record<string, number> = {};
        (arts || []).forEach((a: any) => { map[a.theme_id] = (map[a.theme_id] || 0) + 1; });
        setCounts(map);
      } else {
        setCounts({});
      }
    } catch (error) {
      console.error('Error fetching themes:', error);
      toast.error('Erreur lors du chargement des thèmes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const handleDelete = async (theme: ArticleTheme) => {
    const linked = counts[theme.id] || 0;
    if (linked > 0) {
      toast.error(`Impossible : ${linked} article(s) lié(s) à ce thème. Réaffectez-les ou désactivez le thème.`);
      return;
    }
    if (!confirm(`Supprimer définitivement le thème "${theme.name}" ?`)) return;
    setDeleting(theme.id);
    try {
      const { error } = await supabase.from('article_themes').delete().eq('id', theme.id);
      if (error) throw error;
      toast.success('Thème supprimé');
      fetchThemes();
    } catch (e: any) {
      toast.error(e.message || 'Erreur suppression');
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setThemeName('');
    setThemeShortName('');
    setThemeDescription('');
    setThemeIcon('FileText');
    setThemeActive(true);
    setEditingTheme(null);
  };

  const openEditDialog = (theme: ArticleTheme) => {
    setEditingTheme(theme);
    setThemeName(theme.name);
    setThemeShortName(theme.short_name);
    setThemeDescription(theme.description || '');
    setThemeIcon(theme.icon_name);
    setThemeActive(theme.is_active);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!themeName || !themeShortName) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      if (editingTheme) {
        const { error } = await supabase
          .from('article_themes')
          .update({
            name: themeName,
            short_name: themeShortName,
            description: themeDescription || null,
            icon_name: themeIcon,
            is_active: themeActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTheme.id);

        if (error) throw error;
        toast.success('Thème modifié avec succès');
      } else {
        const { error } = await supabase
          .from('article_themes')
          .insert({
            name: themeName,
            short_name: themeShortName,
            description: themeDescription || null,
            icon_name: themeIcon,
            is_active: themeActive,
            display_order: themes.length + 1
          });

        if (error) throw error;
        toast.success('Thème ajouté avec succès');
      }

      setShowDialog(false);
      resetForm();
      fetchThemes();
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (theme: ArticleTheme) => {
    try {
      const { error } = await supabase
        .from('article_themes')
        .update({ is_active: !theme.is_active, updated_at: new Date().toISOString() })
        .eq('id', theme.id);

      if (error) throw error;
      toast.success(theme.is_active ? 'Thème désactivé' : 'Thème activé');
      fetchThemes();
    } catch (error) {
      console.error('Error toggling theme:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleReorder = async (theme: ArticleTheme, direction: 'up' | 'down') => {
    const currentIndex = themes.findIndex(t => t.id === theme.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= themes.length) return;

    const otherTheme = themes[newIndex];

    try {
      const { error } = await supabase.rpc('swap_theme_order', {
        _theme_a: theme.id,
        _theme_b: otherTheme.id,
      });
      if (error) throw error;
      fetchThemes();
    } catch (error) {
      console.error('Error reordering themes:', error);
      toast.error('Erreur lors du réordonnancement');
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.FileText;
    return <Icon className="h-4 w-4" />;
  };

  const activeThemes = themes.filter(t => t.is_active);

  return (
    <div className="space-y-4 max-w-[360px] mx-auto md:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm md:text-lg font-bold flex items-center gap-2">
            <Palette className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Thèmes d'articles
          </h2>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            Gérez les catégories d'articles
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={fetchThemes} className="h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg md:text-xl font-bold">{themes.length}</p>
            <p className="text-[10px] text-muted-foreground">Total thèmes</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-lg md:text-xl font-bold text-green-600">{activeThemes.length}</p>
            <p className="text-[10px] text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Themes List */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-3 md:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Liste des thèmes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : themes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Aucun thème configuré</p>
            </div>
          ) : (
            <div className="space-y-2">
              {themes.map((theme, index) => (
                <div
                  key={theme.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    theme.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {getIconComponent(theme.icon_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{theme.name}</p>
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {theme.short_name}
                        </Badge>
                      </div>
                      {theme.description && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {theme.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleReorder(theme, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleReorder(theme, 'down')}
                      disabled={index === themes.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleToggleActive(theme)}
                    >
                      {theme.is_active ? (
                        <Eye className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditDialog(theme)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {editingTheme ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingTheme ? 'Modifier le thème' : 'Nouveau thème'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nom du thème *</Label>
              <Input
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Ex: Urbanisme"
                className="h-9 text-sm rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs">Nom court *</Label>
              <Input
                value={themeShortName}
                onChange={(e) => setThemeShortName(e.target.value)}
                placeholder="Ex: URB"
                className="h-9 text-sm rounded-xl"
                maxLength={10}
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={themeDescription}
                onChange={(e) => setThemeDescription(e.target.value)}
                placeholder="Description optionnelle..."
                className="text-sm rounded-xl min-h-[60px]"
              />
            </div>
            <div>
              <Label className="text-xs">Icône</Label>
              <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setThemeIcon(icon)}
                    className={`h-9 w-9 rounded-lg border flex items-center justify-center ${
                      themeIcon === icon ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {getIconComponent(icon)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Actif</Label>
              <Switch checked={themeActive} onCheckedChange={setThemeActive} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)} className="text-xs">
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {editingTheme ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminArticleThemes;

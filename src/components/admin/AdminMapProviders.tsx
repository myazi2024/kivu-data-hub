import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { getSupabaseUrl } from '@/integrations/supabase/untyped';
import { toast } from 'sonner';
import { logAuditAction } from '@/utils/supabaseConfigUtils';
import { GoogleProviderWarning } from './map/GoogleProviderWarning';
import {
  Map as MapIcon, Plus, Edit, Trash2, Star, StarOff, RefreshCw,
  Eye, EyeOff, Key, Globe, Info, CheckCircle2, ArrowUpDown, Loader2, ShieldCheck
} from 'lucide-react';

interface MapProvider {
  id: string;
  provider_key: string;
  provider_name: string;
  description: string | null;
  tile_url_template: string;
  attribution: string;
  max_zoom: number;
  min_zoom: number;
  requires_api_key: boolean;
  api_key_env_name: string | null;
  api_key_placeholder: string | null;
  extra_config: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const EMPTY_PROVIDER: Partial<MapProvider> = {
  provider_key: '',
  provider_name: '',
  description: '',
  tile_url_template: '',
  attribution: '',
  max_zoom: 19,
  min_zoom: 1,
  requires_api_key: false,
  api_key_env_name: '',
  api_key_placeholder: '',
  extra_config: {},
  is_active: true,
  is_default: false,
  display_order: 0,
};

const AdminMapProviders: React.FC = () => {
  const [providers, setProviders] = useState<MapProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Partial<MapProvider>>(EMPTY_PROVIDER);
  const [isNew, setIsNew] = useState(false);
  const [previewProvider, setPreviewProvider] = useState<MapProvider | null>(null);
  const mapPreviewRef = React.useRef<HTMLDivElement>(null);
  const mapPreviewInstanceRef = React.useRef<any>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('map_providers')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setProviders((data || []) as unknown as MapProvider[]);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des fournisseurs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    const nextOrder = providers.length > 0 ? Math.max(...providers.map(p => p.display_order)) + 1 : 1;
    setEditingProvider({ ...EMPTY_PROVIDER, display_order: nextOrder });
    setIsNew(true);
    setEditDialogOpen(true);
  };

  const handleOpenEdit = (provider: MapProvider) => {
    setEditingProvider({ ...provider });
    setIsNew(false);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProvider.provider_key || !editingProvider.provider_name || !editingProvider.tile_url_template) {
      toast.error('Clé, nom et URL de tuile sont obligatoires');
      return;
    }

    // P1.7 — Test de validité de la tuile (HEAD sur z=2,x=1,y=1)
    if (!editingProvider.requires_api_key) {
      const sample = editingProvider
        .tile_url_template!
        .replace('{z}', '2').replace('{x}', '1').replace('{y}', '1')
        .replace(/\{s\}/, (editingProvider.extra_config?.subdomains as string)?.[0] || 'a');
      try {
        const res = await fetch(sample, { method: 'GET', mode: 'no-cors' });
        // En no-cors, on ne peut pas lire le statut, mais une erreur réseau lèvera
        const status = (res as Response).status;
        if (status && status >= 400) {
          const proceed = window.confirm(`La tuile de test a renvoyé HTTP ${status}. Continuer quand même ?`);
          if (!proceed) return;
        }
      } catch (err) {
        const proceed = window.confirm("Impossible de joindre l'URL de tuile (test). Continuer quand même ?");
        if (!proceed) return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        provider_key: editingProvider.provider_key,
        provider_name: editingProvider.provider_name,
        description: editingProvider.description || null,
        tile_url_template: editingProvider.tile_url_template,
        attribution: editingProvider.attribution || '',
        max_zoom: editingProvider.max_zoom || 19,
        min_zoom: editingProvider.min_zoom || 1,
        requires_api_key: editingProvider.requires_api_key || false,
        api_key_env_name: editingProvider.requires_api_key ? editingProvider.api_key_env_name || null : null,
        api_key_placeholder: editingProvider.requires_api_key ? editingProvider.api_key_placeholder || null : null,
        extra_config: editingProvider.extra_config || {},
        is_active: editingProvider.is_active ?? true,
        is_default: editingProvider.is_default || false,
        display_order: editingProvider.display_order || 0,
      };

      if (isNew) {
        const { error } = await supabase.from('map_providers').insert(payload as any);
        if (error) throw error;
        toast.success(`Fournisseur "${payload.provider_name}" ajouté`);
        await logAuditAction('MAP_PROVIDER_CREATE', 'map_providers', undefined, undefined, payload as any);
      } else {
        const { error } = await supabase
          .from('map_providers')
          .update(payload as any)
          .eq('id', editingProvider.id!);
        if (error) throw error;
        toast.success(`Fournisseur "${payload.provider_name}" mis à jour`);
        await logAuditAction('MAP_PROVIDER_UPDATE', 'map_providers', editingProvider.id, undefined, payload as any);
      }

      setEditDialogOpen(false);
      fetchProviders();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (provider: MapProvider) => {
    try {
      const { error } = await supabase
        .from('map_providers')
        .update({ is_default: true } as any)
        .eq('id', provider.id);
      if (error) throw error;
      toast.success(`"${provider.provider_name}" est maintenant le fournisseur par défaut`);
      await logAuditAction('MAP_PROVIDER_SET_DEFAULT', 'map_providers', provider.id);
      fetchProviders();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleToggleActive = async (provider: MapProvider) => {
    if (provider.is_default && provider.is_active) {
      toast.error('Impossible de désactiver le fournisseur par défaut. Changez d\'abord de fournisseur par défaut.');
      return;
    }
    try {
      const { error } = await supabase
        .from('map_providers')
        .update({ is_active: !provider.is_active } as any)
        .eq('id', provider.id);
      if (error) throw error;
      toast.success(`Fournisseur ${provider.is_active ? 'désactivé' : 'activé'}`);
      await logAuditAction('MAP_PROVIDER_TOGGLE', 'map_providers', provider.id, { is_active: provider.is_active } as any, { is_active: !provider.is_active } as any);
      fetchProviders();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleDelete = async (provider: MapProvider) => {
    if (provider.is_default) {
      toast.error('Impossible de supprimer le fournisseur par défaut.');
      return;
    }
    try {
      const { error } = await supabase.from('map_providers').delete().eq('id', provider.id);
      if (error) throw error;
      toast.success(`Fournisseur "${provider.provider_name}" supprimé`);
      await logAuditAction('MAP_PROVIDER_DELETE', 'map_providers', provider.id, { provider_name: provider.provider_name } as any);
      fetchProviders();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handlePreview = async (provider: MapProvider) => {
    setPreviewProvider(provider);
    setPreviewDialogOpen(true);
  };

  // Initialiser la carte de prévisualisation quand le dialog s'ouvre
  useEffect(() => {
    if (!previewDialogOpen || !previewProvider || !mapPreviewRef.current) return;

    const initPreview = async () => {
      // Nettoyer l'instance précédente
      if (mapPreviewInstanceRef.current) {
        mapPreviewInstanceRef.current.remove();
        mapPreviewInstanceRef.current = null;
      }

      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      const map = L.map(mapPreviewRef.current!, {
        center: [-4.0383, 21.7587],
        zoom: 6,
        zoomControl: true,
      });

      let tileUrl = previewProvider.tile_url_template;
      // Pour Mapbox : router via la edge function proxy (clé jamais exposée)
      if (previewProvider.requires_api_key) {
        const m = tileUrl.match(/\/styles\/v1\/([^/]+)\/([^/]+)\/tiles/);
        const supabaseUrl = getSupabaseUrl();
        if (m && supabaseUrl) {
          tileUrl = `${supabaseUrl}/functions/v1/proxy-mapbox-tiles/styles/v1/${m[1]}/${m[2]}/tiles/{z}/{x}/{y}`;
        } else {
          tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        }
      }

      const opts: Record<string, any> = {
        attribution: previewProvider.attribution,
        maxZoom: previewProvider.max_zoom,
      };
      const extra = previewProvider.extra_config || {};
      if (extra.subdomains) opts.subdomains = extra.subdomains;
      if (extra.tileSize) opts.tileSize = extra.tileSize;
      if (extra.zoomOffset !== undefined) opts.zoomOffset = extra.zoomOffset;

      L.tileLayer(tileUrl, opts).addTo(map);
      mapPreviewInstanceRef.current = map;

      setTimeout(() => map.invalidateSize(), 100);
    };

    // Petit délai pour que le DOM soit prêt
    const timer = setTimeout(initPreview, 150);
    return () => {
      clearTimeout(timer);
      if (mapPreviewInstanceRef.current) {
        mapPreviewInstanceRef.current.remove();
        mapPreviewInstanceRef.current = null;
      }
    };
  }, [previewDialogOpen, previewProvider]);

  const activeDefault = providers.find(p => p.is_default && p.is_active);
  const activeCount = providers.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      <GoogleProviderWarning />
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{providers.length}</p>
                <p className="text-xs text-muted-foreground">Fournisseurs configurés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold truncate">{activeDefault?.provider_name || '—'}</p>
                <p className="text-xs text-muted-foreground">Fournisseur par défaut</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des fournisseurs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MapIcon className="h-5 w-5" />
                Fournisseurs de Cartographie
              </CardTitle>
              <CardDescription className="mt-1">
                Gérez les services de cartes disponibles. Le fournisseur par défaut est utilisé sur toutes les cartes de l'application.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchProviders} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button size="sm" onClick={handleOpenNew}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucun fournisseur configuré. Cliquez sur "Ajouter" pour commencer.
            </div>
          ) : (
            <div className="grid gap-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`relative border rounded-xl p-4 transition-all ${
                    provider.is_default
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : provider.is_active
                      ? 'border-border hover:border-primary/40'
                      : 'border-border bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{provider.provider_name}</h3>
                        {provider.is_default && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                            <Star className="h-3 w-3 mr-0.5" /> Par défaut
                          </Badge>
                        )}
                        {!provider.is_active && (
                          <Badge variant="secondary" className="text-[10px]">
                            <EyeOff className="h-3 w-3 mr-0.5" /> Désactivé
                          </Badge>
                        )}
                        {provider.requires_api_key && (
                          <Badge variant="outline" className="text-[10px]">
                            <Key className="h-3 w-3 mr-0.5" /> Clé API requise
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {provider.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>Clé: <code className="bg-muted px-1 rounded">{provider.provider_key}</code></span>
                        <span>Zoom: {provider.min_zoom}–{provider.max_zoom}</span>
                        <span>Ordre: {provider.display_order}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(provider)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Aperçu</TooltipContent>
                        </Tooltip>

                        {!provider.is_default && provider.is_active && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => handleSetDefault(provider)}>
                                <Star className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Définir par défaut</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(provider)}>
                              {provider.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{provider.is_active ? 'Désactiver' : 'Activer'}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(provider)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Modifier</TooltipContent>
                        </Tooltip>

                        {!provider.is_default && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer ce fournisseur ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Le fournisseur "{provider.provider_name}" sera définitivement supprimé. Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(provider)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guide rapide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Guide d'utilisation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>• <strong>Fournisseur par défaut</strong> : celui utilisé automatiquement sur toutes les cartes de l'application (carte cadastrale, prévisualisation des parcelles, formulaire CCC).</p>
          <p>• <strong>Migration</strong> : pour changer de service, activez le nouveau fournisseur et cliquez sur l'étoile ★ pour le définir par défaut. Le changement est instantané et global.</p>
          <p>• <strong>Clé API</strong> : les fournisseurs comme Mapbox nécessitent une clé API. Configurez-la dans les secrets du projet Supabase (<code>MAPBOX_ACCESS_TOKEN</code>).</p>
          <p>• <strong>URL de tuile</strong> : utilisez <code>{'{z}'}</code>, <code>{'{x}'}</code>, <code>{'{y}'}</code> pour les coordonnées et <code>{'{s}'}</code> pour les sous-domaines. <code>{'{apiKey}'}</code> sera remplacé par la clé API.</p>
          <p>• <strong>Extra config</strong> : JSON optionnel pour les paramètres Leaflet supplémentaires (<code>tileSize</code>, <code>zoomOffset</code>, <code>subdomains</code>).</p>
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Ajouter un fournisseur' : 'Modifier le fournisseur'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Clé unique *</Label>
                <Input
                  value={editingProvider.provider_key || ''}
                  onChange={(e) => setEditingProvider(prev => ({ ...prev, provider_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                  placeholder="mapbox_streets"
                  className="h-9 text-sm"
                  disabled={!isNew}
                />
              </div>
              <div>
                <Label className="text-xs">Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={editingProvider.display_order || 0}
                  onChange={(e) => setEditingProvider(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Nom du fournisseur *</Label>
              <Input
                value={editingProvider.provider_name || ''}
                onChange={(e) => setEditingProvider(prev => ({ ...prev, provider_name: e.target.value }))}
                placeholder="Mapbox Streets"
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={editingProvider.description || ''}
                onChange={(e) => setEditingProvider(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Cartes vectorielles haute qualité..."
                className="text-sm min-h-[60px]"
              />
            </div>

            <div>
              <Label className="text-xs">URL de tuile *</Label>
              <Input
                value={editingProvider.tile_url_template || ''}
                onChange={(e) => setEditingProvider(prev => ({ ...prev, tile_url_template: e.target.value }))}
                placeholder="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="h-9 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs">Attribution</Label>
              <Input
                value={editingProvider.attribution || ''}
                onChange={(e) => setEditingProvider(prev => ({ ...prev, attribution: e.target.value }))}
                placeholder="© OpenStreetMap contributors"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Zoom min</Label>
                <Input
                  type="number"
                  value={editingProvider.min_zoom || 1}
                  onChange={(e) => setEditingProvider(prev => ({ ...prev, min_zoom: parseInt(e.target.value) || 1 }))}
                  className="h-9 text-sm"
                  min={0}
                  max={22}
                />
              </div>
              <div>
                <Label className="text-xs">Zoom max</Label>
                <Input
                  type="number"
                  value={editingProvider.max_zoom || 19}
                  onChange={(e) => setEditingProvider(prev => ({ ...prev, max_zoom: parseInt(e.target.value) || 19 }))}
                  className="h-9 text-sm"
                  min={1}
                  max={25}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="text-xs font-medium">Nécessite une clé API</Label>
                <p className="text-[10px] text-muted-foreground">Activer pour les services payants (Mapbox, etc.)</p>
              </div>
              <Switch
                checked={editingProvider.requires_api_key || false}
                onCheckedChange={(checked) => setEditingProvider(prev => ({ ...prev, requires_api_key: checked }))}
              />
            </div>

            {editingProvider.requires_api_key && (
              <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
                <div>
                  <Label className="text-xs">Nom de la variable d'env</Label>
                  <Input
                    value={editingProvider.api_key_env_name || ''}
                    onChange={(e) => setEditingProvider(prev => ({ ...prev, api_key_env_name: e.target.value }))}
                    placeholder="MAPBOX_ACCESS_TOKEN"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Placeholder clé</Label>
                  <Input
                    value={editingProvider.api_key_placeholder || ''}
                    onChange={(e) => setEditingProvider(prev => ({ ...prev, api_key_placeholder: e.target.value }))}
                    placeholder="pk.eyJ1Ijoi..."
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Configuration extra (JSON)</Label>
              <Textarea
                value={JSON.stringify(editingProvider.extra_config || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setEditingProvider(prev => ({ ...prev, extra_config: parsed }));
                  } catch {
                    // laisser l'utilisateur finir de taper
                  }
                }}
                placeholder='{"subdomains": "abc"}'
                className="text-xs font-mono min-h-[60px]"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label className="text-xs font-medium">Définir comme fournisseur par défaut</Label>
              <Switch
                checked={editingProvider.is_default || false}
                onCheckedChange={(checked) => setEditingProvider(prev => ({ ...prev, is_default: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isNew ? 'Ajouter' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de prévisualisation */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Aperçu — {previewProvider?.provider_name}
            </DialogTitle>
          </DialogHeader>
          {previewProvider?.requires_api_key && (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg flex items-center gap-2">
              <Key className="h-3.5 w-3.5" />
              Ce fournisseur nécessite une clé API. L'aperçu utilise OpenStreetMap comme fallback.
            </div>
          )}
          <div ref={mapPreviewRef} className="w-full h-80 rounded-lg border border-border" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMapProviders;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Info, MessageCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface TooltipConfig {
  // Labels et textes
  title_label: string;
  surface_label: string;
  location_label: string;
  owner_label: string;
  
  // Boutons d'action
  more_data_button_text: string;
  more_data_button_enabled: boolean;
  help_button_text: string;
  help_button_enabled: boolean;
  help_whatsapp_number: string;
  help_message_template: string;
  
  // Alerte données manquantes
  incomplete_data_alert_enabled: boolean;
  incomplete_data_alert_text: string;
  incomplete_data_threshold: number; // % de champs requis manquants
  
  // Champs requis pour considérer une parcelle complète
  required_fields: string[];
  
  // Style et comportement
  show_coordinates: boolean;
  show_surface_calculation: boolean;
  enable_contribution_link: boolean;
}

const DEFAULT_CONFIG: TooltipConfig = {
  title_label: 'Parcelle sélectionnée',
  surface_label: 'Surface:',
  location_label: 'Localisation:',
  owner_label: 'Propriétaire:',
  more_data_button_text: 'Afficher plus de données',
  more_data_button_enabled: true,
  help_button_text: 'Besoin d\'aide ?',
  help_button_enabled: true,
  help_whatsapp_number: '243816996077',
  help_message_template: 'Bonjour, j\'ai besoin d\'aide concernant les informations cadastrales.',
  incomplete_data_alert_enabled: true,
  incomplete_data_alert_text: 'Cette parcelle a des données incomplètes, cliquez ici pour compléter les données manquantes.',
  incomplete_data_threshold: 30,
  required_fields: ['current_owner_name', 'area_sqm', 'province', 'ville', 'commune', 'quartier', 'gps_coordinates'],
  show_coordinates: true,
  show_surface_calculation: true,
  enable_contribution_link: true,
};

const AdminCadastralTooltip = () => {
  const [config, setConfig] = useState<TooltipConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_search_config')
        .select('config_value')
        .eq('config_key', 'tooltip_config')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.config_value) {
        setConfig({ ...DEFAULT_CONFIG, ...data.config_value as any });
      }
    } catch (error) {
      console.error('Erreur chargement config:', error);
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Vérifier si la config existe
      const { data: existingConfig } = await supabase
        .from('cadastral_search_config')
        .select('id')
        .eq('config_key', 'tooltip_config')
        .single();

      if (existingConfig) {
        // Mise à jour
        const { error } = await supabase
          .from('cadastral_search_config')
          .update({
            config_value: config as any,
            updated_at: new Date().toISOString(),
          })
          .eq('config_key', 'tooltip_config');

        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase
          .from('cadastral_search_config')
          .insert([{
            config_key: 'tooltip_config',
            config_value: config as any,
            description: 'Configuration de l\'infobulle de la carte cadastrale',
            is_active: true,
          }]);

        if (error) throw error;
      }

      toast.success('Configuration enregistrée avec succès');
      setHasChanges(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: keyof TooltipConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggleRequiredField = (field: string) => {
    const newFields = config.required_fields.includes(field)
      ? config.required_fields.filter(f => f !== field)
      : [...config.required_fields, field];
    updateConfig('required_fields', newFields);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableFields = [
    { key: 'current_owner_name', label: 'Propriétaire' },
    { key: 'area_sqm', label: 'Surface' },
    { key: 'province', label: 'Province' },
    { key: 'ville', label: 'Ville' },
    { key: 'commune', label: 'Commune' },
    { key: 'quartier', label: 'Quartier' },
    { key: 'gps_coordinates', label: 'Coordonnées GPS' },
    { key: 'property_title_type', label: 'Type de titre' },
    { key: 'title_reference_number', label: 'N° référence titre' },
    
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion de l'infobulle cadastrale</h2>
          <p className="text-muted-foreground mt-1">
            Configurez les informations affichées dans l'infobulle de la carte cadastrale
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </div>

      {hasChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Vous avez des modifications non enregistrées. N'oubliez pas de sauvegarder.
          </AlertDescription>
        </Alert>
      )}

      {/* Onglets de configuration */}
      <Tabs defaultValue="labels" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="labels">Labels & Textes</TabsTrigger>
          <TabsTrigger value="actions">Boutons d'action</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        {/* Onglet Labels & Textes */}
        <TabsContent value="labels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Labels de l'infobulle</CardTitle>
              <CardDescription>
                Personnalisez les labels affichés dans l'infobulle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title_label">Titre de l'infobulle</Label>
                  <Input
                    id="title_label"
                    value={config.title_label}
                    onChange={(e) => updateConfig('title_label', e.target.value)}
                    placeholder="Ex: Parcelle sélectionnée"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surface_label">Label surface</Label>
                    <Input
                      id="surface_label"
                      value={config.surface_label}
                      onChange={(e) => updateConfig('surface_label', e.target.value)}
                      placeholder="Ex: Surface:"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location_label">Label localisation</Label>
                    <Input
                      id="location_label"
                      value={config.location_label}
                      onChange={(e) => updateConfig('location_label', e.target.value)}
                      placeholder="Ex: Localisation:"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_label">Label propriétaire</Label>
                  <Input
                    id="owner_label"
                    value={config.owner_label}
                    onChange={(e) => updateConfig('owner_label', e.target.value)}
                    placeholder="Ex: Propriétaire:"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Options d'affichage</h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_coordinates" className="cursor-pointer">
                    Afficher les coordonnées GPS
                  </Label>
                  <Switch
                    id="show_coordinates"
                    checked={config.show_coordinates}
                    onCheckedChange={(checked) => updateConfig('show_coordinates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show_surface_calculation" className="cursor-pointer">
                    Calculer la surface depuis les coordonnées
                  </Label>
                  <Switch
                    id="show_surface_calculation"
                    checked={config.show_surface_calculation}
                    onCheckedChange={(checked) => updateConfig('show_surface_calculation', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Boutons d'action */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Bouton "Afficher plus de données"
              </CardTitle>
              <CardDescription>
                Redirige vers la page de recherche cadastrale approfondie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="more_data_enabled" className="cursor-pointer">
                  Activer ce bouton
                </Label>
                <Switch
                  id="more_data_enabled"
                  checked={config.more_data_button_enabled}
                  onCheckedChange={(checked) => updateConfig('more_data_button_enabled', checked)}
                />
              </div>

              {config.more_data_button_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="more_data_text">Texte du bouton</Label>
                  <Input
                    id="more_data_text"
                    value={config.more_data_button_text}
                    onChange={(e) => updateConfig('more_data_button_text', e.target.value)}
                    placeholder="Ex: Afficher plus de données"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Bouton "Besoin d'aide"
              </CardTitle>
              <CardDescription>
                Ouvre une conversation WhatsApp avec le support
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="help_enabled" className="cursor-pointer">
                  Activer ce bouton
                </Label>
                <Switch
                  id="help_enabled"
                  checked={config.help_button_enabled}
                  onCheckedChange={(checked) => updateConfig('help_button_enabled', checked)}
                />
              </div>

              {config.help_button_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="help_text">Texte du bouton</Label>
                    <Input
                      id="help_text"
                      value={config.help_button_text}
                      onChange={(e) => updateConfig('help_button_text', e.target.value)}
                      placeholder="Ex: Besoin d'aide ?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_number">Numéro WhatsApp</Label>
                    <Input
                      id="whatsapp_number"
                      value={config.help_whatsapp_number}
                      onChange={(e) => updateConfig('help_whatsapp_number', e.target.value)}
                      placeholder="Ex: 243816996077"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format international sans le + (ex: 243816996077)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="help_message">Message par défaut</Label>
                    <Textarea
                      id="help_message"
                      value={config.help_message_template}
                      onChange={(e) => updateConfig('help_message_template', e.target.value)}
                      placeholder="Message envoyé automatiquement sur WhatsApp"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Alertes */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alerte "Données manquantes"
              </CardTitle>
              <CardDescription>
                Affiche une alerte quand les données d'une parcelle sont incomplètes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="alert_enabled" className="cursor-pointer">
                  Activer cette alerte
                </Label>
                <Switch
                  id="alert_enabled"
                  checked={config.incomplete_data_alert_enabled}
                  onCheckedChange={(checked) => updateConfig('incomplete_data_alert_enabled', checked)}
                />
              </div>

              {config.incomplete_data_alert_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="alert_text">Texte de l'alerte</Label>
                    <Textarea
                      id="alert_text"
                      value={config.incomplete_data_alert_text}
                      onChange={(e) => updateConfig('incomplete_data_alert_text', e.target.value)}
                      placeholder="Message affiché dans l'alerte"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="threshold">
                      Seuil de détection ({config.incomplete_data_threshold}% de données manquantes)
                    </Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="0"
                      max="100"
                      value={config.incomplete_data_threshold}
                      onChange={(e) => updateConfig('incomplete_data_threshold', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      L'alerte s'affiche si ce pourcentage de champs requis est manquant
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="contribution_link" className="cursor-pointer">
                      Permettre la contribution au clic
                    </Label>
                    <Switch
                      id="contribution_link"
                      checked={config.enable_contribution_link}
                      onCheckedChange={(checked) => updateConfig('enable_contribution_link', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Validation */}
        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Champs requis</CardTitle>
              <CardDescription>
                Sélectionnez les champs nécessaires pour considérer une parcelle comme complète
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableFields.map((field) => (
                <div key={field.key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Label htmlFor={`field_${field.key}`} className="cursor-pointer font-normal">
                    {field.label}
                    <span className="text-xs text-muted-foreground ml-2">({field.key})</span>
                  </Label>
                  <Switch
                    id={`field_${field.key}`}
                    checked={config.required_fields.includes(field.key)}
                    onCheckedChange={() => toggleRequiredField(field.key)}
                  />
                </div>
              ))}

              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {config.required_fields.length} champ(s) requis sélectionné(s).
                  Une parcelle est considérée comme incomplète si plus de {config.incomplete_data_threshold}% 
                  de ces champs sont vides.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCadastralTooltip;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAllProvinces } from '@/lib/geographicData';
import { 
  Search, 
  Tag, 
  Gift, 
  Eye, 
  Save, 
  RefreshCw,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  MapPin
} from 'lucide-react';

interface CatalogConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string | null;
  is_active: boolean;
}

const AdminCatalogConfig = () => {
  const [configs, setConfigs] = useState<Record<string, CatalogConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // États pour chaque configuration
  const [searchExamples, setSearchExamples] = useState<string[]>([]);
  const [searchSettings, setSearchSettings] = useState({
    enabled: true,
    min_chars: 2,
    debounce_ms: 300,
    max_results: 5
  });
  const [discountPlaceholders, setDiscountPlaceholders] = useState<string[]>([]);
  const [cccConfig, setCccConfig] = useState({
    base_value_usd: 5.00,
    validity_days: 90,
    code_prefix: 'CCC-',
    min_value_usd: 0.50
  });
  const [uiSettings, setUiSettings] = useState({
    services_expanded_by_default: true,
    show_data_availability_indicator: true,
    animation_duration_ms: 200,
    placeholder_typing_speed_ms: 150
  });
  const [availabilityMessages, setAvailabilityMessages] = useState({
    all_available: '',
    partial_available: '',
    minimal_available: '',
    data_missing: '',
    data_available: ''
  });
  const [availableProvinces, setAvailableProvinces] = useState<string[]>([]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('catalog_config')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const configMap: Record<string, CatalogConfig> = {};
      data?.forEach(config => {
        configMap[config.config_key] = config;
        
        // Charger les valeurs dans les états avec assertions de type
        switch (config.config_key) {
          case 'search_animated_examples':
            setSearchExamples((config.config_value || []) as string[]);
            break;
          case 'search_predictive_settings':
            setSearchSettings((config.config_value || searchSettings) as typeof searchSettings);
            break;
          case 'discount_code_placeholders':
            setDiscountPlaceholders((config.config_value || []) as string[]);
            break;
          case 'ccc_configuration':
            setCccConfig((config.config_value || cccConfig) as typeof cccConfig);
            break;
          case 'ui_display_settings':
            setUiSettings((config.config_value || uiSettings) as typeof uiSettings);
            break;
          case 'service_availability_messages':
            setAvailabilityMessages((config.config_value || availabilityMessages) as typeof availabilityMessages);
            break;
          case 'available_provinces':
            setAvailableProvinces((config.config_value || []) as string[]);
            break;
        }
      });

      setConfigs(configMap);
    } catch (error: any) {
      console.error('Erreur chargement configuration:', error);
      toast({
        title: "Erreur de chargement",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const saveConfig = async (configKey: string, configValue: any) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('catalog_config')
        .update({
          config_value: configValue,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', configKey);

      if (error) throw error;

      toast({
        title: "Configuration enregistrée",
        description: "Les modifications ont été appliquées avec succès",
      });

      await loadConfigs();
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addArrayItem = (arr: string[], setter: (val: string[]) => void) => {
    setter([...arr, '']);
  };

  const updateArrayItem = (arr: string[], index: number, value: string, setter: (val: string[]) => void) => {
    const newArr = [...arr];
    newArr[index] = value;
    setter(newArr);
  };

  const removeArrayItem = (arr: string[], index: number, setter: (val: string[]) => void) => {
    setter(arr.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuration du Catalogue</h2>
        <p className="text-muted-foreground">
          Personnalisez l'apparence et le comportement du catalogue de services cadastraux
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="search"><Search className="h-4 w-4 mr-2" />Recherche</TabsTrigger>
          <TabsTrigger value="discounts"><Tag className="h-4 w-4 mr-2" />Remises</TabsTrigger>
          <TabsTrigger value="ccc"><Gift className="h-4 w-4 mr-2" />Codes CCC</TabsTrigger>
          <TabsTrigger value="ui"><Eye className="h-4 w-4 mr-2" />Interface</TabsTrigger>
          <TabsTrigger value="messages"><AlertCircle className="h-4 w-4 mr-2" />Messages</TabsTrigger>
          <TabsTrigger value="provinces"><MapPin className="h-4 w-4 mr-2" />Provinces</TabsTrigger>
        </TabsList>

        {/* Onglet Recherche */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exemples de recherche animés</CardTitle>
              <CardDescription>
                Ces exemples s'affichent dans la barre de recherche avec un effet de machine à écrire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {searchExamples.map((example, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={example}
                    onChange={(e) => updateArrayItem(searchExamples, index, e.target.value, setSearchExamples)}
                    placeholder="Ex: BIC-001-RV-2024"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayItem(searchExamples, index, setSearchExamples)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => addArrayItem(searchExamples, setSearchExamples)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un exemple
                </Button>
                <Button onClick={() => saveConfig('search_animated_examples', searchExamples)} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recherche prédictive</CardTitle>
              <CardDescription>Paramètres de la suggestion automatique</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activer la recherche prédictive</Label>
                <Switch
                  checked={searchSettings.enabled}
                  onCheckedChange={(checked) => setSearchSettings({...searchSettings, enabled: checked})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Caractères min.</Label>
                  <Input
                    type="number"
                    value={searchSettings.min_chars}
                    onChange={(e) => setSearchSettings({...searchSettings, min_chars: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Délai (ms)</Label>
                  <Input
                    type="number"
                    value={searchSettings.debounce_ms}
                    onChange={(e) => setSearchSettings({...searchSettings, debounce_ms: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Résultats max</Label>
                  <Input
                    type="number"
                    value={searchSettings.max_results}
                    onChange={(e) => setSearchSettings({...searchSettings, max_results: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <Button onClick={() => saveConfig('search_predictive_settings', searchSettings)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Codes de remise */}
        <TabsContent value="discounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Placeholders codes de remise</CardTitle>
              <CardDescription>
                Exemples affichés avec animation dans le champ de saisie des codes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {discountPlaceholders.map((placeholder, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={placeholder}
                    onChange={(e) => updateArrayItem(discountPlaceholders, index, e.target.value, setDiscountPlaceholders)}
                    placeholder="Ex: PROMO2024"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayItem(discountPlaceholders, index, setDiscountPlaceholders)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => addArrayItem(discountPlaceholders, setDiscountPlaceholders)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un placeholder
                </Button>
                <Button onClick={() => saveConfig('discount_code_placeholders', discountPlaceholders)} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet CCC */}
        <TabsContent value="ccc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des Codes CCC</CardTitle>
              <CardDescription>Paramètres des codes Contributeur Cadastral</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valeur de base (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cccConfig.base_value_usd}
                    onChange={(e) => setCccConfig({...cccConfig, base_value_usd: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valeur minimum (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cccConfig.min_value_usd}
                    onChange={(e) => setCccConfig({...cccConfig, min_value_usd: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée de validité (jours)</Label>
                  <Input
                    type="number"
                    value={cccConfig.validity_days}
                    onChange={(e) => setCccConfig({...cccConfig, validity_days: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Préfixe du code</Label>
                  <Input
                    value={cccConfig.code_prefix}
                    onChange={(e) => setCccConfig({...cccConfig, code_prefix: e.target.value})}
                  />
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  La valeur finale du code CCC est calculée en fonction de la complétude des données fournies par le contributeur, entre {cccConfig.min_value_usd} et {cccConfig.base_value_usd} USD.
                </AlertDescription>
              </Alert>
              <Button onClick={() => saveConfig('ccc_configuration', cccConfig)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Interface */}
        <TabsContent value="ui" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres d'affichage</CardTitle>
              <CardDescription>Comportement visuel de l'interface</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Services déroulés par défaut</Label>
                  <p className="text-sm text-muted-foreground">Afficher les détails des services automatiquement</p>
                </div>
                <Switch
                  checked={uiSettings.services_expanded_by_default}
                  onCheckedChange={(checked) => setUiSettings({...uiSettings, services_expanded_by_default: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Indicateur de disponibilité</Label>
                  <p className="text-sm text-muted-foreground">Afficher le statut des données disponibles</p>
                </div>
                <Switch
                  checked={uiSettings.show_data_availability_indicator}
                  onCheckedChange={(checked) => setUiSettings({...uiSettings, show_data_availability_indicator: checked})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Durée animations (ms)</Label>
                  <Input
                    type="number"
                    value={uiSettings.animation_duration_ms}
                    onChange={(e) => setUiSettings({...uiSettings, animation_duration_ms: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vitesse frappe placeholder (ms)</Label>
                  <Input
                    type="number"
                    value={uiSettings.placeholder_typing_speed_ms}
                    onChange={(e) => setUiSettings({...uiSettings, placeholder_typing_speed_ms: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <Button onClick={() => saveConfig('ui_display_settings', uiSettings)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Messages */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages de disponibilité</CardTitle>
              <CardDescription>Textes affichés selon la complétude des données</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Toutes les données disponibles</Label>
                <Textarea
                  value={availabilityMessages.all_available}
                  onChange={(e) => setAvailabilityMessages({...availabilityMessages, all_available: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Données partiellement disponibles</Label>
                <Textarea
                  value={availabilityMessages.partial_available}
                  onChange={(e) => setAvailabilityMessages({...availabilityMessages, partial_available: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Données minimales disponibles</Label>
                <Textarea
                  value={availabilityMessages.minimal_available}
                  onChange={(e) => setAvailabilityMessages({...availabilityMessages, minimal_available: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Badge "Données manquantes"</Label>
                  <Input
                    value={availabilityMessages.data_missing}
                    onChange={(e) => setAvailabilityMessages({...availabilityMessages, data_missing: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Badge "Données disponibles"</Label>
                  <Input
                    value={availabilityMessages.data_available}
                    onChange={(e) => setAvailabilityMessages({...availabilityMessages, data_available: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={() => saveConfig('service_availability_messages', availabilityMessages)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCatalogConfig;
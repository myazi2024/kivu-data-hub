import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResultsConfig, ModuleFieldConfig } from '@/hooks/useResultsConfig';
import { Loader2, Save, FileText, MapPin, Clock, Receipt, Settings, BarChart, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const AdminResultsConfig = () => {
  const { modulesInfo, displaySettings, statisticsConfig, helpTexts, loading, updateConfig } = useResultsConfig();
  const [saving, setSaving] = useState(false);

  // États locaux pour les modifications
  const [localModulesInfo, setLocalModulesInfo] = useState(modulesInfo);
  const [localDisplaySettings, setLocalDisplaySettings] = useState(displaySettings);
  const [localStatisticsConfig, setLocalStatisticsConfig] = useState(statisticsConfig);
  const [localHelpTexts, setLocalHelpTexts] = useState(helpTexts);

  React.useEffect(() => {
    setLocalModulesInfo(modulesInfo);
    setLocalDisplaySettings(displaySettings);
    setLocalStatisticsConfig(statisticsConfig);
    setLocalHelpTexts(helpTexts);
  }, [modulesInfo, displaySettings, statisticsConfig, helpTexts]);

  const handleSaveModulesInfo = async () => {
    setSaving(true);
    await updateConfig('modules_info', localModulesInfo);
    setSaving(false);
  };

  const handleSaveDisplaySettings = async () => {
    setSaving(true);
    await updateConfig('display_settings', localDisplaySettings);
    setSaving(false);
  };

  const handleSaveStatisticsConfig = async () => {
    setSaving(true);
    await updateConfig('statistics_config', localStatisticsConfig);
    setSaving(false);
  };

  const handleSaveHelpTexts = async () => {
    setSaving(true);
    await updateConfig('help_texts', localHelpTexts);
    setSaving(false);
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
      <div>
        <h2 className="text-2xl font-bold">Configuration des Résultats Cadastraux</h2>
        <p className="text-muted-foreground">
          Gérez les modules, champs et paramètres d'affichage des résultats cadastraux
        </p>
      </div>

      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modules">
            <FileText className="h-4 w-4 mr-2" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="display">
            <Settings className="h-4 w-4 mr-2" />
            Affichage
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart className="h-4 w-4 mr-2" />
            Statistiques
          </TabsTrigger>
          <TabsTrigger value="help">
            <HelpCircle className="h-4 w-4 mr-2" />
            Aide
          </TabsTrigger>
        </TabsList>

        {/* Onglet Modules */}
        <TabsContent value="modules" className="space-y-4">
          {localModulesInfo && Object.entries(localModulesInfo).map(([moduleKey, moduleData]) => (
            <Card key={moduleKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {moduleData.icon === 'FileText' && <FileText className="h-5 w-5" />}
                      {moduleData.icon === 'MapPin' && <MapPin className="h-5 w-5" />}
                      {moduleData.icon === 'Clock' && <Clock className="h-5 w-5" />}
                      {moduleData.icon === 'Receipt' && <Receipt className="h-5 w-5" />}
                      {moduleData.title}
                    </CardTitle>
                    <CardDescription>{moduleData.description}</CardDescription>
                  </div>
                  <Switch
                    checked={moduleData.enabled}
                    onCheckedChange={(checked) => {
                      setLocalModulesInfo({
                        ...localModulesInfo,
                        [moduleKey]: { ...moduleData, enabled: checked }
                      });
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Champs du module */}
                {moduleData.fields && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Champs</h4>
                    {Object.entries(moduleData.fields).map(([fieldKey, fieldData]) => {
                      const field = fieldData as ModuleFieldConfig;
                      return (
                        <div key={fieldKey} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <Label className="font-medium">{field.label}</Label>
                            {field.help && (
                              <p className="text-xs text-muted-foreground mt-1">{field.help}</p>
                            )}
                          </div>
                          <Switch
                            checked={field.enabled}
                            onCheckedChange={(checked) => {
                              setLocalModulesInfo({
                                ...localModulesInfo!,
                                [moduleKey]: {
                                  ...moduleData,
                                  fields: {
                                    ...moduleData.fields!,
                                    [fieldKey]: { ...field, enabled: checked }
                                  }
                                }
                              });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sous-modules */}
                {moduleData.submodules && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Sous-modules</h4>
                    {Object.entries(moduleData.submodules).map(([subKey, subData]) => {
                      const sub = subData as { label: string; enabled: boolean };
                      return (
                        <div key={subKey} className="flex items-center justify-between p-3 border rounded-lg">
                          <Label className="font-medium">{sub.label}</Label>
                          <Switch
                            checked={sub.enabled}
                            onCheckedChange={(checked) => {
                              setLocalModulesInfo({
                                ...localModulesInfo!,
                                [moduleKey]: {
                                  ...moduleData,
                                  submodules: {
                                    ...moduleData.submodules!,
                                    [subKey]: { ...sub, enabled: checked }
                                  }
                                }
                              });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          <Button onClick={handleSaveModulesInfo} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer les modules
          </Button>
        </TabsContent>

        {/* Onglet Affichage */}
        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres d'affichage</CardTitle>
              <CardDescription>Configurez l'affichage des résultats cadastraux</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {localDisplaySettings && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Afficher la carte</Label>
                    <Switch
                      checked={localDisplaySettings.show_map}
                      onCheckedChange={(checked) =>
                        setLocalDisplaySettings({ ...localDisplaySettings, show_map: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Niveau de zoom de la carte</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={localDisplaySettings.map_zoom_level}
                      onChange={(e) =>
                        setLocalDisplaySettings({
                          ...localDisplaySettings,
                          map_zoom_level: parseInt(e.target.value)
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Afficher les statistiques</Label>
                    <Switch
                      checked={localDisplaySettings.show_statistics}
                      onCheckedChange={(checked) =>
                        setLocalDisplaySettings({ ...localDisplaySettings, show_statistics: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Afficher les documents</Label>
                    <Switch
                      checked={localDisplaySettings.show_documents}
                      onCheckedChange={(checked) =>
                        setLocalDisplaySettings({ ...localDisplaySettings, show_documents: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Activer le téléchargement PDF</Label>
                    <Switch
                      checked={localDisplaySettings.enable_pdf_download}
                      onCheckedChange={(checked) =>
                        setLocalDisplaySettings({ ...localDisplaySettings, enable_pdf_download: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Activer l'impression</Label>
                    <Switch
                      checked={localDisplaySettings.enable_print}
                      onCheckedChange={(checked) =>
                        setLocalDisplaySettings({ ...localDisplaySettings, enable_print: checked })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Button onClick={handleSaveDisplaySettings} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer les paramètres
          </Button>
        </TabsContent>

        {/* Onglet Statistiques */}
        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des statistiques</CardTitle>
              <CardDescription>Configurez les chiffres et calculs affichés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {localStatisticsConfig && (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Afficher le calcul de superficie</Label>
                    <Switch
                      checked={localStatisticsConfig.show_area_calculation}
                      onCheckedChange={(checked) =>
                        setLocalStatisticsConfig({ ...localStatisticsConfig, show_area_calculation: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Afficher le statut fiscal</Label>
                    <Switch
                      checked={localStatisticsConfig.show_tax_status}
                      onCheckedChange={(checked) =>
                        setLocalStatisticsConfig({ ...localStatisticsConfig, show_tax_status: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Afficher la durée de propriété</Label>
                    <Switch
                      checked={localStatisticsConfig.show_owner_duration}
                      onCheckedChange={(checked) =>
                        setLocalStatisticsConfig({ ...localStatisticsConfig, show_owner_duration: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Input
                      value={localStatisticsConfig.currency}
                      onChange={(e) =>
                        setLocalStatisticsConfig({ ...localStatisticsConfig, currency: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unité de superficie</Label>
                    <Input
                      value={localStatisticsConfig.area_unit}
                      onChange={(e) =>
                        setLocalStatisticsConfig({ ...localStatisticsConfig, area_unit: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Button onClick={handleSaveStatisticsConfig} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer la configuration
          </Button>
        </TabsContent>

        {/* Onglet Aide */}
        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Textes d'aide</CardTitle>
              <CardDescription>Notes explicatives affichées dans les résultats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {localHelpTexts && (
                <>
                  {Object.entries(localHelpTexts).map(([key, text]) => (
                    <div key={key} className="space-y-2">
                      <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                      <Textarea
                        value={text}
                        onChange={(e) =>
                          setLocalHelpTexts({ ...localHelpTexts, [key]: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
          <Button onClick={handleSaveHelpTexts} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer les textes
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminResultsConfig;

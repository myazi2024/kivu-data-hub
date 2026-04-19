import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContributionConfig } from '@/hooks/useContributionConfig';
import { Loader2, Save, Plus, Trash2, FileText, MapPin, Users, DollarSign, ListFilter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ConfigPreview } from './config/ConfigPreview';
import { ConfigTemplates } from './config/ConfigTemplates';
import { ConfigHistory } from './config/ConfigHistory';
import { ConfigSnapshotPanel } from './config/ConfigSnapshotPanel';
import { SystemConfigAuditViewer } from './config/SystemConfigAuditViewer';
import { ConfigJsonExportImport } from './config/ConfigJsonExportImport';
import { ConfigTest } from './config/ConfigTest';
import { useConfigHistory } from '@/hooks/useConfigHistory';
import { useConfigValidation } from '@/hooks/useConfigValidation';
import AdminPicklistManager from './config/AdminPicklistManager';
import AdminStaticPicklistManager from './config/AdminStaticPicklistManager';
import { MapLegendConfig, type MapLegendConfigHandle } from './contribution-config/MapLegendConfig';

const AdminContributionConfig = ({ initialTab, scrollToLegend }: { initialTab?: string; scrollToLegend?: boolean } = {}) => {
  const { configs, loading, updateConfig } = useContributionConfig();
  const { toast } = useToast();
  const { saveToHistory } = useConfigHistory();
  const { validateMapPreviewSettings, validateValidationRules, validateCccCalculation } = useConfigValidation();
  const [saving, setSaving] = useState<string | null>(null);
  const legendRef = useRef<MapLegendConfigHandle>(null);

  useEffect(() => {
    if (scrollToLegend && !loading) {
      setTimeout(() => {
        legendRef.current?.scrollIntoView();
      }, 300);
    }
  }, [scrollToLegend, loading]);

  // Trouver les configurations spécifiques
  const formSectionsConfig = configs.find(c => c.config_key === 'form_sections');
  const requiredFieldsConfig = configs.find(c => c.config_key === 'required_fields');
  const fieldLabelsConfig = configs.find(c => c.config_key === 'field_labels');
  const helpTextsConfig = configs.find(c => c.config_key === 'help_texts');
  const validationRulesConfig = configs.find(c => c.config_key === 'validation_rules');
  const cccCalculationConfig = configs.find(c => c.config_key === 'ccc_calculation');
  const mapPreviewConfig = configs.find(c => c.config_key === 'map_preview_settings');

  // États locaux pour les modifications
  const [formSections, setFormSections] = useState<any>({});
  const [requiredFields, setRequiredFields] = useState<any>({});
  const [fieldLabels, setFieldLabels] = useState<any>({});
  const [helpTexts, setHelpTexts] = useState<any>({});
  const [validationRules, setValidationRules] = useState<any>({});
  const [cccCalculation, setCccCalculation] = useState<any>({});
  const [mapPreviewSettings, setMapPreviewSettings] = useState<any>({
    enabled: true,
    defaultZoom: 15,
    defaultCenter: { lat: -4.0383, lng: 21.7587 }, // Kinshasa par défaut
    showMarkers: true,
    autoCalculateSurface: true,
    minMarkers: 3,
    maxMarkers: 50,
    markerColor: '#3b82f6',
    showSideDimensions: true,
    dimensionUnit: 'm',
    dimensionTextColor: '#000000',
    dimensionFontSize: 11,
    dimensionFormat: '{value}m',
    allowDimensionEditing: true,
    showSideLabels: true,
    lineColor: '#3b82f6',
    lineWidth: 3,
    lineStyle: 'solid',
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
    minSurfaceSqm: 0,
    maxSurfaceSqm: 100000,
    enableEditing: true,
    enableDragging: true,
    enableConflictDetection: true,
    enableRoadBorderingFeature: true,
    roadTypes: [
      { value: 'nationale', label: 'Route Nationale' },
      { value: 'provinciale', label: 'Route Provinciale' },
      { value: 'urbaine', label: 'Route Urbaine' },
      { value: 'avenue', label: 'Avenue' },
      { value: 'rue', label: 'Rue' },
      { value: 'ruelle', label: 'Ruelle' },
      { value: 'chemin', label: 'Chemin' },
      { value: 'piste', label: 'Piste' },
    ]
  });

  // Charger les données initiales
  React.useEffect(() => {
    if (formSectionsConfig) setFormSections(formSectionsConfig.config_value);
    if (requiredFieldsConfig) setRequiredFields(requiredFieldsConfig.config_value);
    if (fieldLabelsConfig) setFieldLabels(fieldLabelsConfig.config_value);
    if (helpTextsConfig) setHelpTexts(helpTextsConfig.config_value);
    if (validationRulesConfig) setValidationRules(validationRulesConfig.config_value);
    if (cccCalculationConfig) setCccCalculation(cccCalculationConfig.config_value);
    if (mapPreviewConfig) {
      // Fusionner avec les valeurs par défaut pour éviter les clés manquantes
      setMapPreviewSettings((prev: any) => ({
        ...prev,
        ...mapPreviewConfig.config_value
      }));
    }
  }, [
    formSectionsConfig,
    requiredFieldsConfig,
    fieldLabelsConfig,
    helpTextsConfig,
    validationRulesConfig,
    cccCalculationConfig,
    mapPreviewConfig
  ]);

  const handleSaveFormSections = async () => {
    if (!formSectionsConfig) return;
    setSaving('form_sections');
    try {
      const success = await updateConfig(formSectionsConfig.id, {
        config_value: formSections
      });
      if (success) {
        await saveToHistory('form_sections', formSections, 'Modification des sections du formulaire');
        toast({
          title: "Sections sauvegardées",
          description: "Les sections du formulaire ont été mises à jour avec succès"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveRequiredFields = async () => {
    if (!requiredFieldsConfig) return;
    setSaving('required_fields');
    try {
      const success = await updateConfig(requiredFieldsConfig.id, {
        config_value: requiredFields
      });
      if (success) {
        await saveToHistory('required_fields', requiredFields, 'Modification des champs obligatoires');
        toast({
          title: "Champs requis sauvegardés",
          description: "Les champs obligatoires ont été mis à jour avec succès"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveFieldLabels = async () => {
    if (!fieldLabelsConfig) return;
    setSaving('field_labels');
    try {
      const success = await updateConfig(fieldLabelsConfig.id, {
        config_value: fieldLabels
      });
      if (success) {
        await saveToHistory('field_labels', fieldLabels, 'Modification des labels des champs');
        toast({
          title: "Labels sauvegardés",
          description: "Les labels des champs ont été mis à jour avec succès"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveHelpTexts = async () => {
    if (!helpTextsConfig) return;
    setSaving('help_texts');
    try {
      const success = await updateConfig(helpTextsConfig.id, {
        config_value: helpTexts
      });
      if (success) {
        await saveToHistory('help_texts', helpTexts, 'Modification des textes d\'aide');
        toast({
          title: "Textes d'aide sauvegardés",
          description: "Les textes d'aide ont été mis à jour avec succès"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveValidationRules = async () => {
    if (!validationRulesConfig) return;
    
    // Validation avant sauvegarde
    const errors = validateValidationRules(validationRules);
    if (errors.length > 0) {
      toast({
        title: "Erreur de validation",
        description: errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setSaving('validation_rules');
    try {
      const success = await updateConfig(validationRulesConfig.id, {
        config_value: validationRules
      });
      if (success) {
        await saveToHistory('validation_rules', validationRules, 'Modification des règles de validation');
        toast({
          title: "Règles sauvegardées",
          description: "Les règles de validation ont été mises à jour avec succès"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveCccCalculation = async () => {
    if (!cccCalculationConfig) return;
    
    // Validation avant sauvegarde
    const errors = validateCccCalculation(cccCalculation);
    if (errors.length > 0) {
      toast({
        title: "Erreur de validation",
        description: errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setSaving('ccc_calculation');
    try {
      const success = await updateConfig(cccCalculationConfig.id, {
        config_value: cccCalculation
      });
      if (success) {
        await saveToHistory('ccc_calculation', cccCalculation, 'Modification du calcul CCC');
        toast({
          title: "Calcul CCC sauvegardé",
          description: "Les paramètres de calcul CCC ont été mis à jour avec succès"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveMapPreviewSettings = async () => {
    if (!mapPreviewConfig) return;
    
    // Validation avant sauvegarde
    const errors = validateMapPreviewSettings(mapPreviewSettings);
    if (errors.length > 0) {
      toast({
        title: "Erreur de validation",
        description: errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setSaving('map_preview_settings');
    try {
      const success = await updateConfig(mapPreviewConfig.id, {
        config_value: mapPreviewSettings
      });
      if (success) {
        await saveToHistory('map_preview_settings', mapPreviewSettings, 'Modification des paramètres de carte');
        toast({
          title: "Paramètres de carte sauvegardés",
          description: "Les paramètres de la carte ont été mis à jour avec succès"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleApplyTemplate = (template: any) => {
    if (template.form_sections) setFormSections(template.form_sections);
    if (template.required_fields) setRequiredFields(template.required_fields);
  };

  const handleRestoreFromHistory = (configKey: string, configValue: any) => {
    switch (configKey) {
      case 'form_sections':
        setFormSections(configValue);
        break;
      case 'required_fields':
        setRequiredFields(configValue);
        break;
      case 'field_labels':
        setFieldLabels(configValue);
        break;
      case 'help_texts':
        setHelpTexts(configValue);
        break;
      case 'validation_rules':
        setValidationRules(configValue);
        break;
      case 'ccc_calculation':
        setCccCalculation(configValue);
        break;
      case 'map_preview_settings':
        setMapPreviewSettings(configValue);
        break;
    }
    toast({
      title: "Configuration restaurée",
      description: `La configuration ${configKey} a été restaurée depuis l'historique`
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Configuration du formulaire CCC</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configurez les sections, champs et règles du formulaire
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Tabs defaultValue={initialTab || "sections"}>
                <TabsList className="grid w-full grid-cols-9 h-8 sm:h-10 text-[10px] sm:text-xs p-0.5 sm:p-1">
                  <TabsTrigger value="sections" className="text-[10px] sm:text-xs px-1 sm:px-3">Sections</TabsTrigger>
                  <TabsTrigger value="required" className="text-[10px] sm:text-xs px-1 sm:px-3">Requis</TabsTrigger>
                  <TabsTrigger value="labels" className="text-[10px] sm:text-xs px-1 sm:px-3">Labels</TabsTrigger>
                  <TabsTrigger value="help" className="text-[10px] sm:text-xs px-1 sm:px-3">Aide</TabsTrigger>
                  <TabsTrigger value="validation" className="text-[10px] sm:text-xs px-1 sm:px-3">Valid.</TabsTrigger>
                  <TabsTrigger value="ccc" className="text-[10px] sm:text-xs px-1 sm:px-3">CCC</TabsTrigger>
                  <TabsTrigger value="static-picklists" className="text-[10px] sm:text-xs px-1 sm:px-3">Listes fixes</TabsTrigger>
                  <TabsTrigger value="picklists" className="text-[10px] sm:text-xs px-1 sm:px-3">Listes suggestives</TabsTrigger>
                  <TabsTrigger value="map" className="text-[10px] sm:text-xs px-1 sm:px-3">Carte</TabsTrigger>
                </TabsList>

            {/* Sections du formulaire */}
            <TabsContent value="sections" className="space-y-2 sm:space-y-4 mt-2 sm:mt-4">
              <Alert className="p-2 sm:p-4">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  Activez ou désactivez les sections du formulaire
                </AlertDescription>
              </Alert>

              {Object.entries(formSections).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-2 sm:p-4 border rounded-lg">
                  <div className="space-y-0.5 sm:space-y-1">
                    <Label className="text-xs sm:text-sm">{value.label}</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Ordre: {value.order}</p>
                  </div>
                  <Switch
                    checked={value.enabled}
                    onCheckedChange={(checked) => {
                      setFormSections({
                        ...formSections,
                        [key]: { ...value, enabled: checked }
                      });
                    }}
                  />
                </div>
              ))}

              <Button onClick={handleSaveFormSections} disabled={saving === 'form_sections'} size="sm" className="text-xs">
                {saving === 'form_sections' ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Champs obligatoires */}
            <TabsContent value="required" className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Définissez quels champs sont obligatoires dans le formulaire
                </AlertDescription>
              </Alert>

              {Object.entries(requiredFields).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                  <Label>{fieldLabels[key] || key}</Label>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => {
                      setRequiredFields({
                        ...requiredFields,
                        [key]: checked
                      });
                    }}
                  />
                </div>
              ))}

              <Button onClick={handleSaveRequiredFields} disabled={saving === 'required_fields'}>
                {saving === 'required_fields' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Labels des champs */}
            <TabsContent value="labels" className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Personnalisez les labels des champs du formulaire
                </AlertDescription>
              </Alert>

              {Object.entries(fieldLabels).map(([key, value]: [string, any]) => (
                <div key={key} className="space-y-2">
                  <Label>{key}</Label>
                  <Input
                    value={value}
                    onChange={(e) => {
                      setFieldLabels({
                        ...fieldLabels,
                        [key]: e.target.value
                      });
                    }}
                  />
                </div>
              ))}

              <Button onClick={handleSaveFieldLabels} disabled={saving === 'field_labels'}>
                {saving === 'field_labels' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Textes d'aide */}
            <TabsContent value="help" className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Configurez les textes d'aide pour chaque section du formulaire
                </AlertDescription>
              </Alert>

              {Object.entries(helpTexts).map(([key, value]: [string, any]) => (
                <div key={key} className="space-y-2">
                  <Label>{formSections[key]?.label || key}</Label>
                  <Textarea
                    value={value}
                    onChange={(e) => {
                      setHelpTexts({
                        ...helpTexts,
                        [key]: e.target.value
                      });
                    }}
                    rows={3}
                  />
                </div>
              ))}

              <Button onClick={handleSaveHelpTexts} disabled={saving === 'help_texts'}>
                {saving === 'help_texts' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Règles de validation */}
            <TabsContent value="validation" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Configurez les règles de validation du formulaire
                  </AlertDescription>
                </Alert>

                <ConfigTest config={validationRules} configType="validation" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Superficie min (m²)</Label>
                  <Input
                    type="number"
                    value={validationRules.min_area_sqm || 0}
                    onChange={(e) => {
                      setValidationRules({
                        ...validationRules,
                        min_area_sqm: parseFloat(e.target.value)
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Superficie max (m²)</Label>
                  <Input
                    type="number"
                    value={validationRules.max_area_sqm || 1000000}
                    onChange={(e) => {
                      setValidationRules({
                        ...validationRules,
                        max_area_sqm: parseFloat(e.target.value)
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Points GPS minimum</Label>
                  <Input
                    type="number"
                    value={validationRules.min_gps_points || 3}
                    onChange={(e) => {
                      setValidationRules({
                        ...validationRules,
                        min_gps_points: parseInt(e.target.value)
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label>GPS obligatoire</Label>
                  <Switch
                    checked={validationRules.require_gps || false}
                    onCheckedChange={(checked) => {
                      setValidationRules({
                        ...validationRules,
                        require_gps: checked
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label>Permis obligatoire</Label>
                  <Switch
                    checked={validationRules.require_building_permit || false}
                    onCheckedChange={(checked) => {
                      setValidationRules({
                        ...validationRules,
                        require_building_permit: checked
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label>Pièces jointes obligatoires</Label>
                  <Switch
                    checked={validationRules.require_attachments || false}
                    onCheckedChange={(checked) => {
                      setValidationRules({
                        ...validationRules,
                        require_attachments: checked
                      });
                    }}
                  />
                </div>
              </div>

              <Button onClick={handleSaveValidationRules} disabled={saving === 'validation_rules'}>
                {saving === 'validation_rules' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Calcul CCC */}
            <TabsContent value="ccc" className="space-y-4">
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  Configurez les paramètres de calcul de la valeur des codes CCC
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valeur de base ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cccCalculation.base_value || 5}
                    onChange={(e) => {
                      setCccCalculation({
                        ...cccCalculation,
                        base_value: parseFloat(e.target.value)
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valeur minimum ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cccCalculation.min_value || 0.5}
                    onChange={(e) => {
                      setCccCalculation({
                        ...cccCalculation,
                        min_value: parseFloat(e.target.value)
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Poids complétude</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={cccCalculation.completeness_weight || 1}
                    onChange={(e) => {
                      setCccCalculation({
                        ...cccCalculation,
                        completeness_weight: parseFloat(e.target.value)
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bonus qualité</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={cccCalculation.quality_bonus || 0.5}
                    onChange={(e) => {
                      setCccCalculation({
                        ...cccCalculation,
                        quality_bonus: parseFloat(e.target.value)
                      });
                    }}
                  />
                </div>
              </div>

              <Button onClick={handleSaveCccCalculation} disabled={saving === 'ccc_calculation'}>
                {saving === 'ccc_calculation' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Listes fixes (Select dropdowns) */}
            <TabsContent value="static-picklists" className="space-y-4 mt-4">
              <AdminStaticPicklistManager />
            </TabsContent>

            {/* Listes suggestives (Picklists) */}
            <TabsContent value="picklists" className="space-y-4 mt-4">
              <AdminPicklistManager />
            </TabsContent>

            {/* Aperçu de la Parcelle */}
            <TabsContent value="map" className="space-y-4">
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Configurez les paramètres d'affichage de l'aperçu de la carte de la parcelle
                </AlertDescription>
              </Alert>

              <GeneralSettingsSection value={mapPreviewSettings} onChange={setMapPreviewSettings} />
              <MarkerStyleSection value={mapPreviewSettings} onChange={setMapPreviewSettings} />
              <EditingOptionsSection value={mapPreviewSettings} onChange={setMapPreviewSettings} />
              <ConstraintsSection value={mapPreviewSettings} onChange={setMapPreviewSettings} />
              <RoadTypesSection value={mapPreviewSettings} onChange={setMapPreviewSettings} />
              <DimensionsSection value={mapPreviewSettings} onChange={setMapPreviewSettings} />

              {/* Section Légende — extraite dans MapLegendConfig */}
              <MapLegendConfig
                ref={legendRef}
                value={mapPreviewSettings.legend}
                onChange={(nextLegend) => setMapPreviewSettings({ ...mapPreviewSettings, legend: nextLegend })}
              />

              <div className="flex gap-2">
                <Button onClick={handleSaveMapPreviewSettings} disabled={saving === 'map_preview_settings'} className="flex-1">
                  {saving === 'map_preview_settings' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMapPreviewSettings(DEFAULT_MAP_PREVIEW_SETTINGS);
                    toast({
                      title: "Paramètres réinitialisés",
                      description: "Les paramètres de carte ont été réinitialisés aux valeurs par défaut"
                    });
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>

    <div className="space-y-4">
      <div className="flex justify-end">
        <ConfigJsonExportImport tableName="cadastral_contribution_config" />
      </div>
      <ConfigTemplates onApplyTemplate={handleApplyTemplate} />
      <ConfigPreview config={formSections} type="sections" />
      <ConfigSnapshotPanel tableName="cadastral_contribution_config" title="Contribution CCC" />
      <SystemConfigAuditViewer tableName="cadastral_contribution_config" limit={20} title="Audit CCC" />
      <ConfigHistory onRestore={handleRestoreFromHistory} />
    </div>
  </div>
</div>
  );
};

export default AdminContributionConfig;

import React, { useState } from 'react';
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
import { ConfigTest } from './config/ConfigTest';
import { useConfigHistory } from '@/hooks/useConfigHistory';
import { useConfigValidation } from '@/hooks/useConfigValidation';
import AdminPicklistManager from './config/AdminPicklistManager';

const AdminContributionConfig = () => {
  const { configs, loading, updateConfig } = useContributionConfig();
  const { toast } = useToast();
  const { saveToHistory } = useConfigHistory();
  const { validateMapPreviewSettings, validateValidationRules, validateCccCalculation } = useConfigValidation();
  const [saving, setSaving] = useState<string | null>(null);

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
    await updateConfig(fieldLabelsConfig.id, {
      config_value: fieldLabels
    });
    setSaving(null);
  };

  const handleSaveHelpTexts = async () => {
    if (!helpTextsConfig) return;
    setSaving('help_texts');
    await updateConfig(helpTextsConfig.id, {
      config_value: helpTexts
    });
    setSaving(null);
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
              <Tabs defaultValue="sections">
                <TabsList className="grid w-full grid-cols-7 h-8 sm:h-10 text-[10px] sm:text-xs p-0.5 sm:p-1">
                  <TabsTrigger value="sections" className="text-[10px] sm:text-xs px-1 sm:px-3">Sections</TabsTrigger>
                  <TabsTrigger value="required" className="text-[10px] sm:text-xs px-1 sm:px-3">Requis</TabsTrigger>
                  <TabsTrigger value="labels" className="text-[10px] sm:text-xs px-1 sm:px-3">Labels</TabsTrigger>
                  <TabsTrigger value="help" className="text-[10px] sm:text-xs px-1 sm:px-3">Aide</TabsTrigger>
                  <TabsTrigger value="validation" className="text-[10px] sm:text-xs px-1 sm:px-3">Valid.</TabsTrigger>
                  <TabsTrigger value="ccc" className="text-[10px] sm:text-xs px-1 sm:px-3">CCC</TabsTrigger>
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

            {/* Aperçu de la Parcelle */}
            <TabsContent value="map" className="space-y-4">
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Configurez les paramètres d'affichage de l'aperçu de la carte de la parcelle
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Activer l'aperçu de la carte</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher la carte interactive avec les bornes GPS
                    </p>
                  </div>
                  <Switch
                    checked={mapPreviewSettings.enabled}
                    onCheckedChange={(checked) => {
                      setMapPreviewSettings({
                        ...mapPreviewSettings,
                        enabled: checked
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Afficher les marqueurs numérotés</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher les numéros sur les marqueurs des bornes
                    </p>
                  </div>
                  <Switch
                    checked={mapPreviewSettings.showMarkers}
                    onCheckedChange={(checked) => {
                      setMapPreviewSettings({
                        ...mapPreviewSettings,
                        showMarkers: checked
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Calcul automatique de la surface</Label>
                    <p className="text-sm text-muted-foreground">
                      Calculer et afficher automatiquement la surface de la parcelle
                    </p>
                  </div>
                  <Switch
                    checked={mapPreviewSettings.autoCalculateSurface}
                    onCheckedChange={(checked) => {
                      setMapPreviewSettings({
                        ...mapPreviewSettings,
                        autoCalculateSurface: checked
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Afficher les dimensions des côtés</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher les dimensions en mètres de chaque côté de la parcelle sur la carte
                    </p>
                  </div>
                  <Switch
                    checked={mapPreviewSettings.showSideDimensions}
                    onCheckedChange={(checked) => {
                      setMapPreviewSettings({
                        ...mapPreviewSettings,
                        showSideDimensions: checked
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Permettre l'édition des dimensions</Label>
                    <p className="text-sm text-muted-foreground">
                      Permettre aux utilisateurs d'ajuster manuellement les dimensions depuis la carte
                    </p>
                  </div>
                  <Switch
                    checked={mapPreviewSettings.allowDimensionEditing}
                    onCheckedChange={(checked) => {
                      setMapPreviewSettings({
                        ...mapPreviewSettings,
                        allowDimensionEditing: checked
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Afficher les étiquettes des côtés</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher "Côté 1", "Côté 2", etc. sur chaque segment
                    </p>
                  </div>
                  <Switch
                    checked={mapPreviewSettings.showSideLabels}
                    onCheckedChange={(checked) => {
                      setMapPreviewSettings({
                        ...mapPreviewSettings,
                        showSideLabels: checked
                      });
                    }}
                  />
                </div>

                {/* Paramètres de base de la carte */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm">Paramètres de base</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Zoom par défaut</Label>
                      <Input
                        type="number"
                        min="1"
                        max="19"
                        value={mapPreviewSettings.defaultZoom}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            defaultZoom: parseInt(e.target.value)
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Niveau de zoom initial (1-19)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Latitude du centre</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        min="-90"
                        max="90"
                        value={mapPreviewSettings.defaultCenter?.lat || -4.0383}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            defaultCenter: {
                              ...mapPreviewSettings.defaultCenter,
                              lat: parseFloat(e.target.value)
                            }
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Kinshasa: -4.0383
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Longitude du centre</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        min="-180"
                        max="180"
                        value={mapPreviewSettings.defaultCenter?.lng || 21.7587}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            defaultCenter: {
                              ...mapPreviewSettings.defaultCenter,
                              lng: parseFloat(e.target.value)
                            }
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Kinshasa: 21.7587
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fonctionnalités avancées */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm">Fonctionnalités avancées</h4>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label>Détection de conflits de limites</Label>
                      <p className="text-xs text-muted-foreground">
                        Vérifier automatiquement les chevauchements avec les parcelles voisines
                      </p>
                    </div>
                    <Switch
                      checked={mapPreviewSettings.enableConflictDetection}
                      onCheckedChange={(checked) => {
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          enableConflictDetection: checked
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label>Gestion des côtés bordant une route</Label>
                      <p className="text-xs text-muted-foreground">
                        Permettre d'indiquer quels côtés de la parcelle bordent une route
                      </p>
                    </div>
                    <Switch
                      checked={mapPreviewSettings.enableRoadBorderingFeature}
                      onCheckedChange={(checked) => {
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          enableRoadBorderingFeature: checked
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Style avancé */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm">Style et Apparence</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Couleur des marqueurs</Label>
                      <Input
                        type="color"
                        value={mapPreviewSettings.markerColor || '#3b82f6'}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            markerColor: e.target.value
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Couleur des marqueurs de bornes sur la carte
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Couleur des lignes</Label>
                      <Input
                        type="color"
                        value={mapPreviewSettings.lineColor}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            lineColor: e.target.value
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Épaisseur des lignes</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={mapPreviewSettings.lineWidth}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            lineWidth: parseInt(e.target.value)
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Style de ligne</Label>
                      <Select
                        value={mapPreviewSettings.lineStyle || 'solid'}
                        onValueChange={(value) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            lineStyle: value as 'solid' | 'dashed'
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Ligne solide</SelectItem>
                          <SelectItem value="dashed">Ligne pointillée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Couleur de remplissage</Label>
                      <Input
                        type="color"
                        value={mapPreviewSettings.fillColor}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            fillColor: e.target.value
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Opacité de remplissage</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={mapPreviewSettings.fillOpacity}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            fillOpacity: parseFloat(e.target.value)
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Options d'édition */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm">Options d'édition</h4>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label>Permettre le déplacement des marqueurs</Label>
                      <p className="text-xs text-muted-foreground">
                        Les utilisateurs peuvent ajuster la position des bornes en les glissant sur la carte
                      </p>
                    </div>
                    <Switch
                      checked={mapPreviewSettings.enableDragging !== false}
                      onCheckedChange={(checked) => {
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          enableDragging: checked
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label>Activer les outils d'édition</Label>
                      <p className="text-xs text-muted-foreground">
                        Fonctionnalités d'édition avancées pour modifier la parcelle
                      </p>
                    </div>
                    <Switch
                      checked={mapPreviewSettings.enableEditing !== false}
                      onCheckedChange={(checked) => {
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          enableEditing: checked
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Validations */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm">Validations de la parcelle</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum de bornes GPS</Label>
                      <Input
                        type="number"
                        min="3"
                        max="100"
                        value={mapPreviewSettings.minMarkers || 3}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            minMarkers: parseInt(e.target.value)
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum requis pour former une parcelle valide (3-100)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Maximum de bornes GPS</Label>
                      <Input
                        type="number"
                        min="3"
                        max="100"
                        value={mapPreviewSettings.maxMarkers}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            maxMarkers: parseInt(e.target.value)
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum autorisé pour une parcelle (3-100)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Surface minimale (m²)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={mapPreviewSettings.minSurfaceSqm}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            minSurfaceSqm: parseInt(e.target.value)
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        0 = pas de limite minimale
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Surface maximale (m²)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={mapPreviewSettings.maxSurfaceSqm}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            maxSurfaceSqm: parseInt(e.target.value)
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        0 = pas de limite maximale
                      </p>
                    </div>
                  </div>
                </div>

                {/* Types de routes personnalisables */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Types de routes</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const currentTypes = mapPreviewSettings.roadTypes || [];
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          roadTypes: [
                            ...currentTypes,
                            { value: `route_${currentTypes.length + 1}`, label: `Nouveau type ${currentTypes.length + 1}` }
                          ]
                        });
                      }}
                      className="h-7 text-xs"
                    >
                      Ajouter un type
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Types de routes disponibles pour identifier les côtés de parcelles bordant une voie
                  </p>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {(mapPreviewSettings.roadTypes || []).map((roadType: any, index: number) => (
                      <div key={index} className="flex gap-2 items-start p-2 bg-muted/30 rounded">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Valeur (slug)"
                            value={roadType.value}
                            onChange={(e) => {
                              const updated = [...(mapPreviewSettings.roadTypes || [])];
                              updated[index] = { ...updated[index], value: e.target.value };
                              setMapPreviewSettings({
                                ...mapPreviewSettings,
                                roadTypes: updated
                              });
                            }}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Libellé"
                            value={roadType.label}
                            onChange={(e) => {
                              const updated = [...(mapPreviewSettings.roadTypes || [])];
                              updated[index] = { ...updated[index], label: e.target.value };
                              setMapPreviewSettings({
                                ...mapPreviewSettings,
                                roadTypes: updated
                              });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const updated = (mapPreviewSettings.roadTypes || []).filter((_: any, i: number) => i !== index);
                            setMapPreviewSettings({
                              ...mapPreviewSettings,
                              roadTypes: updated
                            });
                          }}
                          className="h-8 w-8 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Configuration des dimensions */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm">Dimensions des côtés</h4>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label>Afficher les dimensions</Label>
                      <p className="text-xs text-muted-foreground">
                        Afficher la longueur de chaque côté de la parcelle
                      </p>
                    </div>
                    <Switch
                      checked={mapPreviewSettings.showSideDimensions !== false}
                      onCheckedChange={(checked) => {
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          showSideDimensions: checked
                        });
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Format d'affichage</Label>
                      <Input
                        placeholder="{value}m"
                        value={mapPreviewSettings.dimensionFormat || '{value}m'}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            dimensionFormat: e.target.value
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Utiliser {'{value}'} pour la valeur. Ex: {'{value}m, {value} mètres'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Unité</Label>
                      <Select
                        value={mapPreviewSettings.dimensionUnit || 'm'}
                        onValueChange={(value) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            dimensionUnit: value
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m">Mètres (m)</SelectItem>
                          <SelectItem value="km">Kilomètres (km)</SelectItem>
                          <SelectItem value="ft">Pieds (ft)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Taille de police</Label>
                      <Input
                        type="number"
                        min="8"
                        max="16"
                        value={mapPreviewSettings.dimensionFontSize || 11}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            dimensionFontSize: parseInt(e.target.value)
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Couleur du texte</Label>
                      <Input
                        type="color"
                        value={mapPreviewSettings.dimensionTextColor || '#000000'}
                        onChange={(e) => {
                          setMapPreviewSettings({
                            ...mapPreviewSettings,
                            dimensionTextColor: e.target.value
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label>Afficher "Côté X"</Label>
                      <p className="text-xs text-muted-foreground">
                        Préfixer chaque dimension avec "Côté 1", "Côté 2", etc.
                      </p>
                    </div>
                    <Switch
                      checked={mapPreviewSettings.showSideLabels !== false}
                      onCheckedChange={(checked) => {
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          showSideLabels: checked
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

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
                    const defaultSettings = {
                      enabled: true,
                      defaultZoom: 15,
                      defaultCenter: { lat: -4.0383, lng: 21.7587 },
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
                    };
                    setMapPreviewSettings(defaultSettings);
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
      <ConfigTemplates onApplyTemplate={handleApplyTemplate} />
      <ConfigPreview config={formSections} type="sections" />
      <ConfigHistory onRestore={handleRestoreFromHistory} />
    </div>
  </div>
</div>
  );
};

export default AdminContributionConfig;

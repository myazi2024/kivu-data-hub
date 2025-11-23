import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useContributionConfig } from '@/hooks/useContributionConfig';
import { Loader2, Save, Plus, Trash2, FileText, MapPin, Users, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AdminContributionConfig = () => {
  const { configs, loading, updateConfig } = useContributionConfig();
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
    markerColor: 'hsl(var(--primary))',
    showSideDimensions: true,
    dimensionUnit: 'meters',
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
      setMapPreviewSettings({
        ...mapPreviewSettings,
        ...mapPreviewConfig.config_value
      });
    }
  }, [configs]);

  const handleSaveFormSections = async () => {
    if (!formSectionsConfig) return;
    setSaving('form_sections');
    await updateConfig(formSectionsConfig.id, {
      config_value: formSections
    });
    setSaving(null);
  };

  const handleSaveRequiredFields = async () => {
    if (!requiredFieldsConfig) return;
    setSaving('required_fields');
    await updateConfig(requiredFieldsConfig.id, {
      config_value: requiredFields
    });
    setSaving(null);
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
    setSaving('validation_rules');
    await updateConfig(validationRulesConfig.id, {
      config_value: validationRules
    });
    setSaving(null);
  };

  const handleSaveCccCalculation = async () => {
    if (!cccCalculationConfig) return;
    setSaving('ccc_calculation');
    await updateConfig(cccCalculationConfig.id, {
      config_value: cccCalculation
    });
    setSaving(null);
  };

  const handleSaveMapPreviewSettings = async () => {
    if (!mapPreviewConfig) return;
    setSaving('map_preview_settings');
    await updateConfig(mapPreviewConfig.id, {
      config_value: mapPreviewSettings
    });
    setSaving(null);
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
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Configurez les règles de validation du formulaire
                </AlertDescription>
              </Alert>

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
                    <Label>Nombre minimum de bornes</Label>
                    <Input
                      type="number"
                      min="3"
                      max="100"
                      value={mapPreviewSettings.minMarkers}
                      onChange={(e) => {
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          minMarkers: parseInt(e.target.value)
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum requis pour tracer un polygone
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Latitude du centre par défaut</Label>
                    <Input
                      type="number"
                      step="0.0001"
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
                    <Label>Longitude du centre par défaut</Label>
                    <Input
                      type="number"
                      step="0.0001"
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

                {/* Détection de conflits de limites */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Détection de conflits de limites</Label>
                    <p className="text-sm text-muted-foreground">
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

                {/* Gestion des côtés bordant une route */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Gérer les côtés bordant une route</Label>
                    <p className="text-sm text-muted-foreground">
                      Permettre aux utilisateurs d'indiquer quels côtés de la parcelle bordent une route
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

                {/* Style avancé */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm">Style et Apparence</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
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

                {/* Validations */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm">Validations</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
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

                    <div className="space-y-2">
                      <Label>Maximum de bornes</Label>
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
                    </div>
                  </div>
                </div>

                {/* Interaction */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm">Options d'interaction</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Permettre le déplacement des marqueurs</Label>
                      <p className="text-sm text-muted-foreground">
                        Les utilisateurs peuvent glisser-déposer les bornes GPS
                      </p>
                    </div>
                    <Switch
                      checked={mapPreviewSettings.enableDragging}
                      onCheckedChange={(checked) => {
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          enableDragging: checked
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Permettre l'édition</Label>
                      <p className="text-sm text-muted-foreground">
                        Permettre toutes les modifications sur la carte
                      </p>
                    </div>
                    <Switch
                      checked={mapPreviewSettings.enableEditing}
                      onCheckedChange={(checked) => {
                        setMapPreviewSettings({
                          ...mapPreviewSettings,
                          enableEditing: checked
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveMapPreviewSettings} disabled={saving === 'map_preview_settings'}>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminContributionConfig;

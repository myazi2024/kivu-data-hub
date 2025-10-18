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

  // États locaux pour les modifications
  const [formSections, setFormSections] = useState<any>({});
  const [requiredFields, setRequiredFields] = useState<any>({});
  const [fieldLabels, setFieldLabels] = useState<any>({});
  const [helpTexts, setHelpTexts] = useState<any>({});
  const [validationRules, setValidationRules] = useState<any>({});
  const [cccCalculation, setCccCalculation] = useState<any>({});

  // Charger les données initiales
  React.useEffect(() => {
    if (formSectionsConfig) setFormSections(formSectionsConfig.config_value);
    if (requiredFieldsConfig) setRequiredFields(requiredFieldsConfig.config_value);
    if (fieldLabelsConfig) setFieldLabels(fieldLabelsConfig.config_value);
    if (helpTextsConfig) setHelpTexts(helpTextsConfig.config_value);
    if (validationRulesConfig) setValidationRules(validationRulesConfig.config_value);
    if (cccCalculationConfig) setCccCalculation(cccCalculationConfig.config_value);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration du formulaire de contribution CCC</CardTitle>
          <CardDescription>
            Configurez les sections, champs et règles du formulaire de contribution cadastrale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sections">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="required">Champs obligatoires</TabsTrigger>
              <TabsTrigger value="labels">Labels</TabsTrigger>
              <TabsTrigger value="help">Aide</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="ccc">Calcul CCC</TabsTrigger>
            </TabsList>

            {/* Sections du formulaire */}
            <TabsContent value="sections" className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Activez ou désactivez les sections du formulaire de contribution
                </AlertDescription>
              </Alert>

              {Object.entries(formSections).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>{value.label}</Label>
                    <p className="text-sm text-muted-foreground">Ordre: {value.order}</p>
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

              <Button onClick={handleSaveFormSections} disabled={saving === 'form_sections'}>
                {saving === 'form_sections' ? (
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminContributionConfig;

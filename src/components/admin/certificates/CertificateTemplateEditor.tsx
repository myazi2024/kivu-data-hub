import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Save, Eye, Palette, Type, Image, Stamp, FileText, Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CertificateTemplate, CertificateType } from '@/types/certificate';
import { CERTIFICATE_TYPE_LABELS } from '@/types/certificate';
import { CertificatePreview } from './CertificatePreview';

const DEFAULT_TEMPLATE: Partial<CertificateTemplate> = {
  header_title: 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
  header_organization: "BUREAU D'INFORMATION CADASTRALE (BIC)",
  header_subtitle: 'Service Agréé',
  body_text: 'CERTIFICAT\nLe présent certificat atteste que {beneficiaire} est titulaire des droits relatifs à la parcelle N° {parcelle}.',
  footer_text: 'Document officiel - Toute falsification est passible de poursuites.',
  legal_text: 'Ce certificat est valide pour une durée de six (6) mois à compter de sa date d\'émission. Vérifiez l\'authenticité via le QR code.',
  signature_name: '',
  signature_title: 'Le Responsable',
  stamp_text: 'CERTIFIÉ\nCONFORME',
  primary_color: '#006432',
  secondary_color: '#004020',
  show_qr_code: true,
  show_border: true,
  show_stamp: true,
  logo_url: null,
  signature_image_url: null,
};

export const CertificateTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<CertificateType>('expertise_immobiliere');
  const [template, setTemplate] = useState<Partial<CertificateTemplate>>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const existing = templates.find(t => t.certificate_type === selectedType);
    if (existing) {
      setTemplate(existing);
    } else {
      setTemplate({
        ...DEFAULT_TEMPLATE,
        certificate_type: selectedType,
        template_name: CERTIFICATE_TYPE_LABELS[selectedType],
      });
    }
  }, [selectedType, templates]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('certificate_templates')
        .select('*')
        .order('certificate_type');
      if (error) throw error;
      setTemplates((data || []) as CertificateTemplate[]);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof CertificateTemplate, value: any) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  const handleUploadFile = async (field: 'logo_url' | 'signature_image_url', file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `certificate-assets/${field}_${selectedType}_${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('expertise-certificates')
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('expertise-certificates')
        .getPublicUrl(path);

      updateField(field, urlData.publicUrl);
      toast.success('Fichier uploadé');
    } catch (err: any) {
      toast.error(`Erreur upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = templates.find(t => t.certificate_type === selectedType);
      const payload = {
        certificate_type: selectedType,
        template_name: template.template_name || CERTIFICATE_TYPE_LABELS[selectedType],
        header_title: template.header_title || '',
        header_subtitle: template.header_subtitle || '',
        header_organization: template.header_organization || '',
        body_text: template.body_text || '',
        footer_text: template.footer_text || '',
        legal_text: template.legal_text || '',
        signature_name: template.signature_name || '',
        signature_title: template.signature_title || '',
        logo_url: template.logo_url || null,
        signature_image_url: template.signature_image_url || null,
        stamp_text: template.stamp_text || '',
        primary_color: template.primary_color || '#006432',
        secondary_color: template.secondary_color || '#004020',
        show_qr_code: template.show_qr_code ?? true,
        show_border: template.show_border ?? true,
        show_stamp: template.show_stamp ?? true,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await (supabase as any)
          .from('certificate_templates')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('certificate_templates')
          .insert([payload]);
        if (error) throw error;
      }

      toast.success('Modèle sauvegardé avec succès');
      fetchTemplates();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Éditeur de Modèles de Certificats
          </h2>
          <p className="text-xs text-muted-foreground">
            Personnalisez les certificats pour chaque service avec aperçu en temps réel
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>

      {/* Type selector */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-xs font-medium mb-2 block">Type de certificat</Label>
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as CertificateType)}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CERTIFICATE_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Editor + Preview side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Paramètres du modèle</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Tabs defaultValue="header" className="w-full">
              <TabsList className="grid grid-cols-4 w-full h-8">
                <TabsTrigger value="header" className="text-[10px] gap-1"><Type className="h-3 w-3" />En-tête</TabsTrigger>
                <TabsTrigger value="content" className="text-[10px] gap-1"><FileText className="h-3 w-3" />Contenu</TabsTrigger>
                <TabsTrigger value="visual" className="text-[10px] gap-1"><Palette className="h-3 w-3" />Visuel</TabsTrigger>
                <TabsTrigger value="signature" className="text-[10px] gap-1"><Stamp className="h-3 w-3" />Signature</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-3">
                <TabsContent value="header" className="space-y-3 mt-0">
                  <div>
                    <Label className="text-xs">Nom du modèle</Label>
                    <Input
                      value={template.template_name || ''}
                      onChange={(e) => updateField('template_name', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Titre principal</Label>
                    <Input
                      value={template.header_title || ''}
                      onChange={(e) => updateField('header_title', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Organisation</Label>
                    <Input
                      value={template.header_organization || ''}
                      onChange={(e) => updateField('header_organization', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sous-titre</Label>
                    <Input
                      value={template.header_subtitle || ''}
                      onChange={(e) => updateField('header_subtitle', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Logo</Label>
                    <div className="flex gap-2 items-center">
                      {template.logo_url && (
                        <img src={template.logo_url} alt="Logo" className="h-8 w-8 object-contain border rounded" />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        className="h-8 text-xs"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadFile('logo_url', file);
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-3 mt-0">
                  <div>
                    <Label className="text-xs">Corps du certificat</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Première ligne = titre. Variables: {'{reference}'}, {'{beneficiaire}'}, {'{parcelle}'}, {'{date_emission}'}, {'{approuve_par}'}
                    </p>
                    <Textarea
                      value={template.body_text || ''}
                      onChange={(e) => updateField('body_text', e.target.value)}
                      className="text-xs min-h-[120px]"
                      rows={6}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Texte légal</Label>
                    <Textarea
                      value={template.legal_text || ''}
                      onChange={(e) => updateField('legal_text', e.target.value)}
                      className="text-xs min-h-[80px]"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pied de page</Label>
                    <Input
                      value={template.footer_text || ''}
                      onChange={(e) => updateField('footer_text', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="visual" className="space-y-3 mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Couleur primaire</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={template.primary_color || '#006432'}
                          onChange={(e) => updateField('primary_color', e.target.value)}
                          className="h-8 w-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={template.primary_color || '#006432'}
                          onChange={(e) => updateField('primary_color', e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Couleur secondaire</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={template.secondary_color || '#004020'}
                          onChange={(e) => updateField('secondary_color', e.target.value)}
                          className="h-8 w-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={template.secondary_color || '#004020'}
                          onChange={(e) => updateField('secondary_color', e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Afficher bordure</Label>
                      <Switch
                        checked={template.show_border ?? true}
                        onCheckedChange={(v) => updateField('show_border', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Afficher QR Code</Label>
                      <Switch
                        checked={template.show_qr_code ?? true}
                        onCheckedChange={(v) => updateField('show_qr_code', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Afficher cachet</Label>
                      <Switch
                        checked={template.show_stamp ?? true}
                        onCheckedChange={(v) => updateField('show_stamp', v)}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="signature" className="space-y-3 mt-0">
                  <div>
                    <Label className="text-xs">Titre du signataire</Label>
                    <Input
                      value={template.signature_title || ''}
                      onChange={(e) => updateField('signature_title', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nom du signataire</Label>
                    <Input
                      value={template.signature_name || ''}
                      onChange={(e) => updateField('signature_name', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Image de signature</Label>
                    <div className="flex gap-2 items-center">
                      {template.signature_image_url && (
                        <img src={template.signature_image_url} alt="Signature" className="h-6 object-contain border rounded" />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        className="h-8 text-xs"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadFile('signature_image_url', file);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Texte du cachet</Label>
                    <Textarea
                      value={template.stamp_text || ''}
                      onChange={(e) => updateField('stamp_text', e.target.value)}
                      className="text-xs"
                      rows={2}
                      placeholder="CERTIFIÉ&#10;CONFORME"
                    />
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Aperçu en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ScrollArea className="h-[480px]">
              <CertificatePreview template={template} />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

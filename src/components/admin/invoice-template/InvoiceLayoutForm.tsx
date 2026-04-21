import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceTemplate } from '@/contexts/InvoiceTemplateContext';

export const InvoiceLayoutForm = () => {
  const { config, loading, savingConfig, isConfigDirty, setConfigDraft, saveConfig, revertConfig } = useInvoiceTemplate();

  const handleSave = async () => {
    const ok = await saveConfig();
    if (ok) toast.success('Mise en page enregistrée');
    else toast.error('Erreur lors de la sauvegarde');
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Mise en page
          {isConfigDirty && <Badge variant="outline" className="text-warning border-warning">Modifications non enregistrées</Badge>}
        </CardTitle>
        <CardDescription>Couleurs, format par défaut, mentions et QR de vérification. Aperçu mis à jour en temps réel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Couleur principale (en-tête)</Label>
            <div className="flex gap-2">
              <Input type="color" value={config.header_color} onChange={(e) => setConfigDraft({ header_color: e.target.value })} className="w-20 h-11 p-1 cursor-pointer" />
              <Input value={config.header_color} onChange={(e) => setConfigDraft({ header_color: e.target.value })} placeholder="#dc2626" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Couleur secondaire</Label>
            <div className="flex gap-2">
              <Input type="color" value={config.secondary_color} onChange={(e) => setConfigDraft({ secondary_color: e.target.value })} className="w-20 h-11 p-1 cursor-pointer" />
              <Input value={config.secondary_color} onChange={(e) => setConfigDraft({ secondary_color: e.target.value })} placeholder="#1f2937" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Format par défaut</Label>
            <Select value={config.default_format} onValueChange={(v: 'a4' | 'mini') => setConfigDraft({ default_format: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4 (facture complète)</SelectItem>
                <SelectItem value="mini">Mini (reçu thermique)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Conditions de paiement</Label>
          <Textarea rows={2} value={config.payment_terms} onChange={(e) => setConfigDraft({ payment_terms: e.target.value })} />
          <p className="text-xs text-muted-foreground">Reprises dans la mention TVA du pied de page.</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base">QR code de vérification</Label>
            <p className="text-xs text-muted-foreground mt-1">Affiche le QR de vérification publique sur les factures.</p>
          </div>
          <Switch checked={config.show_verification_qr} onCheckedChange={(v) => setConfigDraft({ show_verification_qr: v })} />
        </div>

        {/* ===== PIED DE PAGE (MENTIONS LÉGALES) ===== */}
        <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
          <div>
            <h3 className="text-base font-semibold">Pied de page (mentions légales)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Personnalisez chaque ligne du bloc « MENTIONS LÉGALES (DGI) » affiché en bas des factures.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Texte d'introduction</Label>
            <Textarea
              rows={2}
              value={config.footer_intro_text}
              onChange={(e) => setConfigDraft({ footer_intro_text: e.target.value })}
              placeholder="Facture normalisée émise conformément…"
            />
            <p className="text-xs text-muted-foreground">
              Affiché uniquement si la mention DGI est activée (onglet Fiscalité).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Mention TVA</Label>
            <Textarea
              rows={2}
              value={config.footer_tva_mention}
              onChange={(e) => setConfigDraft({ footer_tva_mention: e.target.value })}
              placeholder="TVA appliquée au taux de {tva_rate}."
            />
            <p className="text-xs text-muted-foreground">
              Placeholder disponible : <code className="px-1 py-0.5 rounded bg-background border">{'{tva_rate}'}</code> (remplacé par le taux configuré). Les conditions de paiement sont concaténées à la suite.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
            <div>
              <Label className="text-sm">Afficher la ligne émetteur</Label>
              <p className="text-xs text-muted-foreground mt-1">NIF / RCCM / ID-NAT / régime fiscal de l'entreprise.</p>
            </div>
            <Switch
              checked={config.footer_show_emitter_line}
              onCheckedChange={(v) => setConfigDraft({ footer_show_emitter_line: v })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
            <div>
              <Label className="text-sm">Afficher le code de validation DGI</Label>
              <p className="text-xs text-muted-foreground mt-1">Ligne « Code de validation DGI : … » ou code de vérification.</p>
            </div>
            <Switch
              checked={config.footer_show_dgi_code}
              onCheckedChange={(v) => setConfigDraft({ footer_show_dgi_code: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>Ligne complémentaire libre</Label>
            <Textarea
              rows={2}
              value={config.footer_text}
              onChange={(e) => setConfigDraft({ footer_text: e.target.value })}
              placeholder="Merci pour votre confiance…"
            />
            <p className="text-xs text-muted-foreground">Dernière ligne du pied de page (laisser vide pour ne rien afficher).</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {isConfigDirty && (
            <Button variant="ghost" onClick={revertConfig} disabled={savingConfig}>
              <RotateCcw className="h-4 w-4 mr-2" />Annuler
            </Button>
          )}
          <Button onClick={handleSave} disabled={savingConfig || !isConfigDirty}>
            {savingConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceLayoutForm;

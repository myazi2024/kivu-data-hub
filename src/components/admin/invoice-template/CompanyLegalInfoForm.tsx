import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Upload, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceTemplate } from '@/contexts/InvoiceTemplateContext';

const TAX_REGIMES = [
  { value: 'reel', label: 'Régime du réel' },
  { value: 'forfaitaire', label: 'Régime forfaitaire' },
  { value: 'ipr', label: 'IPR' },
  { value: 'exonere', label: 'Exonéré' },
];

export const CompanyLegalInfoForm = () => {
  const { info, loading, savingInfo, isInfoDirty, setInfoDraft, saveInfo, revertInfo } = useInvoiceTemplate();
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    const ok = await saveInfo();
    if (ok) toast.success('Identité émetteur enregistrée');
    else toast.error('Erreur lors de la sauvegarde');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `invoice-template/logo-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('app-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('app-assets').getPublicUrl(path);
      setInfoDraft({ logo_url: pub.publicUrl });
      toast.success('Logo téléversé — pensez à enregistrer');
    } catch (err: any) {
      toast.error(err.message || 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Identité émetteur
          {isInfoDirty && <Badge variant="outline" className="text-warning border-warning">Modifications non enregistrées</Badge>}
        </CardTitle>
        <CardDescription>
          Informations légales utilisées dans toutes les factures. Aperçu mis à jour en temps réel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identité légale */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Identité légale</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Raison sociale *</Label>
              <Input value={info.legal_name || ''} onChange={(e) => setInfoDraft({ legal_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nom commercial</Label>
              <Input value={info.trade_name || ''} onChange={(e) => setInfoDraft({ trade_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Forme juridique</Label>
              <Input value={info.legal_form || ''} onChange={(e) => setInfoDraft({ legal_form: e.target.value })} placeholder="SARL, SA…" />
            </div>
            <div className="space-y-2">
              <Label>Capital social</Label>
              <Input value={info.capital_amount || ''} onChange={(e) => setInfoDraft({ capital_amount: e.target.value })} />
            </div>
          </div>
        </section>

        {/* Identifiants fiscaux */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Identifiants fiscaux</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>RCCM *</Label>
              <Input value={info.rccm || ''} onChange={(e) => setInfoDraft({ rccm: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>ID Nat *</Label>
              <Input value={info.id_nat || ''} onChange={(e) => setInfoDraft({ id_nat: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>NIF *</Label>
              <Input value={info.nif || ''} onChange={(e) => setInfoDraft({ nif: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>N° TVA</Label>
              <Input value={info.tva_number || ''} onChange={(e) => setInfoDraft({ tva_number: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Régime fiscal</Label>
              <Select value={info.tax_regime || 'reel'} onValueChange={(v) => setInfoDraft({ tax_regime: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAX_REGIMES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Adresse */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Adresse</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Adresse ligne 1 *</Label>
              <Input value={info.address_line1 || ''} onChange={(e) => setInfoDraft({ address_line1: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Adresse ligne 2</Label>
              <Input value={info.address_line2 || ''} onChange={(e) => setInfoDraft({ address_line2: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ville *</Label>
              <Input value={info.city || ''} onChange={(e) => setInfoDraft({ city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Province *</Label>
              <Input value={info.province || ''} onChange={(e) => setInfoDraft({ province: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Pays *</Label>
              <Input value={info.country || ''} onChange={(e) => setInfoDraft({ country: e.target.value })} />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={info.phone || ''} onChange={(e) => setInfoDraft({ phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={info.email || ''} onChange={(e) => setInfoDraft({ email: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Site web</Label>
              <Input value={info.website || ''} onChange={(e) => setInfoDraft({ website: e.target.value })} />
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Logo</h3>
          <div className="flex items-center gap-4">
            {info.logo_url && (
              <img src={info.logo_url} alt="Logo" className="h-16 w-16 object-contain border rounded" />
            )}
            <div className="space-y-2 flex-1">
              <Input value={info.logo_url || ''} onChange={(e) => setInfoDraft({ logo_url: e.target.value })} placeholder="URL ou téléversez un fichier" />
              <div>
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById('logo-upload')?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Téléverser un logo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Coordonnées bancaires */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Coordonnées bancaires</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banque</Label>
              <Input value={info.bank_name || ''} onChange={(e) => setInfoDraft({ bank_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>SWIFT / BIC</Label>
              <Input value={info.bank_swift || ''} onChange={(e) => setInfoDraft({ bank_swift: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>IBAN / Compte</Label>
              <Input value={info.bank_account || ''} onChange={(e) => setInfoDraft({ bank_account: e.target.value })} />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {isInfoDirty && (
            <Button variant="ghost" onClick={revertInfo} disabled={savingInfo}>
              <RotateCcw className="h-4 w-4 mr-2" />Annuler
            </Button>
          )}
          <Button onClick={handleSave} disabled={savingInfo || !isInfoDirty}>
            {savingInfo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyLegalInfoForm;

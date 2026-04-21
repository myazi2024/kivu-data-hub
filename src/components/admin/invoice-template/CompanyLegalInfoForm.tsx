import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { logAuditAction } from '@/utils/supabaseConfigUtils';
import type { CompanyLegalInfo } from '@/hooks/useCompanyLegalInfo';

const TAX_REGIMES = [
  { value: 'reel', label: 'Régime du réel' },
  { value: 'forfaitaire', label: 'Régime forfaitaire' },
  { value: 'ipr', label: 'IPR' },
  { value: 'exonere', label: 'Exonéré' },
];

type FormState = Partial<CompanyLegalInfo> & { is_active?: boolean };

export const CompanyLegalInfoForm = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('company_legal_info')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setForm({ ...(data as any) });
      setLoading(false);
    })();
  }, []);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form, is_active: true, updated_at: new Date().toISOString() };
      let res;
      if (form.id && form.id !== 'fallback') {
        res = await supabase.from('company_legal_info').update(payload).eq('id', form.id);
      } else {
        delete payload.id;
        res = await supabase.from('company_legal_info').insert(payload).select().single();
        if (res.data) setForm(res.data as any);
      }
      if (res.error) throw res.error;
      await logAuditAction('update_company_legal_info', 'company_legal_info', form.id, undefined, payload);
      toast.success('Identité émetteur enregistrée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
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
      setField('logo_url', pub.publicUrl);
      toast.success('Logo téléversé');
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
        <CardTitle>Identité émetteur</CardTitle>
        <CardDescription>
          Informations légales utilisées dans toutes les factures de l'application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identité légale */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Identité légale</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Raison sociale *</Label>
              <Input value={form.legal_name || ''} onChange={(e) => setField('legal_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nom commercial</Label>
              <Input value={form.trade_name || ''} onChange={(e) => setField('trade_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Forme juridique</Label>
              <Input value={form.legal_form || ''} onChange={(e) => setField('legal_form', e.target.value)} placeholder="SARL, SA…" />
            </div>
            <div className="space-y-2">
              <Label>Capital social</Label>
              <Input value={form.capital_amount || ''} onChange={(e) => setField('capital_amount', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Identifiants fiscaux */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Identifiants fiscaux</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>RCCM *</Label>
              <Input value={form.rccm || ''} onChange={(e) => setField('rccm', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ID Nat *</Label>
              <Input value={form.id_nat || ''} onChange={(e) => setField('id_nat', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>NIF *</Label>
              <Input value={form.nif || ''} onChange={(e) => setField('nif', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>N° TVA</Label>
              <Input value={form.tva_number || ''} onChange={(e) => setField('tva_number', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Régime fiscal</Label>
              <Select value={form.tax_regime || 'reel'} onValueChange={(v) => setField('tax_regime', v)}>
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
              <Input value={form.address_line1 || ''} onChange={(e) => setField('address_line1', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Adresse ligne 2</Label>
              <Input value={form.address_line2 || ''} onChange={(e) => setField('address_line2', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ville *</Label>
              <Input value={form.city || ''} onChange={(e) => setField('city', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Province *</Label>
              <Input value={form.province || ''} onChange={(e) => setField('province', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Pays *</Label>
              <Input value={form.country || ''} onChange={(e) => setField('country', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={form.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Site web</Label>
              <Input value={form.website || ''} onChange={(e) => setField('website', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">Logo</h3>
          <div className="flex items-center gap-4">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" className="h-16 w-16 object-contain border rounded" />
            )}
            <div className="space-y-2 flex-1">
              <Input value={form.logo_url || ''} onChange={(e) => setField('logo_url', e.target.value)} placeholder="URL ou téléversez un fichier" />
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
              <Input value={form.bank_name || ''} onChange={(e) => setField('bank_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>SWIFT / BIC</Label>
              <Input value={form.bank_swift || ''} onChange={(e) => setField('bank_swift', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>IBAN / Compte</Label>
              <Input value={form.bank_account || ''} onChange={(e) => setField('bank_account', e.target.value)} />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setField('is_active', v)} />
            <Label>Actif</Label>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyLegalInfoForm;

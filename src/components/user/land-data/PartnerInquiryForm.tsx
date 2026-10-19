import { useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ORGANIZATION_TYPES, PARTNER_DOCS_BUCKET, PartnerDoc, validatePartnerDocs } from '@/lib/partnerInquiry';

const EMPTY = { organization: '', organization_type: '', registration_number: '', address: '', city: '', website: '', contact_name: '', contact_role: '', phone: '', message: '' };

export function PartnerInquiryForm({ userId, defaultName, onDone }: { userId: string; defaultName?: string; onDone: () => void }) {
  const [f, setF] = useState({ ...EMPTY, contact_name: defaultName ?? '' });
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }));

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const err = validatePartnerDocs(picked, files.length);
    if (err) { toast.error(err); return; }
    setFiles(prev => [...prev, ...picked]);
  };

  const submit = async () => {
    if (f.organization.trim().length < 2) return toast.error('Indiquez le nom de l’organisation.');
    if (!f.organization_type) return toast.error('Choisissez le type d’organisation.');
    if (f.contact_name.trim().length < 2) return toast.error('Indiquez le nom de la personne de contact.');
    if (f.message.trim().length < 10) return toast.error('Décrivez votre demande (10 caractères minimum).');
    let website = f.website.trim();
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    website = website.replace(/^http:\/\//i, 'https://');

    setSending(true);
    const uploaded: PartnerDoc[] = [];
    try {
      for (const file of files) {
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(PARTNER_DOCS_BUCKET).upload(path, file, { upsert: false });
        if (error) throw new Error(`Envoi de ${file.name} impossible.`);
        uploaded.push({ path, name: file.name.slice(0, 255) });
      }
      const { error } = await (supabase as any).rpc('submit_partner_inquiry', {
        p_organization: f.organization, p_organization_type: f.organization_type,
        p_registration_number: f.registration_number, p_address: f.address, p_city: f.city,
        p_website: website, p_contact_name: f.contact_name, p_contact_role: f.contact_role,
        p_phone: f.phone, p_message: f.message, p_documents: uploaded,
      });
      if (error) throw new Error(error.message);
      toast.success('Demande envoyée. BIC vous répondra rapidement.');
      onDone();
    } catch (e: any) {
      if (uploaded.length) await supabase.storage.from(PARTNER_DOCS_BUCKET).remove(uploaded.map(u => u.path));
      toast.error(e?.message || 'Envoi impossible. Réessayez.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label>Organisation *</Label><Input maxLength={200} value={f.organization} onChange={set('organization')} /></div>
        <div className="space-y-1"><Label>Type d’organisation *</Label>
          <Select value={f.organization_type} onValueChange={v => setF(s => ({ ...s, organization_type: v }))}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>{Object.entries(ORGANIZATION_TYPES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>RCCM / N° d’identification</Label><Input maxLength={100} value={f.registration_number} onChange={set('registration_number')} /></div>
        <div className="space-y-1"><Label>Site web</Label><Input maxLength={300} placeholder="https://" value={f.website} onChange={set('website')} /></div>
        <div className="space-y-1"><Label>Adresse</Label><Input maxLength={300} value={f.address} onChange={set('address')} /></div>
        <div className="space-y-1"><Label>Ville</Label><Input maxLength={100} value={f.city} onChange={set('city')} /></div>
        <div className="space-y-1"><Label>Personne de contact *</Label><Input maxLength={200} value={f.contact_name} onChange={set('contact_name')} /></div>
        <div className="space-y-1"><Label>Fonction</Label><Input maxLength={100} value={f.contact_role} onChange={set('contact_role')} /></div>
        <div className="space-y-1"><Label>Téléphone</Label><Input maxLength={20} placeholder="+243 …" value={f.phone} onChange={set('phone')} /></div>
      </div>
      <div className="space-y-1"><Label>Présentation et besoins *</Label>
        <Textarea maxLength={5000} rows={4} value={f.message} onChange={set('message')} placeholder="Présentez votre organisation et vos besoins en données foncières" />
      </div>
      <div className="space-y-1">
        <Label>Documents justificatifs (RCCM, statuts, lettre de mandat…)</Label>
        <Input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={files.length >= 5}
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <p className="text-xs text-muted-foreground">5 fichiers max · PDF, JPG, PNG, WebP · 10 Mo chacun</p>
        {files.length > 0 && (
          <ul className="space-y-1">{files.map((file, i) => (
            <li key={i} className="flex items-center gap-2 rounded border px-2 py-1 text-xs">
              <Paperclip className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{file.name}</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Retirer" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button>
            </li>))}
          </ul>
        )}
      </div>
      <Button size="sm" onClick={submit} disabled={sending}>{sending ? 'Envoi…' : 'Envoyer la demande'}</Button>
    </div>
  );
}

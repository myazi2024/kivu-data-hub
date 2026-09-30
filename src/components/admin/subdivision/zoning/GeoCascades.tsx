import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getVillesForProvince, getCommunesForVille, getQuartiersForCommune, getAvenuesForQuartier,
  getTerritoiresForProvince, getCollectivitesForTerritoire,
} from '@/lib/geographicData';
import { NONE, type FormState, type FormSetter } from './zoningForm';

export const UrbanCascade: React.FC<{ form: FormState; setForm: FormSetter }> = ({ form, setForm }) => {
  const villes = useMemo(() => form.province ? getVillesForProvince(form.province) : [], [form.province]);
  const communes = useMemo(
    () => (form.province && form.ville) ? getCommunesForVille(form.province, form.ville) : [],
    [form.province, form.ville],
  );
  const quartiers = useMemo(
    () => (form.province && form.ville && form.commune) ? getQuartiersForCommune(form.province, form.ville, form.commune) : [],
    [form.province, form.ville, form.commune],
  );
  const avenues = useMemo(
    () => (form.province && form.ville && form.commune && form.quartier) ? getAvenuesForQuartier(form.province, form.ville, form.commune, form.quartier) : [],
    [form.province, form.ville, form.commune, form.quartier],
  );

  return (
    <>
      <div>
        <Label>Ville</Label>
        <Select
          value={form.ville || NONE}
          onValueChange={v => setForm(f => ({ ...f, ville: v === NONE ? '' : v, commune: '', quartier: '', avenue: '' }))}
          disabled={!form.province}
        >
          <SelectTrigger><SelectValue placeholder={form.province ? 'Toutes' : '— sélectionnez une province —'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Toutes les villes —</SelectItem>
            {villes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Commune</Label>
        <Select
          value={form.commune || NONE}
          onValueChange={v => setForm(f => ({ ...f, commune: v === NONE ? '' : v, quartier: '', avenue: '' }))}
          disabled={!form.ville}
        >
          <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Toutes les communes —</SelectItem>
            {communes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Quartier</Label>
        <Select
          value={form.quartier || NONE}
          onValueChange={v => setForm(f => ({ ...f, quartier: v === NONE ? '' : v, avenue: '' }))}
          disabled={!form.commune || quartiers.length === 0}
        >
          <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Tous les quartiers —</SelectItem>
            {quartiers.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Avenue</Label>
        <Select
          value={form.avenue || NONE}
          onValueChange={v => setForm(f => ({ ...f, avenue: v === NONE ? '' : v }))}
          disabled={!form.quartier || avenues.length === 0}
        >
          <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Toutes les avenues —</SelectItem>
            {avenues.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

export const RuralCascade: React.FC<{ form: FormState; setForm: FormSetter }> = ({ form, setForm }) => {
  const territoires = useMemo(() => form.province ? getTerritoiresForProvince(form.province) : [], [form.province]);
  const collectivites = useMemo(
    () => (form.province && form.territoire) ? getCollectivitesForTerritoire(form.province, form.territoire) : [],
    [form.province, form.territoire],
  );

  return (
    <>
      <div>
        <Label>Territoire</Label>
        <Select
          value={form.territoire || NONE}
          onValueChange={v => setForm(f => ({ ...f, territoire: v === NONE ? '' : v, collectivite: '', groupement: '', village: '' }))}
          disabled={!form.province}
        >
          <SelectTrigger><SelectValue placeholder={form.province ? 'Tous' : '— sélectionnez une province —'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Tous les territoires —</SelectItem>
            {territoires.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Collectivité</Label>
        <Select
          value={form.collectivite || NONE}
          onValueChange={v => setForm(f => ({ ...f, collectivite: v === NONE ? '' : v, groupement: '', village: '' }))}
          disabled={!form.territoire}
        >
          <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Toutes les collectivités —</SelectItem>
            {collectivites.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* Groupement et village ne sont pas dans la base statique : saisie libre */}
      <div>
        <Label>Groupement</Label>
        <Input
          value={form.groupement}
          onChange={e => setForm(f => ({ ...f, groupement: e.target.value, village: '' }))}
          placeholder="Optionnel"
          disabled={!form.collectivite}
        />
      </div>
      <div>
        <Label>Village</Label>
        <Input
          value={form.village}
          onChange={e => setForm(f => ({ ...f, village: e.target.value }))}
          placeholder="Optionnel"
          disabled={!form.groupement}
        />
      </div>
    </>
  );
};

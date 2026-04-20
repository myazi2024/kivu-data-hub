

## Fix — Boutons CTA non fonctionnels sur `/partnership`

### Problème

Dans `src/pages/Partnership.tsx`, les deux boutons du bloc CTA final n'ont aucun handler :
- « Envoyer une proposition » → aucun `onClick`, aucun `href`
- « Nous appeler » → aucun `onClick`, aucun `href`

### Correction

Transformer les deux `<Button>` en liens natifs via `asChild` + `<a>` :

| Bouton | Action |
|---|---|
| Envoyer une proposition | `mailto:contact@bic.cd?subject=Proposition de partenariat&body=Bonjour,%0D%0A%0D%0AJe souhaite explorer une opportunité de partenariat avec le BIC...` |
| Nous appeler | `tel:+243XXXXXXXXX` (numéro à confirmer — utiliser celui déjà présent dans `Footer.tsx` pour cohérence) |

Implémentation dans `src/pages/Partnership.tsx` (bloc CTA final, ~ligne 295) :

```tsx
<Button size="lg" asChild className="flex items-center gap-2">
  <a href={`mailto:${CONTACT_EMAIL}?subject=...&body=...`}>
    <Mail className="h-4 w-4" />
    Envoyer une proposition
  </a>
</Button>
<Button variant="outline" size="lg" asChild className="flex items-center gap-2">
  <a href={`tel:${CONTACT_PHONE}`}>
    <Phone className="h-4 w-4" />
    Nous appeler
  </a>
</Button>
```

### Question préalable

Avant d'implémenter, je vais récupérer l'email et le téléphone exacts depuis `Footer.tsx` pour garantir la cohérence inter-pages (un seul numéro/email officiel BIC sur tout le site). Si aucun n'y figure, j'utiliserai des placeholders documentés (`contact@bic.cd`, `+243 000 000 000`) que vous pourrez remplacer.

### Fichier touché

| Fichier | Action |
|---|---|
| `src/pages/Partnership.tsx` | Ajout `asChild` + `<a href="mailto:…">` / `<a href="tel:…">` sur les 2 boutons CTA |

### Hors périmètre

- Pas de formulaire de contact embarqué (out of scope, demande simple)
- Pas de modification du `Footer` ni d'autres pages
- Pas de nouvelle table BD

### Validation attendue

- Clic sur « Envoyer une proposition » → ouvre le client mail par défaut avec sujet/corps pré-remplis
- Clic sur « Nous appeler » → ouvre l'app téléphone (mobile) ou propose l'app d'appel (desktop)


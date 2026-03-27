

# Fix banniere "Mode test" et revue du catalogue de services

## Problemes identifies

### 1. Banniere "Mode test" affichee meme quand le mode test est inactif
`usePaymentConfig` initialise `bypass_payment: true` par defaut (L28). Tant que la config DB n'est pas chargee, la banniere s'affiche. Et meme apres chargement, si aucune config n'existe en base, le defaut reste `bypass_payment: true`. Resultat : la banniere "🧪 Mode test — Acces gratuit aux services" est toujours visible.

### 2. Presentation trop voyante
L'utilisateur veut une indication discrete "Mode test" en petit dans le coin inferieur, pas une banniere prominente en haut.

### 3. Divergences supplementaires detectees

| Divergence | Fichier | Detail |
|-----------|---------|--------|
| Defaut `bypass_payment: true` | `usePaymentConfig.tsx` L28 | Doit etre `false` — le bypass ne doit etre actif que si explicitement configure par l'admin |
| Toast "mode test" avant chargement config | `useCadastralPayment.tsx` L138 | Peut afficher "mode test" meme si le mode test n'est pas active |
| Bouton affiche "Acceder aux services" au lieu de "Payer" | `CadastralBillingPanel.tsx` L574 | Consequence du `bypass_payment: true` par defaut |

---

## Plan de corrections (3 fichiers)

### Correction 1 — Defaut `bypass_payment` a `false` (`usePaymentConfig.tsx`)

Changer l'etat initial L28 de `bypass_payment: true` a `bypass_payment: false`. Ainsi, tant que la config admin n'est pas chargee, le systeme se comporte en mode production (paiement requis). Le bypass ne s'active que si l'admin l'a explicitement configure.

### Correction 2 — Banniere discrete en bas (`CadastralBillingPanel.tsx`)

- **Supprimer** les 2 blocs de bannieres prominentes (L273-289) — `bypass_payment` et `test_mode`
- **Ajouter** en bas du `CardContent`, juste avant la fermeture, un petit texte discret conditionnel :

```tsx
{(paymentMode.bypass_payment || paymentMode.test_mode) && (
  <p className="text-[10px] text-muted-foreground/60 text-right mt-1">
    Mode test
  </p>
)}
```

Pas d'emoji, pas de banniere coloree — juste un indicateur minimal en bas a droite.

### Correction 3 — Toast aligne sur la config reelle (`useCadastralPayment.tsx`)

Le toast L138 est deja conditionne au `bypass_payment` — avec le fix du defaut a `false`, il ne s'affichera plus quand le mode test n'est pas active. Aucun changement de code necessaire ici.

---

## Resume

| Correction | Fichier | Impact |
|-----------|---------|--------|
| Defaut `bypass_payment: false` | `usePaymentConfig.tsx` | Elimine le faux positif mode test |
| Banniere → texte discret en bas | `CadastralBillingPanel.tsx` | UX alignee avec la demande |
| **Total** | **2 fichiers** | |


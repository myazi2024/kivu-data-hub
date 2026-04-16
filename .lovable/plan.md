

# Auto-masquage des onglets sur mobile au repos

## Objectif

Quand le curseur est inactif (3 secondes), en plus des filtres et du curseur qui disparaissent déjà, les onglets sur mobile doivent se réduire pour ne montrer que les icônes (pas les labels texte), et la barre de défilement verticale doit disparaître, laissant plus de place aux visuels.

## Approche

Réutiliser la classe `cursor-none` déjà ajoutée sur `document.body` comme signal d'inactivité, plutôt que de dupliquer la logique de timer.

## Fichier modifié

**`src/components/visualizations/ProvinceDataVisualization.tsx`**

### 1. Détecter l'état idle via la classe `cursor-none`

Ajouter un state `isIdle` qui écoute les mutations de classe sur `document.body` via `MutationObserver` :

```tsx
const [isIdle, setIsIdle] = useState(false);

useEffect(() => {
  const observer = new MutationObserver(() => {
    setIsIdle(document.body.classList.contains('cursor-none'));
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}, []);
```

### 2. Réduire la sidebar onglets en mode idle (mobile uniquement)

- Largeur : passer de `w-20 sm:w-24` à `w-8` quand idle
- Labels texte : masquer avec `hidden` quand idle
- Icônes : toujours afficher (retirer `hidden lg:block`, ajouter affichage permanent)
- Scrollbar : ajouter `overflow-hidden` quand idle
- Transition fluide sur la largeur

### 3. Changements concrets dans le JSX (lignes 120-144)

**Conteneur sidebar :**
```tsx
<div className={`${isIdle ? 'w-8' : 'w-20 sm:w-24'} lg:w-full shrink-0 
  border-r lg:border-r-0 lg:border-b border-border/40 bg-background 
  ${isIdle ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'} 
  lg:overflow-y-hidden lg:overflow-x-auto scrollbar-hide 
  transition-all duration-300`}>
```

**Bouton onglet :**
```tsx
{IconComp && <IconComp className="h-3 w-3 shrink-0" />}
{!isIdle && <span>{tab.label}</span>}
```

L'icône est toujours visible, le label texte disparaît au repos. Sur desktop (`lg:`), rien ne change.

## Résultat

| État | Sidebar mobile | Contenu |
|------|---------------|---------|
| Actif | Icônes + labels (w-20) | Normal |
| Idle | Icônes seules (w-8) | Plus large, plus immersif |

Un seul fichier modifié.




# Refonte du menu Media — Navigation principale

## Constat actuel

Le menu "Media" dans la navigation ne contient que 2 sous-items :
- Articles (`/articles`)
- Kiosque (`/publications`)

C'est effectivement minimaliste. Le site possède pourtant plusieurs pages de contenu qui ne sont accessibles que via le Footer ou pas du tout depuis la nav principale : **À propos**, **Services**, **Partenariat**, **Mentions légales**, **À propos CCC**, **Codes de remise**.

## Proposition : Menu Mega-Nav structuré par catégories

Remplacer le dropdown simple par un **mega-menu** organisé en colonnes thématiques, toujours via le composant `NavigationMenuContent` de shadcn/ui.

```text
┌─────────────────────────────────────────────────────────┐
│  Media                                                   │
├──────────────┬──────────────────┬────────────────────────┤
│  Actualités  │  Ressources      │  À propos              │
│  ─────────── │  ──────────────  │  ─────────────────     │
│  📰 Articles │  📚 Kiosque      │  🏢 À propos du BIC    │
│  📢 Blog     │  📋 Nos Services │  🤝 Partenariat        │
│              │  🎟️ Codes Promo  │  ⚖️ Mentions légales   │
│              │  📖 À propos CCC │                        │
└──────────────┴──────────────────┴────────────────────────┘
```

## Plan d'implémentation

### 1. Restructurer les données de navigation (`navigation.tsx`)

Remplacer le tableau `subItems` plat par une structure à colonnes avec icones et descriptions :

```ts
{
  name: 'Media',
  columns: [
    {
      title: 'Actualités',
      items: [
        { name: 'Articles', href: '/articles', icon: Newspaper, description: 'Analyses et actualités foncières' },
      ]
    },
    {
      title: 'Ressources',
      items: [
        { name: 'Kiosque', href: '/publications', icon: BookOpen, description: 'Publications et documents' },
        { name: 'Nos Services', href: '/services', icon: Briefcase, description: 'Catalogue des services cadastraux' },
        { name: 'Codes Promo', href: '/discount-codes', icon: Tag, description: 'Codes de réduction disponibles' },
        { name: 'Contributions CCC', href: '/about-ccc', icon: Heart, description: 'Comprendre les contributions' },
      ]
    },
    {
      title: 'À propos',
      items: [
        { name: 'Le BIC', href: '/about', icon: Building2, description: 'Notre mission et notre équipe' },
        { name: 'Partenariat', href: '/partnership', icon: Handshake, description: 'Devenir partenaire' },
        { name: 'Mentions légales', href: '/legal', icon: Scale, description: 'CGU et politique de confidentialité' },
      ]
    }
  ]
}
```

### 2. Construire le mega-menu desktop

Dans le `NavigationMenuContent`, remplacer la simple `ul` par une grille à 3 colonnes. Chaque item affiche : icone, nom, et description courte en texte muted. Largeur du panneau : `w-[550px]`.

### 3. Adapter le menu mobile

Remplacer le toggle `mediaMenuOpen` unique par un accordion ou une liste groupée par section (Actualités / Ressources / À propos), avec les icones et la même structure.

### 4. Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/components/ui/navigation.tsx` | Refonte complète de la structure `navigation[]`, du rendu desktop mega-menu, et du rendu mobile accordion |

Un seul fichier à modifier.


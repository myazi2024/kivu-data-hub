

# Refonte complète — Présentation BIC en mode slides

## Concept

Transformer la page `/pitch-partenaires` en une **présentation interactive multi-slides** (style PowerPoint) avec navigation par pages, mode plein écran, contenu riche tiré des fonctionnalités réelles de l'application, et visuels intégrés (images assets existantes, icones, schémas CSS).

## Architecture

```text
┌──────────────────────────────────────┐
│  PitchPartenaires.tsx (orchestrateur) │
│  - state: currentSlide, isFullscreen │
│  - navigation clavier (←→, Esc, F)  │
│  - barre de navigation bas/overlay   │
│  - bouton plein écran               │
│  - indicateur de slide (dots)        │
│                                      │
│  ┌─ Slide 1: Couverture            │
│  ├─ Slide 2: Le Contexte (problème) │
│  ├─ Slide 3: La Solution BIC       │
│  ├─ Slide 4: Carte interactive     │
│  ├─ Slide 5: Services numériques   │
│  ├─ Slide 6: Recherche cadastrale  │
│  ├─ Slide 7: Vérification foncière │
│  ├─ Slide 8: Programme CCC         │
│  ├─ Slide 9: Chiffres clés        │
│  ├─ Slide 10: Business model       │
│  ├─ Slide 11: Partenaires actuels  │
│  ├─ Slide 12: Témoignages          │
│  ├─ Slide 13: Environnement test   │
│  └─ Slide 14: Contact / CTA       │
└──────────────────────────────────────┘
```

## Slides - Contenu détaillé

1. **Couverture** : Logo BIC, titre "Bureau d'Information Cadastrale", sous-titre "Le cadastre congolais, enfin numérique", image hero-skyline en fond
2. **Le Contexte** : Problèmes fonciers en RDC — registres papier, 70% litiges, pas de base centralisée, fraude aux titres. Visuels : icones avec stats chocs
3. **La Solution BIC** : Plateforme numérique centralisée — 4 piliers avec icones grandes et descriptions. Image territorial-map-illustration en fond
4. **Carte interactive des 26 provinces** : Visuel de la carte DRC (image map-data-visualization.jpg), description de l'analytique par province, données en temps réel
5. **8 Services numériques** : Grille des 8 services réels (recherche cadastrale, carte interactive, titre foncier, expertise, mutation, litiges, hypothèque, historique fiscal) avec icones
6. **Recherche cadastrale** : Focus sur la fonctionnalité phare — recherche par parcelle, propriétaire, localisation. Filtres avancés, historique de recherche. Visuel mockup
7. **Vérification & Certificats** : QR code anti-fraude, vérification instantanée des documents, 6 types de documents (rapport, facture, permis, certificat, expertise, reçu hypothécaire)
8. **Programme Contributeur (CCC)** : Contribution citoyenne aux données cadastrales, codes promo, réductions. Gamification foncière
9. **Chiffres clés** : 50 000+ parcelles, 26 provinces, -60% litiges, < 5 min vérification, 8 services, 4 types de partenariats. Grandes stats visuelles
10. **Business Model** : 4 modèles (institutionnel, commercial, académique, technologique) avec détails tirés de Partnership.tsx
11. **Partenaires actuels** : Université de Goma, Ville de Goma, Actors of Change — avec descriptions
12. **Témoignages** : Citations notaire et architecte, visuels quotes
13. **Démo live** : Lien vers environnement test `/test/map`, placeholder vidéo, screenshots
14. **Contact & CTA** : Formulaire de contact intégré, téléphone, email, boutons d'action

## Fonctionnalités UI

- **Navigation** : Flèches gauche/droite en overlay, dots indicateurs en bas, clavier (← → pour naviguer, F pour fullscreen, Esc pour quitter)
- **Mode plein écran** : Bouton toggle, utilise l'API Fullscreen du navigateur. En fullscreen : masque Navigation/Footer, fond sombre, slide centré
- **Transitions** : Animation slide-in horizontale entre les pages (CSS transition transform)
- **Responsive** : Contenu adapté mobile (textes plus petits, layouts en colonnes)
- **Barre de progression** : Fine barre en haut indiquant la progression
- **Visuels** : Utilisation des 5 images assets existantes (hero-skyline, map-data-visualization, territorial-map-illustration, goma-city-hero, bic-logo)

## Fichier modifie

| Fichier | Action |
|---|---|
| `src/pages/PitchPartenaires.tsx` | Réécriture complète |


# Accueil mobile plein écran, icône logo, accès Administration

## 1. Accueil sur mobile (moins de 768 px)
- La barre du haut (logo + nom) et le pied de page sont masqués uniquement sur la page Accueil, en mobile.
- La barre de navigation du bas reste visible : c'est le seul moyen de naviguer.
- Le contenu (titre, recherche, boutons, partenaires) est resserré pour tenir sur une hauteur d'écran (`100dvh` moins la barre du bas), sans défilement, testé à 360×592 et 393×495.
- Desktop inchangé.

## 2. Icône « Accueil » = logo
- Dans la barre du bas, l'icône maison est remplacée par le logo de l'application (celui défini dans l'apparence admin), en version réduite et ronde.
- Inactif : logo légèrement atténué (grisé). Actif : logo en pleine couleur avec un léger zoom, comme les autres icônes.
- Si aucun logo n'est configuré, on garde l'icône maison.

## 3. « Administration » déplacée dans l'espace utilisateur (mobile et desktop)
- Retrait du bouton « Admin » de la barre du haut (desktop), du menu mobile et de la feuille « Médias » de la barre du bas.
- Ajout d'une entrée « Administration » dans le menu de l'espace utilisateur, visible seulement pour admin / super_admin, qui ouvre `/admin`.
- Le badge « Admin » à côté du nom reste (simple indication, pas un lien).
- L'accès à `/admin` reste protégé côté serveur comme aujourd'hui.

## Détails techniques
- `navigation.tsx` : prop/détection `pathname === '/'` → `max-md:hidden` sur l'en-tête ; suppression des liens `/admin`.
- `Index.tsx` : `Footer` enveloppé dans `hidden md:block` ; conteneur mobile `h-[calc(100dvh-var(--bottom-nav-h))] overflow-hidden`, ajustements d'espacement dans `HeroSection`/`PartnersSection` via classes `max-md:`.
- `MobileBottomNav.tsx` : rendu `<img src={appearanceConfig.logo_url}>` pour l'entrée Accueil (fallback `Home`), suppression du lien Administration.
- `userDashboardConfig.ts` + `UserDashboard.tsx` : entrée conditionnelle par rôle, navigation vers `/admin`.
- Vérification Playwright aux tailles mobiles et desktop.

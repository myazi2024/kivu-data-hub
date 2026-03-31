

# Réécriture de la page "Partenariats Stratégiques"

## Objectif
Réécrire intégralement le contenu et améliorer le design de `src/pages/Partnership.tsx` pour refléter fidèlement le contexte du BIC : plateforme cadastrale numérique en RDC, basée à Goma, dans un secteur foncier marqué par la fragmentation des données et les conflits.

## Modifications dans `src/pages/Partnership.tsx`

### 1. Hero Section — Texte enrichi
- Nouveau sous-titre contextuel expliquant pourquoi les partenariats sont essentiels dans le secteur foncier congolais (fragmentation institutionnelle, besoin de mutualisation des données, enjeux de gouvernance foncière).

### 2. Section "Pourquoi devenir partenaire du BIC ?" (nouvelle)
Bannière avec 4 chiffres/arguments clés en grille horizontale :
- Accès à une base cadastrale numérisée unique
- Contribution à la réduction des litiges fonciers
- Intégration technologique (API, cartographie, données structurées)
- Visibilité auprès des acteurs du foncier en RDC

### 3. Types de partenariats — Contenu enrichi
Conserver les 4 catégories mais avec des descriptions détaillées et professionnelles :

| Type | Description enrichie | Avantages détaillés |
|------|---------------------|---------------------|
| **Institutionnel** | Collaboration avec les administrations foncières (conservation foncière, cadastre, urbanisme), les collectivités territoriales et les organismes de coopération. Le BIC fournit un socle de données numériques exploitable pour la planification urbaine, la fiscalité foncière locale et la prévention des conflits. | Accès aux données cadastrales structurées par entité administrative · Tableaux de bord statistiques personnalisés · Assistance technique à la numérisation des archives foncières · Formations sur la plateforme |
| **Commercial** | Intégration des services du BIC dans les solutions des acteurs privés : cabinets notariaux, agences immobilières, institutions financières, assureurs. Accès via API aux données de vérification foncière (titres, hypothèques, litiges). | API REST d'interrogation cadastrale · Vérification automatisée des hypothèques et servitudes · Données de valorisation immobilière · Modèle de licence adapté au volume |
| **Académique** | Collaboration avec les universités et centres de recherche sur les problématiques foncières, urbaines et territoriales. Le BIC met à disposition des jeux de données anonymisés et un environnement de recherche structuré. | Accès aux données anonymisées pour la recherche · Co-encadrement de mémoires et thèses · Publications conjointes · Participation aux colloques et séminaires |
| **Technologique** | Alliance avec les entreprises technologiques spécialisées en géomatique, SIG, télédétection ou blockchain foncière. Co-développement d'outils innovants pour la sécurisation et la traçabilité des transactions foncières. | Co-développement de modules cartographiques · Intégration d'imagerie satellite · Expérimentation de registres fonciers distribués · Expansion vers de nouvelles provinces |

### 4. Partenaires actuels — Descriptions enrichies
Étoffer les descriptions des 3 partenaires existants avec un texte de 2 lignes précisant la nature concrète de la collaboration.

### 5. Processus "Comment devenir partenaire" — Textes enrichis
Conserver les 4 étapes mais avec des descriptions plus détaillées et professionnelles.

### 6. CTA final — Texte enrichi
Réécrire le texte d'appel à l'action avec un paragraphe plus complet sur les bénéfices mutuels.

### 7. Améliorations design
- Hero : fond dégradé subtil `bg-gradient-to-b from-primary/5 to-transparent` avec un sous-titre plus long
- Cards de types de partenariat : bordure gauche colorée (`border-l-4 border-primary`) pour un effet plus structuré
- Section processus : connecteurs visuels entre les étapes (ligne horizontale en `hidden md:block`)
- Partenaires actuels : icône avatar avec initiale plus grande, card avec hover effect

### Détails techniques
- Fichier unique : `src/pages/Partnership.tsx`
- Mêmes dépendances (lucide-react, shadcn components)
- Ajout de l'icône `CheckCircle` pour les listes d'avantages


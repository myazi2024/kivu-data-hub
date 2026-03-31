

# Réécriture de la page "Mentions Légales"

## Objectif
Enrichir le contenu juridique de `src/pages/Legal.tsx` avec un texte détaillé, professionnel et adapté au contexte d'une plateforme cadastrale numérique opérant en RDC.

## Modifications dans `src/pages/Legal.tsx`

### 1. Hero Section
- Sous-titre enrichi mentionnant le cadre juridique congolais et la nature de la plateforme.

### 2. Informations sur l'Entreprise — Enrichi
- Ajouter : nature de l'activité (plateforme numérique d'information cadastrale), numéro RCCM si applicable, hébergeur du site (mention obligatoire).

### 3. Conditions d'Utilisation — Contenu détaillé

| Sous-section | Contenu enrichi |
|---|---|
| **Objet** | Nouvelle sous-section définissant l'objet des CGU : encadrer l'accès et l'utilisation de la plateforme BIC, ses services de recherche cadastrale, cartographie interactive, vérification d'hypothèques, etc. |
| **Accès au site** | Préciser les conditions d'inscription, les services gratuits vs payants, la capacité juridique requise de l'utilisateur. |
| **Utilisation des données cadastrales** | Détailler le caractère informatif (non opposable juridiquement) des données fournies. Interdictions précises : scraping, extraction automatisée, revente, dénaturation. Mention que les données cadastrales restent la propriété de l'État congolais. |
| **Propriété intellectuelle** | Préciser que le code source, l'architecture de la base de données, les algorithmes de traitement et les interfaces graphiques sont protégés. Mention des licences tierces (OpenStreetMap, Mapbox). |
| **Responsabilité** | Clause détaillée : le BIC agit en qualité d'intermédiaire technique, les données proviennent de sources officielles et communautaires, aucune garantie d'exhaustivité. Exclusion de responsabilité en cas de décision prise sur la base des données sans vérification auprès des autorités compétentes. |
| **Disponibilité du service** | Nouvelle sous-section : engagement raisonnable de disponibilité, maintenance, force majeure. |

### 4. Protection des Données Personnelles — Enrichi

| Sous-section | Contenu enrichi |
|---|---|
| **Base légale** | Référence à la loi congolaise (Loi n° 20/017 du 25 novembre 2020 relative aux télécommunications et TIC, dispositions sur la protection des données). |
| **Collecte** | Détailler les types de données collectées : identité, coordonnées, données de navigation, données de géolocalisation pour la carte interactive, historique de recherches cadastrales. |
| **Finalités** | Liste étendue : gestion de compte, fourniture de services, analyses statistiques anonymisées, amélioration de la plateforme, communication institutionnelle. |
| **Conservation** | Nouvelle sous-section : durées de conservation selon le type de données (compte actif + 2 ans, logs de navigation 12 mois, données de transaction selon obligations légales). |
| **Transfert** | Nouvelle sous-section : les données sont hébergées sur des serveurs sécurisés, pas de transfert vers des pays tiers sans garanties appropriées. |
| **Droits** | Enrichir avec la procédure concrète d'exercice des droits (délai de réponse 30 jours, pièce d'identité requise). |
| **Sécurité** | Détailler : chiffrement SSL/TLS, authentification sécurisée, sauvegardes régulières, contrôle d'accès par rôles. |

### 5. Cookies — Section enrichie
- Types de cookies détaillés : essentiels (authentification, session), analytiques (mesure d'audience), fonctionnels (préférences de carte, langue).
- Durée de conservation des cookies.
- Modalités de refus et conséquences.

### 6. Nouvelles sections

**Droit applicable et juridiction compétente** : Les présentes mentions sont régies par le droit congolais. Tout litige sera soumis aux juridictions compétentes de Goma, Nord-Kivu, RDC.

**Modification des mentions légales** : Le BIC se réserve le droit de modifier les présentes à tout moment. Les utilisateurs seront informés via la plateforme.

### 7. Améliorations design
- Ajout d'icônes `Cookie`, `Gavel`, `Clock` de lucide-react pour les nouvelles sections.
- Numérotation des articles pour un aspect plus juridique (Article 1, Article 2...).
- Table des matières cliquable en haut de page avec ancres vers chaque section.

### Détails techniques
- Fichier unique : `src/pages/Legal.tsx`
- Mêmes dépendances (lucide-react, shadcn)
- Ajout de `useRef` ou `id` pour les ancres de navigation interne


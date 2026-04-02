

# Plan de correction de la Présentation BIC

## Rappel des 6 points identifiés lors de l'audit

1. **Formats de parcelle fictifs** dans le mockup recherche (Slide 6)
2. **Fiche cadastrale absente** de la présentation
3. **Routes fonctionnelles non mentionnées** (dashboard, reseller, carte)
4. **Contenu manquant** : Equipe/Fondateurs, Roadmap/Vision, Tarification, Securite
5. **Statistiques non sourcées** (50 000+, -60%)
6. **Formulaire de contact simulé** (setTimeout, pas d'envoi réel)

---

## Modifications prévues

### 1. Corriger les formats de parcelle (Slide 6 — SlideSearch, ligne 220)

Remplacer les exemples fictifs `KIN/GOMBE/AV.COLONEL/P-2847` par les vrais formats BIC :
- `SU/2130/KIN`
- `SR/01/0987/BEN`
- `SU/0456/GOM`

### 2. Ajouter un slide "Fiche Cadastrale" (nouveau — SlideFicheCadastrale)

Nouveau slide entre Recherche (6) et Verification (7) montrant un mockup visuel de la fiche cadastrale avec :
- Croquis SVG de la parcelle
- Coordonnees GPS et dimensions des cotes
- QR code d'authenticite
- Badge litige
- Sections : propriete, historique fiscal, hypotheques, bornage

### 3. Ajouter un slide "Roadmap & Vision" (nouveau — SlideRoadmap)

Nouveau slide apres Business Model (10) avec 3 phases :
- Phase 1 : Goma & Nord-Kivu (actuel)
- Phase 2 : Extension Kinshasa & 5 provinces
- Phase 3 : Couverture nationale 26 provinces + API publique

### 4. Ajouter un slide "Equipe" (nouveau — SlideTeam)

Nouveau slide apres Roadmap, presentant les profils cles du projet (placeholders generiques : Fondateur/CEO, Directeur Technique, Responsable Operations, Responsable Partenariats).

### 5. Ajouter un slide "Tarification" (nouveau — SlidePricing)

Nouveau slide apres Team, avec les modeles de revenus :
- Recherche unitaire (par consultation)
- Abonnement mensuel/annuel (acces illimite)
- API commerciale (par appel)
- Commissions sur services (mutations, expertises)

### 6. Ajouter un slide "Securite & Conformite" (nouveau — SlideSecurity)

Nouveau slide apres Pricing, couvrant :
- Chiffrement des donnees (TLS, RLS Supabase)
- Conformite legislation RDC
- Audit trail complet
- Donnees communautaires verifiees

### 7. Corriger les statistiques (Slide 9 — SlideStats)

- `50 000+` → `1 000+` avec mention "objectif 2026 : 50 000" (plus realiste pour un projet en phase initiale)
- `-60%` → remplacer par `100%` + "Traçabilité des mutations" (impact verifiable)

### 8. Connecter le formulaire de contact (Slide Contact)

Remplacer le `setTimeout` simulé par un insert Supabase dans une nouvelle table `partner_inquiries` (ou a defaut, un appel a une edge function d'envoi d'email). Si la table n'existe pas, creer une migration.

---

## Ordre final des slides (14 → 20)

| # | ID | Titre |
|---|---|---|
| 1 | cover | Couverture |
| 2 | context | Le Contexte |
| 3 | solution | La Solution |
| 4 | map | Carte interactive |
| 5 | services | 8 Services numeriques |
| 6 | search | Recherche cadastrale |
| 7 | **fiche** | **Fiche Cadastrale** |
| 8 | verification | Verification & Certificats |
| 9 | ccc | Programme CCC |
| 10 | stats | Chiffres cles (corrigés) |
| 11 | business | Business Model |
| 12 | **roadmap** | **Roadmap & Vision** |
| 13 | **team** | **Equipe** |
| 14 | **pricing** | **Tarification** |
| 15 | **security** | **Securite & Conformite** |
| 16 | partners | Partenaires actuels |
| 17 | testimonials | Temoignages |
| 18 | demo | Demo |
| 19 | contact | Contact (formulaire fonctionnel) |

## Fichiers concernes

| Fichier | Action |
|---|---|
| `src/pages/PitchPartenaires.tsx` | Tous les ajouts/corrections de slides |
| Migration SQL (nouvelle) | Table `partner_inquiries` pour le formulaire |


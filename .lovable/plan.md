

# Espace RH dans l'Administration

## Évaluation des besoins en personnel

Basée sur l'analyse complète de l'application (cadastre, services fonciers, paiements, litiges, hypothèques, certificats, publications, partenariats), voici l'organigramme recommandé :

```text
┌─────────────────────────────────────────────────────┐
│                DIRECTION GÉNÉRALE (1)                │
├─────────────┬──────────────┬────────────┬───────────┤
│  TECHNIQUE  │  OPÉRATIONS  │ COMMERCIAL │  SUPPORT  │
│    (4-5)    │    (3-4)     │   (2-3)    │   (2-3)   │
└─────────────┴──────────────┴────────────┴───────────┘
```

**Équipe Technique (4-5 personnes)** : Lead Dev Full-Stack, Dev Frontend React, Dev Backend/Supabase, DevOps/SRE, UX/UI Designer

**Équipe Opérations (3-4)** : Responsable Cadastre, Agent de validation, Gestionnaire foncier, Analyste données

**Équipe Commerciale (2-3)** : Responsable Partenariats, Chargé marketing digital, Community Manager

**Équipe Support (2-3)** : Responsable Support Client, Agent support N1, Formateur utilisateurs

**Total estimé : 12-16 personnes** pour une gestion optimale.

---

## Plan technique — Module RH Admin

### 1. Nouveau composant `AdminHR.tsx`

Composant principal avec onglets internes :
- **Organigramme** : Vue hiérarchique des départements et postes
- **Employés** : Liste, fiches détaillées, statuts (actif/congé/parti)
- **Recrutement** : Offres d'emploi pré-rédigées, suivi candidatures
- **Congés & Présences** : Calendrier, demandes, soldes
- **Évaluations** : Fiches de performance, objectifs
- **Documents RH** : Contrats, bulletins, attestations

### 2. Sous-composants

| Composant | Rôle |
|---|---|
| `AdminHRDashboard.tsx` | Vue d'ensemble RH (effectifs, postes ouverts, congés en cours) |
| `AdminHREmployees.tsx` | CRUD employés avec fiches détaillées |
| `AdminHRRecruitment.tsx` | Offres d'emploi pré-rédigées + suivi candidatures |
| `AdminHRLeaves.tsx` | Gestion congés et présences |
| `AdminHRPerformance.tsx` | Évaluations et objectifs |
| `AdminHROrgChart.tsx` | Organigramme visuel interactif |
| `AdminHRDocuments.tsx` | Gestion documents RH |

### 3. Données — Tables Supabase (via config JSON)

Comme l'app utilise `map_preview_settings` pour stocker des configurations, le module RH utilisera le même pattern avec une table de config + des données locales gérées en state. Les offres d'emploi seront pré-rédigées en dur dans le code (12 offres correspondant aux postes identifiés).

Structure des données employés et candidatures stockées via `upsertSearchConfig` dans la table existante `search_config` avec des clés dédiées (`hr_employees`, `hr_job_offers`, `hr_leaves`, etc.).

### 4. Offres d'emploi pré-rédigées (12 postes)

Chaque offre comprendra : titre, département, type de contrat, description du poste, missions principales, compétences requises, niveau d'expérience, rémunération indicative, et statut (ouvert/pourvu/en pause).

### 5. Intégration dans l'admin

- Ajouter la catégorie **"Ressources Humaines"** dans `AdminSidebar.tsx` avec les entrées : Dashboard RH, Employés, Recrutement, Congés, Évaluations, Organigramme, Documents
- Ajouter les lazy imports et cases dans `Admin.tsx`

### Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `src/components/admin/hr/AdminHRDashboard.tsx` | Créer — Dashboard RH |
| `src/components/admin/hr/AdminHREmployees.tsx` | Créer — Gestion employés |
| `src/components/admin/hr/AdminHRRecruitment.tsx` | Créer — Recrutement + offres pré-rédigées |
| `src/components/admin/hr/AdminHRLeaves.tsx` | Créer — Congés et présences |
| `src/components/admin/hr/AdminHRPerformance.tsx` | Créer — Évaluations |
| `src/components/admin/hr/AdminHROrgChart.tsx` | Créer — Organigramme |
| `src/components/admin/hr/AdminHRDocuments.tsx` | Créer — Documents RH |
| `src/components/admin/hr/hrData.ts` | Créer — Données statiques (postes, offres d'emploi) |
| `src/components/admin/AdminSidebar.tsx` | Modifier — Ajouter catégorie RH |
| `src/pages/Admin.tsx` | Modifier — Ajouter lazy imports + routing |


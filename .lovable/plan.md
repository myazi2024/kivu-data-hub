

# Phase 2 — Fonctionnalites avancees du module RH

Phase 1 (fondations) est complete : tables Supabase, hooks CRUD, composants persistants. Voici le plan pour Phase 2.

## Portee

5 chantiers principaux :

### 1. Dashboard enrichi avec graphiques
- Ajouter des graphiques Recharts au dashboard : repartition par departement (pie chart), evolution des effectifs, repartition des salaires
- KPIs supplementaires : taux de turnover, ratio H/F, anciennete moyenne par departement
- Section alertes : documents expiries, contrats arrivant a echeance, periodes d'essai en cours

### 2. Evaluations completes avec objectifs SMART
- Ajouter un formulaire d'objectifs dans le dialogue de creation d'evaluation (titre, description, progression %, statut)
- Afficher la progression des objectifs par employe avec barres de progression
- Permettre l'edition des evaluations existantes (actuellement manquant)
- Historique comparatif par employe (evolution des scores)

### 3. Pipeline de recrutement
- Nouvelle table `hr_candidates` (nom, email, poste_id, statut pipeline, score, notes, CV)
- Pipeline visuel par etapes : Candidature → Preselecton → Entretien → Offre → Embauche
- Scoring et notes par candidat
- Conversion candidat → employe

### 4. Documents avec upload reel
- Creer un bucket Supabase Storage `hr-documents` (prive)
- Integrer l'upload de fichiers dans le formulaire de documents
- Telecharger les fichiers via URLs signees
- Indicateurs visuels pour documents expires ou bientot expires

### 5. Export CSV
- Boutons d'export sur chaque onglet (employes, conges, evaluations)
- Utiliser l'utilitaire `exportRecordsToCSV` existant

## Fichiers impactes

**Nouvelles migrations :**
- Table `hr_candidates` + RLS
- Bucket storage `hr-documents` + policies

**Nouveaux fichiers :**
- `src/hooks/useHRCandidates.ts`
- `src/components/admin/hr/AdminHRCandidatePipeline.tsx`

**Fichiers modifies :**
- `AdminHRDashboard.tsx` — graphiques Recharts + alertes
- `AdminHRPerformance.tsx` — objectifs SMART, edition, historique
- `AdminHRRecruitment.tsx` — integration pipeline candidats
- `AdminHRDocuments.tsx` — upload/download fichiers
- `AdminHREmployees.tsx` — bouton export CSV
- `AdminHRLeaves.tsx` — bouton export CSV
- `AdminHR.tsx` — eventuel nouvel onglet pipeline

## Ordre d'implementation

1. Migration (table candidates + bucket storage)
2. Dashboard graphiques + KPIs
3. Evaluations avec objectifs SMART
4. Pipeline recrutement + hook candidats
5. Upload documents
6. Exports CSV


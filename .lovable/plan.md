

# Audit détaillé — Module Espace RH : Fonctionnalités absentes

## Constat global

Le module RH actuel est un **prototype fonctionnel minimal** avec 7 onglets (Dashboard, Employés, Recrutement, Congés, Évaluations, Organigramme, Documents). Toutes les données sont en **état local** (useState) — aucune persistance, tout est perdu au rechargement. Voici les fonctionnalités absentes identifiées par domaine.

---

## 1. Gestion des employés — Lacunes

| Absent | Impact |
|--------|--------|
| Pas de modification/édition d'un employé existant | Impossible de corriger une erreur ou mettre à jour un poste |
| Pas de suppression d'employé | Aucun moyen de retirer un doublon |
| Pas de fiche détaillée employé (vue complète) | On ne voit que nom/poste/badge dans la liste |
| Pas de champ salaire/rémunération | Impossible de gérer la paie |
| Pas d'historique de carrière (promotions, mutations) | Aucun suivi d'évolution |
| Pas de gestion des compétences/formations | Pas de plan de développement |
| Pas de pièce jointe (photo, CV, diplômes) | Pas de dossier complet |
| Pas de numéro matricule | Identification RH manquante |
| Pas de date de naissance / informations personnelles | Données démographiques absentes |
| Pas de contact d'urgence | Obligation légale non couverte |
| Pas d'export CSV/PDF de la liste | Pas de reporting |

## 2. Congés & Absences — Lacunes

| Absent | Impact |
|--------|--------|
| Pas de solde de congés par employé | On ne sait pas combien de jours il reste |
| Pas de calendrier visuel des absences | Vue d'ensemble impossible |
| Pas de calcul automatique du nombre de jours | Calcul manuel requis |
| Pas de types de congé "paternity" distinct | Maternité et paternité groupés |
| Pas de workflow de validation multi-niveaux | Un seul clic approuve, pas de chaîne manager → DRH |
| Pas d'historique des congés passés par employé | Aucun suivi individuel |
| Pas de notification à l'employé (approbation/refus) | Pas de feedback |
| Pas de gestion des jours fériés | Pas de calendrier officiel |

## 3. Évaluations / Performance — Lacunes

| Absent | Impact |
|--------|--------|
| Pas de gestion des objectifs (SMART) | On crée une évaluation sans objectifs mesurables |
| Pas de suivi de progression des objectifs | Le champ `objectives` existe dans le type mais jamais rempli |
| Pas d'auto-évaluation par l'employé | Processus unilatéral |
| Pas de cycle d'évaluation configurable (annuel, semestriel) | Pas de cadre temporel |
| Pas de compétences évaluées individuellement | Une seule note globale |
| Pas de plan d'amélioration / PIP | Pas de suivi post-évaluation |
| Pas d'historique comparatif (évolution d'une période à l'autre) | Pas de courbe de progression |
| Pas d'édition/suppression d'une évaluation existante | Erreurs irréversibles |

## 4. Recrutement — Lacunes

| Absent | Impact |
|--------|--------|
| Impossible de créer/modifier/supprimer une offre d'emploi | Les 12 offres sont hardcodées dans `hrData.ts` |
| Pas de gestion des candidatures | Aucun pipeline candidat |
| Pas de suivi d'entretiens | Pas de planning entretiens |
| Pas de scoring/notation des candidats | Évaluation non structurée |
| Pas de conversion candidat → employé | Workflow incomplet |
| Pas de publication externe (lien partageable) | Offres internes uniquement |
| Pas de statistiques de recrutement | Pas de time-to-hire, coût par embauche |

## 5. Dashboard — Lacunes

| Absent | Impact |
|--------|--------|
| Pas de graphiques/tendances (turnover, absences, recrutement) | Dashboard purement numérique |
| Pas de taux de turnover | KPI RH fondamental manquant |
| Pas d'ancienneté moyenne | Pas de vue sur la stabilité |
| Pas de masse salariale | Pas de vision financière RH |
| Pas d'alertes (contrats arrivant à expiration, périodes d'essai) | Pas de proactivité |
| Pas de ratio homme/femme (diversité) | Pas de suivi D&I |

## 6. Documents — Lacunes

| Absent | Impact |
|--------|--------|
| Pas d'upload de fichier réel | On crée une fiche sans document attaché |
| Pas de téléchargement | Le bouton Download existe dans l'import mais n'est pas utilisé |
| Pas de catégorisation avancée | Pas de filtre par type de document |
| Pas de date d'expiration / renouvellement | Pas de suivi des contrats/visas/certifications |
| Pas de signature électronique | Processus papier |

## 7. Transversal — Lacunes critiques

| Absent | Impact |
|--------|--------|
| **Aucune persistance (Supabase)** | Toutes les données sont perdues au rechargement |
| Pas de gestion de la paie (bulletins, historique) | Domaine RH entier manquant |
| Pas de gestion des formations | Plan de développement absent |
| Pas de gestion des sanctions/mesures disciplinaires | Workflow légal manquant |
| Pas de gestion des contrats (durée, renouvellement, fin) | Pas de suivi contractuel |
| Pas de gestion des heures/pointage (time tracking) | Pas de suivi du temps de travail |
| Pas de reporting/export global | Aucun rapport RH exportable |
| Pas de rôles/permissions dans le module RH | Tout le monde voit tout |
| Pas d'audit trail (qui a modifié quoi) | Pas de traçabilité |

---

## Plan d'implémentation proposé (par priorité)

### Phase 1 — Fondations (prioritaire)
1. **Persistance Supabase** : Créer les tables `hr_employees`, `hr_leave_requests`, `hr_reviews`, `hr_documents`, `hr_job_positions` avec RLS
2. **CRUD complet Employés** : Ajouter édition, suppression, fiche détaillée, matricule, salaire, contact d'urgence
3. **CRUD Recrutement** : Permettre la création/modification/suppression d'offres (au lieu du hardcodé)
4. **Solde de congés** : Ajouter le suivi du solde par employé avec calcul automatique des jours

### Phase 2 — Fonctionnalités avancées
5. **Dashboard enrichi** : Graphiques turnover, ancienneté, répartition, alertes
6. **Évaluations complètes** : Objectifs SMART, compétences, auto-évaluation
7. **Pipeline recrutement** : Candidatures, entretiens, scoring, conversion
8. **Documents avec upload** : Intégration Supabase Storage, téléchargement, expiration

### Phase 3 — Fonctions RH avancées
9. **Gestion de la paie** : Grille salariale, bulletins, historique
10. **Formations** : Catalogue, inscriptions, suivi
11. **Contrats** : Types, durées, renouvellements, alertes expiration
12. **Reporting** : Export PDF/CSV, tableaux de bord avancés

---

## Fichiers impactés

- **Nouveaux** : ~5 migrations Supabase, hooks `useHREmployees`, `useHRLeaves`, etc.
- **Modifiés** : Tous les 8 fichiers dans `src/components/admin/hr/` + `hrData.ts`
- **Volume estimé** : Important — chaque phase est un chantier significatif

Souhaitez-vous que je commence par la Phase 1 (persistance + CRUD complet), ou préférez-vous cibler des fonctionnalités spécifiques ?


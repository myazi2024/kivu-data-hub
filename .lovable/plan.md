

# Ajout des permissions "Données foncières" dans la base

## Constat

La table `permissions` contient 13 ressources (analytics, audit_logs, cadastral_parcels, contributions, discount_codes, expertise_requests, invoices, land_titles, mortgage_cancellation, payments, roles, subdivision_requests, users), mais aucune pour les **données foncières** — c'est-à-dire l'accès aux informations détaillées des parcelles (propriétaires, coordonnées GPS, documents, historiques) accessibles via `/map` et la fiche cadastrale.

## Solution

Insérer via une migration SQL une nouvelle ressource `property_data` avec 4 permissions CRUD :

| resource_name | action_name | display_name | description |
|---|---|---|---|
| property_data | read | Consulter les données foncières | Permet de consulter les informations détaillées des parcelles (propriétaires, surfaces, coordonnées) |
| property_data | export | Exporter les données foncières | Permet d'exporter les fiches cadastrales et rapports fonciers |
| property_data | read_pii | Accéder aux données personnelles | Permet d'accéder aux données personnelles identifiables (noms, téléphones, documents) des propriétaires |
| property_data | read_history | Consulter l'historique foncier | Permet de consulter l'historique des mutations et transactions d'une parcelle |

## Détails techniques

**Fichier** : nouvelle migration SQL via Supabase

```sql
INSERT INTO permissions (resource_name, action_name, display_name, description) VALUES
  ('property_data', 'read', 'Consulter les données foncières', 'Permet de consulter les informations détaillées des parcelles'),
  ('property_data', 'export', 'Exporter les données foncières', 'Permet d''exporter les fiches cadastrales et rapports'),
  ('property_data', 'read_pii', 'Accéder aux données personnelles', 'Permet d''accéder aux données personnelles identifiables des propriétaires'),
  ('property_data', 'read_history', 'Consulter l''historique foncier', 'Permet de consulter l''historique des mutations et transactions');
```

Ces permissions apparaitront automatiquement dans la matrice de l'AdminPermissions sans modification du code frontend.


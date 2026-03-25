

# Audit du service Gestion Hypotheque — Divergences et optimisations

## Problemes identifies

### 1. VERIFICATION DE DOUBLON INCOMPLETE (bug)

`MortgageFormDialog.tsx` L204-215 : `checkExistingPending()` ne filtre que `.in('status', ['pending'])` mais le message d'erreur dit "deja en cours ou renvoyee pour correction". Les demandes avec statut `returned` ne sont pas detectees, permettant de soumettre un doublon pendant qu'une demande renvoyee existe deja.

Meme probleme dans `MortgageCancellationDialog.tsx` L284-297.

**Correction** : Ajouter `'returned'` au filtre `.in('status', ['pending', 'returned'])` dans les deux composants.

### 2. REDONDANCE CCC : DONNEES HYPOTHECAIRES NON PRE-REMPLIES

Le formulaire CCC collecte deja les hypotheques (montant, cre


# Fix: Colonne manquante `is_title_in_current_owner_name`

## Problème

Le générateur de données test tente d'insérer `is_title_in_current_owner_name` dans `cadastral_contributions`, mais cette colonne n'existe pas dans la base de données.

## Solution

Créer une migration SQL pour ajouter la colonne :

```sql
ALTER TABLE public.cadastral_contributions
ADD COLUMN IF NOT EXISTS is_title_in_current_owner_name BOOLEAN;
```

Aucune modification de code nécessaire — le générateur et les formulaires utilisent déjà ce champ.


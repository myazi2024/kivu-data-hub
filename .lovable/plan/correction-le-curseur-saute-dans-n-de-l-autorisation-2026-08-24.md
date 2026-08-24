# Correction : le curseur saute dans « N° de l'autorisation »

## Cause confirmée

Dans le bloc « Autorisation de bâtir » (onglet Localisation), chaque carte d'autorisation utilise une clé React dérivée du numéro saisi :

`src/components/cadastral/ccc-tabs/shared/ConstructionSection.tsx:487`

```
key={permit.permitNumber ? `permit-${permit.permitNumber}` : `permit-idx-${index}`}
```

À chaque caractère tapé, la clé change, React détruit et recrée la carte entière, le champ perd le focus — d'où l'obligation de recliquer après chaque lettre.

## Correctif

Rendre la clé stable et indépendante de la saisie :
- utiliser l'identifiant stable de l'autorisation s'il existe (`id`), sinon `permit-idx-${index}` ;
- même vérification sur les autres listes du bloc Construction (constructions additionnelles, propriétaires, taxes) pour s'assurer qu'aucune autre clé ne dépend d'une valeur saisie ; corriger le cas échéant.

Aucun changement de logique métier, de validation ou de base de données : uniquement la clé de rendu des listes.

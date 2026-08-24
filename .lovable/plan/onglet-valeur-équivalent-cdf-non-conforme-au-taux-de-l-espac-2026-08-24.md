# Onglet Valeur : équivalent CDF non conforme au taux de l'espace admin

## Ce qui a été vérifié

- Table `currency_config` : USD = 1 (référence), CDF = 2850, les deux actives. C'est bien la source lue par l'onglet Valeur et par l'écran admin « Configuration des devises ».
- L'onglet Valeur convertit via le hook `useCurrencyConfig` (`convertFromUsd(montant, 'CDF')`).

## Deux causes identifiées

1. **Le taux n'est pas rafraîchi après une modification en admin.** Le hook s'abonne aux changements temps réel de `currency_config`, mais cette table n'est pas publiée dans `supabase_realtime` : l'abonnement ne reçoit jamais rien. Un taux modifié dans l'admin n'est donc pris en compte qu'après un rechargement complet de la page ; entre-temps l'onglet Valeur affiche l'ancien taux.

2. **Repli à 1 pendant le chargement.** Tant que la liste des devises n'est pas chargée (ou en cas d'erreur réseau), `convertFromUsd` ne trouve pas CDF et applique un taux de 1 : l'équivalent affiché est alors identique au montant en dollars. Le repli 2850 existe ailleurs dans le fichier mais n'est pas utilisé par cet affichage.

## Correctifs

- Publier `currency_config` dans la publication temps réel afin que l'abonnement existant fonctionne et que tout changement de taux en admin se propage immédiatement aux formulaires ouverts.
- Rendre la conversion robuste : ne rien afficher tant que les devises ne sont pas chargées (plutôt qu'un équivalent faux), et utiliser le taux de repli connu si la devise est absente de la liste.
- Utiliser le même chemin de conversion pour les deux affichages d'équivalent de l'onglet (prix de revente et montant d'expertise).

## Détail technique

- Migration : `ALTER PUBLICATION supabase_realtime ADD TABLE public.currency_config;`
- `src/hooks/useCurrencyConfig.ts` : exposer `loading` déjà présent + garantir que `convertFromUsd` retourne `undefined` (au lieu d'un taux 1 implicite) quand la devise demandée est inconnue.
- `src/components/cadastral/ccc-tabs/MarketValueTab.tsx` (`equivalent`, l. 95-103) : masquer la ligne d'équivalent tant que `loading` est vrai ou que le taux est indisponible ; s'appuyer sur `cdfRate` en repli.

Aucun changement de logique métier ni de schéma de données.

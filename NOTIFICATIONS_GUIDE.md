# Guide des Notifications Système - BIC

## Vue d'ensemble

Le système de notifications du Bureau d'Information Cadastrale (BIC) assure la communication cohérente entre le back-end admin et les utilisateurs front-end pour tous les événements liés aux indicateurs cadastraux.

## Architecture

### Base de données

**Table: `notifications`**
```sql
- id: UUID (PK)
- user_id: UUID (FK -> profiles.user_id)
- title: TEXT (requis, max 100 caractères)
- message: TEXT (requis, max 500 caractères)
- type: ENUM ('info', 'success', 'warning', 'error')
- is_read: BOOLEAN (défaut: false)
- action_url: TEXT (optionnel)
- created_at: TIMESTAMP
- read_at: TIMESTAMP (nullable)
```

### Composants Front-end

1. **NotificationBell** (`src/components/user/NotificationBell.tsx`)
   - Affichage des notifications utilisateur
   - Badge de compteur non lu
   - Popover avec liste scrollable
   - Temps réel via Supabase Realtime
   - Action sur clic (URL ou marquage comme lu)

2. **AdminNotifications** (`src/components/admin/AdminNotifications.tsx`)
   - Envoi de notifications (tous les utilisateurs ou spécifique)
   - Historique des notifications envoyées
   - Gestion (consultation, suppression)
   - Statistiques par type

### Hooks

**useNotifications** (`src/hooks/useNotifications.tsx`)
```typescript
const {
  notifications,      // Liste des notifications
  unreadCount,        // Nombre de non lues
  loading,            // État de chargement
  fetchNotifications, // Récupérer les notifications
  markAsRead,         // Marquer comme lu
  markAllAsRead,      // Tout marquer comme lu
  deleteNotification  // Supprimer une notification
} = useNotifications();
```

## Types de Notifications

### 1. Notifications Info (type: 'info')
- **Couleur**: Bleu
- **Icône**: Bell
- **Usage**: Informations générales, nouvelles fonctionnalités
- **Exemple**: "Nouvelle fonctionnalité de visualisation 3D disponible"

### 2. Notifications Succès (type: 'success')
- **Couleur**: Vert
- **Icône**: CheckCircle
- **Usage**: Confirmations, validations réussies
- **Exemple**: "Votre contribution cadastrale a été approuvée. Code CCC: CCC-12345"

### 3. Notifications Avertissement (type: 'warning')
- **Couleur**: Jaune
- **Icône**: AlertCircle
- **Usage**: Alertes non critiques, actions requises
- **Exemple**: "Votre code CCC expire dans 7 jours"

### 4. Notifications Erreur (type: 'error')
- **Couleur**: Rouge
- **Icône**: AlertCircle
- **Usage**: Erreurs, rejets, blocages
- **Exemple**: "Votre contribution a été rejetée: informations incomplètes"

## Événements Déclencheurs

### Événements Cadastraux

| Événement | Type | Déclencheur |
|-----------|------|-------------|
| Contribution CCC approuvée | success | Changement status → 'approved' |
| Contribution CCC rejetée | error | Changement status → 'rejected' |
| Code CCC généré | success | Insertion dans cadastral_contributor_codes |
| Code CCC expiré | warning | Trigger journalier (expires_at < now) |
| Facture payée | success | Changement invoice status → 'paid' |
| Facture échouée | error | Changement invoice status → 'failed' |
| Accès service accordé | info | Insertion dans cadastral_service_access |
| Compte bloqué | error | profiles.is_blocked → true |
| Tentative de fraude détectée | warning | fraud_score >= 50 |

### Notifications Admin

| Action Admin | Notification Utilisateur |
|--------------|-------------------------|
| Approuver contribution | "Votre contribution a été validée" (success) |
| Rejeter contribution | "Votre contribution a été rejetée: [raison]" (error) |
| Générer code CCC | "Vous avez reçu un code CCC de [valeur] USD" (success) |
| Bloquer utilisateur | "Votre compte a été suspendu: [raison]" (error) |
| Modifier prix service | "Les tarifs des services cadastraux ont été mis à jour" (info) |

## Triggers Automatiques

### 1. Trigger sur Contribution Approuvée
```sql
CREATE OR REPLACE FUNCTION notify_contribution_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW.user_id,
      'Contribution approuvée',
      'Votre contribution pour la parcelle ' || NEW.parcel_number || ' a été validée. Votre code CCC sera généré sous peu.',
      'success',
      '/tableau-de-bord?tab=contributions'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_contribution_approved
AFTER UPDATE ON cadastral_contributions
FOR EACH ROW
EXECUTE FUNCTION notify_contribution_approved();
```

### 2. Trigger sur Code CCC Généré
```sql
CREATE OR REPLACE FUNCTION notify_ccc_code_generated()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url)
  VALUES (
    NEW.user_id,
    'Code CCC généré',
    'Vous avez reçu un code CCC d''une valeur de ' || NEW.value_usd || ' USD valable jusqu''au ' || 
    TO_CHAR(NEW.expires_at, 'DD/MM/YYYY') || '. Code: ' || NEW.code,
    'success',
    '/tableau-de-bord?tab=codes'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ccc_code_generated
AFTER INSERT ON cadastral_contributor_codes
FOR EACH ROW
EXECUTE FUNCTION notify_ccc_code_generated();
```

### 3. Trigger sur Expiration Imminente (Job quotidien)
```sql
-- À exécuter quotidiennement via pg_cron ou edge function
INSERT INTO notifications (user_id, title, message, type, action_url)
SELECT 
  user_id,
  'Code CCC expirant bientôt',
  'Votre code ' || code || ' expire dans ' || 
  EXTRACT(day FROM expires_at - NOW()) || ' jour(s). Utilisez-le avant le ' ||
  TO_CHAR(expires_at, 'DD/MM/YYYY'),
  'warning',
  '/myazi?tab=codes'
FROM cadastral_contributor_codes
WHERE is_used = false 
  AND is_valid = true
  AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND expires_at::date = (NOW() + INTERVAL '7 days')::date;
```

## Intégration dans les Composants

### Envoi de Notifications Toast (temporaires)
```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

// Succès
toast({
  title: "Opération réussie",
  description: "Votre recherche cadastrale a été effectuée"
});

// Erreur
toast({
  title: "Erreur",
  description: "Impossible de charger les données",
  variant: "destructive"
});
```

### Alertes de Confirmation
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
      <AlertDialogDescription>
        Êtes-vous sûr de vouloir continuer ?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Annuler</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>
        Confirmer
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Popovers d'Information
```typescript
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="sm">
      <Info className="h-4 w-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="space-y-2">
      <h4 className="font-semibold">Information</h4>
      <p className="text-sm text-muted-foreground">
        Détails sur cette fonctionnalité...
      </p>
    </div>
  </PopoverContent>
</Popover>
```

## Validation de Cohérence

Le système de validation (`src/utils/cadastralValidation.ts`) vérifie:

### 1. Intégrité des Notifications
- Nombre total de notifications
- Répartition par type (info, success, warning, error)
- Notifications non lues
- Notifications orphelines (utilisateurs supprimés)

### 2. Cohérence avec Événements
- Chaque contribution approuvée → notification envoyée
- Chaque code CCC généré → notification envoyée
- Chaque facture payée → notification envoyée

### 3. Tests de Validation

Pour lancer la validation complète:
1. Accéder à l'admin: `/admin`
2. Onglet "Validation"
3. Cliquer sur "Lancer la validation"
4. Vérifier les résultats:
   - ✓ Notifications système: cohérent
   - ✓ Cohérence Notifications/Événements: validé

## Bonnes Pratiques

### DO ✅
- Toujours spécifier un titre et un message clairs
- Utiliser le type approprié (info/success/warning/error)
- Inclure une URL d'action quand pertinent
- Valider la longueur des textes (titre ≤100, message ≤500)
- Tester les notifications en environnement de dev
- Envoyer des notifications pour chaque événement critique

### DON'T ❌
- Ne pas spammer les utilisateurs avec trop de notifications
- Ne pas utiliser "error" pour de simples informations
- Ne pas oublier de tester les URLs d'action
- Ne pas envoyer de notifications sans contexte clair
- Ne pas inclure de données sensibles dans les messages
- Ne pas créer de notifications sans vérifier l'existence de l'utilisateur

## Sécurité

### RLS Policies
```sql
-- Les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent marquer leurs notifications comme lues
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Seul le système peut créer des notifications
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);
```

### Validation des Données
- Titre: max 100 caractères, requis
- Message: max 500 caractères, requis
- Type: enum ('info', 'success', 'warning', 'error')
- URL d'action: optionnel, format URL valide
- user_id: doit exister dans profiles

## Maintenance

### Nettoyage Automatique
Supprimer les notifications lues de plus de 30 jours:
```sql
DELETE FROM notifications
WHERE is_read = true 
  AND read_at < NOW() - INTERVAL '30 days';
```

### Monitoring
- Nombre de notifications non lues par utilisateur
- Taux de lecture des notifications
- Notifications les plus fréquentes
- Temps moyen de lecture

## Support

Pour toute question ou problème:
- Consulter la validation système (Admin → Validation)
- Vérifier les logs Supabase
- Tester avec le hook `useNotifications`
- Contacter l'équipe technique BIC

---

**Dernière mise à jour**: 2025-01-XX
**Version**: 1.0.0
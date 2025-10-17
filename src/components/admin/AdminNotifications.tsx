import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, Send, Trash2, Eye, Check, AlertCircle } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

interface User {
  user_id: string;
  email: string;
  full_name?: string;
}

export const AdminNotifications: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  
  // Formulaire pour nouvelle notification
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    action_url: '',
    target: 'all' as 'all' | 'specific'
  });

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          profiles!notifications_user_id_fkey (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications(data as any || []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des notifications:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
    }
  };

  const sendNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast({
        title: 'Champs obligatoires',
        description: 'Le titre et le message sont requis',
        variant: 'destructive',
      });
      return;
    }

    if (newNotification.target === 'specific' && !selectedUserId) {
      toast({
        title: 'Utilisateur requis',
        description: 'Veuillez sélectionner un utilisateur',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      if (newNotification.target === 'all') {
        // Envoyer à tous les utilisateurs
        const notificationsToInsert = users.map(user => ({
          user_id: user.user_id,
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          action_url: newNotification.action_url || null,
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notificationsToInsert);

        if (error) throw error;

        toast({
          title: 'Notifications envoyées',
          description: `${users.length} notification(s) envoyée(s) avec succès`,
        });
      } else {
        // Envoyer à un utilisateur spécifique
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: selectedUserId,
            title: newNotification.title,
            message: newNotification.message,
            type: newNotification.type,
            action_url: newNotification.action_url || null,
          });

        if (error) throw error;

        toast({
          title: 'Notification envoyée',
          description: 'La notification a été envoyée avec succès',
        });
      }

      // Réinitialiser le formulaire
      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        action_url: '',
        target: 'all'
      });
      setSelectedUserId('');
      
      // Rafraîchir la liste
      fetchNotifications();
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Notification supprimée',
        description: 'La notification a été supprimée avec succès',
      });

      fetchNotifications();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setNotificationToDelete(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulaire d'envoi de notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Envoyer une notification
          </CardTitle>
          <CardDescription>
            Envoyer des notifications système aux utilisateurs concernant les services cadastraux
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Destinataires</Label>
              <Select
                value={newNotification.target}
                onValueChange={(value: 'all' | 'specific') => 
                  setNewNotification({ ...newNotification, target: value })
                }
              >
                <SelectTrigger id="target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  <SelectItem value="specific">Utilisateur spécifique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newNotification.target === 'specific' && (
              <div className="space-y-2">
                <Label htmlFor="user">Utilisateur</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Sélectionnez un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={newNotification.type}
                onValueChange={(value: any) => 
                  setNewNotification({ ...newNotification, type: value })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="success">Succès</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                  <SelectItem value="error">Erreur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={newNotification.title}
              onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
              placeholder="Ex: Nouvelle fonctionnalité disponible"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={newNotification.message}
              onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
              placeholder="Ex: Le nouveau service de visualisation 3D des parcelles est maintenant disponible"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="action_url">URL d'action (optionnel)</Label>
            <Input
              id="action_url"
              value={newNotification.action_url}
              onChange={(e) => setNewNotification({ ...newNotification, action_url: e.target.value })}
              placeholder="/myazi ou https://exemple.com"
            />
          </div>

          <Button onClick={sendNotification} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer la notification
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Liste des notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Historique des notifications ({notifications.length})
          </CardTitle>
          <CardDescription>
            Gérer et consulter toutes les notifications système envoyées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune notification envoyée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(notification as any).profiles?.full_name || (notification as any).profiles?.email || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getTypeColor(notification.type)} flex items-center gap-1 w-fit`}>
                          {getTypeIcon(notification.type)}
                          {notification.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {notification.title}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {notification.message}
                      </TableCell>
                      <TableCell>
                        {notification.is_read ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Eye className="mr-1 h-3 w-3" />
                            Lu
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Non lu
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNotificationToDelete(notification.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!notificationToDelete} onOpenChange={() => setNotificationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette notification ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La notification sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => notificationToDelete && deleteNotification(notificationToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
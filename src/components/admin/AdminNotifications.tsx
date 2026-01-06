import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bell, Send, Trash2, Eye, Search, Download } from 'lucide-react';
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
  ResponsiveTable,
  ResponsiveTableBody,
  ResponsiveTableCell,
  ResponsiveTableHead,
  ResponsiveTableHeader,
  ResponsiveTableRow,
} from '@/components/ui/responsive-table';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { StatusBadge, StatusType } from '@/components/shared/StatusBadge';
import { exportToCSV } from '@/utils/csvExport';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  profiles?: {
    user_id: string;
    email: string;
    full_name?: string;
  };
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
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('_all');
  const [statusFilter, setStatusFilter] = useState<string>('_all');
  
  // Formulaire pour nouvelle notification
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    action_url: '',
    target: 'all' as 'all' | 'specific'
  });

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const matchesSearch = 
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === '_all' || notification.type === typeFilter;
      const matchesStatus = statusFilter === '_all' || 
        (statusFilter === 'read' && notification.is_read) ||
        (statusFilter === 'unread' && !notification.is_read);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [notifications, searchQuery, typeFilter, statusFilter]);

  // Pagination
  const pagination = usePagination(filteredNotifications, { initialPageSize: 15 });

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Date', 'Utilisateur', 'Type', 'Titre', 'Message', 'Statut'];
    const data = filteredNotifications.map(n => [
      format(new Date(n.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
      n.profiles?.full_name || n.profiles?.email || 'N/A',
      n.type,
      n.title,
      n.message,
      n.is_read ? 'Lu' : 'Non lu'
    ]);
    exportToCSV({ filename: 'notifications.csv', headers, data });
  };

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch notifications without limit
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;

      // Fetch profiles separately to get user details
      const userIds = [...new Set(notifData?.map(n => n.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const enrichedNotifications: Notification[] = (notifData?.map(notif => ({
        ...notif,
        type: notif.type as 'info' | 'success' | 'warning' | 'error',
        profiles: profilesMap.get(notif.user_id)
      })) || []);

      setNotifications(enrichedNotifications);
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

  const getNotificationStatusType = (type: string): StatusType => {
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
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
            Historique des notifications ({filteredNotifications.length})
          </CardTitle>
          <CardDescription>
            Gérer et consulter toutes les notifications système envoyées
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, message, utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Succès</SelectItem>
                <SelectItem value="warning">Avertissement</SelectItem>
                <SelectItem value="error">Erreur</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous statuts</SelectItem>
                <SelectItem value="read">Lus</SelectItem>
                <SelectItem value="unread">Non lus</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 gap-1">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>

          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune notification trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ResponsiveTable>
                <ResponsiveTableHeader>
                  <ResponsiveTableRow>
                    <ResponsiveTableHead priority="high">Date</ResponsiveTableHead>
                    <ResponsiveTableHead priority="high">Utilisateur</ResponsiveTableHead>
                    <ResponsiveTableHead priority="medium">Type</ResponsiveTableHead>
                    <ResponsiveTableHead priority="high">Titre</ResponsiveTableHead>
                    <ResponsiveTableHead priority="low">Message</ResponsiveTableHead>
                    <ResponsiveTableHead priority="medium">Statut</ResponsiveTableHead>
                    <ResponsiveTableHead priority="high" className="text-right">Actions</ResponsiveTableHead>
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <ResponsiveTableBody>
                  {pagination.paginatedData.map((notification) => (
                    <ResponsiveTableRow key={notification.id}>
                      <ResponsiveTableCell priority="high" label="Date" className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(notification.created_at), 'dd MMM HH:mm', { locale: fr })}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="high" label="Utilisateur" className="text-sm">
                        {notification.profiles?.full_name || notification.profiles?.email || 'N/A'}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="medium" label="Type">
                        <StatusBadge status={getNotificationStatusType(notification.type)} compact />
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="high" label="Titre" className="font-medium max-w-[200px] truncate">
                        {notification.title}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="low" label="Message" className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {notification.message}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="medium" label="Statut">
                        <StatusBadge status={notification.is_read ? 'completed' : 'pending'} compact />
                      </ResponsiveTableCell>
                      <ResponsiveTableCell priority="high" className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNotificationToDelete(notification.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  ))}
                </ResponsiveTableBody>
              </ResponsiveTable>
              
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                hasNextPage={pagination.hasNextPage}
                hasPreviousPage={pagination.hasPreviousPage}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.changePageSize}
                onNextPage={pagination.goToNextPage}
                onPreviousPage={pagination.goToPreviousPage}
              />
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
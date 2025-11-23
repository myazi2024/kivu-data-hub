import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Clock, CheckCircle, XCircle, FileText, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PermitAction {
  id: string;
  action_type: string;
  comment: string;
  created_at: string;
  admin_user_id: string;
  admin_name?: string;
}

interface PermitActionsHistoryProps {
  contributionId: string;
}

export function PermitActionsHistory({ contributionId }: PermitActionsHistoryProps) {
  const [actions, setActions] = useState<PermitAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActions();
  }, [contributionId]);

  const fetchActions = async () => {
    try {
      const { data, error } = await supabase
        .from('permit_admin_actions')
        .select('*')
        .eq('contribution_id', contributionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch admin names
      const actionsWithNames = await Promise.all(
        (data || []).map(async (action) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', action.admin_user_id)
            .single();

          return {
            ...action,
            admin_name: profile?.full_name || 'Administrateur'
          };
        })
      );

      setActions(actionsWithNames);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'review_started':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'documents_requested':
        return <FileText className="h-4 w-4 text-orange-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels = {
      review_started: 'Examen commencé',
      documents_requested: 'Documents demandés',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      documents_received: 'Documents reçus'
    };
    return labels[actionType as keyof typeof labels] || actionType;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement de l'historique...</div>;
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Aucune action enregistrée
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historique des actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {actions.map((action) => (
            <div key={action.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
              <div className="mt-1">{getActionIcon(action.action_type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {getActionLabel(action.action_type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(action.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {action.admin_name}
                </div>
                {action.comment && (
                  <p className="text-sm mt-2">{action.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
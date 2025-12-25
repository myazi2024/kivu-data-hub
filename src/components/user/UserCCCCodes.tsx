import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Gift, Copy, DollarSign, Eye } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { UserCCCCodeDetailsDialog } from './UserCCCCodeDetailsDialog';

interface CCCCode {
  id: string;
  code: string;
  parcel_number: string;
  value_usd: number;
  is_used: boolean;
  is_valid: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  invalidation_reason: string | null;
  contribution_id: string;
}

export const UserCCCCodes: React.FC = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<CCCCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<CCCCode | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCodes();
    }
  }, [user]);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_contributor_codes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des codes');
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copié dans le presse-papier');
  };

  const getCodeStatus = (code: CCCCode): 'valid' | 'used' | 'expired' | 'invalidated' => {
    const now = new Date();
    const isExpired = new Date(code.expires_at) <= now;
    
    if (!code.is_valid) return 'invalidated';
    if (code.is_used) return 'used';
    if (isExpired) return 'expired';
    return 'valid';
  };

  const getStats = () => {
    const now = new Date();
    return {
      total: codes.length,
      available: codes.filter(c => c.is_valid && !c.is_used && new Date(c.expires_at) > now).length,
      used: codes.filter(c => c.is_used).length,
      totalValue: codes.filter(c => c.is_valid && !c.is_used && new Date(c.expires_at) > now)
        .reduce((sum, c) => sum + Number(c.value_usd), 0),
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="bg-background rounded-2xl shadow-sm border p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats compactes */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Dispo.", value: stats.available, color: "text-green-600" },
          { label: "Utilisés", value: stats.used, color: "text-blue-600" },
          { label: "Valeur", value: `$${stats.totalValue.toFixed(0)}`, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="bg-background rounded-2xl p-3 shadow-sm border text-center">
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Liste des codes */}
      <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Mes codes CCC</h3>
        </div>
        
        <div className="p-3">
          {codes.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Gift className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Aucun code CCC</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contribuez pour en gagner
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {codes.slice(0, 5).map((code) => (
                <div 
                  key={code.id} 
                  className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Gift className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-medium truncate">{code.code}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {code.parcel_number}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="flex items-center gap-1">
                      <StatusBadge status={getCodeStatus(code)} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                        disabled={!code.is_valid || code.is_used}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs font-semibold text-green-600">${Number(code.value_usd).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              
              {codes.length > 5 && (
                <p className="text-center text-xs text-muted-foreground pt-2">
                  +{codes.length - 5} autres codes
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <UserCCCCodeDetailsDialog 
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen} 
        code={selectedCode} 
      />
    </>
  );
};

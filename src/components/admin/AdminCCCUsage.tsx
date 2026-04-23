import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Gift, Search, CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CCCCode {
  id: string;
  code: string;
  parcel_number: string;
  user_id: string;
  value_usd: number;
  is_used: boolean;
  is_valid: boolean | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  user_name?: string;
}

const AdminCCCUsage = () => {
  const [codes, setCodes] = useState<CCCCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadastral_contributor_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = Array.from(new Set((data || []).map((c) => c.user_id).filter(Boolean)));
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profilesMap = (profiles || []).reduce((acc, p: { user_id: string; full_name: string | null }) => {
          acc[p.user_id] = p.full_name || 'Utilisateur inconnu';
          return acc;
        }, {} as Record<string, string>);
      }

      const codesWithUser = (data || []).map((c) => ({
        ...c,
        user_name: profilesMap[c.user_id] || 'Utilisateur inconnu',
      }));

      setCodes(codesWithUser);
    } catch (error) {
      console.error('Error fetching CCC codes:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (code: CCCCode) => {
    if (code.is_used) {
      return <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 border-blue-200"><CheckCircle2 className="h-2 w-2 mr-0.5" />Utilisé</Badge>;
    }
    if (!code.is_valid || code.invalidated_at) {
      return <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-200"><XCircle className="h-2 w-2 mr-0.5" />Invalidé</Badge>;
    }
    if (new Date(code.expires_at) < new Date()) {
      return <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-700 border-amber-200"><Clock className="h-2 w-2 mr-0.5" />Expiré</Badge>;
    }
    return <Badge variant="outline" className="text-[9px] bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-2 w-2 mr-0.5" />Valide</Badge>;
  };

  const getCodeStatus = (code: CCCCode): string => {
    if (code.is_used) return 'used';
    if (!code.is_valid || code.invalidated_at) return 'invalid';
    if (new Date(code.expires_at) < new Date()) return 'expired';
    return 'valid';
  };

  const filteredCodes = codes.filter(c => {
    const matchesSearch = 
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.parcel_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || getCodeStatus(c) === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const validCount = codes.filter(c => getCodeStatus(c) === 'valid').length;
  const usedCount = codes.filter(c => c.is_used).length;
  const totalValue = codes.reduce((sum, c) => sum + c.value_usd, 0);
  const usedValue = codes.filter(c => c.is_used).reduce((sum, c) => sum + c.value_usd, 0);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-bold">Suivi Codes CCC</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">Analyse de l'utilisation des codes</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCodes} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-primary">{codes.length}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Total codes</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('valid')}>
          <p className="text-lg md:text-xl font-bold text-green-500">{validCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Valides</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus('used')}>
          <p className="text-lg md:text-xl font-bold text-blue-500">{usedCount}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Utilisés</p>
        </Card>
        <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
          <p className="text-lg md:text-xl font-bold text-amber-500">${usedValue.toFixed(0)}</p>
          <p className="text-[9px] md:text-[10px] text-muted-foreground">Valeur utilisée</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-2.5 bg-background rounded-xl shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher code, parcelle..." className="h-8 text-xs pl-8" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-32">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="valid">Valides</SelectItem>
              <SelectItem value="used">Utilisés</SelectItem>
              <SelectItem value="expired">Expirés</SelectItem>
              <SelectItem value="invalid">Invalidés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Codes List */}
      <Card className="p-3 md:p-4 bg-background rounded-2xl shadow-sm border">
        <h3 className="text-xs font-semibold mb-3">Codes ({filteredCodes.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="text-center py-8">
            <Gift className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Aucun code trouvé</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCodes.slice(0, 50).map((code) => (
              <div key={code.id} className="p-2.5 md:p-3 rounded-xl border bg-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-mono font-semibold">{code.code}</span>
                      {getStatusBadge(code)}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {code.user_name} • Parcelle: {code.parcel_number}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                      <span>Créé: {format(new Date(code.created_at), 'dd/MM/yy', { locale: fr })}</span>
                      {code.used_at && (
                        <>
                          <span>•</span>
                          <span>Utilisé: {format(new Date(code.used_at), 'dd/MM/yy', { locale: fr })}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <DollarSign className="h-3 w-3" />
                      {code.value_usd.toFixed(2)}
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      Exp: {format(new Date(code.expires_at), 'dd/MM/yy', { locale: fr })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminCCCUsage;

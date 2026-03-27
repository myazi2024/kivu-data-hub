import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { logAuditAction } from '@/utils/supabaseConfigUtils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RefreshCw, DollarSign, ArrowRightLeft } from 'lucide-react';

interface CurrencyRow {
  id: string;
  currency_code: string;
  currency_name: string;
  symbol: string;
  exchange_rate_to_usd: number;
  is_active: boolean;
  is_default: boolean;
  updated_at: string;
}

const AdminCurrencyConfig: React.FC = () => {
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedRates, setEditedRates] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('currency_config')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      setCurrencies((data || []).map(c => ({ ...c, exchange_rate_to_usd: Number(c.exchange_rate_to_usd) })));
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les devises', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCurrencies(); }, []);

  const handleSaveRate = async (currency: CurrencyRow) => {
    const newRateStr = editedRates[currency.currency_code];
    if (!newRateStr) return;

    const newRate = parseFloat(newRateStr);
    if (isNaN(newRate) || newRate <= 0) {
      toast({ title: 'Erreur', description: 'Le taux doit être un nombre positif', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('currency_config')
        .update({
          exchange_rate_to_usd: newRate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currency.id);

      if (error) throw error;

      await logAuditAction(
        'update_exchange_rate',
        'currency_config',
        currency.id,
        { exchange_rate_to_usd: currency.exchange_rate_to_usd },
        { exchange_rate_to_usd: newRate }
      );

      toast({ title: 'Taux mis à jour', description: `1 USD = ${newRate} ${currency.currency_code}` });
      setEditedRates(prev => { const n = { ...prev }; delete n[currency.currency_code]; return n; });
      fetchCurrencies();
    } catch (error) {
      console.error('Error saving rate:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder le taux', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Configuration des devises</h2>
          <p className="text-sm text-muted-foreground">
            Gérez les taux de change pour le paiement multi-devises
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCurrencies}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4">
        {currencies.map(currency => (
          <Card key={currency.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {currency.currency_name} ({currency.currency_code})
                      {currency.is_default && (
                        <Badge variant="secondary" className="text-[10px]">Référence</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Symbole : {currency.symbol}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={currency.is_active ? 'default' : 'outline'}>
                  {currency.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {currency.is_default ? (
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  Devise de référence — taux fixe à 1
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                      <span>1 USD</span>
                      <ArrowRightLeft className="h-3 w-3" />
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedRates[currency.currency_code] ?? currency.exchange_rate_to_usd}
                      onChange={(e) => setEditedRates(prev => ({ ...prev, [currency.currency_code]: e.target.value }))}
                      className="max-w-[180px]"
                    />
                    <span className="text-sm font-medium">{currency.currency_code}</span>
                    {editedRates[currency.currency_code] !== undefined && (
                      <Button
                        size="sm"
                        onClick={() => handleSaveRate(currency)}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        Sauvegarder
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dernière mise à jour : {new Date(currency.updated_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminCurrencyConfig;

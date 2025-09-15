import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const useAuditLog = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const logAction = async (
    action: string,
    tableName?: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any
  ) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('log_audit_action', {
        action_param: action,
        table_name_param: tableName,
        record_id_param: recordId,
        old_values_param: oldValues,
        new_values_param: newValues
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'audit:', error);
      toast({
        title: "Erreur d'audit",
        description: "Impossible d'enregistrer l'action dans les logs",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Log spécifique pour les consultations cadastrales
  const logCadastralConsultation = async (parcelNumber: string, services: string[], parcelId?: string) => {
    return logAction(
      'CADASTRAL_CONSULTATION',
      'cadastral_parcels',
      parcelId || null, // Utiliser l'ID de la parcelle ou null si pas disponible
      null,
      { parcel_number: parcelNumber, services_consulted: services }
    );
  };

  // Log spécifique pour les générations de factures
  const logInvoiceGeneration = async (invoiceId: string, invoiceData: any) => {
    return logAction(
      'INVOICE_GENERATED',
      'cadastral_invoices',
      invoiceId,
      null,
      invoiceData
    );
  };

  // Log spécifique pour les téléchargements de rapports
  const logReportDownload = async (parcelNumber: string, reportType: string, parcelId?: string) => {
    return logAction(
      'REPORT_DOWNLOAD',
      'cadastral_parcels',
      parcelId || null, // Utiliser l'ID de la parcelle ou null si pas disponible
      null,
      { parcel_number: parcelNumber, report_type: reportType }
    );
  };

  // Récupération des logs d'audit (pour les admins)
  const fetchAuditLogs = async (limit = 100) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as AuditLogEntry[];
    } catch (error) {
      console.error('Erreur lors du chargement des logs d\'audit:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les logs d'audit",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    logAction,
    logCadastralConsultation,
    logInvoiceGeneration,
    logReportDownload,
    fetchAuditLogs
  };
};
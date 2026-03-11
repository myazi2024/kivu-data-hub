import { supabase } from '@/integrations/supabase/client';

/**
 * Utilitaire partagé pour upsert de configuration dans cadastral_search_config.
 * Élimine la duplication du pattern select-then-update-or-insert.
 */
export const upsertSearchConfig = async (
  configKey: string,
  configValue: Record<string, unknown>,
  description?: string
): Promise<void> => {
  const { data: existing } = await supabase
    .from('cadastral_search_config')
    .select('id')
    .eq('config_key', configKey)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from('cadastral_search_config')
      .update({
        config_value: configValue as any,
        updated_at: new Date().toISOString(),
        is_active: true
      })
      .eq('config_key', configKey);
  } else {
    result = await supabase
      .from('cadastral_search_config')
      .insert({
        config_key: configKey,
        config_value: configValue as any,
        is_active: true,
        description: description || `Configuration: ${configKey}`
      });
  }

  if (result.error) throw result.error;
};

/**
 * Log une action dans audit_logs via la RPC existante.
 */
export const logAuditAction = async (
  action: string,
  tableName?: string,
  recordId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): Promise<void> => {
  try {
    await supabase.rpc('log_audit_action', {
      action_param: action,
      table_name_param: tableName || null,
      record_id_param: recordId || null,
      old_values_param: oldValues ? (oldValues as any) : null,
      new_values_param: newValues ? (newValues as any) : null
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};

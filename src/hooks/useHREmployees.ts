import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HREmployee {
  id: string;
  matricule: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department: string;
  position: string;
  salary_usd: number;
  birth_date: string | null;
  gender: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  hire_date: string;
  status: 'active' | 'leave' | 'departed';
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type HREmployeeInsert = Omit<HREmployee, 'id' | 'matricule' | 'created_at' | 'updated_at'>;

export function useHREmployees() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['hr-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('*')
        .order('last_name');
      if (error) throw error;
      return (data || []) as HREmployee[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (employee: Partial<HREmployeeInsert>) => {
      const payload: any = {
        first_name: employee.first_name!,
        last_name: employee.last_name!,
        department: employee.department!,
        position: employee.position!,
        email: employee.email || null,
        phone: employee.phone || null,
        salary_usd: employee.salary_usd || 0,
        birth_date: employee.birth_date || null,
        gender: employee.gender || null,
        emergency_contact_name: employee.emergency_contact_name || null,
        emergency_contact_phone: employee.emergency_contact_phone || null,
        hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
        status: employee.status || 'active',
        notes: employee.notes || null,
        matricule: '',
      };
      if (employee.user_id) payload.user_id = employee.user_id;
      const { data, error } = await supabase
        .from('hr_employees')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      toast({ title: 'Employé ajouté avec succès' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HREmployee> & { id: string }) => {
      const { error } = await supabase.from('hr_employees').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      toast({ title: 'Employé mis à jour' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      toast({ title: 'Employé supprimé' });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  return {
    employees: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addEmployee: addMutation.mutateAsync,
    updateEmployee: updateMutation.mutateAsync,
    deleteEmployee: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

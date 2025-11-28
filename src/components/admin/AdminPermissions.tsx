import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { Shield, Crown, Briefcase, User, Plus, X, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const roleConfig = {
  super_admin: { icon: Crown, label: 'Super Admin', color: 'bg-purple-500' },
  admin: { icon: Shield, label: 'Administrateur', color: 'bg-blue-500' },
  partner: { icon: Briefcase, label: 'Partenaire', color: 'bg-green-500' },
  user: { icon: User, label: 'Utilisateur', color: 'bg-gray-500' },
};

export const AdminPermissions: React.FC = () => {
  const {
    permissions,
    rolePermissions,
    loading,
    fetchRolePermissions,
    addPermissionToRole,
    removePermissionFromRole,
  } = usePermissions();

  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [processingPermissions, setProcessingPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    }
  }, [selectedRole, fetchRolePermissions]);

  const rolePerms = rolePermissions
    .filter((rp) => rp.role === selectedRole)
    .map((rp) => rp.permission_id);

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource_name]) {
      acc[perm.resource_name] = [];
    }
    acc[perm.resource_name].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const handleTogglePermission = async (permissionId: string, hasPermission: boolean) => {
    setProcessingPermissions((prev) => new Set(prev).add(permissionId));

    if (hasPermission) {
      const rp = rolePermissions.find(
        (rp) => rp.role === selectedRole && rp.permission_id === permissionId
      );
      if (rp) {
        await removePermissionFromRole(rp.id, selectedRole);
      }
    } else {
      await addPermissionToRole(selectedRole, permissionId);
    }

    setProcessingPermissions((prev) => {
      const newSet = new Set(prev);
      newSet.delete(permissionId);
      return newSet;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-2 md:p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm md:text-base">Matrice des Permissions</CardTitle>
            <CardDescription className="text-[10px] md:text-xs">
              Gérer les permissions par rôle
            </CardDescription>
          </div>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full sm:w-44 text-xs h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(roleConfig).map(([role, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-3">
        <div className="space-y-3">
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="border rounded-lg p-2 md:p-3">
              <h3 className="font-semibold text-xs md:text-sm mb-2 capitalize">
                {resource.replace(/_/g, ' ')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 md:gap-2">
                {perms.map((perm) => {
                  const hasPermission = rolePerms.includes(perm.id);
                  const isProcessing = processingPermissions.has(perm.id);
                  
                  return (
                    <Button
                      key={perm.id}
                      variant={hasPermission ? 'default' : 'outline'}
                      size="sm"
                      className="h-auto py-1.5 px-2 flex flex-col items-start justify-start text-left gap-0.5"
                      onClick={() => handleTogglePermission(perm.id, hasPermission)}
                      disabled={isProcessing}
                    >
                      <div className="flex items-center gap-1 w-full">
                        {hasPermission ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3 opacity-50" />
                        )}
                        <span className="text-[10px] font-medium capitalize">
                          {perm.action_name}
                        </span>
                      </div>
                      {perm.description && (
                        <span className="text-[9px] opacity-70 line-clamp-1 w-full">
                          {perm.description}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 p-2 bg-muted rounded-lg">
          <h4 className="font-semibold text-xs mb-1">Légende</h4>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Permission active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full border-2 border-border" />
              <span>Permission inactive</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

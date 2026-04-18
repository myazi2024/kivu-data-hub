import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_CONFIG, ROLE_HIERARCHY, type AppRole } from '@/constants/roles';
import type { UserRole } from '../AdminUserRolesEnhanced';

interface Props { userRoles: UserRole[]; }

export const RoleHierarchyGrid: React.FC<Props> = ({ userRoles }) => (
  <Card>
    <CardHeader className="p-2 md:p-3">
      <CardTitle className="text-sm md:text-base">Hiérarchie des Rôles</CardTitle>
      <CardDescription className="text-[10px] md:text-xs">Organisation des privilèges par ordre décroissant</CardDescription>
    </CardHeader>
    <CardContent className="p-1.5 md:p-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
        {ROLE_HIERARCHY.map((role: AppRole) => {
          const cfg = ROLE_CONFIG[role];
          const Icon = cfg.icon;
          const count = userRoles.filter(r => r.role === role).length;
          return (
            <div key={role} className="p-1.5 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className={`w-7 h-7 rounded-full ${cfg.color} flex items-center justify-center mb-1`}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="font-semibold text-[11px] mb-0.5">{cfg.label}</h3>
              <p className="text-[9px] text-muted-foreground mb-0.5 line-clamp-1">{cfg.description}</p>
              <Badge variant="secondary" className="text-[9px] py-0 px-1">{count}</Badge>
            </div>
          );
        })}
      </div>
    </CardContent>
  </Card>
);

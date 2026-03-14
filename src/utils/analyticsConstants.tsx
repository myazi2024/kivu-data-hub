import React from 'react';

export const CHART_HEIGHT = 160;

export const NoData: React.FC<{ message?: string }> = ({ message = 'Aucune donnée' }) => (
  <div className="flex items-center justify-center h-[100px] text-muted-foreground text-xs">{message}</div>
);

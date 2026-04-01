import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MortgageFlowContainerProps {
  open: boolean;
  embedded?: boolean;
  isMobile?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

// Fix #21: Use semantic design tokens instead of hardcoded values
const MortgageFlowContainer: React.FC<MortgageFlowContainerProps> = ({
  open,
  embedded = false,
  isMobile = false,
  title,
  description,
  icon,
  onClose,
  children,
}) => {
  if (embedded) {
    return <div className="overflow-y-auto h-full px-4 pb-4">{children}</div>;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className={`${isMobile ? 'w-[92vw] max-w-[380px] max-h-[88vh]' : 'max-w-lg max-h-[85vh]'} rounded-2xl p-0 overflow-hidden`}>
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            {icon}
            {title}
          </DialogTitle>
          {description ? <DialogDescription className="text-xs">{description}</DialogDescription> : null}
        </DialogHeader>
        <div className={`${isMobile ? 'h-[calc(88vh-80px)]' : 'max-h-[calc(85vh-80px)]'} overflow-y-auto px-4 pb-4`}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MortgageFlowContainer;

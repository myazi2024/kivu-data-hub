import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CCCMobileNotificationProps {
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  show: boolean;
  onClose?: () => void;
  autoHideDuration?: number;
}

export const CCCMobileNotification: React.FC<CCCMobileNotificationProps> = ({
  message,
  type = 'info',
  show,
  onClose,
  autoHideDuration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    
    if (show && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoHideDuration);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoHideDuration, onClose]);

  if (!isVisible) return null;

  const icons = {
    info: Info,
    warning: AlertCircle,
    error: AlertCircle,
    success: CheckCircle2
  };

  const Icon = icons[type];

  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100',
    error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
    success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100'
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-300 sm:left-auto sm:right-4 sm:max-w-md">
      <Alert className={`${variants[type]} shadow-lg`}>
        <Icon className="h-4 w-4" />
        <AlertDescription className="flex items-start justify-between gap-2">
          <span className="flex-1 text-sm">{message}</span>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                onClose();
              }}
              className="h-6 w-6 p-0 hover:bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

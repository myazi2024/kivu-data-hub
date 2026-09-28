import React from 'react';
import CCCIntroDialog from '@/components/cadastral/CCCIntroDialog';

const TempIntroPreview = () => {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="min-h-dvh bg-background">
      <CCCIntroDialog open={open} onOpenChange={setOpen} onContinue={() => setOpen(false)} parcelNumber="" />
    </div>
  );
};

export default TempIntroPreview;

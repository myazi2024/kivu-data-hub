export type Step = 'form' | 'preview' | 'payment' | 'confirmation';

export type RequiredDocument = {
  key: string;
  label: string;
  required: boolean;
  handledByExpertiseCertificate?: boolean;
};

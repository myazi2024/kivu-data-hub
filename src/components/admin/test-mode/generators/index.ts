/**
 * Test data generators — orchestrator barrel.
 * Split from a 1324-LOC monolith into focused modules per entity.
 */
export {
  uniqueSuffix, verifyTestModeEnabled, generateParcelNumbers,
  type GeneratedIds,
} from './_shared';
export { generateParcels } from './parcels';
export {
  generateContributions, generateContributorCodes, generateFraudAttempts,
} from './contributions';
export { generateInvoices, generateServiceAccess } from './invoices';
export { generatePayments } from './payments';
export { generateTitleRequests } from './titles';
export { generateExpertiseRequests, generateExpertisePayments } from './expertise';
export { generateDisputes, generateBoundaryConflicts } from './disputes';
export {
  generateOwnershipHistory, generateTaxHistory, generateBoundaryHistory,
} from './parcelHistories';
export { generateMortgages } from './mortgages';
export { generateBuildingPermits } from './permits';
export {
  generateCertificates, generateMutationRequests, generateSubdivisionRequests,
} from './certificatesAndRequests';
export { rollbackTestData } from './rollback';

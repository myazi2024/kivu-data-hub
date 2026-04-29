/**
 * Test data generation — declarative step registry.
 *
 * Replaces the 14 inline step blocks of the legacy `useTestDataActions.ts`
 * (~250 LOC of repetitive try/catch + updateStep). Each entry describes:
 * - the human label shown in `GenerationProgress`
 * - whether a failure aborts the run (`blocking`) or just records a warning
 * - a `run` function executed sequentially with a shared `Ctx` accumulator
 *
 * Sub-failures within a step are surfaced via `result.failedSteps` and
 * displayed in the partial-success toast.
 */
import type {
  generateParcels,
  generateContributions,
  generateInvoices,
} from './generators';

export type ParcelRow = Awaited<ReturnType<typeof generateParcels>>[number];
export type ContributionRow = Awaited<ReturnType<typeof generateContributions>>[number];
export type InvoiceRow = Awaited<ReturnType<typeof generateInvoices>>[number];

export interface StepCtx {
  userId: string;
  suffix: string;
  parcelNumbers: string[];
  parcels: ParcelRow[];
  contributions: ContributionRow[];
  invoices: InvoiceRow[];
  failedSteps: string[];
}

export interface StepDef {
  /** Unique key (logged in audit) */
  key: string;
  /** Label shown in GenerationProgress */
  label: string;
  /** If true, throwing aborts the run; otherwise the failure is collected. */
  blocking: boolean;
  /** Step body. Mutates `ctx` to share state with later steps. */
  run: (ctx: StepCtx) => Promise<void>;
}

/**
 * Build the full step list. Generators are injected to keep this module
 * easy to unit-test with mocks.
 */
export function buildGenerationSteps(g: {
  verifyTestModeEnabled: () => Promise<boolean>;
  generateParcels: (numbers: string[]) => Promise<ParcelRow[]>;
  generateContributions: (uid: string, nums: string[]) => Promise<ContributionRow[]>;
  generateInvoices: (uid: string, nums: string[]) => Promise<InvoiceRow[]>;
  generatePayments: (uid: string, invoices: InvoiceRow[]) => Promise<unknown>;
  generateContributorCodes: (uid: string, contribs: ContributionRow[]) => Promise<unknown>;
  generateTitleRequests: (uid: string, suffix: string) => Promise<unknown>;
  generateExpertiseRequests: (uid: string, parcels: ParcelRow[], suffix: string) => Promise<Array<{ id: string }>>;
  generateExpertisePayments: (uid: string, requests: Array<{ id: string }>) => Promise<unknown>;
  generateDisputes: (parcels: ParcelRow[], suffix: string, uid: string) => Promise<unknown>;
  generateOwnershipHistory: (parcels: ParcelRow[]) => Promise<unknown>;
  generateTaxHistory: (parcels: ParcelRow[]) => Promise<unknown>;
  generateBoundaryHistory: (parcels: ParcelRow[]) => Promise<unknown>;
  generateMortgages: (parcels: ParcelRow[]) => Promise<Array<{ id: string }>>;
  generateMortgagePayments: (mortgages: Array<{ id: string }>) => Promise<unknown>;
  generateBuildingPermits: (parcels: ParcelRow[]) => Promise<unknown>;
  generateBoundaryConflicts: (nums: string[], uid: string) => Promise<unknown>;
  generateFraudAttempts: (uid: string, contribs: ContributionRow[]) => Promise<unknown>;
  generateCertificates: (nums: string[], suffix: string, uid: string) => Promise<unknown>;
  generateMutationRequests: (uid: string, parcels: ParcelRow[], suffix: string) => Promise<unknown>;
  generateSubdivisionRequests: (uid: string, parcels: ParcelRow[], suffix: string) => Promise<Array<{ id: string }>>;
  generateSubdivisionLotsAndRoads: (subs: Array<{ id: string }>) => Promise<unknown>;
}): StepDef[] {
  /** Run sub-tasks; each captured failure goes into ctx.failedSteps and the step
   *  is marked partial-error if any sub-task fails. */
  const sub = async (ctx: StepCtx, label: string, fn: () => Promise<void>) => {
    try { await fn(); }
    catch (e) {
      ctx.failedSteps.push(label);
      console.error(`${label} (non-bloquant):`, e);
    }
  };

  return [
    {
      key: 'verify',
      label: 'Vérification du mode test',
      blocking: true,
      run: async () => {
        const enabled = await g.verifyTestModeEnabled();
        if (!enabled) throw new Error('Mode test non actif côté serveur');
      },
    },
    {
      key: 'parcels',
      label: 'Parcelles cadastrales',
      blocking: true,
      run: async (ctx) => { ctx.parcels = await g.generateParcels(ctx.parcelNumbers); },
    },
    {
      key: 'contributions',
      label: 'Contributions cadastrales',
      blocking: true,
      run: async (ctx) => { ctx.contributions = await g.generateContributions(ctx.userId, ctx.parcelNumbers); },
    },
    {
      key: 'invoices',
      label: 'Factures',
      blocking: true,
      run: async (ctx) => { ctx.invoices = await g.generateInvoices(ctx.userId, ctx.parcelNumbers); },
    },
    {
      key: 'payments',
      label: 'Transactions de paiement',
      blocking: true,
      run: async (ctx) => { await g.generatePayments(ctx.userId, ctx.invoices); },
    },
    {
      key: 'service_access',
      label: 'Provisioning accès services (trigger auto)',
      blocking: false,
      // Handled by trg_provision_service_access_on_paid — no-op here.
      run: async () => { /* no-op */ },
    },
    {
      key: 'ccc',
      label: 'Codes contributeurs (CCC)',
      blocking: false,
      run: async (ctx) => { await g.generateContributorCodes(ctx.userId, ctx.contributions); },
    },
    {
      key: 'titles',
      label: 'Demandes de titres fonciers',
      blocking: false,
      run: async (ctx) => { await g.generateTitleRequests(ctx.userId, ctx.suffix); },
    },
    {
      key: 'expertise',
      label: "Demandes d'expertise",
      blocking: false,
      run: async (ctx) => {
        const requests = await g.generateExpertiseRequests(ctx.userId, ctx.parcels, ctx.suffix);
        await g.generateExpertisePayments(ctx.userId, requests);
      },
    },
    {
      key: 'disputes',
      label: 'Litiges fonciers',
      blocking: false,
      run: async (ctx) => { await g.generateDisputes(ctx.parcels, ctx.suffix, ctx.userId); },
    },
    {
      key: 'history',
      label: 'Historique propriété & taxes',
      blocking: false,
      run: async (ctx) => {
        await g.generateOwnershipHistory(ctx.parcels);
        await g.generateTaxHistory(ctx.parcels);
      },
    },
    {
      key: 'mortgages_permits',
      label: 'Bornages & hypothèques & autorisations',
      blocking: false,
      run: async (ctx) => {
        let mortgages: Array<{ id: string }> = [];
        await sub(ctx, 'Bornages', async () => { await g.generateBoundaryHistory(ctx.parcels); });
        await sub(ctx, 'Hypothèques', async () => { mortgages = await g.generateMortgages(ctx.parcels); });
        await sub(ctx, 'Paiements hypothèques', async () => { await g.generateMortgagePayments(mortgages); });
        await sub(ctx, 'Autorisations de bâtir', async () => { await g.generateBuildingPermits(ctx.parcels); });
        await sub(ctx, 'Conflits de limites', async () => { await g.generateBoundaryConflicts(ctx.parcelNumbers, ctx.userId); });
      },
    },
    {
      key: 'fraud_certs',
      label: 'Fraudes & certificats',
      blocking: false,
      run: async (ctx) => {
        await g.generateFraudAttempts(ctx.userId, ctx.contributions);
        await g.generateCertificates(ctx.parcelNumbers, ctx.suffix, ctx.userId);
      },
    },
    {
      key: 'mutations_subdivisions',
      label: 'Mutations & lotissements',
      blocking: false,
      run: async (ctx) => {
        let subdivisions: Array<{ id: string }> = [];
        await sub(ctx, 'Mutations', async () => { await g.generateMutationRequests(ctx.userId, ctx.parcels, ctx.suffix); });
        await sub(ctx, 'Lotissements', async () => { subdivisions = await g.generateSubdivisionRequests(ctx.userId, ctx.parcels, ctx.suffix); });
        await sub(ctx, 'Lots/voies de lotissement', async () => { await g.generateSubdivisionLotsAndRoads(subdivisions); });
      },
    },
  ];
}

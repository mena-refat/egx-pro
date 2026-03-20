export type TierId = 'free' | 'pro' | 'ultra';
export type PaidPlanId = 'pro_monthly' | 'pro_yearly' | 'ultra_monthly' | 'ultra_yearly';
export type BillingPeriod = 'monthly' | 'yearly';

export interface PlanFeature {
  key: string;
  unavailable?: boolean;
}

export interface PlanConfig {
  id: TierId;
  nameKey: string;
  badgeKey?: string;
  savingsNoteKey?: string;
  highlighted?: boolean;
  features: PlanFeature[];
}

declare global {
  interface Window {
    google?: {
      payments: {
        api: {
          PaymentsClient: new (opts: { environment: 'TEST' | 'PRODUCTION' }) => {
            loadPaymentData: (req: unknown) => Promise<{
              paymentMethodData: { tokenizationData: { token: string } };
            }>;
          };
        };
      };
    };
  }
}

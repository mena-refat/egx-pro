import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import apiClient from '../lib/api/client';

export type IAPPlanKey = 'pro_monthly' | 'pro_yearly' | 'ultra_monthly' | 'ultra_yearly';

const PRODUCT_IDS: Record<IAPPlanKey, string> = {
  pro_monthly: 'borsa_pro_monthly',
  pro_yearly: 'borsa_pro_yearly',
  ultra_monthly: 'borsa_ultra_monthly',
  ultra_yearly: 'borsa_ultra_yearly',
};

// Lazy-load react-native-iap so the app doesn't crash when running in Expo Go
// (react-native-iap requires a native build via EAS Build)
let RNIap: typeof import('react-native-iap') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNIap = require('react-native-iap');
} catch {
  // Not available in Expo Go or when not yet installed — billing will fall back to email
}

export function useGooglePlayBilling() {
  const [connected, setConnected] = useState(false);
  const [purchasing, setPurchasing] = useState<IAPPlanKey | null>(null);
  const [subscriptions, setSubscriptions] = useState<import('react-native-iap').Subscription[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !RNIap) return;

    let purchaseUpdateSub: { remove: () => void } | null = null;
    let purchaseErrorSub: { remove: () => void } | null = null;

    const setup = async () => {
      try {
        await RNIap!.initConnection();
        setConnected(true);
        const subs = await RNIap!.getSubscriptions({ skus: Object.values(PRODUCT_IDS) });
        setSubscriptions(subs);
      } catch {
        setConnected(false);
      }
    };

    purchaseUpdateSub = RNIap!.purchaseUpdatedListener(async (purchase) => {
      void purchase; // handled inside purchasePlan
    });

    purchaseErrorSub = RNIap!.purchaseErrorListener((err) => {
      console.warn('IAP error', err);
    });

    setup();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      RNIap?.endConnection();
    };
  }, []);

  const purchasePlan = useCallback(async (planKey: IAPPlanKey): Promise<'success' | 'cancelled' | 'error'> => {
    if (Platform.OS !== 'android' || !RNIap) return 'error';

    const productId = PRODUCT_IDS[planKey];
    setPurchasing(planKey);

    try {
      const sub = subscriptions.find((s) => s.productId === productId);
      const offerToken = (sub as any)?.subscriptionOfferDetails?.[0]?.offerToken as string | undefined;

      const purchase = await RNIap!.requestSubscription({
        sku: productId,
        ...(offerToken ? { subscriptionOffers: [{ sku: productId, offerToken }] } : {}),
      });

      if (!purchase || Array.isArray(purchase)) return 'cancelled';

      const purchaseToken = (purchase as any).purchaseToken as string;
      if (!purchaseToken) return 'error';

      await apiClient.post('/api/billing/google-play/verify', {
        purchaseToken,
        productId,
        plan: planKey,
      });

      await RNIap!.finishTransaction({ purchase, isConsumable: false });

      return 'success';
    } catch (err: unknown) {
      const code = (err as any)?.code as string | undefined;
      if (code === 'E_USER_CANCELLED') return 'cancelled';
      return 'error';
    } finally {
      setPurchasing(null);
    }
  }, [subscriptions]);

  return { connected, purchasing, purchasePlan };
}

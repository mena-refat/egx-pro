import { google } from 'googleapis';

export const GooglePlayService = {
  async verifySubscription(
    packageName: string,
    productId: string,
    purchaseToken: string
  ): Promise<{ valid: boolean; expiryTimeMillis: number; paymentState: number }> {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
      console.warn(
        '[GooglePlayService] GOOGLE_SERVICE_ACCOUNT_JSON is not set — using dev fallback'
      );
      return {
        valid: true,
        expiryTimeMillis: Date.now() + 30 * 24 * 60 * 60 * 1000,
        paymentState: 1,
      };
    }

    const serviceAccount = JSON.parse(serviceAccountJson) as {
      client_email: string;
      private_key: string;
    };

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidpublisher = google.androidpublisher({ version: 'v3', auth });

    const response = await androidpublisher.purchases.subscriptionsv2.get({
      packageName,
      token: purchaseToken,
    });

    const sub = response.data;

    // subscriptionsv2 returns lineItems with expiryTime and paymentState
    const lineItem = sub.lineItems?.[0];
    const expiryTimeStr = lineItem?.expiryTime;
    const expiryTimeMillis = expiryTimeStr ? new Date(expiryTimeStr).getTime() : 0;

    // paymentState: 0 = payment pending, 1 = payment received, 2 = free trial, 3 = pending deferred
    const paymentState: number =
      typeof lineItem?.autoRenewingPlan?.autoRenewEnabled === 'boolean'
        ? // subscriptionsv2 doesn't have a direct paymentState field, derive from subscriptionState
          sub.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' ? 1 : 0
        : 0;

    const valid = paymentState === 1 && expiryTimeMillis > Date.now();

    return { valid, expiryTimeMillis, paymentState };
  },
};

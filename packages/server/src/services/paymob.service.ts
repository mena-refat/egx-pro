/**
 * Paymob payment verification service.
 *
 * The mobile client completes a payment via the Paymob SDK and sends the
 * resulting `transactionId` (numeric string) as `paymentToken` in the
 * upgrade request body.  This service calls the Paymob Transactions Inquiry
 * API to confirm the payment is successful and the amount matches.
 */

interface PaymobTransaction {
  id: number;
  success: boolean;
  pending: boolean;
  is_refunded: boolean;
  is_void: boolean;
  amount_cents: number;
  currency: string;
  order: { id: number };
}

export const PaymobService = {
  /**
   * Initiate a web checkout session via Paymob Accept.
   * Returns the hosted checkout URL to redirect the user to.
   * In dev (missing env vars) returns devMode: true so the caller can skip.
   */
  async initiateWebCheckout(
    amountEGP: number,
    planId: string,
    returnUrl: string,
  ): Promise<{ checkoutUrl: string } | { devMode: true }> {
    const apiKey       = process.env.PAYMOB_API_KEY;
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;
    const iframeId      = process.env.PAYMOB_IFRAME_ID;

    if (!apiKey || !integrationId || !iframeId) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('PAYMOB_INTEGRATION_ID and PAYMOB_IFRAME_ID must be set in production');
      }
      return { devMode: true };
    }

    const amountCents = Math.round(amountEGP * 100);

    // Step 1 — auth token
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!authRes.ok) throw new Error('Paymob auth failed');
    const { token: authToken } = (await authRes.json()) as { token: string };

    // Step 2 — register order
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: 'EGP',
        items: [{ name: planId, amount_cents: amountCents, description: planId, quantity: 1 }],
      }),
    });
    if (!orderRes.ok) throw new Error('Paymob order creation failed');
    const { id: orderId } = (await orderRes.json()) as { id: string };

    // Step 3 — payment key
    const pkRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderId,
        billing_data: {
          apartment: 'NA', email: 'user@borsa.app', floor: 'NA',
          first_name: 'Borsa', street: 'NA', building: 'NA',
          phone_number: '+20100000000', shipping_method: 'NA',
          postal_code: 'NA', city: 'Cairo', country: 'EGY',
          last_name: 'User', state: 'NA',
        },
        currency: 'EGP',
        integration_id: parseInt(integrationId, 10),
        iframe_redirection_url: returnUrl,
      }),
    });
    if (!pkRes.ok) throw new Error('Paymob payment key creation failed');
    const { token: paymentKey } = (await pkRes.json()) as { token: string };

    return {
      checkoutUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`,
    };
  },

  async verifyTransaction(
    transactionId: string,
    expectedAmountEGP: number,
  ): Promise<{ valid: boolean; amountEGP: number; status: string }> {
    const apiKey = process.env.PAYMOB_API_KEY;

    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('PAYMOB_API_KEY is required in production');
      }
      // Dev fallback — allows testing without real Paymob credentials
      console.warn('[PaymobService] PAYMOB_API_KEY not set — using dev fallback');
      return { valid: true, amountEGP: expectedAmountEGP, status: 'success' };
    }

    const numericId = parseInt(transactionId, 10);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return { valid: false, amountEGP: 0, status: 'invalid_id' };
    }

    const res = await fetch(
      `https://accept.paymob.com/api/acceptance/transactions/${numericId}`,
      { headers: { Authorization: `Token ${apiKey}` } },
    );

    if (!res.ok) {
      throw new Error(`Paymob inquiry failed: HTTP ${res.status}`);
    }

    const tx = (await res.json()) as PaymobTransaction;
    const amountEGP = tx.amount_cents / 100;
    const expectedCents = Math.round(expectedAmountEGP * 100);

    const valid =
      tx.success === true &&
      tx.pending === false &&
      tx.is_refunded === false &&
      tx.is_void === false &&
      tx.amount_cents === expectedCents;

    return {
      valid,
      amountEGP,
      status: tx.success ? 'success' : 'failed',
    };
  },
};

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

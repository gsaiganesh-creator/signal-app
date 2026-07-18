// Single source of truth for USD plan pricing (Stripe checkout route +
// nothing else server-side references this yet). Must stay in sync with the
// display copy in app/dashboard/upgrade/page.tsx's PLANS array
// (monthlyUSD/annualUSD, in dollars there vs cents here) and with
// PLANS_INR-equivalent in api/payment/create-order/route.ts for the ₹ side.
// Not a straight FX conversion — priced to what US SaaS buyers expect.
export const PLANS_USD: Record<string, { monthly: number; annual: number; name: string }> = {
  starter: { monthly: 499,  annual: 4790,  name: 'Starter' },  // $4.99/mo | $47.90/yr (-20%)
  pro:     { monthly: 1299, annual: 12470, name: 'Pro'     },  // $12.99/mo | $124.70/yr (-20%)
  elite:   { monthly: 2999, annual: 28790, name: 'Elite'   },  // $29.99/mo | $287.90/yr (-20%)
};

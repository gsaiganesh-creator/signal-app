// Vercel Cron: runs every 15 min during market hours to check price alerts and send push.
// Requires env: SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
// Add to vercel.json crons: { "path": "/api/push/check-alerts", "schedule": "*/15 3-10 * * 1-5" }
// (3:00–10:15 UTC = 8:30–15:45 IST, Mon–Fri)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const VAPID_PUB     = process.env.VAPID_PUBLIC_KEY  ?? '';
const VAPID_PRIV    = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL       ?? 'mailto:support@signal-app.in';
const CRON_SECRET   = process.env.CRON_SECRET       ?? '';

interface Alert { id: string; user_id: string; symbol: string; exchange: string; condition: string; target_price: number; triggered: boolean; }
interface Sub   { user_id: string; endpoint: string; p256dh: string; auth: string; }

export async function GET(req: Request) {
  // Secure cron endpoint
  const secret = new URL(req.url).searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) return Response.json({ error: 'forbidden' }, { status: 403 });
  if (!SERVICE_KEY) return Response.json({ error: 'SERVICE_KEY missing' }, { status: 500 });
  if (!VAPID_PUB || !VAPID_PRIV) return Response.json({ error: 'VAPID keys missing' }, { status: 500 });

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  // 1. Fetch untriggered alerts
  const alertsRes = await fetch(`${SUPA_URL}/rest/v1/price_alerts?triggered=eq.false&select=*`, { headers });
  if (!alertsRes.ok) return Response.json({ error: 'alerts fetch failed' }, { status: 500 });
  const alerts: Alert[] = await alertsRes.json();
  if (!alerts.length) return Response.json({ checked: 0, triggered: 0 });

  // 2. Fetch unique prices
  const tickers = [...new Set(alerts.map(a => a.exchange === 'BSE' ? `${a.symbol}.BO` : `${a.symbol}.NS`))];
  const priceRes = await fetch(
    `/api/prices?symbols=${encodeURIComponent(tickers.join(','))}`,
    { headers: { 'x-forwarded-host': new URL(req.url).host } }
  );
  const prices: Record<string, { price: number | null }> = priceRes.ok ? await priceRes.json() : {};

  // 3. Find triggered
  const triggered: Alert[] = [];
  for (const a of alerts) {
    const ticker = a.exchange === 'BSE' ? `${a.symbol}.BO` : `${a.symbol}.NS`;
    const price  = prices[ticker]?.price;
    if (!price) continue;
    const hit = a.condition === 'above' ? price >= a.target_price : price <= a.target_price;
    if (hit) triggered.push(a);
  }

  if (!triggered.length) return Response.json({ checked: alerts.length, triggered: 0 });

  // 4. Mark as triggered
  const ids = triggered.map(a => `"${a.id}"`).join(',');
  await fetch(`${SUPA_URL}/rest/v1/price_alerts?id=in.(${ids})`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ triggered: true, triggered_at: new Date().toISOString() }),
  });

  // 5. Fetch push subscriptions for affected users
  const userIds = [...new Set(triggered.map(a => a.user_id))];
  const subRes = await fetch(
    `${SUPA_URL}/rest/v1/push_subscriptions?user_id=in.(${userIds.map(id => `"${id}"`).join(',')})&select=*`,
    { headers }
  );
  const subs: Sub[] = subRes.ok ? await subRes.json() : [];

  // 6. Send push notifications
  const { default: webpush } = await import('web-push');
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUB, VAPID_PRIV);

  let sent = 0;
  for (const alert of triggered) {
    const userSubs = subs.filter(s => s.user_id === alert.user_id);
    const ticker   = alert.exchange === 'BSE' ? `${alert.symbol}.BO` : `${alert.symbol}.NS`;
    const price    = prices[ticker]?.price;
    const payload  = JSON.stringify({
      title: `🔔 ${alert.symbol} Alert Triggered`,
      body:  `${alert.symbol} is now ₹${price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })} — ${alert.condition === 'above' ? 'above' : 'below'} your ₹${alert.target_price} target.`,
      url:   '/dashboard/watchlist',
      tag:   `alert-${alert.id}`,
    });
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch { /* expired subscription — ignore */ }
    }
  }

  return Response.json({ checked: alerts.length, triggered: triggered.length, sent });
}

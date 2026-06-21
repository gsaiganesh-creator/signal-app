const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function fetchSignals() {
  const res = await fetch(`${BASE}/api/signals`);
  return res.json();
}

export async function fetchStock(ticker: string) {
  const res = await fetch(`${BASE}/api/stocks/${ticker}`);
  return res.json();
}

export async function predict(payload: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/ml/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

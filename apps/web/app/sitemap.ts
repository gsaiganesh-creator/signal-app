import type { MetadataRoute } from 'next';

const BASE = 'https://signal-app-api.vercel.app';

const TOP_NSE = [
  'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','BHARTIARTL',
  'ITC','SBIN','BAJFINANCE','KOTAKBANK','WIPRO','LT','HCLTECH','ASIANPAINT',
  'MARUTI','TATAMOTORS','AXISBANK','SUNPHARMA','TITAN','ONGC','NTPC',
  'POWERGRID','BAJAJFINSV','TECHM','ADANIENT','JSWSTEEL','TATASTEEL',
  'NESTLEIND','DRREDDY','DIVISLAB','CIPLA','EICHERMOT','COALINDIA',
  'BPCL','HINDALCO','GRASIM','ULTRACEMCO','APOLLOHOSP','HDFCLIFE',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const stockPages = TOP_NSE.map(sym => ({
    url: `${BASE}/stocks/${sym}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/sign-in`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...stockPages,
  ];
}

import type { MetadataRoute } from 'next';
import { SECTORS } from '@/lib/sectors';

const BASE = 'https://signalgenie.ai';

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

  const sectorPages = SECTORS.map(s => ({
    url: `${BASE}/sectors/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${BASE}/sectors`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE}/stocks/compare`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE}/sign-in`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE}/risk-disclosure`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.4 },
    ...stockPages,
    ...sectorPages,
  ];
}

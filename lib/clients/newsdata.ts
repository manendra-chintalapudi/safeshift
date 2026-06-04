// ============================================================================
// NewsData.io API Client — Curfew/Bandh/Strike Detection
// Free tier: 200 credits/day
// Searches Indian news for mobility restrictions affecting LCV operations
// ============================================================================

import { fetchWithRetry } from '@/lib/utils/retry';
import { CACHE_TTL } from '@/lib/config/constants';

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: Array<{
    article_id: string;
    title: string;
    description: string | null;
    content: string | null;
    pubDate: string;
    source_name: string;
    category: string[];
    country: string[];
  }> | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string | null;
  published_at: string;
  source: string;
}

/**
 * Search for curfew/bandh/strike news in India, optionally filtered by city
 */
export async function searchDisruptionNews(city?: string): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    console.warn('[NewsData] NEWSDATA_API_KEY not set — skipping news check');
    return [];
  }

  try {
    // Build query: city-specific if provided, broader otherwise
    const keywords = 'curfew OR bandh OR strike OR lockdown OR "mobility restriction" OR "vehicle ban" OR "section 144"';
    const fullQuery = city
      ? `(${keywords}) AND ${city}`
      : keywords;

    const query = encodeURIComponent(fullQuery);
    const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${query}&country=in&language=en,hi&size=10`;

    console.log(`[NewsData] Searching: ${city ? `city=${city}` : 'all India'}`);

    const data = await fetchWithRetry<NewsDataResponse>(url, {
      cacheTtlMs: CACHE_TTL.NEWS,
      timeoutMs: 10000,
    });

    if (data.status !== 'success' || !data.results) {
      console.log(`[NewsData] No results for query`);
      return [];
    }

    console.log(`[NewsData] Found ${data.results.length} articles`);

    return data.results.map((article) => ({
      id: article.article_id,
      title: article.title,
      description: article.description,
      published_at: article.pubDate,
      source: article.source_name,
    }));
  } catch (error) {
    console.error('[NewsData] Error fetching news:', error);
    return [];
  }
}

/**
 * Search for disruption news for a specific city — used by adjudicator
 */
export async function searchCityDisruptionNews(city: string): Promise<NewsArticle[]> {
  return searchDisruptionNews(city);
}

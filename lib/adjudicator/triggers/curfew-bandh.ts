// ============================================================================
// Trigger: Curfew / Bandh (Mobility halt >4 hrs)
// Sources: NewsData.io + OpenRouter LLM classification
// ============================================================================

import { searchCityDisruptionNews } from '@/lib/clients/newsdata';
import { classifyDisruptionNews } from '@/lib/clients/openrouter';
import { TRIGGERS } from '@/lib/config/constants';
import type { TriggerCandidate } from '../types';

const CONFIG = TRIGGERS.curfew_bandh;

export async function checkCurfewBandhTrigger(
  city: string,
  lat: number,
  lng: number
): Promise<TriggerCandidate | null> {
  // Fetch recent disruption-related news for this city
  const articles = await searchCityDisruptionNews(city);
  if (articles.length === 0) return null;

  // Classify each article with LLM
  for (const article of articles.slice(0, 5)) {
    const classification = await classifyDisruptionNews(article.title, city);

    if (!classification) continue;
    if (!classification.is_disruption) continue;
    if (classification.severity < 6) continue;
    if (classification.estimated_hours < CONFIG.threshold) continue;

    // Check if the affected city matches our target
    const affectedCityLower = classification.affected_city?.toLowerCase() || '';
    const targetCityLower = city.toLowerCase();
    if (affectedCityLower && !affectedCityLower.includes(targetCityLower) && !targetCityLower.includes(affectedCityLower)) {
      continue;
    }

    return {
      event_type: 'curfew_bandh',
      city,
      latitude: lat,
      longitude: lng,
      severity_score: Math.min(classification.severity, 10),
      trigger_value: classification.estimated_hours,
      trigger_threshold: CONFIG.threshold,
      geofence_radius_km: CONFIG.geofence_radius_km,
      data_sources: ['newsdata', 'openrouter-llm'],
      raw_api_data: {
        article: {
          title: article.title,
          source: article.source,
          published_at: article.published_at,
        },
        classification,
      },
      verified_by_api: true,
      verified_by_llm: true,
    };
  }

  return null;
}

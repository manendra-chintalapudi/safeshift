'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { TRIGGERS } from '@/lib/config/constants';
import type { DisruptionType } from '@/lib/config/constants';
import { getTranslator } from '@/lib/i18n/translations';

interface DisruptionEvent {
  id: string;
  event_type: string;
  city: string;
  severity_score: number;
  trigger_value: number | null;
  created_at: string;
}

const SEVERITY_STYLES: Record<string, React.CSSProperties> = {
  low: { color: 'var(--teal)', border: '1px solid var(--teal)' },
  medium: { color: 'var(--ink-60)', border: '1px solid var(--ink-30)' },
  high: { color: 'var(--red-acc)', border: '1px solid var(--red-acc)' },
};

function getSeverityLevel(score: number): string {
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

export default function RiskMapPage() {
  const [events, setEvents] = useState<DisruptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLang, setUserLang] = useState('en');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from('profiles').select('language').eq('id', user.id).single();
        if (p && (p as { language: string }).language) setUserLang((p as { language: string }).language);
      }

      const { data } = await supabase
        .from('live_disruption_events')
        .select('id, event_type, city, severity_score, trigger_value, created_at')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      setEvents((data as DisruptionEvent[]) || []);
      setLoading(false);
    }

    load();
  }, []);

  const t = getTranslator(userLang);

  return (
    <div className="p-4 space-y-4">
      <h1 className="serif text-xl font-bold" style={{ color: 'var(--ink)' }}>{t('riskmap.title')}</h1>
      <p className="text-sm" style={{ color: 'var(--ink-60)' }}>{t('riskmap.subtitle')}</p>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--ink-30)' }}>{t('riskmap.loading')}</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">&#9745;</div>
          <p style={{ color: 'var(--ink-60)' }}>{t('riskmap.noDisruptions')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-30)' }}>{t('riskmap.allClear')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const eventType = event.event_type as DisruptionType;
            const trigger = TRIGGERS[eventType];
            const level = getSeverityLevel(event.severity_score);
            const severityBadgeStyle = SEVERITY_STYLES[level];
            const time = new Date(event.created_at).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={event.id} className="rounded-xl p-4" style={{ border: '1px solid var(--rule)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--teal)' }} />
                      <span className="font-medium" style={{ color: 'var(--ink)' }}>{trigger?.label || event.event_type}</span>
                    </div>
                    <div className="text-sm ml-4" style={{ color: 'var(--ink-60)' }}>{event.city}</div>
                  </div>
                  <span className="mono text-xs font-bold uppercase px-2 py-1 rounded-full" style={severityBadgeStyle}>
                    {level}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm" style={{ color: 'var(--ink-60)' }}>
                  <span>{t('riskmap.severity')}: {event.severity_score.toFixed(1)}</span>
                  {event.trigger_value != null && (
                    <span>{t('riskmap.value')}: {event.trigger_value} {trigger?.unit || ''}</span>
                  )}
                </div>
                <div className="mono mt-1 text-xs" style={{ color: 'var(--ink-30)' }}>{time}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

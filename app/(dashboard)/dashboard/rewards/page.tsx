import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { COINS } from '@/lib/config/constants';
import { getTranslator } from '@/lib/i18n/translations';

interface CoinBalanceRow {
  profile_id: string;
  balance: number;
}

interface CoinLedgerRow {
  id: string;
  activity: string;
  coins: number;
  description: string | null;
  created_at: string;
}

export default async function RewardsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [coinRes, ledgerRes, profileRes] = await Promise.all([
    supabase.from('driver_coin_balance').select('*').eq('profile_id', user.id).single(),
    supabase.from('coins_ledger')
      .select('id, activity, coins, description, created_at')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('profiles').select('language').eq('id', user.id).single(),
  ]);

  const coinBalance = (coinRes.data as unknown as CoinBalanceRow | null)?.balance || 0;
  const ledger = (ledgerRes.data as unknown as CoinLedgerRow[]) || [];
  const lang = (profileRes.data as unknown as { language: string } | null)?.language || 'en';
  const t = getTranslator(lang);

  const ACTIVITY_LABELS: Record<string, string> = {
    weekly_login: t('rewards.weeklyLogin'),
    consecutive_weeks: t('rewards.consecutiveWeeks'),
    disruption_active: t('rewards.disruptionActive'),
    referral: t('rewards.referralBonus'),
    complete_profile: t('rewards.profileCompleted'),
    clean_claims: t('rewards.cleanClaims'),
    redeemed_discount: t('rewards.redeemedDiscount'),
    redeemed_free_week: t('rewards.redeemedFreeWeek'),
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="serif text-xl font-bold" style={{ color: 'var(--ink)' }}>Rewards</h1>

      <div className="rounded-xl p-6 text-center" style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
        <div className="text-sm" style={{ opacity: 0.7 }}>Your Coin Balance</div>
        <div className="serif text-4xl font-bold mt-1">{Number(coinBalance).toLocaleString()}</div>
        <div className="text-sm mt-1" style={{ opacity: 0.7 }}>coins</div>
      </div>

      <div>
        <h2 className="serif text-lg font-bold mb-3" style={{ color: 'var(--ink)' }}>Redeem</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--rule)' }}>
            <div className="serif text-2xl font-bold" style={{ color: '#F07820' }}>₹{COINS.DISCOUNT_RATE} off</div>
            <div className="mono text-sm mt-1" style={{ color: 'var(--ink-60)' }}>{COINS.DISCOUNT_COINS_REQUIRED} coins</div>
            <button
              className="mt-3 w-full text-sm font-medium py-2 rounded-lg transition-colors"
              style={coinBalance >= COINS.DISCOUNT_COINS_REQUIRED
                ? { background: '#F07820', color: 'var(--cream)' }
                : { background: 'var(--ink-10)', color: 'var(--ink-30)', cursor: 'not-allowed' }
              }
              disabled={coinBalance < COINS.DISCOUNT_COINS_REQUIRED}
            >
              Redeem
            </button>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--rule)' }}>
            <div className="serif text-2xl font-bold" style={{ color: '#F07820' }}>{'\u20B9'}10 Off</div>
            <div className="mono text-sm mt-1" style={{ color: 'var(--ink-60)' }}>200 coins</div>
            <button
              className="mt-3 w-full text-sm font-medium py-2 rounded-lg transition-colors"
              style={coinBalance >= 200
                ? { background: '#F07820', color: 'var(--cream)' }
                : { background: 'var(--ink-10)', color: 'var(--ink-30)', cursor: 'not-allowed' }
              }
              disabled={coinBalance < 200}
            >
              Redeem
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ border: '1px solid var(--rule)' }}>
        <h3 className="serif font-medium mb-3" style={{ color: 'var(--ink)' }}>Activity History</h3>
        {ledger.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--ink-60)' }}>No coin activity yet</p>
        ) : (
          <div className="space-y-3">
            {ledger.map((entry) => {
              const date = new Date(entry.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short',
              });
              const isPositive = entry.coins > 0;

              return (
                <div key={entry.id} className="flex items-center justify-between pb-2 last:pb-0" style={{ borderBottom: '1px solid var(--ink-10)' }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {ACTIVITY_LABELS[entry.activity] || entry.activity}
                    </div>
                    {entry.description && (
                      <div className="text-xs" style={{ color: 'var(--ink-30)' }}>{entry.description}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="serif text-sm font-bold" style={{ color: isPositive ? '#F07820' : 'var(--red-acc)' }}>
                      {isPositive ? '+' : ''}{entry.coins}
                    </div>
                    <div className="mono text-xs" style={{ color: 'var(--ink-30)' }}>{date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

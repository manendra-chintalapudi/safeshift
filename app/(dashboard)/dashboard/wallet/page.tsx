import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslator } from '@/lib/i18n/translations';

interface WalletRow {
  driver_id: string;
  total_earned_inr: number;
  total_claims: number;
  flagged_claims: number;
  last_payout_at: string | null;
  this_week_earned_inr: number;
}

interface CoinBalanceRow {
  profile_id: string;
  balance: number;
}

interface PayoutRow {
  id: string;
  amount_inr: number;
  status: string;
  mock_upi_ref: string | null;
  completed_at: string | null;
  created_at: string;
}

export default async function WalletPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: walletData } = await supabase
    .from('driver_wallet')
    .select('*')
    .eq('driver_id', user.id)
    .single();

  const wallet = walletData as unknown as WalletRow | null;

  const { data: coinData } = await supabase
    .from('driver_coin_balance')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  const coins = coinData as unknown as CoinBalanceRow | null;

  const { data: payoutsData } = await supabase
    .from('payout_ledger')
    .select('id, amount_inr, status, mock_upi_ref, completed_at, created_at')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const payouts = (payoutsData as unknown as PayoutRow[]) || [];

  // Get user language for translations
  const { data: profileData } = await supabase.from('profiles').select('language').eq('id', user.id).single();
  const lang = (profileData as unknown as { language: string } | null)?.language || 'en';
  const t = getTranslator(lang);

  return (
    <div className="p-4 space-y-4">
      <h1 className="serif text-xl font-bold" style={{ color: 'var(--ink)' }}>{t('wallet.title')}</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: 'rgba(240,120,32,0.08)', border: '1px solid #F07820' }}>
          <div className="mono text-xs" style={{ color: '#F07820' }}>{t('wallet.totalEarned')}</div>
          <div className="serif text-2xl font-bold" style={{ color: '#D96A10' }}>
            ₹{Number(wallet?.total_earned_inr || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(240,120,32,0.08)', border: '1px solid #F07820' }}>
          <div className="mono text-xs" style={{ color: '#F07820' }}>{t('wallet.thisWeek')}</div>
          <div className="serif text-2xl font-bold" style={{ color: '#D96A10' }}>
            ₹{Number(wallet?.this_week_earned_inr || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'var(--cream-d)', border: '1px solid var(--rule)' }}>
        <div className="mono text-xs" style={{ color: 'var(--ink-60)' }}>{t('wallet.coinsBalance')}</div>
        <div className="serif text-2xl font-bold" style={{ color: 'var(--ink)' }}>
          {Number(coins?.balance || 0).toLocaleString()} {t('wallet.coins')}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ border: '1px solid var(--rule)' }}>
        <h3 className="serif font-medium mb-3" style={{ color: 'var(--ink)' }}>{t('wallet.payoutHistory')}</h3>
        {payouts.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--ink-60)' }}>{t('wallet.noPayouts')}</p>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => {
              const date = new Date(payout.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              });

              return (
                <div key={payout.id} className="flex items-center justify-between pb-2 last:pb-0" style={{ borderBottom: '1px solid var(--ink-10)' }}>
                  <div>
                    <div className="serif text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      ₹{Number(payout.amount_inr).toLocaleString()}
                    </div>
                    <div className="mono text-xs" style={{ color: 'var(--ink-30)' }}>
                      {payout.mock_upi_ref || payout.id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-xs font-medium" style={{ color: payout.status === 'completed' ? '#F07820' : payout.status === 'failed' ? 'var(--red-acc)' : 'var(--ink-60)' }}>
                      {payout.status}
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

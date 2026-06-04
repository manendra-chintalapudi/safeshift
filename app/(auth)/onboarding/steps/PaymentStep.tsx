'use client';

import { useState } from 'react';
import { PLAN_PACKAGES, type TierType } from '@/lib/config/constants';
import { openRazorpayCheckout, type RazorpaySuccessResponse } from '@/lib/payments/razorpay-checkout';
import { getFirstPolicyStartDate } from '@/lib/utils/date';

interface PaymentStepProps {
  tier: TierType;
  city: string;
  onNext: () => void;
  onBack: () => void;
}

export default function PaymentStep({ tier, city, onNext, onBack }: PaymentStepProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [tcAccepted, setTcAccepted] = useState(false);
  const [tcExpanded, setTcExpanded] = useState(false);

  const plan = PLAN_PACKAGES.find((p) => p.slug === tier);
  if (!plan) return null;

  // Calculate expected first policy activation date
  const activationDate = getFirstPolicyStartDate();
  const activationDateStr = activationDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handlePay = async () => {
    setProcessing(true);
    setError('');

    try {
      // Step 1: Create Razorpay order
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_slug: tier }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setError(orderData.error || 'Failed to create payment order');
        setProcessing(false);
        return;
      }

      const { orderId, amount, plan_id: planId } = orderData;

      // Step 2: Open Razorpay checkout
      await openRazorpayCheckout({
        orderId,
        amount,
        description: `SafeShift ${plan.name} Plan - Weekly Premium`,
        onSuccess: async (response: RazorpaySuccessResponse) => {
          try {
            // Step 3: Verify payment
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: planId,
                type: 'onboarding',
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              setError(verifyData.error || 'Payment verification failed');
              setProcessing(false);
              return;
            }

            // Step 4: Proceed to next step
            onNext();
          } catch (verifyErr) {
            setError(verifyErr instanceof Error ? verifyErr.message : 'Payment verification failed');
            setProcessing(false);
          }
        },
        onFailure: (errorMsg: string) => {
          setError(errorMsg || 'Payment failed. Please try again.');
          setProcessing(false);
        },
        onDismiss: () => {
          setProcessing(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <div>
      <h3 className="serif text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>Payment</h3>
      <p className="sans text-sm mb-6" style={{ color: 'var(--ink-60)' }}>
        Review your plan and make your first weekly payment.
      </p>

      {/* Summary Card */}
      <div className="rounded-xl p-5 mb-6 space-y-3" style={{ background: 'var(--cream-d)' }}>
        <div className="flex justify-between">
          <span className="mono text-sm" style={{ color: 'var(--ink-60)' }}>Plan</span>
          <span className="sans text-sm font-semibold" style={{ color: 'var(--ink)' }}>{plan.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="mono text-sm" style={{ color: 'var(--ink-60)' }}>Tier</span>
          <span className="sans text-sm font-semibold capitalize" style={{ color: 'var(--ink)' }}>{plan.tier}</span>
        </div>
        <div className="flex justify-between">
          <span className="mono text-sm" style={{ color: 'var(--ink-60)' }}>City</span>
          <span className="sans text-sm font-semibold capitalize" style={{ color: 'var(--ink)' }}>{city}</span>
        </div>
        <div className="flex justify-between">
          <span className="mono text-sm" style={{ color: 'var(--ink-60)' }}>Max Weekly Payout</span>
          <span className="sans text-sm font-semibold" style={{ color: 'var(--ink)' }}>&#8377;{plan.max_weekly_payout_inr.toLocaleString('en-IN')}</span>
        </div>
        <hr style={{ borderColor: 'var(--rule)' }} />
        <div className="flex justify-between items-center">
          <span className="sans text-base font-semibold" style={{ color: 'var(--ink)' }}>Weekly Premium</span>
          <span className="serif text-xl font-bold" style={{ color: '#F07820' }}>&#8377;{plan.weekly_premium_inr}</span>
        </div>
      </div>

      {/* Disruption Coverage */}
      <div className="mb-6">
        <h4 className="mono text-sm font-semibold mb-2" style={{ color: 'var(--ink-60)' }}>Coverage per Disruption</h4>
        <div className="space-y-2">
          {Object.entries(plan.payout_schedule).map(([event, amount]) => (
            <div key={event} className="flex justify-between text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--cream)', border: '1px solid var(--rule)' }}>
              <span className="sans capitalize" style={{ color: 'var(--ink-60)' }}>{event.replace(/_/g, ' ')}</span>
              <span className="mono font-medium" style={{ color: 'var(--ink)' }}>&#8377;{amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Waiting Period Notice */}
      <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(240,120,32,0.06)', border: '1px solid rgba(240,120,32,0.2)' }}>
        <p className="sans text-sm font-semibold mb-1" style={{ color: '#F07820' }}>
          7-13 Day Waiting Period
        </p>
        <p className="sans text-xs" style={{ color: 'var(--ink-60)', lineHeight: 1.5 }}>
          Your policy will activate on <strong style={{ color: 'var(--ink)' }}>{activationDateStr}</strong>.
          You&apos;ll be covered from that Monday. This waiting period applies only to your first policy.
        </p>
      </div>

      {/* Terms & Conditions */}
      <div className="mb-4 rounded-xl" style={{ border: '1px solid var(--rule)', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setTcExpanded(!tcExpanded)}
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ background: 'var(--cream-d)', cursor: 'pointer', border: 'none' }}
        >
          <span className="sans text-sm font-semibold" style={{ color: 'var(--ink)' }}>Terms &amp; Conditions</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: tcExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s ease' }}>
            <path d="M4 6l4 4 4-4" stroke="var(--ink-60)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {tcExpanded && (
          <div className="sans text-xs px-4 py-3" style={{ color: 'var(--ink-60)', lineHeight: 1.7, maxHeight: 280, overflowY: 'auto', borderTop: '1px solid var(--rule)' }}>
            <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8, fontSize: 13 }}>SafeShift Parametric Insurance — Terms of Service</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>1. Product Nature</p>
            <p>SafeShift is a <strong>parametric insurance product</strong>. Payouts are triggered automatically when predefined environmental thresholds are met (e.g., rainfall exceeding 65mm/day, AQI above 450, wind speed above 70 km/h). Unlike traditional insurance, payouts are not based on individual damage assessment.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>2. Coverage Period &amp; Renewal</p>
            <p>Each policy covers a <strong>Monday to Sunday</strong> weekly cycle. The payment window opens every <strong>Sunday from 6:00 AM to 11:59 PM</strong>. Policies paid during the window activate the following Monday. Failure to renew before the window closes will result in a lapse of coverage.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>3. First Policy Waiting Period</p>
            <p>Your first policy is subject to a <strong>7–13 day waiting period</strong>. Coverage begins on the Monday following completion of this period. Subsequent renewals activate immediately on Monday.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>4. Claim Verification</p>
            <p>All claims undergo <strong>dual-gate verification</strong>: (a) environmental trigger confirmation via official weather/government data sources, and (b) driver activity verification confirming you were active and within your registered zone during the disruption event. GPS location data is used to verify zone presence.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>5. Payout Limits</p>
            <p>Payouts are capped per disruption type as defined in your selected plan tier. The total weekly payout cannot exceed the <strong>maximum weekly payout limit</strong> of your plan (Normal: &#8377;2,000 / Medium: &#8377;3,000 / High: &#8377;4,000). Payouts are disbursed to your registered UPI ID.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>6. Fraud Prevention</p>
            <p>SafeShift employs automated fraud detection including GPS verification, activity monitoring, and duplicate claim checks. Fraudulent claims will result in <strong>claim rejection, account flagging, and potential permanent suspension</strong> from the platform.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>7. User Obligations</p>
            <p>You confirm that: (a) all information provided during registration (Aadhaar, DL, RC) is accurate and belongs to you, (b) you are an active Porter LCV delivery partner, (c) only one policy may be active per vehicle at any time, and (d) you will not share your account credentials.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>8. Dynamic Pricing</p>
            <p>Premiums are calculated dynamically based on real-time weather forecasts, zone risk scores, and your driving history. The displayed premium at the time of payment is final for that week.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>9. Data Privacy</p>
            <p>SafeShift collects location data, driving activity, and personal identification information solely for policy management, claim verification, and fraud prevention. Your data will not be sold to third parties. Aadhaar data is stored as a one-way hash and cannot be retrieved.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>10. Cancellation &amp; Refunds</p>
            <p>Weekly premiums are <strong>non-refundable</strong> once paid. You may choose not to renew at any time by simply not paying during the Sunday window. There are no cancellation fees or lock-in periods.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>11. Dispute Resolution</p>
            <p>Any disputes shall be resolved through SafeShift&apos;s internal grievance mechanism. If unresolved, disputes will be subject to arbitration under the Arbitration and Conciliation Act, 1996, with jurisdiction in Bangalore, Karnataka.</p>

            <p style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 10, marginBottom: 4 }}>12. Regulatory Disclaimer</p>
            <p>SafeShift is a <strong>parametric risk product</strong> and is not regulated as traditional indemnity insurance under IRDAI. This product operates as a technology-enabled disruption protection service for gig economy workers.</p>
          </div>
        )}
      </div>

      {/* T&C Checkbox */}
      <label className="flex items-start gap-3 mb-5 cursor-pointer select-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
        <input
          type="checkbox"
          checked={tcAccepted}
          onChange={(e) => setTcAccepted(e.target.checked)}
          style={{
            width: 18, height: 18, marginTop: 1, flexShrink: 0,
            accentColor: '#F07820', cursor: 'pointer',
          }}
        />
        <span className="sans text-xs" style={{ color: 'var(--ink-60)', lineHeight: 1.5 }}>
          I have read and agree to the{' '}
          <button type="button" onClick={() => setTcExpanded(true)} style={{ color: '#F07820', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
            Terms &amp; Conditions
          </button>
          {' '}of SafeShift parametric insurance.
        </span>
      </label>

      {error && <p className="text-sm mb-3" style={{ color: 'var(--red-acc)' }}>{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={processing}
          className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{ border: '1px solid var(--rule)', color: 'var(--ink-60)', background: 'transparent' }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={processing || !tcAccepted}
          className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-70"
          style={{ background: tcAccepted ? '#F07820' : '#D1D5DB', color: '#fff', cursor: tcAccepted ? 'pointer' : 'not-allowed' }}
        >
          {processing ? 'Processing...' : `Pay \u20B9${plan.weekly_premium_inr}`}
        </button>
      </div>

    </div>
  );
}

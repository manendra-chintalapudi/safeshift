// ============================================================================
// Razorpay Checkout — Uses real Razorpay on localhost, mock on deployed
// ============================================================================

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  orderId: string;
  amount: number; // in paise
  currency?: string;
  name?: string;
  description?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  prefillUpi?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure: (error: string) => void;
  onDismiss?: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Open checkout — real Razorpay on localhost, mock on deployed
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  if (isLocalhost()) {
    return openRealRazorpay(options);
  }
  return openMockCheckout(options);
}

// ── Real Razorpay (localhost only) ───────────────────────────────────────────

async function openRealRazorpay(options: RazorpayCheckoutOptions): Promise<void> {
  await loadRazorpayScript();

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) throw new Error('Razorpay key not configured');

  const rzp = new window.Razorpay({
    key: keyId,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: options.name || 'SafeShift Insurance',
    description: options.description || 'Weekly Premium Payment',
    order_id: options.orderId,
    prefill: {
      name: options.prefillName || '',
      email: options.prefillEmail || '',
      contact: options.prefillPhone || '',
    },
    theme: { color: '#F07820' },
    handler: (response: RazorpaySuccessResponse) => {
      options.onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) options.onDismiss();
      },
    },
  });

  rzp.on('payment.failed', () => {
    options.onFailure('Payment failed. Please try again.');
  });

  rzp.open();
}

// ── Mock checkout (deployed environments) ────────────────────────────────────

async function openMockCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const amountRupees = (options.amount / 100).toFixed(2);

  const overlay = document.createElement('div');
  overlay.id = 'mock-razorpay-overlay';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; right:0; bottom:0; z-index:99999;
    background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center;
    animation: mockFadeIn 0.2s ease;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background:#fff; border-radius:16px; width:380px; max-width:90vw;
    box-shadow:0 20px 60px rgba(0,0,0,0.3); overflow:hidden;
    animation: mockSlideUp 0.3s ease;
  `;

  modal.innerHTML = `
    <style>
      @keyframes mockFadeIn { from{opacity:0} to{opacity:1} }
      @keyframes mockSlideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      @keyframes mockSpin { to{transform:rotate(360deg)} }
      .mock-rzp-input { width:100%; padding:10px 12px; border:1.5px solid #E5E7EB; border-radius:8px; font-size:14px; outline:none; transition:border 0.2s; box-sizing:border-box; }
      .mock-rzp-input:focus { border-color:#F07820; }
      .mock-rzp-btn { width:100%; padding:14px; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; transition:all 0.2s; }
      .mock-rzp-btn:hover { transform:translateY(-1px); }
    </style>
    <div style="background:linear-gradient(135deg,#F07820,#FB923C); padding:20px 24px; color:#fff;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-size:16px; font-weight:800;">SafeShift Insurance</div>
          <div style="font-size:12px; opacity:0.8; margin-top:2px;">Weekly Premium Payment</div>
        </div>
        <div style="font-size:24px; font-weight:800;">\u20B9${amountRupees}</div>
      </div>
    </div>
    <div style="padding:20px 24px;" id="mock-rzp-body">
      <div style="margin-bottom:14px;">
        <label style="display:block; font-size:12px; font-weight:600; color:#6B7280; margin-bottom:4px;">UPI ID</label>
        <input class="mock-rzp-input" id="mock-rzp-upi" placeholder="yourname@upi" value="${options.prefillUpi || ''}" />
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block; font-size:12px; font-weight:600; color:#6B7280; margin-bottom:4px;">Phone Number</label>
        <input class="mock-rzp-input" id="mock-rzp-phone" placeholder="9876543210" value="${options.prefillPhone || ''}" />
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:12px; font-weight:600; color:#6B7280; margin-bottom:4px;">Name</label>
        <input class="mock-rzp-input" id="mock-rzp-name" placeholder="Your name" value="${options.prefillName || ''}" />
      </div>
      <button class="mock-rzp-btn" id="mock-rzp-pay" style="background:linear-gradient(135deg,#F07820,#FB923C); color:#fff;">
        Pay \u20B9${amountRupees}
      </button>
      <button class="mock-rzp-btn" id="mock-rzp-cancel" style="background:#F3F4F6; color:#6B7280; margin-top:8px;">
        Cancel
      </button>
    </div>
    <div style="padding:40px 24px; text-align:center; display:none;" id="mock-rzp-processing">
      <div style="width:40px; height:40px; border:3px solid #F3F4F6; border-top-color:#F07820; border-radius:50%; animation:mockSpin 0.8s linear infinite; margin:0 auto 16px;"></div>
      <div style="font-size:15px; font-weight:600; color:#1A1A1A;">Processing payment...</div>
      <div style="font-size:13px; color:#9CA3AF; margin-top:4px;">Verifying UPI transaction</div>
    </div>
    <div style="padding:40px 24px; text-align:center; display:none;" id="mock-rzp-success">
      <div style="width:56px; height:56px; border-radius:50%; background:#22C55E; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style="font-size:17px; font-weight:700; color:#1A1A1A;">Payment Successful!</div>
      <div style="font-size:13px; color:#6B7280; margin-top:4px;">\u20B9${amountRupees} paid via UPI</div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const mockPaymentId = `pay_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const mockSignature = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');

  const payBtn = document.getElementById('mock-rzp-pay');
  const cancelBtn = document.getElementById('mock-rzp-cancel');
  const body = document.getElementById('mock-rzp-body');
  const processing = document.getElementById('mock-rzp-processing');
  const success = document.getElementById('mock-rzp-success');

  function cleanup() {
    const el = document.getElementById('mock-razorpay-overlay');
    if (el) el.remove();
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => { cleanup(); if (options.onDismiss) options.onDismiss(); };
  }

  overlay.onclick = (e) => {
    if (e.target === overlay) { cleanup(); if (options.onDismiss) options.onDismiss(); }
  };

  if (payBtn) {
    payBtn.onclick = async () => {
      if (body) body.style.display = 'none';
      if (processing) processing.style.display = 'block';
      await new Promise(r => setTimeout(r, 1500));
      if (processing) processing.style.display = 'none';
      if (success) success.style.display = 'block';
      await new Promise(r => setTimeout(r, 1200));
      cleanup();
      options.onSuccess({
        razorpay_payment_id: mockPaymentId,
        razorpay_order_id: options.orderId,
        razorpay_signature: mockSignature,
      });
    };
  }
}

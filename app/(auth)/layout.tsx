export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f5' }}>
      <div className="w-full max-w-md mx-auto p-4">
        {/* Logo + brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ height: 72, width: 'auto' }} />
            <h1 style={{
              fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.04em',
              color: '#1a1a1a', margin: 0, marginLeft: '-8px',
              fontFamily: "'Inter', sans-serif",
            }}>
              Safe<span style={{ color: '#F07820' }}>Shift</span>
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 6, fontFamily: "'Inter', sans-serif" }}>
            AI-Powered Parametric Insurance for Porter LCV Partners
          </p>
        </div>

        {/* card wrapper */}
        <div style={{ borderRadius: 16, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

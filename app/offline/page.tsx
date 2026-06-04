export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
      <div className="text-center p-8">
        <h1 className="serif text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>You&apos;re Offline</h1>
        <p className="sans text-base" style={{ color: 'var(--ink-60)' }}>
          Please check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}

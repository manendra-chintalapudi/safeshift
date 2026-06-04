import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SafeShift — Parametric Insurance',
    short_name: 'SafeShift',
    description: 'Auto-pay when rain, AQI bans or cyclones stop your work. India\'s first parametric insurance for LCV delivery partners on Porter.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#F07820',
    orientation: 'portrait-primary',
    categories: ['finance', 'insurance'],
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PGhub: PGs and rented homes', short_name: 'PGhub', description: 'PGs, hostels and rented homes in Gandhinagar and Ahmedabad.',
    start_url: '/', display: 'standalone', background_color: '#f8f5ee', theme_color: '#f8f5ee', orientation: 'portrait',
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
  };
}

import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import './globals.css';

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Gestion locative`, template: `%s · ${APP_NAME}` },
  description:
    "Logiciel de gestion locative pour propriétaires, agences immobilières et résidences en Côte d'Ivoire : baux, loyers, quittances, relances et relevés de gérance.",
  applicationName: APP_NAME,
  keywords: ['gestion locative', 'loyers', 'Côte d’Ivoire', 'FCFA', 'quittance', 'agence immobilière'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#101828' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" closeButton />
        </ThemeProvider>
        <noscript>
          <div style={{ padding: 16, textAlign: 'center' }}>
            {APP_TAGLINE} — activez JavaScript pour utiliser {APP_NAME}.
          </div>
        </noscript>
      </body>
    </html>
  );
}

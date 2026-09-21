import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Digital Heroes — Golf. Give. Win.',
    template: '%s | Digital Heroes',
  },
  description:
    'A subscription platform combining golf performance tracking, monthly prize draws, and charitable giving. Feel, not fairway.',
  keywords: ['golf', 'charity', 'prize draw', 'Stableford', 'subscription', 'Digital Heroes'],
  authors: [{ name: 'Digital Heroes' }],
  openGraph: {
    title: 'Digital Heroes — Golf. Give. Win.',
    description: 'Track your golf scores, win monthly prizes, and support causes you care about.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

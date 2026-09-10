import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NOX — Your Second Self',
  description: 'Personal Operating System connecting Goals, Roadmaps, Learning, Events, Habits, Tasks, Notes, and Time.',
  icons: {
    icon: '/Nox_logo.png',
    shortcut: '/Nox_logo.png',
    apple: '/Nox_logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-600 selection:text-white min-h-screen transition-colors">
        {children}
      </body>
    </html>
  );
}

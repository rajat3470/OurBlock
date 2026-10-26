import type { Metadata } from 'next';
import { DM_Sans, DM_Serif_Text } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const dmSerifText = DM_Serif_Text({ weight: '400', subsets: ['latin'], variable: '--font-dm-serif-text' });

export const metadata: Metadata = {
  title: 'mohallaMitr - Super Admin Dashboard',
  description: 'Manage societies, businesses, and users across the mohallaMitr platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerifText.variable} font-sans`}>{children}</body>
    </html>
  );
}

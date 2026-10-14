import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocationProvider } from '@/src/context/LocationContext';
import { AuthProvider } from '@/src/context/AuthContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talent Pipeline Tracker",
  description: "Sistema de gestión de candidatos — Panel de seguimiento de talento",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://trackflow.com/talent-pipeline",
  },
  openGraph: {
    title: "Talent Pipeline Tracker",
    description: "Sistema de gestión de candidatos — Panel de seguimiento de talento",
    url: "https://trackflow.com/talent-pipeline",
    siteName: "TrackFlow",
    type: "website",
    locale: "es",
    images: [
      {
        url: "https://trackflow.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "TrackFlow Talent Pipeline",
      },
    ],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <LocationProvider>{children}</LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventario | TrackFlow",
  description: "Gestión interna de stock y movimientos de almacén",
  robots: { index: true, follow: true },
  canonical: "https://trackflow.com/backoffice/inventory",
  openGraph: {
    title: "Inventario | TrackFlow",
    description: "Gestión interna de stock y movimientos de almacén",
    url: "https://trackflow.com/backoffice/inventory",
    siteName: "TrackFlow",
    type: "website",
    locale: "es",
    images: [
      {
        url: "https://trackflow.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "TrackFlow Backoffice",
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
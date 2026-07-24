import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import VisitTracker from "@/components/VisitTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = 'https://fzacaria.com.ar'

export const metadata: Metadata = {
  title: "Inmobiliaria Florencia Zacaría | Ventas y Alquileres de Propiedades",
  description:
    "Inmobiliaria Florencia Zacaría: venta y alquiler de casas, chalets, departamentos, campos, lotes y locales. Tasaciones sin cargo. Asesoramiento profesional inmobiliario.",
  keywords: [
    "inmobiliaria",
    "Florencia Zacaría",
    "venta propiedades",
    "alquiler",
    "casas",
    "departamentos",
    "chalets",
    "campos",
    "lotes",
    "locales",
    "tasaciones",
    "Pinamar",
    "Valeria del Mar",
    "Ostende",
  ],
  authors: [{ name: "Inmobiliaria Florencia Zacaría" }],
  openGraph: {
    title: "Inmobiliaria Florencia Zacaría",
    description: "Venta y alquiler de propiedades en Pinamar. Tasaciones sin cargo. Asesoramiento profesional inmobiliario.",
    type: "website",
    locale: "es_AR",
    siteName: "Inmobiliaria Florencia Zacaría",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "Inmobiliaria Florencia Zacaría",
        secureUrl: `${SITE_URL}/og-default.jpg`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inmobiliaria Florencia Zacaría",
    description: "Venta y alquiler de propiedades en Pinamar. Tasaciones sin cargo.",
    images: [`${SITE_URL}/og-default.jpg`],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <VisitTracker />
        <Toaster />
      </body>
    </html>
  );
}

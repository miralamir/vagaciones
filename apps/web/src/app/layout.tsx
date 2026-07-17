import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VAGACIONES",
  description: "Administrador personal de viajes",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#1b7f83",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

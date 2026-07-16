import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content OS",
  description: "Estudio creativo personal impulsado por IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-bg text-text antialiased">{children}</body>
    </html>
  );
}

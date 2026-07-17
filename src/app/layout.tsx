import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

// Nombre visible de la app — el nombre interno del código/repo (content-os)
// no cambia, solo lo que ve el usuario (pestaña del navegador, sidebar).
export const metadata: Metadata = {
  title: "Estudio Creativo JR",
  description: "Estudio creativo personal impulsado por IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-bg text-text antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

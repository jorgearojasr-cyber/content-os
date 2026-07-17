import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

// Nombre visible de la app — el nombre interno del código/repo (content-os)
// no cambia, solo lo que ve el usuario (pestaña del navegador, sidebar).
export const metadata: Metadata = {
  title: "Estudio Creativo JR",
  description: "Estudio creativo personal impulsado por IA.",
};

// Tipografías de marca (ver Dashboard.dc.html) — se exponen como variables
// CSS y se enchufan en --font-display/--font-mono en globals.css, con la
// pila de sistema como respaldo si la fuente no carga.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-fraunces",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`h-full ${fraunces.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-full bg-bg text-text antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

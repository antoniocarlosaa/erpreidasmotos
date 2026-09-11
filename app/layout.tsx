import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gerenciador de Contratos e Transferências",
  description: "Sistema profissional para gestão de contratos e transferências de veículos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className="antialiased bg-background text-foreground min-h-screen"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

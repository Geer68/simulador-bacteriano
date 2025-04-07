import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulador Bacteriano 2008",
  description: "Creado fines educativos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

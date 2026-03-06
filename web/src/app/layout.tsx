import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppHeader } from "@/components/app-header";
import { TerminalProvider } from "@/components/terminal/terminal-provider";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Engy",
  description: "Engineering workspace manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} dark`}>
      <body className="font-sans antialiased">
        <Providers>
          <TerminalProvider>
            <div className="flex min-h-screen flex-col">
              <AppHeader />
              <main className="flex flex-1 flex-col">{children}</main>
            </div>
          </TerminalProvider>
        </Providers>
      </body>
    </html>
  );
}

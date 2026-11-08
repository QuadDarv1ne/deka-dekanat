import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Дека — цифровой деканат (концепт)",
  description:
    "Концепт личного кабинета студента \"цифровой деканат будущего\": расписание, оценки, заявки и справки, объявления и ИИ-ассистент — в одном месте. Прототип для конкурса, не официальный сервис вуза.",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#12181d" },
  ],
  width: "device-width",
  initialScale: 1,
  // maximumScale не ограничиваем: запрет масштабирования ломает доступность
  // (WCAG 1.4.4) — людям с плохим зрением нужно увеличивать страницу.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background text-foreground font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="top-center" richColors />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}

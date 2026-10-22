import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Atkinson Hyperlegible was drawn so look-alike characters (l / I / 1, O / 0) stay
// distinct — the same confusions this dashboard is about.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: "Niera OCR benchmark",
  description: "How open OCR models read Niera's handwriting, formulas and diagrams.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${atkinsonMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#content"
          className="sr-only z-50 rounded-md bg-ink px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <TooltipProvider delayDuration={150}>
          <Suspense fallback={<div className="h-[105px] border-b border-rule bg-sheet" />}>
            <SiteHeader />
          </Suspense>
          <main id="content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}

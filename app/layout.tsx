import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PWAInstallModal } from "@/components/PWAInstallModal";
import { ThemeProvider } from "@/lib/contexts/theme-context";
import { PWAInstallProvider } from "@/lib/contexts/pwa-install-context";
import { StatsProvider } from "@/lib/contexts/stats-context";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LevelUpCelebration } from "@/components/ui/LevelUpCelebration";
import { TabProvider } from "@/lib/contexts/tab-context";
import { TabShellWrapper } from "@/components/layout/TabShellWrapper";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { OnboardingGate } from "@/components/ui/OnboardingGate";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { MobileWordTray } from "@/components/chat/MobileWordTray";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { GlassRefractionFilter } from "@/components/ui/GlassRefractionFilter";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000')),
  title: "Aura | Language Training",
  description: "AI-powered English immersion.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aura",
    // Apple-specific enhancements
    startupImage: "/apple-startup.png",
  },
  // Enhanced SEO and social sharing
  openGraph: {
    title: "Aura - AI Language Training",
    description: "Learn English with AI-powered conversations and personalized feedback.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura - AI Language Training",
    description: "Learn English with AI-powered conversations and personalized feedback.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090F1A" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Apple-specific optimizations
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ── Performance: Resource Hints ───────────────────────────────── */}
        {/* WHY: preconnect establishes early connections to font CDN,
            saving ~100-300ms on font download. dns-prefetch is the fallback. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* ── Performance: Critical CSS Inline ─────────────────────────── */}
        {/* WHY: Inlining essential styles eliminates the render-blocking
            CSS request. The browser can paint the correct background color
            and text color IMMEDIATELY, giving users visual feedback within
            the first frame. Without this, users see a white flash (FOUC). */}
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
          html{color-scheme:dark;background:#000;color:#fff}
          html.light{color-scheme:light;background:#F8F9FA;color:#000000}
          body{margin:0;background:#000;min-height:100vh;min-height:100dvh;overflow:hidden}
          html.light body{background:#F8F9FA}
          .skip-link{position:fixed;top:-100%;left:1rem;z-index:9999;padding:.5rem 1rem;background:#00d4d4;color:#000;font-weight:700;border-radius:8px;text-decoration:none}
          .skip-link:focus{top:1rem}
        `}} />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (-webkit-device-pixel-ratio: 3)" href="/splash/splash-1170.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 430px) and (-webkit-device-pixel-ratio: 3)" href="/splash/splash-1290.png" />
      </head>
      <body className={`${sora.className} antialiased bg-[var(--background)] text-[var(--foreground)] min-h-screen overflow-hidden transition-colors duration-300 select-none`}
        style={{
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          overscrollBehavior: 'none',
          scrollBehavior: 'smooth',
        }}
      >
        {/* SVG filter definitions for Liquid Glass refraction — mounted once, used via CSS url() */}
        <GlassRefractionFilter />
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AnalyticsProvider>
          <PWAInstallProvider>
            <ThemeProvider>
              <ErrorBoundary>
                <StatsProvider>
                  <TabProvider>
                    <OnboardingGate>
                      <NetworkStatus />
        <MobileWordTray />
                      <LevelUpCelebration />
                      <PWAInstallModal />
                      <div className="flex h-[100dvh] w-full overflow-hidden">
                        {/* Sidebar - Desktop Only (Floating Island) */}
                        <div className="hidden md:flex md:w-[300px] md:shrink-0 md:p-5 md:pr-0">
                          <Sidebar />
                        </div>
                        
                        {/* Main Content Area */}
                        <main id="main-content" className="flex-1 h-[100dvh] overflow-y-auto no-scrollbar relative md:pb-0 main-content-shell">
                          <TabShellWrapper>{children}</TabShellWrapper>
                        </main>
                        
                        {/* Bottom Navigation - Mobile Only (Floating Island) */}
                        <BottomNav />
                      </div>
                    </OnboardingGate>
                  </TabProvider>
                </StatsProvider>
              </ErrorBoundary>
            </ThemeProvider>
          </PWAInstallProvider>
        </AnalyticsProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              borderRadius: '20px',
            }
          }}
        />
      </body>
    </html>
  );
}

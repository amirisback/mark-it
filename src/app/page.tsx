import { getCurrentDictionary } from "@/lib/i18n-server";
import { generateWebsiteJsonLd } from "@/lib/seo";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { PresetsShowcaseSection } from "@/components/landing/presets-showcase-section";
import { FaqSection } from "@/components/landing/faq-section";

export default async function Home() {
  const { locale, dict } = await getCurrentDictionary();
  const websiteJsonLd = generateWebsiteJsonLd(locale);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
      {/* JSON-LD Structured Data — WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd),
        }}
      />

      {/* Main App Header */}
      <Header appName={dict.common.appName} />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {/* 1. Hero Banner */}
        <HeroSection />

        {/* 2. Interactive Watermark Studio Workspace */}
        <StudioWorkspace />

        {/* 3. Core Features & Client-Side Privacy */}
        <FeaturesSection />

        {/* 4. How It Works (3-Step Guide) */}
        <HowItWorksSection />

        {/* 5. Preset Showcase */}
        <PresetsShowcaseSection />

        {/* 6. FAQ Accordion */}
        <FaqSection />
      </main>

      {/* Footer */}
      <Footer appName={dict.common.appName} />
    </div>
  );
}

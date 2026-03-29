import type { Json } from "@/integrations/supabase/types";

/**
 * Determines if a lead came from the scraper pipeline or from the app (organic signup).
 * Checks both the `source` field and `metadata.signup_source.utm_source`.
 */
export function getLeadSourceType(
  source: string | null | undefined,
  metadata: Json | null | undefined
): "scraper" | "app" {
  // 1. Check metadata.signup_source.utm_source first (most reliable)
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const signupSource = (metadata as Record<string, Json | undefined>).signup_source;
    if (signupSource && typeof signupSource === "object" && !Array.isArray(signupSource)) {
      const utmSource = ((signupSource as Record<string, Json | undefined>).utm_source || "") as string;
      if (utmSource) {
        const utm = utmSource.toLowerCase();
        if (utm.includes("scrape") || utm.includes("google") || utm.includes("maps")) {
          return "scraper";
        }
        // Any other utm_source = app/organic
        return "app";
      }
    }
  }

  // 2. Fallback: check the source field
  const s = (source || "").toLowerCase();
  if (s === "" || s.includes("scrape") || s.includes("google") || s.includes("maps")) {
    return "scraper";
  }

  return "app";
}

export function getSourceLabel(type: "scraper" | "app"): string {
  return type === "scraper" ? "🔍 Scraper" : "📱 App";
}

export function getSourceBadgeClass(type: "scraper" | "app"): string {
  return type === "scraper"
    ? "bg-info/10 text-info"
    : "bg-accent text-accent-foreground";
}

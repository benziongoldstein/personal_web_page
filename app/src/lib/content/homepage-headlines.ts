import type { ContentItem, FeedSource } from "@/lib/content/types";

const HTTP_TIMEOUT_MS = 7000;

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function metaContent(html: string, key: string): string {
  const byProperty = new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const byName = new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(byProperty)?.[1] ?? html.match(byName)?.[1] ?? "";
}

function absoluteUrl(url: string, baseUrl: string): string {
  if (!url) {
    return baseUrl;
  }
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

function firstH1(html: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? decodeEntities(stripHtml(match[1])) : "";
}

function firstJsonLdHeadline(html: string): { title: string; url?: string; imageUrl?: string } | null {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    const raw = decodeEntities(script[1]).trim();
    if (!raw) {
      continue;
    }
    try {
      const json = JSON.parse(raw);
      const objects = Array.isArray(json) ? json : [json];
      for (const entry of objects) {
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const title = typeof entry.headline === "string" ? stripHtml(entry.headline) : "";
        if (!title || title.length < 12) {
          continue;
        }
        const url =
          (typeof entry.url === "string" && entry.url) ||
          (typeof entry["@id"] === "string" && entry["@id"]) ||
          (entry.mainEntityOfPage && typeof entry.mainEntityOfPage["@id"] === "string"
            ? entry.mainEntityOfPage["@id"]
            : "");
        const imageUrl =
          typeof entry.image === "string"
            ? entry.image
            : Array.isArray(entry.image) && typeof entry.image[0] === "string"
              ? entry.image[0]
              : entry.image && typeof entry.image.url === "string"
                ? entry.image.url
                : "";
        return { title, url, imageUrl };
      }
    } catch {
      // Ignore invalid json-ld chunks and continue.
    }
  }
  return null;
}

export async function fetchHomepageHeadline(source: FeedSource): Promise<ContentItem | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(source.homepageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 FocusDashboard/1.0" },
      cache: "no-store"
    });
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const jsonLd = firstJsonLdHeadline(html);
    const ogTitle = decodeEntities(metaContent(html, "og:title"));
    const ogImage = metaContent(html, "og:image");
    const ogUrl = metaContent(html, "og:url");
    const h1Title = firstH1(html);

    const title = jsonLd?.title || h1Title || ogTitle;
    if (!title || title.length < 8) {
      return null;
    }

    const url = absoluteUrl(jsonLd?.url || ogUrl || source.homepageUrl, source.homepageUrl);
    const imageUrl = absoluteUrl(jsonLd?.imageUrl || ogImage || "", source.homepageUrl);

    return {
      id: `homepage-headline-${source.name}`,
      title,
      summary: `כותרת ראשית מעמוד הבית של ${source.name}`,
      url,
      imageUrl: imageUrl || undefined,
      source: source.name,
      sourcePosition: 1,
      isHeadline: true,
      publishedAt: new Date().toISOString(),
      category: source.category,
      language: source.language
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

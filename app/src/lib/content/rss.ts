import type { ContentItem, FeedSource } from "@/lib/content/types";

const HTTP_TIMEOUT_MS = 8000;
const IMAGE_ENRICH_LIMIT = 8;

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": "\"",
    "&apos;": "'",
    "&#39;": "'",
    "&lt;": "<",
    "&gt;": ">"
  };

  let decoded = value;

  // Some feeds are double-encoded (e.g. &amp;#034;), so decode iteratively.
  for (let i = 0; i < 3; i += 1) {
    const previous = decoded;

    Object.entries(namedEntities).forEach(([entity, replacement]) => {
      decoded = decoded.replaceAll(entity, replacement);
    });

    decoded = decoded
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
        const codePoint = parseInt(hex, 16);
        return Number.isNaN(codePoint) ? "" : String.fromCodePoint(codePoint);
      })
      .replace(/&#([0-9]+);/g, (_, num: string) => {
        const codePoint = parseInt(num, 10);
        return Number.isNaN(codePoint) ? "" : String.fromCodePoint(codePoint);
      });

    if (decoded === previous) {
      break;
    }
  }

  return decoded;
}

function cleanHtml(value: string): string {
  const withoutScripts = value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/[\u200e\u200f]/g, "");

  return decodeHtmlEntities(withoutScripts).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? "";
}

function extractAttribute(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*>`, "i");
  const match = xml.match(regex);
  return match?.[1] ?? "";
}

function extractImageUrl(itemXml: string): string | undefined {
  const enclosure = extractAttribute(itemXml, "enclosure", "url");
  if (/\.(jpg|jpeg|png|webp|gif)/i.test(enclosure)) {
    return enclosure;
  }

  const media = extractAttribute(itemXml, "media:content", "url");
  if (media) {
    return media;
  }

  const encoded = extractTag(itemXml, "content:encoded");
  const fromEncoded = encoded.match(/<img[^>]+src="([^"]+)"/i)?.[1];
  if (fromEncoded) {
    return fromEncoded;
  }

  const description = extractTag(itemXml, "description");
  const fromDescription = description.match(/<img[^>]+src="([^"]+)"/i)?.[1];
  if (fromDescription) {
    return fromDescription;
  }

  return undefined;
}

function getSummary(itemXml: string): string {
  const summaryRaw =
    extractTag(itemXml, "description") ||
    extractTag(itemXml, "summary") ||
    extractTag(itemXml, "content:encoded");
  return cleanHtml(summaryRaw).slice(0, 260);
}

function extractMetaContent(html: string, property: string): string {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  return html.match(regex)?.[1]?.trim() ?? "";
}

async function fetchOgImageFromArticle(url: string): Promise<string | undefined> {
  if (!/^https?:\/\//i.test(url)) {
    return undefined;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 FocusDashboard/1.0" },
      cache: "no-store"
    });
    if (!response.ok) {
      return undefined;
    }
    const html = await response.text();
    const ogImage = extractMetaContent(html, "og:image");
    if (ogImage) {
      return ogImage;
    }
    const twitterImage = extractMetaContent(html, "twitter:image");
    return twitterImage || undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichMissingImages(items: ContentItem[]): Promise<ContentItem[]> {
  const missing = items.filter((item) => !item.imageUrl).slice(0, IMAGE_ENRICH_LIMIT);
  if (missing.length === 0) {
    return items;
  }

  const lookups = await Promise.all(
    missing.map(async (item) => ({
      id: item.id,
      imageUrl: await fetchOgImageFromArticle(item.url)
    }))
  );
  const byId = new Map(lookups.filter((entry) => entry.imageUrl).map((entry) => [entry.id, entry.imageUrl as string]));

  return items.map((item) => (byId.has(item.id) ? { ...item, imageUrl: byId.get(item.id) } : item));
}

function normalizePublishedAt(itemXml: string): string {
  const rawPublished =
    cleanHtml(extractTag(itemXml, "pubDate")) ||
    cleanHtml(extractTag(itemXml, "published")) ||
    cleanHtml(extractTag(itemXml, "updated")) ||
    cleanHtml(extractTag(itemXml, "dc:date"));

  if (!rawPublished) {
    return new Date().toISOString();
  }

  const parsed = Date.parse(rawPublished);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  // Some feeds include extra words/timezone suffixes that break Date.parse.
  const normalized = rawPublished
    .replace(/\s+\([^)]*\)\s*$/, "")
    .replace(/\s+GMT[+-]\d{4}\s*$/, "")
    .replace(/\s+IST\s*$/, "");
  const retry = Date.parse(normalized);

  return Number.isNaN(retry) ? new Date().toISOString() : new Date(retry).toISOString();
}

function parseRssItems(xml: string): string[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi);
  if (items && items.length > 0) {
    return items;
  }

  const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/gi);
  return atomEntries ?? [];
}

function parseSingleItem(itemXml: string, source: FeedSource, index: number): ContentItem | null {
  const title = cleanHtml(extractTag(itemXml, "title"));
  if (!title) {
    return null;
  }

  const link =
    cleanHtml(extractTag(itemXml, "link")) ||
    extractAttribute(itemXml, "link", "href") ||
    "#";

  const publishedAt = normalizePublishedAt(itemXml);

  return {
    id: `${source.name}-${index}-${title.slice(0, 24)}`,
    title,
    summary: getSummary(itemXml) || "לחץ לכתבה המלאה במקור.",
    url: link,
    imageUrl: extractImageUrl(itemXml),
    source: source.name,
    sourcePosition: index + 1,
    isHeadline: index < 2,
    publishedAt,
    category: source.category,
    language: source.language
  };
}

export async function fetchSourceItems(source: FeedSource): Promise<ContentItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 FocusDashboard/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const rawItems = parseRssItems(xml).slice(0, 18);
    const parsed = rawItems
      .map((item, index) => parseSingleItem(item, source, index))
      .filter((item): item is ContentItem => item !== null);
    return enrichMissingImages(parsed);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

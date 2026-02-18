import { FEED_SOURCES } from "@/lib/content/sources";
import { fetchSourceItems } from "@/lib/content/rss";
import { getCurrentWindowKey, getNextUpdateDate } from "@/lib/content/time";
import type { ContentItem, Snapshot } from "@/lib/content/types";

type SnapshotCache = {
  windowKey: string;
  snapshot: Snapshot;
};

let memoryCache: SnapshotCache | null = null;
const TOTAL_ITEMS = 25;
const FRESHNESS_WINDOW_MINUTES = 60;

function dedupeByTitle(items: ContentItem[]): ContentItem[] {
  const seen = new Set<string>();
  const deduped: ContentItem[] = [];

  for (const item of items) {
    const normalized = item.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      deduped.push(item);
    }
  }

  return deduped;
}

function pickByCategory(items: ContentItem[], category: ContentItem["category"], limit: number): ContentItem[] {
  return items.filter((item) => item.category === category).slice(0, limit);
}

function buildRtlBasicItem(now: Date): ContentItem {
  const examples = [
    {
      id: "rtl-basic-stack",
      title: "RTL בסיסי: מימוש מחסנית (Stack) עם push/pop",
      summary:
        "גישות: 1) מערך + מצביע יחיד (פשוט ומהיר), 2) Ring buffer עם ניהול מלא/ריק, 3) גרסת dual-port לצינור עמוס. דירוג: פשטות=גישה 1, סקיילביליות=גישה 2, ביצועים=גישה 3.",
      imageSeed: "rtl-basic-stack"
    },
    {
      id: "rtl-basic-bit-place",
      title: "RTL בסיסי: השמת ביטים במיקומים שונים בוקטור",
      summary:
        "גישות: 1) מסכות ו-shift ידני, 2) part-select דינמי, 3) פונקציית pack ייעודית. דירוג: קריאות=3, עלות חומרה=1, סיכון באגים=2.",
      imageSeed: "rtl-basic-bitplace"
    },
    {
      id: "rtl-basic-fsm",
      title: "RTL בסיסי: בחירת קידוד FSM קטן",
      summary:
        "גישות: 1) binary encoding, 2) one-hot, 3) gray. דירוג מהיר: שטח=1, תזמון=2, מעבר בטוח בין מצבים קרובים=3.",
      imageSeed: "rtl-basic-fsm"
    }
  ] as const;

  const pick = examples[now.getHours() % examples.length];

  return {
    id: pick.id,
    title: pick.title,
    summary: pick.summary,
    url: "#",
    imageUrl: `https://picsum.photos/seed/${pick.imageSeed}/700/450`,
    source: "RTL Design",
    publishedAt: now.toISOString(),
    category: "rtl",
    language: "he"
  };
}

function buildStaticFallbackItems(now: Date): ContentItem[] {
  const nowIso = now.toISOString();
  return [
    {
      id: "fallback-news",
      title: "אין כרגע נתונים חיים מהמקורות - מוצג מצב גיבוי",
      summary: "העדכון הבא ינסה שוב להביא ראשי/משני מחדשות, ספורט ומניות מהמקורות שהוגדרו.",
      url: "#",
      imageUrl: "https://picsum.photos/seed/fallback-news/700/450",
      source: "System",
      publishedAt: nowIso,
      category: "news",
      language: "he"
    },
    buildRtlBasicItem(now)
  ];
}

function sortByDate(items: ContentItem[]): ContentItem[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.publishedAt) || 0;
    const bTime = Date.parse(b.publishedAt) || 0;
    return bTime - aTime;
  });
}

function buildFallbackSnapshot(now: Date): Snapshot {
  const staticItems = buildStaticFallbackItems(now);
  const leadStory = staticItems[0];
  return {
    updatedAt: now.toISOString(),
    nextUpdateAt: getNextUpdateDate(now).toISOString(),
    leadStory,
    quickStories: [
      "אין כרגע גישה למקורות, מוצג מצב fallback זמני.",
      "העדכון הבא יתבצע בחלון הזמן הבא.",
      "ניתן להמשיך לקרוא מתוך הקישורים כשיהיו זמינים."
    ],
    items: staticItems,
    unavailableSources: FEED_SOURCES.map((source) => source.name),
    freshnessWindowMinutes: FRESHNESS_WINDOW_MINUTES,
    freshItemsCount: 0,
    staleFallbackCount: staticItems.length
  };
}

function pickHeadAndSecondary(
  sourceResults: Array<{ sourceName: string; items: ContentItem[] }>,
  category: ContentItem["category"],
  total: number
): ContentItem[] {
  const inCategory = sourceResults.filter(({ items }) => items.some((item) => item.category === category));

  const heads = inCategory
    .map(({ items }) => items.find((item) => item.category === category))
    .filter((item): item is ContentItem => Boolean(item));

  const secondaries: ContentItem[] = [];
  let depth = 1;
  while (heads.length + secondaries.length < total && depth < 8) {
    for (const sourceEntry of inCategory) {
      const candidate = sourceEntry.items.filter((item) => item.category === category)[depth];
      if (candidate) {
        secondaries.push(candidate);
        if (heads.length + secondaries.length >= total) {
          break;
        }
      }
    }
    depth += 1;
  }

  return [...heads, ...secondaries].slice(0, total);
}

function isFreshWithinMinutes(item: ContentItem, now: Date, minutes: number): boolean {
  const publishedTime = Date.parse(item.publishedAt);
  if (Number.isNaN(publishedTime)) {
    return true;
  }

  const diffMs = now.getTime() - publishedTime;
  return diffMs >= 0 && diffMs <= minutes * 60 * 1000;
}

function fillToLimit(primary: ContentItem[], fallbackPool: ContentItem[], limit: number): ContentItem[] {
  const filled = [...primary];
  for (const item of fallbackPool) {
    if (filled.length >= limit) {
      break;
    }
    if (!filled.some((existing) => existing.id === item.id)) {
      filled.push(item);
    }
  }
  return filled.slice(0, limit);
}

export async function getSnapshot(): Promise<Snapshot> {
  const now = new Date();
  const windowKey = getCurrentWindowKey(now);
  const useWindowCache = process.env.NODE_ENV === "production";

  if (useWindowCache && memoryCache && memoryCache.windowKey === windowKey) {
    return memoryCache.snapshot;
  }

  const sourceResultsRaw = await Promise.all(FEED_SOURCES.map((source) => fetchSourceItems(source)));
  const unavailableSources = FEED_SOURCES.filter((_, index) => sourceResultsRaw[index].length === 0).map(
    (source) => source.name
  );
  const sourceResults = FEED_SOURCES.map((source, index) => ({
    sourceName: source.name,
    items: sourceResultsRaw[index]
  }));

  const fetched = dedupeByTitle(sortByDate(sourceResultsRaw.flat()));
  if (fetched.length === 0) {
    const fallback = buildFallbackSnapshot(now);
    if (useWindowCache) {
      memoryCache = { windowKey, snapshot: fallback };
    }
    return fallback;
  }

  const freshFetched = fetched.filter((item) => isFreshWithinMinutes(item, now, FRESHNESS_WINDOW_MINUTES));
  const freshSourceResults = sourceResults.map((entry) => ({
    sourceName: entry.sourceName,
    items: entry.items.filter((item) => isFreshWithinMinutes(item, now, FRESHNESS_WINDOW_MINUTES))
  }));

  // Build like major sites: prioritize "head + secondary" from the last hour.
  const newsFresh = pickHeadAndSecondary(freshSourceResults, "news", 12);
  const sportsFresh = pickHeadAndSecondary(freshSourceResults, "sports", 8);
  const marketFreshFromHeads = pickHeadAndSecondary(freshSourceResults, "market", 4);
  const marketFresh = marketFreshFromHeads.length > 0 ? marketFreshFromHeads : pickByCategory(freshFetched, "market", 4);
  const rtlBasic = buildRtlBasicItem(now);

  const freshComposed = dedupeByTitle([...newsFresh, ...sportsFresh, ...marketFresh, rtlBasic]);
  const allNews = pickHeadAndSecondary(sourceResults, "news", 14);
  const allSports = pickHeadAndSecondary(sourceResults, "sports", 9);
  const allMarketFromHeads = pickHeadAndSecondary(sourceResults, "market", 5);
  const allMarket = allMarketFromHeads.length > 0 ? allMarketFromHeads : pickByCategory(fetched, "market", 5);
  const fallbackPool = dedupeByTitle(sortByDate([...allNews, ...allSports, ...allMarket, ...fetched]));
  const composed = fillToLimit(freshComposed, fallbackPool, TOTAL_ITEMS);

  const freshIds = new Set(freshFetched.map((item) => item.id));
  let freshItemsCount = 0;
  for (const item of composed) {
    if (item.category === "rtl") {
      freshItemsCount += 1;
      continue;
    }
    if (freshIds.has(item.id)) {
      freshItemsCount += 1;
    }
  }

  const leadStory = composed[0] ?? fetched[0];
  const quickSource = newsFresh.length > 0 ? newsFresh : allNews;
  const quickStories = quickSource.slice(1, 5).map((item) => item.title);

  const snapshot: Snapshot = {
    updatedAt: now.toISOString(),
    nextUpdateAt: getNextUpdateDate(now).toISOString(),
    leadStory,
    quickStories,
    items: composed,
    unavailableSources,
    freshnessWindowMinutes: FRESHNESS_WINDOW_MINUTES,
    freshItemsCount,
    staleFallbackCount: Math.max(0, composed.length - freshItemsCount)
  };

  if (useWindowCache) {
    memoryCache = { windowKey, snapshot };
  }
  return snapshot;
}

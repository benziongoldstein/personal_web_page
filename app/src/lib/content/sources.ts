import type { FeedSource } from "@/lib/content/types";

// Free public feeds. Some feeds may occasionally fail and are handled gracefully.
export const FEED_SOURCES: FeedSource[] = [
  {
    name: "Ynet",
    url: "https://www.ynet.co.il/Integration/StoryRss2.xml",
    homepageUrl: "https://www.ynet.co.il/home/0,7340,L-8,00.html",
    category: "news",
    language: "he"
  },
  {
    name: "ערוץ 14",
    url: "https://www.now14.co.il/feed/",
    homepageUrl: "https://www.now14.co.il/",
    category: "news",
    language: "he"
  },
  {
    name: "Fox News",
    url: "https://feeds.foxnews.com/foxnews/latest",
    homepageUrl: "https://www.foxnews.com/",
    category: "news",
    language: "en"
  },
  {
    name: "ספורט 5",
    url: "https://www.sport5.co.il/SIP_STORAGE/FILES/rss.xml",
    homepageUrl: "https://www.sport5.co.il/",
    category: "sports",
    language: "he"
  },
  {
    name: "SPORT1",
    url: "https://sport1.maariv.co.il/feed/",
    homepageUrl: "https://sport1.maariv.co.il/",
    category: "sports",
    language: "he"
  },
  {
    name: "CNBC Markets",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    homepageUrl: "https://www.cnbc.com/markets/",
    category: "market",
    language: "en"
  }
];

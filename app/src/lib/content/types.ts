export type ItemCategory = "news" | "sports" | "market" | "rtl" | "ai";

export type LanguageCode = "he" | "en";

export type FeedSource = {
  name: string;
  url: string;
  category: ItemCategory;
  language: LanguageCode;
};

export type ContentItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  source: string;
  sourcePosition: number;
  isHeadline: boolean;
  publishedAt: string;
  category: ItemCategory;
  language: LanguageCode;
};

export type Snapshot = {
  updatedAt: string;
  nextUpdateAt: string;
  leadStory: ContentItem;
  headlineItems: ContentItem[];
  secondaryItems: ContentItem[];
  quickStories: string[];
  items: ContentItem[];
  unavailableSources: string[];
  freshnessWindowMinutes: number;
  freshItemsCount: number;
  staleFallbackCount: number;
};

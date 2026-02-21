/* eslint-disable @next/next/no-img-element */
import { getSnapshot } from "@/lib/content/snapshot";
import type { ContentItem } from "@/lib/content/types";
import Link from "next/link";

const categories = [
  { label: "ראשי", topic: "all" },
  { label: "חדשות", topic: "news" },
  { label: "כלכלה", topic: "market" },
  { label: "ספורט", topic: "sports" },
  { label: "RTL Design", topic: "rtl" }
] as const;

const linkOnlySources = [
  { name: "Facebook - Fox News", url: "https://www.facebook.com/FoxNews/" },
  { name: "Facebook - Real Madrid", url: "https://www.facebook.com/RealMadrid/" },
  { name: "Facebook - New York Knicks", url: "https://www.facebook.com/NYKnicks/" }
] as const;

function categoryLabel(item: ContentItem): string {
  switch (item.category) {
    case "news":
      return "חדשות";
    case "sports":
      return "ספורט";
    case "market":
      return "שוק";
    case "rtl":
      return "RTL";
    case "ai":
      return "AI";
    default:
      return "עדכון";
  }
}

type PageProps = {
  searchParams?: Promise<{ topic?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const snapshot = await getSnapshot();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawTopic = resolvedSearchParams?.topic;
  const topic = rawTopic && ["news", "sports", "market", "rtl", "all"].includes(rawTopic) ? rawTopic : "all";
  const filterByTopic = (item: ContentItem): boolean => {
    if (topic === "all") {
      return true;
    }
    return item.category === topic;
  };

  const visibleHeadlines = snapshot.headlineItems.filter(filterByTopic);
  const visibleSecondaries = snapshot.secondaryItems.filter(filterByTopic);
  const visibleExtras = snapshot.items
    .filter(
      (item) =>
        filterByTopic(item) &&
        !visibleHeadlines.some((headline) => headline.id === item.id) &&
        !visibleSecondaries.some((secondary) => secondary.id === item.id)
    )
    .slice(0, 10);

  return (
    <main className="page-shell">
      <div className="ynet-like-topbar" aria-label="Top strip">
        <span>ראשי</span>
        <span>חדשות</span>
        <span>כלכלה</span>
        <span>ספורט</span>
        <span>RTL</span>
      </div>
      <header className="news-header">
        <div className="news-header-top">
          <h1>FocusNet</h1>
          <span>דף בית אישי - חדשות, ספורט ומניות בעדיפות גבוהה</span>
        </div>
        <nav className="news-nav" aria-label="Main categories">
          {categories.map((category) => (
            <Link
              key={category.topic}
              href={category.topic === "all" ? "/" : `/?topic=${category.topic}`}
              className={`topic-link ${topic === category.topic ? "topic-link-active" : ""}`}
            >
              {category.label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="breaking-strip" aria-label="Breaking summary">
        <strong>מבזק:</strong>
        <span>
          עודכן לאחרונה: {new Date(snapshot.updatedAt).toLocaleString("he-IL")} | העדכון הבא:{" "}
          {new Date(snapshot.nextUpdateAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} |
          {` ${snapshot.freshItemsCount}/${snapshot.items.length} מהשעה האחרונה`} |
          {` ${snapshot.staleFallbackCount} גיבוי ישן יותר במידת הצורך`} | רענון ידני נעול עד החלון הבא.
        </span>
      </section>

      <section className="hero">
        <div className="lead-layout">
          <article className="lead-story">
            {snapshot.leadStory.imageUrl ? (
              <img src={snapshot.leadStory.imageUrl} alt={snapshot.leadStory.title} />
            ) : (
              <div className="article-image article-image-fallback">אין תמונת מקור זמינה</div>
            )}
            <div className="lead-story-body">
              <h2>{snapshot.leadStory.title}</h2>
              <p>{snapshot.leadStory.summary}</p>
              <small>ערוץ: {snapshot.leadStory.source}</small>
              {snapshot.leadStory.isHeadline ? <small>תיוג: ראשית באתר</small> : null}
              <a href={snapshot.leadStory.url} target="_blank" rel="noreferrer">
                לכתבה המלאה במקור
              </a>
            </div>
          </article>
          <aside className="quick-panel">
            <h3>כותרות משניות מהאתרים</h3>
            <ul>
              {visibleSecondaries.slice(0, 4).map((item) => (
                <li key={`${item.source}-${item.title}`}>{item.title}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="top-articles" aria-label="Main headlines from source sites">
        {visibleHeadlines.map((item) => (
          <article className="article-card" key={item.title}>
            {item.imageUrl ? (
              <img className="article-image" src={item.imageUrl} alt={item.title} loading="lazy" />
            ) : (
              <div className="article-image article-image-fallback">אין תמונת מקור זמינה</div>
            )}
            <div className="article-body">
              <span className="article-category">{categoryLabel(item)}</span>
              {item.isHeadline ? <span className="headline-badge">ראשית באתר</span> : null}
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <small>ערוץ: {item.source}</small>
              <a href={item.url} target="_blank" rel="noreferrer">
                מעבר לכתבה
              </a>
            </div>
          </article>
        ))}
      </section>

      <section className="top-articles" aria-label="Secondary headlines from source sites">
        {visibleSecondaries.map((item) => (
          <article className="article-card" key={`${item.source}-${item.sourcePosition}-${item.title}`}>
            {item.imageUrl ? (
              <img className="article-image" src={item.imageUrl} alt={item.title} loading="lazy" />
            ) : (
              <div className="article-image article-image-fallback">אין תמונת מקור זמינה</div>
            )}
            <div className="article-body">
              <span className="article-category">{categoryLabel(item)}</span>
              <span className="headline-badge secondary-badge">משנית באתר</span>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <small>ערוץ: {item.source}</small>
              <a href={item.url} target="_blank" rel="noreferrer">
                מעבר לכתבה
              </a>
            </div>
          </article>
        ))}
      </section>

      <section className="top-articles" aria-label="Additional updates">
        {visibleExtras.map((item) => (
          <article className="article-card" key={`${item.id}-extra`}>
            {item.imageUrl ? (
              <img className="article-image" src={item.imageUrl} alt={item.title} loading="lazy" />
            ) : (
              <div className="article-image article-image-fallback">אין תמונת מקור זמינה</div>
            )}
            <div className="article-body">
              <span className="article-category">{categoryLabel(item)}</span>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <small>ערוץ: {item.source}</small>
              <a href={item.url} target="_blank" rel="noreferrer">
                מעבר לכתבה
              </a>
            </div>
          </article>
        ))}
      </section>

      {snapshot.unavailableSources.length > 0 ? (
        <section className="sources-note" aria-label="Unavailable sources">
          <strong>מקורות שלא חזרו בעדכון הנוכחי:</strong> {snapshot.unavailableSources.join(", ")}
        </section>
      ) : null}

      <section className="sources-note" aria-label="Link only sources">
        <strong>מקורות קישור בלבד (ללא RSS פתוח):</strong>{" "}
        {linkOnlySources.map((source, index) => (
          <span key={source.name}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.name}
            </a>
            {index < linkOnlySources.length - 1 ? " | " : ""}
          </span>
        ))}
      </section>
    </main>
  );
}

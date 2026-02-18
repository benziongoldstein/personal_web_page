/* eslint-disable @next/next/no-img-element */
import { getSnapshot } from "@/lib/content/snapshot";
import type { ContentItem } from "@/lib/content/types";

const categories = [
  "ראשי",
  "חדשות",
  "כלכלה",
  "ספורט",
  "RTL Design",
  "שוק ההון",
  "חם עכשיו"
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

function fallbackImage(index: number): string {
  return `https://picsum.photos/seed/focus-live-${index}/700/450`;
}

export default async function Home() {
  const snapshot = await getSnapshot();

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
            <button type="button" key={category}>
              {category}
            </button>
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
            <img src={snapshot.leadStory.imageUrl ?? fallbackImage(0)} alt={snapshot.leadStory.title} />
            <div className="lead-story-body">
              <h2>{snapshot.leadStory.title}</h2>
              <p>{snapshot.leadStory.summary}</p>
              <small>ערוץ: {snapshot.leadStory.source}</small>
              <a href={snapshot.leadStory.url} target="_blank" rel="noreferrer">
                לכתבה המלאה במקור
              </a>
            </div>
          </article>
          <aside className="quick-panel">
            <h3>כותרות קצרות</h3>
            <ul>
              {snapshot.quickStories.map((story) => (
                <li key={story}>{story}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="top-articles" aria-label="News cards">
        {snapshot.items.map((item, index) => (
          <article className="article-card" key={item.title}>
            <img className="article-image" src={item.imageUrl ?? fallbackImage(index + 1)} alt={item.title} loading="lazy" />
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

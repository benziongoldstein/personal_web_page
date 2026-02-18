/* eslint-disable @next/next/no-img-element */
type ArticleCardProps = {
  title: string;
  summary: string;
  source: string;
  imageUrl?: string;
  category: string;
};

export function ArticleCard({
  title,
  summary,
  source,
  imageUrl,
  category
}: ArticleCardProps) {
  return (
    <article className="article-card" aria-label={title}>
      {imageUrl ? (
        <img className="article-image" src={imageUrl} alt={title} loading="lazy" />
      ) : (
        <div className="article-image article-image-fallback">אין תמונה זמינה</div>
      )}
      <div className="article-body">
        <span className="article-category">{category}</span>
        <h3>{title}</h3>
        <p>{summary}</p>
        <small>מקור: {source}</small>
      </div>
    </article>
  );
}

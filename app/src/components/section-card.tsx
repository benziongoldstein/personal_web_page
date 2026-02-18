type SectionCardProps = {
  title: string;
  description: string;
  chips: string[];
};

export function SectionCard({ title, description, chips }: SectionCardProps) {
  return (
    <section className="section-card" aria-label={title}>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="chip-row">
        {chips.map((chip) => (
          <span className="chip" key={chip}>
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}

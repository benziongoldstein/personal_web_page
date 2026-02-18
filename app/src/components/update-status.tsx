const UPDATE_WINDOWS = ["07:00", "13:00", "18:00"];

function getNextUpdate(now: Date): Date {
  const candidateDates = UPDATE_WINDOWS.map((windowTime) => {
    const [hours, minutes] = windowTime.split(":").map(Number);
    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    if (date <= now) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  });

  return candidateDates.sort((a, b) => a.getTime() - b.getTime())[0];
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 1000 / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")} שעות`;
}

export function UpdateStatus() {
  const now = new Date();
  const nextUpdate = getNextUpdate(now);
  const lockUntil = formatDuration(nextUpdate.getTime() - now.getTime());

  return (
    <div className="status-grid" aria-label="Update status">
      <div className="status-card">
        <strong>עדכון אחרון</strong>
        <span>דמו של שלב 1 - טרם חוברו מקורות חיים</span>
      </div>
      <div className="status-card">
        <strong>העדכון הבא</strong>
        <span>{nextUpdate.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="status-card">
        <strong>מצב רענון</strong>
        <span>נעול עד לחלון הבא ({lockUntil})</span>
      </div>
    </div>
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector("[data-updates]");
  if (!container) return;
  const safeLink = (value) => {
    try {
      const url = new URL(value, location.origin);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  };
  fetch("/api/announcements?history=1", { credentials: "same-origin" })
    .then((response) => response.ok ? response.json() : { announcements: [] })
    .then(({ announcements = [] }) => {
      if (!announcements.length) {
        const empty = document.createElement("p");
        empty.className = "updates-empty";
        empty.textContent = "There are no public updates yet. Check back when the next release is ready.";
        container.replaceChildren(empty);
        return;
      }
      const fragment = document.createDocumentFragment();
      announcements.forEach((item) => {
        const article = document.createElement("article");
        article.className = "update-card";
        const eyebrow = document.createElement("p");
        eyebrow.className = "section-kicker";
        eyebrow.textContent = item.kind === "sponsored" ? "Sponsored" : (item.eyebrow || "Project update");
        const heading = document.createElement("h2");
        heading.textContent = item.title;
        const time = document.createElement("time");
        time.dateTime = item.starts_at;
        time.textContent = new Date(item.starts_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        const body = document.createElement("p");
        body.textContent = item.body;
        article.append(eyebrow, heading, time, body);
        if (item.quote_text) {
          const quote = document.createElement("blockquote");
          quote.textContent = `“${item.quote_text}”`;
          const source = document.createElement("p");
          source.className = "announcement-source";
          source.textContent = [item.quote_attribution, item.quote_source].filter(Boolean).join(" · ");
          article.append(quote, source);
        }
        const target = safeLink(item.cta_url);
        if (item.cta_label && target) {
          const link = document.createElement("a");
          link.className = "inline-link";
          link.href = target;
          link.textContent = `${item.cta_label} ↗`;
          article.append(link);
        }
        fragment.append(article);
      });
      container.replaceChildren(fragment);
    })
    .catch(() => {
      const message = document.createElement("p");
      message.className = "updates-empty";
      message.textContent = "Updates are temporarily unavailable.";
      container.replaceChildren(message);
    });
});


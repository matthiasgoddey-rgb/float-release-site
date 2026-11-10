document.addEventListener("DOMContentLoaded", () => {
  const statusNote = document.querySelector("[data-admin-status]");
  const metricsBody = document.querySelector("[data-metrics-rows]");
  const reviewsHost = document.querySelector("[data-admin-reviews]");
  const announcementsHost = document.querySelector("[data-admin-announcements]");
  const form = document.querySelector("[data-announcement-form]");
  const formStatus = document.querySelector("[data-announcement-status]");
  const fromInput = document.querySelector("[data-from]");
  const toInput = document.querySelector("[data-to]");

  const today = new Date();
  const dayText = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  toInput.value = dayText(today);
  const firstDay = new Date(today);
  firstDay.setDate(today.getDate() - 29);
  fromInput.value = dayText(firstDay);

  const api = async (path, options = {}) => {
    const response = await fetch(`/api/admin/${path}`, {
      credentials: "same-origin",
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
    let body = {};
    try { body = await response.json(); } catch {}
    if (!response.ok) throw new Error(body.error || (response.status === 401 ? "Sign in through Cloudflare Access, then reload this page." : "Request could not be completed."));
    return body;
  };

  const text = (tag, value, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value == null ? "" : String(value);
    return node;
  };
  const message = (target, value) => { if (target) target.textContent = value; };
  const button = (label, action, dangerous = false) => {
    const node = document.createElement("button");
    node.type = "button";
    node.textContent = label;
    if (dangerous) node.className = "danger";
    node.addEventListener("click", action);
    return node;
  };

  async function loadMetrics() {
    const loading = document.createElement("tr");
    const loadingCell = document.createElement("td");
    loadingCell.colSpan = 5;
    loadingCell.textContent = "Loading…";
    loading.append(loadingCell);
    metricsBody.replaceChildren(loading);
    try {
      const result = await api(`metrics?from=${encodeURIComponent(fromInput.value)}&to=${encodeURIComponent(toInput.value)}`);
      if (!result.metrics.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = "No activity totals for this range.";
        row.append(cell);
        metricsBody.replaceChildren(row);
        return;
      }
      const fragment = document.createDocumentFragment();
      result.metrics.forEach((item) => {
        const row = document.createElement("tr");
        [item.day, item.event, item.item || item.page || "—", item.count, item.seconds || 0].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = String(value);
          row.append(cell);
        });
        fragment.append(row);
      });
      metricsBody.replaceChildren(fragment);
    } catch (error) { message(statusNote, error.message); }
  }

  async function loadReviews() {
    const state = document.querySelector("[data-review-status]").value;
    try {
      const { reviews = [] } = await api(`reviews?status=${encodeURIComponent(state)}`);
      if (!reviews.length) {
        reviewsHost.replaceChildren(text("p", "No reviews in this queue."));
        return;
      }
      const fragment = document.createDocumentFragment();
      reviews.forEach((review) => {
        const card = document.createElement("article");
        card.className = "admin-card";
        const top = document.createElement("div");
        top.className = "admin-card-top";
        top.append(text("h3", `${review.rating} / 5 · ${review.display_name || "Floater Typist user"}`));
        top.append(text("small", new Date(review.submitted_at).toLocaleString()));
        card.append(top, text("p", review.review_text), text("small", `Status: ${review.status}`));
        const actions = document.createElement("div");
        actions.className = "admin-card-actions";
        const moderate = async (action) => {
          if (action === "delete" && !window.confirm("Permanently delete this review?")) return;
          try {
            await api("reviews", { method: "POST", body: JSON.stringify({ id: review.id, action }) });
            await loadReviews();
          } catch (error) { message(statusNote, error.message); }
        };
        if (review.status !== "approved") actions.append(button("Approve and publish", () => moderate("approve")));
        if (review.status !== "hidden") actions.append(button("Hide", () => moderate("hide")));
        actions.append(button("Delete", () => moderate("delete"), true));
        card.append(actions);
        fragment.append(card);
      });
      reviewsHost.replaceChildren(fragment);
    } catch (error) { message(statusNote, error.message); }
  }

  let announcementItems = [];
  async function loadAnnouncements() {
    try {
      const { announcements = [] } = await api("announcements");
      announcementItems = announcements;
      if (!announcements.length) {
        announcementsHost.replaceChildren(text("p", "No announcements yet. Draft one below."));
        return;
      }
      const fragment = document.createDocumentFragment();
      announcements.forEach((item) => {
        const card = document.createElement("article");
        card.className = "admin-card";
        card.append(text("h3", item.title), text("p", `${item.kind} · ${item.status} · ${item.placement}`), text("small", `${new Date(item.starts_at).toLocaleString()}${item.ends_at ? ` – ${new Date(item.ends_at).toLocaleString()}` : " · no end date"}`));
        const actions = document.createElement("div");
        actions.className = "admin-card-actions";
        actions.append(button("Edit", () => fillForm(item)));
        if (item.status !== "archived") actions.append(button("Archive", async () => {
          fillForm(item);
          form.elements.status.value = "archived";
          await saveForm();
        }));
        card.append(actions);
        fragment.append(card);
      });
      announcementsHost.replaceChildren(fragment);
    } catch (error) { message(statusNote, error.message); }
  }

  function fillForm(item) {
    const values = {
      id: item.id, kind: item.kind, status: item.status, placement: item.placement,
      priority: item.priority, eyebrow: item.eyebrow, title: item.title, body: item.body,
      quoteText: item.quote_text, quoteAttribution: item.quote_attribution,
      quoteSource: item.quote_source, quotePermission: item.quote_permission,
      ctaLabel: item.cta_label, ctaUrl: item.cta_url,
      startsAt: item.starts_at ? new Date(item.starts_at).toISOString().slice(0, 16) : "",
      endsAt: item.ends_at ? new Date(item.ends_at).toISOString().slice(0, 16) : "",
    };
    Object.entries(values).forEach(([name, value]) => { form.elements[name].value = value == null ? "" : String(value); });
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveForm(event) {
    if (event) event.preventDefault();
    const data = new FormData(form);
    const value = Object.fromEntries(data.entries());
    value.priority = Number(value.priority || 0);
    ["startsAt", "endsAt"].forEach((name) => { if (value[name]) value[name] = new Date(value[name]).toISOString(); else value[name] = ""; });
    try {
      const result = await api("announcements", { method: "POST", body: JSON.stringify(value) });
      message(formStatus, "Saved. A live announcement will appear according to its dates and placement.");
      form.elements.id.value = result.id;
      await loadAnnouncements();
    } catch (error) { message(formStatus, error.message); }
  }

  document.querySelector("[data-load-metrics]").addEventListener("click", loadMetrics);
  document.querySelector("[data-review-status]").addEventListener("change", loadReviews);
  document.querySelector("[data-new-announcement]").addEventListener("click", () => {
    form.reset();
    form.elements.id.value = "";
    form.elements.startsAt.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    message(formStatus, "");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  form.addEventListener("submit", saveForm);
  form.addEventListener("reset", () => { window.setTimeout(() => { form.elements.id.value = ""; }, 0); });

  api("session").then((result) => {
    if (result.isAdmin === true) localStorage.setItem("floaterTypistAdminAccess", "1");
  }).catch(() => {});

  Promise.all([loadMetrics(), loadReviews(), loadAnnouncements()]).then(() => {
    if (statusNote.textContent.includes("Connecting")) message(statusNote, "Connected. This dashboard only shows aggregate website totals and opted-in reviews.");
  });
});


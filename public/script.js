document.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#site-navigation");
  if (menuToggle && navigation) {
    const menuLabel = menuToggle.querySelector(".sr-only");
    const closeMenu = () => {
      menuToggle.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
      if (menuLabel) menuLabel.textContent = "Open navigation";
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      navigation.classList.toggle("is-open", !isOpen);
      if (menuLabel) menuLabel.textContent = isOpen ? "Open navigation" : "Close navigation";
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const count = document.querySelector("[data-preview-count]");
  const previewText = document.querySelector(".app-editor");
  if (count && previewText) {
    const value = previewText.textContent.trim();
    const words = value.match(/\S+/g) || [];
    count.textContent = `${value.length} characters, ${words.length} words`;
  }

  const stepButtons = Array.from(document.querySelectorAll("[data-demo-step]"));
  const visual = document.querySelector(".workflow-visual");
  const taskOutput = document.querySelector("[data-task-output]");
  const status = document.querySelector("[data-workflow-status]");
  const taskText = "Book a dentist appointment for next Tuesday.";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let typingTimer = 0;

  const setStep = (step) => {
    window.clearInterval(typingTimer);
    if (visual) visual.dataset.flowStage = String(step);
    stepButtons.forEach((button, index) => {
      const active = index === step;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (!taskOutput || !status) return;

    if (step < 2) {
      taskOutput.textContent = step === 0 ? "Your task will appear here" : "Ready for your text";
      status.textContent = step === 0
        ? "Destination selected: To Do — My Day. Next, prepare your text."
        : "Text is ready, the pace is set, and a countdown gives you time to click in.";
      return;
    }

    status.textContent = "Typing is in progress. Click away or press Stop to cancel.";
    if (reducedMotion) {
      taskOutput.textContent = taskText;
      status.textContent = "Done.";
      return;
    }

    taskOutput.textContent = "";
    let index = 0;
    typingTimer = window.setInterval(() => {
      index += 1;
      taskOutput.textContent = taskText.slice(0, index);
      if (index >= taskText.length) {
        window.clearInterval(typingTimer);
        status.textContent = "Done.";
      }
    }, 34);
  };

  stepButtons.forEach((button) => {
    button.addEventListener("click", () => setStep(Number(button.dataset.demoStep)));
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.startsWith("/announcements") ? "announcements" : "home";
  const sendEvent = (event, item = "", seconds = 0, beacon = false) => {
    const body = JSON.stringify({ event, page, item, seconds });
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
    fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body, keepalive: beacon, credentials: "same-origin",
    }).catch(() => {});
  };

  sendEvent("page_view");
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-track]");
    if (link) sendEvent("cta_click", link.dataset.track);
  });

  let visibleSince = document.visibilityState === "visible" ? Date.now() : 0;
  let visibleSeconds = 0;
  const accountVisibleTime = (beacon = false) => {
    if (visibleSince) visibleSeconds += Math.floor((Date.now() - visibleSince) / 1000);
    visibleSince = document.visibilityState === "visible" ? Date.now() : 0;
    if (visibleSeconds >= 5) {
      sendEvent("engaged_time", "", Math.min(600, visibleSeconds), beacon);
      visibleSeconds = 0;
    }
  };
  document.addEventListener("visibilitychange", () => accountVisibleTime(true));
  window.addEventListener("pagehide", () => accountVisibleTime(true));

  const escapeUrl = (value) => {
    try {
      const url = new URL(value, location.origin);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  };
  const announcementBanner = document.querySelector("[data-announcement-banner]");
  fetch("/api/announcements", { credentials: "same-origin" })
    .then((response) => response.ok ? response.json() : { announcements: [] })
    .then(({ announcements = [] }) => {
      if (!announcementBanner || !announcements.length) return;
      const item = announcements[0];
      const content = document.createElement("div");
      content.className = "announcement-copy";
      const label = document.createElement("p");
      label.className = "section-kicker";
      label.textContent = item.kind === "sponsored" ? "Sponsored" : (item.eyebrow || "Project update");
      const title = document.createElement("h2");
      title.textContent = item.title;
      const body = document.createElement("p");
      body.textContent = item.body;
      content.append(label, title, body);
      if (item.quote_text) {
        const quote = document.createElement("blockquote");
        quote.textContent = `“${item.quote_text}”`;
        const source = document.createElement("p");
        source.className = "announcement-source";
        source.textContent = [item.quote_attribution, item.quote_source].filter(Boolean).join(" · ");
        content.append(quote, source);
      }
      announcementBanner.replaceChildren(content);
      const target = escapeUrl(item.cta_url);
      if (item.cta_label && target) {
        const link = document.createElement("a");
        link.className = "button button-primary";
        link.href = target;
        link.dataset.track = "announcement-cta";
        link.textContent = item.cta_label;
        announcementBanner.append(link);
      }
      announcementBanner.hidden = false;
    }).catch(() => {});

  const reviewList = document.querySelector("[data-review-list]");
  const reviewForm = document.querySelector("[data-review-form]");
  const deleteForm = document.querySelector("[data-review-delete-form]");
  const setStatus = (node, message) => { if (node) node.textContent = message; };
  const renderReviews = (items) => {
    if (!reviewList) return;
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "review-empty";
      empty.textContent = "No public reviews yet. You can be the first to leave one.";
      reviewList.replaceChildren(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "review-card";
      const stars = document.createElement("p");
      stars.className = "review-stars";
      stars.setAttribute("aria-label", `${item.rating} out of 5 stars`);
      stars.textContent = `${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}`;
      const quote = document.createElement("blockquote");
      quote.textContent = item.review_text;
      const byline = document.createElement("p");
      byline.className = "review-byline";
      byline.textContent = `${item.display_name || "Floater Typist user"} · ${new Date(item.submitted_at).toLocaleDateString()}`;
      card.append(stars, quote, byline);
      fragment.append(card);
    });
    reviewList.replaceChildren(fragment);
  };

  const loadReviews = () => fetch("/api/reviews", { credentials: "same-origin" })
    .then((response) => response.ok ? response.json() : { reviews: [] })
    .then(({ reviews = [] }) => renderReviews(reviews))
    .catch(() => {});
  loadReviews();

  if (reviewForm) {
    fetch("/api/config", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : {})
      .then((config) => {
        if (!config.reviewsEnabled || !config.turnstileSiteKey) return;
        reviewForm.hidden = false;
        deleteForm.hidden = false;
        const renderWidget = () => {
          if (!window.turnstile) return;
          window.turnstile.render("[data-turnstile-widget]", {
            sitekey: config.turnstileSiteKey,
            action: "review",
            callback: (token) => { reviewForm.dataset.turnstileToken = token; },
            "expired-callback": () => { delete reviewForm.dataset.turnstileToken; },
            "error-callback": () => { delete reviewForm.dataset.turnstileToken; },
          });
        };
        if (window.turnstile) renderWidget();
        else {
          window.turnstileOnload = renderWidget;
          const script = document.createElement("script");
          script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=turnstileOnload&render=explicit";
          script.async = true;
          script.defer = true;
          document.head.append(script);
        }
      }).catch(() => {});

    reviewForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(reviewForm);
      const button = reviewForm.querySelector("button[type=submit]");
      button.disabled = true;
      setStatus(reviewForm.querySelector("[data-review-status]"), "Sending your review securely…");
      try {
        const response = await fetch("/api/reviews", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: data.get("rating"), displayName: data.get("displayName"), reviewText: data.get("reviewText"), publishConsent: data.get("publishConsent") === "on", company: data.get("company"), turnstileToken: reviewForm.dataset.turnstileToken || "" }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Review could not be sent.");
        reviewForm.reset();
        const receiptMessage = result.receipt
          ? `${result.message} Removal ID: ${result.receipt.id}. One-time code: ${result.receipt.token}`
          : result.message;
        setStatus(reviewForm.querySelector("[data-review-status]"), receiptMessage);
        delete reviewForm.dataset.turnstileToken;
        if (window.turnstile) window.turnstile.reset();
        sendEvent("cta_click", "review-submit");
        await loadReviews();
      } catch (error) {
        setStatus(reviewForm.querySelector("[data-review-status]"), error.message);
        if (window.turnstile) window.turnstile.reset();
      } finally { button.disabled = false; }
    });
  }

  if (deleteForm) deleteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(deleteForm);
    try {
      const response = await fetch(`/api/reviews?id=${encodeURIComponent(data.get("id"))}`, {
        method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.get("token") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Review could not be removed.");
      deleteForm.reset();
      setStatus(deleteForm.querySelector("[data-delete-status]"), result.message);
      await loadReviews();
    } catch (error) { setStatus(deleteForm.querySelector("[data-delete-status]"), error.message); }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const adminLink = document.querySelector("[data-admin-only-link]");
  if (!adminLink) return;
  try {
    if (localStorage.getItem("floaterTypistAdminAccess") !== "1") return;
  } catch { return; }
  fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } })
    .then((response) => response.ok ? response.json() : null)
    .then((result) => {
      if (result && result.isAdmin === true) adminLink.hidden = false;
      else localStorage.removeItem("floaterTypistAdminAccess");
    })
    .catch(() => { try { localStorage.removeItem("floaterTypistAdminAccess"); } catch {} });
});

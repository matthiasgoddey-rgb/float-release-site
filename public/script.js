document.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#site-navigation");
  if (menuToggle && navigation) {
    const closeMenu = () => {
      menuToggle.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const demoText = document.querySelector("[data-demo-text]");
  const demoCount = document.querySelector("[data-demo-count]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!demoText || !demoCount || prefersReducedMotion) {
    if (demoText && demoCount) demoCount.textContent = demoText.textContent.length + " characters";
    return;
  }

  const demoLines = [
    "Thanks for the quick update. I’ll take a look this afternoon and get back to you.",
    "The notes are ready. I’ll send them over after the meeting.",
    "That works for me. Let’s check in again next week."
  ];
  let lineIndex = 0;
  let characterIndex = demoLines[0].length;

  const typeNextLine = () => {
    const next = demoLines[lineIndex];
    if (characterIndex < next.length) {
      characterIndex += 1;
      demoText.textContent = next.slice(0, characterIndex);
      demoCount.textContent = characterIndex + " characters";
      window.setTimeout(typeNextLine, 28);
      return;
    }

    window.setTimeout(() => {
      lineIndex = (lineIndex + 1) % demoLines.length;
      characterIndex = 0;
      demoText.textContent = "";
      demoCount.textContent = "0 characters";
      window.setTimeout(typeNextLine, 420);
    }, 2400);
  };

  window.setTimeout(() => {
    lineIndex = 1;
    characterIndex = 0;
    demoText.textContent = "";
    demoCount.textContent = "0 characters";
    typeNextLine();
  }, 3200);
});

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

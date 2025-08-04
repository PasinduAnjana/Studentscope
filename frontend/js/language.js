// language.js
function updateLanguage(lang) {
  fetch(`lang/${lang}.json`)
    .then((res) => res.json())
    .then((translations) => {
      window.currentTranslations = translations;
      applyTranslations();

      // Reload sidebar with updated language
      const role =
        new URLSearchParams(window.location.search).get("role") || "teacher";
      loadSidebar(role);
    });
}

function getNestedTranslation(obj, path) {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

function applyTranslations() {
  const translations = window.currentTranslations;
  if (!translations) return;

  document.querySelectorAll("[data]").forEach((el) => {
    const key = el.getAttribute("data");
    const value = getNestedValue(translations, key);

    if (!value) return;

    // For <input type="button" or submit>
    if (
      el.tagName === "INPUT" &&
      ["button", "submit", "reset"].includes(el.type)
    ) {
      el.value = value;
    } else {
      el.textContent = value;
    }
  });
}

// Helper to support nested keys like "buttons.save"
function getNestedValue(obj, key) {
  return key.split(".").reduce((o, k) => (o || {})[k], obj);
}

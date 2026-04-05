/**
 * i18n.js — Traduction dynamique côté client
 * Chemin de l'endpoint injecté par PHP via window.I18N_ENDPOINT
 */
(function () {
  "use strict";

  /* ── Config ──────────────────────────────────────────────── */
  // L'endpoint est injecté par navbar.php : window.I18N_ENDPOINT
  // Fallback : même dossier que la page courante
  const ENDPOINT = window.I18N_ENDPOINT || "translate.php";
  // ── Traductions manuelles — priorité absolue sur MyMemory ──
  const MANUAL_OVERRIDES = {
    fr: {
      START: "Commencer",
      "TURN YOUR IMAGES": "Transformer vos images",
      "into brick paintings": "en mosaïque de briques",
      "DOWNLOAD APP": "Télécharger l'application",
      "HOW IT WORKS": "Comment ça marche",
      "Sign in": "Se connecter",
      "Sign Up": "S'inscrire",
      "Log In": "Se connecter",
      "Log Out": "Se déconnecter",
      "My Orders": "Mes commandes",
      "Add to basket": "Ajouter au panier",
      studs: "tenons",
      nearest: "voisins plus proches",
      "Choose a Tint": "Choisissez un filtre",
      "Choose Your Tiling": "Choisissez votre pavage",
      Back: "Retour",
      Regenerate: "Régénérer",
      "Best Quality": "Meilleure qualité",
      Recommended: "Recommandé",
      "Best Price": "Meilleur prix",
      Classic: "Classique",
      Premium: "Premium",
      "1 minute": "1 minute",
      "My cart": "Mon panier",
      "Summary": "Recap",
      "Order": "Commande",
      "Items": "Articles",
      "Shipping (10%)": "Livraison (10%)"
    },
  };
  const SOURCE_LANG = "en";
  const LS_KEY = "bricksy_lang";
  const CACHE_KEY = "bricksy_tr_cache";

  const FLAGS = {
    en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14" width="20" height="14" style="border-radius:2px;display:inline-block;vertical-align:middle;">
        <rect width="20" height="14" fill="#012169"/>
        <path d="M0,0 L20,14 M20,0 L0,14" stroke="#fff" stroke-width="3"/>
        <path d="M0,0 L20,14 M20,0 L0,14" stroke="#C8102E" stroke-width="1.5"/>
        <path d="M10,0 V14 M0,7 H20" stroke="#fff" stroke-width="4"/>
        <path d="M10,0 V14 M0,7 H20" stroke="#C8102E" stroke-width="2.5"/>
    </svg>`,
    fr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14" width="20" height="14" style="border-radius:2px;display:inline-block;vertical-align:middle;">
        <rect width="7" height="14" fill="#002395"/>
        <rect x="7" width="6" height="14" fill="#fff"/>
        <rect x="13" width="7" height="14" fill="#ED2939"/>
    </svg>`,
  };

  const LANGS = [
    { code: "en", label: "EN", flag: FLAGS.en },
    { code: "fr", label: "FR", flag: FLAGS.fr },
  ];

  /* ── Tags ignorés ───────────────────────────────────────── */
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "SVG",
    "PATH",
    "CODE",
    "PRE",
    "KBD",
    "VAR",
    "INPUT",
    "TEXTAREA",
    "SELECT",
    "OPTION",
  ]);

  /* ── Cache localStorage ─────────────────────────────────── */
  function loadCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function saveCache(c) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch {}
  }

  /* ── Récolte les noeuds texte visibles ──────────────────── */
  function collectTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.nodeValue.trim();
        const parent = node.parentElement;
        if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest("[data-i18n-skip]")) return NodeFilter.FILTER_REJECT;
        if (/^[\d\s€$£.,+\-%()/:]+$/.test(text))
          return NodeFilter.FILTER_REJECT;
        if (text.length > 400) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  /* ── Applique une traduction à un noeud texte ───────────── */
  function applyNode(node, translated) {
    const raw = node.nodeValue;
    const leading = raw.match(/^\s*/)[0];
    const trailing = raw.match(/\s*$/)[0];
    node.nodeValue = leading + translated + trailing;
  }

  /* ── Applique aux placeholders et attributs title/alt ───── */
  function applyAttributes(tr) {
    document.querySelectorAll("[placeholder]").forEach((el) => {
      const v = el.getAttribute("placeholder").trim();
      if (tr[v]) el.setAttribute("placeholder", tr[v]);
    });
    ["title", "alt"].forEach((attr) => {
      document.querySelectorAll(`[${attr}]`).forEach((el) => {
        const v = (el.getAttribute(attr) || "").trim();
        if (v && tr[v]) el.setAttribute(attr, tr[v]);
      });
    });
  }

  /* ── Traduction principale ───────────────────────────────── */
  async function translatePage(targetLang) {
    if (targetLang === SOURCE_LANG) {
      location.reload();
      return;
    }

    document.body.classList.add("translating");

    const nodes = collectTextNodes(document.body);
    const cache = loadCache();
    const ns = targetLang + ":";

    // Map : texte brut → liste de noeuds DOM
    const textMap = new Map();
    nodes.forEach((node) => {
      const t = node.nodeValue.trim();
      if (!textMap.has(t)) textMap.set(t, []);
      textMap.get(t).push(node);
    });

    // Textes des attributs
    const extraTexts = [];
    document.querySelectorAll("[placeholder],[title],[alt]").forEach((el) => {
      ["placeholder", "title", "alt"].forEach((attr) => {
        const v = (el.getAttribute(attr) || "").trim();
        if (v && v.length >= 2 && v.length <= 400) extraTexts.push(v);
      });
    });

    const allTexts = [...new Set([...textMap.keys(), ...extraTexts])].filter(
      (t) => t.length >= 2 && t.length <= 400,
    );

    // Sépare cache local / à fetcher
    const translations = {};
    const toFetch = [];

    allTexts.forEach((t) => {
      const k = ns + t;
      if (cache[k] !== undefined) {
        translations[t] = cache[k];
      } else {
        toFetch.push(t);
      }
    });

    // Appels API en batches de 15
    if (toFetch.length > 0) {
      const BATCH = 15;
      for (let i = 0; i < toFetch.length; i += BATCH) {
        const batch = toFetch.slice(i, i + BATCH);
        try {
          const res = await fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              texts: batch,
              target: targetLang,
              source: SOURCE_LANG,
            }),
          });
          if (!res.ok) {
            console.error(
              "[i18n] translate.php HTTP",
              res.status,
              await res.text(),
            );
            continue;
          }
          const data = await res.json();
          Object.entries(data.translations || {}).forEach(([src, tr]) => {
            translations[src] = tr;
            cache[ns + src] = tr;
          });
        } catch (e) {
          console.warn("[i18n] batch error:", e);
        }
      }
      saveCache(cache);
    }

    if (MANUAL_OVERRIDES[targetLang]) {
      Object.entries(MANUAL_OVERRIDES[targetLang]).forEach(([src, tr]) => {
        translations[src] = tr;
      });
    }

    // Applique aux noeuds texte
    textMap.forEach((nodeList, original) => {
      const tr = translations[original];
      if (tr && tr !== original) nodeList.forEach((n) => applyNode(n, tr));
    });

    applyAttributes(translations);
    document.body.classList.remove("translating");
  }

  /* ── Construit le sélecteur de langue ───────────────────── */
  function buildSwitcher() {
    const current = localStorage.getItem(LS_KEY) || SOURCE_LANG;
    const cur = LANGS.find((l) => l.code === current) || LANGS[0];

    const wrap = document.createElement("div");
    wrap.className = "lang-switcher";
    wrap.setAttribute("data-i18n-skip", "");

    const chevron = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-btn";
    btn.innerHTML = `<span class="lang-flag">${cur.flag}</span> <span>${cur.label}</span>${chevron}`;

    const dropdown = document.createElement("div");
    dropdown.className = "lang-dropdown";

    LANGS.forEach((lang) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "lang-item" + (lang.code === current ? " active" : "");
      item.innerHTML = `<span class="lang-flag">${lang.flag}</span> <span>${lang.label}</span>`;

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        localStorage.setItem(LS_KEY, lang.code);
        dropdown
          .querySelectorAll(".lang-item")
          .forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        btn.innerHTML = `<span class="lang-flag">${lang.flag}</span> <span>${lang.label}</span>${chevron}`;
        dropdown.classList.remove("open");
        translatePage(lang.code);
      });
      dropdown.appendChild(item);
    });

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", () => dropdown.classList.remove("open"));

    wrap.appendChild(btn);
    wrap.appendChild(dropdown);
    return wrap;
  }

  /* ── Injecte le switcher dans #lang-switcher-slot ───────── */
  function injectSwitcher() {
    const slot = document.getElementById("lang-switcher-slot");
    if (slot) {
      slot.appendChild(buildSwitcher());
    } else {
      // Fallback flottant si le slot est absent
      const fixed = buildSwitcher();
      fixed.style.cssText =
        "position:fixed;bottom:20px;right:20px;z-index:9999;";
      document.body.appendChild(fixed);
      console.warn(
        "[i18n] #lang-switcher-slot introuvable — sélecteur en position fixe.",
      );
    }
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    injectSwitcher();
    const saved = localStorage.getItem(LS_KEY) || SOURCE_LANG;
    if (saved && saved !== SOURCE_LANG) {
      translatePage(saved);
    }
  }

  // Exécute dès que le DOM est prêt (pas besoin de defer)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ── API publique ────────────────────────────────────────── */
  window.I18N = {
    setLang: (lang) => {
      localStorage.setItem(LS_KEY, lang);
      translatePage(lang);
    },
    getLang: () => localStorage.getItem(LS_KEY) || SOURCE_LANG,
    translate: translatePage,
  };
})();



(function () {
  "use strict";

  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap";
  document.head.appendChild(fontLink);

  const css = `
  :root {
    --mbf-white:  #ffffff;
    --mbf-glass:  rgba(255,255,255,0.06);
    --mbf-border: rgba(255,255,255,0.12);
    --mbf-accent: #3ecfff;
    --mbf-accent2:#a78bfa;
    --mbf-easing: cubic-bezier(0.22, 1, 0.36, 1);
    --mbf-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  #mbf-overlay {
    position: fixed;
    inset: 0;
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0);
    transition: background 0.7s ease;
    font-family: 'DM Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  #mbf-overlay.mbf-visible {
    background: rgba(0,0,0,0.78);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  /* ── MODAL ── */
  #mbf-modal {
    position: relative;
    width: min(660px, 94vw);
    background: #080808;
    border-radius: 28px;
    border: 1px solid var(--mbf-border);
    overflow: hidden;
    opacity: 0;
    transform: scale(0.88) translateY(36px);
    transition: opacity 0.75s var(--mbf-easing), transform 0.75s var(--mbf-easing);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04),
      0 48px 140px rgba(0,0,0,0.85),
      0 0 90px rgba(62,207,255,0.07);
  }
  #mbf-modal.mbf-in {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  #mbf-modal::before {
    content: '';
    position: absolute;
    inset: -40%;
    background:
      radial-gradient(ellipse at 25% 0%,   rgba(62,207,255,0.14) 0%, transparent 58%),
      radial-gradient(ellipse at 80% 110%, rgba(167,139,250,0.11) 0%, transparent 58%);
    pointer-events: none;
    z-index: 0;
  }

  .mbf-scene {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 56px 52px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.55s ease;
    z-index: 1;
  }
  .mbf-scene.mbf-scene-active {
    opacity: 1;
    pointer-events: auto;
    position: relative;
    inset: auto;
  }

  .mbf-eyebrow {
    font-size: 10.5px;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--mbf-accent);
    font-weight: 500;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.55s var(--mbf-easing), transform 0.55s var(--mbf-easing);
    margin-bottom: 22px;
  }
  .mbf-eyebrow.mbf-shown { opacity: 1; transform: translateY(0); }

  .mbf-headline {
    font-size: clamp(38px, 6.5vw, 58px);
    font-weight: 300;
    color: var(--mbf-white);
    text-align: center;
    line-height: 1.07;
    letter-spacing: -0.035em;
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.65s var(--mbf-easing) 0.08s, transform 0.65s var(--mbf-easing) 0.08s;
    margin-bottom: 10px;
  }
  .mbf-headline strong {
    font-weight: 700;
    background: linear-gradient(130deg, #fff 0%, var(--mbf-accent) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .mbf-headline.mbf-shown { opacity: 1; transform: translateY(0); }

  .mbf-sub {
    font-size: 16.5px;
    font-weight: 300;
    color: rgba(255,255,255,0.52);
    text-align: center;
    line-height: 1.65;
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 0.6s var(--mbf-easing) 0.22s, transform 0.6s var(--mbf-easing) 0.22s;
    max-width: 430px;
    margin: 0 auto;
  }
  .mbf-sub.mbf-shown { opacity: 1; transform: translateY(0); }

  .mbf-merge-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 130px;
    width: 100%;
    margin-bottom: 28px;
    margin-top: 8px;
  }

  .mbf-orbit-dot {
    position: absolute;
    border-radius: 50%;
    opacity: 0;
  }

  .mbf-center-app {
    width: 76px;
    height: 76px;
    border-radius: 22px;
    background: linear-gradient(145deg, #0d1b2a 0%, #0f3460 100%);
    border: 1.5px solid var(--mbf-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 34px;
    box-shadow: 0 0 32px rgba(62,207,255,0.38), 0 0 70px rgba(62,207,255,0.14);
    transform: scale(0);
    transition: transform 0.65s var(--mbf-spring);
    position: relative;
    z-index: 2;
    flex-shrink: 0;
  }
  .mbf-center-app.mbf-pop { transform: scale(1); }

  @keyframes mbf-pulse {
    0%   { transform: scale(1);   opacity: 0.55; }
    100% { transform: scale(1.9); opacity: 0; }
  }
  .mbf-pulse-ring {
    position: absolute;
    width: 76px;
    height: 76px;
    border-radius: 22px;
    border: 1.5px solid var(--mbf-accent);
    opacity: 0;
    pointer-events: none;
  }
  .mbf-pulse-ring.mbf-pulsing {
    animation: mbf-pulse 2.2s ease-out infinite;
  }

  .mbf-features {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
    margin-top: 12px;
    margin-bottom: 36px;
  }
  .mbf-feature-row {
    display: flex;
    align-items: center;
    gap: 14px;
    opacity: 0;
    transform: translateX(-16px);
    transition: opacity 0.48s ease, transform 0.48s var(--mbf-easing);
  }
  .mbf-feature-row.mbf-shown { opacity: 1; transform: translateX(0); }

  .mbf-feature-dot {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--mbf-glass);
    border: 1px solid var(--mbf-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
  }
  .mbf-feature-text {
    font-size: 14px;
    font-weight: 300;
    color: rgba(255,255,255,0.72);
    line-height: 1.45;
  }
  .mbf-feature-text b { color: white; font-weight: 500; }

  /* ── CTA BUTTON ── */
  .mbf-cta-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 13px;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.5s ease, transform 0.5s var(--mbf-easing);
  }
  .mbf-cta-wrap.mbf-shown { opacity: 1; transform: translateY(0); }

  .mbf-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 40px;
    border-radius: 100px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    outline: none;
    transition: transform 0.22s var(--mbf-spring), box-shadow 0.22s ease, filter 0.22s ease;
    letter-spacing: 0.01em;
  }
  .mbf-btn:hover  { transform: scale(1.05); }
  .mbf-btn:active { transform: scale(0.97); }

  .mbf-btn-primary {
    background: linear-gradient(135deg, var(--mbf-accent) 0%, #60a5fa 100%);
    color: #000;
    font-weight: 600;
    box-shadow: 0 8px 32px rgba(62,207,255,0.28);
  }
  .mbf-btn-primary:hover {
    box-shadow: 0 14px 44px rgba(62,207,255,0.42);
    filter: brightness(1.06);
  }

  .mbf-btn-ghost {
    background: transparent;
    color: rgba(255,255,255,0.38);
    font-size: 13px;
    padding: 0;
    font-weight: 400;
  }
  .mbf-btn-ghost:hover { color: rgba(255,255,255,0.65); transform: none; }

  /* ── PROGRESS DOTS ── */
  .mbf-dots {
    display: flex;
    gap: 6px;
    justify-content: center;
    padding: 18px 0 10px;
    position: relative;
    z-index: 2;
  }
  .mbf-dot-ind {
    width: 6px;
    height: 6px;
    border-radius: 3px;
    background: rgba(255,255,255,0.18);
    transition: width 0.45s var(--mbf-easing), background 0.45s ease;
  }
  .mbf-dot-ind.mbf-active {
    width: 22px;
    background: var(--mbf-accent);
  }

  /* ── ORBIT ANIMATION ── */
  @keyframes mbf-orbit-in {
    0%   { opacity: 0; transform: translate(var(--ox), var(--oy)) scale(0.3); }
    55%  { opacity: 1; }
    100% { opacity: 1; transform: translate(0,0) scale(1); }
  }

  @media (max-width: 520px) {
    .mbf-scene { padding: 40px 28px; }
  }
  `;

  const style = document.createElement("style");
  style.id = "mbf-styles";
  style.textContent = css;
  document.head.appendChild(style);

  /* ─── DATA ──────────────────────────────────────────────────── */
  const features = [
    { icon: "🗺️", text: "<b>Tous les réseaux</b> réunis" },
    { icon: "⏱️", text: "<b>Horaires en temps réel</b> pour chaque ligne et arrêt" },
    { icon: "📲", text: "<b>Application web</b> : installez-la : Partager > Sur l'écran d'accueil" },
    { icon: "🧭", text: "<b>Itinéraires multimodaux</b> sur l'ensemble des réseaux" },
  ];

  const orbitDots = [
    { color: "#ef4444", size: 10, ox: "-210px", oy: "-55px",  delay: 0   },
    { color: "#f59e0b", size: 8,  ox: "190px",  oy: "-75px",  delay: 80  },
    { color: "#10b981", size: 11, ox: "-155px", oy: "65px",   delay: 160 },
    { color: "#8b5cf6", size: 9,  ox: "165px",  oy: "70px",   delay: 240 },
    { color: "#ec4899", size: 8,  ox: "-95px",  oy: "-88px",  delay: 320 },
    { color: "#14b8a6", size: 10, ox: "140px",  oy: "-45px",  delay: 400 },
    { color: "#f97316", size: 8,  ox: "-195px", oy: "18px",   delay: 480 },
    { color: "#6366f1", size: 9,  ox: "205px",  oy: "28px",   delay: 560 },
  ];

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "mbf-overlay";

    const modal = document.createElement("div");
    modal.id = "mbf-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    /* Progress dots */
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "mbf-dots";
    for (let i = 0; i < 3; i++) {
      const d = document.createElement("div");
      d.className = "mbf-dot-ind" + (i === 0 ? " mbf-active" : "");
      dotsWrap.appendChild(d);
    }

    const scene1 = document.createElement("div");
    scene1.className = "mbf-scene mbf-scene-active";
    scene1.innerHTML = `
      <div class="mbf-eyebrow">My Bus Finder · 3.6</div>
      <h1 class="mbf-headline">Tous vos réseaux.<br><strong>Une seule app.</strong></h1>
      <p class="mbf-sub">Les réseaux de transport sont désormais unifiés. Un seul endroit pour tout voir, tout planifier, en temps réel. Plus besoin de quitter, revenir, quitter... bref t'a compris.</p>
    `;

    const scene2 = document.createElement("div");
    scene2.className = "mbf-scene";

    const mergeWrap = document.createElement("div");
    mergeWrap.className = "mbf-merge-wrap";

    const pulseRing = document.createElement("div");
    pulseRing.className = "mbf-pulse-ring";
    pulseRing.id = "mbf-ring";

    const centerApp = document.createElement("div");
    centerApp.className = "mbf-center-app";
    centerApp.id = "mbf-center-app";
    centerApp.textContent = "🚌";

    orbitDots.forEach((od, i) => {
      const dot = document.createElement("div");
      dot.className = "mbf-orbit-dot";
      dot.id = `mbf-od-${i}`;
      dot.style.cssText = `
        width:${od.size}px; height:${od.size}px;
        background:${od.color};
        box-shadow: 0 0 6px ${od.color}88;
        --ox:${od.ox}; --oy:${od.oy};
      `;
      mergeWrap.appendChild(dot);
    });

    mergeWrap.appendChild(pulseRing);
    mergeWrap.appendChild(centerApp);

    scene2.innerHTML = `
      <div class="mbf-eyebrow">Unification des réseaux</div>
      <h2 class="mbf-headline" style="font-size:clamp(30px,5vw,46px);">Tout converge vers<br><strong>un seul point.</strong></h2>
    `;
    scene2.appendChild(mergeWrap);

    const s2sub = document.createElement("p");
    s2sub.className = "mbf-sub";
    s2sub.id = "mbf-s2-sub";
    s2sub.textContent = "Chaque réseau, chaque ligne accessibles depuis My Bus Finder.";
    scene2.appendChild(s2sub);

    const scene3 = document.createElement("div");
    scene3.className = "mbf-scene";
    scene3.innerHTML = `
      <div class="mbf-eyebrow">Ce qui change pour vous</div>
      <h2 class="mbf-headline" style="font-size:clamp(26px,4.5vw,42px);">Votre transport,<br><strong>réinventé.</strong></h2>
      <div class="mbf-features" id="mbf-features-list">
        ${features.map((f) => `
          <div class="mbf-feature-row">
            <div class="mbf-feature-dot">${f.icon}</div>
            <span class="mbf-feature-text">${f.text}</span>
          </div>`).join("")}
      </div>
      <div class="mbf-cta-wrap" id="mbf-s3-cta">
        <button class="mbf-btn mbf-btn-primary" id="mbf-final-cta">Découvrir →</button>
      </div>
    `;

    modal.appendChild(scene1);
    modal.appendChild(scene2);
    modal.appendChild(scene3);
    modal.appendChild(dotsWrap);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return { overlay, modal, dotsWrap, scene1, scene2, scene3 };
  }

  let elements = null;
  let autoTimers = [];
  const STORAGE_KEY = "mbf_popup_shown_v1";

  function clearTimers() {
    autoTimers.forEach(clearTimeout);
    autoTimers = [];
  }

  function later(fn, ms) {
    const t = setTimeout(fn, ms);
    autoTimers.push(t);
    return t;
  }

  function updateDots(idx) {
    if (!elements) return;
    elements.dotsWrap.querySelectorAll(".mbf-dot-ind").forEach((d, i) =>
      d.classList.toggle("mbf-active", i === idx)
    );
  }

  function switchScene(from, to, onReady) {
    from.style.transition = "opacity 0.45s ease";
    from.style.opacity = "0";
    from.style.pointerEvents = "none";

    later(() => {
      from.classList.remove("mbf-scene-active");
      from.style.cssText = "";
      to.classList.add("mbf-scene-active");
      onReady();
    }, 460);
  }

  function playScene1(onDone) {
    const s = elements.scene1;
    const eyebrow = s.querySelector(".mbf-eyebrow");
    const headline = s.querySelector(".mbf-headline");
    const sub = s.querySelector(".mbf-sub");

    [eyebrow, headline, sub].forEach((el) => el && el.classList.remove("mbf-shown"));
    updateDots(0);

    later(() => eyebrow  && eyebrow.classList.add("mbf-shown"),  120);
    later(() => headline && headline.classList.add("mbf-shown"), 300);
    later(() => sub      && sub.classList.add("mbf-shown"),      500);
    later(onDone, 3000);
  }

  function playScene2(onDone) {
    const s = elements.scene2;
    const eyebrow = s.querySelector(".mbf-eyebrow");
    const headline = s.querySelector(".mbf-headline");
    const center = document.getElementById("mbf-center-app");
    const ring   = document.getElementById("mbf-ring");
    const sub    = document.getElementById("mbf-s2-sub");

    // Reset
    center.classList.remove("mbf-pop");
    ring.classList.remove("mbf-pulsing");
    ring.style.opacity = "0";
    [eyebrow, headline, sub].forEach((el) => el && el.classList.remove("mbf-shown"));
    orbitDots.forEach((_, i) => {
      const el = document.getElementById(`mbf-od-${i}`);
      if (el) { el.style.animation = "none"; el.style.opacity = "0"; }
    });

    updateDots(1);

    later(() => eyebrow  && eyebrow.classList.add("mbf-shown"),  80);
    later(() => headline && headline.classList.add("mbf-shown"), 240);

    orbitDots.forEach((od, i) => {
      later(() => {
        const el = document.getElementById(`mbf-od-${i}`);
        if (!el) return;
        el.style.animation = `mbf-orbit-in 0.9s cubic-bezier(0.22,1,0.36,1) forwards`;
      }, 520 + od.delay);
    });

    later(() => center.classList.add("mbf-pop"), 1750);

    later(() => {
      orbitDots.forEach((_, i) => {
        const el = document.getElementById(`mbf-od-${i}`);
        if (el) { el.style.transition = "opacity 0.5s ease"; el.style.opacity = "0"; }
      });
    }, 2150);

    later(() => {
      ring.style.opacity = "1";
      ring.classList.add("mbf-pulsing");
    }, 2250);

    later(() => sub && sub.classList.add("mbf-shown"), 2450);
    later(onDone, 4300);
  }

  function playScene3() {
    const s = elements.scene3;
    const eyebrow = s.querySelector(".mbf-eyebrow");
    const headline = s.querySelector(".mbf-headline");
    const rows = s.querySelectorAll(".mbf-feature-row");
    const cta  = document.getElementById("mbf-s3-cta");

    [eyebrow, headline, cta].forEach((el) => el && el.classList.remove("mbf-shown"));
    rows.forEach((r) => r.classList.remove("mbf-shown"));

    updateDots(2);

    later(() => eyebrow  && eyebrow.classList.add("mbf-shown"),  80);
    later(() => headline && headline.classList.add("mbf-shown"), 250);
    rows.forEach((r, i) => {
      later(() => r.classList.add("mbf-shown"), 430 + i * 145);
    });
    later(() => cta && cta.classList.add("mbf-shown"), 430 + rows.length * 145 + 130);
  }

  function runCinematic() {
    playScene1(() => {
      switchScene(elements.scene1, elements.scene2, () => {
        playScene2(() => {
          switchScene(elements.scene2, elements.scene3, () => {
            playScene3();
          });
        });
      });
    });
  }

  function openPopup() {
    if (!elements) {
      elements = buildModal();

      document.getElementById("mbf-final-cta").addEventListener("click", () => {
        // ↓ Remplacez par votre URL ou action
        closePopup();
      });
      document.addEventListener("keydown", onKeyDown);
    }

    // Reset scenes
    [elements.scene1, elements.scene2, elements.scene3].forEach((s, i) => {
      s.classList.toggle("mbf-scene-active", i === 0);
      s.style.cssText = "";
    });

    elements.overlay.style.display = "flex";
    requestAnimationFrame(() => {
      elements.overlay.classList.add("mbf-visible");
      setTimeout(() => {
        elements.modal.classList.add("mbf-in");
        setTimeout(runCinematic, 550);
      }, 60);
    });

    document.body.style.overflow = "hidden";
  }

  function closePopup() {
    clearTimers();
    if (!elements) return;
    elements.modal.classList.remove("mbf-in");
    elements.overlay.classList.remove("mbf-visible");
    setTimeout(() => { if (elements) elements.overlay.style.display = "none"; }, 750);
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") closePopup();
  }

  window.MyBusFinderPopup = {
    show() {
      if (localStorage.getItem(STORAGE_KEY)) return;
      localStorage.setItem(STORAGE_KEY, "1");
      openPopup();
    },

    forceShow() {
      openPopup();
    },

    reset() {
      localStorage.removeItem(STORAGE_KEY);
    },

    close: closePopup,
  };
})();

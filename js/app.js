const STORAGE_KEY = "mosul_memory_platform_backup_v1";

const SCALE_UI = {
  national_pre: {
    theme: "pre",
    completionMessage: "لقد أكملت القسم الأول بنجاح.",
    actionLabel: "الانتقال إلى القسم التالي"
  },
  resilience_pre: {
    theme: "pre",
    completionMessage: "لقد أكملت هذا القسم بنجاح.",
    actionLabel: "الانتقال إلى مرحلة الصور"
  },
  national_post: {
    theme: "post",
    completionMessage: "لقد أكملت القسم بنجاح.",
    actionLabel: "الانتقال إلى القسم الأخير"
  },
  resilience_post: {
    theme: "post",
    completionMessage: "لقد أكملت القسم الأخير بنجاح.",
    actionLabel: "إنهاء وإرسال الإجابات"
  }
};

const EMOTION_FACE_COLORS = {
  hope: "#8faa88",
  belonging: "#b6a181",
  pride: "#b5a46f",
  happiness: "#aeb78a",
  sadness: "#7893a0",
  anger: "#a9786d",
  fear: "#8a8494"
};

const DEFAULT_STATE = {
  phase: 0,
  consent: false,
  demo: {},
  national_pre: { answers: new Array(20).fill(null), total_score: null },
  resilience_pre: { answers: new Array(20).fill(null), total_score: null },
  images: { current: 0, responses: [] },
  national_post: { answers: new Array(20).fill(null), total_score: null },
  resilience_post: { answers: new Array(20).fill(null), total_score: null },
  remote_save: { attempted: false, status: "pending", error: null },
  local_saved_at: null
};

let STATE = loadState();

document.addEventListener("DOMContentLoaded", () => {
  renderProgressDots();
  renderAllStaticShells();
  goToPhase(STATE.phase, false);
});

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return clone(DEFAULT_STATE);
    return mergeState(clone(DEFAULT_STATE), JSON.parse(saved));
  } catch (_error) {
    return clone(DEFAULT_STATE);
  }
}

function mergeState(base, saved) {
  const merged = { ...base, ...saved };
  ["national_pre", "resilience_pre", "national_post", "resilience_post"].forEach((key) => {
    merged[key] = {
      ...base[key],
      ...(saved[key] || {}),
      answers: normalizeAnswers(saved[key]?.answers, 20)
    };
  });
  merged.demo = saved.demo || {};
  merged.images = {
    current: Number.isInteger(saved.images?.current) ? saved.images.current : 0,
    responses: Array.isArray(saved.images?.responses) ? saved.images.responses : []
  };
  merged.remote_save = {
    ...base.remote_save,
    ...(saved.remote_save || {})
  };
  merged.phase = Number.isInteger(saved.phase) ? Math.min(Math.max(saved.phase, 0), PHASES.length - 1) : 0;
  return merged;
}

function normalizeAnswers(answers, count) {
  const output = new Array(count).fill(null);
  if (!Array.isArray(answers)) return output;
  answers.slice(0, count).forEach((answer, index) => {
    output[index] = answer === null || answer === undefined ? null : Number(answer);
  });
  return output;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function saveBackup() {
  STATE.local_saved_at = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
}

function saveFinalPayloadBackup(payload) {
  localStorage.setItem("mosul_memory_platform_final_payload_v1", JSON.stringify({
    saved_at: new Date().toISOString(),
    payload
  }));
}

function renderAllStaticShells() {
  renderWelcome();
  renderConsent();
  renderDemographics();
}

function goToPhase(index, shouldSave = true) {
  STATE.phase = index;
  document.querySelectorAll(".phase").forEach((section) => {
    section.hidden = true;
  });
  const active = document.getElementById(`phase-${PHASES[index].id}`);
  active.hidden = false;
  updateProgress(index);
  renderCurrentPhase();
  if (shouldSave) saveBackup();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCurrentPhase() {
  const phaseId = PHASES[STATE.phase].id;
  if (phaseId === "national-pre") {
    renderScale("phase-national-pre", "national_pre", NATIONAL_ITEMS, SCALE_LABELS_NATIONAL, 4, "national");
  }
  if (phaseId === "resilience-pre") {
    renderScale("phase-resilience-pre", "resilience_pre", RESILIENCE_ITEMS, SCALE_LABELS_RESILIENCE, 5, "resilience");
  }
  if (phaseId === "images") {
    renderImagesPhase();
  }
  if (phaseId === "national-post") {
    renderScale("phase-national-post", "national_post", NATIONAL_ITEMS, SCALE_LABELS_NATIONAL, 7, "national");
  }
  if (phaseId === "resilience-post") {
    renderScale("phase-resilience-post", "resilience_post", RESILIENCE_ITEMS, SCALE_LABELS_RESILIENCE, 8, "resilience");
  }
  if (phaseId === "thankyou") {
    renderThankyou();
  }
}

function renderProgressDots() {
  const dots = document.getElementById("progress-dots");
  dots.innerHTML = PHASES.map((phase, index) => `
    <span class="progress-dot" data-index="${index}" title="${phase.label}" aria-label="${phase.label}"></span>
  `).join("");
}

function updateProgress(index) {
  document.querySelectorAll(".progress-dot").forEach((dot, dotIndex) => {
    dot.classList.toggle("done", dotIndex < index);
    dot.classList.toggle("active", dotIndex === index);
  });
  const label = document.querySelector(".progress-label");
  label.textContent = `${PHASES[index].label} — ${index + 1} من ${PHASES.length}`;
}

function renderWelcome() {
  const el = document.getElementById("phase-welcome");
  el.innerHTML = `
    <section class="landing-hero">
      <img class="landing-hero-image" src="images/mosul_memory_hero.webp" alt="باحث يراجع صوراً أرشيفية لمعالم الموصل قبل الحرب وبعدها" decoding="async" fetchpriority="high">
      <div class="landing-hero-overlay"></div>
      <div class="landing-hero-content">
        <p class="eyebrow">منصة رقمية تفاعلية</p>
        <h1>${STUDY_TEXT.title}</h1>
        <p class="hero-subtitle">${STUDY_TEXT.researchTitle}</p>
        <div class="hero-highlights" aria-label="معلومات مختصرة عن المشاركة">
          <span>10 مواقع تراثية</span>
          <span>15–20 دقيقة</span>
          <span>مشاركة آمنة</span>
        </div>
      </div>
    </section>
    <div class="panel welcome-panel">
      <h2>${STUDY_TEXT.welcomeHeading}</h2>
      ${STUDY_TEXT.welcome.map((text) => `<p>${text}</p>`).join("")}
      <div class="duration">المدة المتوقعة: 15–20 دقيقة</div>
    </div>
    <div class="panel muted-panel">
      <h2>مراحل المشاركة</h2>
      <ol class="clean-list">
        ${STUDY_TEXT.stages.map((stage) => `<li>${stage}</li>`).join("")}
      </ol>
    </div>
    <div class="actions">
      <button class="btn primary" type="button" id="welcome-next">متابعة إلى الموافقة</button>
    </div>
  `;
  document.getElementById("welcome-next").addEventListener("click", () => goToPhase(1));
}

function renderConsent() {
  const el = document.getElementById("phase-consent");
  el.innerHTML = `
    <header class="section-header">
      <p class="eyebrow">الموافقة والخصوصية</p>
      <h1>${STUDY_TEXT.privacyHeading}</h1>
    </header>
    <div class="panel">
      ${STUDY_TEXT.privacy.map((text) => `<p>${text}</p>`).join("")}
    </div>
    <div class="panel">
      <h2>${STUDY_TEXT.instructionsHeading}</h2>
      <ul class="clean-list">
        ${STUDY_TEXT.instructions.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
    <label class="consent-box">
      <input type="checkbox" id="consent-input" ${STATE.consent ? "checked" : ""}>
      <span>أوافق على المشاركة في الدراسة واستخدام بياناتي لأغراض البحث العلمي وفق الضوابط الأخلاقية الموضحة أعلاه.</span>
    </label>
    <div class="actions">
      <button class="btn secondary" type="button" id="consent-back">السابق</button>
      <button class="btn primary" type="button" id="consent-next" ${STATE.consent ? "" : "disabled"}>الانتقال إلى البيانات الديمغرافية</button>
    </div>
  `;
  const input = document.getElementById("consent-input");
  const next = document.getElementById("consent-next");
  input.addEventListener("change", () => {
    STATE.consent = input.checked;
    next.disabled = !STATE.consent;
    saveBackup();
  });
  document.getElementById("consent-back").addEventListener("click", () => goToPhase(0));
  next.addEventListener("click", () => {
    if (STATE.consent) goToPhase(2);
  });
}

function renderDemographics() {
  const el = document.getElementById("phase-demographics");
  el.innerHTML = `
    <header class="section-header">
      <p class="eyebrow">البيانات الديمغرافية</p>
      <h1>المعلومات الديمغرافية</h1>
      <p>جميع الحقول مطلوبة لإكمال المشاركة.</p>
    </header>
    <form class="form-grid" id="demo-form" novalidate>
      ${DEMO_FIELDS.map(renderDemoField).join("")}
    </form>
    <div class="actions">
      <button class="btn secondary" type="button" id="demo-back">السابق</button>
      <button class="btn primary" type="button" id="demo-next" disabled>التالي</button>
    </div>
  `;

  const form = document.getElementById("demo-form");
  form.addEventListener("input", handleDemoInput);
  form.addEventListener("change", handleDemoInput);
  document.getElementById("demo-back").addEventListener("click", () => goToPhase(1));
  document.getElementById("demo-next").addEventListener("click", () => {
    handleDemoInput();
    if (isDemoComplete()) goToPhase(3);
  });
  validateDemoButton();
}

function renderDemoField(field) {
  const value = STATE.demo[field.id] || "";
  if (field.type === "select") {
    return `
      <label class="field">
        <span>${field.label}</span>
        <select name="${field.id}" required>
          <option value="">اختر</option>
          ${field.options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${option}</option>`).join("")}
        </select>
      </label>
    `;
  }
  if (field.type === "radio") {
    return `
      <fieldset class="field radio-field">
        <legend>${field.label}</legend>
        <div class="radio-group">
          ${field.options.map((option) => `
            <label>
              <input type="radio" name="${field.id}" value="${option}" ${value === option ? "checked" : ""} required>
              <span>${option}</span>
            </label>
          `).join("")}
        </div>
      </fieldset>
    `;
  }
  return `
    <label class="field">
      <span>${field.label}</span>
      <input type="text" name="${field.id}" value="${value}" required autocomplete="off">
    </label>
  `;
}

function handleDemoInput() {
  const form = document.getElementById("demo-form");
  const data = new FormData(form);
  DEMO_FIELDS.forEach((field) => {
    STATE.demo[field.id] = String(data.get(field.id) || "").trim();
  });
  validateDemoButton();
  saveBackup();
}

function isDemoComplete() {
  return DEMO_FIELDS.every((field) => STATE.demo[field.id] && STATE.demo[field.id].trim() !== "");
}

function validateDemoButton() {
  const next = document.getElementById("demo-next");
  if (next) next.disabled = !isDemoComplete();
}

function renderScale(containerId, stateKey, items, labels, nextPhase, scaleType) {
  const el = document.getElementById(containerId);
  const answers = STATE[stateKey].answers;
  const ui = SCALE_UI[stateKey];
  let current = firstOpenIndex(answers);

  function draw() {
    const selected = answers[current];
    const progress = Math.round(((current + 1) / items.length) * 100);
    el.innerHTML = `
      <div class="scale-shell theme-${ui.theme}">
        <header class="section-header">
          <p class="eyebrow">السؤال ${current + 1} من ${items.length}</p>
        </header>
        <div class="panel scale-panel">
          <div class="mini-progress" aria-hidden="true"><span style="width:${progress}%"></span></div>
          <p class="question-text">${items[current]}</p>
          <div class="scale-options" role="group" aria-label="خيارات الإجابة">
            ${labels.map((label, index) => {
              const value = index + 1;
              const isSelected = selected === value;
              return `
                <button class="scale-option ${isSelected ? "selected" : ""}" type="button" data-value="${value}" aria-pressed="${isSelected}">
                  <span class="option-label">${label}</span>
                  <span class="option-check" aria-hidden="true">✓</span>
                </button>
              `;
            }).join("")}
          </div>
        </div>
        <div class="actions">
          <button class="btn secondary scale-prev-button" type="button" ${current === 0 ? "disabled" : ""}>السابق</button>
          <button class="btn primary scale-next-button" type="button" ${selected ? "" : "disabled"}>${current === items.length - 1 ? "إنهاء المقياس" : "التالي"}</button>
        </div>
      </div>
    `;

    el.querySelectorAll(".scale-option").forEach((button) => {
      button.addEventListener("click", () => {
        answers[current] = Number(button.dataset.value);
        STATE[stateKey].total_score = calculateScaleTotal(answers, scaleType);
        saveBackup();
        draw();
      });
    });

    el.querySelector(".scale-prev-button").addEventListener("click", () => {
      if (current > 0) {
        current -= 1;
        draw();
      }
    });

    el.querySelector(".scale-next-button").addEventListener("click", () => {
      if (!answers[current]) return;
      if (current < items.length - 1) {
        current += 1;
        draw();
        return;
      }
      STATE[stateKey].total_score = calculateScaleTotal(answers, scaleType);
      saveBackup();
      drawScaleTransition();
    });
  }

  function drawScaleTransition() {
    el.innerHTML = `
      <div class="scale-shell theme-${ui.theme}">
        <div class="scale-transition" role="status" aria-live="polite">
          <div class="transition-success-icon" aria-hidden="true">✓</div>
          <p class="eyebrow">اكتمل القسم بنجاح</p>
          <h1>شكراً لك</h1>
          <p class="transition-message">${ui.completionMessage}</p>
          <button class="btn primary transition-button" type="button">${ui.actionLabel}</button>
        </div>
      </div>
    `;

    el.querySelector(".transition-button").addEventListener("click", () => goToPhase(nextPhase));
    el.querySelector(".transition-button").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  draw();
}

function firstOpenIndex(answers) {
  const index = answers.findIndex((answer) => answer === null || answer === undefined);
  return index === -1 ? answers.length - 1 : index;
}

function calculateScaleTotal(answers, scaleType) {
  if (answers.some((answer) => answer === null || answer === undefined)) return null;
  return answers.reduce((sum, answer, index) => {
    const value = Number(answer);
    if (scaleType === "national" && NATIONAL_REVERSED_ITEMS.includes(index + 1)) {
      return sum + (6 - value);
    }
    return sum + value;
  }, 0);
}

function renderImagesPhase() {
  const el = document.getElementById("phase-images");
  const current = Math.min(STATE.images.responses.length, SITES.length - 1);
  STATE.images.current = current;
  const site = SITES[current];
  const answers = {};
  Timer.reset();

  el.innerHTML = `
    <div class="site-heading-wrap">
      <header class="section-header site-section-header">
        <p class="eyebrow">الموقع ${current + 1} من ${SITES.length}</p>
        <div class="site-title-line">
          <h1>${site.name}</h1>
          <button class="site-info-button" type="button" aria-label="معلومات عن ${site.name}" aria-expanded="false" aria-controls="site-info-card">i</button>
        </div>
        <p>${STUDY_TEXT.imageInstructions}</p>
      </header>
      <aside class="site-info-card" id="site-info-card" hidden>
        <button class="site-info-close" type="button" aria-label="إغلاق معلومات الموقع">×</button>
        <p class="eyebrow">عن الموقع</p>
        <h2>${site.name}</h2>
        <p>${site.info}</p>
      </aside>
    </div>
    <div class="mini-progress" aria-hidden="true"><span style="width:${Math.round(((current + 1) / SITES.length) * 100)}%"></span></div>
    ${renderImageComparison(site)}
    <div class="panel emotions-panel">
      <h2>كيف تشعر تجاه ما رأيت؟</h2>
      <p class="emotion-instruction">اختر الوجه الذي يعبّر عن درجة شعورك في كل سطر.</p>
      <div class="emotion-list">
        ${EMOTIONS.map((emotion) => renderEmotionRow(emotion)).join("")}
      </div>
    </div>
    <div class="actions">
      <button class="btn primary" type="button" id="next-site" disabled>${current === SITES.length - 1 ? "إنهاء مرحلة الصور" : "الموقع التالي"}</button>
    </div>
  `;

  attachImageFallbacks(el);
  bindImageComparison(el);

  const infoButton = el.querySelector(".site-info-button");
  const infoCard = el.querySelector(".site-info-card");
  const closeInfo = el.querySelector(".site-info-close");
  infoButton.addEventListener("click", () => {
    infoCard.hidden = !infoCard.hidden;
    infoButton.setAttribute("aria-expanded", String(!infoCard.hidden));
    if (!infoCard.hidden) closeInfo.focus();
  });
  closeInfo.addEventListener("click", () => {
    infoCard.hidden = true;
    infoButton.setAttribute("aria-expanded", "false");
    infoButton.focus();
  });

  el.querySelectorAll(".emotion-choice").forEach((button) => {
    button.addEventListener("click", () => {
      if (!Timer.running) Timer.start();
      const emotion = button.dataset.emotion;
      const value = Number(button.dataset.value);
      answers[emotion] = value;
      el.querySelectorAll(`.emotion-choice[data-emotion="${emotion}"]`).forEach((choice) => {
        choice.classList.toggle("selected", choice === button);
        choice.setAttribute("aria-pressed", String(choice === button));
      });
      el.querySelector("#next-site").disabled = !areEmotionsComplete(answers);
    });
  });

  el.querySelector("#next-site").addEventListener("click", () => {
    if (!areEmotionsComplete(answers)) return;
    const response = {
      site_id: site.id,
      site_name: site.name,
      ...answers,
      reaction_time_ms: Timer.stop()
    };
    STATE.images.responses.push(response);
    STATE.images.current = STATE.images.responses.length;
    saveBackup();
    if (STATE.images.responses.length < SITES.length) {
      renderImagesPhase();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goToPhase(6);
  });
}

function renderImageComparison(site) {
  return `
    <div class="comparison-wrap">
      <div class="comparison-card" style="--split: 50%">
        <div class="comparison-layer comparison-after" data-image-shell>
          <img src="${site.after}" alt="${site.name} بعد الحرب" loading="eager" decoding="async" fetchpriority="high">
          <div class="image-placeholder" hidden><strong>الصورة غير متوفرة حالياً</strong></div>
        </div>
        <div class="comparison-layer comparison-before" data-image-shell>
          <img src="${site.before}" alt="${site.name} قبل الحرب" loading="eager" decoding="async" fetchpriority="high">
          <div class="image-placeholder" hidden><strong>الصورة غير متوفرة حالياً</strong></div>
        </div>
        <span class="comparison-label comparison-label-after">بعد الحرب</span>
        <span class="comparison-label comparison-label-before">قبل الحرب</span>
        <div class="comparison-divider" aria-hidden="true"><span>↔</span></div>
        <input class="comparison-range" type="range" min="0" max="100" value="50" dir="ltr" aria-label="اسحب لمقارنة صورة الموقع قبل الحرب وبعدها" aria-valuetext="عرض متوازن للصورتين">
      </div>
      <p class="comparison-hint"><span aria-hidden="true">↔</span> اسحب أفقياً لاكتشاف الصورة قبل الحرب وبعدها</p>
    </div>
  `;
}

function bindImageComparison(scope) {
  const card = scope.querySelector(".comparison-card");
  const range = scope.querySelector(".comparison-range");
  const update = () => {
    const value = Number(range.value);
    card.style.setProperty("--split", `${value}%`);
    const description = value < 35 ? "إظهار أكبر للصورة بعد الحرب" : value > 65 ? "إظهار أكبر للصورة قبل الحرب" : "عرض متوازن للصورتين";
    range.setAttribute("aria-valuetext", description);
  };
  range.addEventListener("input", update);
  update();
}

function attachImageFallbacks(scope) {
  scope.querySelectorAll("[data-image-shell]").forEach((frame) => {
    const image = frame.querySelector("img");
    const placeholder = frame.querySelector(".image-placeholder");
    placeholder.hidden = true;
    image.addEventListener("load", () => {
      image.hidden = false;
      placeholder.hidden = true;
    });
    image.addEventListener("error", () => {
      image.hidden = true;
      placeholder.hidden = false;
    });
  });
}

function renderEmotionRow(emotion) {
  return `
    <div class="emotion-row emotion-${emotion.id}">
      <div class="emotion-name">
        <strong>${emotion.label}</strong>
      </div>
      <div class="emotion-scale" role="group" aria-label="درجة شعور ${emotion.label}">
        ${[1, 2, 3, 4, 5].map((value) => {
          return `
            <button class="emotion-choice" type="button" data-emotion="${emotion.id}" data-value="${value}" aria-label="${emotion.label}: الدرجة ${value} من 5" aria-pressed="false">
              ${renderEmotionFace(emotion.id, value)}
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderEmotionFace(emotionId, value) {
  const color = EMOTION_FACE_COLORS[emotionId];
  const isPositive = ["hope", "belonging", "pride", "happiness"].includes(emotionId);
  const isAnger = emotionId === "anger";
  const isFear = emotionId === "fear";
  const strong = value >= 4;

  let eyes = `<circle cx="23" cy="27" r="2.5"></circle><circle cx="41" cy="27" r="2.5"></circle>`;
  if (isAnger && value >= 3) {
    eyes = `<path d="M18 23 L27 27"></path><path d="M46 23 L37 27"></path><circle cx="23" cy="29" r="2"></circle><circle cx="41" cy="29" r="2"></circle>`;
  } else if (isPositive && strong) {
    eyes = `<path d="M18 28 Q23 22 28 28"></path><path d="M36 28 Q41 22 46 28"></path>`;
  } else if (isFear && strong) {
    eyes = `<circle cx="23" cy="26" r="3.4"></circle><circle cx="41" cy="26" r="3.4"></circle>`;
  }

  let mouth = `<path d="M21 40 L43 40"></path>`;
  if (value > 1 && isPositive) {
    const curve = value === 2 ? 43 : value === 3 ? 47 : value === 4 ? 50 : 52;
    mouth = `<path d="M18 36 Q32 ${curve} 46 36"></path>`;
  } else if (value > 1 && emotionId === "sadness") {
    const curve = value >= 4 ? 27 : value === 3 ? 30 : 34;
    mouth = `<path d="M18 45 Q32 ${curve} 46 45"></path>`;
  } else if (value > 1 && isAnger) {
    const curve = value >= 4 ? 29 : 33;
    mouth = `<path d="M18 44 Q32 ${curve} 46 44"></path>`;
  } else if (value > 1 && isFear) {
    const radiusY = value >= 4 ? 9 : value === 3 ? 6 : 3;
    mouth = `<ellipse cx="32" cy="42" rx="7" ry="${radiusY}"></ellipse>`;
  }

  const accent = emotionId === "sadness" && value >= 4
    ? `<path class="face-accent" d="M45 31 C49 36 49 39 45 41 C41 39 41 36 45 31 Z"></path>`
    : "";

  return `
    <span class="emotion-face" aria-hidden="true" style="--face-color:${color}" data-level="${value}">
      <svg viewBox="0 0 64 64" focusable="false">
        <circle class="face-disc" cx="32" cy="32" r="27"></circle>
        <g class="face-details">${eyes}${mouth}</g>
        ${accent}
      </svg>
    </span>
  `;
}

function areEmotionsComplete(answers) {
  return EMOTIONS.every((emotion) => Number.isInteger(answers[emotion.id]));
}

function renderThankyou() {
  saveBackup();
  const el = document.getElementById("phase-thankyou");
  el.innerHTML = `
    <div class="thankyou-wrap">
      <div class="hero-mark" aria-hidden="true">
        <span></span>
        <i></i>
      </div>
      <p class="eyebrow">اكتملت المشاركة</p>
      <h1>شكراً لمساهمتك</h1>
      <p>${STUDY_TEXT.thankyou}</p>
      <div class="panel share-panel">
        <div class="share-icon" aria-hidden="true">↗</div>
        <h2>شارك مع الأصدقاء</h2>
        <p>ساعدنا في الوصول إلى مشاركين أكثر عبر مشاركة رابط المنصة.</p>
        <button class="btn primary" type="button" id="copy-share-link">نسخ رابط المنصة</button>
        <p class="share-feedback" id="share-feedback" aria-live="polite"></p>
      </div>
      <button class="btn secondary" type="button" id="clear-local">بدء مشاركة جديدة</button>
    </div>
  `;
  finalizeRemoteSave();
  document.getElementById("copy-share-link").addEventListener("click", copyPlatformLink);
  document.getElementById("clear-local").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("mosul_memory_platform_final_payload_v1");
    STATE = clone(DEFAULT_STATE);
    renderAllStaticShells();
    goToPhase(0);
  });
}

async function copyPlatformLink() {
  const button = document.getElementById("copy-share-link");
  const feedback = document.getElementById("share-feedback");
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";

  try {
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url.toString());
        copied = true;
      } catch (_clipboardError) {
        copied = false;
      }
    }

    if (!copied) {
      const input = document.createElement("textarea");
      input.value = url.toString();
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      copied = document.execCommand("copy");
      input.remove();
    }

    if (!copied) throw new Error("تعذر نسخ الرابط");
    button.textContent = "تم نسخ الرابط ✓";
    feedback.textContent = "الرابط جاهز للمشاركة مع أصدقائك.";
  } catch (_error) {
    feedback.textContent = "تعذر النسخ التلقائي. انسخ رابط الصفحة من شريط المتصفح.";
  }
}

function getRemoteSaveMessage() {
  if (STATE.remote_save.status === "success") {
    return "تم حفظ إجاباتك في قاعدة البيانات بنجاح.";
  }
  if (STATE.remote_save.status === "failed") {
    return "تعذر الحفظ في قاعدة البيانات، وتم حفظ نسخة محلية احتياطية.";
  }
  if (STATE.remote_save.status === "local-only") {
    return "لم يتم تفعيل ربط قاعدة البيانات بعد، وتم حفظ المشاركة محلياً فقط.";
  }
  return "جاري التحقق من إعدادات الحفظ الخارجي...";
}

async function finalizeRemoteSave() {
  const hasSupabase = Boolean(window.MosulMemorySupabase && window.MosulMemorySupabase.isConfigured());

  if (STATE.remote_save.attempted && STATE.remote_save.status === "success") {
    updateRemoteSaveMessage();
    return;
  }

  if (STATE.remote_save.attempted && STATE.remote_save.status === "failed") {
    updateRemoteSaveMessage();
    return;
  }

  if (STATE.remote_save.attempted && STATE.remote_save.status === "local-only" && !hasSupabase) {
    updateRemoteSaveMessage();
    return;
  }

  const payload = buildStudyPayload();
  saveFinalPayloadBackup(payload);

  if (!hasSupabase) {
    STATE.remote_save = { attempted: true, status: "local-only", error: null };
    saveBackup();
    updateRemoteSaveMessage();
    return;
  }

  STATE.remote_save = { attempted: true, status: "saving", error: null };
  saveBackup();
  updateRemoteSaveMessage("جاري حفظ البيانات في قاعدة البيانات...");

  try {
    await window.MosulMemorySupabase.saveStudyData(payload);
    STATE.remote_save = { attempted: true, status: "success", error: null };
  } catch (error) {
    console.error("تعذر الحفظ في Supabase:", error);
    STATE.remote_save = {
      attempted: true,
      status: "failed",
      error: error && error.message ? error.message : "تعذر الحفظ الخارجي"
    };
    saveFinalPayloadBackup(payload);
  }

  saveBackup();
  updateRemoteSaveMessage();
}

function updateRemoteSaveMessage(message) {
  const status = document.getElementById("remote-save-status");
  if (!status) return;
  status.innerHTML = `<p>${message || getRemoteSaveMessage()}</p>`;
}

function buildStudyPayload() {
  return {
    participant: { ...STATE.demo },
    scales: {
      national_pre: {
        answers: [...STATE.national_pre.answers],
        total_score: STATE.national_pre.total_score
      },
      resilience_pre: {
        answers: [...STATE.resilience_pre.answers],
        total_score: STATE.resilience_pre.total_score
      },
      national_post: {
        answers: [...STATE.national_post.answers],
        total_score: STATE.national_post.total_score
      },
      resilience_post: {
        answers: [...STATE.resilience_post.answers],
        total_score: STATE.resilience_post.total_score
      }
    },
    image_responses: [...STATE.images.responses],
    local_saved_at: STATE.local_saved_at
  };
}

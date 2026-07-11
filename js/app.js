const STORAGE_KEY = "mosul_memory_platform_backup_v1";

const SCALE_UI = {
  national_pre: {
    theme: "national-pre",
    completionMessage: "لقد أكملت اختبار الهوية الوطنية الأول بنجاح.",
    actionLabel: "الانتقال إلى الاختبار الثاني"
  },
  resilience_pre: {
    theme: "resilience-pre",
    completionMessage: "لقد أكملت اختبار الصمود النفسي بنجاح.",
    actionLabel: "الانتقال إلى مرحلة الصور"
  },
  national_post: {
    theme: "national-post",
    completionMessage: "لقد أكملت اختبار الهوية الوطنية البعدي بنجاح.",
    actionLabel: "الانتقال إلى الاختبار الأخير"
  },
  resilience_post: {
    theme: "resilience-post",
    completionMessage: "لقد أكملت الاختبار الأخير بنجاح.",
    actionLabel: "إنهاء وإرسال الإجابات"
  }
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
    renderScale("phase-national-pre", "مقياس الهوية الوطنية القبلي", "national_pre", NATIONAL_ITEMS, SCALE_LABELS_NATIONAL, 4, "national");
  }
  if (phaseId === "resilience-pre") {
    renderScale("phase-resilience-pre", "مقياس الصمود النفسي القبلي", "resilience_pre", RESILIENCE_ITEMS, SCALE_LABELS_RESILIENCE, 5, "resilience");
  }
  if (phaseId === "images") {
    renderImagesPhase();
  }
  if (phaseId === "national-post") {
    renderScale("phase-national-post", "مقياس الهوية الوطنية البعدي", "national_post", NATIONAL_ITEMS, SCALE_LABELS_NATIONAL, 7, "national");
  }
  if (phaseId === "resilience-post") {
    renderScale("phase-resilience-post", "مقياس الصمود النفسي البعدي", "resilience_post", RESILIENCE_ITEMS, SCALE_LABELS_RESILIENCE, 8, "resilience");
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
    <div class="hero-mark" aria-hidden="true">
      <span></span>
      <i></i>
    </div>
    <p class="eyebrow">منصة ذاكرة الموصل</p>
    <h1>${STUDY_TEXT.title}</h1>
    <p class="hero-subtitle">${STUDY_TEXT.researchTitle}</p>
    <div class="welcome-visual" data-state="before">
      <div class="welcome-image-shell">
        <img class="welcome-image active" data-hero-image="before" src="${SITES[0].before}" alt="جامع النوري الكبير قبل الحرب" decoding="async" fetchpriority="high">
        <img class="welcome-image" data-hero-image="after" src="${SITES[0].after}" alt="جامع النوري الكبير بعد الحرب" loading="lazy" decoding="async">
        <div class="welcome-image-overlay">
          <span id="welcome-visual-label">ذاكرة المكان قبل الحرب</span>
        </div>
      </div>
      <div class="welcome-visual-controls" aria-label="عرض صورة الواجهة">
        <button class="visual-toggle active" type="button" data-visual-state="before">قبل الحرب</button>
        <button class="visual-toggle" type="button" data-visual-state="after">بعد الحرب</button>
      </div>
    </div>
    <div class="panel">
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
  bindWelcomeVisual(el);
  document.getElementById("welcome-next").addEventListener("click", () => goToPhase(1));
}

function bindWelcomeVisual(scope) {
  const visual = scope.querySelector(".welcome-visual");
  const label = scope.querySelector("#welcome-visual-label");
  const toggles = scope.querySelectorAll(".visual-toggle");
  const images = scope.querySelectorAll(".welcome-image");

  toggles.forEach((button) => {
    button.addEventListener("click", () => {
      const state = button.dataset.visualState;
      visual.dataset.state = state;
      label.textContent = state === "before" ? "ذاكرة المكان قبل الحرب" : "ذاكرة المكان بعد الحرب";
      toggles.forEach((toggle) => toggle.classList.toggle("active", toggle === button));
      images.forEach((image) => image.classList.toggle("active", image.dataset.heroImage === state));
    });
  });
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

function renderScale(containerId, title, stateKey, items, labels, nextPhase, scaleType) {
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
          <p class="eyebrow">الفقرة ${current + 1} من ${items.length}</p>
          <h1>${title}</h1>
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
          <p class="eyebrow">اكتمل الاختبار بنجاح</p>
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
    <header class="section-header">
      <p class="eyebrow">الموقع ${current + 1} من ${SITES.length}</p>
      <h1>${site.name}</h1>
      <p>${STUDY_TEXT.imageInstructions}</p>
    </header>
    <div class="mini-progress" aria-hidden="true"><span style="width:${Math.round(((current + 1) / SITES.length) * 100)}%"></span></div>
    <div class="images-grid">
      ${renderImageCard("قبل الحرب", "before", site.before)}
      ${renderImageCard("بعد الحرب", "after", site.after)}
    </div>
    <div class="panel emotions-panel">
      <h2>كيف تشعر تجاه ما رأيت؟</h2>
      <div class="emotion-list">
        ${EMOTIONS.map((emotion) => renderEmotionRow(emotion)).join("")}
      </div>
    </div>
    <div class="actions">
      <button class="btn primary" type="button" id="next-site" disabled>${current === SITES.length - 1 ? "إنهاء مرحلة الصور" : "الموقع التالي"}</button>
    </div>
  `;

  attachImageFallbacks(el);

  el.querySelectorAll(".info-button").forEach((button) => {
    button.addEventListener("click", () => {
      const target = el.querySelector(`#definition-${button.dataset.emotion}`);
      target.hidden = !target.hidden;
    });
  });

  el.querySelectorAll(".emotion-choice").forEach((button) => {
    button.addEventListener("click", () => {
      if (!Timer.running) Timer.start();
      const emotion = button.dataset.emotion;
      const value = Number(button.dataset.value);
      answers[emotion] = value;
      el.querySelectorAll(`.emotion-choice[data-emotion="${emotion}"]`).forEach((choice) => {
        choice.classList.toggle("selected", choice === button);
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

function renderImageCard(label, type, src) {
  return `
    <article class="image-card ${type}">
      <div class="image-badge">${label}</div>
      <div class="image-frame">
        <img src="${src}" alt="${label}" loading="eager" decoding="async" fetchpriority="high">
        <div class="image-placeholder" hidden>
          <strong>الصورة غير متوفرة حالياً</strong>
          <span>يرجى إضافة الصورة إلى مجلد الصور بالاسم المحدد في المواصفة.</span>
        </div>
      </div>
    </article>
  `;
}

function attachImageFallbacks(scope) {
  scope.querySelectorAll(".image-frame").forEach((frame) => {
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
    <div class="emotion-row">
      <div class="emotion-name">
        <span class="emotion-symbol">${emotion.symbol}</span>
        <span>${emotion.label}</span>
        <button class="info-button" type="button" data-emotion="${emotion.id}" aria-label="عرض تعريف الشعور ${emotion.label}">ⓘ</button>
      </div>
      <div class="emotion-definition" id="definition-${emotion.id}" hidden>${emotion.def}</div>
      <div class="emotion-scale" role="group" aria-label="${emotion.label}">
        ${[1, 2, 3, 4, 5].map((value) => `
          <button class="emotion-choice" type="button" data-emotion="${emotion.id}" data-value="${value}">${value}</button>
        `).join("")}
      </div>
    </div>
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
      <div class="panel success-panel">
        <p>تم الحفظ المحلي بنجاح. يمكن إغلاق هذه الصفحة الآن.</p>
      </div>
      <div class="panel save-status-panel" id="remote-save-status" aria-live="polite">
        <p>${getRemoteSaveMessage()}</p>
      </div>
      <button class="btn secondary" type="button" id="clear-local">بدء مشاركة جديدة</button>
    </div>
  `;
  finalizeRemoteSave();
  document.getElementById("clear-local").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("mosul_memory_platform_final_payload_v1");
    STATE = clone(DEFAULT_STATE);
    renderAllStaticShells();
    goToPhase(0);
  });
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

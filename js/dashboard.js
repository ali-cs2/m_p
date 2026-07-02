(function () {
  const CONFIG = window.MOSUL_MEMORY_CONFIG || {};
  const SUPABASE_URL = CONFIG.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY || "";
  const statusEl = document.getElementById("dashboard-status");
  const loginPanel = document.getElementById("login-panel");
  const dashboardPanel = document.getElementById("dashboard-panel");
  const participantsList = document.getElementById("participants-list");
  const summaryGrid = document.getElementById("summary-grid");
  const state = {
    client: null,
    participants: [],
    scales: [],
    imageResponses: [],
    combined: [],
    filtered: []
  };

  document.addEventListener("DOMContentLoaded", initDashboard);

  async function initDashboard() {
    bindEvents();

    if (!isSupabaseConfigured()) {
      showStatus("لم يتم العثور على إعدادات Supabase.", "error");
      loginPanel.hidden = true;
      dashboardPanel.hidden = true;
      return;
    }

    state.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await state.client.auth.getSession();

    if (!data.session) {
      showLogin();
      return;
    }

    await loadDashboard();
  }

  function isSupabaseConfigured() {
    return Boolean(
      SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      SUPABASE_URL.includes("supabase.co") &&
      SUPABASE_ANON_KEY.length > 20 &&
      window.supabase
    );
  }

  function bindEvents() {
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("logout-button").addEventListener("click", handleLogout);
    document.getElementById("refresh-data").addEventListener("click", loadDashboard);
    document.getElementById("search-input").addEventListener("input", applyFilters);
    document.getElementById("filter-gender").addEventListener("change", applyFilters);
    document.getElementById("filter-residence").addEventListener("change", applyFilters);
    document.getElementById("filter-qualification").addEventListener("change", applyFilters);
    document.getElementById("filter-economic").addEventListener("change", applyFilters);
    document.getElementById("export-summary-csv").addEventListener("click", exportSummaryCsv);
    document.getElementById("export-full-csv").addEventListener("click", exportFullCsv);
    document.getElementById("export-full-json").addEventListener("click", exportFullJson);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("admin-email").value.trim();
    if (!email) return;

    showStatus("جاري إرسال رابط الدخول...", "info");
    const { error } = await state.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getDashboardRedirectUrl(),
        shouldCreateUser: false
      }
    });

    if (error) {
      showStatus("تعذر إرسال رابط الدخول. تأكد من إعدادات Supabase Auth.", "error");
      console.error("Supabase auth error:", error);
      return;
    }

    showStatus("تم إرسال رابط الدخول إلى البريد الإلكتروني. افتح الرابط ثم عد إلى هذه الصفحة.", "success");
  }

  function getDashboardRedirectUrl() {
    const url = new URL(window.location.href);
    url.pathname = "/dashboard.html";
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  async function handleLogout() {
    await state.client.auth.signOut();
    state.participants = [];
    state.scales = [];
    state.imageResponses = [];
    state.combined = [];
    showLogin();
  }

  function showLogin() {
    showStatus("يرجى تسجيل الدخول بحساب الباحث لعرض لوحة البيانات.", "info");
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
  }

  async function loadDashboard() {
    showStatus("جاري تحميل البيانات...", "info");
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;

    const hasAccess = await hasAdminAccess();
    if (!hasAccess) {
      showStatus("لا تملك صلاحية عرض لوحة البيانات. تأكد من إضافة حسابك إلى admin_users.", "error");
      dashboardPanel.hidden = true;
      return;
    }

    const [participantsResult, scalesResult, imagesResult] = await Promise.all([
      state.client.from("participants").select("*").order("created_at", { ascending: false }),
      state.client.from("scales").select("*"),
      state.client.from("image_responses").select("*").order("site_id", { ascending: true })
    ]);

    const readError = participantsResult.error || scalesResult.error || imagesResult.error;
    if (readError) {
      console.error("Supabase dashboard read error:", readError);
      showStatus("لا تملك صلاحية عرض لوحة البيانات. تأكد من إضافة حسابك إلى admin_users.", "error");
      dashboardPanel.hidden = true;
      return;
    }

    state.participants = participantsResult.data || [];
    state.scales = scalesResult.data || [];
    state.imageResponses = imagesResult.data || [];
    state.combined = combineData(state.participants, state.scales, state.imageResponses);
    state.filtered = [...state.combined];

    if (!state.combined.length) {
      renderSummary();
      participantsList.innerHTML = `<div class="panel empty-state">لا توجد مشاركات محفوظة بعد.</div>`;
      showStatus("لا توجد مشاركات محفوظة بعد.", "info");
      return;
    }

    populateFilters();
    renderSummary();
    renderParticipants(state.filtered);
    showStatus(`تم تحميل ${state.combined.length} مشارك.`, "success");
  }

  async function hasAdminAccess() {
    const { data, error } = await state.client
      .from("admin_users")
      .select("user_id")
      .limit(1);

    if (error) {
      console.error("Supabase admin access check error:", error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  }

  function combineData(participants, scales, imageResponses) {
    const map = {};
    participants.forEach((participant) => {
      map[participant.id] = {
        participant_id: participant.id,
        demo: participant,
        scales: {
          national_pre: null,
          national_post: null,
          resilience_pre: null,
          resilience_post: null
        },
        scores: {},
        imageResponses: []
      };
    });

    scales.forEach((scale) => {
      const item = map[scale.participant_id];
      if (item && item.scales[scale.scale_type] !== undefined) {
        item.scales[scale.scale_type] = scale;
      }
    });

    imageResponses.forEach((response) => {
      const item = map[response.participant_id];
      if (item) item.imageResponses.push(response);
    });

    return Object.values(map).map((item) => {
      const totalReaction = item.imageResponses.reduce((sum, row) => sum + Number(row.reaction_time_ms || 0), 0);
      const averageReaction = item.imageResponses.length ? Math.round(totalReaction / item.imageResponses.length) : 0;
      const nationalPre = score(item.scales.national_pre);
      const nationalPost = score(item.scales.national_post);
      const resiliencePre = score(item.scales.resilience_pre);
      const resiliencePost = score(item.scales.resilience_post);

      item.scores = {
        national_pre_score: nationalPre,
        national_post_score: nationalPost,
        national_score_change: diff(nationalPost, nationalPre),
        resilience_pre_score: resiliencePre,
        resilience_post_score: resiliencePost,
        resilience_score_change: diff(resiliencePost, resiliencePre),
        total_reaction_time: totalReaction,
        average_reaction_time: averageReaction
      };
      item.imageResponses.sort((a, b) => Number(a.site_id) - Number(b.site_id));
      return item;
    });
  }

  function score(scale) {
    return scale && scale.total_score !== null && scale.total_score !== undefined ? Number(scale.total_score) : null;
  }

  function diff(after, before) {
    return after !== null && before !== null ? after - before : null;
  }

  function populateFilters() {
    fillSelect("filter-gender", unique("gender"));
    fillSelect("filter-residence", unique("residence_side"));
    fillSelect("filter-qualification", unique("academic_qualification"));
    fillSelect("filter-economic", unique("economic_level"));
  }

  function unique(field) {
    return [...new Set(state.combined.map((item) => item.demo[field]).filter(Boolean))].sort();
  }

  function fillSelect(id, values) {
    const select = document.getElementById(id);
    const current = select.value;
    select.innerHTML = `<option value="">الكل</option>${values.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("")}`;
    select.value = values.includes(current) ? current : "";
  }

  function applyFilters() {
    const search = document.getElementById("search-input").value.trim().toLowerCase();
    const gender = document.getElementById("filter-gender").value;
    const residence = document.getElementById("filter-residence").value;
    const qualification = document.getElementById("filter-qualification").value;
    const economic = document.getElementById("filter-economic").value;

    state.filtered = state.combined.filter((item) => {
      const demo = item.demo;
      const searchMatch = !search ||
        (demo.name || "").toLowerCase().includes(search) ||
        item.participant_id.toLowerCase().includes(search);
      return searchMatch &&
        (!gender || demo.gender === gender) &&
        (!residence || demo.residence_side === residence) &&
        (!qualification || demo.academic_qualification === qualification) &&
        (!economic || demo.economic_level === economic);
    });

    renderSummary();
    renderParticipants(state.filtered);
  }

  function renderSummary() {
    const participants = state.filtered.length;
    const imageCount = state.filtered.reduce((sum, item) => sum + item.imageResponses.length, 0);
    summaryGrid.innerHTML = [
      ["عدد المشاركين", participants],
      ["عدد استجابات الصور", imageCount],
      ["متوسط الهوية الوطنية قبل", average("national_pre_score")],
      ["متوسط الهوية الوطنية بعد", average("national_post_score")],
      ["متوسط الصمود النفسي قبل", average("resilience_pre_score")],
      ["متوسط الصمود النفسي بعد", average("resilience_post_score")]
    ].map(([label, value]) => `
      <article class="summary-card">
        <span>${label}</span>
        <strong>${formatValue(value)}</strong>
      </article>
    `).join("");
  }

  function average(scoreKey) {
    const values = state.filtered.map((item) => item.scores[scoreKey]).filter((value) => value !== null);
    if (!values.length) return null;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }

  function renderParticipants(items) {
    if (!items.length) {
      participantsList.innerHTML = `<div class="panel empty-state">لا توجد نتائج مطابقة.</div>`;
      return;
    }

    participantsList.innerHTML = items.map((item) => {
      const demo = item.demo;
      return `
        <details class="panel participant-card">
          <summary>
            <div class="participant-head">
              <div>
                <div class="participant-id">${shortId(item.participant_id)}</div>
                <h2 class="participant-name">${escapeHtml(demo.name || "بدون اسم")}</h2>
                <div class="participant-id">${formatDate(demo.created_at)}</div>
              </div>
              <div class="participant-meta">
                ${meta("الفئة العمرية", demo.age_range)}
                ${meta("الجنس", demo.gender)}
                ${meta("التحصيل الدراسي", demo.academic_qualification)}
                ${meta("المرحلة الدراسية", demo.study_stage)}
                ${meta("التخصص", demo.specialization)}
                ${meta("جانب السكن", demo.residence_side)}
                ${meta("طبيعة العمل", demo.economic_level)}
                ${meta("الديانة", demo.religion)}
                ${meta("الحالة الاجتماعية", demo.marital_status)}
                ${meta("المهنة", demo.profession)}
              </div>
              <div class="score-grid">
                ${scoreItem("الهوية قبل", item.scores.national_pre_score)}
                ${scoreItem("الهوية بعد", item.scores.national_post_score)}
                ${scoreItem("تغير الهوية", item.scores.national_score_change, true)}
                ${scoreItem("الصمود قبل", item.scores.resilience_pre_score)}
                ${scoreItem("الصمود بعد", item.scores.resilience_post_score)}
                ${scoreItem("تغير الصمود", item.scores.resilience_score_change, true)}
                ${scoreItem("زمن الاستجابة الكلي", item.scores.total_reaction_time)}
                ${scoreItem("متوسط زمن الاستجابة", item.scores.average_reaction_time)}
              </div>
            </div>
          </summary>
          <div class="site-responses">
            <h2>استجابات المواقع</h2>
            ${renderSiteTable(item.imageResponses)}
          </div>
        </details>
      `;
    }).join("");
  }

  function renderSiteTable(rows) {
    if (!rows.length) return `<div class="empty-state">لا توجد استجابات مواقع لهذا المشارك.</div>`;
    return `
      <div class="table-wrap">
        <table class="sites-table">
          <thead>
            <tr>
              <th>رقم الموقع</th>
              <th>اسم الموقع</th>
              <th>الأمل</th>
              <th>الانتماء</th>
              <th>الفخر</th>
              <th>السعادة</th>
              <th>الحزن</th>
              <th>الغضب</th>
              <th>الخوف</th>
              <th>زمن الاستجابة</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${formatValue(row.site_id)}</td>
                <td>${escapeHtml(row.site_name || "")}</td>
                <td>${formatValue(row.hope)}</td>
                <td>${formatValue(row.belonging)}</td>
                <td>${formatValue(row.pride)}</td>
                <td>${formatValue(row.happiness)}</td>
                <td>${formatValue(row.sadness)}</td>
                <td>${formatValue(row.anger)}</td>
                <td>${formatValue(row.fear)}</td>
                <td>${formatValue(row.reaction_time_ms)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function meta(label, value) {
    return `<div class="meta-item"><span>${label}</span><strong>${escapeHtml(value || "غير متوفر")}</strong></div>`;
  }

  function scoreItem(label, value, isChange = false) {
    const changeClass = isChange && Number(value) > 0 ? " change-positive" : isChange && Number(value) < 0 ? " change-negative" : "";
    return `<div class="score-item${changeClass}"><span>${label}</span><strong>${formatValue(value)}</strong></div>`;
  }

  function exportSummaryCsv() {
    const rows = state.filtered.map((item) => ({
      participant_id: item.participant_id,
      name: item.demo.name,
      age_range: item.demo.age_range,
      gender: item.demo.gender,
      academic_qualification: item.demo.academic_qualification,
      study_stage: item.demo.study_stage,
      specialization: item.demo.specialization,
      residence_side: item.demo.residence_side,
      economic_level: item.demo.economic_level,
      religion: item.demo.religion,
      marital_status: item.demo.marital_status,
      profession: item.demo.profession,
      created_at: item.demo.created_at,
      ...item.scores
    }));
    downloadText("mosul_participants_summary.csv", toCsv(rows), "text/csv;charset=utf-8");
  }

  function exportFullCsv() {
    const rows = [];
    state.filtered.forEach((item) => {
      const base = {
        participant_id: item.participant_id,
        name: item.demo.name,
        age_range: item.demo.age_range,
        gender: item.demo.gender,
        academic_qualification: item.demo.academic_qualification,
        study_stage: item.demo.study_stage,
        specialization: item.demo.specialization,
        residence_side: item.demo.residence_side,
        economic_level: item.demo.economic_level,
        religion: item.demo.religion,
        marital_status: item.demo.marital_status,
        profession: item.demo.profession,
        created_at: item.demo.created_at,
        ...item.scores
      };
      if (!item.imageResponses.length) rows.push(base);
      item.imageResponses.forEach((response) => rows.push({ ...base, ...response }));
    });
    downloadText("mosul_full_dataset.csv", toCsv(rows), "text/csv;charset=utf-8");
  }

  function exportFullJson() {
    downloadText("mosul_full_dataset.json", JSON.stringify(state.filtered, null, 2), "application/json;charset=utf-8");
  }

  function toCsv(rows) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    rows.forEach((row) => {
      lines.push(headers.map((header) => csvCell(row[header])).join(","));
    });
    return `\uFEFF${lines.join("\n")}`;
  }

  function csvCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function showStatus(message, type) {
    statusEl.innerHTML = `<p class="status-${type}">${message}</p>`;
  }

  function formatValue(value) {
    return value === null || value === undefined || value === "" ? "—" : value;
  }

  function shortId(id) {
    return id ? `${id.slice(0, 8)}…${id.slice(-4)}` : "—";
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();

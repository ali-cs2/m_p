(function () {
  const CONFIG = window.MOSUL_MEMORY_CONFIG || {};
  const SUPABASE_URL = CONFIG.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY || "";
  const isSupabaseEnabled = Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.includes("supabase.co") &&
    SUPABASE_ANON_KEY.length > 20 &&
    window.supabase
  );
  let client = null;

  function warnLocalOnly() {
    console.warn("تحذير: لم يتم تفعيل إعدادات Supabase بشكل صحيح. ستعمل المنصة بالحفظ المحلي فقط.");
  }

  function isConfigured() {
    return isSupabaseEnabled;
  }

  function getClient() {
    if (!isConfigured()) {
      warnLocalOnly();
      return null;
    }
    if (!client) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  console.log("Mosul Memory Supabase config status:", {
    hasConfig: Boolean(window.MOSUL_MEMORY_CONFIG),
    hasUrl: Boolean(SUPABASE_URL),
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
    hasSupabaseLibrary: Boolean(window.supabase),
    enabled: Boolean(isSupabaseEnabled)
  });

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
      (Number(char) ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16)
    );
  }

  function scaleRow(participantId, scaleType, timing, scale) {
    const row = {
      participant_id: participantId,
      scale_type: scaleType,
      timing,
      total_score: scale.total_score
    };
    scale.answers.forEach((value, index) => {
      row[`q${String(index + 1).padStart(2, "0")}`] = value;
    });
    return row;
  }

  async function saveStudyData(payload) {
    const db = getClient();
    if (!db) {
      throw new Error("لم يتم تفعيل إعدادات Supabase.");
    }

    const participantId = newId();
    const participant = payload.participant;

    const participantRow = {
      id: participantId,
      name: participant.name,
      age_range: participant.age_range,
      gender: participant.gender,
      academic_qualification: participant.academic_qualification,
      study_stage: participant.study_stage,
      specialization: participant.specialization,
      residence_side: participant.residence,
      economic_level: participant.economic_level,
      religion: participant.religion,
      marital_status: participant.marital_status,
      profession: participant.profession
    };

    const scales = [
      scaleRow(participantId, "national_pre", "pre", payload.scales.national_pre),
      scaleRow(participantId, "resilience_pre", "pre", payload.scales.resilience_pre),
      scaleRow(participantId, "national_post", "post", payload.scales.national_post),
      scaleRow(participantId, "resilience_post", "post", payload.scales.resilience_post)
    ];

    const imageRows = payload.image_responses.map((response) => ({
      participant_id: participantId,
      site_id: response.site_id,
      site_name: response.site_name,
      hope: response.hope,
      belonging: response.belonging,
      pride: response.pride,
      happiness: response.happiness,
      sadness: response.sadness,
      anger: response.anger,
      fear: response.fear,
      reaction_time_ms: response.reaction_time_ms
    }));

    const participantResult = await db.from("participants").insert(participantRow);
    if (participantResult.error) {
      console.error("خطأ Supabase أثناء حفظ بيانات المشارك:", participantResult.error);
      throw participantResult.error;
    }

    const scalesResult = await db.from("scales").insert(scales);
    if (scalesResult.error) {
      console.error("خطأ Supabase أثناء حفظ المقاييس:", scalesResult.error);
      throw scalesResult.error;
    }

    const imagesResult = await db.from("image_responses").insert(imageRows);
    if (imagesResult.error) {
      console.error("خطأ Supabase أثناء حفظ استجابات الصور:", imagesResult.error);
      throw imagesResult.error;
    }

    return { participant_id: participantId };
  }

  window.MosulMemorySupabase = {
    isConfigured,
    saveStudyData
  };

  if (!isConfigured()) {
    warnLocalOnly();
  }
})();

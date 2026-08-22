// ======================
// DA United – Predictions (Supabase)
// ======================

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebar-overlay");
const btnOpen = document.getElementById("btn-open-sidebar");
const btnClose = document.getElementById("btn-close-sidebar");

function openSidebar() {
  if (sidebar) sidebar.classList.add("open");
  if (overlay) overlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.add("hidden");
  document.body.style.overflow = "";
}

if (btnOpen) btnOpen.addEventListener("click", openSidebar);
if (btnClose) btnClose.addEventListener("click", closeSidebar);
if (overlay) overlay.addEventListener("click", closeSidebar);

document.querySelectorAll("#sidebar a").forEach(link => {
  link.addEventListener("click", () => {
    if (window.innerWidth < 1024) closeSidebar();
  });
});

const emptyState = document.getElementById("prediction-empty");
const formWrapper = document.getElementById("prediction-form-wrapper");
const btnLock = document.getElementById("btn-lock-prediction");
const feedback = document.getElementById("prediction-feedback");

let currentFixture = null;

function showFeedback(success, message) {
  feedback.classList.remove("hidden");
  if (success) {
    feedback.className = "mt-5 p-4 rounded-xl text-sm bg-da-green/15 text-da-green border border-da-green/30";
  } else {
    feedback.className = "mt-5 p-4 rounded-xl text-sm bg-red-500/15 text-red-400 border border-red-500/30";
  }
  feedback.textContent = message;
}

function getDeviceId() {
  let id = localStorage.getItem("da_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("da_device_id", id);
  }
  return id;
}

async function loadPlayersIntoSelects() {
  const scorerSelect = document.getElementById("first-scorer");
  const motmSelect = document.getElementById("motm");
  if (!scorerSelect || !motmSelect || !window.supabaseClient) return;

  const { data: players } = await window.supabaseClient
    .from("players")
    .select("name")
    .order("name", { ascending: true });

  const names = (players || []).map(p => p.name).filter(Boolean);

  // Fallback squad if no players in DB yet
  const fallback = ["Baseboy", "Ebube", "Victor", "Nmesoma", "Emma", "Zubby", "Ini"];
  const list = names.length ? names : fallback;

  const options = `<option value="">Select a player</option>` +
    list.map(n => `<option value="${n}">${n}</option>`).join("");

  scorerSelect.innerHTML = options;
  motmSelect.innerHTML = options;
}

async function loadFixture() {
  if (!window.supabaseClient) return;

  try {
    const { data: fixture, error } = await window.supabaseClient
      .from("fixtures")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !fixture) {
      emptyState.classList.remove("hidden");
      formWrapper.classList.add("hidden");
      currentFixture = null;
      return;
    }

    currentFixture = fixture;

    const home = fixture.home || "DA United";
    const away = fixture.away || "Opponent";
    document.getElementById("pred-match-title").textContent = `${home} vs ${away}`;
    document.getElementById("pred-match-meta").textContent =
      [fixture.date, fixture.time, fixture.venue, fixture.competition]
        .filter(Boolean)
        .join(" · ");

    emptyState.classList.add("hidden");
    formWrapper.classList.remove("hidden");

    await loadPlayersIntoSelects();

    // Check if this device already locked a prediction for this fixture
    const deviceId = getDeviceId();
    const { data: existing } = await window.supabaseClient
      .from("predictions")
      .select("*")
      .eq("fixture_id", fixture.id)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (existing) {
      document.getElementById("score-home").value = existing.score_home ?? 0;
      document.getElementById("score-away").value = existing.score_away ?? 0;
      if (existing.first_scorer) document.getElementById("first-scorer").value = existing.first_scorer;
      if (existing.motm) document.getElementById("motm").value = existing.motm;

      btnLock.disabled = true;
      btnLock.textContent = "Prediction Locked";
      btnLock.classList.add("opacity-60", "cursor-not-allowed");
      showFeedback(true, `You already locked in ${existing.score_home}-${existing.score_away}. Good luck!`);
    } else {
      btnLock.disabled = false;
      btnLock.textContent = "Lock in prediction";
      btnLock.classList.remove("opacity-60", "cursor-not-allowed");
      feedback.classList.add("hidden");
    }
  } catch (e) {
    console.error("Predictions load error", e);
  }
}

if (btnLock) {
  btnLock.addEventListener("click", async () => {
    if (!currentFixture || !window.supabaseClient) return;

    const home = document.getElementById("score-home").value;
    const away = document.getElementById("score-away").value;
    const scorer = document.getElementById("first-scorer").value;
    const motm = document.getElementById("motm").value;

    if (home === "" || away === "") {
      showFeedback(false, "Please enter a full scoreline.");
      return;
    }

    const deviceId = getDeviceId();

    try {
      const { error } = await window.supabaseClient.from("predictions").upsert({
        fixture_id: currentFixture.id,
        device_id: deviceId,
        score_home: Number(home),
        score_away: Number(away),
        first_scorer: scorer || null,
        motm: motm || null,
        locked_at: new Date().toISOString()
      }, { onConflict: "fixture_id,device_id" });

      if (error) {
        // Fallback if unique constraint not set: just insert
        const { error: err2 } = await window.supabaseClient.from("predictions").insert({
          fixture_id: currentFixture.id,
          device_id: deviceId,
          score_home: Number(home),
          score_away: Number(away),
          first_scorer: scorer || null,
          motm: motm || null,
          locked_at: new Date().toISOString()
        });
        if (err2) {
          console.error(err2);
          showFeedback(false, "Could not save. Try again.");
          return;
        }
      }

      showFeedback(true, `Prediction locked in! You predicted ${home}-${away}. Good luck, supporter.`);
      btnLock.disabled = true;
      btnLock.textContent = "Prediction Locked";
      btnLock.classList.add("opacity-60", "cursor-not-allowed");
    } catch (e) {
      console.error(e);
      showFeedback(false, "Could not save. Try again.");
    }
  });
}

function initPredictions() {
  if (window.supabaseClient) {
    loadFixture();
    window.supabaseClient
      .channel("predictions-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "fixtures" }, () => loadFixture())
      .subscribe();
  } else {
    setTimeout(initPredictions, 100);
  }
}

initPredictions();
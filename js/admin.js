// ======================
// DA United – Admin Panel (Full CRUD + Live Match Events + Push)
// ======================

const ADMIN_PASSWORD = "123789";

const authGate = document.getElementById("auth-gate");
const adminDash = document.getElementById("admin-dashboard");
const passwordInput = document.getElementById("admin-password");
const btnLogin = document.getElementById("btn-login");
const authError = document.getElementById("auth-error");
const btnLogout = document.getElementById("btn-logout");

if (sessionStorage.getItem("da_admin_logged_in") === "true") {
  authGate?.classList.add("hidden");
  adminDash?.classList.remove("hidden");
}

btnLogin?.addEventListener("click", () => {
  if (passwordInput.value === ADMIN_PASSWORD) {
    sessionStorage.setItem("da_admin_logged_in", "true");
    authGate.classList.add("hidden");
    adminDash.classList.remove("hidden");
    loadAllLists();
  } else {
    authError?.classList.remove("hidden");
  }
});

passwordInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnLogin.click();
});

btnLogout?.addEventListener("click", () => {
  sessionStorage.removeItem("da_admin_logged_in");
  location.reload();
});

// Tabs
const tabs = document.querySelectorAll(".admin-tab");
const panels = document.querySelectorAll(".admin-panel");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => {
      t.classList.remove("active", "bg-da-green", "text-black");
      t.classList.add("bg-white/5", "text-gray-300");
    });
    tab.classList.add("active", "bg-da-green", "text-black");
    tab.classList.remove("bg-white/5", "text-gray-300");

    panels.forEach(p => p.classList.add("hidden"));
    document.getElementById(`tab-${tab.dataset.tab}`)?.classList.remove("hidden");
  });
});

function showToast(msg = "Saved successfully") {
  const toast = document.getElementById("admin-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== SEND PUSH NOTIFICATION =====
async function sendPushNotification(title, body, url = "/dashboard.html") {
  try {
    const res = await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url })
    });

    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      console.error(`Push endpoint returned non-JSON (status ${res.status}):`, raw);
      return { ok: false, status: res.status, raw };
    }

    if (!res.ok) {
      console.error(`Push endpoint error (status ${res.status}):`, data);
    } else {
      console.log("Push result:", data);
    }
    return data;
  } catch (err) {
    console.error("Failed to send push:", err);
  }
}

// ===================== HOME/AWAY LABELING =====================
// DA United's own venue field decides who is "Home" and who is "Away"
// in the copy shown to supporters ("Home scores" / "Away gets a booking").
function sideLabels(venue) {
  const daIsHome = (venue || "Home") !== "Away";
  return {
    da: daIsHome ? "Home" : "Away",
    opp: daIsHome ? "Away" : "Home"
  };
}

function labelForSide(eventSide, venue) {
  const labels = sideLabels(venue);
  return eventSide === "Opponent" ? labels.opp : labels.da;
}

// ===================== MATCH EVENT → NOTIFICATION COPY =====================
function buildEventNotification(e, opponent, scoreHome, scoreAway, venue) {
  const min = e.minute ? `${e.minute}'` : "";
  const player = (e.player || "").trim();
  const detail = (e.detail || "").trim();
  const scoreLine = `DA United ${scoreHome ?? 0} - ${scoreAway ?? 0} ${opponent || "Opponent"}`.trim();
  const minSuffix = min ? ` ${min}` : "";
  const detailSuffix = detail ? ` (${detail})` : "";
  const side = labelForSide(e.side, venue);

  switch (e.type) {
    case "Kick Off":
      return { title: "🟢 Kick Off!", body: `${scoreLine} is underway.` };

    case "Goal":
      return {
        title: "⚽ GOALLLLLLLLL!",
        body: `${player || "DA United"} scores${minSuffix}${detailSuffix}! ${side} scores. ${scoreLine}`
      };

    case "Golazo":
      return {
        title: "🚀 A STUNNING GOAL!",
        body: `${player || "DA United"} with an absolute screamer${minSuffix}${detailSuffix}! ${side} scores. ${scoreLine}`
      };

    case "Own Goal":
      return {
        title: "😬 Own Goal",
        body: `${player ? player + " (o.g.)" : "Own goal"}${minSuffix}${detailSuffix} — ${scoreLine}`
      };

    case "Free Kick Goal":
      return {
        title: "🎯 A STUNNING FREE KICK!",
        body: `${player || "DA United"} curls it in${minSuffix}! ${side} scores. ${scoreLine}`
      };

    case "Penalty Scored":
      return {
        title: "✅ Penalty Scored!",
        body: `${player || "DA United"} sends the keeper the wrong way${minSuffix}. ${side} scores. ${scoreLine}`
      };

    case "Penalty Missed":
      return {
        title: "❌ Penalty Missed",
        body: `${player || "DA United"} can't convert${minSuffix}.`
      };

    case "Possible Penalty":
      return {
        title: "🤔 What can this be?",
        body: `Shout for a penalty${minSuffix} — referee taking a look.`
      };

    case "Possible Free Kick":
      return {
        title: "👀 Possible Free Kick",
        body: `Dangerous area${minSuffix} — foul under review.`
      };

    case "Assist":
      return {
        title: "🅰️ Assist",
        body: `${player || "DA United"} with the assist${minSuffix}.`
      };

    case "Yellow Card":
      return {
        title: "🟨 Yellow Card",
        body: `${player || "A player"} is booked${minSuffix}. ${side} gets a booking.`
      };

    case "Red Card":
      return {
        title: "🟥 RED CARD!",
        body: `${player || "A player"} is sent off${minSuffix}! ${side} down to 10 men.`
      };

    case "Substitution":
      return {
        title: "🔄 Substitution",
        body: `${player ? player : "Change made"}${minSuffix}${detailSuffix}`
      };

    case "VAR Check":
      return {
        title: "📺 What can this be?",
        body: `Referee reviewing the incident${minSuffix}...`
      };

    case "Goal Disallowed":
      return {
        title: "❌ Goal Disallowed",
        body: `VAR rules the goal out${minSuffix}${detailSuffix}.`
      };

    case "Offside":
      return {
        title: "🚩 Offside",
        body: `${player ? player + " flagged offside" : "Offside called"}${minSuffix}.`
      };

    case "Injury":
      return {
        title: "🩹 Injury Concern",
        body: `${player || "A player"} down injured${minSuffix}.`
      };

    case "HT":
      return { title: "⏸️ Half Time", body: scoreLine };

    case "FT":
      return { title: "🏁 Full Time", body: `${scoreLine} — that's full time.` };

    case "Custom":
      return { title: "📢 DA United", body: detail || player || "Live update" };

    default:
      return {
        title: "DA United",
        body: `${e.type}${player ? " — " + player : ""}${minSuffix}${detailSuffix}`
      };
  }
}

// Turns the match status dropdown into a push notification.
function buildStatusNotification(status, scoreHome, scoreAway, opponent) {
  const scoreLine = `DA United ${scoreHome ?? 0} - ${scoreAway ?? 0} ${opponent || "Opponent"}`.trim();

  switch (status) {
    case "Scheduled":
      return { title: "📅 Match Scheduled", body: `DA United vs ${opponent || "Opponent"}` };
    case "Live":
      return { title: "🔴 WE ARE LIVE!", body: `Game underway — ${scoreLine}` };
    case "HT":
      return { title: "⏸️ Half Time", body: scoreLine };
    case "FT":
      return { title: "🏁 Full Time", body: `${scoreLine} — full time.` };
    case "AET":
      return { title: "⏱️ After Extra Time", body: scoreLine };
    case "Penalties":
      return { title: "🎯 Penalty Shootout!", body: scoreLine };
    case "Postponed":
      return { title: "⏳ Match Interrupted", body: `DA United vs ${opponent || "Opponent"} — game is paused.` };
    case "Cancelled":
      return { title: "🚫 Match Cancelled", body: `DA United vs ${opponent || "Opponent"} has been cancelled.` };
    default:
      return { title: "Match Update", body: scoreLine };
  }
}

// ===================== MATCH EVENTS =====================
let currentEvents = [];

function renderEventsPreview() {
  const box = document.getElementById("events-preview");
  if (!box) return;

  if (currentEvents.length === 0) {
    box.innerHTML = `<span class="text-da-muted text-xs">No events added yet</span>`;
    return;
  }

  box.innerHTML = currentEvents.map((e, i) => `
    <div class="flex items-center justify-between bg-da-dark/50 rounded-lg px-3 py-1.5">
      <span>
        <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${e.side === "Opponent" ? "bg-red-500/20 text-red-400" : "bg-da-green/20 text-da-green"}">${e.side === "Opponent" ? "OPP" : "DA"}</span>
        ${e.minute || "—"}' · <strong>${e.type}</strong> ${e.player ? "– " + e.player : ""} ${e.detail ? `<em class="text-da-muted">(${e.detail})</em>` : ""}
      </span>
      <button type="button" data-idx="${i}" class="text-red-400 text-xs remove-event">✕</button>
    </div>
  `).join("");

  box.querySelectorAll(".remove-event").forEach(btn => {
    btn.addEventListener("click", async () => {
      currentEvents.splice(Number(btn.dataset.idx), 1);
      renderEventsPreview();
      await persistMatchState();
      loadMatches();
    });
  });
}

// ===================== AUTO-SAVE MATCH STATE =====================
// Every event/update saves straight to Supabase so the live banner on the
// dashboard updates immediately, without needing the big "Save Match" click.
let lastMatchSaveError = null;

async function persistMatchState() {
  lastMatchSaveError = null;
  const idField = document.getElementById("match-edit-id");
  const id = idField.value;
  const scoreHome = parseInt(document.getElementById("match-score-home").value) || 0;
  const scoreAway = parseInt(document.getElementById("match-score-away").value) || 0;
  const opponent = document.getElementById("match-opponent").value;
  const status = document.getElementById("match-status").value || "Live";

  const baseData = {
    opponent,
    score_home: scoreHome,
    score_away: scoreAway,
    venue: document.getElementById("match-venue").value,
    competition: document.getElementById("match-comp").value || "Club Friendlies",
    status,
    events: currentEvents,
    scorers: currentEvents
      .filter(e => ["Goal", "Own Goal", "Golazo", "Free Kick Goal", "Penalty Scored"].includes(e.type))
      .map(e => `${e.player} ${e.minute}`)
      .join("\n")
  };

  async function attemptWrite(includeUpdatedAt) {
    const data = includeUpdatedAt ? { ...baseData, updated_at: new Date().toISOString() } : { ...baseData };
    if (id) {
      return window.supabaseClient.from("matches").update(data).eq("id", id);
    }
    return window.supabaseClient.from("matches").insert([data]).select();
  }

  let { data: result, error } = await attemptWrite(true);

  // If the matches table doesn't have an `updated_at` column yet, retry
  // without it rather than failing outright. Live-match ordering on the
  // dashboard needs that column though — see matches-table-fix.sql.
  const errText = error ? JSON.stringify(error) : "";
  if (error && /updated_at/i.test(errText)) {
    console.warn("`updated_at` column missing on the matches table — saving without it. Run matches-table-fix.sql in Supabase to enable full live-match tracking.");
    ({ data: result, error } = await attemptWrite(false));
  }

  if (error) {
    console.error("Match save error:", error);
    lastMatchSaveError = error;
    return id || null;
  }

  if (id) return id;

  const newId = result && result[0] && result[0].id;
  if (newId) idField.value = newId;
  return newId || null;
}

document.getElementById("btn-add-event")?.addEventListener("click", async () => {
  const type = document.getElementById("event-type").value;
  const side = document.getElementById("event-side")?.value || "DA United";
  const player = document.getElementById("event-player").value.trim();
  const minute = document.getElementById("event-minute").value.trim();
  const detailInput = document.getElementById("event-detail");
  const detail = detailInput ? detailInput.value.trim() : "";

  const newEvent = { type, side, player, minute, detail };
  currentEvents.push(newEvent);

  document.getElementById("event-player").value = "";
  document.getElementById("event-minute").value = "";
  if (detailInput) detailInput.value = "";
  renderEventsPreview();

  // Save immediately so the live banner reflects this the instant it's added
  await persistMatchState();
  loadMatches();

  // Send a live push for this event right away, unless the admin unchecked it
  const notifyCheckbox = document.getElementById("event-notify");
  if (!notifyCheckbox || notifyCheckbox.checked) {
    const opponent = document.getElementById("match-opponent")?.value || "";
    const scoreHome = document.getElementById("match-score-home")?.value || 0;
    const scoreAway = document.getElementById("match-score-away")?.value || 0;
    const venue = document.getElementById("match-venue")?.value || "Home";
    const { title, body } = buildEventNotification(newEvent, opponent, scoreHome, scoreAway, venue);
    await sendPushNotification(title, body, "/matches.html");
  }
});

// Free-text custom live update (e.g. "A stunning free kick")
document.getElementById("btn-push-custom")?.addEventListener("click", async () => {
  const input = document.getElementById("custom-update-text");
  const text = input?.value.trim();
  if (!text) return;

  const newEvent = { type: "Custom", side: "DA United", player: "", minute: "", detail: text };
  currentEvents.push(newEvent);
  renderEventsPreview();

  await persistMatchState();
  loadMatches();

  await sendPushNotification("📢 DA United", text, "/matches.html");

  input.value = "";
});

// ===================== FIXTURES =====================
async function loadFixtures() {
  const list = document.getElementById("fixtures-list");
  if (!list || !window.supabaseClient) return;

  const { data } = await window.supabaseClient
    .from("fixtures")
    .select("*")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-da-muted text-sm">No fixtures yet.</p>`;
    return;
  }

  list.innerHTML = data.map(f => `
    <div class="bg-da-card border border-da-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div class="font-semibold">${f.home || "DA United"} vs ${f.away || "Opponent"}</div>
        <div class="text-sm text-da-muted">${f.date || ""} · ${f.time || ""} · ${f.venue || ""}</div>
        <div class="text-xs text-da-green mt-1">${f.competition || ""}</div>
      </div>
      <div class="flex gap-2">
        <button data-id="${f.id}" class="edit-fixture text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15">Edit</button>
        <button data-id="${f.id}" class="delete-fixture text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".edit-fixture").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = data.find(x => String(x.id) === btn.dataset.id);
      if (!item) return;
      document.getElementById("fixture-edit-id").value = item.id;
      document.getElementById("fix-home").value = item.home || "DA United";
      document.getElementById("fix-away").value = item.away || "";
      document.getElementById("fix-date").value = item.date || "";
      document.getElementById("fix-time").value = item.time || "";
      document.getElementById("fix-venue").value = item.venue || "";
      document.getElementById("fix-comp").value = item.competition || "CLUB FRIENDLIES";
      document.getElementById("fixture-form-title").textContent = "Edit Fixture";
      document.getElementById("btn-cancel-fixture").classList.remove("hidden");
    });
  });

  list.querySelectorAll(".delete-fixture").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this fixture?")) return;
      await window.supabaseClient.from("fixtures").delete().eq("id", btn.dataset.id);
      showToast("Fixture deleted");
      loadFixtures();
    });
  });
}

document.getElementById("btn-save-fixture")?.addEventListener("click", async () => {
  const id = document.getElementById("fixture-edit-id").value;
  const data = {
    home: document.getElementById("fix-home").value || "DA United",
    away: document.getElementById("fix-away").value,
    date: document.getElementById("fix-date").value,
    time: document.getElementById("fix-time").value,
    venue: document.getElementById("fix-venue").value,
    competition: document.getElementById("fix-comp").value || "CLUB FRIENDLIES",
    updated_at: new Date().toISOString()
  };

  let error;
  if (id) {
    ({ error } = await window.supabaseClient.from("fixtures").update(data).eq("id", id));
  } else {
    ({ error } = await window.supabaseClient.from("fixtures").insert([data]));
  }

  if (error) {
    console.error(error);
    alert("Error saving fixture");
  } else {
    showToast(id ? "Fixture updated" : "Fixture saved");

    await sendPushNotification(
      "New Fixture",
      `${data.home} vs ${data.away || "Opponent"}`,
      "/fixtures.html"
    );

    resetFixtureForm();
    loadFixtures();
  }
});

document.getElementById("btn-cancel-fixture")?.addEventListener("click", resetFixtureForm);

function resetFixtureForm() {
  document.getElementById("fixture-edit-id").value = "";
  document.getElementById("fix-home").value = "DA United";
  document.getElementById("fix-away").value = "";
  document.getElementById("fix-date").value = "";
  document.getElementById("fix-time").value = "";
  document.getElementById("fix-venue").value = "";
  document.getElementById("fix-comp").value = "CLUB FRIENDLIES";
  document.getElementById("fixture-form-title").textContent = "Add / Update Next Fixture";
  document.getElementById("btn-cancel-fixture").classList.add("hidden");
}

// ===================== MATCHES =====================
async function loadMatches() {
  const list = document.getElementById("matches-list");
  if (!list || !window.supabaseClient) return;

  const { data } = await window.supabaseClient
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-da-muted text-sm">No matches yet.</p>`;
    return;
  }

  list.innerHTML = data.map(m => {
    const events = m.events ? (typeof m.events === "string" ? JSON.parse(m.events) : m.events) : [];
    const eventsHtml = events.length
      ? `<div class="text-xs text-da-muted mt-1">${events.map(e => `${e.minute || ""}' ${e.type} ${e.player || ""}${e.detail ? ` (${e.detail})` : ""}`).join(" · ")}</div>`
      : "";

    return `
      <div class="bg-da-card border border-da-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="font-semibold">DA United ${m.score_home ?? 0} - ${m.score_away ?? 0} ${m.opponent || ""}</div>
          <div class="text-sm text-da-muted">${m.venue || ""} · ${m.competition || ""} · ${m.status || ""}</div>
          ${eventsHtml}
        </div>
        <div class="flex gap-2">
          <button data-id="${m.id}" class="edit-match text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15">Edit</button>
          <button data-id="${m.id}" class="delete-match text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".edit-match").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = data.find(x => String(x.id) === btn.dataset.id);
      if (!item) return;
      document.getElementById("match-edit-id").value = item.id;
      document.getElementById("match-opponent").value = item.opponent || "";
      document.getElementById("match-score-home").value = item.score_home ?? 0;
      document.getElementById("match-score-away").value = item.score_away ?? 0;
      document.getElementById("match-venue").value = item.venue || "Home";
      document.getElementById("match-comp").value = item.competition || "Club Friendlies";
      document.getElementById("match-status").value = item.status || "FT";
      currentEvents = item.events ? (typeof item.events === "string" ? JSON.parse(item.events) : item.events) : [];
      renderEventsPreview();
      document.getElementById("match-form-title").textContent = "Edit Match";
      document.getElementById("btn-cancel-match").classList.remove("hidden");
    });
  });

  list.querySelectorAll(".delete-match").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this match?")) return;
      await window.supabaseClient.from("matches").delete().eq("id", btn.dataset.id);
      showToast("Match deleted");
      loadMatches();
    });
  });
}

document.getElementById("btn-save-match")?.addEventListener("click", async () => {
  const scoreHome = parseInt(document.getElementById("match-score-home").value) || 0;
  const scoreAway = parseInt(document.getElementById("match-score-away").value) || 0;
  const opponent = document.getElementById("match-opponent").value;
  const status = document.getElementById("match-status").value || "FT";

  const id = await persistMatchState();

  if (!id) {
    const err = lastMatchSaveError;
    const details = err ? (err.message || err.details || err.hint || JSON.stringify(err)) : "Unknown error";
    alert("Error saving match:\n\n" + details);
    return;
  }

  showToast("Match saved");

  const { title, body } = buildStatusNotification(status, scoreHome, scoreAway, opponent);
  await sendPushNotification(title, body, "/matches.html");

  // IMPORTANT: while the match is still Live or at Half Time, keep the form
  // bound to this same match (don't clear match-edit-id). Otherwise the next
  // event you log creates a brand new orphan match instead of updating this
  // one — which is why goals/cards were disappearing before.
  if (status === "Live" || status === "HT") {
    document.getElementById("match-form-title").textContent =
      status === "Live" ? "Editing Live Match" : "Editing Match — Half Time";
    document.getElementById("btn-cancel-match").classList.remove("hidden");
  } else {
    resetMatchForm();
  }

  loadMatches();
});

document.getElementById("btn-cancel-match")?.addEventListener("click", resetMatchForm);

function resetMatchForm() {
  document.getElementById("match-edit-id").value = "";
  document.getElementById("match-opponent").value = "";
  document.getElementById("match-score-home").value = "";
  document.getElementById("match-score-away").value = "";
  document.getElementById("match-venue").value = "Home";
  document.getElementById("match-comp").value = "Club Friendlies";
  document.getElementById("match-status").value = "FT";
  currentEvents = [];
  renderEventsPreview();
  document.getElementById("match-form-title").textContent = "Add Match Result";
  document.getElementById("btn-cancel-match").classList.add("hidden");
}

// ===================== PLAYERS =====================
async function loadPlayers() {
  const list = document.getElementById("players-list");
  if (!list || !window.supabaseClient) return;

  const { data } = await window.supabaseClient
    .from("players")
    .select("*")
    .order("name", { ascending: true });

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-da-muted text-sm">No players yet.</p>`;
    return;
  }

  list.innerHTML = data.map(p => `
    <div class="bg-da-card border border-da-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        ${p.photo || p.photo_url ? `<img src="${p.photo || p.photo_url}" class="w-12 h-12 rounded-full object-cover">` : `<div class="w-12 h-12 rounded-full bg-white/10"></div>`}
        <div>
          <div class="font-semibold">${p.name}</div>
          <div class="text-sm text-da-muted">${p.position || ""} · ${p.role || ""} · ${p.apps || 0} apps · ${p.goals || 0}G ${p.assists || 0}A</div>
        </div>
      </div>
      <div class="flex gap-2">
        <button data-id="${p.id}" class="edit-player text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15">Edit</button>
        <button data-id="${p.id}" class="delete-player text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".edit-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = data.find(x => String(x.id) === btn.dataset.id);
      if (!item) return;
      document.getElementById("player-edit-id").value = item.id;
      document.getElementById("player-name").value = item.name || "";
      document.getElementById("player-position").value = item.position || "MID";
      document.getElementById("player-role").value = item.role || "";
      document.getElementById("player-apps").value = item.apps || 0;
      document.getElementById("player-goals").value = item.goals || 0;
      document.getElementById("player-assists").value = item.assists || 0;
      document.getElementById("player-form-title").textContent = "Edit Player";
      document.getElementById("btn-cancel-player").classList.remove("hidden");
    });
  });

  list.querySelectorAll(".delete-player").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this player?")) return;
      await window.supabaseClient.from("players").delete().eq("id", btn.dataset.id);
      showToast("Player deleted");
      loadPlayers();
    });
  });
}

document.getElementById("btn-save-player")?.addEventListener("click", async () => {
  const id = document.getElementById("player-edit-id").value;
  const fileInput = document.getElementById("player-photo");
  let photo = null;
  if (fileInput.files[0]) photo = await fileToBase64(fileInput.files[0]);

  const data = {
    name: document.getElementById("player-name").value,
    position: document.getElementById("player-position").value,
    role: document.getElementById("player-role").value,
    apps: parseInt(document.getElementById("player-apps").value) || 0,
    goals: parseInt(document.getElementById("player-goals").value) || 0,
    assists: parseInt(document.getElementById("player-assists").value) || 0
  };
  if (photo) data.photo = photo;

  let error;
  if (id) {
    ({ error } = await window.supabaseClient.from("players").update(data).eq("id", id));
  } else {
    ({ error } = await window.supabaseClient.from("players").insert([data]));
  }

  if (error) {
    console.error(error);
    alert("Error saving player");
  } else {
    showToast(id ? "Player updated" : "Player added");
    resetPlayerForm();
    loadPlayers();
  }
});

document.getElementById("btn-cancel-player")?.addEventListener("click", resetPlayerForm);

function resetPlayerForm() {
  document.getElementById("player-edit-id").value = "";
  document.getElementById("player-name").value = "";
  document.getElementById("player-position").value = "MID";
  document.getElementById("player-role").value = "";
  document.getElementById("player-apps").value = 0;
  document.getElementById("player-goals").value = 0;
  document.getElementById("player-assists").value = 0;
  document.getElementById("player-photo").value = "";
  document.getElementById("player-form-title").textContent = "Add Player";
  document.getElementById("btn-cancel-player").classList.add("hidden");
}

// ===================== STORIES =====================
async function loadStories() {
  const list = document.getElementById("stories-list");
  if (!list || !window.supabaseClient) return;

  const { data } = await window.supabaseClient
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-da-muted text-sm">No stories yet.</p>`;
    return;
  }

  list.innerHTML = data.map(s => `
    <div class="bg-da-card border border-da-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div class="text-xs text-da-green uppercase font-semibold">${s.category || "Club"}</div>
        <div class="font-semibold">${s.title || "Untitled"}</div>
        <div class="text-sm text-da-muted line-clamp-1">${s.description || s.content || ""}</div>
      </div>
      <div class="flex gap-2">
        <button data-id="${s.id}" class="edit-story text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15">Edit</button>
        <button data-id="${s.id}" class="delete-story text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".edit-story").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = data.find(x => String(x.id) === btn.dataset.id);
      if (!item) return;
      document.getElementById("story-edit-id").value = item.id;
      document.getElementById("story-category").value = item.category || "Club";
      document.getElementById("story-title").value = item.title || "";
      document.getElementById("story-desc").value = item.description || "";
      document.getElementById("story-content").value = item.content || "";
      document.getElementById("story-form-title").textContent = "Edit Story";
      document.getElementById("btn-cancel-story").classList.remove("hidden");
    });
  });

  list.querySelectorAll(".delete-story").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this story?")) return;
      await window.supabaseClient.from("stories").delete().eq("id", btn.dataset.id);
      showToast("Story deleted");
      loadStories();
    });
  });
}

document.getElementById("btn-save-story")?.addEventListener("click", async () => {
  const id = document.getElementById("story-edit-id").value;
  const fileInput = document.getElementById("story-image");
  let image = null;
  if (fileInput.files[0]) image = await fileToBase64(fileInput.files[0]);

  const title = document.getElementById("story-title").value;

  const data = {
    category: document.getElementById("story-category").value,
    title,
    description: document.getElementById("story-desc").value,
    content: document.getElementById("story-content").value
  };
  if (image) data.image = image;

  let error;
  if (id) {
    ({ error } = await window.supabaseClient.from("stories").update(data).eq("id", id));
  } else {
    ({ error } = await window.supabaseClient.from("stories").insert([data]));
  }

  if (error) {
    console.error(error);
    alert("Error saving story");
  } else {
    showToast(id ? "Story updated" : "Story published");

    await sendPushNotification(
      "DA United",
      title || "New story posted",
      "/stories.html"
    );

    resetStoryForm();
    loadStories();
  }
});

document.getElementById("btn-cancel-story")?.addEventListener("click", resetStoryForm);

function resetStoryForm() {
  document.getElementById("story-edit-id").value = "";
  document.getElementById("story-category").value = "Club";
  document.getElementById("story-title").value = "";
  document.getElementById("story-desc").value = "";
  document.getElementById("story-content").value = "";
  document.getElementById("story-image").value = "";
  document.getElementById("story-form-title").textContent = "Post New Story";
  document.getElementById("btn-cancel-story").classList.add("hidden");
}

// ===================== GALLERY =====================
async function loadGallery() {
  const list = document.getElementById("gallery-list");
  if (!list || !window.supabaseClient) return;

  const { data } = await window.supabaseClient
    .from("gallery")
    .select("*")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-da-muted text-sm col-span-full">No images yet.</p>`;
    return;
  }

  list.innerHTML = data.map(g => `
    <div class="bg-da-card border border-da-border rounded-xl overflow-hidden">
      ${g.image ? `<img src="${g.image}" class="w-full aspect-video object-cover">` : ""}
      <div class="p-3">
        <div class="font-medium text-sm">${g.title || "Untitled"}</div>
        <div class="text-xs text-da-muted">${g.description || ""}</div>
        <button data-id="${g.id}" class="delete-gallery mt-2 text-xs text-red-400">Delete</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".delete-gallery").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this image?")) return;
      await window.supabaseClient.from("gallery").delete().eq("id", btn.dataset.id);
      showToast("Image deleted");
      loadGallery();
    });
  });
}

document.getElementById("btn-save-gallery")?.addEventListener("click", async () => {
  const fileInput = document.getElementById("gallery-image");
  if (!fileInput.files[0]) {
    alert("Please select an image");
    return;
  }
  const image = await fileToBase64(fileInput.files[0]);

  const { error } = await window.supabaseClient.from("gallery").insert([{
    title: document.getElementById("gallery-title").value,
    description: document.getElementById("gallery-desc").value,
    image
  }]);

  if (error) {
    console.error(error);
    alert("Error uploading image");
  } else {
    showToast("Image uploaded");
    document.getElementById("gallery-title").value = "";
    document.getElementById("gallery-desc").value = "";
    fileInput.value = "";
    loadGallery();
  }
});

// ===================== LIVE (stream) =====================
let liveOn = false;
const toggleLive = document.getElementById("toggle-live");

toggleLive?.addEventListener("click", () => {
  liveOn = !liveOn;
  const knob = toggleLive.querySelector("span");
  if (liveOn) {
    toggleLive.classList.add("bg-da-green");
    toggleLive.classList.remove("bg-gray-600");
    knob.classList.add("translate-x-5");
  } else {
    toggleLive.classList.remove("bg-da-green");
    toggleLive.classList.add("bg-gray-600");
    knob.classList.remove("translate-x-5");
  }
});

document.getElementById("btn-save-live")?.addEventListener("click", async () => {
  const data = {
    is_live: liveOn,
    title: document.getElementById("live-title").value,
    url: document.getElementById("live-url").value,
    updated_at: new Date().toISOString()
  };

  const { error } = await window.supabaseClient
    .from("live")
    .upsert({ id: 1, ...data });

  if (error) {
    console.error(error);
    alert("Error saving live settings");
  } else {
    showToast("Live settings saved");

    if (liveOn) {
      await sendPushNotification(
        "LIVE NOW",
        data.title || "DA United is live",
        "/live.html"
      );
    }
  }
});

// ===================== TRAINING =====================
async function loadTraining() {
  const list = document.getElementById("training-list");
  if (!list || !window.supabaseClient) return;

  const { data } = await window.supabaseClient
    .from("training")
    .select("*")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-da-muted text-sm">No sessions yet.</p>`;
    return;
  }

  list.innerHTML = data.map(t => `
    <div class="bg-da-card border border-da-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div class="text-xs text-da-green uppercase font-semibold">${t.type || "Technical"}</div>
        <div class="font-semibold">${t.title}</div>
        <div class="text-sm text-da-muted">${t.location || t.venue || ""} · ${t.status || ""}</div>
      </div>
      <div class="flex gap-2">
        <button data-id="${t.id}" class="edit-training text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15">Edit</button>
        <button data-id="${t.id}" class="delete-training text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".edit-training").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = data.find(x => String(x.id) === btn.dataset.id);
      if (!item) return;
      document.getElementById("training-edit-id").value = item.id;
      document.getElementById("training-title").value = item.title || "";
      document.getElementById("training-type").value = item.type || "Technical";
      document.getElementById("training-location").value = item.location || item.venue || "DA United Training Ground";
      document.getElementById("training-status").value = item.status || "closed";
      document.getElementById("training-form-title").textContent = "Edit Session";
      document.getElementById("btn-cancel-training").classList.remove("hidden");
    });
  });

  list.querySelectorAll(".delete-training").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this session?")) return;
      await window.supabaseClient.from("training").delete().eq("id", btn.dataset.id);
      showToast("Session deleted");
      loadTraining();
    });
  });
}

document.getElementById("btn-save-training")?.addEventListener("click", async () => {
  const id = document.getElementById("training-edit-id").value;
  const data = {
    title: document.getElementById("training-title").value,
    type: document.getElementById("training-type").value,
    location: document.getElementById("training-location").value,
    status: document.getElementById("training-status").value
  };

  let error;
  if (id) {
    ({ error } = await window.supabaseClient.from("training").update(data).eq("id", id));
  } else {
    ({ error } = await window.supabaseClient.from("training").insert([data]));
  }

  if (error) {
    console.error(error);
    alert("Error saving session");
  } else {
    showToast(id ? "Session updated" : "Session added");
    resetTrainingForm();
    loadTraining();
  }
});

document.getElementById("btn-cancel-training")?.addEventListener("click", resetTrainingForm);

function resetTrainingForm() {
  document.getElementById("training-edit-id").value = "";
  document.getElementById("training-title").value = "";
  document.getElementById("training-type").value = "Technical";
  document.getElementById("training-location").value = "DA United Training Ground";
  document.getElementById("training-status").value = "closed";
  document.getElementById("training-form-title").textContent = "Add Training Session";
  document.getElementById("btn-cancel-training").classList.add("hidden");
}

// ===================== DA TV =====================
async function loadDatv() {
  const list = document.getElementById("datv-list");
  if (!list || !window.supabaseClient) return;

  const { data } = await window.supabaseClient
    .from("datv")
    .select("*")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-da-muted text-sm">No videos yet.</p>`;
    return;
  }

  list.innerHTML = data.map(d => `
    <div class="bg-da-card border border-da-border rounded-xl p-4 flex justify-between items-center gap-3">
      <div>
        <div class="font-semibold">${d.title || "Untitled"} ${d.featured ? "★" : ""}</div>
        <div class="text-sm text-da-muted">${d.description || ""}</div>
      </div>
      <button data-id="${d.id}" class="delete-datv text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-400">Delete</button>
    </div>
  `).join("");

  list.querySelectorAll(".delete-datv").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this video?")) return;
      await window.supabaseClient.from("datv").delete().eq("id", btn.dataset.id);
      showToast("Video deleted");
      loadDatv();
    });
  });
}

document.getElementById("btn-save-datv")?.addEventListener("click", async () => {
  const fileInput = document.getElementById("datv-file");
  let file = null;
  if (fileInput.files[0]) file = await fileToBase64(fileInput.files[0]);

  const { error } = await window.supabaseClient.from("datv").insert([{
    title: document.getElementById("datv-title").value,
    description: document.getElementById("datv-desc").value,
    file,
    featured: document.getElementById("datv-featured").checked
  }]);

  if (error) {
    console.error(error);
    alert("Error uploading");
  } else {
    showToast("Uploaded to DA TV");
    document.getElementById("datv-title").value = "";
    document.getElementById("datv-desc").value = "";
    fileInput.value = "";
    document.getElementById("datv-featured").checked = false;
    loadDatv();
  }
});

// ===================== PREDICTIONS =====================
let predOn = false;
const togglePred = document.getElementById("toggle-predictions");

togglePred?.addEventListener("click", () => {
  predOn = !predOn;
  const knob = togglePred.querySelector("span");
  if (predOn) {
    togglePred.classList.add("bg-da-green");
    togglePred.classList.remove("bg-gray-600");
    knob.classList.add("translate-x-5");
  } else {
    togglePred.classList.remove("bg-da-green");
    togglePred.classList.add("bg-gray-600");
    knob.classList.remove("translate-x-5");
  }
});

document.getElementById("btn-save-predictions")?.addEventListener("click", async () => {
  const data = {
    open: predOn,
    match_title: document.getElementById("pred-match").value,
    updated_at: new Date().toISOString()
  };

  const { error } = await window.supabaseClient
    .from("prediction_settings")
    .upsert({ id: 1, ...data });

  if (error) {
    console.error(error);
    alert("Error saving predictions settings (check table name)");
  } else {
    showToast("Predictions settings saved");

    if (predOn) {
      await sendPushNotification(
        "Predictions Open",
        data.match_title || "Make your prediction now",
        "/predictions.html"
      );
    }
  }
});

// If there's already a Live or Half-Time match when the admin panel opens
// (e.g. page refreshed mid-match), load it straight into the form so the
// next event you log updates it — instead of leaving the form blank and
// defaulting to a new "Full Time" match.
async function autoLoadActiveLiveMatch() {
  const idField = document.getElementById("match-edit-id");
  if (!idField || idField.value) return; // already editing something — don't override
  if (!window.supabaseClient) return;

  const { data } = await window.supabaseClient
    .from("matches")
    .select("*")
    .in("status", ["Live", "HT"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return;

  idField.value = data.id;
  document.getElementById("match-opponent").value = data.opponent || "";
  document.getElementById("match-score-home").value = data.score_home ?? 0;
  document.getElementById("match-score-away").value = data.score_away ?? 0;
  document.getElementById("match-venue").value = data.venue || "Home";
  document.getElementById("match-comp").value = data.competition || "Club Friendlies";
  document.getElementById("match-status").value = data.status || "Live";
  currentEvents = data.events ? (typeof data.events === "string" ? JSON.parse(data.events) : data.events) : [];
  renderEventsPreview();
  document.getElementById("match-form-title").textContent =
    data.status === "Live" ? "Editing Live Match" : "Editing Match — Half Time";
  document.getElementById("btn-cancel-match").classList.remove("hidden");
}

// ===================== INIT =====================
function loadAllLists() {
  if (!window.supabaseClient) {
    setTimeout(loadAllLists, 150);
    return;
  }
  loadFixtures();
  loadMatches();
  loadPlayers();
  loadStories();
  loadGallery();
  loadTraining();
  loadDatv();
  renderEventsPreview();
  autoLoadActiveLiveMatch();
}

if (sessionStorage.getItem("da_admin_logged_in") === "true") {
  loadAllLists();
}

// ======================
// DA United – Admin Panel (Full CRUD + Match Events + Push)
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

    const data = await res.json();
    console.log("Push result:", data);
    return data;
  } catch (err) {
    console.error("Failed to send push:", err);
  }
}

// ===================== MATCH EVENTS =====================
let currentEvents = [];
let squadPlayersCache = [];

// Loads the squad into the event-player <select> so events (and
// therefore stats) are tied to real players instead of free text.
async function loadSquadIntoEventPicker() {
  if (!window.supabaseClient) return;
  const { data } = await window.supabaseClient.from("players").select("id,name,position").order("name");
  squadPlayersCache = data || [];
  const sel = document.getElementById("event-player");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = `<option value="">Select player…</option>` +
    squadPlayersCache.map(p => `<option value="${p.name}">${p.name} (${p.position || ""})</option>`).join("") +
    `<option value="__custom__">Other / type name…</option>`;
  if ([...sel.options].some(o => o.value === current)) sel.value = current;
}

document.getElementById("event-player")?.addEventListener("change", (e) => {
  const customInput = document.getElementById("event-player-custom");
  if (e.target.value === "__custom__") {
    customInput.classList.remove("hidden");
    customInput.value = "";
    customInput.focus();
  } else {
    customInput.classList.add("hidden");
  }
});

function renderEventsPreview() {
  const box = document.getElementById("events-preview");
  if (!box) return;

  if (currentEvents.length === 0) {
    box.innerHTML = `<span class="text-da-muted text-xs">No events added yet</span>`;
    return;
  }

  box.innerHTML = currentEvents.map((e, i) => `
    <div class="flex items-center justify-between bg-da-dark/50 rounded-lg px-3 py-1.5">
      <span>${e.minute || "—"}' · <strong>${e.type}</strong> ${e.player ? "– " + e.player : ""}</span>
      <button type="button" data-idx="${i}" class="text-red-400 text-xs remove-event">✕</button>
    </div>
  `).join("");

  box.querySelectorAll(".remove-event").forEach(btn => {
    btn.addEventListener("click", async () => {
      const removed = currentEvents[Number(btn.dataset.idx)];
      currentEvents.splice(Number(btn.dataset.idx), 1);
      renderEventsPreview();

      // Undo the score bump this event caused, then push the correction live.
      if (removed) {
        const homeInput = document.getElementById("match-score-home");
        const awayInput = document.getElementById("match-score-away");
        if (removed.type === "Goal" && homeInput) {
          homeInput.value = Math.max(0, (parseInt(homeInput.value) || 0) - 1);
        }
        if (removed.type === "Own Goal" && awayInput) {
          awayInput.value = Math.max(0, (parseInt(awayInput.value) || 0) - 1);
        }
      }
      await persistLiveEvent(null);
    });
  });
}

// Event types that move the score. "Goal" is one of our players scoring
// (the player picker only lists the squad), "Own Goal" benefits the
// opponent. Anything else (cards, subs, VAR, etc.) just gets logged.
const SCORING_EVENT_TYPES = { "Goal": "home", "Own Goal": "away" };

// Writes the in-memory event list + score straight to Supabase so it
// shows up on the public site immediately — logging an event no longer
// silently waits for a later, unrelated "Save Match" click.
async function persistLiveEvent(justAdded) {
  const id = document.getElementById("match-edit-id").value;
  if (!id || !window.supabaseClient) return;

  const scoreHome = parseInt(document.getElementById("match-score-home").value) || 0;
  const scoreAway = parseInt(document.getElementById("match-score-away").value) || 0;
  const opponent = document.getElementById("match-opponent").value;
  const status = document.getElementById("match-status").value || "Live";

  const { error } = await window.supabaseClient.from("matches").update({
    events: currentEvents,
    score_home: scoreHome,
    score_away: scoreAway,
    scorers: currentEvents
      .filter(e => e.type === "Goal" || e.type === "Own Goal")
      .map(e => `${e.player} ${e.minute}`)
      .join("\n")
  }).eq("id", id);

  if (error) {
    console.error(error);
    alert("Error logging event: " + error.message);
    return;
  }

  const isLive = ["Live", "HT"].includes(status);
  const isGoal = justAdded && (justAdded.type === "Goal" || justAdded.type === "Own Goal");

  if (isLive && isGoal) {
    showToast("⚽ Goal logged live");
    await sendPushNotification(
      "⚽ GOAL!",
      `DA United ${scoreHome} - ${scoreAway} ${opponent || ""}${justAdded.player ? " — " + justAdded.player : ""}`,
      "/matches.html"
    );
  } else if (isLive && justAdded) {
    showToast(`${justAdded.type} logged live`);
    await sendPushNotification(
      "Match Update",
      `${justAdded.type}${justAdded.player ? " — " + justAdded.player : ""} · DA United ${scoreHome} - ${scoreAway} ${opponent || ""}`,
      "/matches.html"
    );
  } else {
    showToast("Event saved");
  }

  loadMatches();
}

document.getElementById("btn-add-event")?.addEventListener("click", async () => {
  const id = document.getElementById("match-edit-id").value;
  if (!id) {
    alert("Save this match first (Save Match, with status set to Live), then the event log below will post live as you add events.");
    return;
  }

  const type = document.getElementById("event-type").value;
  const sel = document.getElementById("event-player");
  const customInput = document.getElementById("event-player-custom");
  const player = sel.value === "__custom__" ? customInput.value.trim() : sel.value.trim();
  const minute = document.getElementById("event-minute").value.trim();

  const newEvent = { type, player, minute };
  currentEvents.push(newEvent);
  sel.value = "";
  customInput.value = "";
  customInput.classList.add("hidden");
  document.getElementById("event-minute").value = "";
  renderEventsPreview();

  // Auto-bump the score for goal-type events, same as the score fields
  // would show if you typed it in yourself.
  const side = SCORING_EVENT_TYPES[type];
  if (side === "home") {
    const el = document.getElementById("match-score-home");
    el.value = (parseInt(el.value) || 0) + 1;
  } else if (side === "away") {
    const el = document.getElementById("match-score-away");
    el.value = (parseInt(el.value) || 0) + 1;
  }

  await persistLiveEvent(newEvent);
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

    // Send push
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
      ? `<div class="text-xs text-da-muted mt-1">${events.map(e => `${e.minute || ""}' ${e.type} ${e.player || ""}`).join(" · ")}</div>`
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
      document.getElementById("match-date").value = item.date || "";
      document.getElementById("match-time").value = item.time || "";
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

const FINISHED_STATUSES = ["FT", "AET", "Penalties"];

async function saveMatch(forceFullTime) {
  const id = document.getElementById("match-edit-id").value;
  const scoreHome = parseInt(document.getElementById("match-score-home").value) || 0;
  const scoreAway = parseInt(document.getElementById("match-score-away").value) || 0;
  const opponent = document.getElementById("match-opponent").value;
  const status = forceFullTime ? "FT" : (document.getElementById("match-status").value || "FT");

  const data = {
    opponent,
    score_home: scoreHome,
    score_away: scoreAway,
    venue: document.getElementById("match-venue").value,
    competition: document.getElementById("match-comp").value || "Club Friendlies",
    date: document.getElementById("match-date").value,
    time: document.getElementById("match-time").value,
    status,
    events: currentEvents,
    scorers: currentEvents
      .filter(e => e.type === "Goal" || e.type === "Own Goal")
      .map(e => `${e.player} ${e.minute}`)
      .join("\n")
  };

  let error;
  let savedId = id;
  if (id) {
    ({ error } = await window.supabaseClient.from("matches").update(data).eq("id", id));
  } else {
    const { data: inserted, error: insErr } = await window.supabaseClient.from("matches").insert([data]).select();
    error = insErr;
    if (inserted && inserted[0]) savedId = inserted[0].id;
  }

  if (error) {
    console.error(error);
    alert("Error saving match");
    return;
  }

  showToast(id ? "Match updated" : "Match saved");

  await sendPushNotification(
    status === "FT" ? "Full Time" : status === "Live" ? "Kick Off" : "Match Update",
    `DA United ${scoreHome} - ${scoreAway} ${opponent || ""}`,
    "/matches.html"
  );

  // Once a match is finished, just clear the matching "upcoming"
  // fixture so it doesn't need re-entering. Player Goals/Assists/
  // Saves/Clean Sheets are NOT auto-recomputed here anymore — that
  // used to silently reset any number you typed by hand on the
  // Squad tab back to 0 the next time ANY match was saved. Use the
  // "Recalculate stats from matches" button in the Squad tab instead,
  // whenever you actually want the auto-count.
  if (FINISHED_STATUSES.includes(status) && opponent) {
    await window.supabaseClient.from("fixtures").delete().ilike("away", `%${opponent}%`);
    loadFixtures();
  }

  if (FINISHED_STATUSES.includes(status)) {
    resetMatchForm();
  } else {
    // Match is Scheduled/Live/HT — stay in edit mode on this exact
    // row so "+ Add Event" below has a saved match id to attach to
    // and can post events live right away, instead of only saving
    // whenever this form happens to be submitted again.
    document.getElementById("match-edit-id").value = savedId || "";
    document.getElementById("match-form-title").textContent = "Edit Match";
    document.getElementById("btn-cancel-match").classList.remove("hidden");
  }
  loadMatches();
}

document.getElementById("btn-save-match")?.addEventListener("click", () => saveMatch(false));
document.getElementById("btn-full-time")?.addEventListener("click", () => saveMatch(true));

document.getElementById("btn-cancel-match")?.addEventListener("click", resetMatchForm);

function resetMatchForm() {
  document.getElementById("match-edit-id").value = "";
  document.getElementById("match-opponent").value = "";
  document.getElementById("match-score-home").value = "";
  document.getElementById("match-score-away").value = "";
  document.getElementById("match-venue").value = "Home";
  document.getElementById("match-comp").value = "Club Friendlies";
  document.getElementById("match-date").value = "";
  document.getElementById("match-time").value = "";
  document.getElementById("match-status").value = "FT";
  currentEvents = [];
  renderEventsPreview();
  document.getElementById("match-form-title").textContent = "Add Match Result";
  document.getElementById("btn-cancel-match").classList.add("hidden");
}

// ===================== RECALCULATE STATS (manual, opt-in) =====================
// Scans every Full Time / AET / Penalties match's events and rebuilds
// Goals, Assists, Saves and Clean Sheets for the whole squad, matched
// by player name. Only runs when the admin clicks the button — it no
// longer fires automatically, so it can never quietly overwrite a
// number typed in by hand on the Squad tab.
async function recalcPlayerStats() {
  if (!window.supabaseClient) return;

  const { data: matches } = await window.supabaseClient
    .from("matches")
    .select("events,status,score_away")
    .in("status", FINISHED_STATUSES);

  const { data: players } = await window.supabaseClient.from("players").select("id,name,position");
  if (!players || !players.length) return;

  const norm = s => (s || "").trim().toLowerCase();
  const tally = {}; // normalized name -> {goals, assists, saves, cleanSheets}
  players.forEach(p => { tally[norm(p.name)] = { goals: 0, assists: 0, saves: 0, cleanSheets: 0 }; });

  (matches || []).forEach(m => {
    const events = m.events ? (typeof m.events === "string" ? JSON.parse(m.events) : m.events) : [];
    const concededZero = Number(m.score_away ?? 0) === 0;

    events.forEach(e => {
      const key = norm(e.player);
      if (!key || !tally[key]) return;
      if (e.type === "Goal") tally[key].goals += 1;
      if (e.type === "Assist") tally[key].assists += 1;
      if (e.type === "Save") tally[key].saves += 1;
    });

    // Clean sheet: awarded to every goalkeeper for a completed match
    // where DA United didn't concede. (Refined once matchday
    // selections track who actually started in goal.)
    if (concededZero) {
      players.filter(p => (p.position || "").toUpperCase() === "GK")
        .forEach(p => { tally[norm(p.name)].cleanSheets += 1; });
    }
  });

  await Promise.all(players.map(p => {
    const t = tally[norm(p.name)];
    if (!t) return Promise.resolve();
    return window.supabaseClient.from("players").update({
      goals: t.goals,
      assists: t.assists,
      saves: t.saves,
      clean_sheets: t.cleanSheets
    }).eq("id", p.id);
  }));

  showToast("Stats recalculated from matches");
  loadPlayers();
}

document.getElementById("btn-recalc-stats")?.addEventListener("click", () => {
  if (confirm("This will overwrite every player's Goals, Assists, Saves and Clean Sheets with counts computed from logged match events. Any numbers you typed in by hand will be replaced. Continue?")) {
    recalcPlayerStats();
  }
});

// ===================== PLAYERS =====================
async function loadPlayers() {
  const list = document.getElementById("players-list");
  if (!list || !window.supabaseClient) return;

  const { data, error } = await window.supabaseClient
    .from("players")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Squad load error", error);
    list.innerHTML = `<p class="text-red-400 text-sm">Couldn't load players: ${error.message || "unknown error"}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-da-muted text-sm">No players yet.</p>`;
    return;
  }

  list.innerHTML = data.map(p => {
    const isGK = (p.position || "").toUpperCase() === "GK";
    const statLine = isGK
      ? `${p.apps || 0} apps · ${p.saves || 0} saves · ${p.clean_sheets || 0} clean sheets`
      : `${p.apps || 0} apps · ${p.goals || 0}G ${p.assists || 0}A`;
    const available = p.available !== false;
    return `
    <div class="bg-da-card border border-da-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        ${p.photo || p.photo_url ? `<img src="${p.photo || p.photo_url}" class="w-12 h-12 rounded-full object-cover">` : `<div class="w-12 h-12 rounded-full bg-white/10"></div>`}
        <div>
          <div class="font-semibold flex items-center gap-2">
            ${p.name}
            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${available ? "bg-da-green/20 text-da-green" : "bg-red-500/20 text-red-400"}">${available ? "AVAILABLE" : "UNAVAILABLE"}</span>
          </div>
          <div class="text-sm text-da-muted">${p.position || ""} · ${p.role || ""} · ${statLine}</div>
        </div>
      </div>
      <div class="flex gap-2">
        <button data-id="${p.id}" data-available="${available}" class="toggle-available text-xs px-3 py-1.5 rounded-full ${available ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-da-green/20 text-da-green hover:bg-da-green/30"}">${available ? "Mark Unavailable" : "Mark Available"}</button>
        <button data-id="${p.id}" class="edit-player text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15">Edit</button>
        <button data-id="${p.id}" class="delete-player text-xs px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
      </div>
    </div>
  `;
  }).join("");

  list.querySelectorAll(".toggle-available").forEach(btn => {
    btn.addEventListener("click", async () => {
      const nowAvailable = btn.dataset.available !== "true";
      await window.supabaseClient.from("players").update({ available: nowAvailable }).eq("id", btn.dataset.id);
      loadPlayers();
    });
  });

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
      document.getElementById("player-saves").value = item.saves || 0;
      document.getElementById("player-clean-sheets").value = item.clean_sheets || 0;
      document.getElementById("player-available").checked = item.available !== false;
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
    assists: parseInt(document.getElementById("player-assists").value) || 0,
    saves: parseInt(document.getElementById("player-saves").value) || 0,
    clean_sheets: parseInt(document.getElementById("player-clean-sheets").value) || 0,
    available: document.getElementById("player-available").checked
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
    alert("Error saving player: " + (error.message || error.details || JSON.stringify(error)));
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
  document.getElementById("player-saves").value = 0;
  document.getElementById("player-clean-sheets").value = 0;
  document.getElementById("player-available").checked = true;
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

    // Send push notification
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

// ===================== LIVE =====================
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

// ===================== STATS (Formation + Attributes + Ratings) =====================

async function loadFormationAdmin() {
  if (!window.supabaseClient) return;
  const { data, error } = await window.supabaseClient
    .from("team_news")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) console.error("loadFormationAdmin:", error);

  if (data) {
    document.getElementById("stats-formation").value = data.formation || "4-3-3";
    document.getElementById("stats-notes").value = data.notes || "";
    document.getElementById("stats-xi").value = Array.isArray(data.selected_xi) ? data.selected_xi.join(", ") : "";
    document.getElementById("stats-subs").value = Array.isArray(data.substitutes) ? data.substitutes.join(", ") : "";
  }
}

document.getElementById("btn-save-formation")?.addEventListener("click", async () => {
  const formation = document.getElementById("stats-formation").value.trim() || "4-3-3";
  const notes = document.getElementById("stats-notes").value.trim();
  const xi = document.getElementById("stats-xi").value
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const subs = document.getElementById("stats-subs").value
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // First deactivate any currently active rows
  await window.supabaseClient
    .from("team_news")
    .update({ is_active: false })
    .eq("is_active", true);

  // Then insert the new active one
  const { error } = await window.supabaseClient
    .from("team_news")
    .insert([{
      formation,
      notes,
      selected_xi: xi,
      substitutes: subs,
      is_active: true,
      updated_at: new Date().toISOString()
    }]);

  if (error) {
    console.error("Save formation error:", error);
    alert("Error saving formation: " + error.message);
  } else {
    showToast("Formation saved");
  }
});

async function loadAttributesAdmin() {
  const box = document.getElementById("attrs-list");
  if (!box || !window.supabaseClient) return;

  const { data, error } = await window.supabaseClient
    .from("players")
    .select("id, name, position, pace, shooting, passing, dribbling, defending, physical, overall")
    .order("name");

  if (error) {
    console.error("Failed to load players:", error);
    box.innerHTML = `<p class="text-red-400 text-sm">Error loading players: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `<p class="text-da-muted text-sm">No players found</p>`;
    return;
  }

  box.innerHTML = data.map(p => `
    <div class="bg-da-dark/50 border border-da-border rounded-xl p-4" data-id="${p.id}">
      <div class="font-semibold mb-3">
        ${p.name} 
        <span class="text-xs text-da-muted">(${p.position || "—"})</span>
      </div>
      <div class="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center">
        ${["pace","shooting","passing","dribbling","defending","physical","overall"].map(k => `
          <div>
            <div class="text-[10px] text-da-muted uppercase mb-1">${k.slice(0,3)}</div>
            <input type="number" min="1" max="99" 
                   value="${p[k] != null ? p[k] : 70}" 
                   data-field="${k}"
                   class="w-full bg-da-dark border border-da-border rounded-lg px-2 py-1.5 text-sm text-center attr-input">
          </div>
        `).join("")}
      </div>
      <button class="mt-3 text-xs bg-da-green/20 text-da-green px-3 py-1.5 rounded-full save-attrs">
        Save
      </button>
    </div>
  `).join("");

  // Attach save handlers
  box.querySelectorAll(".save-attrs").forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest("[data-id]");
      const id = card.dataset.id;
      const updates = {};

      card.querySelectorAll(".attr-input").forEach(inp => {
        const val = parseInt(inp.value);
        updates[inp.dataset.field] = isNaN(val) ? 70 : Math.min(99, Math.max(1, val));
      });

      console.log("Updating player", id, updates); // helpful for debugging

      const { data, error } = await window.supabaseClient
        .from("players")
        .update(updates)
        .eq("id", id)
        .select();

      if (error) {
        console.error("Attribute update failed:", error);
        alert("Error saving attributes:\n" + error.message);
      } else {
        showToast("Attributes saved");
        console.log("Saved:", data);
      }
    });
  });
}

async function loadRatingSelects() {
  if (!window.supabaseClient) return;

  const { data: matches } = await window.supabaseClient
    .from("matches")
    .select("id, opponent, date, score_home, score_away")
    .order("created_at", { ascending: false })
    .limit(40);

  const matchSel = document.getElementById("rating-match");
  if (matchSel) {
    matchSel.innerHTML = `<option value="">Select match…</option>` +
      (matches || []).map(m => 
        `<option value="${m.id}">DA ${m.score_home ?? 0}-${m.score_away ?? 0} ${m.opponent || ""} (${m.date || ""})</option>`
      ).join("");
  }

  const { data: players } = await window.supabaseClient
    .from("players")
    .select("id, name")
    .order("name");

  const playerSel = document.getElementById("rating-player");
  if (playerSel) {
    playerSel.innerHTML = `<option value="">Select player…</option>` +
      (players || []).map(p => 
        `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`
      ).join("");
  }
}

document.getElementById("btn-save-rating")?.addEventListener("click", async () => {
  const matchId = document.getElementById("rating-match").value;
  const playerSel = document.getElementById("rating-player");
  const playerId = playerSel.value;
  const playerName = playerSel.selectedOptions[0]?.dataset?.name || playerSel.selectedOptions[0]?.textContent || "";
  const rating = parseFloat(document.getElementById("rating-value").value);

  if (!matchId || !playerId || isNaN(rating)) {
    alert("Please select a match, a player and enter a rating");
    return;
  }

  const { error } = await window.supabaseClient
    .from("match_ratings")
    .insert([{
      match_id: matchId,
      player_id: playerId,
      player_name: playerName,
      rating
    }]);

  if (error) {
    console.error("Save rating error:", error);
    alert("Error saving rating: " + error.message);
  } else {
    showToast("Rating added");
    document.getElementById("rating-value").value = "";
    loadRatingsAdmin();
  }
});

async function loadRatingsAdmin() {
  const box = document.getElementById("ratings-admin-list");
  if (!box || !window.supabaseClient) return;

  const { data, error } = await window.supabaseClient
    .from("match_ratings")
    .select("id, player_name, rating, matches(opponent, date)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    box.innerHTML = `<p class="text-red-400 text-sm">Failed to load ratings</p>`;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `<p class="text-da-muted text-sm">No ratings yet</p>`;
    return;
  }

  box.innerHTML = data.map(r => `
    <div class="flex items-center justify-between bg-da-dark/40 rounded-lg px-3 py-2 text-sm">
      <span>
        ${r.player_name} – <strong>${Number(r.rating).toFixed(1)}</strong>
        <span class="text-da-muted text-xs ml-1">(${r.matches?.opponent || "—"})</span>
      </span>
      <button data-id="${r.id}" class="text-red-400 text-xs delete-rating">Delete</button>
    </div>
  `).join("");

  box.querySelectorAll(".delete-rating").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this rating?")) return;
      await window.supabaseClient.from("match_ratings").delete().eq("id", btn.dataset.id);
      loadRatingsAdmin();
    });
  });
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
  loadSquadIntoEventPicker();
  renderEventsPreview();
  loadFormationAdmin();
  loadAttributesAdmin();
  loadRatingSelects();
  loadRatingsAdmin();
}

if (sessionStorage.getItem("da_admin_logged_in") === "true") {
  loadAllLists();
}
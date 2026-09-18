// ======================
// DA United – Matches (Supabase, status-driven)
// DB matches on top (Admin), old manual games underneath.
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

// A match is "in play" only for these statuses — everything else
// (Scheduled, FT, AET, Penalties, Postponed, Cancelled) is NOT live.
const LIVE_STATUSES = ["Live", "HT"];
const FINISHED_STATUSES = ["FT", "AET", "Penalties"];

// Event type → icon + label shown in the feed.
const EVENT_META = {
  "Goal":             { icon: "⚽", label: "Goal",           color: "text-da-green" },
  "Golazo":           { icon: "🚀", label: "Screamer",       color: "text-da-green" },
  "Free Kick Goal":   { icon: "🎯", label: "Free Kick Goal", color: "text-da-green" },
  "Penalty Scored":   { icon: "✅", label: "Penalty Scored", color: "text-da-green" },
  "Own Goal":         { icon: "😬", label: "Own Goal",       color: "text-red-400" },
  "Assist":           { icon: "🅰️", label: "Assist",         color: "text-da-muted" },
  "Yellow Card":      { icon: "🟨", label: "Yellow Card",    color: "text-yellow-400" },
  "Red Card":         { icon: "🟥", label: "Red Card",       color: "text-red-400" },
  "Substitution":     { icon: "🔁", label: "Substitution",   color: "text-da-muted" },
  "Free Kick":        { icon: "🦵", label: "Free Kick",      color: "text-da-muted" },
  "Corner":           { icon: "🚩", label: "Corner",         color: "text-da-muted" },
  "Save":             { icon: "🧤", label: "Save",           color: "text-da-muted" },
  "Penalty":          { icon: "⚽", label: "Penalty",        color: "text-da-green" },
  "Penalty Missed":   { icon: "❌", label: "Penalty Missed", color: "text-red-400" },
  "Possible Penalty": { icon: "🤔", label: "Possible Penalty", color: "text-da-muted" },
  "VAR":              { icon: "📺", label: "VAR Check",      color: "text-da-muted" },
  "VAR Check":        { icon: "📺", label: "VAR Check",      color: "text-da-muted" },
  "Goal Disallowed":  { icon: "❌", label: "Goal Disallowed",color: "text-red-400" },
  "Offside":          { icon: "🚫", label: "Offside",        color: "text-da-muted" },
  "Injury":           { icon: "🩹", label: "Injury",         color: "text-da-muted" },
  "Kick Off":         { icon: "🟢", label: "Kick Off",       color: "text-da-muted" },
  "Custom":           { icon: "📢", label: "Update",         color: "text-da-muted" },
  "HT":               { icon: "⏸️", label: "Half Time",      color: "text-da-muted" },
  "FT":               { icon: "🏁", label: "Full Time",      color: "text-da-muted" },
  "Other":            { icon: "•",  label: "Update",         color: "text-da-muted" },
};

function parseEvents(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

function statusBadge(status) {
  if (LIVE_STATUSES.includes(status)) {
    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold">
      <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>${status === "HT" ? "HALF TIME" : "LIVE"}
    </span>`;
  }
  if (status === "Scheduled") {
    return `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-da-muted">SCHEDULED</span>`;
  }
  if (status === "Postponed") {
    return `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">POSTPONED</span>`;
  }
  if (status === "Cancelled") {
    return `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">CANCELLED</span>`;
  }
  return ""; // finished statuses get a WIN/DRAW/LOSS pill instead
}

function opponentInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function renderEventFeed(events) {
  if (!events.length) return "";
  const rows = events
    .slice()
    .reverse() // most recent first
    .map(e => {
      const meta = EVENT_META[e.type] || EVENT_META["Other"];
      return `<div class="flex items-center gap-2 text-sm">
        <span>${meta.icon}</span>
        <span class="font-medium ${meta.color}">${meta.label}</span>
        ${e.player ? `<span class="text-gray-300">${e.player}</span>` : ""}
        ${e.side === "Opponent" ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">OPP</span>` : ""}
        ${e.minute ? `<span class="text-da-muted ml-auto">${e.minute}</span>` : ""}
      </div>`;
    })
    .join("");
  return `<div class="border-t border-da-border px-5 py-4 bg-black/20 space-y-2">${rows}</div>`;
}

function renderMatchCard(m) {
  const homeScore = Number(m.score_home ?? 0);
  const awayScore = Number(m.score_away ?? 0);
  const opponent = m.opponent || "Opponent";
  const isHome = String(m.venue || "Home").toLowerCase() !== "away";
  const competition = m.competition || "Club Friendlies";
  const status = m.status || "FT";
  const events = parseEvents(m.events);
  const finished = FINISHED_STATUSES.includes(status);

  let resultPill = "";
  let scoreClass = "text-white";
  if (finished) {
    if (homeScore > awayScore) {
      resultPill = `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-da-green/20 text-da-green">WIN</span>`;
      scoreClass = "text-da-green";
    } else if (homeScore < awayScore) {
      resultPill = `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">LOSS</span>`;
      scoreClass = "text-red-400";
    } else {
      resultPill = `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-da-muted">DRAW</span>`;
      scoreClass = "text-da-muted";
    }
  } else {
    resultPill = statusBadge(status);
    if (LIVE_STATUSES.includes(status)) scoreClass = "text-da-green";
  }

  const dateLine = [m.date, m.time].filter(Boolean).join(" · ");

  return `
    <div class="match-card bg-da-card border border-da-border rounded-2xl overflow-hidden">
      <div class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="text-center">
            <div class="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden">
              <img src="assets/crest.png" alt="DA" class="w-full h-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-xs font-black text-black\\'>DA</span>'">
            </div>
            <p class="text-xs mt-1.5 font-medium">DA United</p>
          </div>
          <div class="text-center px-3">
            <div class="flex items-center gap-2 justify-center mb-1">${resultPill}</div>
            <div class="text-2xl font-bold tracking-tight ${scoreClass}">${homeScore} – ${awayScore}</div>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 rounded-full bg-da-border flex items-center justify-center text-sm font-bold text-da-muted">${opponentInitials(opponent)}</div>
            <p class="text-xs mt-1.5 font-medium">${opponent}</p>
          </div>
        </div>
        <div class="text-right text-sm text-da-muted">
          <div>${isHome ? "Home" : "Away"} · ${competition}</div>
          ${dateLine ? `<div class="text-xs mt-0.5">${dateLine}</div>` : ""}
        </div>
      </div>
      ${renderEventFeed(events)}
    </div>
  `;
}

function findLiveMatch(matches) {
  return matches.find(m => LIVE_STATUSES.includes(m.status));
}

function renderLiveBanner(m) {
  const events = parseEvents(m.events);
  const lastEvent = events.length ? events[events.length - 1] : null;
  const lastMeta = lastEvent ? (EVENT_META[lastEvent.type] || EVENT_META["Other"]) : null;

  return `
    <a href="live.html" class="block bg-da-card border border-da-green/40 rounded-2xl p-5 hover:border-da-green transition-colors">
      <div class="flex items-center justify-between gap-3 mb-3">
        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600 text-white text-[10px] font-bold">
          <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          ${m.status === "HT" ? "HALF TIME" : "LIVE"}
        </span>
        ${lastEvent ? `<span class="text-xs text-da-muted">${lastMeta.icon} Latest: ${lastMeta.label}${lastEvent.player ? " — " + lastEvent.player : ""} ${lastEvent.minute || ""}</span>` : ""}
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="font-semibold">DA United</span>
        <span class="text-2xl font-bold tracking-tight text-da-green">${m.score_home ?? 0} – ${m.score_away ?? 0}</span>
        <span class="font-semibold text-right">${m.opponent || "Opponent"}</span>
      </div>
      <p class="text-sm text-da-muted mt-2">Tap to watch on Live →</p>
    </a>
  `;
}

// ===================== LEGACY (manually added) MATCHES =====================
// The games played before Admin took over match entry. They live here only,
// never in the database, so Admin can't duplicate or wipe them.
const LEGACY_MATCHES = [
  {
    opponent: "Ashgrove Students",
    score_home: 2,
    score_away: 3,
    venue: "Away",
    competition: "Club Friendlies",
    scorers: [
      { name: "Victor", minute: "15'" },
      { name: "Victor", minute: "25'" }
    ],
    opp_scorers: []
  },
  {
    opponent: "Delta Big Boys",
    score_home: 2,
    score_away: 1,
    venue: "Home",
    competition: "Club Friendlies",
    scorers: [
      { name: "Ebube", minute: "70'" },
      { name: "Ebube", minute: "90'" }
    ],
    opp_scorers: [{ name: "Savior", minute: "20'" }]
  },
  {
    opponent: "Viking FK",
    score_home: 3,
    score_away: 0,
    venue: "Home",
    competition: "Club Friendlies",
    scorers: [
      { name: "Nmesoma", minute: "12'" },
      { name: "Baseboy", minute: "30'" },
      { name: "Baseboy", minute: "40'" }
    ],
    opp_scorers: []
  },
  {
    opponent: "Delta Big Boys",
    score_home: 3,
    score_away: 1,
    venue: "Away",
    competition: "Club Friendlies",
    scorers: [
      { name: "Emma", minute: "40'" },
      { name: "Zubby", minute: "75'" },
      { name: "Ebube", minute: "90+5'" }
    ],
    opp_scorers: [{ name: "Wilson", minute: "30'" }]
  },
  {
    opponent: "Higher Ground FC",
    score_home: 4,
    score_away: 3,
    venue: "Home",
    competition: "Club Friendlies",
    scorers: [
      { name: "Miracle", minute: "45+5'" },
      { name: "Emma", minute: "47'" },
      { name: "Ebube", minute: "60'" },
      { name: "Emma", minute: "90+7'" }
    ],
    opp_scorers: [
      { name: "Chiboy", minute: "12'" },
      { name: "Mheera", minute: "23'" },
      { name: "Timo", minute: "35'" }
    ]
  }
];

function renderLegacyMatchCard(m) {
  const homeScore = m.score_home;
  const awayScore = m.score_away;
  const isHome = String(m.venue || "Home").toLowerCase() !== "away";
  let resultPill, scoreClass;
  if (homeScore > awayScore) {
    resultPill = `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-da-green/20 text-da-green">WIN</span>`;
    scoreClass = "text-da-green";
  } else if (homeScore < awayScore) {
    resultPill = `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">LOSS</span>`;
    scoreClass = "text-red-400";
  } else {
    resultPill = `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-da-muted">DRAW</span>`;
    scoreClass = "text-da-muted";
  }

  const daList = m.scorers.length
    ? m.scorers.map(s => `<li>${s.name} <span class="text-da-muted">${s.minute}</span></li>`).join("")
    : `<li class="text-da-muted italic">Scorers not recorded</li>`;
  const oppList = m.opp_scorers.length
    ? m.opp_scorers.map(s => `<li>${s.name} <span class="text-da-muted">${s.minute}</span></li>`).join("")
    : `<li class="text-da-muted italic">No goals</li>`;

  return `
    <div class="match-card bg-da-card border border-da-border rounded-2xl overflow-hidden">
      <div class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="text-center">
            <div class="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden">
              <img src="assets/crest.png" alt="DA" class="w-full h-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-xs font-black text-black\\'>DA</span>'">
            </div>
            <p class="text-xs mt-1.5 font-medium">DA United</p>
          </div>
          <div class="text-center px-3">
            <div class="flex items-center gap-2 justify-center mb-1">${resultPill}</div>
            <div class="text-2xl font-bold tracking-tight ${scoreClass}">${homeScore} – ${awayScore}</div>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 rounded-full bg-da-border flex items-center justify-center text-sm font-bold text-da-muted">${opponentInitials(m.opponent)}</div>
            <p class="text-xs mt-1.5 font-medium">${m.opponent}</p>
          </div>
        </div>
        <div class="text-right text-sm text-da-muted">
          <div>${isHome ? "Home" : "Away"} · ${m.competition}</div>
        </div>
      </div>
      <div class="border-t border-da-border px-5 py-4 bg-black/20">
        <p class="text-[11px] font-semibold tracking-wider text-da-muted uppercase mb-3">Goal Scorers</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-da-green font-medium mb-1.5">DA United</p>
            <ul class="space-y-1 text-gray-300">${daList}</ul>
          </div>
          <div>
            <p class="text-red-400 font-medium mb-1.5">${m.opponent}</p>
            <ul class="space-y-1 text-gray-300">${oppList}</ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

// One game = one key, so a legacy game that also gets typed into Admin
// later only appears once.
function matchKey(opponent, home, away, venue) {
  const isHome = String(venue || "Home").toLowerCase() !== "away";
  return `${String(opponent || "").trim().toLowerCase()}|${Number(home) || 0}-${Number(away) || 0}|${isHome ? "h" : "a"}`;
}

function renderAllMatches(dbMatches) {
  const listEl = document.getElementById("matches-list");
  const emptyEl = document.getElementById("matches-empty");
  if (!listEl) return;

  const seen = new Set();
  const cards = [];

  // Newest DB matches first
  dbMatches.forEach(m => {
    seen.add(matchKey(m.opponent, m.score_home, m.score_away, m.venue));
    cards.push(renderMatchCard(m));
  });

  // Then the old manual games
  LEGACY_MATCHES.forEach(m => {
    const key = matchKey(m.opponent, m.score_home, m.score_away, m.venue);
    if (seen.has(key)) return;
    seen.add(key);
    cards.push(renderLegacyMatchCard(m));
  });

  if (cards.length === 0) {
    if (emptyEl) emptyEl.classList.remove("hidden");
    listEl.innerHTML = "";
    return;
  }

  if (emptyEl) emptyEl.classList.add("hidden");
  listEl.innerHTML = cards.join("");
}

async function loadMatches() {
  const listEl = document.getElementById("matches-list");
  const liveEmpty = document.getElementById("live-empty");
  const liveMatch = document.getElementById("live-match");
  if (!listEl) return;

  // No Supabase yet? Still show the old games instead of "Loading matches..."
  if (!window.supabaseClient) {
    renderAllMatches([]);
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Matches load error", error);

    const all = data || [];
    renderAllMatches(all);

    // Live status comes from the match's OWN status field.
    const live = findLiveMatch(all);
    if (live && liveMatch && liveEmpty) {
      liveEmpty.classList.add("hidden");
      liveMatch.classList.remove("hidden");
      liveMatch.innerHTML = renderLiveBanner(live);
    } else if (liveMatch && liveEmpty) {
      liveEmpty.classList.remove("hidden");
      liveMatch.classList.add("hidden");
      liveMatch.innerHTML = "";
    }
  } catch (e) {
    console.error("Matches error", e);
    renderAllMatches([]);
  }
}

function initMatches() {
  if (window.supabaseClient) {
    loadMatches();
    window.supabaseClient
      .channel("matches-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => loadMatches())
      .subscribe();
  } else {
    renderAllMatches([]); // show old games immediately
    setTimeout(initMatches, 100);
  }
}

initMatches();
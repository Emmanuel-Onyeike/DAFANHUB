// ======================
// DA United – Matches (Supabase + past results + live match banner)
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

// ===== Keep your existing past results =====
const PAST_MATCHES = [
  {
    opponent: "Ashgrove",
    home_score: 3,
    away_score: 4,
    venue_type: "away",
    competition: "Club Friendlies",
    scorers: [
      { name: "Victor", minute: "15'" },
      { name: "Victor", minute: "25'" },
      { name: "Baseboy", minute: "50'" }
    ],
    opp_scorers: []
  },
  {
    opponent: "Delta Big Boys",
    home_score: 2,
    away_score: 1,
    venue_type: "home",
    competition: "Club Friendlies",
    scorers: [
      { name: "Ebube", minute: "70'" },
      { name: "Ebube", minute: "90'" }
    ],
    opp_scorers: [
      { name: "Savior", minute: "20'" }
    ]
  },
  {
    opponent: "Viking FK",
    home_score: 3,
    away_score: 0,
    venue_type: "home",
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
    home_score: 3,
    away_score: 1,
    venue_type: "away",
    competition: "Club Friendlies",
    scorers: [
      { name: "Emma", minute: "40'" },
      { name: "Zubby", minute: "75'" },
      { name: "Ebube", minute: "90+5'" }
    ],
    opp_scorers: [
      { name: "Wilson", minute: "30'" }
    ]
  }
];

function opponentInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function parseScorers(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return raw.split(",").map(s => s.trim()).filter(Boolean).map(s => {
      const m = s.match(/^(.+?)\s+(\d+\+?\d*'?)$/);
      if (m) return { name: m[1].trim(), minute: m[2] };
      return { name: s, minute: "" };
    });
  }
  return [];
}

function renderMatchCard(m) {
  const homeScore = Number(m.home_score ?? m.score_home ?? 0);
  const awayScore = Number(m.away_score ?? m.score_away ?? 0);
  const opponent = m.opponent || m.away || "Opponent";
  const isHome = (m.venue_type || m.home_away || m.venue || "home").toLowerCase() !== "away";
  const competition = m.competition || "Club Friendlies";
  const venueLabel = isHome ? "Home" : "Away";

  let result = "DRAW";
  let scoreClass = "text-da-muted";
  let resultClass = "text-da-muted/80";

  if (homeScore > awayScore) {
    result = "WIN";
    scoreClass = "text-da-green";
    resultClass = "text-da-green/80";
  } else if (homeScore < awayScore) {
    result = "LOSS";
    scoreClass = "text-red-400";
    resultClass = "text-red-400/80";
  }

  const daScorers = parseScorers(m.scorers || m.da_scorers || m.goal_scorers);
  const oppScorers = parseScorers(m.opp_scorers || m.opponent_scorers);

  const daList = daScorers.length
    ? daScorers.map(s => `<li>${s.name || s} ${s.minute ? `<span class="text-da-muted">${s.minute}</span>` : ""}</li>`).join("")
    : `<li class="text-da-muted italic">Scorers not recorded</li>`;

  const oppList = oppScorers.length
    ? oppScorers.map(s => `<li>${s.name || s} ${s.minute ? `<span class="text-da-muted">${s.minute}</span>` : ""}</li>`).join("")
    : `<li class="text-da-muted italic">${homeScore < awayScore || awayScore > 0 ? "Scorers not recorded" : "No goals"}</li>`;

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
            <div class="text-2xl font-bold tracking-tight ${scoreClass}">${homeScore} – ${awayScore}</div>
            <div class="text-[10px] font-bold ${resultClass} mt-0.5">${result}</div>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 rounded-full bg-da-border flex items-center justify-center text-sm font-bold text-da-muted">${opponentInitials(opponent)}</div>
            <p class="text-xs mt-1.5 font-medium">${opponent}</p>
          </div>
        </div>
        <div class="text-right text-sm text-da-muted">
          <div>${venueLabel} · ${competition}</div>
          ${m.date ? `<div class="text-xs mt-0.5">${m.date}${m.time ? " · " + m.time : ""}</div>` : ""}
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
            <p class="text-red-400 font-medium mb-1.5">${opponent}</p>
            <ul class="space-y-1 text-gray-300">${oppList}</ul>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===================== LIVE MATCH BANNER =====================
// Same live-state logic as the dashboard's Match Centre card:
// WE ARE LIVE (red dot) -> latest event -> FULL TIME / INTERRUPTED / CANCELLED.
function venueSideLabels(venue) {
  const daIsHome = (venue || "Home") !== "Away";
  return {
    da: daIsHome ? "Home" : "Away",
    opp: daIsHome ? "Away" : "Home"
  };
}

function eventLiveLine(e, venue) {
  const labels = venueSideLabels(venue);
  const sideLabel = e.side === "Opponent" ? labels.opp : labels.da;
  const otherLabel = sideLabel === labels.da ? labels.opp : labels.da;
  const player = e.player || "";
  const min = e.minute ? `${e.minute}'` : "";
  const pfx = player ? ` - ${player}` : "";

  switch (e.type) {
    case "Goal": return { main: `GOAL${pfx}`, badge: `${sideLabel} scores`, min };
    case "Golazo": return { main: `A STUNNING GOAL${pfx}`, badge: `${sideLabel} scores`, min };
    case "Own Goal": return { main: `OWN GOAL${pfx}`, badge: `${otherLabel} scores`, min };
    case "Free Kick Goal": return { main: `A STUNNING FREE KICK${pfx}`, badge: `${sideLabel} scores`, min };
    case "Penalty Scored": return { main: `PENALTY SCORED${pfx}`, badge: `${sideLabel} scores`, min };
    case "Penalty Missed": return { main: `PENALTY MISSED${pfx}`, badge: null, min };
    case "Possible Penalty": return { main: "WHAT CAN THIS BE?", badge: null, min };
    case "Possible Free Kick": return { main: "POSSIBLE FREE KICK", badge: null, min };
    case "Yellow Card": return { main: `YELLOW CARD${pfx}`, badge: `${sideLabel} gets a booking`, min };
    case "Red Card": return { main: `RED CARD${pfx}`, badge: `${sideLabel} down to 10 men`, min };
    case "Substitution": return { main: `SUBSTITUTION${pfx}`, badge: null, min };
    case "VAR Check": return { main: "WHAT CAN THIS BE?", badge: null, min };
    case "Goal Disallowed": return { main: "VAR: GOAL DISALLOWED", badge: null, min };
    case "Offside": return { main: `OFFSIDE${pfx}`, badge: null, min };
    case "Injury": return { main: `INJURY${pfx}`, badge: null, min };
    case "Custom": return { main: (e.detail || "UPDATE").toUpperCase(), badge: null, min };
    case "Kick Off": return { main: "Game underway", badge: null, min: "" };
    default: return { main: `${e.type}${pfx}`, badge: null, min };
  }
}

function matchStateCopy(match) {
  const status = match.status || "Scheduled";
  if (status === "Scheduled") return null;

  const events = match.events ? (typeof match.events === "string" ? JSON.parse(match.events) : match.events) : [];
  const lastEvent = events.length ? events[events.length - 1] : null;

  let headerLabel = "MATCH UPDATE";
  let dotClass = "bg-da-muted";
  let sub = { main: "", badge: null, min: "" };
  let showX = false;

  if (status === "Live") {
    const hasRealEvent = lastEvent && lastEvent.type !== "Kick Off";
    headerLabel = hasRealEvent ? "LIVE" : "WE ARE LIVE";
    dotClass = "bg-red-500 animate-pulse";
    sub = lastEvent ? eventLiveLine(lastEvent, match.venue) : { main: "Game underway", badge: null, min: "" };
  } else if (status === "HT") {
    headerLabel = "HALF TIME";
    dotClass = "bg-yellow-400";
    sub = { main: "Game is paused at the break", badge: null, min: "" };
  } else if (status === "FT" || status === "AET" || status === "Penalties") {
    headerLabel = "FULL TIME";
    dotClass = "bg-da-muted";
    sub = { main: "Game ended", badge: null, min: "" };
  } else if (status === "Postponed") {
    headerLabel = "INTERRUPTED";
    dotClass = "bg-yellow-400";
    sub = { main: "Game is paused", badge: null, min: "" };
  } else if (status === "Cancelled") {
    headerLabel = "CANCELLED";
    dotClass = "bg-red-500";
    sub = { main: "Game cancelled", badge: null, min: "" };
    showX = true;
  }

  return { headerLabel, dotClass, sub, showX, status };
}

function renderLiveBanner(match, state) {
  const opponent = match.opponent || "Opponent";
  const scoreHome = match.score_home ?? 0;
  const scoreAway = match.score_away ?? 0;
  const headerColorClass = state.status === "Cancelled" ? "text-red-400" : "text-white";

  return `
    <a href="live.html" class="block bg-da-card border ${state.status === "Live" ? "border-da-green/40 hover:border-da-green" : "border-da-border"} rounded-2xl p-5 transition-colors">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full ${state.dotClass}"></span>
          <span class="text-[11px] font-semibold tracking-wider uppercase ${headerColorClass}">${state.headerLabel}</span>
        </div>
        ${state.showX ? `<span class="text-red-400 text-lg font-bold">✕</span>` : ""}
      </div>
      <div class="mb-3">
        <span class="text-sm font-semibold">${state.sub.main}</span>
        ${state.sub.badge ? `<span class="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-da-green/15 text-da-green">${state.sub.badge}</span>` : ""}
        ${state.sub.min ? `<span class="ml-2 text-xs text-da-muted">${state.sub.min}</span>` : ""}
      </div>
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-col items-center gap-1 min-w-0">
          <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="assets/crest.png" alt="DA" class="w-full h-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-xs font-black text-black\\'>DA</span>'">
          </div>
          <span class="text-xs font-medium truncate">DA United</span>
          <span class="text-xl font-bold">${scoreHome}</span>
        </div>
        <div class="text-da-muted text-sm font-semibold px-2">vs</div>
        <div class="flex flex-col items-center gap-1 min-w-0">
          <div class="w-10 h-10 rounded-full bg-da-border flex items-center justify-center text-xs font-bold text-da-muted flex-shrink-0">${opponentInitials(opponent)}</div>
          <span class="text-xs font-medium truncate text-center">${opponent}</span>
          <span class="text-xl font-bold">${scoreAway}</span>
        </div>
      </div>
      <p class="text-sm text-da-muted mt-3">Tap to watch on Live →</p>
    </a>
  `;
}

async function loadMatches() {
  if (!window.supabaseClient) {
    const listEl = document.getElementById("matches-list");
    const emptyEl = document.getElementById("matches-empty");
    if (listEl) {
      emptyEl.classList.add("hidden");
      listEl.innerHTML = PAST_MATCHES.map(renderMatchCard).join("");
    }
    return;
  }

  const listEl = document.getElementById("matches-list");
  const emptyEl = document.getElementById("matches-empty");
  const liveEmpty = document.getElementById("live-empty");
  const liveMatch = document.getElementById("live-match");

  try {
    const { data: dbMatches, error } = await window.supabaseClient
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Matches load error", error);

    const fromDb = dbMatches || [];
    const all = [...fromDb, ...PAST_MATCHES];

    if (all.length === 0) {
      emptyEl.classList.remove("hidden");
      listEl.innerHTML = "";
    } else {
      emptyEl.classList.add("hidden");
      listEl.innerHTML = all.map(renderMatchCard).join("");
    }

    // Live match banner — driven by the most recently touched match's
    // status + latest event, not just a simple on/off flag.
    const { data: mostRecent } = await window.supabaseClient
      .from("matches")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const state = mostRecent ? matchStateCopy(mostRecent) : null;

    if (state) {
      liveEmpty.classList.add("hidden");
      liveMatch.classList.remove("hidden");
      liveMatch.innerHTML = renderLiveBanner(mostRecent, state);
    } else {
      liveEmpty.classList.remove("hidden");
      liveMatch.classList.add("hidden");
      liveMatch.innerHTML = "";
    }
  } catch (e) {
    console.error("Matches error", e);
    emptyEl.classList.add("hidden");
    listEl.innerHTML = PAST_MATCHES.map(renderMatchCard).join("");
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
    const listEl = document.getElementById("matches-list");
    const emptyEl = document.getElementById("matches-empty");
    if (listEl) {
      emptyEl.classList.add("hidden");
      listEl.innerHTML = PAST_MATCHES.map(renderMatchCard).join("");
    }
    setTimeout(initMatches, 100);
  }
}

initMatches();

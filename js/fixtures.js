// ======================
// DA United – Fixtures (Supabase)
// Upcoming = fixtures table
// Past Results = LEGACY_RESULTS (old manual games) + matches table (new, from Admin)
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

// ===================== UPCOMING =====================
async function loadUpcoming() {
  const empty = document.getElementById("upcoming-empty");
  const list = document.getElementById("upcoming-list");

  if (!window.supabaseClient) return;

  try {
    const { data, error } = await window.supabaseClient
      .from("fixtures")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      empty.classList.remove("hidden");
      list.classList.add("hidden");
      return;
    }

    empty.classList.add("hidden");
    list.classList.remove("hidden");

    list.innerHTML = `
      <div class="bg-da-card border border-da-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex items-center gap-4 min-w-0 flex-1">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-da-green/20 text-da-green">UPCOMING</span>
              <span class="text-xs text-da-muted">${data.venue || "Venue TBA"}</span>
            </div>
            <h3 class="font-semibold text-base truncate">${data.home || "DA United"} vs ${data.away || "Opponent"}</h3>
            <p class="text-xs text-da-muted mt-0.5">${data.competition || "Club Friendlies"} · ${data.date || ""} ${data.time || ""}</p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm font-medium text-da-muted">${data.date || "TBA"}</div>
          <div class="text-xs text-da-muted">${data.time || ""}</div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error("Fixture load error", e);
    empty.classList.remove("hidden");
    list.classList.add("hidden");
  }
}

// ===================== LEGACY (manually added) RESULTS =====================
// These are the games played before Admin took over match entry.
// They are NOT in the database — they live here only, so they can never
// be duplicated by, or lost to, an Admin edit. From now on every NEW
// result is added from Admin and comes out of the matches table below.
const LEGACY_RESULTS = [
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

const FINISHED_STATUSES = ["FT", "AET", "Penalties"];

function opponentResultPill(homeScore, awayScore) {
  if (homeScore > awayScore) return `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-da-green/20 text-da-green">WIN</span>`;
  if (homeScore < awayScore) return `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">LOSS</span>`;
  return `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-da-muted">DRAW</span>`;
}

// One game = one key. Used so a legacy game that ALSO gets typed into
// Admin later doesn't show up twice on this page.
function resultKey(opponent, home, away, isHome) {
  return `${String(opponent || "").trim().toLowerCase()}|${home}-${away}|${isHome ? "h" : "a"}`;
}

function scorerLine(list) {
  if (!list || !list.length) return "";
  return list.map(s => `${s.name}${s.minute ? " " + s.minute : ""}`).join(", ");
}

function pastResultCard(r) {
  const home = Number(r.score_home ?? 0);
  const away = Number(r.score_away ?? 0);
  const isHome = String(r.venue || "Home").toLowerCase() !== "away";
  const scoreClass = home > away ? "text-da-green" : home < away ? "text-red-400" : "text-da-muted";
  const opponent = r.opponent || "Opponent";
  const daGoals = scorerLine(r.scorers);
  const oppGoals = scorerLine(r.opp_scorers);

  const goalsLine = (daGoals || oppGoals)
    ? `<div class="mt-2 text-xs text-da-muted space-y-0.5">
         ${daGoals ? `<div><span class="text-da-green font-medium">DA United:</span> ${daGoals}</div>` : ""}
         ${oppGoals ? `<div><span class="text-red-400 font-medium">${opponent}:</span> ${oppGoals}</div>` : ""}
       </div>`
    : "";

  return `
    <div class="fixture-card bg-da-card border border-da-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex items-center gap-4 min-w-0 flex-1">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1">
            ${opponentResultPill(home, away)}
            <span class="text-xs text-da-muted">${isHome ? "Home" : "Away"}</span>
          </div>
          <h3 class="font-semibold text-base truncate">DA United vs ${opponent}</h3>
          <p class="text-xs text-da-muted mt-0.5">${r.competition || "Club Friendlies"}${isHome ? " · DA United Stadium" : " · Their Home"}</p>
          ${goalsLine}
        </div>
      </div>
      <div class="text-right">
        <div class="text-xl font-bold tracking-tight ${scoreClass}">${home} – ${away}</div>
        <div class="text-xs text-da-muted">${[r.date, r.time].filter(Boolean).join(" · ") || "Final"}</div>
      </div>
    </div>
  `;
}

function dbMatchToResult(m) {
  let scorers = [];
  let oppScorers = [];
  try {
    const events = m.events
      ? (typeof m.events === "string" ? JSON.parse(m.events) : m.events)
      : [];
    const goalTypes = ["Goal", "Golazo", "Free Kick Goal", "Penalty Scored", "Own Goal"];
    (Array.isArray(events) ? events : []).forEach(e => {
      if (!goalTypes.includes(e.type)) return;
      const entry = { name: e.player || "Unknown", minute: e.minute ? `${e.minute}'` : "" };
      if (e.side === "Opponent") oppScorers.push(entry);
      else scorers.push(entry);
    });
  } catch (err) {
    console.warn("Could not read events for match", m.id, err);
  }

  return {
    opponent: m.opponent,
    score_home: m.score_home,
    score_away: m.score_away,
    venue: m.venue,
    competition: m.competition,
    date: m.date,
    time: m.time,
    scorers,
    opp_scorers: oppScorers
  };
}

async function loadPastResults() {
  const listEl = document.getElementById("past-fixtures");
  const emptyEl = document.getElementById("past-empty");
  if (!listEl) return;

  let dbResults = [];

  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient
        .from("matches")
        .select("*")
        .in("status", FINISHED_STATUSES)
        .order("created_at", { ascending: false });

      if (error) console.error("Past results load error", error);
      dbResults = (data || []).map(dbMatchToResult);
    } catch (e) {
      console.error("Past results error", e);
    }
  }

  // Newest (Admin) first, then the old manual games underneath.
  const seen = new Set();
  const all = [];

  [...dbResults, ...LEGACY_RESULTS].forEach(r => {
    const home = Number(r.score_home ?? 0);
    const away = Number(r.score_away ?? 0);
    const isHome = String(r.venue || "Home").toLowerCase() !== "away";
    const key = resultKey(r.opponent, home, away, isHome);
    if (seen.has(key)) return; // already shown — kills the duplicate cards
    seen.add(key);
    all.push(r);
  });

  if (all.length === 0) {
    if (emptyEl) emptyEl.classList.remove("hidden");
    listEl.innerHTML = "";
    return;
  }

  if (emptyEl) emptyEl.classList.add("hidden");
  listEl.innerHTML = all.map(pastResultCard).join("");
}

// ===================== INIT =====================
function initFixtures() {
  if (window.supabaseClient) {
    loadUpcoming();
    loadPastResults();
    window.supabaseClient
      .channel("fixtures-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "fixtures" }, () => loadUpcoming())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => loadPastResults())
      .subscribe();
  } else {
    // Still show the old results even if Supabase hasn't loaded yet
    loadPastResults();
    setTimeout(initFixtures, 100);
  }
}

initFixtures();
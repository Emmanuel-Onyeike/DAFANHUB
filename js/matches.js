// ======================
// DA United – Matches (Supabase + past results kept)
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
  const isHome = (m.venue_type || m.home_away || "home").toLowerCase() !== "away";
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

async function loadMatches() {
  if (!window.supabaseClient) {
    // Still show past matches even if Supabase not ready
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
    // New matches from Admin / Supabase (newest first)
    const { data: dbMatches, error } = await window.supabaseClient
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Matches load error", error);

    const fromDb = dbMatches || [];

    // Combine: new ones first, then your 4 past results
    const all = [...fromDb, ...PAST_MATCHES];

    if (all.length === 0) {
      emptyEl.classList.remove("hidden");
      listEl.innerHTML = "";
    } else {
      emptyEl.classList.add("hidden");
      listEl.innerHTML = all.map(renderMatchCard).join("");
    }

    // Live status
    const { data: live } = await window.supabaseClient
      .from("live")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const anyLive = live && (
      live.is_live === true ||
      live.screen_1_active || live.screen_2_active || live.screen_3_active ||
      live.screen_4_active || live.screen_5_active
    );

    if (anyLive) {
      liveEmpty.classList.add("hidden");
      liveMatch.classList.remove("hidden");
      liveMatch.innerHTML = `
        <a href="live.html" class="block bg-da-card border border-da-green/40 rounded-2xl p-5 hover:border-da-green transition-colors">
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600 text-white text-[10px] font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              LIVE
            </span>
            <span class="font-semibold">${live.title || "Match in progress"}</span>
          </div>
          <p class="text-sm text-da-muted mt-2">Tap to watch on Live →</p>
        </a>
      `;
    } else {
      liveEmpty.classList.remove("hidden");
      liveMatch.classList.add("hidden");
      liveMatch.innerHTML = "";
    }
  } catch (e) {
    console.error("Matches error", e);
    // Fallback: still show past matches
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
      .on("postgres_changes", { event: "*", schema: "public", table: "live" }, () => loadMatches())
      .subscribe();
  } else {
    // Show past matches immediately, retry Supabase
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
// ======================
// DA United – Squad (Supabase)
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

// ----- Squad data -----
const playersGrid = document.getElementById("players-grid");
const emptySquad = document.getElementById("empty-squad");
const filterButtons = document.querySelectorAll(".filter-btn");

let allPlayers = [];
let currentFilter = "ALL";

function normalizePosition(pos) {
  if (!pos) return "MID";
  const p = String(pos).toUpperCase().trim();
  if (p === "GK" || p === "GOALKEEPER" || p === "G") return "GK";
  if (p === "DEF" || p === "DEFENDER" || p === "CB" || p === "LB" || p === "RB" || p === "D") return "DEF";
  if (p === "MID" || p === "MIDFIELDER" || p === "CM" || p === "CDM" || p === "CAM" || p === "M") return "MID";
  if (p === "FWD" || p === "FORWARD" || p === "ST" || p === "CF" || p === "LW" || p === "RW" || p === "F") return "FWD";
  return "MID";
}

function playerCardHTML(player) {
  const pos = normalizePosition(player.position);
  const name = player.name || "Player";
  const role = player.role || player.title || pos;
  const photo = player.photo_url || player.photo || "";
  const apps = player.apps ?? player.appearances ?? 0;
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;

  const photoHTML = photo
    ? `<img src="${photo}" alt="${name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
    : "";

  return `
    <article class="player-card group bg-da-card border border-da-border rounded-2xl overflow-hidden" data-position="${pos}">
      <div class="relative aspect-[4/3] bg-[#111] overflow-hidden">
        ${photoHTML}
        <div class="${photo ? "hidden" : "flex"} absolute inset-0 items-center justify-center text-da-muted text-sm">No photo</div>
        <span class="absolute top-3 left-3 text-[10px] font-bold tracking-wider bg-black/60 backdrop-blur px-2 py-1 rounded-md">${pos}</span>
      </div>
      <div class="p-4">
        <p class="text-[10px] font-semibold tracking-wider text-da-green uppercase mb-1">${role}</p>
        <h3 class="font-semibold text-base mb-3 truncate">${name}</h3>
        <div class="h-px bg-da-border mb-3"></div>
        <div class="flex justify-between text-center">
          <div>
            <div class="text-lg font-bold">${apps}</div>
            <div class="text-[10px] text-da-muted">Apps</div>
          </div>
          <div>
            <div class="text-lg font-bold">${goals}</div>
            <div class="text-[10px] text-da-muted">Goals</div>
          </div>
          <div>
            <div class="text-lg font-bold">${assists}</div>
            <div class="text-[10px] text-da-muted">Assists</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderPlayers() {
  if (!playersGrid) return;

  const filtered = currentFilter === "ALL"
    ? allPlayers
    : allPlayers.filter(p => normalizePosition(p.position) === currentFilter);

  if (filtered.length === 0) {
    playersGrid.innerHTML = "";
    if (emptySquad) emptySquad.classList.remove("hidden");
    return;
  }

  if (emptySquad) emptySquad.classList.add("hidden");
  playersGrid.innerHTML = filtered.map(playerCardHTML).join("");
}

function setActiveFilter(btn) {
  filterButtons.forEach(b => {
    b.classList.remove("active", "bg-da-green", "text-black", "font-semibold");
    b.classList.add("bg-white/5", "text-gray-300", "font-medium");
  });
  btn.classList.add("active", "bg-da-green", "text-black", "font-semibold");
  btn.classList.remove("bg-white/5", "text-gray-300", "font-medium");
}

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter || "ALL";
    setActiveFilter(btn);
    renderPlayers();
  });
});

async function loadPlayers() {
  if (!window.supabaseClient) return;

  try {
    const { data, error } = await window.supabaseClient
      .from("players")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Squad load error", error);
      allPlayers = [];
    } else {
      allPlayers = data || [];
    }

    renderPlayers();
  } catch (e) {
    console.error("Squad load error", e);
    allPlayers = [];
    renderPlayers();
  }
}

function initSquad() {
  if (window.supabaseClient) {
    loadPlayers();

    // Live updates when Admin adds/edits/deletes players
    window.supabaseClient
      .channel("squad-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        loadPlayers();
      })
      .subscribe();
  } else {
    setTimeout(initSquad, 100);
  }
}

initSquad();
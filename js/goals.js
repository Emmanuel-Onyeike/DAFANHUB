// ======================
// DA United – Goals & Assists (Supabase)
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

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function renderRow(rank, name, value) {
  const pad = String(rank).padStart(2, "0");
  return `
    <div class="flex items-center gap-3 p-3 rounded-xl bg-black/30">
      <span class="text-xs text-da-muted w-6">${pad}</span>
      <div class="w-9 h-9 rounded-full bg-da-green/20 flex items-center justify-center text-xs font-bold text-da-green">${initials(name)}</div>
      <span class="flex-1 font-medium truncate">${name || "Unknown"}</span>
      <span class="text-xl font-bold text-da-green">${value}</span>
    </div>
  `;
}

async function loadGoalsAssists() {
  if (!window.supabaseClient) return;

  const goalsList = document.getElementById("goals-list");
  const assistsList = document.getElementById("assists-list");
  const goalsEmpty = document.getElementById("goals-empty");
  const assistsEmpty = document.getElementById("assists-empty");

  try {
    const { data: players, error } = await window.supabaseClient
      .from("players")
      .select("id, name, goals, assists")
      .order("name", { ascending: true });

    if (error) {
      console.error("Goals load error", error);
      return;
    }

    const list = players || [];

    // Goals leaders (goals > 0), sorted desc
    const scorers = list
      .filter(p => (Number(p.goals) || 0) > 0)
      .sort((a, b) => (Number(b.goals) || 0) - (Number(a.goals) || 0));

    // Assists leaders (assists > 0), sorted desc
    const assistLeaders = list
      .filter(p => (Number(p.assists) || 0) > 0)
      .sort((a, b) => (Number(b.assists) || 0) - (Number(a.assists) || 0));

    if (scorers.length === 0) {
      goalsEmpty.classList.remove("hidden");
      goalsList.innerHTML = "";
    } else {
      goalsEmpty.classList.add("hidden");
      goalsList.innerHTML = scorers.map((p, i) => renderRow(i + 1, p.name, Number(p.goals) || 0)).join("");
    }

    if (assistLeaders.length === 0) {
      assistsEmpty.classList.remove("hidden");
      assistsList.innerHTML = "";
    } else {
      assistsEmpty.classList.add("hidden");
      assistsList.innerHTML = assistLeaders.map((p, i) => renderRow(i + 1, p.name, Number(p.assists) || 0)).join("");
    }
  } catch (e) {
    console.error("Goals error", e);
  }
}

function initGoals() {
  if (window.supabaseClient) {
    loadGoalsAssists();
    window.supabaseClient
      .channel("goals-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => loadGoalsAssists())
      .subscribe();
  } else {
    setTimeout(initGoals, 100);
  }
}

initGoals();
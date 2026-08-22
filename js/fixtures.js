// ======================
// DA United – Fixtures (Supabase)
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

function initFixtures() {
  if (window.supabaseClient) {
    loadUpcoming();
    window.supabaseClient
      .channel("fixtures-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "fixtures" }, () => loadUpcoming())
      .subscribe();
  } else {
    setTimeout(initFixtures, 100);
  }
}

initFixtures();
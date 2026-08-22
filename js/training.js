// ======================
// DA United – Training (Supabase)
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

// ----- Training sessions -----
const trainingList = document.getElementById("training-list");
const trainingEmpty = document.getElementById("training-empty");
const trainingNote = document.getElementById("training-note");

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "";
  }
}

function statusBadge(status) {
  const s = (status || "closed").toLowerCase();
  if (s === "open" || s === "live" || s === "upcoming") {
    return `<span class="text-xs font-medium px-3 py-1.5 rounded-full bg-da-green/15 text-da-green">Open session</span>`;
  }
  if (s === "completed" || s === "done") {
    return `<span class="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 text-da-muted">Completed</span>`;
  }
  // default closed
  return `<span class="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 text-da-muted">Closed session</span>`;
}

function sessionCardHTML(session) {
  const type = session.type || session.category || "Technical";
  const title = session.title || session.name || "Training session";
  const venue = session.venue || session.location || "DA United Training Ground";
  const status = session.status || "closed";
  const date = formatDate(session.date || session.session_date || session.created_at);
  const statusText = (status || "").toLowerCase() === "completed" || (status || "").toLowerCase() === "done"
    ? "Completed"
    : date || "—";

  return `
    <div class="bg-da-card border border-da-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-start gap-4">
        <div class="w-11 h-11 rounded-xl bg-da-green/15 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-da-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div>
          <p class="text-[10px] font-semibold tracking-wider text-da-green uppercase mb-0.5">${type}</p>
          <h3 class="font-semibold text-base">${title}</h3>
          <p class="text-sm text-da-muted mt-0.5">${venue}</p>
        </div>
      </div>
      <div class="flex items-center gap-3 sm:text-right">
        <div class="text-sm text-da-muted">
          <div>${statusText}</div>
        </div>
        ${statusBadge(status)}
      </div>
    </div>
  `;
}

function renderSessions(sessions) {
  if (!trainingList) return;

  if (!sessions || sessions.length === 0) {
    trainingList.innerHTML = "";
    if (trainingEmpty) trainingEmpty.classList.remove("hidden");
    if (trainingNote) trainingNote.classList.add("hidden");
    return;
  }

  if (trainingEmpty) trainingEmpty.classList.add("hidden");
  if (trainingNote) trainingNote.classList.remove("hidden");
  trainingList.innerHTML = sessions.map(sessionCardHTML).join("");
}

async function loadTraining() {
  if (!window.supabaseClient) return;

  try {
    const { data, error } = await window.supabaseClient
      .from("training")
      .select("*")
      .order("created_at", { ascending: false });

    // Fallback table name if you used training_sessions
    let sessions = data;
    if (error) {
      console.warn("training table error, trying training_sessions", error);
      const res2 = await window.supabaseClient
        .from("training_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      sessions = res2.data || [];
    }

    renderSessions(sessions || []);
  } catch (e) {
    console.error("Training load error", e);
    renderSessions([]);
  }
}

function initTraining() {
  if (window.supabaseClient) {
    loadTraining();

    // Real-time updates
    window.supabaseClient
      .channel("training-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "training" }, () => loadTraining())
      .on("postgres_changes", { event: "*", schema: "public", table: "training_sessions" }, () => loadTraining())
      .subscribe();
  } else {
    setTimeout(initTraining, 100);
  }
}

initTraining();
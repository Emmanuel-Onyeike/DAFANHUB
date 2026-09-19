// ======================
// DA United – Dashboard (Supabase + Sticky Notifications + Update Gate)
// ======================

const APP_VERSION = "v2";

// ===================== UPDATE GATE =====================
// Pure black screen + centered modal, shown only when this visitor's
// stored app version doesn't match APP_VERSION. Settings.js sets the
// version flag once the update flow finishes, so this never shows
// again after that.
(function updateGate() {
  const gate = document.getElementById("da-update-gate");
  if (!gate) return;
  const seen = localStorage.getItem("da_app_version");
  if (seen !== APP_VERSION) {
    gate.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
})();

// ----- VAPID Public Key -----
const vapidPublicKey = 'BAl4qRWELwQHmC9P2RpigIUYaVom5hlwzaPDfoGwuyVzhFg6V7nFn5GHZ7IziUM-yPtCU1Vold-dNY3T3Oq1vqI';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

let swRegistrationPromise = null;
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker.register('/sw.js')
      .then(reg => reg)
      .catch(err => { console.error('Service worker registration failed:', err); return null; });
  }
  return swRegistrationPromise;
}
registerServiceWorker();

// ----- Date & Greeting -----
function updateDateAndGreeting() {
  const dateEl = document.getElementById("current-date");
  const now = new Date();
  if (dateEl) {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    dateEl.textContent = now.toLocaleDateString("en-US", options).toUpperCase();
  }
  const hour = now.getHours();
  const greetingEl = document.querySelector("main h1");
  if (greetingEl) {
    if (hour < 12) greetingEl.textContent = "Good morning, supporter.";
    else if (hour < 17) greetingEl.textContent = "Good afternoon, supporter.";
    else greetingEl.textContent = "Good evening, supporter.";
  }
}
updateDateAndGreeting();

// ----- Mobile Sidebar -----
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

// ===== STICKY NOTIFICATIONS =====
const notificationModal = document.getElementById("notification-modal");
const btnAllow = document.getElementById("btn-allow-notifications");
const btnDeny = document.getElementById("btn-deny-notifications");

async function subscribeUserToPush() {
  try {
    const reg = await registerServiceWorker();
    if (!reg) return;
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }
    const sub = subscription.toJSON();
    if (window.supabaseClient) {
      await window.supabaseClient.from("push_subscriptions").upsert({
        endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth
      }, { onConflict: "endpoint" });
    }
  } catch (err) {
    console.error("Push subscription error:", err);
  }
}

function showNotificationModal() {
  if (notificationModal && !localStorage.getItem("da_notifications_asked")) {
    notificationModal.classList.remove("hidden");
  }
}
function hideNotificationModal() {
  if (notificationModal) {
    notificationModal.classList.add("hidden");
    localStorage.setItem("da_notifications_asked", "true");
  }
}
if (btnAllow) {
  btnAllow.addEventListener("click", async () => {
    hideNotificationModal();
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        localStorage.setItem("da_notifications_enabled", "true");
        await subscribeUserToPush();
      } else {
        localStorage.setItem("da_notifications_enabled", "false");
      }
    }
  });
}
if (btnDeny) {
  btnDeny.addEventListener("click", () => {
    hideNotificationModal();
    localStorage.setItem("da_notifications_enabled", "false");
  });
}
setTimeout(showNotificationModal, 1200);
if ("Notification" in window && Notification.permission === "granted" &&
    localStorage.getItem("da_notifications_enabled") === "true") {
  subscribeUserToPush();
}

// ===================== SEASON RECORD =====================
// BASELINE holds every result from before match-tracking moved into
// Admin/Supabase (5 wins, 0 draws, 1 loss, 16 goals). Every match
// Admin finishes from here on (status FT/AET/Penalties) is added on
// top automatically — nothing needs to be re-typed by hand.
const BASELINE_RECORD = { wins: 5, draws: 0, losses: 1, goals: 16 };
const FINISHED_STATUSES = ["FT", "AET", "Penalties"];

// Same identity used on the Matches/Fixtures pages, so a match
// Admin logs that duplicates a legacy result isn't double counted.
// (Baseline matches aren't individually listed here — this key list
// only needs to grow if you want fine-grained de-dupe; for the
// season-record card, simply not re-entering old games into Admin
// keeps the math correct.)
async function loadSeasonRecord() {
  if (!window.supabaseClient) return;

  const { data: matches } = await window.supabaseClient
    .from("matches")
    .select("score_home, score_away, status")
    .in("status", FINISHED_STATUSES);

  let wins = BASELINE_RECORD.wins;
  let draws = BASELINE_RECORD.draws;
  let losses = BASELINE_RECORD.losses;
  let goals = BASELINE_RECORD.goals;

  (matches || []).forEach(m => {
    const home = m.score_home || 0;
    const away = m.score_away || 0;
    goals += home;
    if (home > away) wins++;
    else if (home === away) draws++;
    else losses++;
  });

  const winsEl = document.getElementById("record-wins");
  const drawsEl = document.getElementById("record-draws");
  const lossesEl = document.getElementById("record-losses");
  const goalsEl = document.getElementById("record-goals");

  if (winsEl) winsEl.textContent = wins;
  if (drawsEl) drawsEl.textContent = draws;
  if (lossesEl) lossesEl.textContent = losses;
  if (goalsEl) goalsEl.textContent = `${goals} goals this season`;
}

// ===================== NEXT FIXTURE =====================
async function loadNextFixture() {
  if (!window.supabaseClient) return;
  const { data, error } = await window.supabaseClient
    .from("fixtures").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return;

  const teamsEl = document.getElementById("fixture-teams");
  const dateEl = document.getElementById("fixture-date");
  const timeVenueEl = document.getElementById("fixture-time-venue-text");
  const compEl = document.getElementById("fixture-competition");

  if (teamsEl) teamsEl.innerHTML = `${data.home || "DA United"} <span class="opacity-60 font-semibold">vs</span> ${data.away || "Opponent"}`;
  if (dateEl) dateEl.textContent = data.date || "Date TBA";
  if (timeVenueEl) timeVenueEl.textContent = `${data.time || "Time TBA"} · ${data.venue || "Venue TBA"}`;
  if (compEl) compEl.textContent = data.competition || "CLUB FRIENDLIES";
}

async function loadLatestStories() {
  if (!window.supabaseClient) return;
  const { data: stories } = await window.supabaseClient
    .from("stories").select("*").order("created_at", { ascending: false }).limit(3);
  const grid = document.getElementById("stories-grid");
  if (!grid) return;

  if (!stories || stories.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-da-muted text-sm">No stories yet. Admin can post from the Admin panel.</div>`;
    return;
  }

  grid.innerHTML = stories.map(s => `
    <article class="group cursor-pointer">
      <div class="aspect-[4/3] rounded-xl bg-da-card border border-da-border overflow-hidden mb-3 relative">
        ${s.image ? `<img src="${s.image}" alt="" class="w-full h-full object-cover">` : `<div class="absolute inset-0 flex items-center justify-center text-da-muted text-sm">No image</div>`}
      </div>
      <span class="text-[10px] font-semibold tracking-wider text-da-green uppercase">${s.category || "Club"}</span>
      <h4 class="text-sm font-medium mt-1 group-hover:text-da-green transition-colors line-clamp-2">${s.title || "Untitled"}</h4>
    </article>
  `).join("");
}

// ===================== MATCH CENTRE =====================
// The status pill (LIVE / HALF TIME / FULL TIME / POSTPONED /
// CANCELLED) reflects ONLY the match's status field. A logged Goal,
// Penalty, Free Kick etc. is shown underneath as its own line — it
// never flips the header to "LIVE" by itself, and it never changes
// what the header says.
const LIVE_STATUSES = ["Live", "HT"];

const EVENT_LABEL = {
  "Goal": "Goal", "Own Goal": "Own Goal", "Golazo": "Screamer",
  "Free Kick Goal": "Free Kick Goal", "Penalty Scored": "Penalty Scored",
  "Penalty Missed": "Penalty Missed", "Yellow Card": "Yellow Card",
  "Red Card": "Red Card", "Substitution": "Substitution",
  "VAR Check": "VAR Check", "Offside": "Offside", "Injury": "Injury",
  "Assist": "Assist", "Kick Off": "Kick Off", "Custom": "Update"
};

function statusHeader(status) {
  switch (status) {
    case "Live": return { label: "LIVE", dot: "bg-red-500 animate-pulse" };
    case "HT": return { label: "HALF TIME", dot: "bg-yellow-400" };
    case "FT": case "AET": case "Penalties": return { label: "FULL TIME", dot: "bg-da-muted" };
    case "Postponed": return { label: "POSTPONED", dot: "bg-yellow-400" };
    case "Cancelled": return { label: "CANCELLED", dot: "bg-red-500" };
    case "Scheduled": default: return { label: "SCHEDULED", dot: "bg-da-muted" };
  }
}

function renderNoLiveMatch(card) {
  card.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-da-muted"></span>
        <span class="text-[11px] font-semibold tracking-wider text-da-muted uppercase">No Live Match</span>
      </div>
    </div>
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
          <img src="assets/crest.png" alt="DA" class="w-full h-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-[9px] font-black text-black\\'>DA</span>'">
        </div>
        <span class="text-sm font-medium truncate">DA United</span>
      </div>
      <div class="text-2xl font-bold tracking-tight px-2">— : —</div>
      <div class="flex items-center gap-2.5 min-w-0 justify-end">
        <span class="text-sm font-medium truncate text-right">Opponent</span>
        <div class="w-9 h-9 rounded-full bg-da-border flex items-center justify-center text-xs font-bold text-da-muted flex-shrink-0">vs</div>
      </div>
    </div>
  `;
}

async function loadMatchCentre() {
  if (!window.supabaseClient) return;
  const card = document.getElementById("match-centre-card");
  if (!card) return;

  const { data } = await window.supabaseClient
    .from("matches").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();

  if (!data || data.status === "Scheduled") {
    renderNoLiveMatch(card);
    return;
  }

  const header = statusHeader(data.status);
  const opponent = data.opponent || "Opponent";
  const scoreHome = data.score_home ?? 0;
  const scoreAway = data.score_away ?? 0;

  const events = data.events ? (typeof data.events === "string" ? JSON.parse(data.events) : data.events) : [];
  const lastEvent = events.length ? events[events.length - 1] : null;
  const eventLine = lastEvent
    ? `<div class="text-xs text-da-muted mt-1">${lastEvent.player ? lastEvent.player + " — " : ""}${EVENT_LABEL[lastEvent.type] || lastEvent.type}${lastEvent.minute ? ` (${lastEvent.minute}')` : ""}</div>`
    : "";

  card.innerHTML = `
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full ${header.dot}"></span>
        <span class="text-[11px] font-semibold tracking-wider uppercase ${data.status === "Cancelled" ? "text-red-400" : "text-white"}">${header.label}</span>
      </div>
    </div>
    ${eventLine}
    <div class="flex items-center justify-between gap-3 mt-3">
      <div class="flex flex-col items-center gap-1.5 min-w-0">
        <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
          <img src="assets/crest.png" alt="DA" class="w-full h-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-[9px] font-black text-black\\'>DA</span>'">
        </div>
        <span class="text-xs font-medium truncate">DA United</span>
        <span class="text-xl font-bold">${scoreHome}</span>
      </div>
      <div class="text-da-muted text-sm font-semibold px-2">vs</div>
      <div class="flex flex-col items-center gap-1.5 min-w-0">
        <div class="w-9 h-9 rounded-full bg-da-border flex items-center justify-center text-xs font-bold text-da-muted flex-shrink-0">${opponent.slice(0, 2).toUpperCase()}</div>
        <span class="text-xs font-medium truncate text-center">${opponent}</span>
        <span class="text-xl font-bold">${scoreAway}</span>
      </div>
    </div>
  `;
}

// ===== INIT =====
function initDashboard() {
  if (window.supabaseClient) {
    loadNextFixture();
    loadSeasonRecord();
    loadLatestStories();
    loadMatchCentre();

    window.supabaseClient
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, () => loadNextFixture())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        loadSeasonRecord();
        loadMatchCentre();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => loadLatestStories())
      .subscribe();
  } else {
    // Still show the correct season record even before Supabase connects
    const winsEl = document.getElementById("record-wins");
    const drawsEl = document.getElementById("record-draws");
    const lossesEl = document.getElementById("record-losses");
    const goalsEl = document.getElementById("record-goals");
    if (winsEl) winsEl.textContent = BASELINE_RECORD.wins;
    if (drawsEl) drawsEl.textContent = BASELINE_RECORD.draws;
    if (lossesEl) lossesEl.textContent = BASELINE_RECORD.losses;
    if (goalsEl) goalsEl.textContent = `${BASELINE_RECORD.goals} goals this season`;
    setTimeout(initDashboard, 100);
  }
}

initDashboard();
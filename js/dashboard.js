// ======================
// DA United – Dashboard (Supabase + Sticky Notifications + Live Match Centre)
// ======================

// ----- VAPID Public Key -----
const vapidPublicKey = 'BAl4qRWELwQHmC9P2RpigIUYaVom5hlwzaPDfoGwuyVzhFg6V7nFn5GHZ7IziUM-yPtCU1Vold-dNY3T3Oq1vqI';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ===== REGISTER SERVICE WORKER =====
// This MUST run before subscribeUserToPush() is ever called, otherwise
// navigator.serviceWorker.ready will hang forever with no error.
let swRegistrationPromise = null;

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported in this browser');
    return Promise.resolve(null);
  }

  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Service worker registered:', reg.scope);
        return reg;
      })
      .catch((err) => {
        console.error('Service worker registration failed:', err);
        return null;
      });
  }

  return swRegistrationPromise;
}

// Register immediately on script load
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

// ===== STICKY NOTIFICATIONS (ask once → forever) =====
const notificationModal = document.getElementById("notification-modal");
const btnAllow = document.getElementById("btn-allow-notifications");
const btnDeny = document.getElementById("btn-deny-notifications");

async function subscribeUserToPush() {
  try {
    const reg = await registerServiceWorker();
    if (!reg) {
      console.error("Cannot subscribe to push: service worker registration failed");
      return;
    }

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
      const { error } = await window.supabaseClient.from("push_subscriptions").upsert({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth
      }, { onConflict: "endpoint" });

      if (error) {
        console.error("Failed to save push subscription to Supabase:", error);
        return;
      }
    } else {
      console.error("Cannot save push subscription: window.supabaseClient not available");
      return;
    }

    console.log("Push subscription saved");
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

// Show the modal only once (after a short delay)
setTimeout(showNotificationModal, 1200);

// If the user already granted permission previously, make sure we still
// have a live subscription saved (covers reinstalled PWA / lost row).
if ("Notification" in window && Notification.permission === "granted" &&
    localStorage.getItem("da_notifications_enabled") === "true") {
  subscribeUserToPush();
}

// ===== LOAD DATA FROM SUPABASE =====

async function loadNextFixture() {
  if (!window.supabaseClient) return;

  const { data, error } = await window.supabaseClient
    .from("fixtures")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return;

  const teamsEl = document.getElementById("fixture-teams");
  const dateEl = document.getElementById("fixture-date");
  const timeVenueEl = document.getElementById("fixture-time-venue-text");
  const compEl = document.getElementById("fixture-competition");

  if (teamsEl) {
    teamsEl.innerHTML = `${data.home || "DA United"} <span class="opacity-60 font-semibold">vs</span> ${data.away || "Opponent"}`;
  }
  if (dateEl) dateEl.textContent = data.date || "Date TBA";
  if (timeVenueEl) timeVenueEl.textContent = `${data.time || "Time TBA"} · ${data.venue || "Venue TBA"}`;
  if (compEl) compEl.textContent = data.competition || "CLUB FRIENDLIES";
}

async function loadSeasonRecord() {
  if (!window.supabaseClient) return;

  const { data: matches } = await window.supabaseClient
    .from("matches")
    .select("score_home, score_away");

  let wins = 0, draws = 0, losses = 0, goals = 0;

  if (matches) {
    matches.forEach(m => {
      const home = m.score_home || 0;
      const away = m.score_away || 0;
      goals += home;

      if (home > away) wins++;
      else if (home === away) draws++;
      else losses++;
    });
  }

  const winsEl = document.getElementById("record-wins");
  const drawsEl = document.getElementById("record-draws");
  const lossesEl = document.getElementById("record-losses");
  const goalsEl = document.getElementById("record-goals");

  if (winsEl) winsEl.textContent = wins;
  if (drawsEl) drawsEl.textContent = draws;
  if (lossesEl) lossesEl.textContent = losses;
  if (goalsEl) goalsEl.textContent = `${goals} goals this season`;
}

async function loadLatestStories() {
  if (!window.supabaseClient) return;

  const { data: stories } = await window.supabaseClient
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);

  const grid = document.getElementById("stories-grid");
  if (!grid) return;

  if (!stories || stories.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-da-muted text-sm">No stories yet. Admin can post from the Admin panel.</div>`;
    return;
  }

  grid.innerHTML = stories.map(s => `
    <article class="group cursor-pointer">
      <div class="aspect-[4/3] rounded-xl bg-da-card border border-da-border overflow-hidden mb-3 relative">
        ${s.image 
          ? `<img src="${s.image}" alt="" class="w-full h-full object-cover">` 
          : `<div class="absolute inset-0 flex items-center justify-center text-da-muted text-sm">No image</div>`}
      </div>
      <span class="text-[10px] font-semibold tracking-wider text-da-green uppercase">${s.category || "Club"}</span>
      <h4 class="text-sm font-medium mt-1 group-hover:text-da-green transition-colors line-clamp-2">
        ${s.title || "Untitled"}
      </h4>
    </article>
  `).join("");
}

// ===================== LIVE MATCH CENTRE =====================
// Reads the most recently touched match and renders the live-state banner:
// WE ARE LIVE (red dot) -> latest event -> FULL TIME / INTERRUPTED / CANCELLED.
// The banner stays on "WE ARE LIVE" no matter how many events get logged —
// it only changes when the admin sets Match Status to something else and saves.

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
    .from("matches")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const state = data ? matchStateCopy(data) : null;

  if (!state) {
    renderNoLiveMatch(card);
    return;
  }

  const opponent = data.opponent || "Opponent";
  const scoreHome = data.score_home ?? 0;
  const scoreAway = data.score_away ?? 0;
  const headerColorClass = state.status === "Cancelled" ? "text-red-400" : "text-white";

  card.innerHTML = `
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full ${state.dotClass}"></span>
        <span class="text-[11px] font-semibold tracking-wider uppercase ${headerColorClass}">${state.headerLabel}</span>
      </div>
      ${state.showX ? `<span class="text-red-400 text-lg font-bold">✕</span>` : ""}
    </div>
    <div class="mb-4">
      <span class="text-sm font-semibold">${state.sub.main}</span>
      ${state.sub.badge ? `<span class="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-da-green/15 text-da-green">${state.sub.badge}</span>` : ""}
      ${state.sub.min ? `<span class="ml-2 text-xs text-da-muted">${state.sub.min}</span>` : ""}
    </div>
    <div class="flex items-center justify-between gap-3">
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
    setTimeout(initDashboard, 100);
  }
}

initDashboard();

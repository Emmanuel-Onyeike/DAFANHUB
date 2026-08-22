// ======================
// DA United – Dashboard (Supabase + Sticky Notifications)
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

// Run loaders
function initDashboard() {
  if (window.supabaseClient) {
    loadNextFixture();
    loadSeasonRecord();
    loadLatestStories();

    window.supabaseClient
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, () => loadNextFixture())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadSeasonRecord())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => loadLatestStories())
      .subscribe();
  } else {
    setTimeout(initDashboard, 100);
  }
}

initDashboard();

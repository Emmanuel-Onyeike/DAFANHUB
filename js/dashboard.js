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

// ===== ON-SCREEN DEBUG LOG (visible on iPhone, no cable/Mac needed) =====
// Temporary — remove this block once push notifications are confirmed working.
function debugLog(msg) {
  console.log(msg);
  let box = document.getElementById("da-debug-log");
  if (!box) {
    box = document.createElement("div");
    box.id = "da-debug-log";
    box.style.cssText = "position:fixed;bottom:0;left:0;right:0;max-height:40vh;overflow-y:auto;" +
      "background:rgba(0,0,0,0.92);color:#22c55e;font-size:11px;font-family:monospace;" +
      "padding:8px;z-index:99999;white-space:pre-wrap;border-top:2px solid #22c55e;";
    document.body.appendChild(box);
  }
  const line = document.createElement("div");
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

// ===== REGISTER SERVICE WORKER =====
// This MUST run before subscribeUserToPush() is ever called, otherwise
// navigator.serviceWorker.ready will hang forever with no error.
let swRegistrationPromise = null;

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    debugLog('❌ Service workers NOT supported in this browser');
    return Promise.resolve(null);
  }

  debugLog('⏳ Registering service worker...');

  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        debugLog('✅ Service worker registered: ' + reg.scope);
        return reg;
      })
      .catch((err) => {
        debugLog('❌ Service worker registration FAILED: ' + err.message);
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
  debugLog('▶️ subscribeUserToPush() started');
  try {
    // Make sure the service worker is registered and active before using it
    const reg = await registerServiceWorker();
    if (!reg) {
      debugLog('❌ Cannot subscribe: service worker registration failed');
      return;
    }

    debugLog('⏳ Waiting for navigator.serviceWorker.ready...');
    const registration = await navigator.serviceWorker.ready;
    debugLog('✅ Service worker is ready');

    // Check if already subscribed
    debugLog('⏳ Checking for existing subscription...');
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      debugLog('⏳ No existing subscription, calling pushManager.subscribe()...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      debugLog('✅ New push subscription created');
    } else {
      debugLog('✅ Existing subscription found, reusing it');
    }

    const sub = subscription.toJSON();
    debugLog('📋 Endpoint: ' + (sub.endpoint ? sub.endpoint.slice(0, 60) + '...' : 'MISSING'));

    // Save to Supabase
    if (window.supabaseClient) {
      debugLog('⏳ Saving subscription to Supabase...');
      const { error } = await window.supabaseClient.from("push_subscriptions").upsert({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth
      }, { onConflict: "endpoint" });

      if (error) {
        debugLog('❌ Supabase upsert FAILED: ' + JSON.stringify(error));
        return;
      }
      debugLog('✅ Supabase upsert succeeded');
    } else {
      debugLog('❌ Cannot save: window.supabaseClient not available');
      return;
    }

    debugLog('🎉 Push subscription fully saved!');
  } catch (err) {
    debugLog('❌ Push subscription ERROR: ' + (err.message || err));
  }
}

function showNotificationModal() {
  // Only show if the user has never been asked before
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

// ===== TEMPORARY MANUAL TEST BUTTON =====
// Lets you retrigger the subscribe flow anytime without clearing site data.
// Remove this block once push is confirmed working.
(function addDebugSubscribeButton() {
  const btn = document.createElement("button");
  btn.textContent = "🔔 Test Subscribe";
  btn.style.cssText = "position:fixed;bottom:calc(40vh + 8px);right:8px;z-index:99999;" +
    "background:#22c55e;color:#000;font-weight:600;font-size:12px;padding:8px 12px;" +
    "border-radius:9999px;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);";
  btn.addEventListener("click", async () => {
    debugLog('🔔 Manual test button tapped');
    if ("Notification" in window) {
      debugLog('Current permission: ' + Notification.permission);
      const permission = await Notification.requestPermission();
      debugLog('Permission after request: ' + permission);
      if (permission === "granted") {
        await subscribeUserToPush();
      }
    } else {
      debugLog('❌ Notification API not supported in this browser');
    }
  });
  document.body.appendChild(btn);
})();

// If the user already granted permission previously (e.g. reinstalled the
// PWA, or cleared da_notifications_asked but browser permission persisted),
// make sure we still have a live subscription saved.
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

    // Real-time updates
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

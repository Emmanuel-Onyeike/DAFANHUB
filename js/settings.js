// ======================
// DA United – Settings
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

// ----- Notification toggle UI -----
const toggleBtn = document.getElementById("toggle-notifications");
const permissionCard = document.getElementById("notification-permission-card");
const btnAllow = document.getElementById("btn-allow-notifications");

function setToggleOn(on) {
  if (!toggleBtn) return;
  const knob = toggleBtn.querySelector("span");
  if (on) {
    toggleBtn.classList.add("bg-da-green");
    toggleBtn.classList.remove("bg-gray-600");
    knob.classList.add("translate-x-5");
    knob.classList.remove("translate-x-0");
    toggleBtn.setAttribute("aria-pressed", "true");
  } else {
    toggleBtn.classList.remove("bg-da-green");
    toggleBtn.classList.add("bg-gray-600");
    knob.classList.remove("translate-x-5");
    knob.classList.add("translate-x-0");
    toggleBtn.setAttribute("aria-pressed", "false");
  }
}

function isNotificationsEnabled() {
  return localStorage.getItem("da_notifications_enabled") === "true" &&
    ("Notification" in window ? Notification.permission === "granted" : false);
}

// Init toggle from stored state
setToggleOn(isNotificationsEnabled());

// Show permission card if not fully granted
if (permissionCard) {
  if (!isNotificationsEnabled()) {
    permissionCard.classList.remove("hidden");
  } else {
    permissionCard.classList.add("hidden");
  }
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    alert("Notifications are not supported on this browser.");
    return false;
  }
  const permission = await Notification.requestPermission();
  localStorage.setItem("da_notifications_asked", "true");
  if (permission === "granted") {
    localStorage.setItem("da_notifications_enabled", "true");
    setToggleOn(true);
    if (permissionCard) permissionCard.classList.add("hidden");
    return true;
  }
  localStorage.setItem("da_notifications_enabled", "false");
  setToggleOn(false);
  return false;
}

if (btnAllow) {
  btnAllow.addEventListener("click", async () => {
    const ok = await requestNotifications();
    if (ok) alert("Notifications enabled. You’ll hear from DA United.");
  });
}

if (toggleBtn) {
  toggleBtn.addEventListener("click", async () => {
    const currentlyOn = toggleBtn.getAttribute("aria-pressed") === "true";
    if (currentlyOn) {
      // Turn off preference (browser permission stays; we just stop treating as enabled)
      localStorage.setItem("da_notifications_enabled", "false");
      setToggleOn(false);
      if (permissionCard) permissionCard.classList.remove("hidden");
    } else {
      const ok = await requestNotifications();
      if (!ok && permissionCard) permissionCard.classList.remove("hidden");
    }
  });
}

// ----- Install / Add to Home Screen -----
const btnInstall = document.getElementById("btn-install");
const iosTip = document.getElementById("ios-install-tip");
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (btnInstall) {
    btnInstall.textContent = "Install";
    btnInstall.disabled = false;
  }
});

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

if (isStandalone() && btnInstall) {
  btnInstall.textContent = "Installed";
  btnInstall.disabled = true;
  btnInstall.classList.add("opacity-60", "cursor-not-allowed");
}

if (isIOS() && !isStandalone() && iosTip) {
  iosTip.classList.remove("hidden");
}

if (btnInstall) {
  btnInstall.addEventListener("click", async () => {
    if (isStandalone()) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === "accepted") {
        btnInstall.textContent = "Installed";
        btnInstall.disabled = true;
      }
      return;
    }

    if (isIOS()) {
      if (iosTip) {
        iosTip.classList.remove("hidden");
        iosTip.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        alert("On iPhone: tap Share → Add to Home Screen. Name it DATDHUB.");
      }
      return;
    }

    alert("Open this site in Chrome or Edge, then use the browser menu → Install app / Add to Home screen.");
  });
}

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  if (btnInstall) {
    btnInstall.textContent = "Installed";
    btnInstall.disabled = true;
  }
});
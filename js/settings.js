// ======================
// DA United – Settings (+ in-app Update)
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

setToggleOn(isNotificationsEnabled());

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

// ===================== IN-APP UPDATE =====================
// For the installed PWA: loading bar -> 100% -> white screen ->
// "Enjoy the view" -> 5s -> redirect to the dashboard with the
// version flag set, so the black update-gate never shows again
// and the new UI is right there waiting.
const APP_VERSION = "v2";

(function () {
  const btnUpdate = document.getElementById("btn-update");
  if (!btnUpdate) return;

  const style = document.createElement("style");
  style.textContent = `
    #da-update-modal { position: fixed; inset: 0; z-index: 9999; display: none; }
    #da-update-modal.show { display: block; }
    #da-update-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.82); backdrop-filter: blur(4px); }
    #da-update-box {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
      width: calc(100% - 2rem); max-width: 380px;
      background: #0c140c; border: 1px solid #1a2a1a; border-radius: 1.25rem;
      padding: 1.75rem; text-align: center; color: #fff;
    }
    #da-update-bar-track { height: 8px; border-radius: 999px; background: #1a2a1a; overflow: hidden; margin-top: 1.25rem; }
    #da-update-bar { height: 100%; width: 0%; background: #22c55e; border-radius: 999px; transition: width .18s linear; }
    #da-update-pct { font-size: .75rem; color: #6b7c6b; margin-top: .6rem; }
    #da-update-white {
      position: fixed; inset: 0; z-index: 10000; background: #fff;
      display: none; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .35s ease;
    }
    #da-update-white.show { display: flex; opacity: 1; }
    #da-update-white span {
      color: #050805; font-weight: 800; letter-spacing: -.02em; font-size: 1.5rem;
      opacity: 0; transform: translateY(8px);
      transition: opacity .5s ease .25s, transform .5s ease .25s;
    }
    #da-update-white.reveal span { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div id="da-update-modal">
      <div id="da-update-backdrop"></div>
      <div id="da-update-box">
        <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:.35rem;">Updating DA United</h3>
        <p style="font-size:.8rem;color:#6b7c6b;">Getting the latest version. Don't close the app.</p>
        <div id="da-update-bar-track"><div id="da-update-bar"></div></div>
        <div id="da-update-pct">0%</div>
      </div>
    </div>
    <div id="da-update-white"><span>Enjoy the view</span></div>
  `;
  document.body.appendChild(wrap);

  const modal = document.getElementById("da-update-modal");
  const bar = document.getElementById("da-update-bar");
  const pct = document.getElementById("da-update-pct");
  const white = document.getElementById("da-update-white");

  async function clearAppCaches() {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update().catch(() => r.unregister())));
      }
    } catch (e) {
      console.warn("Cache clear issue:", e);
    }
  }

  btnUpdate.addEventListener("click", () => {
    btnUpdate.disabled = true;
    modal.classList.add("show");

    const work = clearAppCaches(); // real work runs in the background

    let p = 0;
    const timer = setInterval(() => {
      p += Math.random() * 14 + 8;
      if (p >= 100) p = 100;
      bar.style.width = p + "%";
      pct.textContent = Math.floor(p) + "%";

      if (p === 100) {
        clearInterval(timer);
        setTimeout(async () => {
          await work;

          modal.classList.remove("show");
          white.classList.add("show");
          requestAnimationFrame(() => white.classList.add("reveal"));

          setTimeout(() => {
            localStorage.setItem("da_app_version", APP_VERSION);
            window.location.href = "/dashboard.html";
          }, 5000);
        }, 300);
      }
    }, 130);
  });
})();
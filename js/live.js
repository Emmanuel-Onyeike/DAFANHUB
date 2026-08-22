

// ======================
// DA United – Live (Multi-Screen Camera)
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

let activeScreens = {};
let currentScreen = null;
let peer = null;
let currentCall = null;

const noStreamEl = document.getElementById("no-stream");
const streamPlayer = document.getElementById("stream-player");
const videoEl = document.getElementById("live-video");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const viewerCount = document.getElementById("viewer-count");
const screenButtons = document.getElementById("screen-buttons");
const streamTitleEl = document.getElementById("stream-title");
const liveBadge = document.getElementById("live-badge");

async function loadLiveStatus() {
  if (!window.supabaseClient) return;

  const { data, error } = await window.supabaseClient
    .from("live")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    setNoLive();
    return;
  }

  activeScreens = {};
  let anyLive = false;

  for (let i = 1; i <= 5; i++) {
    if (data[`screen_${i}_active`] === true) {
      anyLive = true;
      activeScreens[i] = {
        title: data[`screen_${i}_title`] || `Screen ${i}`,
        peerId: data[`screen_${i}_peer_id`] || null,
        active: true
      };
    }
  }

  // Fallback: older single-stream is_live flag
  if (!anyLive && data.is_live) {
    activeScreens[1] = {
      title: data.title || "Main Camera",
      peerId: data.peer_id || null,
      active: true
    };
    anyLive = true;
  }

  renderScreenButtons();

  if (!anyLive) {
    setNoLive();
  } else if (!currentScreen || !activeScreens[currentScreen]) {
    const first = Object.keys(activeScreens)[0];
    if (first) selectScreen(parseInt(first));
  }
}

function setNoLive() {
  currentScreen = null;
  if (noStreamEl) noStreamEl.classList.remove("hidden");
  if (streamPlayer) streamPlayer.classList.add("hidden");
  if (liveBadge) liveBadge.classList.add("hidden");
  if (chatInput) {
    chatInput.disabled = true;
    chatSend.disabled = true;
    chatSend.classList.add("opacity-50", "cursor-not-allowed");
  }
  if (viewerCount) viewerCount.textContent = "0 watching";
  stopViewerStream();
}

function renderScreenButtons() {
  if (!screenButtons) return;

  screenButtons.innerHTML = [1, 2, 3, 4, 5].map(n => {
    const isActive = !!activeScreens[n];
    const isSelected = currentScreen === n;
    return `
      <button data-screen="${n}"
        class="screen-btn px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
          ${isSelected ? "bg-da-green text-black" : isActive ? "bg-white/10 text-white hover:bg-white/20" : "bg-white/5 text-da-muted cursor-not-allowed opacity-50"}"
        ${isActive ? "" : "disabled"}>
        ${isActive ? `<span class="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>` : ""}
        Screen ${n}
      </button>
    `;
  }).join("");

  screenButtons.querySelectorAll(".screen-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => selectScreen(parseInt(btn.dataset.screen)));
  });
}

async function selectScreen(n) {
  if (!activeScreens[n]) return;

  currentScreen = n;
  renderScreenButtons();

  if (noStreamEl) noStreamEl.classList.add("hidden");
  if (streamPlayer) streamPlayer.classList.remove("hidden");
  if (liveBadge) liveBadge.classList.remove("hidden");
  if (streamTitleEl) streamTitleEl.textContent = activeScreens[n].title || `Screen ${n}`;

  if (chatInput) {
    chatInput.disabled = false;
    chatSend.disabled = false;
    chatSend.classList.remove("opacity-50", "cursor-not-allowed");
  }

  await connectToScreen(n);
}

function stopViewerStream() {
  if (currentCall) {
    try { currentCall.close(); } catch (e) {}
    currentCall = null;
  }
  if (videoEl) videoEl.srcObject = null;
}

async function connectToScreen(n) {
  stopViewerStream();

  const info = activeScreens[n];
  const waiting = document.getElementById("video-waiting");

  if (!info || !info.peerId) {
    if (waiting) waiting.classList.remove("hidden");
    return;
  }

  if (waiting) waiting.classList.add("hidden");

  try {
    if (!peer) {
      peer = new Peer();
      await new Promise((resolve, reject) => {
        peer.on("open", resolve);
        peer.on("error", reject);
        setTimeout(() => reject(new Error("Peer timeout")), 8000);
      });
    }

    const call = peer.call(info.peerId, new MediaStream());
    currentCall = call;

    call.on("stream", (remoteStream) => {
      if (videoEl) {
        videoEl.srcObject = remoteStream;
        videoEl.play().catch(() => {});
      }
      if (waiting) waiting.classList.add("hidden");
    });

    call.on("close", () => {
      if (videoEl) videoEl.srcObject = null;
    });

    call.on("error", () => {
      if (waiting) waiting.classList.remove("hidden");
    });
  } catch (err) {
    console.log("Peer connect error", err);
    if (waiting) waiting.classList.remove("hidden");
  }
}

function subscribeLive() {
  if (!window.supabaseClient) return;
  window.supabaseClient
    .channel("live-status")
    .on("postgres_changes", { event: "*", schema: "public", table: "live" }, () => loadLiveStatus())
    .subscribe();
}

// Chat (local for now)
const chatForm = document.getElementById("chat-form");
const chatMessages = document.getElementById("chat-messages");
const chatEmpty = document.getElementById("chat-empty");

if (chatForm) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    if (chatEmpty) chatEmpty.classList.add("hidden");

    const bubble = document.createElement("div");
    bubble.className = "flex gap-2";
    bubble.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-da-green/20 flex items-center justify-center text-[10px] font-bold text-da-green flex-shrink-0">S</div>
      <div class="bg-black/40 rounded-xl rounded-tl-sm px-3 py-2 text-sm max-w-[85%]">
        <span class="text-da-green text-xs font-medium">Supporter</span>
        <p class="text-gray-200">${text.replace(/</g, "&lt;")}</p>
      </div>
    `;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    chatInput.value = "";
  });
}

function initLive() {
  if (window.supabaseClient) {
    loadLiveStatus();
    subscribeLive();
  } else {
    setTimeout(initLive, 100);
  }
}

initLive();
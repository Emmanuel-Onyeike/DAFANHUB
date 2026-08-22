// ======================
// DA United – DA TV (Supabase)
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

// Video Modal
const videoModal = document.getElementById("video-modal");
const closeVideoModal = document.getElementById("close-video-modal");
const videoModalBackdrop = document.getElementById("video-modal-backdrop");

function openVideoModal(title = "", description = "", file = null) {
  document.getElementById("video-modal-title").textContent = title || "Video";
  document.getElementById("video-modal-desc").textContent = description || "";

  const container = document.getElementById("video-player-container");

  if (file && (file.startsWith("data:video") || file.startsWith("blob:") || file.includes(".mp4") || file.includes(".webm"))) {
    container.innerHTML = `<video src="${file}" controls class="w-full h-full" autoplay playsinline></video>`;
  } else if (file && (file.startsWith("data:image") || file.startsWith("http"))) {
    container.innerHTML = `<img src="${file}" alt="" class="w-full h-full object-contain">`;
  } else if (file && file.startsWith("http") && (file.includes("youtube") || file.includes("youtu.be"))) {
    let embed = file;
    if (file.includes("watch?v=")) embed = "https://www.youtube.com/embed/" + file.split("watch?v=")[1].split("&")[0];
    else if (file.includes("youtu.be/")) embed = "https://www.youtube.com/embed/" + file.split("youtu.be/")[1].split("?")[0];
    container.innerHTML = `<iframe src="${embed}" class="w-full h-full" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    container.innerHTML = `
      <div class="text-center text-da-muted">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm">No playable file</p>
      </div>`;
  }

  videoModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeVideoModalFn() {
  videoModal.classList.add("hidden");
  document.body.style.overflow = "";
  document.getElementById("video-player-container").innerHTML = "";
}

if (closeVideoModal) closeVideoModal.addEventListener("click", closeVideoModalFn);
if (videoModalBackdrop) videoModalBackdrop.addEventListener("click", closeVideoModalFn);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !videoModal.classList.contains("hidden")) {
    closeVideoModalFn();
  }
});

// ===== LOAD FROM SUPABASE =====
async function loadDATV() {
  if (!window.supabaseClient) return;

  const featuredEmpty = document.getElementById("featured-empty");
  const featuredContent = document.getElementById("featured-content");
  const videosEmpty = document.getElementById("videos-empty");
  const videosGrid = document.getElementById("videos-grid");

  try {
    const { data: videos, error } = await window.supabaseClient
      .from("datv")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DA TV load error", error);
      return;
    }

    const list = videos || [];

    // Featured
    const featured = list.find(v => v.featured === true) || list[0];

    if (featured) {
      featuredEmpty.classList.add("hidden");
      featuredContent.classList.remove("hidden");
      document.getElementById("featured-title").textContent = featured.title || "Featured Film";
      document.getElementById("featured-desc").textContent = featured.description || "";
      document.getElementById("btn-play-featured").onclick = () => {
        openVideoModal(featured.title, featured.description, featured.file || featured.url || featured.video_url);
      };
    } else {
      featuredEmpty.classList.remove("hidden");
      featuredContent.classList.add("hidden");
    }

    // Grid
    if (list.length === 0) {
      videosEmpty.classList.remove("hidden");
      videosGrid.classList.add("hidden");
      return;
    }

    videosEmpty.classList.add("hidden");
    videosGrid.classList.remove("hidden");

    videosGrid.innerHTML = list.map((v) => {
      const media = v.file || v.url || v.video_url || v.thumbnail || "";
      const isImage = media.startsWith("data:image") || (media && !media.includes("video") && (media.includes(".jpg") || media.includes(".png") || media.includes(".webp")));
      return `
        <div class="group cursor-pointer video-card" data-id="${v.id}">
          <div class="aspect-video rounded-xl bg-da-card border border-da-border overflow-hidden mb-3 relative">
            ${isImage
              ? `<img src="${media}" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
              : `<div class="absolute inset-0 flex items-center justify-center bg-black/40">
                   <div class="w-12 h-12 rounded-full bg-da-green/90 flex items-center justify-center">
                     <svg class="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                   </div>
                 </div>`
            }
          </div>
          <h3 class="text-sm font-medium group-hover:text-da-green transition-colors line-clamp-1">${v.title || "Untitled"}</h3>
          <p class="text-xs text-da-muted mt-0.5 line-clamp-1">${v.description || ""}</p>
        </div>
      `;
    }).join("");

    videosGrid.querySelectorAll(".video-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        const video = list.find(v => String(v.id) === String(id));
        if (video) {
          openVideoModal(video.title, video.description, video.file || video.url || video.video_url);
        }
      });
    });
  } catch (e) {
    console.error("DA TV error", e);
  }
}

function initDATV() {
  if (window.supabaseClient) {
    loadDATV();
    window.supabaseClient
      .channel("datv-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "datv" }, () => loadDATV())
      .subscribe();
  } else {
    setTimeout(initDATV, 100);
  }
}

initDATV();
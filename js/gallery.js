// ======================
// DA United – Gallery (Supabase)
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

// Lightbox
const lightbox = document.getElementById("gallery-lightbox");
const lightboxBackdrop = document.getElementById("gallery-lightbox-backdrop");
const closeLightboxBtn = document.getElementById("close-gallery-lightbox");

function openLightbox(image, title, description) {
  document.getElementById("lightbox-image").src = image || "";
  document.getElementById("lightbox-title").textContent = title || "";
  document.getElementById("lightbox-desc").textContent = description || "";
  lightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  document.body.style.overflow = "";
  document.getElementById("lightbox-image").src = "";
}

if (closeLightboxBtn) closeLightboxBtn.addEventListener("click", closeLightbox);
if (lightboxBackdrop) lightboxBackdrop.addEventListener("click", closeLightbox);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox && !lightbox.classList.contains("hidden")) {
    closeLightbox();
  }
});

// Load from Supabase
async function loadGallery() {
  if (!window.supabaseClient) return;

  const empty = document.getElementById("gallery-empty");
  const grid = document.getElementById("gallery-grid");

  try {
    const { data: items, error } = await window.supabaseClient
      .from("gallery")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gallery load error", error);
      return;
    }

    const list = items || [];

    if (list.length === 0) {
      empty.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    empty.classList.add("hidden");
    grid.classList.remove("hidden");

    grid.innerHTML = list.map(item => {
      const img = item.image || item.url || item.file || "";
      const title = item.title || "Untitled";
      const desc = item.description || "";
      return `
        <div class="group cursor-pointer gallery-card" data-id="${item.id}">
          <div class="aspect-[4/3] rounded-xl bg-da-card border border-da-border overflow-hidden mb-3">
            ${img
              ? `<img src="${img}" alt="${title.replace(/"/g, "&quot;")}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
              : `<div class="w-full h-full flex items-center justify-center text-da-muted text-sm">No image</div>`
            }
          </div>
          <h3 class="text-sm font-medium group-hover:text-da-green transition-colors">${title}</h3>
          <p class="text-xs text-da-muted mt-0.5 line-clamp-2">${desc}</p>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".gallery-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        const item = list.find(i => String(i.id) === String(id));
        if (item) {
          openLightbox(
            item.image || item.url || item.file || "",
            item.title || "",
            item.description || ""
          );
        }
      });
    });
  } catch (e) {
    console.error("Gallery error", e);
  }
}

function initGallery() {
  if (window.supabaseClient) {
    loadGallery();
    window.supabaseClient
      .channel("gallery-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery" }, () => loadGallery())
      .subscribe();
  } else {
    setTimeout(initGallery, 100);
  }
}

initGallery();
// ======================
// DA United – Stories (Supabase)
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

// ----- Stories -----
const storiesEmpty = document.getElementById("stories-empty");
const storiesGrid = document.getElementById("stories-grid");
const filterButtons = document.querySelectorAll(".filter-btn");

let allStories = [];
let currentFilter = "ALL";

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "";
  }
}

function normalizeCategory(cat) {
  if (!cat) return "Club";
  const c = String(cat).trim();
  const map = {
    club: "Club",
    injury: "Injury",
    transfer: "Transfer",
    loan: "Loan",
    suspension: "Suspension"
  };
  return map[c.toLowerCase()] || c;
}

function storyCardHTML(story) {
  const category = normalizeCategory(story.category);
  const title = story.title || "Untitled";
  const excerpt = (story.content || story.body || "").slice(0, 140).trim();
  const image = story.image_url || story.image || "";
  const date = formatDate(story.created_at || story.published_at);
  const id = story.id;

  const imageBlock = image
    ? `<div class="aspect-video bg-black/40 overflow-hidden">
         <img src="${image}" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onerror="this.parentElement.style.display='none'">
       </div>`
    : "";

  return `
    <article class="story-card group bg-da-card border border-da-border rounded-2xl overflow-hidden cursor-pointer hover:border-da-green/40 transition-colors"
             data-category="${category}" data-id="${id}">
      ${imageBlock}
      <div class="p-5">
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="text-[10px] font-semibold tracking-wider text-da-green uppercase">${category}</span>
          <span class="text-[11px] text-da-muted">${date}</span>
        </div>
        <h3 class="font-semibold text-base mb-2 line-clamp-2">${title}</h3>
        <p class="text-sm text-da-muted line-clamp-3 mb-4">${excerpt}${excerpt.length >= 140 ? "…" : ""}</p>
        <button type="button" class="text-sm font-medium text-da-green hover:text-green-400 transition-colors read-story-btn">
          Read story →
        </button>
      </div>
    </article>
  `;
}

function renderStories() {
  if (!storiesGrid || !storiesEmpty) return;

  const filtered = currentFilter === "ALL"
    ? allStories
    : allStories.filter(s => normalizeCategory(s.category) === currentFilter);

  if (filtered.length === 0) {
    storiesGrid.classList.add("hidden");
    storiesGrid.innerHTML = "";
    storiesEmpty.classList.remove("hidden");
    return;
  }

  storiesEmpty.classList.add("hidden");
  storiesGrid.classList.remove("hidden");
  storiesGrid.innerHTML = filtered.map(storyCardHTML).join("");

  // Bind click handlers
  storiesGrid.querySelectorAll(".story-card").forEach(card => {
    const id = card.dataset.id;
    const open = () => {
      const story = allStories.find(s => String(s.id) === String(id));
      if (story) openStoryModal(story);
    };
    card.addEventListener("click", open);
    const btn = card.querySelector(".read-story-btn");
    if (btn) btn.addEventListener("click", (e) => {
      e.stopPropagation();
      open();
    });
  });
}

function setActiveFilter(btn) {
  filterButtons.forEach(b => {
    b.classList.remove("active", "bg-da-green", "text-black", "font-semibold");
    b.classList.add("bg-white/5", "text-gray-300", "font-medium");
  });
  btn.classList.add("active", "bg-da-green", "text-black", "font-semibold");
  btn.classList.remove("bg-white/5", "text-gray-300", "font-medium");
}

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter || "ALL";
    setActiveFilter(btn);
    renderStories();
  });
});

// ----- Modal -----
const storyModal = document.getElementById("story-modal");
const closeStoryModalBtn = document.getElementById("close-story-modal");
const storyModalBackdrop = document.getElementById("story-modal-backdrop");
const modalCategory = document.getElementById("modal-category");
const modalImage = document.getElementById("modal-image");
const modalMeta = document.getElementById("modal-meta");
const modalTitle = document.getElementById("modal-title");
const modalContent = document.getElementById("modal-content");

function openStoryModal(story) {
  if (!storyModal) return;

  const category = normalizeCategory(story.category);
  const title = story.title || "Untitled";
  const content = story.content || story.body || "";
  const image = story.image_url || story.image || "";
  const date = formatDate(story.created_at || story.published_at);
  const author = story.author || "DA United";

  if (modalCategory) modalCategory.textContent = category;
  if (modalTitle) modalTitle.textContent = title;
  if (modalContent) modalContent.textContent = content;
  if (modalMeta) modalMeta.textContent = [date, author].filter(Boolean).join(" · ");

  if (modalImage) {
    const img = modalImage.querySelector("img");
    if (image && img) {
      img.src = image;
      img.alt = title;
      modalImage.classList.remove("hidden");
    } else {
      modalImage.classList.add("hidden");
      if (img) img.src = "";
    }
  }

  storyModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeStoryModalFn() {
  if (storyModal) storyModal.classList.add("hidden");
  document.body.style.overflow = "";
}

if (closeStoryModalBtn) closeStoryModalBtn.addEventListener("click", closeStoryModalFn);
if (storyModalBackdrop) storyModalBackdrop.addEventListener("click", closeStoryModalFn);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && storyModal && !storyModal.classList.contains("hidden")) {
    closeStoryModalFn();
  }
});

// ----- Load from Supabase -----
async function loadStories() {
  if (!window.supabaseClient) return;

  try {
    const { data, error } = await window.supabaseClient
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Stories load error", error);
      allStories = [];
    } else {
      allStories = data || [];
    }

    renderStories();
  } catch (e) {
    console.error("Stories load error", e);
    allStories = [];
    renderStories();
  }
}

function initStories() {
  if (window.supabaseClient) {
    loadStories();

    window.supabaseClient
      .channel("stories-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        loadStories();
      })
      .subscribe();
  } else {
    setTimeout(initStories, 100);
  }
}

initStories();
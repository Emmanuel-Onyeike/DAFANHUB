// ======================
// DA United – Stats Page
// ======================

const panels = {
    formation: document.getElementById("panel-formation"),
    team: document.getElementById("panel-team"),
    ratings: document.getElementById("panel-ratings")
  };
  
  const tabs = document.querySelectorAll(".stats-tab");
  
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => {
        t.classList.remove("active", "bg-da-green", "text-black", "shadow-md");
        t.classList.add("bg-da-card", "border", "border-da-border", "text-gray-300");
      });
      tab.classList.add("active", "bg-da-green", "text-black", "shadow-md");
      tab.classList.remove("bg-da-card", "border", "border-da-border", "text-gray-300");
  
      Object.values(panels).forEach(p => p?.classList.add("hidden"));
      panels[tab.dataset.tab]?.classList.remove("hidden");
    });
  });
  
  // Sidebar (same as other pages)
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  document.getElementById("btn-open-sidebar")?.addEventListener("click", () => {
    sidebar?.classList.remove("-translate-x-full");
    overlay?.classList.remove("hidden");
  });
  document.getElementById("btn-close-sidebar")?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);
  function closeSidebar() {
    sidebar?.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
  }
  
  // ---------- FORMATION ----------
  async function loadFormation() {
    const card = document.getElementById("formation-card");
    if (!card || !window.supabaseClient) return;
  
    const { data } = await window.supabaseClient
      .from("team_news")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
  
    if (!data) {
      card.innerHTML = `<p class="text-da-muted text-sm font-medium">No team news posted yet.</p>`;
      return;
    }
  
    const xi = data.selected_xi || [];
    const subs = data.substitutes || [];
  
    card.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="text-[10px] font-bold tracking-widest text-da-green uppercase mb-1">Formation</div>
          <div class="text-3xl font-black text-white">${data.formation || "4-3-3"}</div>
        </div>
        <div class="text-xs text-da-muted">
          Updated ${data.updated_at ? new Date(data.updated_at).toLocaleString() : ""}
        </div>
      </div>
  
      ${data.notes ? `<p class="text-sm text-gray-300 mb-6 leading-relaxed">${data.notes}</p>` : ""}
  
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-xs font-bold tracking-widest text-da-muted uppercase mb-3">Starting XI</h3>
          <div class="space-y-2">
            ${xi.length ? xi.map((p, i) => `
              <div class="flex items-center gap-3 bg-da-dark/60 border border-da-border rounded-xl px-4 py-2.5">
                <span class="w-6 h-6 rounded-full bg-da-green/20 text-da-green text-xs font-bold flex items-center justify-center">${i + 1}</span>
                <span class="font-medium text-sm">${p}</span>
              </div>
            `).join("") : `<p class="text-da-muted text-sm">No players selected</p>`}
          </div>
        </div>
        <div>
          <h3 class="text-xs font-bold tracking-widest text-da-muted uppercase mb-3">Substitutes</h3>
          <div class="space-y-2">
            ${subs.length ? subs.map(p => `
              <div class="flex items-center gap-3 bg-da-dark/40 border border-da-border rounded-xl px-4 py-2.5">
                <span class="text-da-muted text-xs">SUB</span>
                <span class="font-medium text-sm">${p}</span>
              </div>
            `).join("") : `<p class="text-da-muted text-sm">No substitutes listed</p>`}
          </div>
        </div>
      </div>
    `;
  }
  
  // ---------- TEAM STATS (Attributes) ----------
  async function loadTeamStats() {
    const grid = document.getElementById("team-stats-grid");
    if (!grid || !window.supabaseClient) return;
  
    // First try with all columns
    let { data, error } = await window.supabaseClient
      .from("players")
      .select("id, name, position, pace, shooting, passing, dribbling, defending, physical, overall, photo, photo_url")
      .order("overall", { ascending: false });
  
    // If it fails (column missing), fall back to basic columns
    if (error) {
      console.warn("Full select failed, falling back:", error.message);
      ({ data, error } = await window.supabaseClient
        .from("players")
        .select("id, name, position, photo, photo_url")
        .order("name"));
    }
  
    if (error) {
      console.error("Failed to load players:", error);
      grid.innerHTML = `<p class="text-red-400 text-sm col-span-full">Error loading players: ${error.message}</p>`;
      return;
    }
  
    if (!data || data.length === 0) {
      grid.innerHTML = `<p class="text-da-muted text-sm col-span-full">No player attributes yet.</p>`;
      return;
    }
  
    grid.innerHTML = data.map(p => {
      const attrs = [
        { label: "PAC", val: p.pace ?? 70 },
        { label: "SHO", val: p.shooting ?? 70 },
        { label: "PAS", val: p.passing ?? 70 },
        { label: "DRI", val: p.dribbling ?? 70 },
        { label: "DEF", val: p.defending ?? 70 },
        { label: "PHY", val: p.physical ?? 70 }
      ];
  
      return `
        <div class="bg-da-card border border-da-border rounded-2xl p-5 hover:border-da-green/30 transition-colors">
          <div class="flex items-center gap-3 mb-4">
            ${p.photo || p.photo_url
              ? `<img src="${p.photo || p.photo_url}" class="w-12 h-12 rounded-full object-cover">`
              : `<div class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">${(p.name || "?").charAt(0)}</div>`}
            <div>
              <div class="font-bold text-sm">${p.name || "Unknown"}</div>
              <div class="text-[11px] text-da-muted">${p.position || ""} · OVR <span class="text-da-green font-bold">${p.overall ?? 70}</span></div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2">
            ${attrs.map(a => `
              <div class="bg-da-dark/70 rounded-xl py-2 text-center">
                <div class="text-[10px] text-da-muted font-bold">${a.label}</div>
                <div class="text-sm font-bold ${a.val >= 80 ? "text-da-green" : a.val >= 70 ? "text-white" : "text-da-muted"}">${a.val}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("");
  }
  
  // ---------- IN-GAME RATINGS ----------
  async function loadRatings() {
    const list = document.getElementById("ratings-list");
    const empty = document.getElementById("ratings-empty");
    if (!list || !window.supabaseClient) return;
  
    const { data } = await window.supabaseClient
      .from("match_ratings")
      .select("*, matches(opponent, date, score_home, score_away)")
      .order("created_at", { ascending: false });
  
    if (!data || data.length === 0) {
      list.innerHTML = "";
      empty?.classList.remove("hidden");
      return;
    }
  
    empty?.classList.add("hidden");
  
    // Group by match
    const byMatch = {};
    data.forEach(r => {
      const key = r.match_id || "unknown";
      if (!byMatch[key]) byMatch[key] = { match: r.matches, ratings: [] };
      byMatch[key].ratings.push(r);
    });
  
    list.innerHTML = Object.values(byMatch).map(group => {
      const m = group.match || {};
      return `
        <div class="bg-da-card border border-da-border rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="font-bold">DA United ${m.score_home ?? "–"} - ${m.score_away ?? "–"} ${m.opponent || ""}</div>
              <div class="text-xs text-da-muted">${m.date || ""}</div>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${group.ratings
              .sort((a, b) => (b.rating || 0) - (a.rating || 0))
              .map(r => `
                <div class="flex items-center justify-between bg-da-dark/50 rounded-xl px-4 py-3">
                  <span class="text-sm font-medium">${r.player_name || "Unknown"}</span>
                  <span class="text-lg font-black ${r.rating >= 8 ? "text-da-green" : r.rating >= 6.5 ? "text-white" : "text-red-400"}">
                    ${Number(r.rating).toFixed(1)}
                  </span>
                </div>
              `).join("")}
          </div>
        </div>
      `;
    }).join("");
  }
  
  // Init
  async function initStats() {
    if (!window.supabaseClient) {
      setTimeout(initStats, 150);
      return;
    }
    await Promise.all([loadFormation(), loadTeamStats(), loadRatings()]);
  }
  initStats();
// ======================
// DA United – In-app Update (for the installed PWA)
// Button: #btn-update  (Settings page)
//
// Flow: loading bar (fast) -> 100% -> white screen -> "Enjoy the view"
//       -> 5s -> hard reload with fresh cache, so the new UI/colours appear
//       without deleting and reinstalling the app.
// ======================

(function () {
    const btnUpdate = document.getElementById("btn-update");
    if (!btnUpdate) return;
  
    // ---- Inject the modal + styles once ----
    const style = document.createElement("style");
    style.textContent = `
      #da-update-modal { position: fixed; inset: 0; z-index: 9999; display: none; }
      #da-update-modal.show { display: block; }
      #da-update-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.8); backdrop-filter: blur(4px); }
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
        color: #050805; font-weight: 800; letter-spacing: -.02em;
        font-size: 1.5rem; opacity: 0; transform: translateY(8px);
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
  
    // ---- Clear every cached file so the new code actually loads ----
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
  
    function runUpdate() {
      btnUpdate.disabled = true;
      modal.classList.add("show");
  
      // Start the real work immediately, in the background
      const work = clearAppCaches();
  
      // Fast bar: ~1.4s to 100%
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
  
            // White screen
            modal.classList.remove("show");
            white.classList.add("show");
            requestAnimationFrame(() => white.classList.add("reveal"));
  
            // Hold "Enjoy the view" for 5 seconds, then load the new UI
            setTimeout(() => {
              const url = new URL(window.location.href);
              url.searchParams.set("v", Date.now()); // cache-bust
              window.location.replace(url.toString());
            }, 5000);
          }, 300);
        }
      }, 130);
    }
  
    btnUpdate.addEventListener("click", runUpdate);
  })();
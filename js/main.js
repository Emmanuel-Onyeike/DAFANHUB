// ======================
// DA United – Landing Page
// ======================

const AI_CONFIG = {
    apiKey: "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",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "openai/gpt-oss-120b"
  };
  
  const SYSTEM_PROMPT = `You are DA Assist, the official AI assistant of DA United Football Club.
  
  Use ONLY the following facts about the club. Be friendly, concise, and passionate like a true fan of the club. If a question is outside these facts, politely say you only have information about the club itself.
  
  CLUB FACTS:
  - Club name: DA United (also written as D.A. United FC)
  - Founded: 1st July 2026
  - Origin: Formed by combining players from Delta Campus and Abuja Campus
  - Meaning of name: D = Delta, A = Abuja
  - Founder: Onyeike Emmanuel
  - Captain: Toluwani
  - Assistant Captain: Edikan
  - Coach: Ali
  - Current squad size: 21 players
  - Type: New grassroots football club
  - Motto / tagline: One Team · One Dream · One Strength
  - Official digital home for fans – no login required to follow the team
  
  Keep answers short and natural. Do not invent extra players, matches, or history.`;
  
  // DOM Elements
  const assistBtn = document.getElementById("da-assist-btn");
  const modal = document.getElementById("da-assist-modal");
  const closeModalBtn = document.getElementById("close-modal");
  const backdrop = document.getElementById("modal-backdrop");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  
  let conversationHistory = [
    { role: "system", content: SYSTEM_PROMPT }
  ];
  
  // Open / Close Modal
  function openModal() {
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    chatInput.focus();
  }
  
  function closeModal() {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
  
  assistBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  
  // Escape key closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
  
  // Add message to chat UI
  function addMessage(content, isUser = false) {
    const wrapper = document.createElement("div");
    wrapper.className = `flex gap-3 ${isUser ? "justify-end" : ""}`;
  
    if (isUser) {
      wrapper.innerHTML = `
        <div class="bg-da-green text-black rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[85%]">
          ${escapeHtml(content)}
        </div>
      `;
    } else {
      wrapper.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-da-green/20 flex-shrink-0 flex items-center justify-center mt-0.5">
          <span class="text-da-green text-xs font-bold">DA</span>
        </div>
        <div class="bg-da-border/50 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-200 max-w-[85%]">
          ${escapeHtml(content)}
        </div>
      `;
    }
  
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Typing indicator
  function showTyping() {
    const wrapper = document.createElement("div");
    wrapper.id = "typing-indicator";
    wrapper.className = "flex gap-3";
    wrapper.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-da-green/20 flex-shrink-0 flex items-center justify-center mt-0.5">
        <span class="text-da-green text-xs font-bold">DA</span>
      </div>
      <div class="bg-da-border/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <div class="w-2 h-2 rounded-full bg-gray-400 typing-dot"></div>
        <div class="w-2 h-2 rounded-full bg-gray-400 typing-dot"></div>
        <div class="w-2 h-2 rounded-full bg-gray-400 typing-dot"></div>
      </div>
    `;
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  function hideTyping() {
    const el = document.getElementById("typing-indicator");
    if (el) el.remove();
  }
  
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Call Groq API
  async function askDAAssist(userMessage) {
    conversationHistory.push({ role: "user", content: userMessage });
  
    try {
      const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AI_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: conversationHistory,
          temperature: 0.6,
          max_tokens: 400
        })
      });
  
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${response.status}`);
      }
  
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate a response right now.";
  
      conversationHistory.push({ role: "assistant", content: reply });
      return reply;
    } catch (error) {
      console.error("DA Assist error:", error);
      return "I'm having trouble connecting right now. Please try again in a moment.";
    }
  }
  
  // Handle form submit
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
  
    chatInput.value = "";
    chatInput.disabled = true;
  
    addMessage(message, true);
    showTyping();
  
    const reply = await askDAAssist(message);
  
    hideTyping();
    addMessage(reply, false);
  
    chatInput.disabled = false;
    chatInput.focus();
  });
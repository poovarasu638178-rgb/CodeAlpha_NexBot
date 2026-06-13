/* ============================================================
   NexBot — AI FAQ Assistant  |  script.js
   ============================================================ */

// ── FAQ Knowledge Base ──────────────────────────────────────
const FAQ_DATA = [
  { question: "What is Artificial Intelligence?", answer: "Artificial Intelligence (AI) is the simulation of human intelligence by machines. It enables computers to perform tasks that typically require human cognition — such as learning, reasoning, problem-solving, perception, and language understanding." },
  { question: "What is Machine Learning?", answer: "Machine Learning (ML) is a subset of AI where systems learn patterns from data without being explicitly programmed. You feed data to an algorithm and it discovers patterns on its own." },
  { question: "What is Deep Learning?", answer: "Deep Learning is a specialized branch of Machine Learning that uses artificial neural networks with many layers (hence 'deep'). These networks automatically learn hierarchical representations of data." },
  { question: "What is a Neural Network?", answer: "A neural network is a computing system inspired by the human brain. It consists of interconnected nodes (neurons) organized in layers." },
  { question: "Best AI career paths?", answer: "The hottest AI careers in 2026 are: ML Engineer (high demand, great pay), AI/ML Data Scientist (analytics + modeling), LLM Engineer (fine-tuning and deploying language models), AI Safety Researcher, and Robotics Engineer." },
  { question: "What is Natural Language Processing?", answer: "Natural Language Processing (NLP) is a field of AI focused on enabling computers to understand, interpret, and generate human language." }
];

// ── TF-IDF Engine ───────────────────────────────────────────
const STOPWORDS = new Set(["the","a","an","is","are","was","were","what","how","why","when","where","who","i","you","me","my","your","do","does","did","can","could","would","should","in","on","at","to","for","of","and","or","it","its","this","that","with","from","be","been"]);
const SIMILARITY_THRESHOLD = 0.05;

class TFIDFEngine {
  constructor(documents) {
    this.documents = documents;
    this.vocabulary = new Set();
    this.idf = {};
    this.docVectors = [];
    this._build();
  }

  tokenize(text) {
    return text.toLowerCase().replace(/[^\w\s]/g,"").split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w));
  }

  _build() {
    const docTokens = this.documents.map(doc => this.tokenize(doc));
    const N = this.documents.length;
    docTokens.forEach(tokens => tokens.forEach(t => this.vocabulary.add(t)));
    Array.from(this.vocabulary).forEach(term => {
      const df = docTokens.filter(t => t.includes(term)).length;
      this.idf[term] = Math.log((N + 1) / (df + 1)) + 1;
    });
    this.docVectors = docTokens.map(tokens => this._computeTFIDF(tokens));
  }

  _computeTFIDF(tokens) {
    const tf = {}, total = tokens.length || 1, vector = {};
    tokens.forEach(t => tf[t] = (tf[t] || 0) + 1);
    Object.keys(tf).forEach(term => vector[term] = (tf[term] / total) * (this.idf[term] || 0));
    return vector;
  }

  vectorize(text) { return this._computeTFIDF(this.tokenize(text)); }

  cosineSimilarity(vecA, vecB) {
    const terms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dot = 0, magA = 0, magB = 0;
    terms.forEach(t => {
      const a = vecA[t] || 0, b = vecB[t] || 0;
      dot += a * b; magA += a * a; magB += b * b;
    });
    const mag = Math.sqrt(magA) * Math.sqrt(magB);
    return mag === 0 ? 0 : dot / mag;
  }

  findBestMatch(query) {
    const qVec = this.vectorize(query);
    let bestScore = 0, bestIndex = -1;
    this.docVectors.forEach((dVec, i) => {
      const score = this.cosineSimilarity(qVec, dVec);
      if (score > bestScore) { bestScore = score; bestIndex = i; }
    });
    return { index: bestIndex, score: bestScore };
  }
}

const engine = new TFIDFEngine(FAQ_DATA.map(f => f.question));

// ── Marked.js Setup ─────────────────────────────────────────
if (typeof marked !== "undefined") {
  marked.setOptions({ breaks: true, gfm: true });
}

function parseMarkdown(text) {
  if (typeof marked === "undefined") return escapeHTML(text);
  return marked.parse(text);
}

// ── DOM References ──────────────────────────────────────────
const welcome          = document.getElementById("welcome");
const messages         = document.getElementById("messages");
const messageInput     = document.getElementById("messageInput");
const sendBtn          = document.getElementById("sendBtn");
const clearBtn         = document.getElementById("clearBtn");
const newChatBtn       = document.getElementById("newChatBtn");
const chatContainer    = document.getElementById("chatContainer");
const suggestionsContainer = document.getElementById("suggestionsContainer");
const chatHistory      = document.getElementById("chatHistory");
const topbarTitle      = document.getElementById("topbarTitle");

let isProcessing   = false;
let sessionHistory = [];
let currentChatTitle = "";

const defaultSuggestions = [
  { text: "What is Artificial Intelligence?", icon: "💡" },
  { text: "What is Machine Learning?",        icon: "🧠" },
  { text: "Best AI career paths?",            icon: "🚀" },
  { text: "What is Deep Learning?",           icon: "💬" }
];

// ── Utilities ───────────────────────────────────────────────
function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function scrollToBottom() {
  requestAnimationFrame(() => chatContainer.scrollTop = chatContainer.scrollHeight);
}

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ── Render Suggestions ──────────────────────────────────────
function renderSuggestions() {
  suggestionsContainer.innerHTML = "";
  defaultSuggestions.forEach(sug => {
    const btn = document.createElement("button");
    btn.className = "suggestion-card";
    btn.innerHTML = `<span style="font-size:18px;flex-shrink:0">${sug.icon}</span><span>${escapeHTML(sug.text)}</span>`;
    btn.addEventListener("click", () => sendMessage(sug.text));
    suggestionsContainer.appendChild(btn);
  });
}

// ── Session Storage & History ───────────────────────────────
function saveSession() {
  const state = {
    history: sessionHistory,
    title: currentChatTitle,
    html: messages.innerHTML,
    isActive: messages.classList.contains("active")
  };
  sessionStorage.setItem("nexbot-session", JSON.stringify(state));
}

function renderHistory() {
  chatHistory.innerHTML = "";
  sessionHistory.forEach(q => {
    const btn = document.createElement("button");
    btn.className = "history-item";
    btn.innerHTML = `<span>${escapeHTML(q)}</span>`;
    btn.addEventListener("click", () => {
      welcome.classList.add("hidden");
      messages.classList.add("active");
      sendMessage(q);
      if (isMobile()) closeSidebar();
    });
    chatHistory.appendChild(btn);
  });
}

function addToHistory(query) {
  if (sessionHistory.includes(query)) return;
  sessionHistory.unshift(query);
  if (sessionHistory.length > 6) sessionHistory.pop();
  renderHistory();
  saveSession();
}

// ── Message Creation ────────────────────────────────────────
function createUserMessage(text) {
  const div = document.createElement("div");
  div.className = "message user";
  div.innerHTML = `
    <div class="message-avatar">U</div>
    <div class="message-content">
      <div class="message-header">You <span class="message-time">${formatTime()}</span></div>
      <div class="message-text">${escapeHTML(text)}</div>
    </div>
  `;
  return div;
}

function createTypingIndicator() {
  const div = document.createElement("div");
  div.className = "message bot typing-indicator";
  div.innerHTML = `
    <div class="message-avatar"><img src="favicon.png" alt="NexBot"></div>
    <div class="message-content">
      <div class="message-header">NexBot</div>
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  return div;
}

function createBotMessage(text) {
  const div = document.createElement("div");
  div.className = "message bot";
  div.innerHTML = `
    <div class="message-avatar"><img src="favicon.png" alt="NexBot"></div>
    <div class="message-content">
      <div class="message-header">NexBot <span class="message-time">${formatTime()}</span></div>
      <div class="message-text markdown-body">${parseMarkdown(text)}</div>
    </div>
  `;
  return div;
}

// ── API Call ────────────────────────────────────────────────
async function fetchNvidiaResponse(userMessage) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage })
    });
    if (!res.ok) throw new Error("API error " + res.status);
    const data = await res.json();
    return data.reply;
  } catch (err) {
    console.error(err);
    return "I'm having trouble connecting right now. Please try again in a moment!";
  }
}

async function getBotAnswer(query) {
  const { index, score } = engine.findBestMatch(query);
  if (score >= SIMILARITY_THRESHOLD && index !== -1) {
    return FAQ_DATA[index].answer;
  }
  return fetchNvidiaResponse(query);
}

// ── Send Message ────────────────────────────────────────────
async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed || isProcessing) return;

  isProcessing = true;
  welcome.classList.add("hidden");
  messages.classList.add("active");

  if (!currentChatTitle) {
    currentChatTitle = trimmed;
    if (topbarTitle) {
      topbarTitle.textContent = currentChatTitle;
    }
    addToHistory(trimmed);
  }

  messages.appendChild(createUserMessage(trimmed));
  scrollToBottom();
  saveSession();

  messageInput.value = "";
  messageInput.style.height = "auto";
  updateSendButton();

  const typing = createTypingIndicator();
  messages.appendChild(typing);
  scrollToBottom();

  try {
    const answer = await getBotAnswer(trimmed);
    typing.remove();
    
    const botMsg = createBotMessage("");
    messages.appendChild(botMsg);
    const contentDiv = botMsg.querySelector(".message-text");
    
    let currentText = "";
    const chunkSize = 3; // 3 chars per tick for a fast, readable typing speed
    for (let i = 0; i < answer.length; i += chunkSize) {
      currentText += answer.substring(i, i + chunkSize);
      contentDiv.innerHTML = parseMarkdown(currentText);
      scrollToBottom();
      await new Promise(r => setTimeout(r, 10)); // 10ms delay
    }
    contentDiv.innerHTML = parseMarkdown(answer);
    scrollToBottom();
    saveSession();
  } catch (err) {
    typing.remove();
    messages.appendChild(createBotMessage("An error occurred. Please try again!"));
    scrollToBottom();
    saveSession();
  } finally {
    isProcessing = false;
    updateSendButton();
  }
}

// ── Input Events ────────────────────────────────────────────
function updateSendButton() {
  sendBtn.disabled = !messageInput.value.trim() || isProcessing;
}

messageInput.addEventListener("input", () => {
  updateSendButton();
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + "px";
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage(messageInput.value);
  }
});

sendBtn.addEventListener("click", () => sendMessage(messageInput.value));

function resetChat() {
  welcome.classList.remove("hidden");
  messages.classList.remove("active");
  messages.innerHTML = "";
  isProcessing = false;
  currentChatTitle = "";
  if (topbarTitle) topbarTitle.textContent = "";
  updateSendButton();
  saveSession();
}

clearBtn.addEventListener("click", resetChat);
newChatBtn.addEventListener("click", () => {
  resetChat();
  if (isMobile()) closeSidebar();
});

// ── Dark Mode Toggle ────────────────────────────────────────
const html        = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

// Load saved theme
const savedTheme = localStorage.getItem("nexbot-theme") || "light";
html.setAttribute("data-theme", savedTheme);

themeToggle.addEventListener("click", () => {
  const current = html.getAttribute("data-theme");
  const next    = current === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  localStorage.setItem("nexbot-theme", next);
});

// ── Sidebar Logic ───────────────────────────────────────────
const sidebar        = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarToggleBtn  = document.getElementById("sidebar-toggle");
const sidebarCloseBtn   = document.getElementById("sidebarCloseBtn");

function isMobile() { return window.innerWidth <= 768; }

function openSidebar() {
  if (isMobile()) {
    // Mobile: slide in using transform class
    sidebar.classList.add("mobile-open");
    sidebar.classList.remove("collapsed");
    sidebarOverlay.classList.add("active");
  } else {
    // Desktop: remove collapsed to expand via width
    sidebar.classList.remove("collapsed");
  }
}

function closeSidebar() {
  if (isMobile()) {
    sidebar.classList.remove("mobile-open");
    sidebarOverlay.classList.remove("active");
  } else {
    sidebar.classList.add("collapsed");
  }
}

function toggleSidebar() {
  if (isMobile()) {
    if (sidebar.classList.contains("mobile-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  } else {
    if (sidebar.classList.contains("collapsed")) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }
}

// Mobile: sidebar starts hidden
if (isMobile()) {
  sidebar.classList.remove("mobile-open");
}

// Events
if (sidebarToggleBtn) sidebarToggleBtn.addEventListener("click", toggleSidebar);
if (sidebarCloseBtn)  sidebarCloseBtn.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

// Close sidebar on mobile when clicking a history item
chatHistory.addEventListener("click", () => {
  if (isMobile()) closeSidebar();
});

// On resize: reset sidebar state
window.addEventListener("resize", () => {
  if (!isMobile()) {
    // Came back to desktop — ensure overlay is hidden
    sidebarOverlay.classList.remove("active");
    sidebar.classList.remove("mobile-open");
  }
});

// ── Init ────────────────────────────────────────────────────
function restoreSession() {
  try {
    const saved = sessionStorage.getItem("nexbot-session");
    if (saved) {
      const state = JSON.parse(saved);
      if (state.history) {
        sessionHistory = state.history;
        renderHistory();
      }
      if (state.title) {
        currentChatTitle = state.title;
        if (topbarTitle) topbarTitle.textContent = currentChatTitle;
      }
      if (state.html) {
        messages.innerHTML = state.html;
      }
      if (state.isActive) {
        welcome.classList.add("hidden");
        messages.classList.add("active");
        scrollToBottom();
      }
    }
  } catch (e) {
    console.error("Failed to restore session", e);
  }
}

renderSuggestions();
restoreSession();

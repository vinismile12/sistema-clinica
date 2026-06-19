/* ============================================================
   CLÍNICA BEM VIVER — main.js
   Chatbot com fluxo guiado local (sem API externa) + formulário
   ============================================================ */

// ── ESTADO DO CHATBOT ────────────────────────────────────────
const chatState = {
  step: "start",
  nome: "",
  especialidade: "",
  profissional: "",
  data: "",
  hora: ""
};

let chatOpen    = false;
let chatStarted = false;

// ── BASE DE CONHECIMENTO LOCAL ───────────────────────────────
const PROFISSIONAIS_POR_ESPECIALIDADE = {
  "Cardiologia":     ["Dr. Bruno Melo", "Sem preferência"],
  "Neurologia":      ["Dra. Amanda Freitas", "Sem preferência"],
  "Ortopedia":       ["Dr. Rafael Costa", "Sem preferência"],
  "Pediatria":       ["Dra. Luciana Santos", "Sem preferência"],
  "Psiquiatria":     ["Dr. Marcos Oliveira", "Sem preferência"],
  "Clínica Geral":   ["Dra. Paula Lima", "Sem preferência"],
  "Oftalmologia":    ["Sem preferência"],
  "Endocrinologia":  ["Sem preferência"]
};

const ESPECIALIDADES = [
  "Cardiologia", "Neurologia", "Clínica Geral", "Ortopedia",
  "Pediatria", "Psiquiatria", "Oftalmologia", "Endocrinologia"
];

const DATAS_SUGERIDAS = ["Amanhã", "Esta semana", "Semana que vem", "Outra data"];

const HORARIOS = ["07:00","08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00","18:00"];

// ── HELPERS DE TEMPO ──────────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── DOM HELPERS ───────────────────────────────────────────────
function scrollChat() {
  const msgs = document.getElementById("chatMessages");
  if (msgs) setTimeout(() => (msgs.scrollTop = msgs.scrollHeight), 60);
}

function addBotMsg(text) {
  const msgs = document.getElementById("chatMessages");
  const el   = document.createElement("div");
  el.className = "msg msg-bot";
  const html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
  el.innerHTML = `<div class="msg-bubble">${html}</div><div class="msg-time">${now()}</div>`;
  msgs.appendChild(el);
  scrollChat();
}

function addUserMsg(text) {
  const msgs = document.getElementById("chatMessages");
  const el   = document.createElement("div");
  el.className = "msg msg-user";
  el.innerHTML = `<div class="msg-bubble">${text}</div><div class="msg-time">${now()}</div>`;
  msgs.appendChild(el);
  scrollChat();
}

function showTypingIndicator(delay = 800) {
  return new Promise(resolve => {
    const msgs = document.getElementById("chatMessages");
    const el   = document.createElement("div");
    el.className = "msg msg-bot";
    el.id = "typing-el";
    el.innerHTML =
      `<div class="typing-indicator">
         <div class="typing-dot"></div>
         <div class="typing-dot"></div>
         <div class="typing-dot"></div>
       </div>`;
    msgs.appendChild(el);
    scrollChat();
    setTimeout(() => {
      const t = document.getElementById("typing-el");
      if (t) t.remove();
      resolve();
    }, delay);
  });
}

function setOptions(options) {
  const container = document.getElementById("chatOptions");
  if (!container) return;
  container.innerHTML = "";
  options.forEach(opt => {
    const btn       = document.createElement("button");
    btn.className   = "chat-opt-btn";
    btn.textContent = opt;
    btn.onclick     = () => handleOption(opt);
    container.appendChild(btn);
  });
}

function clearOptions() {
  const container = document.getElementById("chatOptions");
  if (container) container.innerHTML = "";
}

function setChatInputEnabled(enabled) {
  const input = document.getElementById("chatInput");
  const send  = document.getElementById("chatSend");
  if (input) {
    input.disabled    = !enabled;
    input.placeholder = enabled ? "Digite aqui..." : "Selecione uma opção acima";
  }
  if (send) send.disabled = !enabled;
}

// ── FLUXO DO CHATBOT ──────────────────────────────────────────
async function initChat() {
  document.getElementById("chatMessages").innerHTML = "";
  clearOptions();

  Object.assign(chatState, {
    step: "start", nome: "", especialidade: "",
    profissional: "", data: "", hora: ""
  });

  await showTypingIndicator(700);
  addBotMsg("Olá! 👋 Seja bem-vindo(a) à Clínica Bem Viver.\n\nSou o assistente virtual e posso te ajudar a agendar sua consulta agora mesmo. Como você se chama?");
  setChatInputEnabled(true);
  document.getElementById("chatInput")?.focus();
}

function handleKey(e) {
  if (e.key === "Enter") sendUserMessage();
}

function sendUserMessage() {
  const input = document.getElementById("chatInput");
  const text  = (input?.value || "").trim();
  if (!text) return;
  input.value = "";
  processFreeTextInput(text);
}

function processFreeTextInput(text) {
  if (chatState.step === "start") {
    chatState.nome = text;
    chatState.step = "nome_received";
    addUserMsg(text);
    setChatInputEnabled(false);

    showTypingIndicator(800).then(() => {
      addBotMsg(`Que ótimo, ${primeiroNome(text)}! 😊 Por qual especialidade você está procurando atendimento?`);
      setOptions(ESPECIALIDADES);
    });
    return;
  }

  // Para outras etapas, o fluxo é guiado por botões — texto livre recebe orientação gentil
  addUserMsg(text);
  showTypingIndicator(500).then(() => {
    addBotMsg("Por favor, selecione uma das opções abaixo para continuarmos com o agendamento. 🙂");
  });
}

function handleOption(opt) {
  clearOptions();
  addUserMsg(opt);
  setChatInputEnabled(false);

  if (opt === "Fazer outro agendamento") {
    setTimeout(initChat, 400);
    return;
  }
  if (opt === "Encerrar") {
    showTypingIndicator(500).then(() => {
      addBotMsg("Até mais! Se precisar, é só nos chamar. 💚");
    });
    return;
  }
  if (opt === "✏️ Corrigir informações") {
    setTimeout(initChat, 400);
    return;
  }

  switch (chatState.step) {
    case "nome_received":
      handleEspecialidadeChosen(opt);
      break;
    case "especialidade_received":
      handleProfissionalChosen(opt);
      break;
    case "prof_received":
      handleDataChosen(opt);
      break;
    case "data_received":
      handleHoraChosen(opt);
      break;
    case "hora_received":
      if (opt === "✅ Confirmar agendamento") {
        handleConfirmacao();
      }
      break;
  }
}

function handleEspecialidadeChosen(esp) {
  chatState.especialidade = esp;
  chatState.step = "especialidade_received";
  const opcoesProf = PROFISSIONAIS_POR_ESPECIALIDADE[esp] || ["Sem preferência"];

  showTypingIndicator(750).then(() => {
    addBotMsg(`Perfeito! Temos ótimos profissionais em ${esp}. Você tem preferência por algum deles?`);
    setOptions(opcoesProf);
  });
}

function handleProfissionalChosen(prof) {
  chatState.profissional = prof;
  chatState.step = "prof_received";

  showTypingIndicator(700).then(() => {
    addBotMsg("Entendido! Qual data você prefere para a consulta? Atendemos de segunda a sábado, das 7h às 19h.");
    setOptions(DATAS_SUGERIDAS);
  });
}

function handleDataChosen(data) {
  chatState.data = data;
  chatState.step = "data_received";

  showTypingIndicator(700).then(() => {
    addBotMsg("Ótima escolha! Qual horário é melhor para você?");
    setOptions(HORARIOS);
  });
}

function handleHoraChosen(hora) {
  chatState.hora = hora;
  chatState.step = "hora_received";

  const profTexto = chatState.profissional === "Sem preferência"
    ? "profissional disponível"
    : chatState.profissional;

  const resumo =
    `Tudo certo! Vou confirmar seu agendamento:\n\n` +
    `📋 **Paciente:** ${chatState.nome}\n` +
    `🏥 **Especialidade:** ${chatState.especialidade}\n` +
    `👨‍⚕️ **Profissional:** ${profTexto}\n` +
    `📅 **Data:** ${chatState.data}\n` +
    `🕐 **Horário:** ${chatState.hora}\n\n` +
    `Confirmo o agendamento?`;

  showTypingIndicator(900).then(() => {
    addBotMsg(resumo);
    setOptions(["✅ Confirmar agendamento", "✏️ Corrigir informações"]);
  });
}

function handleConfirmacao() {
  chatState.step = "confirmed";
  const primeiroNomePaciente = primeiroNome(chatState.nome);

  showTypingIndicator(1000).then(() => {
    addBotMsg(
      `Maravilha! 🎉 Seu agendamento foi registrado com sucesso, ${primeiroNomePaciente}!\n\n` +
      `Nossa equipe vai confirmar via WhatsApp ou e-mail em breve. Caso precise de algo, estamos por aqui. Cuide-se bem! 💚`
    );
    setOptions(["Fazer outro agendamento", "Encerrar"]);
  });
}

function primeiroNome(nomeCompleto) {
  return (nomeCompleto || "").trim().split(" ")[0] || nomeCompleto;
}

// ── TOGGLE CHAT ───────────────────────────────────────────────
function toggleChat() {
  chatOpen = !chatOpen;
  const panel   = document.getElementById("chatPanel");
  const fabIcon = document.getElementById("chatFabIcon");
  panel?.classList.toggle("open", chatOpen);
  if (fabIcon) fabIcon.textContent = chatOpen ? "×" : "💬";

  if (chatOpen && !chatStarted) {
    chatStarted = true;
    initChat();
  }
}

function openChat() {
  if (!chatOpen) toggleChat();
}

// ── FORMULÁRIO ────────────────────────────────────────────────
function submitForm(e) {
  e.preventDefault();

  const nome = document.getElementById("f-nome")?.value || "";
  const tel  = document.getElementById("f-tel")?.value  || "";
  const esp  = document.getElementById("f-esp")?.value  || "";
  const prof = document.getElementById("f-prof")?.value || "Sem preferência";
  const data = document.getElementById("f-data")?.value || "";
  const hora = document.getElementById("f-hora")?.value || "";

  const fmt = data
    ? new Date(data + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric"
      })
    : "";

  const detail = document.getElementById("modalDetail");
  if (detail) {
    detail.innerHTML = `
      <div class="modal-detail-row"><span>Paciente</span><span>${nome}</span></div>
      <div class="modal-detail-row"><span>Contato</span><span>${tel}</span></div>
      <div class="modal-detail-row"><span>Especialidade</span><span>${esp}</span></div>
      <div class="modal-detail-row"><span>Profissional</span><span>${prof}</span></div>
      <div class="modal-detail-row"><span>Data</span><span>${fmt}</span></div>
      <div class="modal-detail-row"><span>Horário</span><span>${hora}</span></div>
    `;
  }

  document.getElementById("confirmModal")?.classList.add("open");
}

function closeModal() {
  document.getElementById("confirmModal")?.classList.remove("open");
  document.getElementById("schedForm")?.reset();
  showToast("✅ Agendamento enviado com sucesso!");
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}

// ── NAV SCROLL ────────────────────────────────────────────────
function initNav() {
  const nav = document.querySelector("nav");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 10);
  });
}

// ── MENU MOBILE ───────────────────────────────────────────────
function toggleMenu() {
  document.getElementById("navMobile")?.classList.toggle("open");
}

// ── DATA MÍNIMA FORMULÁRIO ────────────────────────────────────
function initDateMin() {
  const dateInput = document.getElementById("f-data");
  if (dateInput) {
    dateInput.min = new Date().toISOString().split("T")[0];
  }
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initDateMin();
});

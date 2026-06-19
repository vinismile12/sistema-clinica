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
    input.disabled    = false; // Sempre habilitado para permitir perguntas a qualquer momento
    input.placeholder = "Digite sua mensagem...";
  }
  if (send) send.disabled = false;
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

// ── CONTEXTO E INTEGRAÇÃO DO GEMINI ───────────────────────────
const CLINICA_CONTEXTO = `
Você é o assistente virtual inteligente da Clínica Bem Viver.
Seu objetivo é tirar dúvidas de forma simpática, prestativa e concisa.

Informações sobre a Clínica:
- Nome: Clínica Bem Viver
- Endereço: Av. Frei Serafim, 100 · Teresina, PI
- Telefone/Contato: (86) 3000-0000 (Telefone fixo) ou pelo WhatsApp no número (86) 9 0000-0000.
- Horário de funcionamento: Segunda a Sábado, das 7h00 às 19h00.
- Agendamento: Pode ser feito no site através do formulário ou diretamente neste chat de forma automatizada. Se o usuário quiser agendar, oriente-o a usar os botões/opções do chat ou digite "agendar" para iniciar/reiniciar o fluxo de agendamento guiado.

Especialidades oferecidas:
- Cardiologia: Diagnóstico e tratamento de doenças do coração e sistema cardiovascular.
- Neurologia: Cuidados com o sistema nervoso, cérebro e coluna vertebral.
- Clínica Geral: Atendimento preventivo e acompanhamento da saúde geral do paciente.
- Ortopedia: Tratamento de lesões, ossos, articulações, músculos e tendões.
- Pediatria: Saúde e desenvolvimento de bebês, crianças e adolescentes.
- Psiquiatria: Diagnóstico e acompanhamento de saúde mental e bem-estar emocional.
- Oftalmologia: Cuidados completos com a saúde dos olhos e visão.
- Endocrinologia: Tratamento de distúrbios hormonais, diabetes e tireoide.

Nossa equipe médica (Profissionais):
- Dr. Bruno Melo (Cardiologia): Especialista em cardiologia intervencionista com 15 anos de experiência. CRM 12.345-PI.
- Dra. Amanda Freitas (Neurologia): Referência em tratamento de enxaquecas crônicas. CRM 23.456-PI.
- Dr. Rafael Costa (Ortopedia): Especialista em cirurgia do joelho e medicina esportiva. CRM 34.567-PI.
- Dra. Luciana Santos (Pediatria): Pediatra com foco em desenvolvimento infantil e puericultura. CRM 45.678-PI.
- Dr. Marcos Oliveira (Psiquiatria): Especialista em transtornos de ansiedade e saúde mental integrativa. CRM 56.789-PI.
- Dra. Paula Lima (Clínica Geral): Médica generalista com abordagem preventiva e humanizada. CRM 67.890-PI.

Instruções importantes de comportamento:
1. Responda em português brasileiro de forma direta e curta (máximo de 2-3 parágrafos ou alguns bullet points), mantendo o tom profissional e acolhedor de uma clínica de saúde.
2. Não invente médicos, especialidades ou contatos que não estejam listados acima. Se não souber a resposta ou se for algo de cunho médico complexo, sugira entrar em contato com a equipe humana pelo WhatsApp (86) 9 0000-0000.
3. Se o usuário disser que quer fazer um agendamento, diga que para começar basta digitar "agendar" ou usar o fluxo guiado.
`;

function getGeminiApiKey() {
  if (typeof GEMINI_API_KEY !== 'undefined' && GEMINI_API_KEY && GEMINI_API_KEY !== "SUA_CHAVE_AQUI") {
    return GEMINI_API_KEY;
  }
  return localStorage.getItem('GEMINI_API_KEY');
}

async function callGeminiAPI(promptText) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }]
        }
      ],
      systemInstruction: {
        parts: [{ text: CLINICA_CONTEXTO }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Gemini API Error details:", errorData);
    throw new Error(errorData.error?.message || "HTTP Error " + response.status);
  }
  
  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error("Resposta vazia da API do Gemini.");
  }
  return reply.trim();
}

async function getDynamicBotMsg(prompt, defaultMsg) {
  try {
    const responseText = await callGeminiAPI(prompt + "\n\nResponda em português brasileiro, de forma acolhedora, concisa (máximo 1 ou 2 frases curtas) e sem qualquer tipo de formatação em negrito ou markdown complexo.");
    return responseText;
  } catch (err) {
    console.warn("Falha ao gerar resposta dinâmica com Gemini, usando padrão.", err);
    return defaultMsg;
  }
}

function isQuestionOrGeneralQuery(text) {
  const normalized = text.toLowerCase().trim();
  
  if (normalized.includes("?")) return true;
  
  const keywords = [
    "onde", "como", "quem", "quanto", "qual", "quais", "queres", "horario", "funcionamento",
    "telefone", "whatsapp", "contato", "endereco", "localizacao", "localiza", "fica",
    "medico", "medicos", "doutor", "doutora", "dr.", "dra.", "dr ", "dra ", "especialidades",
    "aceita", "plano", "convenio", "valor", "preco", "consulta", "atendimento", "sabado",
    "segunda", "domingo", "clinica", "bem viver", "ajuda", "informacao", "informações",
    "quem é", "conhece"
  ];
  
  return keywords.some(keyword => normalized.includes(keyword));
}

function findMatchingOption(text) {
  const normalized = text.toLowerCase().trim();
  let availableOptions = [];
  
  switch (chatState.step) {
    case "nome_received":
      availableOptions = ESPECIALIDADES;
      break;
    case "especialidade_received":
      availableOptions = PROFISSIONAIS_POR_ESPECIALIDADE[chatState.especialidade] || ["Sem preferência"];
      break;
    case "prof_received":
      availableOptions = DATAS_SUGERIDAS;
      break;
    case "data_received":
      availableOptions = HORARIOS;
      break;
    case "hora_received":
      availableOptions = ["✅ Confirmar agendamento", "✏️ Corrigir informações", "Confirmar agendamento", "Corrigir informações", "Confirmar", "Corrigir"];
      break;
    case "confirmed":
      availableOptions = ["Fazer outro agendamento", "Encerrar", "Outro agendamento", "Fechar"];
      break;
  }
  
  for (const opt of availableOptions) {
    const cleanOpt = opt.replace(/[✅✏️]/g, "").toLowerCase().trim();
    if (normalized === cleanOpt || normalized === opt.toLowerCase().trim()) {
      return opt;
    }
  }
  return null;
}

function reShowCurrentStepOptions() {
  switch (chatState.step) {
    case "nome_received":
      setOptions(ESPECIALIDADES);
      break;
    case "especialidade_received":
      const opcoesProf = PROFISSIONAIS_POR_ESPECIALIDADE[chatState.especialidade] || ["Sem preferência"];
      setOptions(opcoesProf);
      break;
    case "prof_received":
      setOptions(DATAS_SUGERIDAS);
      break;
    case "data_received":
      setOptions(HORARIOS);
      break;
    case "hora_received":
      setOptions(["✅ Confirmar agendamento", "✏️ Corrigir informações"]);
      break;
    case "confirmed":
      setOptions(["Fazer outro agendamento", "Encerrar"]);
      break;
    default:
      setChatInputEnabled(true);
      break;
  }
}

async function processFreeTextInput(text) {
  const lowerText = text.toLowerCase().trim();

  // Se o usuário quiser explicitamente agendar/reiniciar o fluxo
  if (lowerText === "agendar" || lowerText === "marcar" || lowerText === "marcar consulta" || lowerText === "iniciar") {
    addUserMsg(text);
    initChat();
    return;
  }

  // Intercepta se o usuário digitar uma API key do Gemini para configurar
  if (text.startsWith("AIzaSy") && text.length > 30) {
    addUserMsg("••••••••••••••••••••"); // Oculta a chave no chat por privacidade
    localStorage.setItem("GEMINI_API_KEY", text);
    await showTypingIndicator(600);
    addBotMsg("Chave da API do Gemini configurada com sucesso no seu navegador! 🎉 Agora você pode fazer perguntas gerais sobre a clínica.");
    reShowCurrentStepOptions();
    return;
  }

  // Verifica se o texto digitado corresponde a uma das opções ativas de botões para o passo atual
  const matchedOption = findMatchingOption(text);
  if (matchedOption) {
    handleOption(matchedOption);
    return;
  }

  // Se for o início do chat e não for uma pergunta geral, assume que é o nome do paciente
  if (chatState.step === "start" && !isQuestionOrGeneralQuery(text)) {
    chatState.nome = text;
    chatState.step = "nome_received";
    addUserMsg(text);
    setChatInputEnabled(false);

    await showTypingIndicator(800);
    const defaultMsg = `Que ótimo, ${primeiroNome(text)}! 😊 Por qual especialidade você está procurando atendimento?`;
    const prompt = `O paciente acabou de dizer que se chama ${text}. Diga um olá simpático e pergunte por qual especialidade médica ele está procurando atendimento hoje.`;
    const msg = await getDynamicBotMsg(prompt, defaultMsg);
    addBotMsg(msg);
    setOptions(ESPECIALIDADES);
    return;
  }

  // Caso contrário, tratamos como uma pergunta livre
  addUserMsg(text);
  await showTypingIndicator(600);

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    addBotMsg("Para que eu possa responder a dúvidas gerais sobre a clínica usando a inteligência do Gemini, preciso de uma chave de API.\n\nPor favor, **digite ou cole sua chave da API do Gemini** (ela começa com 'AIzaSy') aqui no chat para configurá-la de forma segura localmente no seu navegador.");
    setChatInputEnabled(true);
    return;
  }

  try {
    const responseText = await callGeminiAPI(text);
    addBotMsg(responseText);
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    if (error.message === "API_KEY_MISSING") {
      addBotMsg("A chave da API do Gemini não foi encontrada. Digite-a no chat para configurar.");
    } else {
      addBotMsg("Desculpe, tive um problema ao processar sua pergunta. Por favor, tente novamente ou entre em contato pelo WhatsApp (86) 9 0000-0000.");
    }
  }

  // Exibe as opções de botões correspondentes ao passo em que o usuário estava
  reShowCurrentStepOptions();
}

async function handleOption(opt) {
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
      await handleEspecialidadeChosen(opt);
      break;
    case "especialidade_received":
      await handleProfissionalChosen(opt);
      break;
    case "prof_received":
      await handleDataChosen(opt);
      break;
    case "data_received":
      await handleHoraChosen(opt);
      break;
    case "hora_received":
      if (opt === "✅ Confirmar agendamento") {
        await handleConfirmacao();
      }
      break;
  }
}

async function handleEspecialidadeChosen(esp) {
  chatState.especialidade = esp;
  chatState.step = "especialidade_received";
  const opcoesProf = PROFISSIONAIS_POR_ESPECIALIDADE[esp] || ["Sem preferência"];

  await showTypingIndicator(750);
  const defaultMsg = `Perfeito! Temos ótimos profissionais em ${esp}. Você tem preferência por algum deles?`;
  const prompt = `O paciente escolheu a especialidade ${esp}. Confirme a escolha de forma positiva e pergunte se ele tem preferência por algum dos profissionais listados.`;
  const msg = await getDynamicBotMsg(prompt, defaultMsg);
  addBotMsg(msg);
  setOptions(opcoesProf);
}

async function handleProfissionalChosen(prof) {
  chatState.profissional = prof;
  chatState.step = "prof_received";

  await showTypingIndicator(700);
  const defaultMsg = "Entendido! Qual data você prefere para a consulta? Atendemos de segunda a sábado, das 7h às 19h.";
  const prompt = `O paciente escolheu o profissional ${prof} (ou sem preferência). Confirme e pergunte qual data ele prefere para a consulta, lembrando que o atendimento é de segunda a sábado, das 7h às 19h.`;
  const msg = await getDynamicBotMsg(prompt, defaultMsg);
  addBotMsg(msg);
  setOptions(DATAS_SUGERIDAS);
}

async function handleDataChosen(data) {
  chatState.data = data;
  chatState.step = "data_received";

  await showTypingIndicator(700);
  const defaultMsg = "Ótima escolha! Qual horário é melhor para você?";
  const prompt = `O paciente escolheu a data ${data}. Confirme e pergunte qual o melhor horário para ele.`;
  const msg = await getDynamicBotMsg(prompt, defaultMsg);
  addBotMsg(msg);
  setOptions(HORARIOS);
}

async function handleHoraChosen(hora) {
  chatState.hora = hora;
  chatState.step = "hora_received";

  const profTexto = chatState.profissional === "Sem preferência"
    ? "profissional disponível"
    : chatState.profissional;

  await showTypingIndicator(900);
  const defaultIntro = "Tudo certo! Vou confirmar seu agendamento:";
  const prompt = `O paciente concluiu a seleção da consulta no horário ${hora}. Diga que está tudo pronto e que vai apresentar os dados para confirmação do agendamento.`;
  const intro = await getDynamicBotMsg(prompt, defaultIntro);

  const resumo =
    `${intro}\n\n` +
    `📋 **Paciente:** ${chatState.nome}\n` +
    `🏥 **Especialidade:** ${chatState.especialidade}\n` +
    `👨‍⚕️ **Profissional:** ${profTexto}\n` +
    `📅 **Data:** ${chatState.data}\n` +
    `🕐 **Horário:** ${chatState.hora}\n\n` +
    `Confirmo o agendamento?`;

  addBotMsg(resumo);
  setOptions(["✅ Confirmar agendamento", "✏️ Corrigir informações"]);
}

async function handleConfirmacao() {
  chatState.step = "confirmed";
  const primeiroNomePaciente = primeiroNome(chatState.nome);

  await showTypingIndicator(1000);
  const defaultMsg = `Maravilha! 🎉 Seu agendamento foi registrado com sucesso, ${primeiroNomePaciente}!\n\nNossa equipe vai confirmar via WhatsApp ou e-mail em breve. Caso precise de algo, estamos por aqui. Cuide-se bem! 💚`;
  const prompt = `O agendamento do paciente ${primeiroNomePaciente} foi confirmado com sucesso. Agradeça calorosamente, diga que a equipe entrará em contato via WhatsApp ou e-mail em breve para confirmar, e deseje que ele se cuide bem.`;
  const msg = await getDynamicBotMsg(prompt, defaultMsg);
  addBotMsg(msg);
  setOptions(["Fazer outro agendamento", "Encerrar"]);
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

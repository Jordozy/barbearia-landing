/* ============================================================
   BARBEARIA NAVALHA DE OURO — script.js
   Funcionalidades:
   1. Configuração (número de WhatsApp, horários)
   2. Menu hamburger (mobile)
   3. Header com sombra ao rolar + ano dinâmico
   4. Animações on-scroll (Intersection Observer)
   5. Contadores animados da prova social
   6. Botões "Agendar" dos cards de serviço (pré-seleciona dropdown)
   7. Máscara de telefone
   8. Geração de horários disponíveis + data mínima
   9. Validação do formulário + envio via WhatsApp (wa.me)
   10. Accordion do FAQ
============================================================ */

"use strict";

/* ---------- 1. Configuração central ---------- */
const CONFIG = {
  // Troque pelo número real da barbearia (formato internacional, sem "+" ou espaços)
  whatsappNumber: "5511987654321",
  businessName: "Navalha de Ouro",
  // Horários de funcionamento para geração das slots
  openHours: { start: 9, end: 20 },   // dias úteis (ter–sex)
  saturdayEnd: 18,                     // sábado
  slotIntervalMin: 30,                 // intervalo entre horários (min)
  closedWeekdays: [0, 1],              // 0 = domingo, 1 = segunda (fechado)
};

/* ---------- 2. Menu hamburger (mobile) ---------- */
const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("nav-menu");

function toggleMenu(forceClose = false) {
  const isOpen = forceClose ? false : !nav.classList.contains("open");
  nav.classList.toggle("open", isOpen);
  hamburger.classList.toggle("active", isOpen);
  hamburger.setAttribute("aria-expanded", String(isOpen));
  hamburger.setAttribute("aria-label", isOpen ? "Fechar menu de navegação" : "Abrir menu de navegação");
}

hamburger.addEventListener("click", () => toggleMenu());

// Fecha o drawer ao clicar em um link do menu
nav.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => toggleMenu(true))
);

// Fecha com a tecla ESC (acessibilidade por teclado)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("open")) toggleMenu(true);
});

/* ---------- 3. Header com sombra ao rolar + ano dinâmico ---------- */
const header = document.querySelector(".header");

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- 4. Animações on-scroll com Intersection Observer ---------- */
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // anima apenas uma vez
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- 5. Contadores animados da prova social ---------- */
function animateCounter(el) {
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const suffix = el.dataset.suffix || "";
  const duration = 1600; // ms
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = target * eased;
    el.textContent =
      value.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statsObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll(".stat__number").forEach((el) => statsObserver.observe(el));

/* ---------- 6. Cards de serviço → pré-seleciona o dropdown ---------- */
const serviceSelect = document.getElementById("servico");

document.querySelectorAll(".book-service").forEach((btn) => {
  btn.addEventListener("click", () => {
    const wanted = btn.dataset.service; // ex.: "Corte + Barba"
    // As opções têm o formato "Nome — R$ XX"; casamos pelo prefixo
    [...serviceSelect.options].forEach((opt) => {
      if (opt.text.startsWith(wanted)) serviceSelect.value = opt.value || opt.text;
    });
    document.getElementById("agendamento").scrollIntoView({ behavior: "smooth" });
    serviceSelect.focus({ preventScroll: true });
  });
});

/* ---------- 7. Máscara de telefone no input ---------- */
const phoneInput = document.getElementById("telefone");

phoneInput.addEventListener("input", (e) => {
  let digits = e.target.value.replace(/\D/g, "");
  if (digits.length > 11) digits = digits.slice(0, 11);

  let formatted = digits;
  if (digits.length > 0) formatted = "(" + digits.slice(0, 2);
  if (digits.length >= 3) formatted += ") " + digits.slice(2, 7);
  if (digits.length >= 8) formatted += "-" + digits.slice(7, 11);

  e.target.value = formatted;
});

/* ---------- 8. Data mínima/maximum e geração de horários ---------- */
const dateInput = document.getElementById("data");
const timeSelect = document.getElementById("hora");

// Hoje como data mínima; máxima de 60 dias à frente
const today = new Date();
const maxDate = new Date();
maxDate.setDate(today.getDate() + 60);

const toISODate = (d) => d.toISOString().split("T")[0];
dateInput.min = toISODate(today);
dateInput.max = toISODate(maxDate);

function buildTimeSlots(dateStr) {
  timeSelect.innerHTML = '<option value="" disabled selected>Horário…</option>';
  if (!dateStr) return;

  const chosen = new Date(dateStr + "T12:00:00"); // meio-dia evita problemas de fuso
  const weekday = chosen.getDay();

  if (CONFIG.closedWeekdays.includes(weekday)) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.disabled = true;
    opt.selected = true;
    opt.textContent = "Estamos fechados neste dia 😕";
    timeSelect.appendChild(opt);
    return;
  }

  const endHour = weekday === 6 ? CONFIG.saturdayEnd : CONFIG.openHours.end;

  for (let h = CONFIG.openHours.start; h < endHour; h++) {
    for (let m = 0; m < 60; m += CONFIG.slotIntervalMin) {
      const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const opt = document.createElement("option");
      opt.value = label;
      opt.textContent = label;
      timeSelect.appendChild(opt);
    }
  }
}

dateInput.addEventListener("change", () => buildTimeSlots(dateInput.value));

/* ---------- 9. Validação do formulário + envio via WhatsApp ---------- */
const form = document.getElementById("booking-form");
const successMsg = document.getElementById("success-msg");
const waFallback = document.getElementById("wa-fallback");

// Mensagens de erro amigáveis por campo
const validators = {
  nome: (v) =>
    v.trim().length < 3 ? "Conta pra gente seu nome completo, tudo bem?" : "",
  telefone: (v) => {
    const digits = v.replace(/\D/g, "");
    if (digits.length === 0) return "Precisamos do seu telefone para confirmar o horário.";
    if (digits.length < 10) return "Hmm, esse número parece incompleto. Confira o DDD?";
    return "";
  },
  servico: (v) => (v ? "" : "Escolha um serviço para continuarmos 🙏"),
  data: (v) => {
    if (!v) return "Selecione a data do seu horário.";
    const chosen = new Date(v + "T12:00:00");
    if (CONFIG.closedWeekdays.includes(chosen.getDay()))
      return "Nesse dia estamos fechados. Escolha de terça a sábado!";
    return "";
  },
  hora: (v) => (v ? "" : "Escolha o melhor horário para você."),
};

function setError(fieldName, message) {
  const input = document.getElementById(fieldName);
  const errorEl = document.getElementById("erro-" + fieldName);
  if (message) {
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    errorEl.textContent = message;
  } else {
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
    errorEl.textContent = "";
  }
  return !message;
}

// Limpa o erro assim que o usuário corrige o campo
Object.keys(validators).forEach((fieldName) => {
  const input = document.getElementById(fieldName);
  input.addEventListener("input", () => setError(fieldName, ""));
  input.addEventListener("change", () => setError(fieldName, ""));
});

function validateForm() {
  let firstInvalid = null;
  Object.entries(validators).forEach(([fieldName, validate]) => {
    const input = document.getElementById(fieldName);
    const ok = setError(fieldName, validate(input.value));
    if (!ok && !firstInvalid) firstInvalid = input;
  });
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

function formatDateBR(isoDate) {
  const d = new Date(isoDate + "T12:00:00");
  const weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  return `${weekdays[d.getDay()]}, ${d.toLocaleDateString("pt-BR")}`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  successMsg.hidden = true;

  if (!validateForm()) return;

  const data = {
    nome: document.getElementById("nome").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    servico: serviceSelect.value,
    data: dateInput.value,
    hora: timeSelect.value,
    obs: document.getElementById("obs").value.trim(),
  };

  // Monta a mensagem pré-preenchida do WhatsApp
  const lines = [
    `Olá, ${CONFIG.businessName}! 👋`,
    "",
    "Gostaria de agendar um horário:",
    `👤 *Nome:* ${data.nome}`,
    `📱 *Contato:* ${data.telefone}`,
    `✂️ *Serviço:* ${data.servico}`,
    `📅 *Data:* ${formatDateBR(data.data)}`,
    `⏰ *Horário:* ${data.hora}`,
  ];
  if (data.obs) lines.push(`📝 *Observações:* ${data.obs}`);
  lines.push("", "Aguardo a confirmação. Obrigado!");

  const waURL = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;

  // Abre o WhatsApp em nova aba
  window.open(waURL, "_blank", "noopener");

  // Fallback caso o pop-up seja bloqueado
  waFallback.href = waURL;

  // Mensagem de sucesso + reset parcial do formulário
  successMsg.hidden = false;
  successMsg.scrollIntoView({ behavior: "smooth", block: "nearest" });
  form.reset();
  buildTimeSlots("");
});

/* ---------- 10. Accordion do FAQ ---------- */
document.querySelectorAll(".faq__question").forEach((question) => {
  question.addEventListener("click", () => {
    const answer = document.getElementById(question.getAttribute("aria-controls"));
    const isOpen = question.getAttribute("aria-expanded") === "true";

    // Fecha os demais itens (comportamento exclusivo de accordion)
    document.querySelectorAll(".faq__question").forEach((q) => {
      q.setAttribute("aria-expanded", "false");
      const a = document.getElementById(q.getAttribute("aria-controls"));
      a.classList.remove("open");
      a.hidden = true;
    });

    if (!isOpen) {
      question.setAttribute("aria-expanded", "true");
      answer.hidden = false;
      // pequeno delay para permitir a transição de max-height
      requestAnimationFrame(() => answer.classList.add("open"));
    }
  });
});

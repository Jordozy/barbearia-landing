/* ============================================================
   BARBEARIA NAVALHA DE OURO — script.js (v2 · out/2026)
   Vanilla JS, sem dependências. Índice:
   1. Configuração central (número WhatsApp, horários, feriados)
   2. Utilidades de data
   3. Header: sombra ao rolar + menu hamburger + ESC
   4. Scroll-spy (link ativo do menu conforme a seção visível)
   5. Animações on-scroll (Intersection Observer)
   6. Contadores animados da prova social
   7. Lazy loading com IntersectionObserver (fallback para src)
   8. Botões "Agendar" dos cards → pré-seleciona o serviço
   9. Máscara de telefone brasileira
   10. Slots de horário dinâmicos (dia, hora atual, feriados, ocupados)
   11. Urgência dinâmica ("restam X vagas hoje")
   12. Validação do formulário + envio via WhatsApp + fallback
   13. Ano dinâmico no footer
============================================================ */

"use strict";

/* ---------- 1. Configuração central ---------- */
const CONFIG = {
  whatsappNumber: "5511987654321",          // formato internacional, só dígitos
  businessName: "Navalha de Ouro",
  openHours: { start: 9, end: 20 },         // ter–sex: 09h às 20h (último cliente 19:30)
  saturdayEnd: 18,                          // sábado fecha às 18h
  slotIntervalMin: 30,                      // intervalo entre horários
  closedWeekdays: [0, 1],                   // 0=domingo, 1=segunda (fechado)
  leadTimeMin: 60,                          // agendamento com pelo menos 1h de antecedência
  maxDaysAhead: 60,                         // agenda até 60 dias à frente
  // Feriados municipais/estaduais (AAAAMMDD) — bloqueiam o dia inteiro
  holidays: ["20260101", "20260125", "20260403", "20260421", "20260501", "20260907", "20261012", "20261102", "20261115", "20261120", "20261224", "20261225", "20261231"],
  // Slots já ocupados por chave "AAAAMMDD|HH:MM" (num produção viria de uma API/planilha)
  busySlots: [],
};

const WEEKDAYS_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/* ---------- 2. Utilidades de data ---------- */
/** Chave local AAAAMMDD (evita fuso de toISOString). */
function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}${m}${day}`;
}
/** Converte value="AAAA-MM-DD" do input date em Date local. */
function parseLocalDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function isHoliday(d) { return CONFIG.holidays.includes(dateKey(d)); }
function isClosedDay(d) { return CONFIG.closedWeekdays.includes(d.getDay()) || isHoliday(d); }
function formatDataPT(d) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

/* ---------- 3. Header: sombra + hamburger ---------- */
const header = document.querySelector(".header");
const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("nav");

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 10);
}, { passive: true });

function toggleMenu(open) {
  const isOpen = open ?? !nav.classList.contains("is-open");
  nav.classList.toggle("is-open", isOpen);
  hamburger.setAttribute("aria-expanded", String(isOpen));
  hamburger.setAttribute("aria-label", isOpen ? "Fechar menu de navegação" : "Abrir menu de navegação");
  document.body.style.overflow = isOpen ? "hidden" : "";
}

hamburger.addEventListener("click", () => toggleMenu());
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) toggleMenu(false); });
nav.querySelectorAll(".nav__link").forEach((link) => link.addEventListener("click", () => toggleMenu(false)));

/* ---------- 4. Scroll-spy: destaca o link da seção visível ---------- */
const spySections = [...document.querySelectorAll("section[id], footer[id]")];
const spyLinks = new Map([...document.querySelectorAll(".nav__link")].map((l) => [l.getAttribute("href").slice(1), l]));

const spyObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const link = spyLinks.get(entry.target.id);
    if (link && entry.isIntersecting) {
      spyLinks.forEach((l) => l.classList.remove("is-active"));
      link.classList.add("is-active");
    }
  });
}, { rootMargin: "-40% 0px -55% 0px" });
spySections.forEach((s) => spyObserver.observe(s));

/* ---------- 5. Animações on-scroll ---------- */
const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    obs.unobserve(entry.target); // anima uma vez só
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- 6. Contadores animados ---------- */
function animateCounter(el) {
  const target = parseFloat(el.dataset.count);
  const isDecimal = el.dataset.decimal === "true";
  const suffix = el.dataset.suffix || "";
  const duration = 1400;
  const t0 = performance.now();

  function frame(now) {
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const value = target * eased;
    el.textContent = (isDecimal
      ? value.toFixed(1).replace(".", ",")
      : Math.round(value).toLocaleString("pt-BR")) + suffix;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const counterObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    animateCounter(entry.target);
    obs.unobserve(entry.target);
  });
}, { threshold: 0.6 });
document.querySelectorAll(".stat__number").forEach((el) => counterObserver.observe(el));

/* ---------- 7. Lazy loading (IO sobre data-src) ---------- */
if ("IntersectionObserver" in window) {
  const lazyObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.addEventListener("load", () => img.removeAttribute("data-src"), { once: true });
      obs.unobserve(img);
    });
  }, { rootMargin: "400px" });
  document.querySelectorAll("img.js-lazy[data-src]").forEach((img) => lazyObserver.observe(img));
} else {
  // Fallback para browsers antigos
  document.querySelectorAll("img.js-lazy[data-src]").forEach((img) => { img.src = img.dataset.src; });
}

/* ---------- 8. Botões "Agendar" dos cards ---------- */
document.querySelectorAll(".js-agendar[data-service]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const serviceName = btn.dataset.service;
    const select = document.getElementById("servico");
    // Procura a option que começa com o nome do serviço (o value tem preço junto)
    [...select.options].forEach((opt) => {
      if (opt.textContent.startsWith(serviceName)) select.value = opt.value || opt.textContent;
    });
    document.getElementById("agendar").scrollIntoView({ behavior: "smooth" });
    // Foco acessível no primeiro campo após a rolagem
    setTimeout(() => document.getElementById("nome").focus({ preventScroll: true }), 650);
  });
});

/* ---------- 9. Máscara de telefone (formato brasileiro) ---------- */
const phoneInput = document.getElementById("telefone");
phoneInput.addEventListener("input", () => {
  const v = phoneInput.value.replace(/\D/g, "").slice(0, 11);
  let out = "";
  if (v.length > 0) out = "(" + v.slice(0, 2);                              // (11
  if (v.length >= 3) out += ") " + v.slice(2, v.length > 10 ? 7 : 6);       // ) 98765
  if (v.length > 6) out += "-" + v.slice(v.length > 10 ? 7 : 6);            // -4321 / -4321 (9º dígito fica no bloco anterior)
  phoneInput.value = out;
});

/* ---------- 10. Slots de horário dinâmicos ---------- */
const dateInput = document.getElementById("data");
const slotsBox = document.getElementById("horarios");
const horarioField = document.getElementById("horario");

// Data mínima = hoje, máxima = hoje + N dias
const today = new Date();
const maxDay = new Date(); maxDay.setDate(today.getDate() + CONFIG.maxDaysAhead);
dateInput.min = dateKey(today).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
dateInput.max = dateKey(maxDay).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");

/** Gera lista de horários livres para uma Date. */
function getAvailableSlots(d) {
  if (isClosedDay(d)) return [];
  const now = new Date();
  const isToday = dateKey(d) === dateKey(now);
  const endHour = d.getDay() === 6 ? CONFIG.saturdayEnd : CONFIG.openHours.end;
  const cutoff = new Date(now.getTime() + CONFIG.leadTimeMin * 60000);
  const slots = [];

  for (let h = CONFIG.openHours.start; h < endHour; h++) {
    for (let m = 0; m < 60; m += CONFIG.slotIntervalMin) {
      const hh = String(h).padStart(2, "0"), mm = String(m).padStart(2, "0");
      const label = `${hh}:${mm}`;
      const slotDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
      if (isToday && slotDate < cutoff) continue;                    // passou do prazo de antecedência
      if (CONFIG.busySlots.includes(`${dateKey(d)}|${label}`)) continue; // já ocupado
      slots.push(label);
    }
  }
  return slots;
}

function renderSlots() {
  const value = dateInput.value;
  horarioField.value = "";
  slotsBox.innerHTML = "";

  if (!value) {
    slotsBox.innerHTML = '<p class="form__hint">Escolha uma data para ver os horários livres.</p>';
    return;
  }
  const d = parseLocalDate(value);
  if (isClosedDay(d)) {
    const motivo = isHoliday(d) ? "é feriado" : "é " + WEEKDAYS_PT[d.getDay()] + ", e não abrimos nesse dia";
    slotsBox.innerHTML = `<p class="form__hint">Infelizmente ${motivo}. 😕 Escolha terça a sábado.</p>`;
    return;
  }
  const slots = getAvailableSlots(d);
  if (!slots.length) {
    slotsBox.innerHTML = '<p class="form__hint">Sem horários livres nesse dia. Tente outra data ou fale com a gente no WhatsApp. 🙏</p>';
    return;
  }
  slots.forEach((label) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "slot";
    b.textContent = label;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      slotsBox.querySelectorAll(".slot").forEach((s) => {
        s.classList.remove("is-selected"); s.setAttribute("aria-pressed", "false");
      });
      b.classList.add("is-selected");
      b.setAttribute("aria-pressed", "true");
      horarioField.value = label;
      clearError("err-horario", horarioField.closest("fieldset"));
    });
    slotsBox.appendChild(b);
  });
}

dateInput.addEventListener("change", renderSlots);

/* ---------- 11. Urgência dinâmica ---------- */
const urgencyText = document.getElementById("urgency-text");
(function updateUrgency() {
  const d = new Date();
  if (isClosedDay(d)) {
    // Próximo dia aberto
    const next = new Date(d);
    do { next.setDate(next.getDate() + 1); } while (isClosedDay(next));
    urgencyText.textContent = `Amanhã estamos fechados — próxima abertura ${formatDataPT(next)} às ${String(CONFIG.openHours.start).padStart(2, "0")}h.`;
    return;
  }
  const free = getAvailableSlots(d).length;
  if (free === 0) {
    urgencyText.textContent = "Hoje está lotado! Garanta já o horário de amanhã.";
  } else if (free <= 6) {
    urgencyText.textContent = `Corre: restam só ${free} horários livres hoje! 🔥`;
  } else {
    urgencyText.textContent = `${free} horários livres hoje — os da tarde costumam esgotar rápido.`;
  }
})();

/* ---------- 12. Validação + envio via WhatsApp ---------- */
const form = document.getElementById("booking-form");
const successBox = document.getElementById("form-success");
const successSummary = document.getElementById("success-summary");
const fallbackLine = document.getElementById("success-fallback");
const fallbackLink = document.getElementById("wa-fallback-link");

/** Esconde campos do formulário e exibe o painel de sucesso (e vice-versa). */
function setFormVisible(visible) {
  form.querySelectorAll(".form__group, .form__row, .form__slots-group, #submit-btn, .form__note")
    .forEach((el) => { el.hidden = !visible; });
  successBox.hidden = visible;
}

function setError(errId, fieldEl, msg) {
  document.getElementById(errId).textContent = msg;
  if (fieldEl) fieldEl.classList.add("is-invalid");
}
function clearError(errId, fieldEl) {
  document.getElementById(errId).textContent = "";
  if (fieldEl) fieldEl.classList.remove("is-invalid");
}

function validate() {
  let ok = true;
  const nome = document.getElementById("nome");
  const servico = document.getElementById("servico");

  // Nome
  if (nome.value.trim().length < 3) {
    setError("err-nome", nome, "Conta pra gente seu nome completo (mín. 3 letras).");
    ok = false;
  } else clearError("err-nome", nome);

  // Telefone: DDD (2) + número (8 ou 9 dígitos)
  const digits = phoneInput.value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    setError("err-telefone", phoneInput, "Telefone incompleto — precisa do DDD + número. Ex.: (11) 98765-4321.");
    ok = false;
  } else if (/^1?(\d)\1+$/.test(digits.slice(2)) && digits.length === 10) {
    setError("err-telefone", phoneInput, "Esse número parece repetido demais 😅 Confere aí?");
    ok = false;
  } else clearError("err-telefone", phoneInput);

  // Serviço
  if (!servico.value) {
    setError("err-servico", servico, "Escolha um serviço para continuarmos 🙏");
    ok = false;
  } else clearError("err-servico", servico);

  // Data
  if (!dateInput.value) {
    setError("err-data", dateInput, "Escolha o dia do seu horário.");
    ok = false;
  } else if (isClosedDay(parseLocalDate(dateInput.value))) {
    setError("err-data", dateInput, "Nesse dia não abrimos. Escolha terça a sábado 😉");
    ok = false;
  } else clearError("err-data", dateInput);

  // Horário
  if (!horarioField.value) {
    setError("err-horario", null, "Toque em um horário disponível na grade.");
    ok = false;
  } else clearError("err-horario", null);

  return ok;
}

// Limpa erros assim que o usuário corrige o campo
["nome", "servico"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => clearError("err-" + id, document.getElementById(id)));
});
phoneInput.addEventListener("input", () => clearError("err-telefone", phoneInput));
dateInput.addEventListener("input", () => clearError("err-data", dateInput));

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!validate()) {
    // Leva o foco ao primeiro erro para quem usa teclado/leitor de tela
    const firstInvalid = form.querySelector(".is-invalid");
    if (firstInvalid) firstInvalid.focus();
    else document.getElementById("err-horario").previousElementSibling?.querySelector(".slot")?.focus();
    return;
  }

  const d = parseLocalDate(dateInput.value);
  const nome = document.getElementById("nome").value.trim();
  const servico = document.getElementById("servico").value;
  const obs = document.getElementById("obs").value.trim();

  const msg = [
    `*Novo agendamento — ${CONFIG.businessName}* ✂️`,
    "",
    `👤 *Nome:* ${nome}`,
    `📱 *WhatsApp:* ${phoneInput.value}`,
    `💈 *Serviço:* ${servico}`,
    `📅 *Data:* ${WEEKDAYS_PT[d.getDay()]}, ${d.toLocaleDateString("pt-BR")}`,
    `⏰ *Horário:* ${horarioField.value}`,
    obs ? `📝 *Observações:* ${obs}` : "",
    "",
    "_Enviado pelo site — aguardo a confirmação! ✅_",
  ].filter(Boolean).join("\n");

  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;

  // Abre em nova aba; se o browser bloquear, mostramos o link manual
  const opened = window.open(url, "_blank", "noopener");

  successSummary.textContent = `${nome.split(" ")[0]}, seu pedido de ${servico.split(" — ")[0]} para ${formatDataPT(d)} às ${horarioField.value} foi enviado. Confira abaixo o resumo e, se o WhatsApp não abriu, use o link direto.`;

  // Bloco de confirmação com todos os dados (persistente, mesmo sem abrir o app)
  let recap = document.getElementById("success-recap");
  if (!recap) {
    recap = document.createElement("ul");
    recap.id = "success-recap";
    successBox.insertBefore(recap, fallbackLine);
  }
  recap.innerHTML = [
    `<li>👤 <strong>${nome}</strong></li>`,
    `<li>📱 ${phoneInput.value}</li>`,
    `<li>💈 ${servico}</li>`,
    `<li>📅 ${WEEKDAYS_PT[d.getDay()]}, ${d.toLocaleDateString("pt-BR")} às ${horarioField.value}</li>`,
    obs ? `<li>📝 ${obs.replace(/</g, "&lt;")}</li>` : "",
  ].filter(Boolean).join("");

  fallbackLink.href = url;
  fallbackLine.hidden = !!opened; // só mostra o fallback se o pop-up foi bloqueado
  setFormVisible(false);          // esconde campos, exibe painel de sucesso
  successBox.focus();
  form.reset();
  renderSlots();
});

document.getElementById("btn-reset").addEventListener("click", () => {
  setFormVisible(true);
  fallbackLine.hidden = true;
  document.getElementById("nome").focus();
});

/* ---------- 13. Ano dinâmico no footer ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

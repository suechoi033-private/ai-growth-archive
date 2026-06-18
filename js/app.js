// ===== 설정 =====
// 저작권 보호: 전문 번역(translation_ko)은 2차적저작물이라
// 공개 배포 시 기본으로 숨깁니다. 개인용으로 보려면 true 로 바꾸세요.
const PUBLISH_FULL_TRANSLATION = false;

const SOURCE_LABEL = { anthropic: "Anthropic", dario: "Dario Amodei" };

const state = { articles: [], q: "", source: "all", tag: "all" };

// ===== 유틸 =====
const $ = (sel, root = document) => root.querySelector(sel);
const view = () => document.getElementById("view");

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function esc(s = "") {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function md(text = "") {
  return window.marked ? window.marked.parse(text) : esc(text);
}

// ===== 데이터 로드 =====
async function loadData() {
  try {
    const res = await fetch("./data/articles.json", { cache: "no-store" });
    const data = await res.json();
    state.articles = (data.articles || []).sort(
      (a, b) => (b.published_date || "").localeCompare(a.published_date || "")
    );
  } catch (e) {
    state.articles = [];
    console.error("데이터를 불러오지 못했습니다", e);
  }
}

// ===== 라우터 =====
function router() {
  const hash = location.hash || "#/";
  if (hash.startsWith("#/article/")) {
    renderArticle(decodeURIComponent(hash.slice("#/article/".length)));
  } else if (hash === "#/about") {
    renderAbout();
  } else {
    renderList();
  }
  window.scrollTo(0, 0);
}

// ===== 목록 뷰 =====
function allTags() {
  const set = new Set();
  state.articles.forEach((a) => (a.tags || []).forEach((t) => set.add(t)));
  return [...set].sort((x, y) => x.localeCompare(y, "ko"));
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  return state.articles.filter((a) => {
    if (state.source !== "all" && a.source !== state.source) return false;
    if (state.tag !== "all" && !(a.tags || []).includes(state.tag)) return false;
    if (!q) return true;
    const hay = [a.title_ko, a.title_en, a.summary_oneline_ko, (a.tags || []).join(" ")]
      .join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function renderList() {
  const tags = allTags();
  const items = filtered();
  view().innerHTML = `
    <section class="page-intro">
      <h1>AI를 통해 성장하기 위한 읽기 노트</h1>
      <p>Anthropic 블로그와 Dario Amodei의 글을 직접 읽고, 원문 링크·한글 요약·뉴스레터 형태로 정리합니다.</p>
    </section>
    <div class="controls">
      <input id="search" class="search-box" type="search" placeholder="제목·주제 검색…" value="${esc(state.q)}" aria-label="검색" />
      <div class="chip-group" role="group" aria-label="출처 필터">
        ${["all", "anthropic", "dario"].map((s) => `
          <button class="chip" data-source="${s}" aria-pressed="${state.source === s}">
            ${s === "all" ? "전체" : SOURCE_LABEL[s]}
          </button>`).join("")}
      </div>
      ${tags.length ? `<div class="chip-group" role="group" aria-label="주제 필터">
        <button class="chip" data-tag="all" aria-pressed="${state.tag === "all"}">모든 주제</button>
        ${tags.map((t) => `<button class="chip" data-tag="${esc(t)}" aria-pressed="${state.tag === t}">${esc(t)}</button>`).join("")}
      </div>` : ""}
    </div>
    ${items.length
      ? `<div class="card-list">${items.map(cardHTML).join("")}</div>`
      : `<div class="empty">조건에 맞는 글이 없습니다.</div>`}
  `;

  $("#search").addEventListener("input", (e) => {
    state.q = e.target.value;
    const cl = $(".card-list");
    const list = filtered();
    if (cl) cl.innerHTML = list.map(cardHTML).join("");
    else renderList();
    bindCards();
  });
  view().querySelectorAll("[data-source]").forEach((b) =>
    b.addEventListener("click", () => { state.source = b.dataset.source; renderList(); })
  );
  view().querySelectorAll("[data-tag]").forEach((b) =>
    b.addEventListener("click", () => { state.tag = b.dataset.tag; renderList(); })
  );
  bindCards();
}

function cardHTML(a) {
  return `
    <article class="card" data-id="${esc(a.id)}" tabindex="0" role="link" aria-label="${esc(a.title_ko)}">
      <div class="card-meta">
        <span class="source-badge" data-source="${esc(a.source)}">${SOURCE_LABEL[a.source] || a.source}</span>
        <span>${fmtDate(a.published_date)}</span>
        ${a.reading_minutes ? `<span>· ${a.reading_minutes}분</span>` : ""}
      </div>
      <h2>${esc(a.title_ko)}</h2>
      ${a.title_en ? `<p class="title-en">${esc(a.title_en)}</p>` : ""}
      <p class="oneline">${esc(a.summary_oneline_ko || "")}</p>
      <div class="card-foot">${(a.tags || []).slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    </article>`;
}

function bindCards() {
  view().querySelectorAll(".card").forEach((c) => {
    const go = () => (location.hash = `#/article/${encodeURIComponent(c.dataset.id)}`);
    c.addEventListener("click", go);
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
}

// ===== 상세 뷰 =====
function renderArticle(id) {
  const a = state.articles.find((x) => x.id === id);
  if (!a) { view().innerHTML = `<div class="empty">글을 찾을 수 없습니다. <a href="#/">목록으로</a></div>`; return; }

  const panels = [];
  panels.push({ key: "newsletter", label: "뉴스레터 요약", html: `<div class="prose">${md(a.summary_newsletter_ko || "")}</div>` });

  if (Array.isArray(a.key_points_ko) && a.key_points_ko.length) {
    panels.push({ key: "key", label: "핵심 정리", html: `<ol class="key-points">${a.key_points_ko.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>` });
  }
  if (a.quote_ko || a.quote_en) {
    panels.push({
      key: "quote", label: "원문 인용",
      html: `<div class="prose">
        ${a.quote_en ? `<blockquote>${esc(a.quote_en)}</blockquote>` : ""}
        ${a.quote_ko ? `<p>${esc(a.quote_ko)}</p>` : ""}
        <p class="muted">— ${SOURCE_LABEL[a.source] || a.source}, 원문에서 인용</p>
      </div>`
    });
  }
  if (a.translation_ko) {
    panels.push({
      key: "translation", label: "전체 번역",
      html: PUBLISH_FULL_TRANSLATION
        ? `<div class="prose serif">${md(a.translation_ko)}</div>`
        : `<div class="notice">전체 번역본은 저작권(2차적저작물) 보호를 위해 공개하지 않습니다.
             전문은 위의 <strong>원문 보기</strong>로 읽어 주세요. 요약·핵심 정리는 직접 작성한 학습 노트입니다.</div>`
    });
  }

  view().innerHTML = `
    <article class="article">
      <a class="back-link" href="#/">← 목록으로</a>
      <div class="article-head">
        <h1>${esc(a.title_ko)}</h1>
        ${a.title_en ? `<p class="title-en">${esc(a.title_en)}</p>` : ""}
      </div>
      <div class="article-meta">
        <span class="source-badge" data-source="${esc(a.source)}">${SOURCE_LABEL[a.source] || a.source}</span>
        <span>${fmtDate(a.published_date)}</span>
        ${a.reading_minutes ? `<span>· 원문 약 ${a.reading_minutes}분</span>` : ""}
      </div>
      <div class="tags-row">${(a.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="source-cta">
        <span class="label">이 글은 요약·논평입니다. 전문과 정확한 표현은 원문에서 확인하세요.</span>
        <a class="btn-primary" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a>
      </div>
      <div class="tabs" role="tablist">
        ${panels.map((p, i) => `<button class="tab" role="tab" data-panel="${p.key}" aria-selected="${i === 0}">${p.label}</button>`).join("")}
      </div>
      ${panels.map((p, i) => `<div class="panel ${i === 0 ? "active" : ""}" data-panel="${p.key}">${p.html}</div>`).join("")}

      <div class="note-block">
        <h3>내 메모</h3>
        <textarea id="note" class="note-area" placeholder="이 글에서 배운 점, 떠오른 생각을 적어두세요. (이 브라우저에만 저장됩니다)"></textarea>
        <div class="note-status" id="note-status"></div>
      </div>
    </article>`;

  // 탭 전환
  view().querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      view().querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t === tab));
      view().querySelectorAll(".panel").forEach((p) =>
        p.classList.toggle("active", p.dataset.panel === tab.dataset.panel));
    });
  });

  // 내 메모 (localStorage)
  const noteKey = `note:${a.id}`;
  const ta = $("#note"), status = $("#note-status");
  ta.value = localStorage.getItem(noteKey) || "";
  let timer;
  ta.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      localStorage.setItem(noteKey, ta.value);
      status.textContent = "저장됨 ✓";
      setTimeout(() => (status.textContent = ""), 1500);
    }, 400);
  });
}

// ===== 소개 뷰 =====
function renderAbout() {
  view().innerHTML = `
    <section class="about prose">
      <h1>이 아카이브에 대하여</h1>
      <p>AI 시대를 살아가며 스스로 성장하기 위해, <strong>Anthropic 블로그</strong>와
      <strong>Dario Amodei</strong>의 글을 꾸준히 읽고 정리하는 개인 학습 공간입니다.
      글마다 ① 원문 링크 ② 핵심 정리 ③ 뉴스레터형 요약을 함께 둡니다.</p>

      <h2>출처</h2>
      <ul>
        <li><a href="https://www.anthropic.com/news" target="_blank" rel="noopener noreferrer">Anthropic — News & Research ↗</a></li>
        <li><a href="https://darioamodei.com/" target="_blank" rel="noopener noreferrer">Dario Amodei — Essays ↗</a></li>
      </ul>

      <h2>저작권 원칙</h2>
      <p>이곳의 요약·핵심 정리·논평은 학습을 위해 <strong>직접 작성</strong>한 글입니다.
      원문의 저작권은 각 저자와 Anthropic, PBC에 있으며, 본 사이트는 원문을 대체하지 않습니다.
      전문(全文)과 정확한 표현은 항상 원문 링크로 안내합니다. 전체 번역본은 2차적저작물 보호를 위해 공개하지 않습니다.
      권리자 요청이 있으면 해당 항목을 즉시 내립니다.</p>

      <p class="muted">비상업적 · 개인 학습용</p>
    </section>`;
}

// ===== 테마 =====
function initTheme() {
  const saved = localStorage.getItem("theme");
  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const theme = saved || sys;
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateThemeIcon(next);
  });
}
function updateThemeIcon(theme) {
  const el = document.querySelector(".theme-icon");
  if (el) el.textContent = theme === "dark" ? "☀" : "☾";
}

// ===== 시작 =====
(async function init() {
  initTheme();
  await loadData();
  window.addEventListener("hashchange", router);
  router();
})();

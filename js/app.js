// ===== 설정 =====
// 저작권 보호: 전문 번역(translation_ko)은 2차적저작물이라
// 공개 배포 시 기본으로 숨깁니다. 개인용으로 보려면 true 로 바꾸세요.
const PUBLISH_FULL_TRANSLATION = false;

const SOURCE_LABEL = { anthropic: "Anthropic", dario: "Dario Amodei" };

const state = { articles: [], books: [], q: "", source: "all", tag: "all" };

// ===== 멤버십 (독서 큐레이션 유료) =====
// 유효 코드의 SHA-256 해시만 보관. 원본 코드는 운영자가 별도 관리.
const MEMBER_HASHES = [
  "28e2ddee8f19e6af5697b0ed385d4f0947907ef85d763b06cbd7a57e3c47dda1",
  "8e2b12ce513efd4627fcff81aea5291716894f8345e11f5e7fe8d610987888ef",
  "3e8c505207550b240971890a70e812dda5ca4cb97d3add247c37cbbd1e719241",
  "7bb6441e1eba6657e4776caad413ff8733ed0b6b5228634ac883ea687fbb726d",
  "0a94d13c25be6522f05a48b76e7cde5d39603d5aea0f07cbd995765774cd92f0",
  "cce6e5687149b0af1abfca902b0528226cef8015526dffe57101d5ac2e127489",
  "1b48188ff2597aac0af09ec950e38b81db6797eee50dfe2008aeb1404d513180",
  "b161c09a0d12c1b3669c95c708e7da877a242905d8d94f2dddae660eb8e8f6af",
  "ef39ee82027cb0b5b930421221469faacd16e1df9b4d4ed53b635ded57799069",
  "bbf1530c4d454ccb2ecf66a937fff1da488a01cdece58ca14ba02c2019f60eaf",
  "c38abd3267321ed9f48e03cd9b1bd374f81a20348267315c7b020cfb32784b54",
  "f6da1623c6d0c4d59b4347cda3c3bb69eb6e36e5f4ae371763d1d999db9b766b",
  "d4ed52e67dba76a72a3b45db09bf9b9447bfea4a0935429dbc538cf89fa64999",
  "ca5f488456810f040b9883fc26abd6760e9c9e07aefacb69f3e7313acb903592",
  "aacb4e7122a9717120fbbe7012e7d355739b5e7500ac215d0082bc61c50d6f6f",
  "8597b7a78d6ffc60b0b788323fb08dac9c274b1ae5f24e4b317938b19c404065",
  "81fb393effaa95842d37f2ff29cd2a524e9e05920fadfb7bdb158536e8e81f63",
  "00a8d9ecc00ec3dc1ca9676e7dc6c7839a97a16205c441658e601b5737e7e3ba",
  "8db5908c08166cd52504d5187f167f0c77c9587c08f0620fe507466c0fb986c4",
  "93e771feda675cc8f92450d8f37dda348ba65809efbb71eab051db722da19eef"
];
const MEMBER_KEY = "read_membership_code";
const isMember = () => !!localStorage.getItem(MEMBER_KEY);
async function sha256hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function redeemMembership(raw) {
  const code = (raw || "").trim().toUpperCase();
  if (!code) return { ok: false, msg: "코드를 입력하세요." };
  if (MEMBER_HASHES.includes(await sha256hex(code))) {
    localStorage.setItem(MEMBER_KEY, code);
    return { ok: true, msg: "✅ 멤버십이 활성화되었습니다. 모든 큐레이션이 열렸습니다." };
  }
  return { ok: false, msg: "유효하지 않은 코드입니다." };
}

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
  try {
    const res = await fetch("./data/books.json", { cache: "no-store" });
    const data = await res.json();
    state.books = data.books || [];
  } catch (e) {
    state.books = [];
    console.error("도서 데이터를 불러오지 못했습니다", e);
  }
}

// ===== 라우터 =====
function router() {
  const hash = location.hash || "#/";
  if (hash.startsWith("#/article/")) {
    renderArticle(decodeURIComponent(hash.slice("#/article/".length)));
  } else if (hash.startsWith("#/book/")) {
    renderBook(decodeURIComponent(hash.slice("#/book/".length)));
  } else if (hash === "#/books") {
    renderBooks();
  } else if (hash === "#/membership") {
    renderMembership();
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

// ===== 독서 큐레이션 =====
function bookCardHTML(b) {
  const locked = b.premium && !isMember();
  return `
    <article class="card book-card" data-book="${esc(b.id)}" tabindex="0" role="link" aria-label="${esc(b.title_ko)}">
      <div class="card-meta">
        <span class="source-badge" data-source="book">📚 북 큐레이션</span>
        <span>${esc(b.author)}</span>
        ${b.summary_minutes ? `<span>· 요약 ${b.summary_minutes}분</span>` : ""}
        ${locked ? `<span class="lock-badge">🔒 멤버십</span>` : b.premium ? "" : `<span class="free-badge">무료</span>`}
      </div>
      <h2>${esc(b.title_ko)}</h2>
      ${b.title_en ? `<p class="title-en">${esc(b.title_en)}</p>` : ""}
      <p class="oneline">${esc(b.oneline || "")}</p>
      <div class="card-foot">${(b.tags || []).slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    </article>`;
}

function renderBooks() {
  view().innerHTML = `
    <section class="page-intro">
      <h1>스타트업 대표·HR을 위한 독서 큐레이션</h1>
      <p>조직·사람에 관한 검증된 책을 골라, 요약이 아니라 <strong>이번 주에 실행할 것</strong>까지 정리합니다.
      무료 2권, 멤버십으로 전체가 열립니다. <a href="#/membership">멤버십 안내 →</a></p>
    </section>
    <div class="card-list">${state.books.map(bookCardHTML).join("")}</div>
  `;
  view().querySelectorAll("[data-book]").forEach((c) => {
    const go = () => (location.hash = `#/book/${encodeURIComponent(c.dataset.book)}`);
    c.addEventListener("click", go);
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
}

function renderBook(id) {
  const b = state.books.find((x) => x.id === id);
  if (!b) { view().innerHTML = `<div class="empty">책을 찾을 수 없습니다. <a href="#/books">목록으로</a></div>`; return; }
  const locked = b.premium && !isMember();

  const fullHTML = `
    <h2 class="book-sec">왜 스타트업에게 이 책인가</h2>
    <div class="prose"><p>${esc(b.why_startup)}</p></div>
    <h2 class="book-sec">적용 포인트</h2>
    <ol class="key-points">${(b.takeaways || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
    <h2 class="book-sec">이번 주에 해볼 것</h2>
    <div class="action-box">${esc(b.action_this_week || "")}</div>
    ${b.pairing ? `<p class="muted pairing">🔗 ${esc(b.pairing)}</p>` : ""}
  `;
  const teaserHTML = `
    <h2 class="book-sec">왜 스타트업에게 이 책인가</h2>
    <div class="prose"><p>${esc((b.why_startup || "").split(". ")[0])}…</p></div>
    <div class="member-cta">
      <p>🔒 적용 포인트 ${(b.takeaways || []).length}개와 <b>이번 주에 해볼 것</b>은 멤버십에서 열립니다.</p>
      <a class="btn-primary" href="#/membership">멤버십 안내 보기</a>
    </div>
  `;

  view().innerHTML = `
    <article class="article">
      <a class="back-link" href="#/books">← 북 큐레이션 목록</a>
      <div class="article-head">
        <h1>${esc(b.title_ko)}</h1>
        ${b.title_en ? `<p class="title-en">${esc(b.title_en)} · ${esc(b.author)} (${b.year})</p>` : ""}
      </div>
      <div class="tags-row">${(b.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <p class="for-whom">👤 이런 분께: ${esc(b.for_whom || "")}</p>
      <p class="oneline-lg">${esc(b.oneline || "")}</p>
      ${locked ? teaserHTML : fullHTML}
      <p class="muted book-note">이 페이지는 직접 작성한 큐레이션 노트입니다. 책의 전문은 서점·도서관에서 만나세요.</p>
    </article>`;
}

function renderMembership() {
  const member = isMember();
  view().innerHTML = `
    <section class="about">
      <h1>독서 큐레이션 멤버십</h1>
      <p class="muted">조직과 사람에 관한 책을, 실행 단위로 정리해 드립니다.</p>

      <div class="member-grid">
        <div class="member-card">
          <h3>무료</h3>
          <p class="member-price">0원</p>
          <ul>
            <li>아티클 아카이브 전체</li>
            <li>북 큐레이션 2권</li>
            <li>내 메모</li>
          </ul>
        </div>
        <div class="member-card featured">
          <h3>멤버십</h3>
          <p class="member-price">월 4,900원</p>
          <p class="member-sub">연 39,000원 (월 3,250원 꼴, 34% 절약)</p>
          <ul>
            <li>북 큐레이션 전체 (매월 1권 추가)</li>
            <li>적용 포인트 + 이번 주에 해볼 것</li>
            <li>케이스 페어링 가이드</li>
          </ul>
        </div>
      </div>

      <div class="member-join">
        <h3>가입하기</h3>
        <p class="muted">신청하면 결제 안내와 함께 멤버십 코드를 보내드립니다.</p>
        <a class="btn-primary" href="mailto:sue.choi033@gmail.com?subject=%5B%EB%8F%85%EC%84%9C%20%ED%81%90%EB%A0%88%EC%9D%B4%EC%85%98%5D%20%EB%A9%A4%EB%B2%84%EC%8B%AD%20%EC%8B%A0%EC%B2%AD&body=%EC%9B%94%EA%B0%84%20%2F%20%EC%97%B0%EA%B0%84%20%EC%A4%91%20%EC%84%A0%ED%83%9D%ED%95%B4%20%EC%A0%81%EC%96%B4%20%EC%A3%BC%EC%84%B8%EC%9A%94.">이메일로 가입 신청</a>
      </div>

      <div class="member-redeem">
        <h3>멤버십 코드 입력</h3>
        ${member
          ? `<p>✅ 멤버십 사용 중입니다. 모든 큐레이션이 열려 있습니다.</p>`
          : `<div class="redeem-row">
               <input id="member-code" type="text" placeholder="READ-XXXX-XXXX" autocomplete="off" />
               <button id="member-redeem-btn" class="btn-primary" type="button">활성화</button>
             </div>
             <p id="member-status" class="muted" style="min-height:1.2em"></p>`}
      </div>

      <p class="muted">참고: 정적 사이트 특성상 코드 잠금은 간단한 보호 장치입니다. 콘텐츠 가치와 신뢰를 기반으로 운영합니다.</p>
    </section>`;

  const btn = $("#member-redeem-btn");
  if (btn) btn.addEventListener("click", async () => {
    const r = await redeemMembership($("#member-code").value);
    const st = $("#member-status");
    st.textContent = r.msg;
    if (r.ok) setTimeout(() => renderMembership(), 900);
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

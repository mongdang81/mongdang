// 화면을 그리는 코드입니다. 앱 추가는 apps.js 만 고치면 됩니다.
(function () {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const catParam = params.get("cat");
  const query = (params.get("q") || "").trim();

  // 사이트 기본 정보
  document.title = SITE.name;
  $("brandMark").textContent = SITE.logo;
  $("brandName").textContent = SITE.name;
  $("siteTitle").textContent = SITE.name;
  $("eyebrow").textContent = SITE.eyebrow;
  $("intro").textContent = SITE.intro;
  $("footer").textContent = "© " + new Date().getFullYear() + " " + SITE.name;
  $("searchInput").value = query;

  // 메뉴
  const nav = $("nav");
  CATEGORIES.forEach((c) => nav.appendChild(link("?cat=" + c.id, c.name, c.id === catParam)));
  nav.appendChild(link("./#guide", "이용안내"));

  // 검색
  $("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("searchInput").value.trim();
    location.search = q ? "?q=" + encodeURIComponent(q) : "";
  });

  const sorted = [...APPS].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const main = $("main");

  if (query) renderList("‘" + query + "’ 검색 결과", search(sorted, query));
  else if (catParam && CATEGORIES.some((c) => c.id === catParam)) {
    const c = CATEGORIES.find((c) => c.id === catParam);
    renderList(c.name, sorted.filter((a) => a.category === c.id));
  } else renderHome();

  function renderHome() {
    main.innerHTML = '<h2 class="section-title"><span class="badge">NEW</span>새로 나온 웹앱</h2>';
    const panels = el("div", "panels");
    CATEGORIES.forEach((c) => {
      const panel = el("section", "panel");
      panel.innerHTML =
        '<div class="panel-head"><h3>' + esc(c.name) + '</h3><a href="?cat=' + c.id + '">전체 보기 →</a></div>';
      const grid = el("div", "grid");
      const list = sorted.filter((a) => a.category === c.id).slice(0, c.slots);
      list.forEach((a) => grid.appendChild(card(a)));
      for (let i = list.length; i < c.slots; i++) grid.appendChild(el("div", "slot", "새 앱 자리"));
      panel.appendChild(grid);
      panels.appendChild(panel);
    });
    main.appendChild(panels);
  }

  function renderList(title, list) {
    main.innerHTML =
      '<div class="list-head"><h2 class="section-title">' + esc(title) +
      ' <small>' + list.length + '개</small></h2><a href="./">← 처음으로</a></div>';
    if (!list.length) { main.appendChild(el("p", "empty", "찾는 웹앱이 없어요. 다른 단어로 검색해 보세요.")); return; }
    const grid = el("div", "grid grid-wide");
    list.forEach((a) => grid.appendChild(card(a)));
    main.appendChild(grid);
  }

  function search(list, q) {
    const words = q.toLowerCase().split(/\s+/);
    return list.filter((a) => {
      const cat = (CATEGORIES.find((c) => c.id === a.category) || {}).name || "";
      const text = [a.title, a.tag, a.keywords, cat].join(" ").toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }

  function card(a) {
    const c = el("a", "card");
    c.href = a.url || "#";
    if (a.url && a.url !== "#") { c.target = "_blank"; c.rel = "noopener"; }
    const thumb = el("div", "thumb");
    if (a.image) {
      const img = new Image(); img.src = a.image; img.alt = ""; img.loading = "lazy";
      thumb.appendChild(img);
    } else {
      const hue = [...a.title].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
      thumb.style.background = "linear-gradient(150deg, hsl(" + hue + " 45% 32%), hsl(" + ((hue + 40) % 360) + " 50% 18%))";
      thumb.appendChild(el("span", "thumb-title", a.title.replace(/^예시 앱:\s*/, "")));
    }
    c.appendChild(thumb);
    c.appendChild(el("span", "tag", a.tag || ""));
    c.appendChild(el("span", "title", a.title));
    return c;
  }

  function link(href, text, active) {
    const a = el("a", active ? "active" : "", text); a.href = href; return a;
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
})();

// JSA 세트장 방탈출: 화면과 규칙 코드. 글을 고치려면 data.js 를 여세요.
(function () {
  'use strict';
  const G = window.GAME;
  const S = G.SETTINGS;
  const GAME_KEY = 'jsa-set-game-v1';
  const SET_KEY = 'jsa-set-settings-v1';
  const app = document.getElementById('app');

  // ---------- 저장 ----------
  function load(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? Object.assign(fallback, JSON.parse(raw)) : fallback; } catch (e) { return fallback; }
  }
  function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 저장할 수 없는 환경 */ } }

  const emptyGame = () => ({
    codename: '', avatar: '', startedAt: null, endAt: null, minutes: null,
    pos: Object.assign({}, G.SPAWN), lives: S.lives, caught: 0, restUntil: null,
    cluesRead: [], findHints: {}, boxes: {}, vault: { wrong: 0, open: false, solved: false, sentence: '', at: null },
    outcome: null, escapedAt: null, addedMinutes: 0, cfg: null,
  });
  let game = load(GAME_KEY, emptyGame());
  let settings = load(SET_KEY, { pin: S.teacherPin, minutes: S.minutes, robots: S.robots, speed: S.robotSpeed });
  const save = () => store(GAME_KEY, game);
  const saveSettings = () => store(SET_KEY, settings);

  function boxState(id) {
    game.boxes[id] = game.boxes[id] || { found: false, opened: false, lockWrong: 0, quizzes: {}, keyAt: null };
    return game.boxes[id];
  }
  function quizState(boxId, qid) {
    const b = boxState(boxId);
    b.quizzes[qid] = b.quizzes[qid] || { step: 0, done: false, wrong: 0, hints: 0 };
    return b.quizzes[qid];
  }
  const keysCount = () => G.BOXES.filter((b) => game.boxes[b.id] && game.boxes[b.id].keyAt).length;

  // ---------- 도움 함수 ----------
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = (s) => String(s).replace(/\{\{(.+?)\}\}/g, '$1');
  // {{낱말}} → 누르면 뜻이 뜨는 낱말, 줄바꿈 → <br>
  function T(s) {
    return esc(s).replace(/\{\{(.+?)\}\}/g, (m, w) => {
      const k = w.replace(/\s/g, '');
      return G.GLOSSARY[k] ? `<button type="button" class="gl" data-w="${esc(k)}">${w}</button>` : w;
    }).replace(/\n/g, '<br>');
  }
  function fmt(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  // 같은 문제는 늘 같은 순서로 섞이도록(새로고침해도 그대로)
  function shuffleIdx(n, seedStr) {
    let s = 0;
    for (const ch of seedStr) s = (s * 31 + ch.charCodeAt(0)) % 233280;
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (n > 1 && a.every((v, i) => v === i)) a.push(a.shift());
    return a;
  }
  const art = (name) => `art/${name}.svg`;

  // 낱말 풀이 말풍선
  document.addEventListener('click', (e) => {
    const old = $('.gl-pop');
    const btn = e.target.closest('.gl');
    if (old && !btn) old.remove();
    if (!btn) return;
    e.preventDefault();
    if (old) old.remove();
    const pop = document.createElement('div');
    pop.className = 'gl-pop';
    pop.innerHTML = `<b>${esc(btn.textContent)}</b> ${esc(G.GLOSSARY[btn.dataset.w])}`;
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left), innerWidth - pop.offsetWidth - 8);
    let top = r.bottom + 6;
    if (top + pop.offsetHeight > innerHeight - 8) top = r.top - pop.offsetHeight - 6;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  });

  function toast(msg, ms) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms || 2600);
    setTimeout(() => t.remove(), (ms || 2600) + 500);
  }

  // ---------- 화면 나누기 ----------
  function route() {
    const [path, query] = location.hash.replace(/^#\/?/, '/').split('?');
    return { path: path || '/', q: new URLSearchParams(query || '') };
  }
  let stopLoop = null;
  function render() {
    if (stopLoop) { stopLoop(); stopLoop = null; }
    if (Music.playing) Music.want(false);
    $$('.gl-pop').forEach((p) => p.remove());
    const { path, q } = route();
    if (path.startsWith('/teacher')) return teacherScreen();
    if (!openingSeen && G.OPENING && !game.startedAt) return openingScreen();
    if (!game.codename) return joinScreen(q);
    if (!game.startedAt) return introScreen();
    if (game.outcome) return endScreen();
    return exploreScreen();
  }
  addEventListener('hashchange', render);

  // ---------- 배경 음악 (파일 없이 브라우저에서 직접 연주하는 짧은 반복곡) ----------
  // 낮게 깔리는 소리 + 심장 박동 같은 베이스 + 가끔 울리는 오르골 선율. 학생이 HUD의 음악 버튼으로 끌 수 있어요.
  const MUSIC_KEY = 'jsa-set-music-v1';
  const Music = {
    on: load(MUSIC_KEY, { on: true }).on,
    ctx: null, master: null, timer: 0, step: 0, next: 0,
    ensure() {
      if (this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      // 낮은 깔림 소리: 라(A) 와 미(E), 천천히 숨 쉬는 필터
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(this.master);
      const lfo = this.ctx.createOscillator(); const lg = this.ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      [[55, 'sawtooth', 0.05], [82.41, 'sawtooth', 0.035], [110, 'triangle', 0.05]].forEach(([f, type, v]) => {
        const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = Math.random() * 8 - 4;
        const g = this.ctx.createGain(); g.gain.value = v; o.connect(g); g.connect(lp); o.start();
      });
      // 오르골에 쓰는 메아리
      this.echo = this.ctx.createDelay(); this.echo.delayTime.value = 0.42;
      const fb = this.ctx.createGain(); fb.gain.value = 0.35;
      this.echo.connect(fb); fb.connect(this.echo); this.echo.connect(this.master);
      return true;
    },
    note(t, f, dur, type, vol, echo) {
      const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); if (echo) g.connect(this.echo);
      o.start(t); o.stop(t + dur + 0.05);
    },
    // 72 BPM, 라단조 화음 4개(Am - F - C - G)를 8박씩
    BASS: [55, 43.65, 65.41, 49],
    MEL: [[440, 523.25, 659.25, 587.33], [349.23, 440, 523.25, 440], [392, 523.25, 659.25, 783.99], [392, 493.88, 587.33, 493.88]],
    schedule() {
      const beat = 60 / 72;
      while (this.next < this.ctx.currentTime + 0.3) {
        const t = this.next, st = this.step, chord = Math.floor(st / 8) % 4, b = st % 8;
        if (b % 2 === 0) { this.note(t, this.BASS[chord], 0.5, 'sine', 0.22); this.note(t + 0.18, this.BASS[chord], 0.35, 'sine', 0.12); }
        if ((st % 32) >= 16 && (b === 0 || b === 3 || b === 5)) this.note(t, this.MEL[chord][(b + st) % 4], 1.4, 'triangle', 0.06, true);
        this.step++; this.next += beat;
      }
    },
    play() {
      if (!this.on || !this.ensure()) return;
      const c = this.ctx;
      c.resume();
      if (!this.timer) { this.next = c.currentTime + 0.1; this.timer = setInterval(() => this.schedule(), 100); }
      this.master.gain.cancelScheduledValues(c.currentTime); this.master.gain.setTargetAtTime(0.5, c.currentTime, 0.8);
    },
    stop() {
      if (!this.ctx) return;
      const c = this.ctx;
      this.master.gain.cancelScheduledValues(c.currentTime); this.master.gain.setTargetAtTime(0, c.currentTime, 0.2);
      setTimeout(() => { if (!this.on || !this.playing) { clearInterval(this.timer); this.timer = 0; c.suspend(); } }, 700);
    },
    playing: false,
    want(play) { this.playing = play; if (play && this.on) this.play(); else this.stop(); },
    toggle() { this.on = !this.on; store(MUSIC_KEY, { on: this.on }); this.want(this.playing); return this.on; },
  };
  // 새로고침 뒤에는 첫 터치·키 입력에서 음악을 다시 켜요(브라우저가 소리 자동 재생을 막기 때문)
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => { if (Music.playing && Music.on && (!Music.ctx || Music.ctx.state !== 'running')) Music.play(); }));
  const musicLabel = () => (Music.on ? '🔊 음악' : '🔇 음악');

  // ---------- 여는 장면 (주소를 열 때마다 한 번, 건너뛸 수 있어요) ----------
  let openingSeen = false;
  function openingScreen() {
    const scenes = G.OPENING;
    let i = -1, timer = 0;
    app.innerHTML = `<div class="opening"><div class="op-bg" style="background-image:url(${art('entry_bg')})"></div>
      <div class="op-film top"></div><div class="op-film bot"></div>
      <div class="op-scene" id="sc"></div>
      <div class="op-bar"><button class="btn small" id="nx">다음 ▶</button><button class="btn small ghost" id="skip">건너뛰기</button></div></div>`;
    const done = () => { clearTimeout(timer); openingSeen = true; render(); };
    const next = () => {
      clearTimeout(timer);
      i++;
      if (i >= scenes.length) return done();
      const sc = $('#sc');
      if (!sc) return;
      sc.classList.remove('on');
      setTimeout(() => {
        const s = scenes[i];
        sc.innerHTML = `${s.small ? `<small>${esc(s.small)}</small>` : ''}${esc(s.text).replace(/\n/g, '<br>')}`;
        sc.classList.add('on');
      }, i === 0 ? 50 : 700);
      timer = setTimeout(next, (scenes[i].sec || 4.5) * 1000);
    };
    $('#skip').onclick = done;
    $('#nx').onclick = next;
    next();
  }

  // ---------- 입장 ----------
  function newCodename() { return `견습 스태프 ${10 + Math.floor(Math.random() * 90)}호`; }
  function joinScreen(q) {
    const cfg = {
      minutes: q.has('m') ? clampNum(q.get('m'), 5, 120, settings.minutes) : settings.minutes,
      robots: q.has('r') ? clampNum(q.get('r'), 0, 3, settings.robots) : settings.robots,
      speed: q.has('s') ? clampNum(q.get('s'), 0.5, 1.6, settings.speed) : settings.speed,
    };
    let code = newCodename();
    let av = '';
    app.innerHTML = `
      <div class="join" style="background-image:url(${art('entry_bg')})">
        <form class="join-card">
          <div class="kicker">세트장 견습 스태프 등록</div>
          <h1>${esc(S.title)}</h1>
          <p class="muted">${esc(S.subtitle)} · 혼자 하기 · ${cfg.minutes}분</p>
          <div class="label">나의 스태프 번호</div>
          <div class="codename"><b id="code">${esc(code)}</b><button type="button" class="btn small ghost" id="reroll">다른 번호</button></div>
          <p class="tiny">이름이나 학번은 쓰지 않아요. 이 번호로만 게임을 해요.</p>
          <div class="label">스태프 고르기</div>
          <div class="av-pick">${G.AVATARS.map((a) => `<button type="button" class="av" data-id="${a.id}" title="${esc(a.name)}"><img src="${art('av_' + a.id)}" alt="${esc(a.name)}"></button>`).join('')}</div>
          <button class="btn big" id="go" disabled>등록하기</button>
          <a class="teacher-link" href="#teacher">교사 화면</a>
        </form>
      </div>`;
    $('#reroll').onclick = () => { code = newCodename(); $('#code').textContent = code; };
    $$('.av').forEach((b) => (b.onclick = () => {
      av = b.dataset.id;
      $$('.av').forEach((x) => x.classList.toggle('on', x === b));
      $('#go').disabled = false;
    }));
    $('.join-card').onsubmit = (e) => {
      e.preventDefault();
      if (!av) return;
      game = emptyGame();
      game.codename = code;
      game.avatar = av;
      game.minutes = cfg.minutes;
      game.cfg = cfg;
      save();
      render();
    };
  }
  function clampNum(v, lo, hi, d) { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; }

  function idCard(extra) {
    const a = G.AVATARS.find((x) => x.id === game.avatar) || G.AVATARS[0];
    return `<div class="id-card"><div class="id-photo"><img src="${art('av_' + a.id)}" alt=""></div>
      <div><div class="id-org">JSA 세트장 · 견습 스태프증</div><div class="id-name">${esc(game.codename)}</div><div class="id-role">${esc(a.name)}</div></div>${extra || ''}</div>`;
  }

  // ---------- 도입: 규칙 + 미술 감독의 편지 ----------
  function introScreen() {
    let page = 0;
    const draw = () => {
      if (page === 0) {
        app.innerHTML = `<div class="intro"><div class="panel">
          ${idCard()}
          <h2>이렇게 해요</h2>
          <ul class="rules">
            <li>방향키(또는 화면의 방향 버튼)로 세트장 안을 돌아다녀요. 반짝이는 물건 앞에서 <b>살펴보기</b>(스페이스 키)를 눌러요.</li>
            <li>소품 상자 4개를 찾아 4자리 번호로 열고, 자료를 읽고 문제를 풀면 열쇠를 얻어요.</li>
            <li>경비 로봇의 <b>노란 탐조등</b>에 비치면 출입증 1장을 잃고 대기실로 돌아가요. 출입증은 3장이에요.</li>
            <li>어두운 <b>그림자</b> 속에 있으면 들키지 않아요. 로봇과 부딪히면 그림자 속이어도 들켜요.</li>
            <li>자물쇠 번호를 3번 틀리면 경비 로봇이 소리를 듣고 빨라져요.</li>
            <li>열쇠 4개를 모아 필름 보관실 문을 열면 탈출이에요. 제한 시간은 ${game.minutes}분이에요.</li>
          </ul>
          <div class="row center"><button class="btn ghost" id="redo">다시 등록</button><button class="btn" id="next">미술 감독님의 편지 읽기</button></div>
        </div></div>`;
        $('#redo').onclick = () => { game = emptyGame(); save(); render(); };
        $('#next').onclick = () => { page = 1; draw(); };
      } else {
        app.innerHTML = `<div class="intro"><div class="letter" style="background-image:url(${art('letter')})">
          <div class="letter-date">${esc(G.STORY.date)}</div>
          <p>${T(G.STORY.letter)}</p>
          <p class="sig">${esc(G.STORY.signature)}</p>
          <p class="paper-note">${esc(G.STORY.note)}</p>
          <button class="btn big" id="start">세트장으로 들어가기</button>
        </div></div>`;
        $('#start').onclick = () => {
          Music.want(true);
          game.startedAt = Date.now();
          game.endAt = Date.now() + game.minutes * 60000;
          save();
          render();
        };
      }
    };
    draw();
  }

  // ---------- 지도 계산 ----------
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const walkable = (x, y) => G.FLOORS.some((f) => inRect(x, y, f)) && !G.BLOCKS.some((b) => inRect(x, y, b));
  const PR = 12; // 몸 반지름
  const canStand = (x, y) => [[0, 0], [-PR, -PR], [PR, -PR], [-PR, PR], [PR, PR], [0, -PR], [0, PR], [-PR, 0], [PR, 0]].every(([dx, dy]) => walkable(x + dx, y + dy));
  const inShadow = (x, y) => G.SHADOWS.some((s) => inRect(x, y, s));
  function clearLine(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.ceil(d / 6);
    for (let i = 1; i < n; i++) if (!walkable(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n)) return false;
    return true;
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  // ---------- 이미지 ----------
  const IMG = {};
  function img(name) {
    if (!IMG[name]) { IMG[name] = new Image(); IMG[name].src = art(name); }
    return IMG[name];
  }

  // ---------- 바닥 그리기 (한 번만) ----------
  function drawStatic() {
    const W = G.WORLD.w, H = G.WORLD.h;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    // 벽
    g.fillStyle = '#151f36'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1b2742';
    for (let y = 0; y < H; y += 20) for (let x = (y / 20) % 2 ? -20 : 0; x < W; x += 40) g.fillRect(x + 1, y + 1, 38, 18);
    // 바닥
    const pat = {
      south: (r) => { g.fillStyle = '#5d7088'; g.fillRect(r.x, r.y, r.w, r.h); g.strokeStyle = '#536479'; g.lineWidth = 2; for (let y = r.y; y < r.y + r.h; y += 28) { g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke(); } },
      talks: (r) => { for (let y = r.y; y < r.y + r.h; y += 40) for (let x = r.x; x < r.x + r.w; x += 40) { g.fillStyle = ((x - r.x) / 40 + (y - r.y) / 40) % 2 ? '#c4cfdb' : '#d3dde8'; g.fillRect(x, y, Math.min(40, r.x + r.w - x), Math.min(40, r.y + r.h - y)); } g.fillStyle = 'rgba(79,154,214,.25)'; g.fillRect(r.x, r.y, r.w, 16); },
      north: (r) => { g.fillStyle = '#7a6a4a'; g.fillRect(r.x, r.y, r.w, r.h); g.strokeStyle = '#6a5b3e'; g.lineWidth = 2; for (let y = r.y; y < r.y + r.h; y += 22) { g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke(); for (let x = r.x + ((y - r.y) / 22 % 2) * 60; x < r.x + r.w; x += 120) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); } } },
      plaza: (r) => { g.fillStyle = '#80838a'; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = '#767980'; for (let i = 0; i < 260; i++) g.fillRect(r.x + ((i * 137) % r.w), r.y + ((i * 71) % r.h), 4, 4); },
      concrete: (r) => { g.fillStyle = '#6b6f78'; g.fillRect(r.x, r.y, r.w, r.h); g.fillStyle = '#62666e'; for (let i = 0; i < 60; i++) g.fillRect(r.x + ((i * 97) % r.w), r.y + ((i * 53) % r.h), 14, 3); },
      hall: (r) => { for (let y = r.y; y < r.y + r.h; y += 36) for (let x = r.x; x < r.x + r.w; x += 36) { g.fillStyle = ((x - r.x) / 36 + (y - r.y) / 36) % 2 ? '#4a4f6e' : '#555b7c'; g.fillRect(x, y, Math.min(36, r.x + r.w - x), Math.min(36, r.y + r.h - y)); } },
      locked: (r) => { g.fillStyle = '#26324d'; g.fillRect(r.x, r.y, r.w, r.h); },
    };
    G.ROOMS.forEach((r) => (pat[r.floor] || pat.locked)(r));
    // 광장 위쪽 벽의 철조망 무늬
    g.fillStyle = '#2a2a33'; g.fillRect(80, 342, 1440, 24);
    g.strokeStyle = '#6d7686'; g.lineWidth = 1.5;
    for (let x = 84; x < 1520; x += 14) { g.beginPath(); g.moveTo(x, 346); g.lineTo(x + 7, 354); g.lineTo(x, 362); g.stroke(); }
    g.fillStyle = '#9aa3b5'; g.fillRect(80, 345, 1440, 2); g.fillRect(80, 361, 1440, 2);
    // 문틈 바닥
    G.FLOORS.slice(6).forEach((f) => { g.fillStyle = '#8d8a80'; g.fillRect(f.x, f.y, f.w, f.h); });
    // 군사 분계선 표시 (회담장과 광장 가운데를 지나는 낮은 콘크리트 턱, 지나갈 수 있어요)
    if (G.MDL_X) {
      const mx = G.MDL_X;
      [[50, 330], [320, 380], [370, 520]].forEach(([y1, y2]) => {
        g.fillStyle = '#e9e6dc'; g.fillRect(mx - 7, y1, 14, y2 - y1);
        g.fillStyle = '#b9b5a8'; g.fillRect(mx + 3, y1, 4, y2 - y1);
      });
      g.font = 'bold 13px "Noto Sans KR", sans-serif'; g.textBaseline = 'top';
      g.fillStyle = 'rgba(16,22,40,.7)'; roundRect(g, mx + 12, 378, 84, 22, 6); g.fill();
      g.fillStyle = '#f4e8cc'; g.fillText('군사 분계선', mx + 18, 381);
    }
    // 필름 보관실 (잠김) 안의 필름 통과 영사기
    const e = G.ROOMS.find((r) => r.id === 'engine');
    g.save(); g.globalAlpha = 0.55;
    [[e.x + 90, e.y + 120], [e.x + 190, e.y + 120], [e.x + 90, e.y + 210], [e.x + 190, e.y + 210]].forEach(([cx, cy]) => {
      g.fillStyle = '#9aa3b5'; g.beginPath(); g.arc(cx, cy, 38, 0, 7); g.fill();
      g.fillStyle = '#33476f'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(cx + Math.cos(k * 1.256) * 20, cy + Math.sin(k * 1.256) * 20, 8, 0, 7); g.fill(); }
      g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill();
    });
    g.fillStyle = '#33476f'; roundRect(g, e.x + 280, e.y + 130, 90, 70, 10); g.fill();
    g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(e.x + 370, e.y + 165, 12, 0, 7); g.fill();
    g.restore();
    g.fillStyle = 'rgba(10,14,28,.35)'; g.fillRect(e.x, e.y, e.w, e.h);
    // 필름 보관실 문
    const v = G.VAULT.at;
    g.fillStyle = '#4f5b6e'; roundRect(g, v.x - 36, 520, 72, 40, 4); g.fill();
    g.strokeStyle = '#97a3b5'; g.lineWidth = 3; g.strokeRect(v.x - 32, 522, 64, 34);
    g.fillStyle = '#d9a54a'; g.beginPath(); g.arc(v.x, 540, 9, 0, 7); g.fill();
    G.BOXES.map((b) => b.color).forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(v.x - 24 + i * 16, 552, 3.5, 0, 7); g.fill(); });
    // 가구
    G.BLOCKS.forEach((b) => drawBlock(g, b));
    // 그림자
    G.SHADOWS.forEach((s) => { g.fillStyle = 'rgba(8,10,22,.5)'; roundRect(g, s.x, s.y, s.w, s.h, 6); g.fill(); });
    // 방 이름
    g.font = 'bold 20px "Noto Sans KR", sans-serif'; g.textBaseline = 'top';
    G.ROOMS.forEach((r) => {
      const label = r.id === 'engine' ? r.name + ' (잠김)' : r.name;
      const tx = r.id === 'plaza' ? r.x + 16 : r.x + 12;
      const ty = r.id === 'plaza' ? r.y + r.h - 28 : r.y + r.h - 30;
      const w = g.measureText(label).width + 16;
      g.fillStyle = 'rgba(16,22,40,.7)'; roundRect(g, tx - 4, ty - 4, w, 30, 8); g.fill();
      g.fillStyle = '#f4e8cc'; g.fillText(label, tx + 4, ty + 1);
    });
    return c;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function drawBlock(g, b) {
    const { x, y, w, h } = b;
    const box = (fill, stroke, r) => { g.fillStyle = fill; roundRect(g, x, y, w, h, r || 4); g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); } };
    switch (b.kind) {
      case 'counter': box('#3e4f66', '#26324d'); g.fillStyle = '#5d7088'; g.fillRect(x + 4, y + 4, w - 8, 12); g.fillStyle = '#cfe3f0'; for (let i = 0; i < 3; i++) { roundRect(g, x + 30 + i * 95, y + 20, 60, 20, 4); g.fill(); } break;
      case 'locker': box('#4f5b6e', '#33476f'); g.strokeStyle = '#97a3b5'; g.lineWidth = 2; for (let yy = y + 30; yy < y + h; yy += 30) { g.beginPath(); g.moveTo(x + 4, yy); g.lineTo(x + w - 4, yy); g.stroke(); } break;
      case 'shelf': box('#5a3a24', '#3a2414'); g.fillStyle = '#c9b38a'; for (let yy = y + 8; yy < y + h - 8; yy += 18) g.fillRect(x + 5, yy, w - 10, 8); break;
      case 'table': box('#8c5a34', '#5a3a24', 8); g.fillStyle = '#a8723f'; roundRect(g, x + 6, y + 6, w - 12, h - 12, 6); g.fill(); break;
      case 'ctable': box('#2b4a63', '#1b2740', 6); g.fillStyle = '#4f7d5c'; roundRect(g, x + 8, y + 8, w - 16, h - 16, 4); g.fill(); g.fillStyle = '#e9e6dc'; g.fillRect(x + w / 2 - 3, y + 8, 6, h - 16); g.fillStyle = '#2a2118'; [x + 40, x + w - 40].forEach((mx) => { g.beginPath(); g.arc(mx, y + h / 2, 6, 0, 7); g.fill(); g.fillRect(mx - 1, y + h / 2 - 20, 2, 14); }); break;
      case 'flag': g.fillStyle = '#97a3b5'; g.fillRect(x + w / 2 - 2, y, 4, h); g.fillStyle = '#4f9ad6'; g.fillRect(x + w / 2 + 2, y + 2, 16, 11); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + w / 2 + 10, y + 7.5, 3, 0, 7); g.fill(); break;
      case 'rtable': g.fillStyle = '#5a3a24'; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2, 0, 7); g.fill(); g.fillStyle = '#a8723f'; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 6, 0, 7); g.fill(); g.fillStyle = '#f4e8cc'; g.beginPath(); g.arc(x + w / 2 + 8, y + h / 2 - 6, 7, 0, 7); g.fill(); g.fillStyle = '#c4553c'; g.fillRect(x + w / 2 - 14, y + h / 2 + 2, 14, 9); break;
      case 'stove': box('#3a3f4a', '#22262e', 10); g.fillStyle = '#c4553c'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 16, 0, 7); g.fill(); g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 8, 0, 7); g.fill(); g.fillStyle = '#6d7686'; g.fillRect(x + w / 2 - 5, y - 2, 10, 14); break;
      case 'bunk': box('#5a4a2e', '#3a2f1c', 6); g.fillStyle = '#6f7d58'; roundRect(g, x + 6, y + 6, w - 12, h - 12, 4); g.fill(); g.fillStyle = '#e6d3a8'; roundRect(g, x + 10, y + 9, 30, h - 18, 4); g.fill(); break;
      case 'radio': box('#3a3f4a', '#22262e'); g.fillStyle = '#ffd98a'; g.fillRect(x + 6, y + 8, w - 12, 6); g.fillStyle = '#97a3b5'; g.beginPath(); g.arc(x + w / 2, y + h - 11, 6, 0, 7); g.fill(); break;
      case 'lamp': g.fillStyle = '#4f5b6e'; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2, 0, 7); g.fill(); g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 7, 0, 7); g.fill(); break;
      case 'crate': box('#8c5a34', '#5a3a24'); g.strokeStyle = '#6e4125'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w - 4, y + h - 4); g.moveTo(x + w - 4, y + 4); g.lineTo(x + 4, y + h - 4); g.stroke(); break;
      case 'chairs': for (let xx = x; xx < x + w - 4; xx += 32) { g.fillStyle = '#2a2118'; roundRect(g, xx + 2, y, 28, h, 5); g.fill(); g.fillStyle = '#c4553c'; roundRect(g, xx + 5, y + 4, 22, h - 12, 4); g.fill(); } break;
      default: box('#555');
    }
  }

  // ---------- 탐색 화면 ----------
  function exploreScreen() {
    const cfg = game.cfg || { robots: S.robots, speed: S.robotSpeed };
    app.innerHTML = `
      <div class="explore">
        <div class="hud">
          <div class="hud-l"><img src="${art('av_' + game.avatar)}" alt=""><div class="hud-who"><span>${esc(game.codename)}</span><small id="room"></small></div></div>
          <div class="hud-c"><span class="timer" id="timer">--:--</span></div>
          <div class="hud-r">
            <span class="lives" id="lives"></span>
            <span class="keys" id="keys"></span>
            <button class="btn small ghost" id="bgm" aria-label="배경 음악 켜고 끄기">${musicLabel()}</button><button class="btn small ghost" id="map">지도</button><button class="btn small" id="note">수첩</button>
          </div>
        </div>
        <div class="stage" id="stage"><canvas id="cv"></canvas>
          <div class="rest" id="rest" hidden></div>
          <div class="rotate-tip">휴대 전화는 가로로 돌리면 지도가 더 크게 보여요.</div>
          <button class="act" id="act" hidden>살펴보기</button>
          <div class="pad" id="pad">
            <button data-d="up" aria-label="위">▲</button><button data-d="left" aria-label="왼쪽">◀</button><button data-d="right" aria-label="오른쪽">▶</button><button data-d="down" aria-label="아래">▼</button>
          </div>
        </div>
        <div class="modal-layer" id="modal" hidden></div>
      </div>`;
    const cv = $('#cv'), ctx = cv.getContext('2d'), stage = $('#stage');
    const bg = drawStatic();
    const W = G.WORLD.w, H = G.WORLD.h;
    // 카메라: 화면이 크면 지도 전체, 작으면 조금 확대해 학생을 따라가요
    let scale = 1, dpr = 1, vw = 0, vh = 0, camX = 0, camY = 0;
    function fit() {
      const r = stage.getBoundingClientRect();
      vw = r.width; vh = r.height;
      const whole = Math.min(vw / W, vh / H);
      scale = Math.max(whole, Math.min(1.5, Math.max(vw / 1100, vh / 640)));
      dpr = window.devicePixelRatio || 1;
      cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
      cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    }
    function camera() {
      const p = game.pos;
      camX = W * scale <= vw ? (vw - W * scale) / 2 : -Math.max(0, Math.min(W * scale - vw, p.x * scale - vw / 2));
      camY = H * scale <= vh ? (vh - H * scale) / 2 : -Math.max(0, Math.min(H * scale - vh, p.y * scale - vh / 2));
    }
    fit();
    addEventListener('resize', fit);

    // 로봇
    const robots = G.ROBOT_PATHS.slice(0, Math.max(0, Math.min(3, cfg.robots))).map((p) => ({
      path: p.loop, i: 0, x: p.loop[0].x, y: p.loop[0].y, dir: 0, wait: 0, scanBase: 0, t: 0,
    }));
    // 자물쇠를 3번 틀리면 가장 가까운 문에서 출동하는 로봇
    const DOORS = [{ x: 310, y: 445 }, { x: 800, y: 445 }, { x: 1290, y: 445 }, { x: 310, y: 540 }, { x: 800, y: 540 }];
    let chaser = null;
    function sendChaser() {
      const d = DOORS.reduce((a, b) => (Math.hypot(b.x - game.pos.x, b.y - game.pos.y) < Math.hypot(a.x - game.pos.x, a.y - game.pos.y) ? b : a));
      chaser = { x: d.x, y: d.y, dir: 0, until: Date.now() + 9000, chase: true };
    }
    let alertUntil = 0, invulnUntil = Date.now() + 1500, paused = false, lastT = performance.now(), raf = 0;
    const keysDown = new Set();
    const padDown = new Set();
    let target = null; // 화면을 눌러 이동할 곳

    const onKey = (e) => {
      if ($('#modal').hidden === false) { if (e.key === 'Escape') closeModal(); return; }
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keysDown.add(k); target = null; e.preventDefault(); }
      if ((k === ' ' || k === 'e' || k === 'enter') && e.type === 'keydown') { e.preventDefault(); interact(); }
    };
    const onKeyUp = (e) => keysDown.delete(e.key.toLowerCase());
    addEventListener('keydown', onKey);
    addEventListener('keyup', onKeyUp);
    $$('#pad button').forEach((b) => {
      const on = (e) => { e.preventDefault(); padDown.add(b.dataset.d); target = null; };
      const off = (e) => { e.preventDefault(); padDown.delete(b.dataset.d); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect();
      target = { x: (e.clientX - r.left - camX) / scale, y: (e.clientY - r.top - camY) / scale };
    });
    $('#act').onclick = interact;
    $('#note').onclick = () => openNotebook();
    $('#map').onclick = () => openMap();
    $('#bgm').onclick = () => { Music.toggle(); $('#bgm').textContent = musicLabel(); toast(Music.on ? '배경 음악을 켰어요.' : '배경 음악을 껐어요.'); };
    Music.want(true);

    function interactables() {
      const list = [];
      G.CLUES.forEach((c) => list.push({ kind: 'clue', item: c, at: c.at }));
      G.BOXES.forEach((b) => list.push({ kind: 'box', item: b, at: b.at }));
      list.push({ kind: 'vault', item: G.VAULT, at: G.VAULT.at });
      return list;
    }
    function nearest() {
      let best = null, bd = 62;
      interactables().forEach((it) => {
        const d = Math.hypot(it.at.x - game.pos.x, it.at.y - game.pos.y);
        if (d < bd) { bd = d; best = it; }
      });
      return best;
    }
    function interact() {
      if (paused || game.restUntil) return;
      const it = nearest();
      if (!it) return;
      if (it.kind === 'clue') openClue(it.item);
      if (it.kind === 'box') { const st = boxState(it.item.id); if (!st.found) { st.found = true; save(); } openBox(it.item); }
      if (it.kind === 'vault') openVault();
    }

    // ----- 모달 -----
    function openModal(html, cls) {
      paused = true; keysDown.clear(); padDown.clear(); target = null;
      const m = $('#modal');
      m.hidden = false;
      m.innerHTML = `<div class="modal ${cls || ''}"><button class="x" aria-label="닫기">✕</button><div class="modal-body">${html}</div></div>`;
      $('.x', m).onclick = closeModal;
      return $('.modal-body', m);
    }
    function closeModal() {
      const m = $('#modal');
      m.hidden = true; m.innerHTML = '';
      $$('.gl-pop').forEach((p) => p.remove());
      paused = false; lastT = performance.now();
      updateHud();
      if (game.outcome) render();
    }

    function openClue(c) {
      if (!game.cluesRead.includes(c.id)) { game.cluesRead.push(c.id); save(); }
      openModal(`<div class="clue"><img src="${art(c.img)}" alt=""><h3>${esc(c.title)}</h3><p>${T(c.body)}</p><button class="btn" id="ok">수첩에 적어 두기</button></div>`);
      $('#ok').onclick = closeModal;
    }

    // ----- 소품 상자 -----
    function openBox(b) {
      const st = boxState(b.id);
      if (!st.opened) return lockView(b);
      if (st.keyAt) return boxView(b, null, true);
      boxView(b);
    }
    function lockView(b) {
      const st = boxState(b.id);
      const body = openModal(`<div class="lockview">
        <img class="box-img" src="${art(b.img)}" alt="">
        <h3>${esc(b.name)} <small>${esc(b.room)}</small></h3>
        <p class="note">${esc(b.lockNote)}</p>
        <form class="dial"><input id="code" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="····" aria-label="4자리 번호"><button class="btn">열기</button></form>
        <p class="msg" id="msg">${st.lockWrong ? `틀린 횟수 ${st.lockWrong} / ${S.lockWrongLimit}` : '4자리 숫자를 넣어 보세요.'}</p>
      </div>`);
      const input = $('#code', body);
      setTimeout(() => input.focus(), 50);
      input.oninput = () => { input.value = input.value.replace(/\D/g, '').slice(0, 4); };
      $('.dial', body).onsubmit = (e) => {
        e.preventDefault();
        if (input.value.length !== 4) { $('#msg').textContent = '4자리 숫자를 모두 넣어 주세요.'; return; }
        if (input.value === b.code) {
          st.opened = true; save();
          toast('철컥! 상자가 열렸어요.');
          boxView(b);
        } else {
          st.lockWrong++;
          input.value = '';
          body.querySelector('.lockview').classList.remove('shake'); void body.offsetWidth; body.querySelector('.lockview').classList.add('shake');
          if (st.lockWrong >= S.lockWrongLimit) {
            st.lockWrong = 0; save();
            alertUntil = Date.now() + 12000;
            sendChaser();
            closeModal();
            toast('삐빅! 소리를 들은 경비 로봇이 달려와요. 그림자에 숨으세요!', 3600);
          } else {
            save();
            $('#msg').textContent = `번호가 맞지 않아요. 틀린 횟수 ${st.lockWrong} / ${S.lockWrongLimit}`;
          }
        }
      };
    }

    function cardHtml(c) {
      return `<div class="card ${c.kind}"><div class="card-kind">${{ doc: '문서', scene: '영화 장면', photo: '사진', telegram: '소식', letter: '편지' }[c.kind] || ''}</div>
        <h4>${esc(c.title)}</h4><p>${T(c.body)}</p>${c.cite ? `<p class="cite">${esc(c.cite)}</p>` : ''}${c.note ? `<p class="cite">${esc(c.note)}</p>` : ''}</div>`;
    }

    function boxView(b, quizId, showKey) {
      const st = boxState(b.id);
      const allDone = b.quizzes.every((q) => quizState(b.id, q.id).done);
      if (allDone && !st.keyAt) { st.keyAt = Date.now(); save(); showKey = true; }
      if (showKey) {
        const body = openModal(`<div class="keyview">
          <img class="key-img" src="${art(b.key)}" alt="">
          <div class="kicker">${b.no}번 열쇠를 얻었어요</div>
          <h2>열쇠 낱말: <span style="color:${b.color}">${esc(b.keyWord)}</span></h2>
          <div class="record"><b>감독님의 촬영 노트</b><p>${T(b.record)}</p></div>
          <p class="muted">${keysCount() < G.BOXES.length ? `남은 열쇠 ${G.BOXES.length - keysCount()}개. 수첩에서 다시 읽을 수 있어요.` : '열쇠 4개를 모두 모았어요! 광장 오른쪽 아래 필름 보관실 문으로 가세요.'}</p>
          <div class="row center"><button class="btn ghost" id="cards">자료 다시 보기</button><button class="btn" id="ok">계속 탐색하기</button></div>
        </div>`, 'wide');
        $('#ok', body).onclick = closeModal;
        $('#cards', body).onclick = () => boxView(b, '__cards');
        updateHud();
        return;
      }
      const q = b.quizzes.find((x) => x.id === quizId);
      const tabs = `<div class="quiz-tabs">${b.quizzes.map((x, i) => {
        const qs = quizState(b.id, x.id);
        return `<button class="qt ${x.id === quizId ? 'on' : ''} ${qs.done ? 'done' : ''}" data-q="${x.id}">${qs.done ? '✓' : i + 1}. ${esc(x.title)}</button>`;
      }).join('')}</div>`;
      let main;
      if (!q) {
        main = `<p class="lead">상자 안에서 자료 ${b.cards.length}장이 나왔어요. 자료를 읽고 위의 문제를 하나씩 풀어 보세요. 문제 ${b.quizzes.length}개를 모두 풀면 열쇠를 얻어요.</p>
          <div class="cards">${b.cards.map(cardHtml).join('')}</div>`;
      } else {
        const qs = quizState(b.id, q.id);
        const cards = q.combine.map((id) => b.cards.find((c) => c.id === id)).filter(Boolean);
        main = `<div class="quiz-wrap"><div class="cards small">${cards.map(cardHtml).join('')}</div>
          <div class="quiz" id="quiz"></div></div>`;
        setTimeout(() => drawQuiz(b, q, qs), 0);
      }
      const body = openModal(`<div class="boxview">
        <div class="boxhead"><img src="${art(b.img)}" alt=""><div><div class="kicker">${b.no}번 상자 · ${esc(b.theme)}</div><h3>${esc(b.name)}</h3></div>
        <button class="btn small ghost ${!q ? 'on' : ''}" id="allcards">자료 ${b.cards.length}장 모두 보기</button></div>
        ${tabs}${main}</div>`, 'wide');
      $$('.qt', body).forEach((t) => (t.onclick = () => boxView(b, t.dataset.q)));
      $('#allcards', body).onclick = () => boxView(b, null);
    }

    function drawQuiz(b, q, qs) {
      const el = $('#quiz');
      if (!el) return;
      if (qs.done) {
        el.innerHTML = `<div class="solved">✓ 이 문제를 풀었어요.</div>${nextButton(b, q)}`;
        bindNext(el, b, q);
        return;
      }
      const step = q.steps[qs.step];
      const seed = `${b.id}-${q.id}-${qs.step}`;
      el.innerHTML = `<div class="qhead">${q.steps.length > 1 ? `<span class="stepno">${qs.step + 1} / ${q.steps.length}</span>` : ''}<p class="q">${T(step.q)}</p></div>
        <div class="qbody"></div>
        <div class="qfoot"><button class="btn small ghost" id="hint">힌트 보기</button><span class="qmsg" id="qmsg"></span></div>
        <div class="hints" id="hints">${(step.hints || []).slice(0, qs.hints).map((h) => `<p>💡 ${T(h)}</p>`).join('')}</div>`;
      const qb = $('.qbody', el);
      const done = (ok) => {
        if (ok) {
          qs.step++;
          if (qs.step >= q.steps.length) { qs.done = true; }
          qs.hints = 0;
          save();
          const finished = b.quizzes.every((x) => quizState(b.id, x.id).done);
          if (finished) { toast('정답! 모든 문제를 풀었어요.'); setTimeout(() => boxView(b, null, false), 700); return; }
          toast(qs.done ? '정답! 이 문제를 풀었어요.' : '정답! 다음 단계로 가요.');
          setTimeout(() => boxView(b, q.id), 600);
        } else {
          qs.wrong++; save();
          $('#qmsg').textContent = '아직 아니에요. 자료를 다시 살펴보세요.';
          $('#qmsg').classList.remove('bad'); void el.offsetWidth; $('#qmsg').classList.add('bad');
        }
      };
      $('#hint', el).onclick = () => {
        const hs = step.hints || [];
        if (qs.hints < hs.length) { qs.hints++; save(); $('#hints').innerHTML = hs.slice(0, qs.hints).map((h) => `<p>💡 ${T(h)}</p>`).join(''); }
        if (qs.hints >= hs.length) $('#hint', el).disabled = true;
      };
      if ((step.hints || []).length <= qs.hints) $('#hint', el).disabled = true;
      PUZZLES[step.type](qb, step, seed, done);
    }
    function nextButton(b, q) {
      const next = b.quizzes.find((x) => !quizState(b.id, x.id).done);
      return next ? `<button class="btn" data-next="${next.id}">다음 문제: ${esc(next.title)}</button>` : '';
    }
    function bindNext(el, b) { $$('[data-next]', el).forEach((n) => (n.onclick = () => boxView(b, n.dataset.next))); }

    // ----- 필름 보관실 -----
    function openVault() {
      const v = game.vault;
      const have = keysCount();
      const keyRow = `<div class="keyrow">${G.BOXES.map((b) => `<div class="keyslot ${game.boxes[b.id] && game.boxes[b.id].keyAt ? 'have' : ''}" style="border-color:${b.color}"><img src="${art(b.key)}" alt=""><small>${game.boxes[b.id] && game.boxes[b.id].keyAt ? esc(b.keyWord) : '?'}</small></div>`).join('')}</div>`;
      if (have < G.BOXES.length) {
        const body = openModal(`<div class="vaultview"><img class="door" src="${art('vault')}" alt=""><h3>필름 보관실 문</h3>${keyRow}
          <p>열쇠 구멍이 4개 있어요. 지금 가진 열쇠는 ${have}개예요. 상자 4개에서 열쇠를 모두 모아 오세요.</p><button class="btn" id="ok">돌아가기</button></div>`);
        $('#ok', body).onclick = closeModal;
        return;
      }
      if (!v.open) {
        const body = openModal(`<div class="vaultview"><img class="door" src="${art('vault')}" alt=""><h3>열쇠 4개를 모두 꽂았어요</h3>${keyRow}
          <p class="note">${esc(G.VAULT.codeNote)}</p>
          <form class="dial"><input id="code" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="····" aria-label="4자리 번호"><button class="btn">다이얼 돌리기</button></form><p class="msg" id="msg"></p></div>`);
        const input = $('#code', body);
        setTimeout(() => input.focus(), 50);
        input.oninput = () => { input.value = input.value.replace(/\D/g, '').slice(0, 4); };
        $('.dial', body).onsubmit = (e) => {
          e.preventDefault();
          if (input.value === G.VAULT.code) { v.open = true; save(); toast('필름 보관실 문이 열렸어요!'); openVault(); }
          else { v.wrong++; save(); input.value = ''; $('#msg').textContent = G.VAULT.wrongMsg; }
        };
        return;
      }
      if (!v.solved) return conclusionView();
      return sentenceView();
    }
    function conclusionView() {
      const words = G.BOXES.map((b) => b.keyWord);
      const order = shuffleIdx(words.length, 'vault');
      const filled = Array(words.length).fill(null);
      let sel = 0;
      const body = openModal(`<div class="vaultview">
        <h3>마지막 장면의 자막</h3>
        <p>마지막 장면에 들어갈 자막에 빈칸이 있어요. 열쇠 낱말을 알맞은 자리에 넣어 문장을 완성하세요.</p>
        <div class="concl" id="concl"></div>
        <div class="chips" id="chips"></div>
        <div class="row center"><button class="btn ghost small" id="clear">다시 넣기</button><button class="btn" id="check">완성하기</button></div><p class="msg" id="msg"></p></div>`, 'wide');
      const draw = () => {
        $('#concl', body).innerHTML = G.VAULT.conclusion.map((line, li) => `<p>${esc(line).replace(/\{(\d)\}/, (m, n) => {
          const i = Number(n);
          return `<button class="blank ${sel === i ? 'sel' : ''} ${filled[i] !== null ? 'full' : ''}" data-i="${i}">${filled[i] !== null ? esc(words[filled[i]]) : '　　　'}</button>`;
        })}</p>`).join('');
        $('#chips', body).innerHTML = order.map((wi) => `<button class="chip" data-w="${wi}" ${filled.includes(wi) ? 'disabled' : ''}>${esc(words[wi])}</button>`).join('');
        $$('.blank', body).forEach((bn) => (bn.onclick = () => { const i = Number(bn.dataset.i); if (filled[i] !== null) filled[i] = null; sel = i; draw(); }));
        $$('.chip', body).forEach((c) => (c.onclick = () => {
          filled[sel] = Number(c.dataset.w);
          const nx = filled.findIndex((f) => f === null);
          sel = nx === -1 ? sel : nx;
          draw();
        }));
      };
      draw();
      $('#clear', body).onclick = () => { filled.fill(null); sel = 0; draw(); };
      $('#check', body).onclick = () => {
        if (filled.includes(null)) { $('#msg').textContent = '빈칸을 모두 채워 주세요.'; return; }
        if (filled.every((f, i) => f === i)) { game.vault.solved = true; save(); sentenceView(); }
        else { $('#msg').textContent = '문장이 어색해요. 상자 순서(1번 → 4번)와 열쇠 낱말을 떠올려 보세요.'; }
      };
    }
    function sentenceView() {
      const words = G.BOXES.map((b) => b.keyWord);
      const line = G.VAULT.conclusion.join(' ').replace(/\{(\d)\}/g, (m, n) => words[Number(n)]);
      const body = openModal(`<div class="vaultview">
        <img class="ending-thumb" src="${art('ending')}" alt="">
        <blockquote class="journal">${esc(line)}</blockquote>
        <p>${esc(G.VAULT.ask)}</p>
        <textarea id="sent" maxlength="120" rows="3" placeholder="${esc(G.VAULT.placeholder)}"></textarea>
        <p class="tiny">이름, 학번, 전화번호 같은 개인 정보는 쓰지 마세요. 이 글은 이 기기에만 남아요.</p>
        <button class="btn big" id="send">마지막 장면에 자막 넣기</button><p class="msg" id="msg"></p></div>`, 'wide');
      $('#send', body).onclick = () => {
        const t = $('#sent', body).value.trim();
        if (t.length < 5) { $('#msg').textContent = '다섯 글자 이상 써 주세요.'; return; }
        game.vault.sentence = t;
        game.vault.at = Date.now();
        game.outcome = 'escaped';
        game.escapedAt = Date.now();
        save();
        closeModal();
      };
    }

    function seekTarget() {
      const nextBox = G.BOXES.find((b) => !(game.boxes[b.id] && game.boxes[b.id].opened));
      if (nextBox) return nextBox;
      if (keysCount() === G.BOXES.length && !game.vault.open) return Object.assign({ id: 'vault' }, G.VAULT);
      return null;
    }

    // ----- 지도 -----
    function openMap() {
      const pct = (v, m) => `${(v / m) * 100}%`;
      const seek = seekTarget();
      const body = openModal(`<div class="minimap"><h3>세트장 지도</h3>
        <div class="mini-wrap"><img src="${bg.toDataURL('image/png')}" alt="세트장 지도">
          ${G.BOXES.filter((b) => game.boxes[b.id] && game.boxes[b.id].found).map((b) => `<span class="mini-box ${game.boxes[b.id].keyAt ? 'done' : ''}" style="left:${pct(b.at.x, W)};top:${pct(b.at.y, H)};border-color:${b.color}">${b.no}</span>`).join('')}
          ${seek && (game.findHints[seek.id] || 0) >= 1 ? `<span class="mini-seek" style="left:${pct(seek.at.x, W)};top:${pct(seek.at.y, H)}"></span>` : ''}
          <span class="mini-me" style="left:${pct(game.pos.x, W)};top:${pct(game.pos.y, H)}"></span>
        </div>
        <p class="tiny">노란 점이 나, 숫자는 찾은 상자예요. 수첩에서 길 찾기 힌트를 보면 갈 곳이 반짝여요.</p>
        <button class="btn" id="ok">닫기</button></div>`, 'wide');
      $('#ok', body).onclick = closeModal;
    }

    // ----- 수첩 -----
    function openNotebook() {
      const clues = G.CLUES.filter((c) => game.cluesRead.includes(c.id));
      const nextBox = G.BOXES.find((b) => !(game.boxes[b.id] && game.boxes[b.id].opened));
      const hintTarget = nextBox || (keysCount() === G.BOXES.length && !game.vault.open ? G.VAULT : null);
      const hintId = nextBox ? nextBox.id : 'vault';
      const level = game.findHints[hintId] || 0;
      const body = openModal(`<div class="notebook">
        <h3>스태프 수첩</h3>
        <div class="nb-sec"><h4>열쇠 ${keysCount()} / ${G.BOXES.length}</h4>
          <ul>${G.BOXES.map((b) => {
            const st = game.boxes[b.id];
            const state = st && st.keyAt ? `<b style="color:${b.color}">열쇠 낱말: ${esc(b.keyWord)}</b>` : st && st.opened ? '열었어요 · 문제 푸는 중' : st && st.found ? '찾았어요 · 잠겨 있음' : '아직 못 찾았어요';
            return `<li>${b.no}. ${esc(b.theme)} — ${state}${st && st.opened ? ` <button class="btn tiny-btn" data-open="${b.id}">열기</button>` : ''}</li>`;
          }).join('')}</ul></div>
        <div class="nb-sec"><h4>읽은 쪽지 ${clues.length} / ${G.CLUES.length}</h4>
          ${clues.length ? clues.map((c) => `<details><summary>${esc(c.title)}</summary><p>${T(c.body)}</p></details>`).join('') : '<p class="muted">반짝이는 물건을 살펴보면 쪽지가 여기에 모여요.</p>'}</div>
        ${G.BOXES.some((b) => game.boxes[b.id] && game.boxes[b.id].keyAt) ? `<div class="nb-sec"><h4>감독님의 촬영 노트</h4>${G.BOXES.filter((b) => game.boxes[b.id] && game.boxes[b.id].keyAt).map((b) => `<details><summary>${b.no}. ${esc(b.keyWord)}</summary><p>${T(b.record)}</p></details>`).join('')}</div>` : ''}
        ${hintTarget ? `<div class="nb-sec"><h4>길 찾기 힌트 ${nextBox ? `(${nextBox.no}번 상자)` : '(필름 보관실 문)'}</h4>
          ${hintTarget.findHint.slice(0, level).map((h) => `<p>🧭 ${esc(h)}</p>`).join('')}
          ${level < hintTarget.findHint.length ? `<button class="btn small ghost" id="fh">힌트 ${level + 1} 보기</button>` : ''}</div>` : ''}
        <button class="btn" id="ok">닫기</button></div>`);
      $('#ok', body).onclick = closeModal;
      $$('[data-open]', body).forEach((bn) => (bn.onclick = () => openBox(G.BOXES.find((b) => b.id === bn.dataset.open))));
      const fh = $('#fh', body);
      if (fh) fh.onclick = () => { game.findHints[hintId] = level + 1; save(); openNotebook(); };
    }

    // ----- HUD -----
    function updateHud() {
      $('#lives').innerHTML = Array.from({ length: S.lives }, (_, i) => `<span class="ticket ${i < game.lives ? '' : 'lost'}" title="출입증"></span>`).join('');
      $('#keys').innerHTML = G.BOXES.map((b) => `<img class="hkey ${game.boxes[b.id] && game.boxes[b.id].keyAt ? '' : 'off'}" src="${art(b.key)}" alt="">`).join('');
    }
    updateHud();

    // ----- 들킴 -----
    function caught(reason) {
      game.lives--;
      game.caught++;
      game.pos = Object.assign({}, G.SPAWN);
      invulnUntil = Date.now() + 2500;
      target = null;
      if (game.lives <= 0) {
        game.lives = 0;
        game.restUntil = Date.now() + S.restMinutes * 60000;
        toast('출입증을 모두 잃었어요. 잠시 쉬었다가 출입증 1장으로 다시 시작해요.', 3600);
      } else {
        toast(`${reason} 출입증 1장을 잃고 대기실로 돌아왔어요.`, 3000);
      }
      save();
      updateHud();
    }

    // ----- 그리기 + 움직이기 -----
    const RANGE = 175, HALF = 0.5;
    function cone(r, range) {
      const pts = [];
      const N = 18;
      for (let k = -N; k <= N; k++) {
        const a = r.dir + (HALF * k) / N;
        let d = 0;
        while (d < range && walkable(r.x + Math.cos(a) * (d + 6), r.y + Math.sin(a) * (d + 6))) d += 6;
        pts.push([r.x + Math.cos(a) * d, r.y + Math.sin(a) * d]);
      }
      return pts;
    }
    let saveTick = 0;
    function tick(now) {
      raf = requestAnimationFrame(tick);
      const dt = Math.max(0, Math.min(0.05, (now - lastT) / 1000));
      lastT = now;
      const nowMs = Date.now();
      // 시간
      const left = game.endAt - nowMs;
      $('#timer').textContent = fmt(left);
      $('#timer').classList.toggle('warn', left < 5 * 60000);
      if (left <= 0 && !game.outcome) { game.outcome = 'timeout'; save(); render(); return; }
      // 쉬는 중
      const rest = $('#rest');
      if (game.restUntil) {
        if (nowMs >= game.restUntil) { game.restUntil = null; game.lives = 1; save(); updateHud(); rest.hidden = true; toast('출입증 1장을 받았어요. 다시 출발!'); }
        else { rest.hidden = false; rest.innerHTML = `<div><b>잠시 쉬는 중</b><br>${fmt(game.restUntil - nowMs)} 뒤에 출입증 1장으로 다시 시작해요.<br><small>그동안 수첩을 다시 읽어 보세요.</small></div>`; }
      }
      const alert = nowMs < alertUntil;
      const speedMul = (cfg.speed || 1) * (alert ? 1.7 : 1);
      if (!paused && !game.restUntil) {
        // 플레이어
        let dx = 0, dy = 0;
        const k = keysDown;
        if (k.has('arrowleft') || k.has('a') || padDown.has('left')) dx -= 1;
        if (k.has('arrowright') || k.has('d') || padDown.has('right')) dx += 1;
        if (k.has('arrowup') || k.has('w') || padDown.has('up')) dy -= 1;
        if (k.has('arrowdown') || k.has('s') || padDown.has('down')) dy += 1;
        if (!dx && !dy && target) {
          const tx = target.x - game.pos.x, ty = target.y - game.pos.y, d = Math.hypot(tx, ty);
          if (d < 4) target = null; else { dx = tx / d; dy = ty / d; }
        }
        if (dx || dy) {
          const len = Math.hypot(dx, dy), sp = 170 * dt;
          const nx = game.pos.x + (dx / len) * sp, ny = game.pos.y + (dy / len) * sp;
          let moved = false;
          if (canStand(nx, game.pos.y)) { game.pos.x = nx; moved = true; }
          if (canStand(game.pos.x, ny)) { game.pos.y = ny; moved = true; }
          if (!moved && target) target = null;
        }
        // 로봇
        robots.forEach((r) => {
          r.t += dt;
          if (r.wait > 0) {
            r.wait -= dt * (alert ? 2 : 1);
            r.dir = r.scanBase + Math.sin(r.t * 2.2) * 1.1;
            return;
          }
          const p = r.path[r.i];
          const tx = p.x - r.x, ty = p.y - r.y, d = Math.hypot(tx, ty);
          const sp = 72 * speedMul * dt;
          if (d <= sp || d < 0.001) {
            r.x = p.x; r.y = p.y;
            if (p.wait) { r.wait = p.wait; r.scanBase = r.dir; r.t = 0; }
            r.i = (r.i + 1) % r.path.length;
          } else {
            r.x += (tx / d) * sp; r.y += (ty / d) * sp;
            const want = Math.atan2(ty, tx);
            r.dir += angDiff(want, r.dir) * Math.min(1, dt * 8);
          }
        });
        // 출동한 로봇: 그림자 밖에 있으면 학생 쪽으로, 숨으면 두리번거려요
        if (chaser) {
          if (nowMs > chaser.until) chaser = null;
          else if (!inShadow(game.pos.x, game.pos.y)) {
            const tx = game.pos.x - chaser.x, ty = game.pos.y - chaser.y, d = Math.hypot(tx, ty) || 1;
            const sp = 95 * (cfg.speed || 1) * dt;
            const nx = chaser.x + (tx / d) * sp, ny = chaser.y + (ty / d) * sp;
            if (walkable(nx, chaser.y)) chaser.x = nx;
            if (walkable(chaser.x, ny)) chaser.y = ny;
            chaser.dir += angDiff(Math.atan2(ty, tx), chaser.dir) * Math.min(1, dt * 8);
          } else chaser.dir += dt * 2;
        }
        // 상자 발견: 가까이 가면 수첩에 적혀요
        G.BOXES.forEach((b) => {
          const st = boxState(b.id);
          if (!st.found && Math.hypot(b.at.x - game.pos.x, b.at.y - game.pos.y) < 78) { st.found = true; game.lastFindAt = nowMs; save(); toast(`소품 상자를 찾았어요! (${b.name})`); }
        });
        // 들킴 판정
        if (nowMs > invulnUntil) {
          const range = RANGE * (alert ? 1.3 : 1);
          for (const r of (chaser ? robots.concat([chaser]) : robots)) {
            const d = Math.hypot(game.pos.x - r.x, game.pos.y - r.y);
            if (d < 30) { caught('로봇과 부딪혔어요!'); break; }
            if (d < range && !inShadow(game.pos.x, game.pos.y)) {
              const a = Math.atan2(game.pos.y - r.y, game.pos.x - r.x);
              if (Math.abs(angDiff(a, r.dir)) < HALF && clearLine(r.x, r.y, game.pos.x, game.pos.y)) { caught('탐조등에 비쳤어요!'); break; }
            }
          }
        }
        saveTick += dt;
        if (saveTick > 2) { saveTick = 0; save(); }
      }
      // 살펴보기 버튼
      const near = !paused && !game.restUntil ? nearest() : null;
      const act = $('#act');
      act.hidden = !near;
      if (near) act.textContent = near.kind === 'clue' ? '살펴보기' : near.kind === 'box' ? '상자 열기' : '보관실 문 살펴보기';

      // 그리기
      camera();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0d1528'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, camX * dpr, camY * dpr);
      ctx.drawImage(bg, 0, 0);
      const pulse = 0.5 + 0.5 * Math.sin(now / 300);
      // 단서 소품
      G.CLUES.forEach((c) => {
        const read = game.cluesRead.includes(c.id);
        if (!read) { ctx.fillStyle = `rgba(255,217,138,${0.25 + 0.25 * pulse})`; ctx.beginPath(); ctx.arc(c.at.x, c.at.y, 30, 0, 7); ctx.fill(); }
        ctx.drawImage(img(c.img), c.at.x - 22, c.at.y - 22, 44, 44);
      });
      // 상자: 가까이 가거나 찾은 뒤에만 보여요
      G.BOXES.forEach((b) => {
        const st = game.boxes[b.id];
        const d = Math.hypot(b.at.x - game.pos.x, b.at.y - game.pos.y);
        const show = (st && st.found) || d < 120;
        if (!show) return;
        ctx.globalAlpha = st && st.found ? 1 : Math.max(0.25, 1 - (d - 50) / 70);
        if (!(st && st.keyAt)) { ctx.fillStyle = `rgba(255,217,138,${0.2 + 0.3 * pulse})`; ctx.beginPath(); ctx.arc(b.at.x, b.at.y, 28, 0, 7); ctx.fill(); }
        ctx.drawImage(img(b.img), b.at.x - 24, b.at.y - 24, 48, 48);
        if (st && st.keyAt) { ctx.drawImage(img(b.key), b.at.x + 10, b.at.y - 30, 16, 30); }
        ctx.globalAlpha = 1;
      });
      // 보관실 문 반짝임 (열쇠 4개)
      if (keysCount() === G.BOXES.length) { ctx.strokeStyle = `rgba(255,217,138,${0.4 + 0.5 * pulse})`; ctx.lineWidth = 4; ctx.strokeRect(G.VAULT.at.x - 40, 516, 80, 48); }
      // 탐조등
      const watchers = chaser ? robots.concat([chaser]) : robots;
      watchers.forEach((r) => {
        const pts = cone(r, RANGE * (alert || r.chase ? 1.3 : 1));
        const grad = ctx.createRadialGradient(r.x, r.y, 10, r.x, r.y, RANGE * 1.3);
        const hot = alert || r.chase;
        grad.addColorStop(0, hot ? 'rgba(255,120,90,.55)' : 'rgba(255,225,120,.5)');
        grad.addColorStop(1, hot ? 'rgba(255,120,90,0)' : 'rgba(255,225,120,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill();
      });
      // 사람과 로봇 (아래쪽이 앞에 오도록)
      const ents = watchers.map((r) => ({ y: r.y, draw: () => ctx.drawImage(img('robot'), r.x - 26, r.y - 40, 52, 52) }));
      ents.push({ y: game.pos.y, draw: () => {
        const blink = nowMs < invulnUntil && Math.floor(now / 120) % 2;
        ctx.globalAlpha = blink ? 0.35 : inShadow(game.pos.x, game.pos.y) ? 0.6 : 1;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(game.pos.x, game.pos.y + 12, 14, 5, 0, 0, 7); ctx.fill();
        ctx.drawImage(img('av_' + game.avatar), game.pos.x - 21, game.pos.y - 50, 42, 63);
        ctx.globalAlpha = 1;
      } });
      ents.sort((a, b) => a.y - b.y).forEach((e) => e.draw());
      if (near) { ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(near.at.x, near.at.y, 32, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      if (target) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(target.x, target.y, 8, 0, 7); ctx.stroke(); }
      // 길 찾기 힌트를 2단계 넘게 보면 갈 곳을 가리키는 화살표
      const seek = seekTarget();
      if (seek && (game.findHints[seek.id] || 0) >= 2 && Math.hypot(seek.at.x - game.pos.x, seek.at.y - game.pos.y) > 90) {
        const a = Math.atan2(seek.at.y - game.pos.y, seek.at.x - game.pos.x);
        ctx.save(); ctx.translate(game.pos.x + Math.cos(a) * 48, game.pos.y - 18 + Math.sin(a) * 48); ctx.rotate(a);
        ctx.fillStyle = `rgba(255,217,138,${0.6 + 0.4 * pulse})`; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      // 지금 있는 곳
      const room = G.ROOMS.find((r) => inRect(game.pos.x, game.pos.y, r));
      const roomText = (room ? room.name : '복도') + (inShadow(game.pos.x, game.pos.y) ? ' · 그림자 속에 숨었어요' : '');
      if ($('#room').textContent !== roomText) $('#room').textContent = roomText;
      const stuck = seek && nowMs - (game.lastFindAt || game.startedAt) > 3 * 60000 && (game.findHints[seek.id] || 0) < 2;
      $('#note').classList.toggle('pulse', !!stuck);
    }
    raf = requestAnimationFrame(tick);
    stopLoop = () => {
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onKeyUp);
      removeEventListener('resize', fit);
      save();
    };
  }

  // ---------- 퀴즈 4종 ----------
  const PUZZLES = {
    choice(el, step, seed, done) {
      const order = shuffleIdx(step.options.length, seed);
      el.innerHTML = `<div class="choices">${order.map((oi, k) => `<button class="choice" data-i="${oi}"><span class="cno">${'①②③④⑤⑥'[k]}</span><span>${T(step.options[oi])}</span></button>`).join('')}</div>`;
      $$('.choice', el).forEach((b) => (b.onclick = (e) => {
        if (e.target.closest('.gl')) return;
        const ok = Number(b.dataset.i) === step.answer;
        b.classList.add(ok ? 'right' : 'wrong');
        if (!ok) b.disabled = true;
        done(ok);
      }));
    },
    match(el, step, seed, done) {
      const rorder = shuffleIdx(step.right.length, seed);
      const pairs = {};
      let sel = null;
      const draw = (bad) => {
        el.innerHTML = `<p class="tiny">왼쪽을 누른 뒤, 짝이 되는 오른쪽을 누르세요.</p><div class="match">
          <div class="mcol">${step.left.map((l, i) => `<button class="mi ${sel === i ? 'sel' : ''} ${pairs[i] !== undefined ? 'paired' : ''} ${bad && bad.includes(i) ? 'wrong' : ''}" data-l="${i}"><span class="tag">${i + 1}</span>${T(l)}</button>`).join('')}</div>
          <div class="mcol">${rorder.map((ri) => { const li = Object.keys(pairs).find((k) => pairs[k] === ri); return `<button class="mi ${li !== undefined ? 'paired' : ''}" data-r="${ri}">${li !== undefined ? `<span class="tag">${Number(li) + 1}</span>` : '<span class="tag empty"></span>'}${T(step.right[ri])}</button>`; }).join('')}</div>
        </div><button class="btn" id="chk" ${Object.keys(pairs).length < step.left.length ? 'disabled' : ''}>확인</button>`;
        $$('[data-l]', el).forEach((b) => (b.onclick = () => { sel = Number(b.dataset.l); draw(); }));
        $$('[data-r]', el).forEach((b) => (b.onclick = () => {
          if (sel === null) return;
          const ri = Number(b.dataset.r);
          Object.keys(pairs).forEach((k) => { if (pairs[k] === ri) delete pairs[k]; });
          pairs[sel] = ri;
          const nx = step.left.findIndex((_, i) => pairs[i] === undefined);
          sel = nx === -1 ? null : nx;
          draw();
        }));
        $('#chk', el).onclick = () => {
          const wrong = step.left.map((_, i) => i).filter((i) => pairs[i] !== step.answer[i]);
          if (wrong.length) { draw(wrong); done(false); } else done(true);
        };
      };
      sel = 0;
      draw();
    },
    order(el, step, seed, done) {
      const pool = shuffleIdx(step.items.length, seed);
      const picked = [];
      const draw = (bad) => {
        el.innerHTML = `<p class="tiny">먼저 일어난 것부터 차례로 누르세요. 놓은 것을 다시 누르면 빠져요.</p>
          <ol class="seq">${step.items.map((_, k) => `<li class="slot ${bad && bad.includes(k) ? 'wrong' : ''}">${picked[k] !== undefined ? `<button data-out="${k}">${T(step.items[picked[k]])}</button>` : '<span class="ph">　</span>'}</li>`).join('')}</ol>
          <div class="pool">${pool.filter((i) => !picked.includes(i)).map((i) => `<button class="chip" data-in="${i}">${T(step.items[i])}</button>`).join('')}</div>
          <button class="btn" id="chk" ${picked.length < step.items.length ? 'disabled' : ''}>확인</button>`;
        $$('[data-in]', el).forEach((b) => (b.onclick = () => { picked.push(Number(b.dataset.in)); draw(); }));
        $$('[data-out]', el).forEach((b) => (b.onclick = () => { picked.splice(Number(b.dataset.out), 1); draw(); }));
        $('#chk', el).onclick = () => {
          const wrong = picked.map((v, k) => (v === k ? -1 : k)).filter((k) => k >= 0);
          if (wrong.length) { draw(wrong); done(false); } else done(true);
        };
      };
      draw();
    },
    classify(el, step, seed, done) {
      const order = shuffleIdx(step.items.length, seed);
      const put = {};
      const draw = (bad) => {
        el.innerHTML = `<p class="tiny">각 문장 아래에서 알맞은 무리를 누르세요.</p>
          <div class="cls">${order.map((i) => `<div class="citem ${bad && bad.includes(i) ? 'wrong' : ''} ${put[i] !== undefined ? 'set' : ''}"><div class="ctext">${T(step.items[i].text)}</div>
            <div class="bins">${step.bins.map((bn, bi) => `<button class="bin ${put[i] === bi ? 'on' : ''}" data-i="${i}" data-b="${bi}">${esc(bn)}</button>`).join('')}</div></div>`).join('')}</div>
          <button class="btn" id="chk" ${Object.keys(put).length < step.items.length ? 'disabled' : ''}>확인</button>`;
        $$('.bin', el).forEach((b) => (b.onclick = () => { put[b.dataset.i] = Number(b.dataset.b); draw(); }));
        $('#chk', el).onclick = () => {
          const wrong = step.items.map((it, i) => (put[i] === it.bin ? -1 : i)).filter((i) => i >= 0);
          if (wrong.length) { draw(wrong); done(false); } else done(true);
        };
      };
      draw();
    },
  };

  // ---------- 끝 화면 ----------
  function endScreen() {
    const won = game.outcome === 'escaped';
    const used = (won ? game.escapedAt : game.endAt) - game.startedAt;
    app.innerHTML = `<div class="end" style="background-image:url(${art(won ? 'ending' : 'entry_bg')})"><div class="end-card">
      <h1>${won ? '마지막 장면이 완성되었어요!' : '세트장의 불이 꺼졌어요'}</h1>
      ${idCard(`<div class="stamp ${won ? 'ok' : 'no'}">${won ? '촬영 완료' : '시간 초과'}</div>`)}
      <table class="stats"><tbody>
        <tr><th>걸린 시간</th><td>${fmt(used)}</td></tr>
        <tr><th>모은 열쇠</th><td>${keysCount()} / ${G.BOXES.length}</td></tr>
        <tr><th>로봇에게 들킨 횟수</th><td>${game.caught}번</td></tr>
      </tbody></table>
      ${won ? `<p class="muted">마지막 장면에 들어간 나의 자막</p><blockquote class="my">“${esc(game.vault.sentence)}”</blockquote>` : '<p>선생님께 시간을 더 받으면 이어서 할 수 있어요.</p><button class="btn" id="more">선생님 PIN으로 5분 더 받기</button>'}
      <details class="records"><summary>감독님의 촬영 노트 다시 읽기</summary>
        ${G.BOXES.filter((b) => game.boxes[b.id] && game.boxes[b.id].keyAt).map((b) => `<p><b>${b.no}. ${esc(b.keyWord)}</b> — ${T(b.record)}</p>`).join('') || '<p class="muted">아직 얻은 기록이 없어요.</p>'}
      </details>
      <button class="btn ghost" id="again">처음부터 다시</button>
    </div></div>`;
    twoStep($('#again'), '한 번 더 누르면 기록을 지우고 처음부터 해요', () => { game = emptyGame(); save(); render(); });
    const more = $('#more');
    if (more) more.onclick = () => pinPrompt('5분을 더 주려면 교사 PIN을 넣어 주세요.', () => {
      game.endAt = Date.now() + 5 * 60000;
      game.addedMinutes += 5;
      game.outcome = null;
      save();
      render();
    });
  }

  // 실수로 누르지 않도록 두 번 눌러야 실행되는 버튼
  function twoStep(btn, armedText, action) {
    const orig = btn.textContent;
    let timer = null;
    btn.onclick = () => {
      if (btn.dataset.armed) { clearTimeout(timer); delete btn.dataset.armed; btn.textContent = orig; action(); return; }
      btn.dataset.armed = '1';
      btn.textContent = armedText;
      timer = setTimeout(() => { delete btn.dataset.armed; btn.textContent = orig; }, 4000);
    };
  }

  function pinPrompt(msg, onOk, onCancel) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-layer';
    wrap.innerHTML = `<form class="modal pin"><h3>교사 확인</h3><p>${esc(msg)}</p><input type="password" inputmode="numeric" id="pin" autocomplete="off"><p class="msg" id="pmsg"></p><div class="row center"><button type="button" class="btn ghost" id="pc">취소</button><button class="btn">확인</button></div></form>`;
    document.body.appendChild(wrap);
    $('#pin', wrap).focus();
    $('#pc', wrap).onclick = () => { wrap.remove(); if (onCancel) onCancel(); };
    $('form', wrap).onsubmit = (e) => {
      e.preventDefault();
      if ($('#pin', wrap).value === String(settings.pin)) { wrap.remove(); onOk(); }
      else $('#pmsg', wrap).textContent = 'PIN이 맞지 않아요.';
    };
  }

  // ---------- 교사 화면 ----------
  let teacherOk = false;
  function teacherScreen() {
    if (!teacherOk) {
      app.innerHTML = '<div class="teacher"></div>';
      pinPrompt(`교사 화면을 열려면 PIN을 넣어 주세요. (처음 PIN은 ${S.teacherPin}이에요. 열고 나서 바꿔 주세요.)`, () => { teacherOk = true; teacherScreen(); }, () => { location.hash = '#play'; });
      return;
    }
    const answerText = (s) => {
      if (s.type === 'choice') return `정답: ${plain(s.options[s.answer])}`;
      if (s.type === 'match') return `정답: ${s.left.map((l, i) => `${plain(l)} → ${plain(s.right[s.answer[i]])}`).join(' / ')}`;
      if (s.type === 'order') return `정답 순서: ${s.items.map(plain).join(' → ')}`;
      return `정답: ${s.bins.map((bn, bi) => `[${bn}] ${s.items.filter((it) => it.bin === bi).map((it) => plain(it.text)).join(', ')}`).join(' / ')}`;
    };
    const base = location.href.split('#')[0];
    const link = () => `${base}#/?m=${settings.minutes}&r=${settings.robots}&s=${settings.speed}`;
    app.innerHTML = `<div class="teacher"><div class="t-wrap">
      <div class="row between"><h1>교사 화면 · ${esc(S.title)}</h1><a class="btn ghost small" href="#play">학생 화면으로</a></div>
      <section class="t-sec"><h2>수업 설정</h2>
        <div class="t-form">
          <label>제한 시간(분)<input type="number" id="m" min="5" max="120" value="${settings.minutes}"></label>
          <label>경비 로봇 수<select id="r">${[0, 1, 2, 3].map((n) => `<option ${n === Number(settings.robots) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>로봇 빠르기<select id="s">${[[0.7, '느림'], [1, '보통'], [1.3, '빠름']].map(([v, n]) => `<option value="${v}" ${v === Number(settings.speed) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>교사 PIN<input id="pin" value="${esc(settings.pin)}" maxlength="8"></label>
          <button class="btn" id="saveSet">저장</button><span class="muted" id="saved"></span>
        </div>
        <p class="tiny">설정은 이 기기에 저장돼요. 학생 기기에는 아래 주소(또는 QR)로 같은 설정이 전달돼요. 학생 이름이나 학번은 어디에도 저장하지 않아요.</p>
        <div class="linkbox"><input id="link" readonly value="${esc(link())}"><button class="btn small" id="copy">주소 복사</button></div>
        <div id="qr" class="qr"></div>
      </section>
      <section class="t-sec"><h2>성취 기준과 수업 흐름</h2><ul>${G.STANDARDS.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        ${G.FLOW ? `<h3>45분 수업 흐름</h3><ol class="flow">${G.FLOW.map((f) => `<li><b>${esc(f.step)} ${f.min}분</b> ${esc(f.text)}</li>`).join('')}</ol>` : ''}
        ${G.DISCUSS ? `<h3>정리 토의 질문</h3><ul>${G.DISCUSS.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
        <p class="tiny">상자 1~4는 순서 없이 열 수 있어요. 끝 화면의 '나의 한 문장'을 모둠별로 나누며 마무리하면 좋아요.</p></section>
      <section class="t-sec"><h2>미리 보기와 정답</h2>
        ${G.BOXES.map((b) => `<details class="t-box"><summary><b>${b.no}. ${esc(b.theme)}</b> · ${esc(b.room)} · 자물쇠 <code>${b.code}</code> · 열쇠 낱말 <b>${esc(b.keyWord)}</b></summary>
          <p class="tiny">${esc(b.lockNote)}</p>
          ${b.quizzes.map((q) => `<div class="t-q"><b>${esc(q.title)}</b> <span class="tiny">(자료 ${q.combine.join(', ')})</span><ol>${q.steps.map((s) => `<li>${esc(plain(s.q))}<br><span class="answer">${esc(answerText(s))}</span></li>`).join('')}</ol></div>`).join('')}
          <details><summary>자료 카드 ${b.cards.length}장</summary>${b.cards.map((c) => `<p><b>${c.id}. ${esc(c.title)}</b> ${esc(plain(c.body))}</p>`).join('')}</details>
        </details>`).join('')}
        <details class="t-box"><summary><b>필름 보관실 문</b> · 번호 <code>${G.VAULT.code}</code></summary><p>${esc(G.VAULT.conclusion.join(' ').replace(/\{(\d)\}/g, (m, n) => `[${G.BOXES[n].keyWord}]`))}</p><p class="tiny">${esc(G.VAULT.ask)}</p></details>
      </section>
      <section class="t-sec"><h2>이 기기 기록</h2><button class="btn ghost" id="wipe">이 기기의 게임 기록 지우기</button></section>
    </div></div>`;
    const drawQr = () => {
      const box = $('#qr');
      box.innerHTML = '';
      if (window.QRCode) { try { new window.QRCode(box, { text: link(), width: 180, height: 180 }); } catch (e) { /* QR 생략 */ } }
    };
    drawQr();
    $('#saveSet').onclick = () => {
      settings.minutes = clampNum($('#m').value, 5, 120, S.minutes);
      settings.robots = Number($('#r').value);
      settings.speed = Number($('#s').value);
      settings.pin = $('#pin').value.trim() || S.teacherPin;
      saveSettings();
      $('#link').value = link();
      drawQr();
      $('#saved').textContent = '저장했어요';
      setTimeout(() => ($('#saved').textContent = ''), 1500);
    };
    $('#copy').onclick = () => { $('#link').select(); try { navigator.clipboard.writeText($('#link').value); } catch (e) { document.execCommand('copy'); } toast('주소를 복사했어요.'); };
    twoStep($('#wipe'), '한 번 더 누르면 지워요', () => { game = emptyGame(); save(); toast('기록을 지웠어요.'); });
  }

  render();
})();

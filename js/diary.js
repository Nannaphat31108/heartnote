// ===== สมุดไดอารี่: เลือกสีปก ลายกระดาษ ตัวอักษร และแปะสติกเกอร์ =====

export const COVERS = [
  { id: "peach", name: "พีช", c: "#F3A487", d: "#D9785A" },
  { id: "rose", name: "ชมพู", c: "#EE95A4", d: "#CF6A7D" },
  { id: "honey", name: "น้ำผึ้ง", c: "#F1BF55", d: "#C9922B" },
  { id: "sage", name: "เขียวเสจ", c: "#9DBF8C", d: "#6F9560" },
  { id: "mint", name: "มินต์", c: "#86CDB8", d: "#4FA08A" },
  { id: "sky", name: "ฟ้า", c: "#8DB8E4", d: "#5B8CC0" },
  { id: "lilac", name: "ม่วงไลแลค", c: "#B9A2DE", d: "#8C72BE" },
  { id: "navy", name: "กรมท่า", c: "#40557E", d: "#2B3A5A" },
  { id: "forest", name: "เขียวป่า", c: "#3F6B5C", d: "#294A3F" },
  { id: "ink", name: "ดำหมึก", c: "#3A3433", d: "#221E1D" }
];

export const PAPERS = [
  { id: "lined", name: "เส้นบรรทัด" },
  { id: "grid", name: "ตาราง" },
  { id: "dots", name: "จุด" },
  { id: "plain", name: "เรียบ" },
  { id: "kraft", name: "คราฟต์" },
  { id: "night", name: "กลางคืน" }
];

export const FONTS = [
  { id: "itim", name: "ลายมือ", css: "'Itim', 'Sarabun', sans-serif" },
  { id: "mali", name: "กลมมน", css: "'Mali', 'Sarabun', sans-serif" },
  { id: "sarabun", name: "เรียบร้อย", css: "'Sarabun', sans-serif" }
];

export const STICKERS = {
  cute: { name: "น่ารัก", items: ["🌷", "🌸", "🌼", "🍓", "🍑", "🧸", "🐱", "🐶", "🐰", "🐻", "🐣", "🍰", "🧁", "🌈", "☁️", "💖", "🍀", "🎀"] },
  cool: { name: "เท่ ๆ", items: ["⚡", "🔥", "🚀", "🎧", "🎮", "🏀", "⚽", "🎸", "🦖", "😎", "🌙", "🪐", "🛹", "🏆", "💪", "🌊", "🎯", "🧠"] },
  text: {
    name: "ข้อความ",
    items: [
      { t: "สู้ ๆ นะ", bg: "#FFD6C9", fg: "#B4482A" },
      { t: "เก่งมาก!", bg: "#FFE7A8", fg: "#8A5A00" },
      { t: "วันนี้ดีจัง", bg: "#FFD3DD", fg: "#A63655" },
      { t: "พักก่อนนะ", bg: "#D9EED0", fg: "#3E6A31" },
      { t: "ภูมิใจในตัวเอง", bg: "#E3DAF6", fg: "#5A4392" },
      { t: "GOOD VIBES", bg: "#CFE6F7", fg: "#245B87" },
      { t: "LEVEL UP", bg: "#2F3A55", fg: "#FFD66B" },
      { t: "CHILL", bg: "#3A3433", fg: "#9EE6C9" },
      { t: "I GOT THIS", bg: "#F26B4F", fg: "#FFFFFF" },
      { t: "OK!", bg: "#FFFFFF", fg: "#3A3433" }
    ]
  },
  tape: { name: "เทปกาว", items: ["stripe", "dots", "check", "kraft", "mint", "night"] }
};

const MAX_STICKERS = 20;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v) => Math.round(v * 10) / 10;

export const coverOf = (id) => COVERS.find((c) => c.id === id) || COVERS[0];
const paperOf = (id) => (PAPERS.find((p) => p.id === id) || PAPERS[0]).id;
const fontOf = (id) => FONTS.find((f) => f.id === id) || FONTS[0];

export function normStyle(s) {
  s = s || {};
  return { cover: coverOf(s.cover).id, paper: paperOf(s.paper), font: fontOf(s.font).id };
}

// สติกเกอร์ 1 ชิ้น: { k: "e"|"t"|"w", v: ค่า, x, y (เปอร์เซ็นต์), r (องศา), s (ขนาด) }
export function normStickers(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, MAX_STICKERS).filter((o) => o && ["e", "t", "w"].includes(o.k)).map((o) => ({
    k: o.k,
    v: o.k === "t" ? Number(o.v) || 0 : String(o.v).slice(0, 16),
    x: clamp(Number(o.x) || 50, 0, 100),
    y: clamp(Number(o.y) || 50, 0, 100),
    r: clamp(Number(o.r) || 0, -180, 180),
    s: clamp(Number(o.s) || 1, 0.5, 2.5)
  }));
}

function stickerInner(o) {
  if (o.k === "e") return `<span class="stk-emoji">${esc(o.v)}</span>`;
  if (o.k === "t") {
    const t = STICKERS.text.items[o.v] || STICKERS.text.items[0];
    return `<span class="stk-text" style="--bg:${t.bg};--fg:${t.fg}">${esc(t.t)}</span>`;
  }
  return `<span class="stk-tape tape-${esc(o.v)}"></span>`;
}

function stickerHTML(o, i) {
  return `<div class="stk" data-i="${i}" style="left:${o.x}%;top:${o.y}%;--r:${o.r}deg;--s:${o.s}">${stickerInner(o)}</div>`;
}

function pageClasses(style) {
  return `diary-page paper-${style.paper} font-${style.font}`;
}

function diaryVars(style) {
  const c = coverOf(style.cover);
  return `--cover:${c.c};--cover-d:${c.d};--dfont:${fontOf(style.font).css}`;
}

const thaiDate = (d) => new Date(d || Date.now()).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "short", year: "2-digit" });

/** หน้าไดอารี่แบบอ่านอย่างเดียว (ใช้ในหน้าบันทึก) */
export function diaryStaticHTML({ style, stickers, title, text, date, label }) {
  style = normStyle(style);
  return `
    <div class="diary readonly" style="${diaryVars(style)}">
      <div class="${pageClasses(style)}">
        <div class="dp-head">
          <span class="dp-date">${esc(thaiDate(date))}</span>
          ${label ? `<span class="dp-label">${esc(label)}</span>` : ""}
          <p class="dp-title">${esc(title)}</p>
        </div>
        <div class="dp-text dp-static">${esc(text)}</div>
        <div class="stk-layer">${normStickers(stickers).map(stickerHTML).join("")}</div>
      </div>
    </div>`;
}

/**
 * สมุดไดอารี่แบบเขียนได้
 * opts: { title, label, text, placeholder, style, stickers, onChange({text, style, stickers}) }
 */
export function mountDiary(root, opts) {
  let style = normStyle(opts.style);
  let stickers = normStickers(opts.stickers);
  let text = opts.text || "";
  let selected = -1;
  let panel = null;

  root.innerHTML = `
    <div class="diary-tools" role="toolbar" aria-label="ตกแต่งสมุด">
      <button type="button" class="dtool" data-panel="cover"><span class="dt-swatch"></span>สีปก</button>
      <button type="button" class="dtool" data-panel="paper"><span class="dt-ico">📄</span>ลายกระดาษ</button>
      <button type="button" class="dtool" data-panel="font"><span class="dt-ico">✏️</span>ตัวอักษร</button>
      <button type="button" class="dtool dtool-hot" data-panel="sticker"><span class="dt-ico">🌟</span>สติกเกอร์</button>
    </div>
    <div class="diary-panel" hidden></div>
    <div class="diary">
      <div class="${pageClasses(style)}">
        <div class="dp-head">
          <span class="dp-date">${esc(thaiDate())}</span>
          ${opts.label ? `<span class="dp-label">${esc(opts.label)}</span>` : ""}
          <p class="dp-title">${esc(opts.title)}</p>
        </div>
        <textarea class="dp-text" rows="5" placeholder="${esc(opts.placeholder || "เขียนลงสมุดได้เลย…")}" aria-label="${esc(opts.title)}"></textarea>
        <div class="stk-layer"></div>
      </div>
    </div>
    <p class="diary-hint">แตะสติกเกอร์เพื่อหมุน ย่อ/ขยาย หรือลบ · ลากเพื่อย้ายตำแหน่ง</p>`;

  const $diary = root.querySelector(".diary");
  const $page = root.querySelector(".diary-page");
  const $ta = root.querySelector(".dp-text");
  const $layer = root.querySelector(".stk-layer");
  const $panel = root.querySelector(".diary-panel");
  $ta.value = text;

  const emit = () => opts.onChange && opts.onChange({ text, style: { ...style }, stickers: stickers.map((o) => ({ ...o })) });

  function applyStyle() {
    $diary.setAttribute("style", diaryVars(style));
    $page.className = pageClasses(style);
    root.querySelector(".dt-swatch").style.background = coverOf(style.cover).c;
    if (panel) renderPanel(panel);
  }

  function autoGrow() {
    $ta.style.height = "auto";
    $ta.style.height = Math.max($ta.scrollHeight, 170) + "px";
  }

  function renderStickers() {
    $layer.innerHTML = stickers.map(stickerHTML).join("") + (selected >= 0 && stickers[selected] ? `
      <div class="stk-ctrl${stickers[selected].y < 35 ? " below" : ""}" style="left:clamp(94px, ${stickers[selected].x}%, calc(100% - 94px));top:${stickers[selected].y}%">
        <button type="button" data-act="rl" aria-label="หมุนซ้าย">↺</button>
        <button type="button" data-act="rr" aria-label="หมุนขวา">↻</button>
        <button type="button" data-act="sm" aria-label="ย่อ">−</button>
        <button type="button" data-act="lg" aria-label="ขยาย">+</button>
        <button type="button" data-act="del" aria-label="ลบสติกเกอร์" class="del">✕</button>
      </div>` : "");
    $layer.querySelectorAll(".stk").forEach((el) => el.classList.toggle("sel", Number(el.dataset.i) === selected));
  }

  function renderPanel(name) {
    let html = "";
    if (name === "cover") {
      html = `<div class="swatches">${COVERS.map((c) => `
        <button type="button" class="swatch${style.cover === c.id ? " on" : ""}" data-cover="${c.id}" style="--sw:${c.c};--sw-d:${c.d}" aria-label="${c.name}" title="${c.name}"></button>`).join("")}</div>`;
    } else if (name === "paper") {
      html = `<div class="papers">${PAPERS.map((p) => `
        <button type="button" class="paper-opt${style.paper === p.id ? " on" : ""}" data-paper="${p.id}">
          <span class="paper-prev paper-${p.id}"></span><small>${p.name}</small></button>`).join("")}</div>`;
    } else if (name === "font") {
      html = `<div class="fonts">${FONTS.map((f) => `
        <button type="button" class="font-opt${style.font === f.id ? " on" : ""}" data-font="${f.id}" style="font-family:${f.css}">
          <b>ก ข ค Aa</b><small>${f.name}</small></button>`).join("")}</div>`;
    } else if (name === "sticker") {
      const tab = renderPanel.tab || "cute";
      const group = STICKERS[tab];
      const items = group.items.map((it, i) => {
        const o = tab === "text" ? { k: "t", v: i } : tab === "tape" ? { k: "w", v: it } : { k: "e", v: it };
        return `<button type="button" class="stk-pick stk-pick-${o.k}" data-k="${o.k}" data-v="${esc(o.v)}">${stickerInner(o)}</button>`;
      }).join("");
      html = `
        <div class="stk-tabs">${Object.entries(STICKERS).map(([k, g]) => `
          <button type="button" class="stk-tab${k === tab ? " on" : ""}" data-tab="${k}">${g.name}</button>`).join("")}</div>
        <div class="stk-grid">${items}</div>
        <p class="stk-count">${stickers.length} / ${MAX_STICKERS} ชิ้น</p>`;
    }
    $panel.innerHTML = html;
  }

  function togglePanel(name) {
    panel = panel === name ? null : name;
    $panel.hidden = !panel;
    root.querySelectorAll(".dtool").forEach((b) => b.classList.toggle("on", b.dataset.panel === panel));
    if (panel) renderPanel(panel);
  }

  root.querySelector(".diary-tools").addEventListener("click", (e) => {
    const b = e.target.closest(".dtool");
    if (b) togglePanel(b.dataset.panel);
  });

  $panel.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.cover) { style.cover = t.dataset.cover; applyStyle(); emit(); }
    else if (t.dataset.paper) { style.paper = t.dataset.paper; applyStyle(); emit(); }
    else if (t.dataset.font) { style.font = t.dataset.font; applyStyle(); autoGrow(); emit(); }
    else if (t.dataset.tab) { renderPanel.tab = t.dataset.tab; renderPanel("sticker"); }
    else if (t.dataset.k) {
      if (stickers.length >= MAX_STICKERS) return;
      const k = t.dataset.k;
      stickers.push({
        k, v: k === "t" ? Number(t.dataset.v) : t.dataset.v,
        x: round(15 + Math.random() * 70), y: round(18 + Math.random() * 64),
        r: k === "w" ? Math.round(Math.random() * 30 - 15) : Math.round(Math.random() * 24 - 12), s: 1
      });
      selected = stickers.length - 1;
      renderStickers();
      renderPanel("sticker");
      const el = $layer.querySelector(`.stk[data-i="${selected}"]`);
      if (el) { el.classList.add("pop"); }
      emit();
    }
  });

  // ลาก / เลือกสติกเกอร์
  let drag = null;
  $layer.addEventListener("pointerdown", (e) => {
    const ctrl = e.target.closest(".stk-ctrl button");
    if (ctrl) return;
    const el = e.target.closest(".stk");
    if (!el) return;
    e.preventDefault();
    const i = Number(el.dataset.i);
    const rect = $page.getBoundingClientRect();
    drag = { i, el, rect, sx: e.clientX, sy: e.clientY, ox: stickers[i].x, oy: stickers[i].y, moved: false };
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
  });
  $layer.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const o = stickers[drag.i];
    o.x = round(clamp(drag.ox + (dx / drag.rect.width) * 100, 0, 100));
    o.y = round(clamp(drag.oy + (dy / drag.rect.height) * 100, 0, 100));
    drag.el.style.left = o.x + "%";
    drag.el.style.top = o.y + "%";
    const ctrl = $layer.querySelector(".stk-ctrl");
    if (ctrl) ctrl.remove();
  });
  const endDrag = () => {
    if (!drag) return;
    const { i, moved } = drag;
    drag.el.classList.remove("dragging");
    drag = null;
    selected = moved ? i : (selected === i ? -1 : i);
    renderStickers();
    if (moved) emit();
  };
  $layer.addEventListener("pointerup", endDrag);
  $layer.addEventListener("pointercancel", endDrag);

  $layer.addEventListener("click", (e) => {
    const b = e.target.closest(".stk-ctrl button");
    if (!b || selected < 0) return;
    const o = stickers[selected];
    const act = b.dataset.act;
    if (act === "rl") o.r = clamp(o.r - 15, -180, 180);
    if (act === "rr") o.r = clamp(o.r + 15, -180, 180);
    if (act === "sm") o.s = round(clamp(o.s - 0.2, 0.5, 2.5));
    if (act === "lg") o.s = round(clamp(o.s + 0.2, 0.5, 2.5));
    if (act === "del") { stickers.splice(selected, 1); selected = -1; if (panel === "sticker") renderPanel("sticker"); }
    renderStickers();
    emit();
  });

  // แตะที่อื่นเพื่อยกเลิกการเลือก
  const outside = (e) => {
    if (!root.isConnected) { document.removeEventListener("pointerdown", outside); return; }
    if (selected >= 0 && !e.target.closest(".stk, .stk-ctrl")) { selected = -1; renderStickers(); }
  };
  document.addEventListener("pointerdown", outside);

  $ta.addEventListener("input", () => { text = $ta.value; autoGrow(); emit(); });

  applyStyle();
  renderStickers();
  requestAnimationFrame(autoGrow);

  return {
    focus: () => $ta.focus(),
    get text() { return text; },
    get style() { return { ...style }; },
    get stickers() { return stickers.map((o) => ({ ...o })); }
  };
}

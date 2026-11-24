import { createDB } from "./db.js";

(async () => {
  "use strict";

  const CATS = window.CATEGORIES;
  const BLESS = window.BLESSINGS;
  const MOODS = window.MOODS;
  const TOTAL_SESSIONS = 40; // 8 สัปดาห์ x 5 ครั้ง
  const WEEKS = 8;
  const PER_WEEK = 5;
  const DECK_SIZE = 7;

  const $app = document.getElementById("app");
  const $topbar = document.getElementById("topbar");
  const $toast = document.getElementById("toast");

  /* ---------------- state ---------------- */
  let DB = null;       // ชั้นฐานข้อมูล (Firebase หรือ localStorage)
  let me = null;       // ผู้ใช้ที่ล็อกอินอยู่ {uid, name, email, isAdmin}
  let data = null;     // ข้อมูลของผู้ใช้ {used, entries} (แคชไว้ในหน่วยความจำ)
  let authReady = false;

  /* ---------------- helpers ---------------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const catById = (id) => CATS.find((c) => c.id === id);

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $toast.classList.remove("show"), 2600);
  }

  const fmtDate = (iso) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  /* ---------------- icons ---------------- */
  const ICON = {
    heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4c-9 0-15 4.5-15 11 0 1.6.4 3 1 4.2C7.5 15 10.5 12 15 10c-4 2.6-6.6 5.8-8 9.6.9.3 1.9.4 3 .4 6.5 0 10-6 10-16z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="8" y="3.5" width="11" height="15" rx="2.2" transform="rotate(10 13.5 11)"/><rect x="4" y="5" width="11" height="15" rx="2.2" fill="var(--paper)"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.5c2.5 0 3.7 1.4 5.1 4.2l.8 1.6C13.8 15.6 15 17 17.5 17H21M3 17h3.5c1.6 0 2.7-.6 3.6-1.8M14.4 8.8C15.3 7.6 16.4 7 18 7h3M18 4l3 3-3 3M18 14l3 3-3 3"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h9l4 4V20a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 20z"/><path d="M14.5 3.5V8h4.5M9 12h7M9 15.5h5"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 4.6 2.4 6.9 7 8-4.6 1.1-6.4 3.4-7 8-.6-4.6-2.4-6.9-7-8 4.6-1.1 6.4-3.4 7-8z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5"/></svg>'
  };

  // ลายหลังการ์ด (ฟีลไพ่ทาโร่ต์โทนอบอุ่น)
  function cardBackSVG(cat) {
    const c = cat ? cat.color : "#F28C6B";
    const icon = cat ? cat.icon : "heart";
    const rays = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      const x1 = 60 + Math.cos(a) * 24, y1 = 90 + Math.sin(a) * 24;
      const x2 = 60 + Math.cos(a) * (i % 2 ? 33 : 40), y2 = 90 + Math.sin(a) * (i % 2 ? 33 : 40);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }).join("");
    const centre = {
      heart: '<path d="M60 101s-12-7.3-12-15.4c0-4 3-6.9 6.6-6.9 2.5 0 4.3 1.3 5.4 3 1.1-1.7 2.9-3 5.4-3 3.6 0 6.6 2.9 6.6 6.9C72 93.7 60 101 60 101z" fill="#FFF7EE"/>',
      sun: '<circle cx="60" cy="90" r="9" fill="#FFF7EE"/>',
      leaf: '<path d="M70 79c-12 0-18 6-18 13 0 1.6.4 3 1 4.2 1.7-3.6 4.6-6.4 9-8.4-3.8 2.5-6.3 5.5-7.6 9.2.8.3 1.7.4 2.6.4 7 0 13-6 13-18.4z" fill="#FFF7EE"/>',
      star: '<path d="M60 78l3.4 7 7.6 1.1-5.5 5.4 1.3 7.6L60 95.5l-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" fill="#FFF7EE"/>'
    }[icon];
    return `
    <svg viewBox="0 0 120 180" class="cb-svg" aria-hidden="true">
      <defs>
        <linearGradient id="g-${icon}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c}"/>
          <stop offset="1" stop-color="${cat ? cat.deep : "#D9684A"}"/>
        </linearGradient>
        <pattern id="p-${icon}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="6" cy="6" r="1" fill="#FFF7EE" opacity=".22"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#g-${icon})"/>
      <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#p-${icon})"/>
      <rect x="7" y="7" width="106" height="166" rx="8" fill="none" stroke="#F8D9A0" stroke-width="1.6"/>
      <rect x="11" y="11" width="98" height="158" rx="6" fill="none" stroke="#FFF7EE" stroke-opacity=".5" stroke-width=".8" stroke-dasharray="2 3"/>
      <circle cx="60" cy="90" r="22" fill="none" stroke="#F8D9A0" stroke-width="1.4"/>
      <g stroke="#F8D9A0" stroke-width="1.4" stroke-linecap="round">${rays}</g>
      ${centre}
      <g fill="#FFF7EE" opacity=".9">
        <path d="M60 24l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z"/>
        <path d="M60 145l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z"/>
        <circle cx="22" cy="22" r="1.6"/><circle cx="98" cy="22" r="1.6"/>
        <circle cx="22" cy="158" r="1.6"/><circle cx="98" cy="158" r="1.6"/>
        <circle cx="34" cy="50" r="1"/><circle cx="88" cy="132" r="1"/><circle cx="90" cy="54" r="1.2"/><circle cx="30" cy="128" r="1.2"/>
      </g>
    </svg>`;
  }

  // ภาพประกอบหน้าแรก: มือถือการ์ดหลายใบ + ประกาย
  const heroArt = () => `
    <div class="hero-art" aria-hidden="true">
      <div class="glow"></div>
      <div class="hero-cards">
        ${CATS.map((c, i) => `<div class="hero-card hc${i}">${cardBackSVG(c)}</div>`).join("")}
      </div>
      <span class="twinkle t1">${ICON.spark}</span>
      <span class="twinkle t2">${ICON.spark}</span>
      <span class="twinkle t3">${ICON.spark}</span>
      <span class="twinkle t4">${ICON.spark}</span>
    </div>`;

  /* ---------------- progress calc ---------------- */
  function progress(d) {
    const entries = d.entries;
    const total = entries.length;
    let week = 1, thisWeek = 0;
    if (total) {
      const start = new Date(entries[0].date);
      start.setHours(0, 0, 0, 0);
      const now = new Date();
      const days = Math.floor((now - start) / 86400000);
      week = Math.min(WEEKS, Math.floor(days / 7) + 1);
      const wStart = new Date(start.getTime() + (week - 1) * 7 * 86400000);
      thisWeek = entries.filter((e) => new Date(e.date) >= wStart).length;
    }
    return { total, week, thisWeek };
  }

  /* ---------------- draft (การ์ดที่กำลังทำ) ---------------- */
  let draft = null;
  try { draft = JSON.parse(sessionStorage.getItem("hn_draft") || "null"); } catch (e) { draft = null; }
  const saveDraft = () => { try { sessionStorage.setItem("hn_draft", JSON.stringify(draft)); } catch (e) { /* ignore */ } };
  const clearDraft = () => { draft = null; try { sessionStorage.removeItem("hn_draft"); } catch (e) { /* ignore */ } };

  /* ---------------- views ---------------- */
  function viewLogin() {
    $app.innerHTML = `
    <section class="landing">
      <div class="landing-left">
        ${heroArt()}
      </div>
      <div class="landing-right">
        <p class="eyebrow">${ICON.spark} การ์ดเติมพลังใจ</p>
        <h1 class="title-xl">เติมพลังใจครู</h1>
        <p class="lead">โปรแกรมส่งเสริมสุขภาวะทางอารมณ์ด้วยการ์ดคำถามสะท้อนตนเองในรูปแบบออนไลน์ สำหรับนักศึกษาวิชาชีพครูชั้นปีที่ 1</p>
        <p class="welcome"><b>ยินดีต้อนรับ</b> — เริ่มต้นดูแลใจ เพื่อก้าวสู่การเป็นครูที่มีความสุขไปด้วยกัน</p>

        <div class="auth-card">
          <div class="tabs" role="tablist">
            <button class="tab active" data-tab="login" role="tab" type="button">เข้าสู่ระบบ</button>
            <button class="tab" data-tab="register" role="tab" type="button">สมัครใช้งาน</button>
          </div>

          <form id="loginForm" class="form" autocomplete="on">
            <label class="field"><span class="fi">${ICON.mail}</span><input name="email" type="email" placeholder="อีเมล" required /></label>
            <label class="field"><span class="fi">${ICON.lock}</span><input name="password" type="password" placeholder="รหัสผ่าน" required /></label>
            <button class="btn btn-primary btn-block" type="submit">เข้าสู่ระบบ</button>
            ${DB.mode === "firebase" ? '<button class="link-btn forgot" id="forgotBtn" type="button">ลืมรหัสผ่าน?</button>' : ""}
          </form>

          <form id="registerForm" class="form" hidden autocomplete="on">
            <label class="field"><span class="fi">${ICON.user}</span><input name="name" type="text" placeholder="ชื่อเล่น / ชื่อที่อยากให้เรียก" required maxlength="40" /></label>
            <label class="field"><span class="fi">${ICON.mail}</span><input name="email" type="email" placeholder="อีเมล" required /></label>
            <label class="field"><span class="fi">${ICON.lock}</span><input name="password" type="password" placeholder="ตั้งรหัสผ่าน (อย่างน้อย ${DB.minPassword} ตัว)" required minlength="${DB.minPassword}" /></label>
            <button class="btn btn-primary btn-block" type="submit">เริ่มต้นใช้งาน</button>
          </form>

          <p class="fine">${DB.mode === "firebase"
            ? "บันทึกของคุณถูกเก็บอย่างปลอดภัยในฐานข้อมูล เข้าใช้ได้จากทุกอุปกรณ์"
            : "โหมดทดลอง: ข้อมูลถูกเก็บไว้ในเบราว์เซอร์ของเครื่องนี้เท่านั้น"}</p>
        </div>
      </div>
    </section>`;

    const tabs = $app.querySelectorAll(".tab");
    const lf = $app.querySelector("#loginForm");
    const rf = $app.querySelector("#registerForm");
    tabs.forEach((t) => t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.toggle("active", x === t));
      lf.hidden = t.dataset.tab !== "login";
      rf.hidden = t.dataset.tab !== "register";
    }));

    const busy = (form, on) => form.querySelectorAll("button, input").forEach((el) => { el.disabled = on; });

    lf.addEventListener("submit", async (e) => {
      e.preventDefault();
      busy(lf, true);
      try {
        await DB.login(lf.email.value.trim().toLowerCase(), lf.password.value);
      } catch (err) { toast(err.message); }
      busy(lf, false);
    });

    rf.addEventListener("submit", async (e) => {
      e.preventDefault();
      busy(rf, true);
      const name = rf.name.value.trim();
      try {
        await DB.register(name, rf.email.value.trim().toLowerCase(), rf.password.value);
        toast("ยินดีต้อนรับนะ " + name + " 💛");
      } catch (err) { toast(err.message); }
      busy(rf, false);
    });

    const fb = $app.querySelector("#forgotBtn");
    if (fb) fb.addEventListener("click", async () => {
      const email = lf.email.value.trim().toLowerCase();
      if (!email) { toast("กรอกอีเมลก่อน แล้วกด “ลืมรหัสผ่าน?” อีกครั้ง"); lf.email.focus(); return; }
      try { await DB.resetPassword(email); toast("ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว"); } catch (err) { toast(err.message); }
    });
  }

  function viewIntro() {
    $app.innerHTML = `
    <section class="panel intro">
      <div class="panel-head">
        <span class="ph-icon">${ICON.note}</span>
        <div>
          <h2>คำชี้แจงก่อนเริ่มโปรแกรม</h2>
          <p class="muted">โปรแกรมนี้เป็นการทำกิจกรรมด้วยการ์ดคำถามสะท้อนตนเอง เพื่อส่งเสริมสุขภาวะทางอารมณ์ของนักศึกษาวิชาชีพครูชั้นปีที่ 1</p>
        </div>
      </div>
      <div class="intro-grid">
        <ul class="steps">
          <li><span class="si">${ICON.calendar}</span><div><b>ระยะเวลาในการทำโปรแกรม 8 สัปดาห์</b><small>ค่อย ๆ เติมพลังใจไปทีละนิด</small></div></li>
          <li><span class="si">${ICON.clock}</span><div><b>สัปดาห์ละ 5 ครั้ง</b><small>ครั้งละประมาณ 10–15 นาที รวม 40 ครั้ง</small></div></li>
          <li><span class="si">${ICON.cards}</span><div><b>เลือกหมวดคำถามที่สนใจ แล้วสุ่มการ์ด 1 ใบ</b><small>ตั้งจิตอธิษฐานสั้น ๆ แล้วเลือกการ์ดที่ใจเรียก</small></div></li>
          <li><span class="si">${ICON.note}</span><div><b>ตอบคำถามบนการ์ด และสะท้อนตนเองเพิ่มอีก 1 ข้อ</b><small>ไม่มีคำตอบถูกหรือผิด เขียนตามความรู้สึกจริงได้เลย</small></div></li>
          <li><span class="si">${ICON.shuffle}</span><div><b>ระบบจะไม่สุ่มคำถามซ้ำในหมวดเดิมจนกว่าจะครบ 25 ข้อ</b><small>4 หมวด รวมทั้งหมด 100 คำถาม</small></div></li>
        </ul>
        <div class="intro-side">
          <div class="mini-cards" aria-hidden="true">
            ${CATS.map((c, i) => `<div class="mini mc${i}">${cardBackSVG(c)}</div>`).join("")}
          </div>
          <p class="quote">“ทุกคำถามคือประตูบานเล็ก ๆ ที่พาคุณกลับไปรู้จักหัวใจตัวเอง”</p>
        </div>
      </div>
      <div class="center">
        <a class="btn btn-primary btn-lg" href="#/categories">เริ่มทำกิจกรรม ${ICON.arrowR}</a>
      </div>
    </section>`;
  }

  function viewCategories(user) {
    const d = data;
    const p = progress(d);
    $app.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <span class="ph-icon">${ICON.cards}</span>
        <div>
          <h2>เลือกหมวดคำถาม</h2>
          <p class="muted">สวัสดี ${esc(user.name)} — วันนี้ใจของคุณอยากคุยเรื่องไหน เลือกหมวดแล้วไปสุ่มการ์ดกันเลย</p>
        </div>
        <div class="head-stat">
          <small>สัปดาห์ที่ ${p.week}</small>
          <b>${Math.min(p.thisWeek, PER_WEEK)}/${PER_WEEK} ครั้ง</b>
        </div>
      </div>
      <div class="cat-grid">
        ${CATS.map((c) => {
          const used = d.used[c.id].length;
          return `
          <article class="cat" style="--c:${c.color};--soft:${c.soft};--deep:${c.deep}">
            <div class="cat-icon">${ICON[c.icon]}</div>
            <p class="cat-card-name">${esc(c.cardName)}</p>
            <h3>${esc(c.name)}</h3>
            <p class="cat-desc">${esc(c.desc)}</p>
            <div class="cat-prog" title="ตอบแล้ว ${used} จาก 25 ข้อ">
              <span style="width:${(used / 25) * 100}%"></span>
            </div>
            <small class="cat-count">ตอบแล้ว ${used} / 25 ข้อ</small>
            <a class="btn btn-cat" href="#/draw/${c.id}">เลือกหมวดนี้</a>
          </article>`;
        }).join("")}
      </div>
    </section>`;
  }

  function viewDraw(user, catId) {
    const cat = catById(catId);
    if (!cat) { location.hash = "#/categories"; return; }
    const d = data;

    // ถ้ามีการ์ดที่เปิดค้างไว้ของหมวดนี้ ให้แสดงต่อ
    if (draft && draft.cat === catId && draft.qid != null) {
      return renderReveal(user, cat, d, false);
    }

    let used = d.used[catId];
    if (used.length >= 25) {
      used = d.used[catId] = [];
      DB.resetUsed(user.uid, catId).catch((e) => console.error(e));
    }
    const remaining = cat.questions.map((_, i) => i).filter((i) => !used.includes(i));

    $app.innerHTML = `
    <section class="panel draw" style="--c:${cat.color};--soft:${cat.soft};--deep:${cat.deep}">
      <div class="draw-top">
        <a class="back" href="#/categories">${ICON.arrowL} กลับไปเลือกหมวด</a>
        <span class="chip">หมวด: ${esc(cat.name)}</span>
      </div>
      <div class="draw-intro">
        <p class="eyebrow center">${ICON.spark} ${esc(cat.cardName)} ${ICON.spark}</p>
        <h2 class="center">หายใจลึก ๆ แล้วเลือกการ์ดที่ใจคุณเรียก</h2>
        <p class="muted center">คำถามที่ ${used.length + 1} / 25 · เหลือการ์ดในสำรับ ${remaining.length} ใบ</p>
      </div>
      <div class="deck-wrap">
        <div class="deck" id="deck"></div>
      </div>
      <div class="center actions">
        <button class="btn btn-ghost" id="shuffleBtn" type="button">${ICON.shuffle} สับไพ่ใหม่</button>
      </div>
    </section>`;

    const $deck = $app.querySelector("#deck");
    let busy = false;

    function deal(animate) {
      const hand = shuffle(remaining).slice(0, Math.min(DECK_SIZE, remaining.length));
      const n = hand.length;
      const narrow = window.innerWidth < 640;
      const avail = $deck.parentElement.clientWidth;
      const gap = Math.min(narrow ? 34 : 70, (avail - (narrow ? 150 : 230)) / Math.max(1, n - 1));
      const spread = narrow ? 7 : 6;
      $deck.innerHTML = hand.map((qid, i) => {
        const off = i - (n - 1) / 2;
        const rot = off * spread;
        const x = off * gap;
        const y = Math.abs(off) * Math.abs(off) * (narrow ? 4 : 6);
        return `<button class="dcard${animate ? " gather" : ""}" type="button" data-qid="${qid}"
            style="--x:${x}px;--y:${y}px;--r:${rot}deg;--i:${i}" aria-label="การ์ดใบที่ ${i + 1}">
            ${cardBackSVG(cat)}
          </button>`;
      }).join("");
      if (animate) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          $deck.querySelectorAll(".dcard").forEach((el) => el.classList.remove("gather"));
        }));
      }
    }

    deal(true);

    $app.querySelector("#shuffleBtn").addEventListener("click", () => {
      if (busy) return;
      busy = true;
      $deck.querySelectorAll(".dcard").forEach((el) => el.classList.add("gather"));
      setTimeout(() => { deal(true); busy = false; }, 520);
    });

    $deck.addEventListener("click", (e) => {
      const btn = e.target.closest(".dcard");
      if (!btn || busy) return;
      busy = true;
      btn.classList.add("chosen");
      $deck.classList.add("picked");
      const qid = Number(btn.dataset.qid);
      draft = {
        cat: catId,
        qid,
        question: cat.questions[qid],
        blessing: pick(BLESS),
        followQ: pick(cat.followUps),
        answer: "",
        followA: "",
        mood: null
      };
      saveDraft();
      setTimeout(() => renderReveal(user, cat, d, true), 650);
    });
  }

  function renderReveal(user, cat, d, animate) {
    const used = d.used[cat.id];
    $app.innerHTML = `
    <section class="panel draw" style="--c:${cat.color};--soft:${cat.soft};--deep:${cat.deep}">
      <div class="draw-top">
        <a class="back" href="#/categories">${ICON.arrowL} กลับไปเลือกหมวด</a>
        <span class="chip">หมวด: ${esc(cat.name)}</span>
      </div>
      <p class="muted center step-count">คำถามที่ ${used.length + 1} / 25</p>
      <div class="reveal">
        <div class="tcard${animate ? "" : " flipped"}" id="tcard">
          <div class="tcard-inner">
            <div class="tface tback">${cardBackSVG(cat)}</div>
            <div class="tface tfront">
              <div class="tf-frame">
                <span class="tf-icon">${ICON[cat.icon]}</span>
                <p class="tf-name">${esc(cat.cardName)}</p>
                <p class="tf-q">${esc(draft.question)}</p>
                <p class="tf-bless">${ICON.spark} ${esc(draft.blessing)}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="answer-box${animate ? " pending" : ""}" id="answerBox">
          <label for="answer" class="ans-label">${ICON.note} เขียนคำตอบของคุณ</label>
          <textarea id="answer" rows="6" placeholder="พิมพ์คำตอบของคุณที่นี่… ไม่มีถูกหรือผิด เขียนจากใจได้เลย">${esc(draft.answer)}</textarea>
          <div class="ans-actions">
            <button class="btn btn-ghost" id="redraw" type="button">${ICON.shuffle} สุ่มการ์ดใหม่</button>
            <button class="btn btn-primary" id="toReflect" type="button">ถัดไป ${ICON.arrowR}</button>
          </div>
        </div>
      </div>
    </section>`;

    const $t = $app.querySelector("#tcard");
    const $box = $app.querySelector("#answerBox");
    if (animate) {
      setTimeout(() => $t.classList.add("flipped"), 120);
      setTimeout(() => $box.classList.remove("pending"), 900);
    }
    const $ans = $app.querySelector("#answer");
    $ans.addEventListener("input", () => { draft.answer = $ans.value; saveDraft(); });

    $app.querySelector("#redraw").addEventListener("click", () => {
      if (draft.answer.trim() && !confirm("ต้องการสุ่มการ์ดใบใหม่ใช่ไหม? คำตอบที่พิมพ์ไว้จะหายไปนะ")) return;
      clearDraft();
      viewDraw(user, cat.id);
    });
    $app.querySelector("#toReflect").addEventListener("click", () => {
      if (!draft.answer.trim()) { toast("ลองเขียนคำตอบสั้น ๆ ก่อนนะ 💛"); $ans.focus(); return; }
      location.hash = "#/reflect";
    });
  }

  function viewReflect(user) {
    if (!draft || draft.qid == null) { location.hash = "#/categories"; return; }
    const cat = catById(draft.cat);
    $app.innerHTML = `
    <section class="panel reflect" style="--c:${cat.color};--soft:${cat.soft};--deep:${cat.deep}">
      <div class="draw-top">
        <a class="back" href="#/draw/${cat.id}">${ICON.arrowL} กลับไปที่การ์ด</a>
        <span class="chip">หมวด: ${esc(cat.name)}</span>
      </div>
      <div class="panel-head">
        <span class="ph-icon">${ICON.spark}</span>
        <div>
          <h2>สะท้อนตนเองเพิ่มเติม</h2>
          <p class="muted">อีกนิดเดียว — ใช้เวลาใคร่ครวญ แล้วตอบคำถามต่อไปนี้</p>
        </div>
      </div>

      <div class="recap">
        <div class="recap-card">${cardBackSVG(cat)}</div>
        <div>
          <small class="muted">การ์ดของคุณ</small>
          <p class="recap-q">${esc(draft.question)}</p>
          <p class="recap-a">${esc(draft.answer)}</p>
        </div>
      </div>

      <div class="qblock">
        <span class="qnum">1</span>
        <div class="qbody">
          <label for="followA">${esc(draft.followQ)}</label>
          <textarea id="followA" rows="4" placeholder="พิมพ์คำตอบของคุณ…">${esc(draft.followA)}</textarea>
        </div>
      </div>

      <div class="qblock">
        <span class="qnum">2</span>
        <div class="qbody">
          <label>หลังจากได้สะท้อนตนเอง ตอนนี้ใจของคุณรู้สึกอย่างไร?</label>
          <div class="moods" role="radiogroup">
            ${MOODS.map((m) => `
              <button type="button" class="mood${draft.mood === m.id ? " on" : ""}" data-mood="${m.id}" role="radio" aria-checked="${draft.mood === m.id}">
                <span class="me">${m.emoji}</span><span class="ml">${m.label}</span>
              </button>`).join("")}
          </div>
        </div>
      </div>

      <div class="center actions">
        <button class="btn btn-primary btn-lg" id="saveBtn" type="button">บันทึกการ์ดใบนี้ ${ICON.heart}</button>
      </div>
    </section>`;

    const $f = $app.querySelector("#followA");
    $f.addEventListener("input", () => { draft.followA = $f.value; saveDraft(); });
    $app.querySelectorAll(".mood").forEach((b) => b.addEventListener("click", () => {
      draft.mood = Number(b.dataset.mood);
      saveDraft();
      $app.querySelectorAll(".mood").forEach((x) => {
        const on = x === b;
        x.classList.toggle("on", on);
        x.setAttribute("aria-checked", on);
      });
    }));

    $app.querySelector("#saveBtn").addEventListener("click", async () => {
      if (!draft.followA.trim()) { toast("ลองตอบคำถามเพิ่มเติมสั้น ๆ อีกนิดนะ"); $f.focus(); return; }
      if (!draft.mood) { toast("เลือกความรู้สึกของคุณตอนนี้ด้วยนะ"); return; }
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: new Date().toISOString(),
        cat: draft.cat,
        qid: draft.qid,
        question: draft.question,
        answer: draft.answer.trim(),
        followQ: draft.followQ,
        followA: draft.followA.trim(),
        mood: draft.mood,
        blessing: draft.blessing
      };
      const $btn = $app.querySelector("#saveBtn");
      $btn.disabled = true;
      $btn.textContent = "กำลังบันทึก…";
      try {
        await DB.addEntry(user.uid, entry);
      } catch (err) {
        console.error(err);
        toast("บันทึกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้งนะ");
        $btn.disabled = false;
        $btn.innerHTML = "บันทึกการ์ดใบนี้ " + ICON.heart;
        return;
      }
      data.entries.push(entry);
      if (!data.used[entry.cat].includes(entry.qid)) data.used[entry.cat].push(entry.qid);
      clearDraft();
      celebrate();
      location.hash = "#/journal";
    });
  }

  function celebrate() {
    const box = document.createElement("div");
    box.className = "confetti";
    const colors = ["#F28C6B", "#E46F7E", "#E9A23B", "#7FA66E", "#F8D9A0"];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("span");
      s.style.left = Math.random() * 100 + "%";
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.4 + "s";
      s.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2400);
    toast("บันทึกเรียบร้อย เก่งมากเลยนะวันนี้ 💛");
  }

  const moodOf = (id) => MOODS.find((m) => m.id === id) || { emoji: "", label: "" };
  function entryHTML(e) {
    const c = catById(e.cat);
    const m = moodOf(e.mood);
    return `
          <details class="entry" style="--c:${c.color};--soft:${c.soft};--deep:${c.deep}">
            <summary>
              <span class="e-icon">${ICON[c.icon]}</span>
              <span class="e-main">
                <small>${fmtDate(e.date)} · ${fmtTime(e.date)} · ${esc(c.short)}</small>
                <b>${esc(e.question)}</b>
              </span>
              <span class="e-mood" title="${esc(m.label)}">${m.emoji}</span>
            </summary>
            <div class="e-body">
              <p class="e-label">คำตอบ</p>
              <p class="e-text">${esc(e.answer)}</p>
              <p class="e-label">${esc(e.followQ)}</p>
              <p class="e-text">${esc(e.followA)}</p>
              <p class="e-bless">${ICON.spark} ${esc(e.blessing)}</p>
            </div>
          </details>`;
  }

  function viewJournal(user) {
    const d = data;
    const p = progress(d);
    const list = d.entries.slice().reverse();
    $app.innerHTML = `
    <section class="journal">
      <div class="panel jr-main">
        <div class="panel-head">
          <span class="ph-icon">${ICON.note}</span>
          <div>
            <h2>บันทึกหลังทำกิจกรรม</h2>
            <p class="muted">การ์ดทุกใบที่คุณเปิดและเรื่องราวที่คุณได้สะท้อน</p>
          </div>
          ${list.length ? `<button class="btn btn-ghost btn-sm" id="exportBtn" type="button">${ICON.download} ดาวน์โหลด CSV</button>` : ""}
        </div>
        ${list.length ? `<div class="entries">${list.map(entryHTML).join("")}</div>` : `
          <div class="empty">
            <div class="empty-cards" aria-hidden="true">${cardBackSVG(CATS[0])}</div>
            <p>ยังไม่มีบันทึกเลย ลองเปิดการ์ดใบแรกของคุณกัน</p>
            <a class="btn btn-primary" href="#/categories">ไปสุ่มการ์ด ${ICON.arrowR}</a>
          </div>`}
      </div>

      <aside class="panel jr-side">
        <h3 class="side-title">${ICON.spark} ความก้าวหน้าของฉัน</h3>
        <div class="stat">
          <span class="stat-icon">${ICON.calendar}</span>
          <div class="stat-body">
            <small>สัปดาห์ที่ ${p.week} จาก ${WEEKS} · ทำแล้วในสัปดาห์นี้</small>
            <b>${Math.min(p.thisWeek, PER_WEEK)} / ${PER_WEEK} ครั้ง</b>
            <div class="bar"><span style="width:${Math.min(100, (p.thisWeek / PER_WEEK) * 100)}%"></span></div>
          </div>
        </div>
        <div class="stat">
          <span class="stat-icon">${ICON.cards}</span>
          <div class="stat-body">
            <small>ความคืบหน้าของโปรแกรม</small>
            <b>${Math.min(p.total, TOTAL_SESSIONS)} / ${TOTAL_SESSIONS} ครั้ง</b>
            <div class="bar"><span style="width:${Math.min(100, (p.total / TOTAL_SESSIONS) * 100)}%"></span></div>
          </div>
        </div>
        <div class="cat-mini">
          ${CATS.map((c) => {
            const n = d.used[c.id].length;
            return `<div class="cm" style="--c:${c.color};--soft:${c.soft}">
              <span class="cm-icon">${ICON[c.icon]}</span>
              <div><small>${esc(c.short)}</small><div class="bar thin"><span style="width:${(n / 25) * 100}%"></span></div></div>
              <b>${n}/25</b>
            </div>`;
          }).join("")}
        </div>
        <div class="side-quote">
          <span class="sq-icon">${ICON.leaf}</span>
          <p>“การสะท้อนตนเองในวันนี้ คือก้าวเล็ก ๆ ที่สำคัญ สู่ครูที่มีความสุขในอนาคต”</p>
        </div>
      </aside>
    </section>`;

    const ex = $app.querySelector("#exportBtn");
    if (ex) ex.addEventListener("click", () => exportCSV(user, d));
  }

  function downloadCSV(filename, rows) {
    const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const csv = "﻿" + rows.map((r) => r.map(q).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  const ENTRY_HEAD = ["วันที่", "เวลา", "หมวด", "คำถามบนการ์ด", "คำตอบ", "คำถามเพิ่มเติม", "คำตอบเพิ่มเติม", "ความรู้สึกหลังทำกิจกรรม", "ระดับความรู้สึก (1-5)"];
  const entryRow = (e) => {
    const m = MOODS.find((x) => x.id === e.mood);
    return [fmtDate(e.date), fmtTime(e.date), catById(e.cat).name, e.question, e.answer, e.followQ, e.followA, m ? m.label : "", e.mood ?? ""];
  };

  function exportCSV(user, d) {
    downloadCSV("heartnote-" + (user.name || "journal") + ".csv", [ENTRY_HEAD, ...d.entries.map(entryRow)]);
  }

  /* ---------------- admin ---------------- */
  async function viewAdmin(user) {
    if (user.adminPending) {
      $app.innerHTML = `
      <section class="panel">
        <div class="panel-head"><span class="ph-icon">${ICON.mail}</span><div>
          <h2>ยืนยันอีเมลผู้ดูแลก่อนนะ</h2>
          <p class="muted">เพื่อความปลอดภัยของข้อมูลนักศึกษา ผู้ดูแลต้องยืนยันอีเมล ${esc(user.email)} ก่อน
          กดปุ่มด้านล่าง เปิดลิงก์ในอีเมล แล้วออกจากระบบและเข้าสู่ระบบใหม่อีกครั้ง</p>
        </div></div>
        <button class="btn btn-primary" id="verifyBtn" type="button">${ICON.mail} ส่งอีเมลยืนยัน</button>
      </section>`;
      $app.querySelector("#verifyBtn").addEventListener("click", async () => {
        try { await DB.sendVerify(); toast("ส่งอีเมลยืนยันแล้ว ตรวจกล่องจดหมายได้เลย"); } catch (e) { toast(e.message); }
      });
      return;
    }
    if (!user.isAdmin) { location.replace("#/categories"); return; }

    $app.innerHTML = `<section class="panel"><p class="muted center">กำลังโหลดข้อมูลนักศึกษา…</p></section>`;
    let all;
    try {
      all = await DB.listAll();
    } catch (e) {
      console.error(e);
      $app.innerHTML = `<section class="panel"><h2>โหลดข้อมูลไม่สำเร็จ</h2>
        <p class="muted">ตรวจสอบว่าเพิ่มอีเมลผู้ดูแลใน firestore.rules และ publish rules แล้ว (${esc(e.message)})</p></section>`;
      return;
    }
    if (location.hash !== "#/admin") return; // ผู้ใช้เปลี่ยนหน้าไประหว่างโหลด

    all.forEach((u) => u.entries.sort((a, b) => a.date.localeCompare(b.date)));
    all.sort((a, b) => b.entries.length - a.entries.length || (a.name || "").localeCompare(b.name || "", "th"));
    const students = all.filter((u) => !(u.email && u.email === user.email && !u.entries.length));
    const entries = students.flatMap((u) => u.entries);
    const moods = entries.map((e) => e.mood).filter(Boolean);
    const avg = (arr) => (arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "–");
    const last = (u) => (u.entries.length ? u.entries[u.entries.length - 1].date : null);

    $app.innerHTML = `
    <section class="panel admin">
      <div class="panel-head">
        <span class="ph-icon">${ICON.user}</span>
        <div>
          <h2>ภาพรวมสำหรับผู้ดูแล</h2>
          <p class="muted">ข้อมูลการทำกิจกรรมของนักศึกษาทุกคน${DB.mode === "local" ? " (โหมดทดลอง: แสดงเฉพาะบัญชีในเครื่องนี้)" : ""}</p>
        </div>
        <button class="btn btn-primary btn-sm" id="exportAll" type="button" ${entries.length ? "" : "disabled"}>${ICON.download} ดาวน์โหลดทั้งหมด (CSV)</button>
      </div>

      <div class="kpis">
        <div class="kpi"><small>นักศึกษา</small><b>${students.length}</b><span>คน</span></div>
        <div class="kpi"><small>บันทึกทั้งหมด</small><b>${entries.length}</b><span>ครั้ง</span></div>
        <div class="kpi"><small>เฉลี่ยต่อคน</small><b>${students.length ? (entries.length / students.length).toFixed(1) : "–"}</b><span>/ ${TOTAL_SESSIONS} ครั้ง</span></div>
        <div class="kpi"><small>ความรู้สึกหลังทำกิจกรรม</small><b>${avg(moods)}</b><span>/ 5 เฉลี่ย</span></div>
      </div>

      ${students.length ? `
      <div class="table-wrap">
        <table class="atable">
          <thead><tr>
            <th>นักศึกษา</th><th>ความคืบหน้า</th>
            ${CATS.map((c) => `<th class="num" title="${esc(c.name)}"><span class="th-icon" style="--c:${c.color}">${ICON[c.icon]}</span></th>`).join("")}
            <th class="num">ความรู้สึกเฉลี่ย</th><th>ล่าสุด</th>
          </tr></thead>
          <tbody>
          ${students.map((u, i) => {
            const n = u.entries.length;
            const lu = last(u);
            return `<tr data-i="${i}" tabindex="0">
              <td><b>${esc(u.name || "-")}</b><small>${esc(u.email || "")}</small></td>
              <td><div class="bar"><span style="width:${Math.min(100, (n / TOTAL_SESSIONS) * 100)}%"></span></div><small>${n} / ${TOTAL_SESSIONS} ครั้ง</small></td>
              ${CATS.map((c) => `<td class="num">${u.entries.filter((e) => e.cat === c.id).length}</td>`).join("")}
              <td class="num">${avg(u.entries.map((e) => e.mood).filter(Boolean))}</td>
              <td>${lu ? fmtDate(lu) : "-"}</td>
            </tr>`;
          }).join("")}
          </tbody>
        </table>
      </div>
      <p class="muted fine-left">แตะที่ชื่อนักศึกษาเพื่อดูบันทึกรายคน</p>
      <div id="detail"></div>` : `<div class="empty"><p>ยังไม่มีนักศึกษาสมัครใช้งาน</p></div>`}
    </section>`;

    const exp = $app.querySelector("#exportAll");
    if (exp) exp.addEventListener("click", () => {
      const rows = [["ชื่อ", "อีเมล", ...ENTRY_HEAD]];
      students.forEach((u) => u.entries.forEach((e) => rows.push([u.name, u.email, ...entryRow(e)])));
      downloadCSV("heartnote-ทั้งหมด-" + new Date().toISOString().slice(0, 10) + ".csv", rows);
    });

    const $detail = $app.querySelector("#detail");
    const show = (tr) => {
      $app.querySelectorAll(".atable tr.sel").forEach((x) => x.classList.remove("sel"));
      tr.classList.add("sel");
      const u = students[Number(tr.dataset.i)];
      $detail.innerHTML = `
        <div class="detail">
          <div class="detail-head">
            <h3>${esc(u.name)} <small>${esc(u.email)}</small></h3>
            ${u.entries.length ? `<button class="btn btn-ghost btn-sm" id="exportOne" type="button">${ICON.download} CSV รายคน</button>` : ""}
          </div>
          ${u.entries.length ? `<div class="entries">${u.entries.slice().reverse().map(entryHTML).join("")}</div>` : `<p class="muted">ยังไม่มีบันทึก</p>`}
        </div>`;
      const one = $detail.querySelector("#exportOne");
      if (one) one.addEventListener("click", () => exportCSV(u, u));
      $detail.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    $app.querySelectorAll(".atable tbody tr").forEach((tr) => {
      tr.addEventListener("click", () => show(tr));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter") show(tr); });
    });
  }

  /* ---------------- router ---------------- */
  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [name, arg] = hash.split("/");
    const user = me;

    if (!authReady) {
      $topbar.hidden = true;
      $app.innerHTML = `<div class="loading"><div class="loading-card">${cardBackSVG(CATS[0])}</div><p>กำลังสับไพ่…</p></div>`;
      return;
    }
    if (!user) {
      $topbar.hidden = true;
      document.body.classList.add("is-landing");
      viewLogin();
      return;
    }
    document.body.classList.remove("is-landing");
    $topbar.hidden = false;
    document.getElementById("avatar").textContent = (user.name || "?").trim().charAt(0) || "?";
    document.getElementById("avatar").title = user.name;
    document.getElementById("adminLink").hidden = !(user.isAdmin || user.adminPending);

    const active = name === "draw" || name === "reflect" ? "categories" : name;
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === active));

    switch (name) {
      case "intro": viewIntro(); break;
      case "draw": viewDraw(user, arg); break;
      case "reflect": viewReflect(user); break;
      case "journal": viewJournal(user); break;
      case "categories": viewCategories(user); break;
      case "admin": viewAdmin(user); break;
      default:
        location.replace(user.isAdmin ? "#/admin" : data.entries.length ? "#/categories" : "#/intro");
        return;
    }
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    $app.focus({ preventScroll: true });
  }

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    clearDraft();
    await DB.logout();
    location.hash = "#/";
  });

  window.addEventListener("hashchange", route);
  route(); // แสดงหน้ากำลังโหลด

  try {
    DB = await createDB();
  } catch (e) {
    $app.innerHTML = `<section class="panel"><h2>เชื่อมต่อฐานข้อมูลไม่สำเร็จ</h2><p class="muted">ตรวจสอบอินเทอร์เน็ต หรือค่าใน js/firebase-config.js แล้วรีเฟรชหน้าอีกครั้ง</p></section>`;
    return;
  }

  DB.onAuth(async (user, err) => {
    if (err) toast("โหลดข้อมูลผู้ใช้ไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง");
    if (user && (!me || me.uid !== user.uid)) {
      try { data = await DB.loadData(user.uid); } catch (e) {
        console.error(e);
        toast("โหลดบันทึกไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง");
        data = { used: Object.fromEntries(CATS.map((c) => [c.id, []])), entries: [] };
      }
    }
    if (!user) { data = null; clearDraft(); }
    me = user;
    authReady = true;
    if (user && (location.hash === "" || location.hash === "#/" || location.hash === "#")) {
      location.replace(user.isAdmin ? "#/admin" : data.entries.length ? "#/categories" : "#/intro");
      return; // hashchange จะเรียก route()
    }
    route();
  });
})();

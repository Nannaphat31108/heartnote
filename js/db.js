// ชั้นจัดการข้อมูล: ใช้ Supabase (PostgreSQL) ถ้าตั้งค่าไว้ ไม่เช่นนั้นใช้ localStorage (โหมดทดลอง)
import { supabaseConfig } from "./supabase-config.js";

const CAT_IDS = ["emo", "sat", "mean", "goal"];

const emptyUsed = () => Object.fromEntries(CAT_IDS.map((c) => [c, []]));
const normUsed = (u) => {
  const out = emptyUsed();
  if (u) CAT_IDS.forEach((c) => { if (Array.isArray(u[c])) out[c] = u[c].slice(); });
  return out;
};

/* ======================= Supabase (PostgreSQL) ======================= */
const SB_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
const PAGE = 1000; // Supabase ส่งได้ครั้งละไม่เกิน 1000 แถว

// เลขข้อที่ตอบแล้วในรอบปัจจุบันของแต่ละหมวด (ครบ 25 ข้อแล้วเริ่มรอบใหม่)
function deriveUsed(entries) {
  const used = emptyUsed();
  CAT_IDS.forEach((c) => {
    const qs = entries.filter((e) => e.cat === c).map((e) => e.qid);
    used[c] = qs.slice(qs.length - (qs.length % 25));
  });
  return used;
}
const fromRow = (r) => ({
  id: r.id, date: r.date, cat: r.cat, qid: r.qid, question: r.question, answer: r.answer,
  followQ: r.follow_q, followA: r.follow_a, mood: r.mood, blessing: r.blessing
});

async function supabaseBackend() {
  const { createClient } = await import(SB_URL);
  const sb = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const here = () => location.origin + location.pathname;

  const ERR = [
    [/invalid login credentials/i, "อีเมลหรือรหัสผ่านไม่ถูกต้อง"],
    [/email not confirmed/i, "ยังไม่ได้ยืนยันอีเมล ลองตรวจกล่องจดหมาย (และโฟลเดอร์สแปม) ก่อนนะ"],
    [/already registered|already exists/i, "อีเมลนี้มีบัญชีแล้ว เข้าสู่ระบบได้เลย"],
    [/password should be at least|weak/i, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"],
    [/invalid.*email|unable to validate email/i, "รูปแบบอีเมลไม่ถูกต้อง"],
    [/rate limit|too many|security purposes/i, "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่นะ"],
    [/failed to fetch|network/i, "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง"],
    [/same.*password|different from the old/i, "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม"]
  ];
  const fail = (error) => {
    const msg = error && (error.message || String(error));
    const hit = ERR.find(([re]) => re.test(msg || ""));
    throw new Error(hit ? hit[1] : "เกิดข้อผิดพลาด: " + msg);
  };
  const ok = ({ data, error }) => { if (error) fail(error); return data; };

  async function selectAll(build) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const data = ok(await build().range(from, from + PAGE - 1));
      rows.push(...data);
      if (data.length < PAGE) return rows;
    }
  }

  async function toUser(u) {
    if (!u) return null;
    const [prof, adm] = await Promise.all([
      sb.from("profiles").select("name").eq("id", u.id).maybeSingle(),
      sb.rpc("is_admin")
    ]);
    const name = (prof.data && prof.data.name) || (u.user_metadata && u.user_metadata.name) || (u.email || "").split("@")[0];
    return { uid: u.id, name, email: (u.email || "").toLowerCase(), isAdmin: adm.data === true };
  }

  return {
    mode: "cloud",
    minPassword: 6,
    canResetPassword: true,
    onAuth(cb) {
      let lastUid;
      sb.auth.onAuthStateChange((event, session) => {
        const u = session ? session.user : null;
        const uid = u ? u.id : null;
        // ต่ออายุ token ไม่ต้องรีเฟรชหน้า (ไม่อย่างนั้นคำตอบที่กำลังพิมพ์จะหาย)
        if (uid === lastUid && event !== "PASSWORD_RECOVERY") return;
        lastUid = uid;
        // supabase แนะนำว่าไม่ให้เรียก API ภายใน callback โดยตรง
        setTimeout(async () => {
          try { cb(await toUser(u), null, event === "PASSWORD_RECOVERY" ? "recovery" : null); }
          catch (e) { console.error(e); cb(null, e); }
        }, 0);
      });
    },
    async register(name, email, pass) {
      const data = ok(await sb.auth.signUp({ email, password: pass, options: { data: { name }, emailRedirectTo: here() } }));
      return { needConfirm: !data.session };
    },
    async login(email, pass) { ok(await sb.auth.signInWithPassword({ email, password: pass })); },
    async logout() { await sb.auth.signOut(); },
    async resetPassword(email) { ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: here() })); },
    async updatePassword(pass) { ok(await sb.auth.updateUser({ password: pass })); },
    async loadData(uid) {
      const rows = await selectAll(() => sb.from("entries").select("*").eq("user_id", uid).order("date").order("id"));
      const entries = rows.map(fromRow);
      return { used: deriveUsed(entries), entries };
    },
    async addEntry(uid, e) {
      ok(await sb.from("entries").insert({
        id: e.id, date: e.date, cat: e.cat, qid: e.qid, question: e.question, answer: e.answer,
        follow_q: e.followQ, follow_a: e.followA, mood: e.mood, blessing: e.blessing
      }));
    },
    async resetUsed() { /* คำนวณจากบันทึกอัตโนมัติ ไม่ต้องเก็บแยก */ },
    async listAll() {
      const [profiles, rows] = await Promise.all([
        selectAll(() => sb.from("profiles").select("id,name,email").order("created_at")),
        selectAll(() => sb.from("entries").select("*").order("date").order("id"))
      ]);
      const byUid = {};
      profiles.forEach((p) => { byUid[p.id] = { uid: p.id, name: p.name, email: p.email, entries: [] }; });
      rows.forEach((r) => {
        (byUid[r.user_id] = byUid[r.user_id] || { uid: r.user_id, name: "?", email: "", entries: [] }).entries.push(fromRow(r));
      });
      return Object.values(byUid);
    }
  };
}

/* ======================= localStorage (โหมดทดลอง) ======================= */
function localBackend() {
  const get = (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const USERS = "hn_users", SESSION = "hn_session", key = (uid) => "hn_data_" + uid;
  let listener = () => {};

  async function hash(text) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      let h = 0;
      for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
      return "x" + h;
    }
  }
  const userOf = (email) => {
    const u = email && get(USERS, {})[email];
    return u ? { uid: email, name: u.name, email, isAdmin: false } : null;
  };
  const emit = () => listener(userOf(get(SESSION, null)));
  const data = (uid) => {
    const d = get(key(uid), {});
    return { used: normUsed(d.used), entries: d.entries || [] };
  };

  return {
    mode: "local",
    minPassword: 4,
    canResetPassword: false,
    onAuth(cb) { listener = cb; emit(); },
    async register(name, email, pass) {
      const users = get(USERS, {});
      if (users[email]) throw new Error("อีเมลนี้มีบัญชีแล้ว เข้าสู่ระบบได้เลย");
      users[email] = { name, email, pass: await hash(pass), created: new Date().toISOString() };
      set(USERS, users); set(SESSION, email); emit();
      return { needConfirm: false };
    },
    async login(email, pass) {
      const u = get(USERS, {})[email];
      if (!u) throw new Error("ยังไม่พบบัญชีนี้ ลองสมัครใช้งานก่อนนะ");
      if (u.pass !== (await hash(pass))) throw new Error("รหัสผ่านไม่ถูกต้อง ลองอีกครั้งนะ");
      set(SESSION, email); emit();
    },
    async logout() { try { localStorage.removeItem(SESSION); } catch (e) { /* ignore */ } emit(); },
    async resetPassword() { throw new Error("โหมดทดลองยังรีเซ็ตรหัสผ่านไม่ได้ ต้องเชื่อมฐานข้อมูลก่อน"); },
    async updatePassword() {},
    async loadData(uid) { return data(uid); },
    async addEntry(uid, entry) {
      const d = data(uid);
      d.entries.push(entry);
      if (!d.used[entry.cat].includes(entry.qid)) d.used[entry.cat].push(entry.qid);
      set(key(uid), d);
    },
    async resetUsed(uid, cat) { const d = data(uid); d.used[cat] = []; set(key(uid), d); },
    async listAll() {
      return Object.values(get(USERS, {})).map((u) => ({ uid: u.email, name: u.name, email: u.email, entries: data(u.email).entries }));
    }
  };
}

export async function createDB() {
  if (supabaseConfig.url && supabaseConfig.anonKey) return supabaseBackend();
  return localBackend();
}

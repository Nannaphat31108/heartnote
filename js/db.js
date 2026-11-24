// ชั้นจัดการข้อมูล: ใช้ Firebase (Auth + Firestore) ถ้าตั้งค่าไว้ ไม่เช่นนั้นใช้ localStorage
import { firebaseConfig, adminEmails } from "./firebase-config.js";

const FB_VER = "10.12.2";
const CAT_IDS = ["emo", "sat", "mean", "goal"];
const ADMINS = adminEmails.map((e) => e.trim().toLowerCase());

const emptyUsed = () => Object.fromEntries(CAT_IDS.map((c) => [c, []]));
const normUsed = (u) => {
  const out = emptyUsed();
  if (u) CAT_IDS.forEach((c) => { if (Array.isArray(u[c])) out[c] = u[c].slice(); });
  return out;
};

/* ======================= Firebase ======================= */
async function firebaseBackend() {
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(base + "firebase-app.js"),
    import(base + "firebase-auth.js"),
    import(base + "firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const fs = F.getFirestore(app);
  // สำหรับนักพัฒนา: เปิด http://localhost:.../?emulator เพื่อทดสอบกับ Firebase Emulator
  if (["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).has("emulator")) {
    A.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    F.connectFirestoreEmulator(fs, "127.0.0.1", 8080);
  }
  let pendingName = null;

  const toUser = async (u) => {
    if (!u) return null;
    const email = (u.email || "").toLowerCase();
    let name = u.displayName || pendingName || email.split("@")[0];
    const ref = F.doc(fs, "users", u.uid);
    const snap = await F.getDoc(ref);
    if (!snap.exists()) {
      await F.setDoc(ref, { name, email, used: emptyUsed(), created: F.serverTimestamp() });
    } else if (snap.data().name) {
      name = snap.data().name;
    }
    pendingName = null;
    return { uid: u.uid, name, email, verified: u.emailVerified, isAdmin: ADMINS.includes(email) && u.emailVerified, adminPending: ADMINS.includes(email) && !u.emailVerified };
  };

  const ERR = {
    "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "auth/wrong-password": "รหัสผ่านไม่ถูกต้อง",
    "auth/user-not-found": "ยังไม่พบบัญชีนี้ ลองสมัครใช้งานก่อนนะ",
    "auth/email-already-in-use": "อีเมลนี้มีบัญชีแล้ว เข้าสู่ระบบได้เลย",
    "auth/weak-password": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
    "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
    "auth/too-many-requests": "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่นะ",
    "auth/network-request-failed": "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง"
  };
  const wrap = async (fn) => {
    try { return await fn(); } catch (e) { throw new Error(ERR[e.code] || "เกิดข้อผิดพลาด: " + (e.code || e.message)); }
  };

  return {
    mode: "firebase",
    minPassword: 6,
    onAuth(cb) {
      A.onAuthStateChanged(auth, async (u) => {
        try { cb(await toUser(u)); } catch (e) { console.error(e); cb(null, e); }
      });
    },
    register: (name, email, pass) => wrap(async () => {
      pendingName = name;
      const cred = await A.createUserWithEmailAndPassword(auth, email, pass);
      await A.updateProfile(cred.user, { displayName: name });
    }),
    login: (email, pass) => wrap(() => A.signInWithEmailAndPassword(auth, email, pass)),
    logout: () => A.signOut(auth),
    resetPassword: (email) => wrap(() => A.sendPasswordResetEmail(auth, email)),
    sendVerify: () => wrap(() => A.sendEmailVerification(auth.currentUser)),
    async loadData(uid) {
      const [u, q] = await Promise.all([
        F.getDoc(F.doc(fs, "users", uid)),
        F.getDocs(F.query(F.collection(fs, "users", uid, "entries"), F.orderBy("date")))
      ]);
      return { used: normUsed(u.exists() ? u.data().used : null), entries: q.docs.map((d) => d.data()) };
    },
    async addEntry(uid, entry) {
      const batch = F.writeBatch(fs);
      batch.set(F.doc(fs, "users", uid, "entries", entry.id), entry);
      batch.update(F.doc(fs, "users", uid), { ["used." + entry.cat]: F.arrayUnion(entry.qid), lastActive: F.serverTimestamp() });
      await batch.commit();
    },
    async resetUsed(uid, cat) {
      await F.updateDoc(F.doc(fs, "users", uid), { ["used." + cat]: [] });
    },
    async listAll() {
      const [users, entries] = await Promise.all([
        F.getDocs(F.collection(fs, "users")),
        F.getDocs(F.collectionGroup(fs, "entries"))
      ]);
      const byUid = {};
      users.docs.forEach((d) => { byUid[d.id] = { uid: d.id, name: d.data().name, email: d.data().email, entries: [] }; });
      entries.docs.forEach((d) => {
        const uid = d.ref.parent.parent.id;
        (byUid[uid] = byUid[uid] || { uid, name: "?", email: "", entries: [] }).entries.push(d.data());
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
    return u ? { uid: email, name: u.name, email, verified: true, isAdmin: ADMINS.includes(email), adminPending: false } : null;
  };
  const emit = () => listener(userOf(get(SESSION, null)));
  const data = (uid) => {
    const d = get(key(uid), {});
    return { used: normUsed(d.used), entries: d.entries || [] };
  };

  return {
    mode: "local",
    minPassword: 4,
    onAuth(cb) { listener = cb; emit(); },
    async register(name, email, pass) {
      const users = get(USERS, {});
      if (users[email]) throw new Error("อีเมลนี้มีบัญชีแล้ว เข้าสู่ระบบได้เลย");
      users[email] = { name, email, pass: await hash(pass), created: new Date().toISOString() };
      set(USERS, users); set(SESSION, email); emit();
    },
    async login(email, pass) {
      const u = get(USERS, {})[email];
      if (!u) throw new Error("ยังไม่พบบัญชีนี้ ลองสมัครใช้งานก่อนนะ");
      if (u.pass !== (await hash(pass))) throw new Error("รหัสผ่านไม่ถูกต้อง ลองอีกครั้งนะ");
      set(SESSION, email); emit();
    },
    async logout() { try { localStorage.removeItem(SESSION); } catch (e) { /* ignore */ } emit(); },
    async resetPassword() { throw new Error("โหมดทดลองยังรีเซ็ตรหัสผ่านไม่ได้ ต้องเชื่อมฐานข้อมูลก่อน"); },
    async sendVerify() {},
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
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try { return await firebaseBackend(); } catch (e) { console.error("โหลด Firebase ไม่สำเร็จ", e); throw e; }
  }
  return localBackend();
}

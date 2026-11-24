// ===== ตั้งค่าฐานข้อมูล Firebase =====
// วิธีหาค่าเหล่านี้ ดูใน README.md หัวข้อ "ตั้งค่าฐานข้อมูล (Firebase)"
// ถ้าปล่อย apiKey ว่างไว้ เว็บจะทำงานแบบเก็บข้อมูลในเบราว์เซอร์ของแต่ละเครื่อง (โหมดทดลอง)

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// อีเมลของผู้ดูแล/ผู้วิจัย ที่จะเห็นเมนู "ผู้ดูแล" และดูบันทึกของนักศึกษาทุกคนได้
// (ต้องเพิ่มอีเมลเดียวกันนี้ใน firestore.rules ด้วย)
export const adminEmails = [
  // "researcher@example.com"
];

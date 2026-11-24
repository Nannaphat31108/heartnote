// ===== ตั้งค่าฐานข้อมูล Supabase (PostgreSQL) =====
// หาค่าได้ที่ Supabase Dashboard → Project Settings → API (ดูขั้นตอนใน README.md)
// ถ้าปล่อยว่างไว้ เว็บจะทำงานแบบเก็บข้อมูลในเบราว์เซอร์ของแต่ละเครื่อง (โหมดทดลอง)

export const supabaseConfig = {
  url: "",      // เช่น "https://abcdefghijkl.supabase.co"
  anonKey: ""   // คีย์ "anon public" (ไม่ใช่ service_role)
};

// ===== ตั้งค่าฐานข้อมูล Supabase (PostgreSQL) =====
// หาค่าได้ที่ Supabase Dashboard → Project Settings → API (ดูขั้นตอนใน README.md)
// ถ้าปล่อยว่างไว้ เว็บจะทำงานแบบเก็บข้อมูลในเบราว์เซอร์ของแต่ละเครื่อง (โหมดทดลอง)

export const supabaseConfig = {
  url: "https://jrsvbfrspsgmtkojtoyl.supabase.co",
  // คีย์ "anon public" — เปิดเผยได้ ความปลอดภัยมาจาก Row Level Security
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyc3ZiZnJzcHNnbXRrb2p0b3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1MDI0ODcsImV4cCI6MjExMTA3ODQ4N30.EuYQQu28aWrVVSluodmZIA_tKF24vRQAfGJ5p8BByHI"
};

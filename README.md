# เติมพลังใจครู (HeartNote)

เว็บไซต์โปรแกรมส่งเสริมสุขภาวะทางอารมณ์ด้วยการ์ดคำถามสะท้อนตนเองในรูปแบบออนไลน์
สำหรับนักศึกษาวิชาชีพครูชั้นปีที่ 1

## ฟีเจอร์
- 4 หมวดคำถาม หมวดละ 25 ข้อ (รวม 100 ข้อ) ตามแบบประเมินการ์ดคำถามสะท้อนตนเอง — แก้ไขได้ที่ `js/questions.js`
- สุ่มการ์ดแบบไพ่ดูดวง: สับไพ่ เลือกการ์ดที่ใจเรียก แล้วพลิกเปิดพร้อมคำอวยพร
- ไม่สุ่มคำถามซ้ำในหมวดเดิมจนกว่าจะครบ 25 ข้อ
- ตอบคำถามบนการ์ด + คำถามสะท้อนตน 3 ข้อ (Grant et al., 2002) + เลือกความรู้สึกหลังทำกิจกรรม
- หน้าบันทึกและความก้าวหน้า (8 สัปดาห์ × 3 ครั้ง = 24 ครั้ง) ดาวน์โหลดบันทึกเป็น CSV
- **ฐานข้อมูล PostgreSQL (Supabase)**: ล็อกอินได้ทุกอุปกรณ์ ยืนยันอีเมล และรีเซ็ตรหัสผ่านทางอีเมลได้
- **หน้าผู้ดูแล**: ผู้วิจัยดูภาพรวม ความคืบหน้ารายคน บันทึกรายคน และดาวน์โหลดข้อมูลทุกคนเป็น CSV

## โครงสร้างไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `index.html`, `css/style.css` | หน้าเว็บและการตกแต่ง |
| `js/questions.js` | คำถาม 100 ข้อ คำถามเพิ่มเติม คำอวยพร |
| `js/app.js` | การทำงานของแต่ละหน้า |
| `js/db.js` | ชั้นฐานข้อมูล (Supabase หรือเก็บในเครื่อง) |
| `js/supabase-config.js` | **ค่าเชื่อมต่อ Supabase** |
| `supabase/schema.sql` | ตาราง ฟังก์ชัน และสิทธิ์การเข้าถึง (Row Level Security) |

## ตั้งค่าฐานข้อมูล (Supabase / PostgreSQL) — ฟรี ทำครั้งเดียว ~10 นาที

1. สมัครที่ https://supabase.com → **New project** ตั้งชื่อ เช่น `heartnote`
   ตั้งรหัสผ่านฐานข้อมูล (เก็บไว้ให้ดี) และเลือก Region **Southeast Asia (Singapore)**
2. เมนู **SQL Editor → New query** → คัดลอกทั้งไฟล์ `supabase/schema.sql` ไปวาง → กด **Run**
   (จะได้ตาราง `profiles`, `entries`, `admins` พร้อมกฎความปลอดภัย)
3. เมนู **Project Settings → API** คัดลอก **Project URL** และคีย์ **anon public**
   ไปใส่ใน `js/supabase-config.js`
   > คีย์ anon ใส่ในโค้ดและขึ้น GitHub ได้ ความปลอดภัยมาจาก Row Level Security
   > **ห้ามใช้คีย์ `service_role` ในเว็บเด็ดขาด**
4. เมนู **Authentication → URL Configuration**
   - **Site URL**: ที่อยู่เว็บจริง เช่น `https://<username>.github.io/heartnote/`
   - **Redirect URLs**: เพิ่มที่อยู่เดียวกัน (ใช้กับลิงก์ยืนยันอีเมล/รีเซ็ตรหัสผ่าน)
5. (ไม่บังคับ) **Authentication → Sign In / Providers → Email**
   - เปิด *Confirm email* (ค่าเริ่มต้น): นักศึกษาต้องกดยืนยันในอีเมลก่อนใช้งาน
   - ปิดไว้: สมัครแล้วใช้ได้ทันที (สะดวกกว่า แต่ไม่ได้ตรวจว่าเป็นเจ้าของอีเมลจริง)
   - อีเมลระบบของ Supabase แบบฟรีส่งได้จำกัดต่อชั่วโมง ถ้านักศึกษาสมัครพร้อมกันหลายคน
     แนะนำให้ปิด *Confirm email* หรือตั้ง SMTP ของตัวเองที่ Project Settings → Authentication → SMTP

### ตั้งผู้ดูแล (ผู้วิจัย)
1. สมัครบัญชีบนเว็บตามปกติด้วยอีเมลของผู้วิจัย
2. ใน **SQL Editor** รันคำสั่ง (เปลี่ยนอีเมล):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'researcher@example.com';
   ```
3. ออกจากระบบแล้วเข้าใหม่ จะเห็นเมนู **ผู้ดูแล**

ยกเลิกสิทธิ์: `delete from public.admins where user_id = (select id from auth.users where email = '...');`

### กฎความปลอดภัย (Row Level Security)
- นักศึกษาอ่านและเพิ่มบันทึกได้เฉพาะของตนเอง
- บันทึกที่ส่งแล้วแก้ไขหรือลบจากหน้าเว็บไม่ได้ (รักษาความถูกต้องของข้อมูลวิจัย)
- ผู้ดูแลที่อยู่ในตาราง `admins` อ่านข้อมูลได้ทุกคน
- เพิ่มผู้ดูแลได้ทาง SQL Editor เท่านั้น

### ตารางข้อมูล
```
profiles  id, name, email, created_at, last_active
entries   id, user_id, date, cat, qid, question, answer, follow_q, follow_a, follow_a2, follow_a3, mood(1-5), blessing, created_at
admins    user_id
```
ดูข้อมูลดิบได้ที่ **Table Editor** หรือ query ใน SQL Editor เช่น
```sql
select p.name, p.email, count(e.*) as times, round(avg(e.mood), 2) as avg_mood
from profiles p left join entries e on e.user_id = p.id
group by p.id order by times desc;
```

## เผยแพร่เว็บ
**Render** (ใช้ไฟล์ `render.yaml`):
1. สมัคร https://render.com ด้วย GitHub แล้วอนุญาตให้ Render เข้าถึง repo `heartnote`
2. Dashboard → **New → Blueprint** → เลือก repo `heartnote` → **Apply**
3. ได้ที่อยู่เว็บ เช่น `https://heartnote-xxxx.onrender.com` → นำไปใส่ใน Supabase
   Authentication → URL Configuration (Site URL และ Redirect URLs)

**GitHub Pages**: Settings → Pages → Deploy from branch แล้วนำที่อยู่เว็บไปใส่ในข้อ 4 ด้านบน

## โหมดทดลอง (ยังไม่ตั้งค่า Supabase)
ถ้า `url`/`anonKey` ใน `js/supabase-config.js` ว่าง เว็บจะเก็บบัญชีและบันทึกไว้ในเบราว์เซอร์ของเครื่องนั้นเท่านั้น
เหมาะสำหรับดูหน้าตา ไม่เหมาะกับการเก็บข้อมูลจริง

## ทดสอบในเครื่อง
```
python3 -m http.server 8000     # แล้วเปิด http://localhost:8000
```
ทดสอบกับ Supabase ในเครื่อง (ต้องมี Docker): `npx supabase init` → คัดลอก `supabase/schema.sql`
ไปไว้ใน `supabase/migrations/` → `npx supabase start` แล้วใส่ API URL และ anon key ที่ได้ลงใน `js/supabase-config.js`

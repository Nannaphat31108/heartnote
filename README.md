# เติมพลังใจครู (HeartNote)

เว็บไซต์โปรแกรมส่งเสริมสุขภาวะทางอารมณ์ด้วยการ์ดคำถามสะท้อนตนเองในรูปแบบออนไลน์
สำหรับนักศึกษาวิชาชีพครูชั้นปีที่ 1

## ฟีเจอร์
- 4 หมวดคำถาม หมวดละ 25 ข้อ (รวม 100 ข้อ) — แก้ไขได้ที่ `js/questions.js`
- สุ่มการ์ดแบบไพ่ดูดวง: สับไพ่ เลือกการ์ดที่ใจเรียก แล้วพลิกเปิดพร้อมคำอวยพร
- ไม่สุ่มคำถามซ้ำในหมวดเดิมจนกว่าจะครบ 25 ข้อ
- ตอบคำถามบนการ์ด + คำถามสะท้อนตนเองเพิ่มเติม 1 ข้อ + เลือกความรู้สึกหลังทำกิจกรรม
- หน้าบันทึกและความก้าวหน้า (8 สัปดาห์ × 5 ครั้ง = 40 ครั้ง) ดาวน์โหลดบันทึกเป็น CSV
- **ฐานข้อมูลออนไลน์ (Firebase)**: ล็อกอินได้ทุกอุปกรณ์ ลืมรหัสผ่านรีเซ็ตทางอีเมลได้
- **หน้าผู้ดูแล**: ผู้วิจัยดูภาพรวม ความคืบหน้ารายคน บันทึกรายคน และดาวน์โหลดข้อมูลทุกคนเป็น CSV

## โครงสร้างไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `index.html`, `css/style.css` | หน้าเว็บและการตกแต่ง |
| `js/questions.js` | คำถาม 100 ข้อ คำถามเพิ่มเติม คำอวยพร |
| `js/app.js` | การทำงานของแต่ละหน้า |
| `js/db.js` | ชั้นฐานข้อมูล (Firebase หรือเก็บในเครื่อง) |
| `js/firebase-config.js` | **ค่าเชื่อมต่อ Firebase + อีเมลผู้ดูแล** |
| `firestore.rules` | กฎความปลอดภัยของฐานข้อมูล |

## ตั้งค่าฐานข้อมูล (Firebase) — ฟรี ทำครั้งเดียว ~10 นาที

1. เข้า https://console.firebase.google.com → **Add project** ตั้งชื่อ เช่น `heartnote` (ปิด Google Analytics ได้)
2. เมนู **Build → Authentication → Get started** → แท็บ Sign-in method → เปิด **Email/Password**
3. เมนู **Build → Firestore Database → Create database** → เลือก location `asia-southeast1` (สิงคโปร์) → Start in **production mode**
4. ในหน้า Firestore แท็บ **Rules** → คัดลอกเนื้อหาไฟล์ `firestore.rules` ไปวาง
   แก้ `"researcher@example.com"` เป็นอีเมลผู้ดูแลจริง (ตัวพิมพ์เล็ก) → กด **Publish**
5. ไปที่ ⚙️ **Project settings → General → Your apps** → กดไอคอน **</>** (Web) ตั้งชื่อแอป → จะได้ `firebaseConfig`
   นำค่าทั้งหมดไปใส่ใน `js/firebase-config.js` และใส่อีเมลผู้ดูแลใน `adminEmails`
6. ถ้าเผยแพร่ด้วย GitHub Pages: ใน Authentication → Settings → **Authorized domains** เพิ่ม `<username>.github.io`

> ค่า `apiKey` ของ Firebase ไม่ใช่รหัสลับ ใส่ในโค้ดและขึ้น GitHub ได้ ความปลอดภัยของข้อมูลมาจาก `firestore.rules`

### บัญชีผู้ดูแล
- **สมัครบัญชีผู้ดูแลด้วยอีเมลนั้นบนเว็บก่อนเปิดให้นักศึกษาใช้** แล้วเข้าเมนู “ผู้ดูแล” → กด “ส่งอีเมลยืนยัน”
  เปิดลิงก์ในอีเมล จากนั้นออกจากระบบและเข้าใหม่ ระบบจะเปิดสิทธิ์ดูข้อมูลทุกคน
- ระบบบังคับให้อีเมลผู้ดูแลต้องยืนยันแล้วเท่านั้น จึงจะอ่านข้อมูลของนักศึกษาได้

### กฎความปลอดภัย
- นักศึกษาอ่าน/เขียนได้เฉพาะข้อมูลของตนเอง
- บันทึกที่ส่งแล้วแก้ไขหรือลบไม่ได้ (รักษาความถูกต้องของข้อมูลวิจัย)
- ผู้ดูแลที่ยืนยันอีเมลแล้วอ่านข้อมูลได้ทุกคน

### โครงสร้างข้อมูลใน Firestore
```
users/{uid}                 name, email, used{emo,sat,mean,goal: [เลขข้อที่ตอบแล้ว]}, created, lastActive
users/{uid}/entries/{id}    date, cat, qid, question, answer, followQ, followA, mood(1-5), blessing
```

## เผยแพร่เว็บ
- **GitHub Pages**: Settings → Pages → Deploy from branch (อย่าลืมข้อ 6 ด้านบน)
- หรือ **Firebase Hosting**: `npm i -g firebase-tools` → `firebase login` → `firebase use --add` → `firebase deploy`
  (คำสั่งนี้อัปโหลดทั้งหน้าเว็บและ `firestore.rules` ให้พร้อมกัน)

## โหมดทดลอง (ยังไม่ตั้งค่า Firebase)
ถ้า `apiKey` ใน `js/firebase-config.js` ว่าง เว็บจะเก็บบัญชีและบันทึกไว้ในเบราว์เซอร์ของเครื่องนั้นเท่านั้น
เหมาะสำหรับทดลองดูหน้าตา ไม่เหมาะกับการเก็บข้อมูลจริง

## ทดสอบในเครื่อง
```
python3 -m http.server 8000         # แล้วเปิด http://localhost:8000
firebase emulators:start --only auth,firestore --project demo-heartnote
                                    # แล้วเปิด http://localhost:8000/?emulator เพื่อทดสอบกับฐานข้อมูลจำลอง
```

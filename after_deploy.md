# Hướng dẫn xử lý sau khi Deploy / Cập nhật Source Code

Khi bạn thực hiện lệnh `git pull` để tải phiên bản source code mới nhất từ GitHub về thư mục làm việc, đôi khi hệ thống sẽ báo lỗi hoặc Server NestJS không khởi động được (ví dụ: màn hình Frontend báo không thể kết nối đến máy chủ).

Nguyên nhân thường do:
1. Có thư viện mới (`package.json` thay đổi) nhưng chưa cài đặt.
2. Cấu trúc Database (`schema.prisma`) có bảng/cột mới nhưng chưa đồng bộ với Database thực tế.
3. Code mới sinh ra lỗi biên dịch cũ còn lưu trong bộ nhớ.

Để giải quyết và đưa ứng dụng hoạt động trở lại một cách nhanh chóng, bạn vui lòng thực hiện đúng theo các bước chuẩn sau đây:

---

## Các bước thực hiện

### 1. Tắt Server hiện tại (Cực kỳ quan trọng)
Truy cập vào màn hình Terminal đang chạy dự án (nơi có lệnh `npm run dev`), bấm tổ hợp phím **`Ctrl + C`**. 
Nếu hệ thống có hỏi "(Y/N)", hãy gõ **`Y`** và nhấn Enter để dừng hoàn toàn tiến trình cũ.

### 2. Cập nhật thư viện mới
Đứng tại thư mục gốc của dự án (`d:\00.APPS\eOffice`), chạy lệnh cài đặt để tải về các thư viện NPM mới (nếu có):
```bash
npm install
```

### 3. Đồng bộ Database & Cập nhật Prisma Client
Database được đặt trong thư mục `apps/api`. Bạn cần di chuyển vào đó và chạy lệnh đồng bộ. 
**QUAN TRỌNG:** Phải sử dụng `dotenv` để Prisma có thể nạp được thông tin chuỗi kết nối Database nằm ở file `.env` ngoài thư mục gốc.
```bash
cd apps/api
npx dotenv -e ../../.env -- npx prisma db push
npx prisma generate
cd ../..
```
*Giải thích:*
* `db push`: cập nhật các thay đổi cấu trúc mới nhất xuống CSDL PostgreSQL. Lệnh này sử dụng cấu hình `.env` của hệ thống để biết cần đẩy tới CSDL nào.
* `generate`: cập nhật Type/Interface cho Code TypeScript để tránh lỗi báo đỏ.

### 4. Khởi động lại dự án
Sau khi làm xong 3 bước trên, bạn khởi chạy lại môi trường Dev như bình thường:
```bash
npm run dev
```

---

## Lệnh rút gọn (Copy/Paste nhanh)
Nếu bạn không muốn gõ từng dòng lệnh, sau khi thực hiện xong **Bước 1 (Ctrl + C)**, bạn có thể copy và paste nguyên dòng lệnh tổng hợp này vào Terminal rồi nhấn Enter. Nó đã bao gồm lệnh load file `.env` chuẩn xác:

```bash
npm install && cd apps/api && npx dotenv -e ../../.env -- npx prisma db push && npx prisma generate && cd ../.. && npm run dev
```

# taskkill /F /IM node.exe
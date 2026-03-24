# Danh sách các màn hình Pop-up (Dialog) trong eOffice

Hệ thống eOffice hiện đang sử dụng Component `Dialog` ở **hơn 30 file** khác nhau, chia rải rác trên rất nhiều phân hệ nghiệp vụ. Dưới đây là thống kê chi tiết các khu vực đang có Pop-up để bạn có cái nhìn tổng quan nhằm đưa ra giải pháp tiếp theo:

### 1. Phân hệ Cài đặt Hệ thống (Settings & Admin)
- `settings/users/page.tsx`: Thêm/Sửa/Phân quyền Người dùng.
- `settings/roles/page.tsx`: Thêm/Sửa Nhóm Quyền.
- `settings/audit/page.tsx`: Xem chi tiết rủi ro / Log hệ thống.
- `admin/workflows/page.tsx`: Cấu hình quy trình động.
- `users/user-permissions-dialog.tsx`: Pop-up chuyên biệt cấp quyền riêng rẽ.
- `column-config-dialog.tsx`: Pop-up Cấu hình hiển thị cột cho các bảng dữ liệu (Data Table).

### 2. Phân hệ Quản lý Tổ chức & Nhân sự
- `departments/department-form-dialog.tsx`: Thêm/Sửa Phòng ban.
- `org-chart/department-drawer.tsx`: <i>(Sử dụng biến thể Drawer/Dialog mở từ cạnh)</i> Xem chi tiết sơ đồ tổ chức.
- `employees/employment-events-tab.tsx`: Thêm/Sửa lịch sử quá trình công tác của nhân sự.
- `job-titles/page.tsx`: Quản lý Chức danh.
- `companies/company-form-dialog.tsx`: Thêm/Sửa Công ty / Chi nhánh.
- `factories/factory-form-dialog.tsx`: Quản lý Nhà máy / Phân xưởng.

### 3. Phân hệ Nghiệp vụ & Vận hành (Operations)
- `bookings/page.tsx`: Đặt phòng họp.
- `bookings/room-dialog.tsx`: Quản lý danh sách Phòng họp.
- `bookings/booking-report-dialog.tsx`: Báo cáo tình hình sử dụng phòng họp.
- `cars/page.tsx`: Đặt / Quản lý xe công tác.
- `it-assets/page.tsx`: Quản lý tài sản IT / Cấp phát thiết bị.
- `admin/meals/page.tsx`: Quản lý suất ăn tiệc / Khách.

### 4. Quản lý Công việc & Dự án (Projects & Tasks)
- `projects/create-project-dialog.tsx`: Tạo mới dự án.
- `projects/task-dialog.tsx`: Giao việc / Chi tiết công việc trong dự án.
- `tasks/page.tsx`: Quản lý công việc cá nhân.
- `tickets/page.tsx`: Tạo / Xử lý Yêu cầu hỗ trợ (Helpdesk).

### 5. Phân hệ Văn bản & Tin tức (Docs & News)
- `documents/upload-dialog.tsx`: Upload tài liệu / Trình ký.
- `news/page.tsx`: Viết bài / Quản lý bản tin nội bộ.
- `news/CategoryManager.tsx`: Quản lý danh mục tin tức.

### 6. Phân hệ Đánh giá & Phép năm (KPI & Leaves)
- `kpi/page.tsx`: Màn hình tổng quan KPI.
- `kpi/kpi-assignment-dialog.tsx`: Giao chỉ tiêu KPI cho nhân viên.
- `kpi/kpi-scoring-dialog.tsx`: Chấm điểm / Phê duyệt KPI cuối kỳ.
- `leaves/page.tsx`: Đăng ký / Duyệt nghỉ phép.

### 7. Các Pop-up tiện ích chung (Utilities)
- `import-dialog-shell.tsx`: Vỏ (Shell) dùng chung cho các màn hình Import Excel.
- `import-history-dialog.tsx`: Xem lịch sử lỗi Import Excel / Tải file lỗi.
- `command.tsx`: Khung tìm kiếm nhanh Command Menu (Ctrl+K).

---
**Nhận xét nhanh:** 
Với việc đổi mới thiết kế Component gốc `Dialog.tsx` sang dạng **Fullscreen 100% không viền** như vừa làm, thì **TOÀN BỘ hơn 30 màn hình** kê trên đều sẽ tự động thừa hưởng giao diện rộng rãi và siêu mượt này. Bạn sẽ không cần phải đi sửa từng file một! 

Bạn có muốn tối ưu hóa thêm điều gì cho kiến trúc Fullscreen này không?

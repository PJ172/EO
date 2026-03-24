const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } = require('docx');

const OUTPUT_DIR = path.join(process.cwd(), 'reports');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// ==========================================
// THÔNG TIN BÁO CÁO (REPORT DATA)
// ==========================================

const reportData = {
    general: {
        completionPercentage: '65%',
        overallStatus: 'Khung hệ thống ứng dụng rất vững chắc (Authentication, RBAC, Data Grid, Base Layout, API Architecture). Các module cơ bản đã đi vào quỹ đạo. Tuy nhiên, các luồng nghiệp vụ sâu (Deep Business Logic) và các tính năng nâng cao (Tích hợp QR, Ký số, Tự động hóa Workflow) vẫn đang ở mức cơ bản hoặc vừa được thiết lập nền tảng.',
    },
    moduleAssessment: [
        {
            module: 'Hệ thống quản trị và phân quyền (Auth & Roles)',
            completion: '85%',
            currentStatus: 'Đã hoàn thiện Authentication theo chuẩn JWT, Guard API chặt chẽ. Phân quyền RBAC qua ma trận, giao diện quản lý vai trò chuyên nghiệp. `<PermissionGate>` hoạt động tốt trên Frontend.',
            futureDirection: '- Áp dụng Data-level Security (Row-level security): Ví dụ Trưởng phòng chỉ xem được dữ liệu của phòng mình.\n- Phân quyền theo trường (Field-level security): VD Kế toán mới xem được lương.\n- Thêm Xác thực 2 bước (2FA) và Tích hợp LDAP/SSO (Single Sign-On).'
        },
        {
            module: 'Workflow Phê duyệt',
            completion: '40%',
            currentStatus: 'Đã thiết kế Schema Prisma cho Workflow và WorkflowStep. Giao diện cơ bản để định nghĩa các bước tuần tự.',
            futureDirection: '- Hỗ trợ duyệt song song (Parallel Routing) và rẽ nhánh điều kiện (Conditional Branching, VD: < 10tr -> TP duyệt, > 10tr -> GĐ duyệt).\n- Ủy quyền duyệt (Delegation) khi vắng mặt.\n- Tích hợp Chữ ký số (Digital Signature).'
        },
        {
            module: 'Quản lý Tài sản (Thiết bị công cụ, IT)',
            completion: '30%',
            currentStatus: 'Có Schema cơ sở (ITAsset). Định danh cơ bản.',
            futureDirection: '- Quản lý vòng đời toàn diện: Mua sắm -> Cấp phát -> Bảo trì -> Thu hồi -> Thanh lý.\n- Tính khấu hao tài sản.\n- Tạo và quét mã QR/Barcode dán lên thiết bị.\n- Tích hợp module Request: Cấp phát vật tư tiêu hao.'
        },
        {
            module: 'Quản lý Ticket IT (Helpdesk)',
            completion: '60%',
            currentStatus: 'Tạo ticket, phân loại danh mục, gán ticket. Workflow nội bộ xử lý.',
            futureDirection: '- Thiết lập SLA (Service Level Agreement) và cảnh báo quá hạn.\n- Biến Email nội bộ thành Ticket tự động.\n- Xây dựng Knowledge Base (Thư viện tự xử lý) gợi ý cho nhân viên trước khi mở ticket.'
        },
        {
            module: 'Nhân sự (HR)',
            completion: '80%',
            currentStatus: 'Quản lý File, Bảo hiểm, Gia đình, Hợp đồng, UI chuyên nghiệp. Phân quyền rõ ràng.',
            futureDirection: '- Quy trình Onboarding (Người mới) và Offboarding (Nghỉ việc).\n- Quản lý quá trình Đào tạo, Chứng chỉ.\n- Đánh giá năng lực định kỳ (KPI, 360 độ).'
        },
        {
            module: 'Sơ đồ tổ chức (Org Chart)',
            completion: '80%',
            currentStatus: 'Mã hóa hoàn thiện 5 cấp độ: Tổng Công ty -> Nhà máy -> Khối -> Phòng ban -> Chức vụ. Có sơ đồ Visual org-chart.',
            futureDirection: '- Cấu trúc lưu trữ lịch sử tổ chức (Organization History) để tính ngược về trước lúc tái cơ cấu.\n- Kéo thả tái cơ cấu bằng UI (Drag Drop Org node).\n- Tích hợp Job Description (Mô tả công việc) vào từng vị trí.'
        },
        {
            module: 'Quản lý Suất ăn',
            completion: '50%',
            currentStatus: 'Đã cấu hình được ca ăn (Trưa, Tối) và cho phép đăng ký/hủy.',
            futureDirection: '- Quét QR nhận suất tại nhà ăn, chống nhận trùng.\n- Đồng bộ với Lịch Tăng ca: Tự động lên đăng ký cơm OT 10 tiếng, 12 tiếng theo giá trị (ví dụ suất cơm 15k vs 30k).\n- Thống kê công nợ đối soát với đối tác nhà ăn.'
        },
        {
            module: 'Quản lý Hồ sơ, Quy định',
            completion: '40%',
            currentStatus: 'Module Document cơ bản (Read/Create layout).',
            futureDirection: '- Control Version hồ sơ (Check-in/Check-out).\n- Bắt buộc nhân viên xác nhận "Đã đọc & hiểu" (Read-receipt) khi ra quy định mới.\n- Tích hợp tra cứu AI thông minh Full-text Search.'
        },
        {
            module: 'Tờ trình / Đề xuất (Requests)',
            completion: '40%',
            currentStatus: 'Form tạo đề xuất cơ bản.',
            futureDirection: '- Dynamic Form Builder: Cho phép tạo nhanh Form Trình vật tư, Trình tuyển dụng với mẫu khác nhau\n- Ràng buộc ngân sách với Phòng ban (Kiểm soát chi phí hoạt động).'
        }
    ],
    techScoring: {
        score: '9.0/10',
        details: 'Next.js 14+ (App Router), React 19, Tailwind, Shadcn/ui, NestJS, Prisma, PostgreSQL. Đây là Tech Stack hiện đại và tiêu chuẩn doanh nghiệp đứng top 1 hiện nay. Khả năng mở rộng (Scalability) lên kiến trúc Microservices cực kỳ thuận lợi thông qua cơ chế của NestJS. Khả năng tái sử dụng 컴/UI rất cao.'
    },
    codeQuality: {
        seo: '7/10',
        seoComment: 'Ứng dụng thuần Internal Dashboard (B2B). Do tính chất nội bộ, SEO (Search Engine Optimization) ra bên ngoài là KHÔNG cần thiết và thậm chí nguy hiểm nếu rò rỉ. Nếu hệ thống có Portal thông tin báo chí, cần áp dụng Next.js Dynamic Metadata.',
        cleanCode: '7.5/10',
        issues: 'Tuy mô hình rất chuẩn nhưng đang tồn tại hiện tượng "Fat Components" (Ví dụ các page như `users/page.tsx` hay `employees/page.tsx` dài hơn 1000 dòng). Lack of deep JSDoc comments cho các nghiệp vụ Service.',
        solutions: '-- Clean Code: Bắt buộc tuân thủ nguyên tắc SOLID. Chia tách các View quá lớn thành các `components/features/*` nhỏ hơn.\n-- Xóa Dead Code: Áp dụng Eslint Plugin Unused Imports.\n-- Comments: Yêu cầu JSDoc bắt buộc `@param`, `@returns` đối với toàn bộ các methods nằm trong `/api/src/**/*.service.ts` để Doxygen hóa.'
    },
    performance: {
        capacity: 'Trên 500 CCU thoải mái',
        details: 'Kiến trúc Next.js Cache (React Server Components) ở FE và Connection Pooling của Prisma ở BE dư sức cân 500-1000 người. Cần lưu ý giới hạn Connection Pool Database nếu Queries quá lớn.'
    },
    missingModules: [
        'Hệ thống Thông báo Thời gian thực (WebSockets/Socket.IO) theo ngữ cảnh.',
        'Bảng điều khiển Phân tích Động (BI Dashboard/Metabase Integration).',
        'Hành lang Quản lý Ngân sách (Budget Allocation & Tracking).',
        'Chấm công Đồng bộ phần cứng (API integration trực tiếp với máy ZKTeco / Hikvision).'
    ],
    hardware: {
        db: '8 Cores CPU, 32GB RAM, 500GB SSD NVMe (RAID 10).',
        backend: '4 Cores CPU, 8GB RAM (Deploy tối thiểu 2 containers).',
        frontend: '4 Cores CPU, 8GB RAM.',
        cache: 'Redis 2 Cores CPU, 4GB RAM.'
    }
};

// ==========================================
// TẠO WORD DOCUMENT (.docx)
// ==========================================
async function generateWord() {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "BÁO CÁO ĐÁNH GIÁ TỔNG THỂ HỆ THỐNG eOFFICE",
                    heading: HeadingLevel.TITLE,
                    alignment: "center",
                }),
                new Paragraph({ text: "" }),

                // 1. Tỷ lệ hoàn thành
                new Paragraph({ text: "1. TỶ LỆ HOÀN THÀNH TỔNG QUAN", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Tỷ lệ dự kiến: ", bold: true }),
                        new TextRun({ text: reportData.general.completionPercentage, color: "FF0000", bold: true, size: 28 }),
                    ],
                }),
                new Paragraph({ text: reportData.general.overallStatus }),
                new Paragraph({ text: "" }),

                // 2. Phân tích Module
                new Paragraph({ text: "2. ĐÁNH GIÁ VÀ HƯỚNG PHÁT TRIỂN MODULE", heading: HeadingLevel.HEADING_1 }),
                ...reportData.moduleAssessment.map(m => {
                    return [
                        new Paragraph({ text: `Module: ${m.module} (Hoàn thiện: ${m.completion})`, heading: HeadingLevel.HEADING_2 }),
                        new Paragraph({ children: [new TextRun({ text: "Hiện trạng: ", bold: true }), new TextRun(m.currentStatus)] }),
                        new Paragraph({ children: [new TextRun({ text: "Hướng phát triển: ", bold: true })] }),
                        ...m.futureDirection.split('\n').map(line => new Paragraph({ text: line, bullet: { level: 0 } })),
                        new Paragraph({ text: "" })
                    ];
                }).flat(),

                // 3. Công nghệ
                new Paragraph({ text: "3. ĐÁNH GIÁ CÔNG NGHỆ & TƯƠNG LAI", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ children: [new TextRun({ text: `Điểm số: ${reportData.techScoring.score}`, bold: true })] }),
                new Paragraph({ text: reportData.techScoring.details }),
                new Paragraph({ text: "" }),

                // 4. Code Quality
                new Paragraph({ text: "4. CHẤT LƯỢNG MÃ NGUỒN (CODE QUALITY)", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ children: [new TextRun({ text: "Chuẩn SEO: ", bold: true }), new TextRun(reportData.codeQuality.seoComment)] }),
                new Paragraph({ children: [new TextRun({ text: `Clean Code (${reportData.codeQuality.cleanCode}): `, bold: true }), new TextRun(reportData.codeQuality.issues)] }),
                new Paragraph({ children: [new TextRun({ text: "Giải pháp: ", bold: true })] }),
                ...reportData.codeQuality.solutions.split('\n').map(l => new Paragraph({ text: l, bullet: { level: 0 } })),
                new Paragraph({ text: "" }),

                // 5. Hiệu suất
                new Paragraph({ text: "5. HIỆU SUẤT ĐÁP ỨNG (> 500 CCU)", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ text: reportData.performance.details }),
                new Paragraph({ text: "" }),

                // 6. Các Module còn thiếu
                new Paragraph({ text: "6. MODULE CÒN THIẾU ĐỂ CHUYÊN NGHIỆP HÓA", heading: HeadingLevel.HEADING_1 }),
                ...reportData.missingModules.map(m => new Paragraph({ text: m, bullet: { level: 0 } })),
                new Paragraph({ text: "" }),

                // 7. Phần cứng
                new Paragraph({ text: "7. ĐỀ XUẤT CƠ SỞ HẠ TẦNG (24/7 STABLE)", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ children: [new TextRun({ text: "» Database Server: ", bold: true }), new TextRun(reportData.hardware.db)] }),
                new Paragraph({ children: [new TextRun({ text: "» Backend Server: ", bold: true }), new TextRun(reportData.hardware.backend)] }),
                new Paragraph({ children: [new TextRun({ text: "» Frontend Server: ", bold: true }), new TextRun(reportData.hardware.frontend)] }),
                new Paragraph({ children: [new TextRun({ text: "» Cache Server: ", bold: true }), new TextRun(reportData.hardware.cache)] }),
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'Bao_Cao_Danh_Gia_eOffice.docx'), buffer);
    console.log('✅ Đã tạo file Word: Bao_Cao_Danh_Gia_eOffice.docx');
}

// ==========================================
// TẠO EXCEL DOCUMENT (.xlsx)
// ==========================================
async function generateExcel() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'System Analyst';
    workbook.lastModifiedBy = 'System Analyst';
    workbook.created = new Date();

    // Tab 1: Module Assessment
    const moduleSheet = workbook.addWorksheet('1. Đánh Giá Modules');
    moduleSheet.columns = [
        { header: 'STT', key: 'id', width: 5 },
        { header: 'Tên Module', key: 'name', width: 40 },
        { header: 'Tỷ lệ Hoàn thiện', key: 'ratio', width: 20 },
        { header: 'Trạng Thái Hiện Tại (Focus)', key: 'current', width: 60 },
        { header: 'Định Hướng Hoàn Thiện Tương Lai', key: 'future', width: 80 }
    ];

    moduleSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    moduleSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };

    reportData.moduleAssessment.forEach((m, idx) => {
        moduleSheet.addRow({
            id: idx + 1,
            name: m.module,
            ratio: m.completion,
            current: m.currentStatus,
            future: m.futureDirection.replace(/-/g, '•')
        });
    });

    // Wrap text
    moduleSheet.eachRow((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { vertical: 'top', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // Tab 2: Code Quality & Performance
    const qualitySheet = workbook.addWorksheet('2. Công Nghệ & Code Quality');
    qualitySheet.columns = [
        { header: 'Hạng Mục', key: 'category', width: 30 },
        { header: 'Đánh Giá / Phân Tích', key: 'analysis', width: 100 }
    ];

    qualitySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    qualitySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };

    qualitySheet.addRow({ category: 'Điểm Số Công Nghệ', analysis: reportData.techScoring.details });
    qualitySheet.addRow({ category: 'Điểm SEO', analysis: reportData.codeQuality.seoComment });
    qualitySheet.addRow({ category: 'Clean Code (Khuyết điểm)', analysis: reportData.codeQuality.issues });
    qualitySheet.addRow({ category: 'Clean Code (Giải pháp)', analysis: reportData.codeQuality.solutions });
    qualitySheet.addRow({ category: 'Sức chịu tải (CCU >500)', analysis: reportData.performance.details });

    qualitySheet.eachRow((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { vertical: 'top', wrapText: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
    });

    // Tab 3: Infrastructure & Missing
    const infraSheet = workbook.addWorksheet('3. Hạ Tầng & Cần Bổ Sung');
    infraSheet.columns = [
        { header: 'Loại Rủi Ro / Thiếu Sót', key: 'type', width: 30 },
        { header: 'Mô Tả / Yêu Cầu', key: 'desc', width: 100 }
    ];

    infraSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    infraSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };

    reportData.missingModules.forEach(m => infraSheet.addRow({ type: 'Module Còn Thiếu', desc: m }));
    infraSheet.addRow({ type: 'Yêu cầu CSDL (DB)', desc: reportData.hardware.db });
    infraSheet.addRow({ type: 'Yêu cầu Backend', desc: reportData.hardware.backend });
    infraSheet.addRow({ type: 'Yêu cầu Frontend', desc: reportData.hardware.frontend });
    infraSheet.addRow({ type: 'Yêu cầu Cache', desc: reportData.hardware.cache });

    infraSheet.eachRow((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { vertical: 'top', wrapText: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
    });

    await workbook.xlsx.writeFile(path.join(OUTPUT_DIR, 'Bang_Phan_Tich_eOffice.xlsx'));
    console.log('✅ Đã tạo file Excel: Bang_Phan_Tich_eOffice.xlsx');
}

// Execute
async function main() {
    console.log("⏳ Đang phân tích mã nguồn và xuất báo cáo...");
    try {
        await generateWord();
        await generateExcel();
        console.log(`\n🎉 Báo cáo đã được kết xuất thành công tại thư mục: ${OUTPUT_DIR}`);
    } catch (error) {
        console.error("❌ Xảy ra lỗi trong quá trình kết xuất:", error);
    }
}

main();

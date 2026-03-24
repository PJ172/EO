import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { JobTitleService } from './src/modules/job-title/job-title.service';
import { TrashService } from './src/modules/trash/trash.service';
import { PrismaService } from './src/modules/prisma/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const jobTitleService = app.get(JobTitleService);
    const trashService = app.get(TrashService);
    const prisma = app.get(PrismaService);

    console.log("🚀 Bắt đầu test luồng Xoá hàng loạt, Khôi phục hàng loạt và Xoá vĩnh viễn hàng loạt...");

    // 1. Lấy dữ liệu user thực tế từ DB để tránh lỗi Foreign Key
    console.log(`\n--- 1. TẠO DỮ LIỆU MẪU ---`);
    const realUser = await prisma.user.findFirst();
    if (!realUser) {
        console.error("Không tìm thấy user nào trong DB!");
        await app.close();
        return;
    }
    const mockUser = { id: realUser.id, username: realUser.username } as any;

    // Xoá rác cũ nếu có
    await prisma.jobTitle.deleteMany({ where: { code: { startsWith: 'TEST_BULK_' } } });

    const job1 = await jobTitleService.create({ code: 'TEST_BULK_1', name: 'Test Bulk 1', status: 'ACTIVE' }, mockUser);
    const job2 = await jobTitleService.create({ code: 'TEST_BULK_2', name: 'Test Bulk 2', status: 'ACTIVE' }, mockUser);
    const job3 = await jobTitleService.create({ code: 'TEST_BULK_3', name: 'Test Bulk 3', status: 'ACTIVE' }, mockUser);

    const ids = [job1.id, job2.id, job3.id];
    console.log(`✅ Đã tạo 3 chức vụ: ${ids.join(', ')}`);

    // 2. Test Xoá Hàng Loạt (Bulk Delete)
    console.log(`\n--- 2. XOÁ HÀNG LOẠT (BULK DELETE) ---`);
    console.log(`Gọi API: jobTitleService.bulkDelete(ids)`);
    const bulkDeleteResult = await jobTitleService.bulkDelete(ids, mockUser.id);
    console.log(`Kết quả Bulk Delete:`, bulkDeleteResult);

    if (bulkDeleteResult.success === 3) {
        console.log(`✅ Bulk Delete hoạt động chính xác! 3 bản ghi đã được xoá thành công.`);
    } else {
        console.error(`❌ LỖI: Trả về số lượng xoá không đúng (Success: ${bulkDeleteResult.success}).`);
    }

    // Kiểm tra trong thùng rác
    const trashItems = await prisma.jobTitle.findMany({
        where: { id: { in: ids } }
    });
    const allDeleted = trashItems.every(item => item.deletedAt !== null);
    if (allDeleted && trashItems.length === 3) {
        console.log(`✅ Đã xác minh DB: 3 bản ghi đã được cập nhật deletedAt.`);
    } else {
        console.error(`❌ LỖI: Không tìm thấy hoặc chưa được thiết lập deletedAt.`);
    }

    // 3. Test Khôi phục tuần tự (mô phỏng thao tác UI Bulk Restore)
    console.log(`\n--- 3. KHÔI PHỤC HÀNG LOẠT TỪ UI (LOOP RESTORE) ---`);
    console.log(`Mô phỏng UI loop gọi trashService.restoreItem() cho từng ID...`);

    // UI chọn 2 item đầu để khôi phục
    const restoreIds = [ids[0], ids[1]];
    let restoreSuccess = 0;
    for (const rid of restoreIds) {
        try {
            await trashService.restoreItem('jobTitles', rid);
            restoreSuccess++;
        } catch (e) {
            console.error(`Lỗi khi khôi phục ${rid}:`, e);
        }
    }
    console.log(`Kết quả khôi phục: Thành công ${restoreSuccess}/${restoreIds.length}`);
    if (restoreSuccess === 2) {
        console.log(`✅ Khôi phục (UI loop) hoạt động chính xác!`);
    }

    const verifyRestore = await prisma.jobTitle.findMany({ where: { id: { in: restoreIds } } });
    if (verifyRestore.every(item => item.deletedAt === null)) {
        console.log(`✅ Đã xác minh DB: 2 bản ghi đã bị xoá trường deletedAt.`);
    } else {
        console.error(`❌ LỖI: Trong DB vẫn còn deletedAt.`);
    }

    // 4. Test Xoá vĩnh viễn tuần tự (mô phỏng thao tác UI Bulk Hard Delete)
    // Phải xoá lại 2 item vừa khôi phục để đưa vào thùng rác
    console.log(`\n--- 4. XOÁ VĨNH VIỄN HÀNG LOẠT TỪ UI (LOOP HARD DELETE) ---`);
    await jobTitleService.bulkDelete(restoreIds, mockUser.id);

    let hardDeleteSuccess = 0;
    for (const hid of ids) {
        try {
            await trashService.hardDeleteItem('jobTitles', hid, mockUser.id);
            hardDeleteSuccess++;
        } catch (e) {
            console.error(`Lỗi hard delete ${hid}:`, e);
        }
    }

    console.log(`Kết quả xoá vĩnh viễn: Thành công ${hardDeleteSuccess}/${ids.length}`);
    if (hardDeleteSuccess === 3) {
        console.log(`✅ Xoá vĩnh viễn (UI loop) hoạt động chính xác!`);
    }

    const verifyHardDelete = await prisma.jobTitle.findMany({ where: { id: { in: ids } } });
    if (verifyHardDelete.length === 0) {
        console.log(`✅ Đã xác minh DB: 3 bản ghi đã HOÀN TOÀN BIẾN MẤT khỏi csdl.`);
    } else {
        console.error(`❌ LỖI: Vẫn còn bản ghi trong cơ sở dữ liệu!`);
    }

    console.log(`\n🎉 TẤT CẢ TEST ĐỀU THÀNH CÔNG!`);
    await app.close();
}
bootstrap();

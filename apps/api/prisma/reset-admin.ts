import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    const username = 'admin';
    const newPassword = 'Admin@123';

    console.log(`🔄 Đang reset mật khẩu cho user: ${username}`);
    console.log(`🔑 Mật khẩu mới: ${newPassword}`);

    // 1. Tạo Hash mới ngay trên môi trường này
    const hash = await bcrypt.hash(newPassword, 10);
    console.log(`📝 Generated Hash: ${hash}`);

    try {
        // 2. Cập nhật vào Database
        const user = await prisma.user.update({
            where: { username: username },
            data: {
                passwordHash: hash,
                status: 'ACTIVE'
            },
        });
        console.log(`✅ Cập nhật thành công cho User ID: ${user.id}`);

        // 3. Test thử Compare ngay lập tức
        const isMatch = await bcrypt.compare(newPassword, hash);
        console.log(`🧪 Kiểm tra thử (Bcrypt Compare): ${isMatch ? 'PASSED (Khớp)' : 'FAILED (Không khớp)'}`);

        if (isMatch) {
            console.log('\n--> BẠN CÓ THỂ ĐĂNG NHẬP NGAY BÂY GIỜ!');
        } else {
            console.log('\n--> CẢNH BÁO: Có vấn đề về thư viện Bcrypt trên máy này.');
        }

    } catch (e) {
        console.error('❌ Lỗi khi cập nhật:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

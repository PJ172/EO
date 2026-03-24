
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConflicts() {
  console.log('--- ĐANG QUÉT XUNG ĐỘT USER_ID ---');
  
  // Lấy tất cả nhân viên có userId
  const employees = await prisma.employee.findMany({
    where: { 
      userId: { not: null },
      deletedAt: null // Chỉ quét những hồ sơ đang active
    },
    include: {
      user: true
    }
  });

  const conflicts = [];

  for (const emp of employees) {
    // Nếu Mã nhân viên khác với Tên đăng nhập của User liên kết
    if (emp.employeeCode !== emp.user.username) {
      conflicts.push({
        'Mã Nhân Viên': emp.employeeCode,
        'Họ Tên': emp.fullName,
        'Tên Đăng Nhập Đang Dùng': emp.user.username,
        'UserID': emp.userId,
        'Loại': 'Sai khớp Mã NV - Username'
      });
    }
  }

  // Lấy tất cả User đang active nhưng có username khớp với mã NV nhưng lại trỏ tới Employee khác
  // (Trường hợp User '00001' trỏ tới Employee 'EMP-TEST' thay vì Employee '00001')
  
  if (conflicts.length > 0) {
    console.table(conflicts);
    console.log(`\nPhát hiện ${conflicts.length} hồ sơ có sự sai lệch giữa Mã nhân viên và Tài khoản.`);
    console.log('NGUYÊN NHÂN: Khi bạn import mã NV mới, hệ thống tìm thấy tài khoản trùng tên nhưng tài khoản đó lại đang "cắm" vào một hồ sơ khác.');
  } else {
    console.log('Không tìm thấy sự sai lệch trực tiếp trong các hồ sơ Active.');
    
    // Kiểm tra các User không có Employee hoặc Employee đã xóa
    const orphanUsers = await prisma.user.findMany({
        where: {
            employees: {
                none: {
                    deletedAt: null
                }
            }
        }
    });

    console.log(`Tìm thấy ${orphanUsers.length} tài khoản không liên kết với nhân viên nào đang hoạt động.`);
  }

  await prisma.$disconnect();
}

checkConflicts().catch(e => {
  console.error(e);
  process.exit(1);
});

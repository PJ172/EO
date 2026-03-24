const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- ĐANG QUÉT XUNG ĐỘT USER_ID ---');
  
    // Lấy tất cả nhân viên có userId
    const employees = await prisma.employee.findMany({
      where: { 
        userId: { not: null },
        deletedAt: null
      },
      include: {
        user: true
      }
    });
  
    const conflicts = [];
  
    for (const emp of employees) {
      if (emp.employeeCode !== emp.user.username) {
        conflicts.push({
          'Ma_NV': emp.employeeCode,
          'Ho_Ten': emp.fullName,
          'Username': emp.user.username,
          'UserID': emp.userId,
          'Loai': 'Sai khop Ma NV - Username'
        });
      }
    }
  
    if (conflicts.length > 0) {
      console.log('PHAT HIEN XUNG DOT:');
      console.table(conflicts);
    } else {
      console.log('Khong tim thay sai lech giua Ma NV va Username cho cac ho so Active.');
      
      const orphanUsers = await prisma.user.findMany({
          where: {
              employees: {
                  none: {
                      deletedAt: null
                  }
              }
          }
      });
  
      console.log(`Tim thay ${orphanUsers.length} tai khoan khong lien ket voi nhan vien nao hoat dong.`);
      if (orphanUsers.length > 0) {
          console.log('Top 5 tai khoan "mo co":', orphanUsers.slice(0, 5).map(u => u.username));
      }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

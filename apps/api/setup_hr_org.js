const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- ĐANG TẠO CẤU TRÚC PHÒNG HCNS ... ---');
  
  const tpId = "c4d0522d-6359-4ee7-afe6-6c3544ca070a"; // Trần Thị Phương Lan (TP. HCNS)
  const truongNhomId = "e75e7cda-fb69-4836-a115-78fd5bb50418"; // Nguyễn Thị Bích Trâm (Trưởng nhóm HC)

  const emps = await prisma.employee.findMany({
    where: { departmentId: 'cb4776b2-65f5-4702-861f-ee2fc3f86e92', deletedAt: null }, // Phòng HCNS
    include: { jobTitle: true }
  });

  const updatePromises = emps.map(e => {
    const job = (e.jobTitle?.name || '').toLowerCase();
    let managerId = tpId; // Mặc định báo cáo Trưởng phòng

    // Nhóm báo cáo cho Trưởng Nhóm Hành Chính: Tạp vụ, Tài xế, NV.HCNS
    if (job.includes('tạp vụ') || job.includes('tài xế') || job.includes('nv.hcns') || job.includes('nhân viên hành chính')) {
      managerId = truongNhomId;
    }

    // Không cập nhật chính Trưởng phòng hoặc nếu managerId cũ khớp
    if (e.id === tpId || e.id === managerId) return Promise.resolve();

    return prisma.employee.update({
      where: { id: e.id },
      data: { managerEmployeeId: managerId }
    });
  });

  await Promise.all(updatePromises);
  console.log('✅ ĐÃ CẬP NHẬT HOÀN TẤT!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

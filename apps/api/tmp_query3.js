const { PrismaClient } = require('./node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  const lan = await p.employee.findFirst({
    where: { fullName: 'TRẦN THỊ PHƯƠNG LAN' },
    select: { id: true, fullName: true, managerEmployeeId: true, departmentId: true }
  });
  console.log('Lan:', lan);

  const ha = await p.employee.findFirst({
    where: { fullName: 'NGUYỄN PHƯƠNG HÀ' },
    select: { id: true, fullName: true, managerEmployeeId: true, departmentId: true }
  });
  console.log('Ha:', ha);

  const khau = await p.employee.findFirst({
    where: { fullName: 'KHÂU THANH HẢI' },
    select: { id: true, fullName: true, managerEmployeeId: true, departmentId: true }
  });
  console.log('Khau:', khau);

  await p.$disconnect();
}
main().catch(console.error);

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const sourceId = 'employee-uuid'; // dummy
  const targetId = 'DEPARTMENT-uuid'; // dummy

  try {
    // Check if Employee has updatedById
    const employeeSchema = p._runtimeDataModel.models.Employee.fields.map(f => f.name);
    console.log('Employee fields:', employeeSchema.includes('updatedById') ? 'HAS updatedById' : 'MISSING updatedById');
    
    // Simulate the exact code from organizationService.move
    const source = { type: 'EMPLOYEE', id: 'some-id' };
    const target = { type: 'DEPARTMENT', id: 'target-id' };
    
    const updateData = { updatedById: 'some-user-id' };
    const empUpdateData = { ...updateData };
    console.log('Update data:', empUpdateData);
    
  } catch(e) {
    console.error(e);
  }
  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });

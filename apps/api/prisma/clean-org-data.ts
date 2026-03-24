
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting Organization Data Cleanup...');

    // 1. Decouple Employees from Org Units
    console.log('   - Decoupling Employees from Departments, JobTitles, Factories...');
    await prisma.employee.updateMany({
        data: {
            factoryId: null,
            divisionId: null,
            departmentId: null,
            sectionId: null,
            jobTitleId: null,
        },
    });

    // 2. Clear History/Descriptions that reference Org Units
    console.log('   - Deleting EmployeeJobHistory...');
    await prisma.employeeJobHistory.deleteMany({});

    console.log('   - Deleting JobDescriptions...');
    await prisma.jobDescription.deleteMany({});

    // 3. Delete Departments (Handling Hierarchy: Section -> Department -> Division)
    // To avoid FK constraints on parentId, we delete children first.

    console.log('   - Deleting Departments...');
    await prisma.department.deleteMany({});

    // 4. Delete Job Titles
    console.log('   - Deleting JobTitles...');
    await prisma.jobTitle.deleteMany({});

    // 5. Delete Factories
    console.log('   - Deleting Factories...');
    await prisma.factory.deleteMany({});

    console.log('✅ Data cleanup completed successfully.');
}

main()
    .catch((e) => {
        console.error('❌ Error cleaning data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

const formatDate = (date: any) => {
    if (!date) return "—";
    return format(new Date(date), "dd/MM/yyyy");
};

async function main() {
    try {
        const employees = await prisma.employee.findMany({
            where: { deletedAt: null },
            take: 200
        });

        console.log(`Analyzing ${employees.length} employees...`);
        let crashPoint = null;
        let c = 0;
        for (const employee of employees) {
            try {
                // Simulate date formatting
                formatDate(employee.dob);
                formatDate(employee.dateOfIssue);
                formatDate(employee.contractStartDate);
                formatDate(employee.contractEndDate);
                formatDate(employee.joinedAt);
                formatDate(employee.resignedAt);

                if (employee.createdAt) {
                    format(new Date(employee.createdAt), "dd/MM/yyyy HH:mm");
                }
                if (employee.updatedAt) {
                    format(new Date(employee.updatedAt), "dd/MM/yyyy HH:mm");
                }

                c++;
            } catch (e: any) {
                crashPoint = `Crash on employee ${employee.employeeCode}: ${e.message}`;
                break;
            }
        }

        if (crashPoint) console.error(crashPoint);
        else console.log(`No direct crashes found using date-fns format.`);
    } catch (e: any) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

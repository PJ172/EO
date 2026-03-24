import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const employees = await prisma.employee.findMany({
            where: { deletedAt: null },
            include: {
                user: true,
                factory: true,
                department: true,
                division: true,
                section: true,
                jobTitle: true,
                manager: true,
                createdBy: true,
                updatedBy: true,
                familyMembers: true
            },
            take: 200
        });

        console.log(`Analyzing ${employees.length} employees...`);
        let crashPoint = null;
        let c = 0;
        for (const employee of employees) {
            try {
                // Simulate columns
                const {
                    employeeCode, fullName, emailCompany, gender, dob, maritalStatus,
                    ethnicity, religion, department, jobTitle, employmentStatus,
                    factory, division, section, manager, phone, personalEmail,
                    emergencyPhone, emergencyContactName, referrer, permanentAddress,
                    temporaryAddress, nationalId, dateOfIssue, placeOfIssue,
                    taxCode, socialInsuranceNo, healthInsuranceNo, salaryLevel,
                    bankName, bankBranch, bankAccountNo, contractType, contractNumber,
                    contractStartDate, contractEndDate, joinedAt, resignedAt,
                    education, major, school, graduationYear, recordCode, accessCardStatus,
                    uniformShirtSize, uniformPantsSize, shoeSize, familyMembers, note, age
                } = employee as any;

                // simulate formatting
                const fam = familyMembers?.map((f: any) => `${f.name}`)?.join(', ');

                // the previous bug was familyMembers.map without ?.
                // The user says there's STILL a bug. Let's look closely at the TSX file.
                // Let's check format functions
                c++;
            } catch (e: any) {
                crashPoint = `Crash on employee ${employee.employeeCode}: ${e.message}\n${e.stack}`;
                break;
            }
        }

        if (crashPoint) console.error(crashPoint);
        else console.log(`No direct crashes found in ${c} rows. Checking specific error...`);
    } catch (e: any) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

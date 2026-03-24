import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

// Create Prisma client with pg adapter
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed (Wipe & init "it" user)...');

    // ========================================
    // Seed Permissions
    // ========================================
    const permissions = [
        // HR
        { code: 'EMPLOYEE_READ', description: 'View employee information', module: 'HR' },
        { code: 'EMPLOYEE_CREATE', description: 'Create new employee', module: 'HR' },
        { code: 'EMPLOYEE_UPDATE', description: 'Update employee information', module: 'HR' },
        { code: 'EMPLOYEE_DELETE', description: 'Delete employee', module: 'HR' },
        { code: 'EMPLOYEE_UPLOAD_FILE', description: 'Upload employee files', module: 'HR' },

        // Organization
        { code: 'DEPARTMENT_READ', description: 'View departments', module: 'ORG' },
        { code: 'DEPARTMENT_MANAGE', description: 'Manage departments', module: 'ORG' },
        { code: 'ORGCHART_VIEW', description: 'View org chart', module: 'ORG' },
        { code: 'FACTORY_READ', description: 'View factories', module: 'ORG' },
        { code: 'FACTORY_MANAGE', description: 'Manage factories', module: 'ORG' },
        { code: 'COMPANY_READ', description: 'View companies', module: 'ORG' },
        { code: 'COMPANY_MANAGE', description: 'Manage companies', module: 'ORG' },
        { code: 'DIVISION_READ', description: 'View divisions', module: 'ORG' },
        { code: 'DIVISION_MANAGE', description: 'Manage divisions', module: 'ORG' },
        { code: 'SECTION_READ', description: 'View sections', module: 'ORG' },
        { code: 'SECTION_MANAGE', description: 'Manage sections', module: 'ORG' },
        { code: 'JOBTITLE_READ', description: 'View job titles', module: 'ORG' },
        { code: 'JOBTITLE_MANAGE', description: 'Manage job titles', module: 'ORG' },

        // Documents
        { code: 'DOCUMENT_READ', description: 'View documents', module: 'DOCUMENTS' },
        { code: 'DOCUMENT_CREATE', description: 'Create documents', module: 'DOCUMENTS' },
        { code: 'DOCUMENT_UPDATE', description: 'Update documents', module: 'DOCUMENTS' },
        { code: 'DOCUMENT_APPROVE', description: 'Approve documents', module: 'DOCUMENTS' },

        // Leave
        { code: 'LEAVE_CREATE', description: 'Create leave request', module: 'LEAVE' },
        { code: 'LEAVE_VIEW', description: 'View leave requests', module: 'LEAVE' },
        { code: 'LEAVE_APPROVE', description: 'Approve leave requests', module: 'LEAVE' },
        { code: 'LEAVE_MANAGE', description: 'Manage all leave requests', module: 'LEAVE' },

        // Room Booking
        { code: 'ROOM_VIEW', description: 'View meeting rooms', module: 'BOOKING' },
        { code: 'ROOM_BOOK', description: 'Book meeting rooms', module: 'BOOKING' },
        { code: 'ROOM_MANAGE', description: 'Manage meeting rooms', module: 'BOOKING' },
        { code: 'ROOM_CREATE', description: 'Create new meeting room', module: 'BOOKING' },
        { code: 'ROOM_UPDATE', description: 'Update meeting room', module: 'BOOKING' },
        { code: 'ROOM_DELETE', description: 'Delete meeting room', module: 'BOOKING' },

        // Projects & Tasks
        { code: 'PROJECT_READ', description: 'View projects', module: 'PROJECT' },
        { code: 'PROJECT_CREATE', description: 'Create projects', module: 'PROJECT' },
        { code: 'PROJECT_UPDATE', description: 'Update projects', module: 'PROJECT' },
        { code: 'PROJECT_DELETE', description: 'Delete projects', module: 'PROJECT' },
        { code: 'TASK_READ', description: 'View tasks', module: 'PROJECT' },
        { code: 'TASK_CREATE', description: 'Create tasks', module: 'PROJECT' },
        { code: 'TASK_UPDATE', description: 'Update tasks', module: 'PROJECT' },
        { code: 'TASK_DELETE', description: 'Delete tasks', module: 'PROJECT' },
        { code: 'TASK_ASSIGN', description: 'Assign tasks to employees', module: 'PROJECT' },

        // KPI
        { code: 'KPI_READ', description: 'View KPI', module: 'KPI' },
        { code: 'KPI_CREATE', description: 'Create KPI periods', module: 'KPI' },
        { code: 'KPI_UPDATE', description: 'Update KPI scores', module: 'KPI' },
        { code: 'KPI_MANAGE', description: 'Manage all KPI', module: 'KPI' },

        // News
        { code: 'NEWS_READ', description: 'View news', module: 'NEWS' },
        { code: 'NEWS_CREATE', description: 'Create news', module: 'NEWS' },
        { code: 'NEWS_UPDATE', description: 'Update news', module: 'NEWS' },
        { code: 'NEWS_DELETE', description: 'Delete news', module: 'NEWS' },
        { code: 'NEWS_PUBLISH', description: 'Publish news', module: 'NEWS' },

        // Requests
        { code: 'REQUEST_READ', description: 'View requests', module: 'REQUEST' },
        { code: 'REQUEST_CREATE', description: 'Create requests', module: 'REQUEST' },
        { code: 'REQUEST_APPROVE', description: 'Approve requests', module: 'REQUEST' },

        // Cars
        { code: 'CAR_READ', description: 'View cars', module: 'CAR' },
        { code: 'CAR_MANAGE', description: 'Manage cars', module: 'CAR' },
        { code: 'CAR_BOOK', description: 'Book cars', module: 'CAR' },

        // Timekeeping
        { code: 'TIMEKEEPING_VIEW', description: 'View timekeeping', module: 'TIMEKEEPING' },
        { code: 'TIMEKEEPING_MANAGE', description: 'Manage timekeeping', module: 'TIMEKEEPING' },
        { code: 'TIMEKEEPING_EXPORT', description: 'Export timekeeping data', module: 'TIMEKEEPING' },

        // Admin
        { code: 'USER_ROLE_MANAGE', description: 'Manage user roles', module: 'ADMIN' },
        { code: 'AUDITLOG_VIEW', description: 'View audit logs', module: 'ADMIN' },
        { code: 'SETTINGS_VIEW', description: 'View settings', module: 'ADMIN' },
        { code: 'SETTINGS_MANAGE', description: 'Manage settings', module: 'ADMIN' },
        { code: 'EXPORT_DATA', description: 'Export data to Excel', module: 'ADMIN' },
        { code: 'IMPORT_DATA', description: 'Import data from Excel', module: 'ADMIN' },

        // Report Center
        { code: 'REPORT_VIEW', description: 'View reports and analytics', module: 'REPORT' },

        // Meal Registration
        { code: 'MEAL_VIEW', description: 'View meal sessions and menu', module: 'MEAL' },
        { code: 'MEAL_REGISTER', description: 'Register/cancel meal', module: 'MEAL' },
        { code: 'MEAL_MANAGE', description: 'Manage meal sessions, menu, view stats', module: 'MEAL' },

        // IT Asset Management
        { code: 'ASSET_VIEW', description: 'View IT assets', module: 'ASSET' },
        { code: 'ASSET_MANAGE', description: 'Manage IT assets, assign, maintenance', module: 'ASSET' },

        // IT Ticketing
        { code: 'TICKET_VIEW', description: 'View tickets', module: 'TICKET' },
        { code: 'TICKET_CREATE', description: 'Create tickets', module: 'TICKET' },
        { code: 'TICKET_MANAGE', description: 'Manage tickets, assign, resolve', module: 'TICKET' },

        // Workflow
        { code: 'WORKFLOW_MANAGE', description: 'Manage approval workflows', module: 'WORKFLOW' },
    ];

    for (const perm of permissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: {},
            create: perm,
        });
    }
    console.log(`✅ Created ${permissions.length} permissions`);

    // ========================================
    // Seed Meal Sessions
    // ========================================
    const mealSessions = [
        { code: 'LUNCH' as const, name: 'Bữa trưa', timeStart: '11:00', timeEnd: '13:00', cutoffTime: '09:00', defaultPrice: 30000, sortOrder: 1 },
        { code: 'AFTERNOON_SNACK' as const, name: 'Chiều nhẹ', timeStart: '15:00', timeEnd: '16:00', cutoffTime: '14:00', defaultPrice: 15000, sortOrder: 2 },
        { code: 'DINNER' as const, name: 'Bữa tối', timeStart: '18:00', timeEnd: '20:00', cutoffTime: '15:00', defaultPrice: 35000, sortOrder: 3 },
        { code: 'LATE_NIGHT_SNACK' as const, name: 'Khuya nhẹ', timeStart: '22:00', timeEnd: '23:00', cutoffTime: '20:00', defaultPrice: 20000, sortOrder: 4 },
    ];

    for (const session of mealSessions) {
        await prisma.mealSession.upsert({
            where: { code: session.code },
            update: {},
            create: session,
        });
    }
    console.log(`✅ Created ${mealSessions.length} meal sessions`);

    // ========================================
    // Seed Ticket Categories
    // ========================================
    const ticketCategories = [
        { name: 'Mạng & Internet', slaHours: 4 },
        { name: 'Phần mềm', slaHours: 8 },
        { name: 'Phần cứng', slaHours: 24 },
        { name: 'Email & Tài khoản', slaHours: 4 },
        { name: 'Máy in & Scanner', slaHours: 8 },
        { name: 'Khác', slaHours: 24 },
    ];

    for (const cat of ticketCategories) {
        const existing = await prisma.ticketCategory.findFirst({ where: { name: cat.name } });
        if (!existing) {
            await prisma.ticketCategory.create({ data: cat });
        }
    }
    console.log(`✅ Created ${ticketCategories.length} ticket categories`);

    // ========================================
    // Seed Roles
    // ========================================
    const rolesData = [
        {
            code: 'ADMIN', name: 'Administrator', description: 'Full system access',
            perms: permissions.map(p => p.code)
        },
        {
            code: 'HR', name: 'Human Resources', description: 'HR department staff',
            perms: [
                'EMPLOYEE_READ', 'EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE', 'EMPLOYEE_UPLOAD_FILE',
                'DEPARTMENT_READ', 'ORGCHART_VIEW', 'FACTORY_READ', 'COMPANY_READ', 'DIVISION_READ', 'SECTION_READ', 'JOBTITLE_READ',
                'LEAVE_VIEW', 'LEAVE_APPROVE', 'LEAVE_MANAGE',
                'TIMEKEEPING_VIEW', 'TIMEKEEPING_MANAGE', 'TIMEKEEPING_EXPORT',
                'ROOM_VIEW', 'ROOM_BOOK',
                'NEWS_READ',
                'EXPORT_DATA', 'IMPORT_DATA',
                'REQUEST_READ', 'REQUEST_APPROVE',
            ]
        },
        {
            code: 'MANAGER', name: 'Manager', description: 'Department manager',
            perms: [
                'EMPLOYEE_READ',
                'DEPARTMENT_READ', 'ORGCHART_VIEW', 'FACTORY_READ', 'COMPANY_READ', 'DIVISION_READ', 'SECTION_READ', 'JOBTITLE_READ',
                'LEAVE_VIEW', 'LEAVE_APPROVE', 'LEAVE_CREATE',
                'ROOM_VIEW', 'ROOM_BOOK',
                'PROJECT_READ', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE',
                'TASK_READ', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_ASSIGN',
                'KPI_READ', 'KPI_CREATE', 'KPI_UPDATE',
                'NEWS_READ',
                'REQUEST_READ', 'REQUEST_CREATE', 'REQUEST_APPROVE',
                'CAR_READ', 'CAR_BOOK',
                'DOCUMENT_READ', 'DOCUMENT_APPROVE',
                'EXPORT_DATA', 'IMPORT_DATA',
                'TIMEKEEPING_VIEW',
            ]
        },
        {
            code: 'EMPLOYEE', name: 'Employee', description: 'Regular employee',
            perms: [
                'EMPLOYEE_READ',
                'DEPARTMENT_READ', 'ORGCHART_VIEW', 'FACTORY_READ', 'COMPANY_READ', 'DIVISION_READ', 'SECTION_READ', 'JOBTITLE_READ',
                'LEAVE_CREATE', 'LEAVE_VIEW',
                'ROOM_VIEW', 'ROOM_BOOK',
                'TASK_READ', 'TASK_CREATE', 'TASK_UPDATE',
                'KPI_READ',
                'NEWS_READ',
                'REQUEST_READ', 'REQUEST_CREATE',
                'CAR_READ', 'CAR_BOOK',
                'DOCUMENT_READ',
                'PROJECT_READ',
                'EXPORT_DATA',
                'TIMEKEEPING_VIEW',
            ]
        },
    ];

    for (const roleData of rolesData) {
        const role = await prisma.role.upsert({
            where: { code: roleData.code },
            update: { name: roleData.name, description: roleData.description },
            create: { code: roleData.code, name: roleData.name, description: roleData.description },
        });

        for (const permCode of roleData.perms) {
            const perm = await prisma.permission.findUnique({ where: { code: permCode } });
            if (perm) {
                await prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
                    update: {},
                    create: { roleId: role.id, permissionId: perm.id },
                });
            }
        }
    }
    console.log(`✅ Created roles`);

    // ========================================
    // Seed Leave Types
    // ========================================
    const leaveTypes = [
        { code: 'ANNUAL', name: 'Nghỉ phép năm', requiresAttachment: false },
        { code: 'SICK', name: 'Nghỉ ốm', requiresAttachment: true },
        { code: 'UNPAID', name: 'Nghỉ không lương', requiresAttachment: false },
    ];

    for (const lt of leaveTypes) {
        await prisma.leaveType.upsert({
            where: { code: lt.code },
            update: {},
            create: lt,
        });
    }
    console.log(`✅ Created ${leaveTypes.length} leave types`);

    // ========================================
    // Seed Admin User (it : 123456)
    // ========================================
    const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
    const hashedPassword = await bcrypt.hash('123456', 10);

    const itUser = await prisma.user.upsert({
        where: { username: 'it' },
        update: { passwordHash: hashedPassword },
        create: {
            username: 'it',
            email: 'it@eoffice.local',
            passwordHash: hashedPassword,
            status: 'ACTIVE',
        },
    });

    if (adminRole) {
        await prisma.userRole.upsert({
            where: { userId_roleId: { userId: itUser.id, roleId: adminRole.id } },
            update: {},
            create: { userId: itUser.id, roleId: adminRole.id },
        });
    }

    // Create an employee profile for the IT admin so that they can show up in systems properly
    await prisma.employee.upsert({
        where: { userId: itUser.id },
        update: { fullName: 'IT Administrator', employmentStatus: 'OFFICIAL' },
        create: {
            employeeCode: 'EMP-IT',
            fullName: 'IT Administrator',
            emailCompany: 'it@eoffice.local',
            employmentStatus: 'OFFICIAL',
            userId: itUser.id
        }
    });

    console.log('✅ Created admin user (it / 123456)');

    console.log('🎉 Database seed completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

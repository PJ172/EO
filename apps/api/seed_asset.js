const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding IT Assets...');

    const admin = await prisma.user.findFirst({
        where: { employee: { isNot: null } },
        include: { employee: true }
    });

    if (!admin || !admin.employee) {
        console.error('Admin employee not found. Cannot set manager ID.');
        process.exit(1);
    }

    let laptopCategory = await prisma.assetCategory.findFirst({ where: { name: 'Laptop' } });
    if (!laptopCategory) {
        laptopCategory = await prisma.assetCategory.create({
            data: { name: 'Laptop', description: 'Máy tính xách tay' }
        });
    }

    const assetCode = `LT-${new Date().getFullYear()}-0001`;
    const existingAsset = await prisma.iTAsset.findUnique({ where: { code: assetCode } });
    if (!existingAsset) {
        await prisma.iTAsset.create({
            data: {
                code: assetCode,
                name: 'MacBook Pro M2',
                categoryId: laptopCategory.id,
                status: 'AVAILABLE',
                condition: 'NEW',
                brand: 'Apple',
                model: 'M2 2023',
                serialNumber: 'C02ABCDEF123',
                purchaseDate: new Date(),
            }
        });
        console.log(`Created asset: ${assetCode}`);
    } else {
        console.log(`Asset ${assetCode} already exists.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

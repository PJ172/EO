# eOffice - Enterprise Office Management System

> 🏢 Phần mềm quản lý văn phòng doanh nghiệp

## Modules

- **Auth**: Xác thực và phân quyền
- **HR**: Quản lý hồ sơ nhân viên
- **Org**: Cơ cấu tổ chức & Org Chart
- **Documents**: Quy trình / Quy định
- **Leave**: Quản lý nghỉ phép
- **Booking**: Đặt phòng họp

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Cache | Redis |

## Project Structure

```
eOffice/
├── apps/
│   ├── web/        # Next.js Frontend
│   └── api/        # NestJS Backend
├── packages/
│   ├── shared-types/   # Shared TypeScript types
│   ├── ui/            # Design system components
│   └── utils/         # Shared utilities
└── docs/              # Documentation
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Start only frontend
npm run dev:web

# Start only backend
npm run dev:api
```

## Development

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Open Prisma Studio
npm run db:studio
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="..."
```

## License

Private - All rights reserved
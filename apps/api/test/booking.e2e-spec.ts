import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Booking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;
  let roomId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();
    prisma = app.get(PrismaService);

    // 1. Ensure User exists
    let user = await prisma.user.findFirst({ where: { username: 'admin' } });
    if (!user) {
      const password = await bcrypt.hash('Admin@123', 10);
      user = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@test.local',
          passwordHash: password,
          status: 'ACTIVE',
        },
      });
    }

    // 2. Ensure Employee exists (Linked to User)
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    });
    if (!employee) {
      await prisma.employee.create({
        data: {
          userId: user.id,
          employeeCode: 'ADMIN001',
          fullName: 'Admin Test',
          emailCompany: 'admin@test.local',
        },
      });
    }

    // 3. Ensure ADMIN Role and Assignment
    let adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          code: 'ADMIN',
          name: 'Administrator',
        },
      });
    }

    const userRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    });

    if (!userRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });
    }

    // 4. Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'Admin@123' })
      .expect(200);

    jwtToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (roomId) {
      // Cleanup room and its bookings (bookings cascade usually, or delete manually)
      await prisma.roomBooking.deleteMany({ where: { roomId } });
      await prisma.meetingRoom.delete({ where: { id: roomId } });
    }
    await app.close();
  });

  describe('/api/v1/bookings/rooms (POST)', () => {
    it('should create a room', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings/rooms')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'Test Room E2E',
          code: 'ROOM-' + Date.now(), // Randomize code to avoid collisions
          capacity: 10,
          location: 'Floor 1',
        })
        .expect(201);

      roomId = res.body.id;
      expect(res.body.name).toBe('Test Room E2E');
    });
  });

  describe('/api/v1/bookings (POST)', () => {
    it('should create a booking', async () => {
      if (!roomId) throw new Error('Room creation failed, cannot test booking');

      // Start time: next hour
      const start = new Date();
      start.setHours(start.getHours() + 1);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          roomId: roomId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          purpose: 'E2E Test Meeting',
        })
        .expect(201);

      expect(res.body.title).toBe('E2E Test Meeting');
      expect(res.body.organizerEmployeeId).toBeDefined();
    });
  });

  describe('/api/v1/bookings (GET)', () => {
    it('should list bookings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .query({ roomId })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].roomId).toBe(roomId);
    });
  });
});

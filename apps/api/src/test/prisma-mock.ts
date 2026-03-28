/**
 * Shared Prisma mock factory for unit tests.
 * Creates a deeply mocked PrismaService with all model methods.
 */
export const createMockPrismaService = () => {
  const mockModel = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
  });

  return {
    user: mockModel(),
    employee: mockModel(),
    department: mockModel(),
    company: mockModel(),
    factory: mockModel(),
    division: mockModel(),
    section: mockModel(),
    jobTitle: mockModel(),
    role: mockModel(),
    userRole: mockModel(),
    permission: mockModel(),
    auditLog: mockModel(),
    ticket: mockModel(),
    ticketCategory: mockModel(),
    ticketComment: mockModel(),
    roomBooking: mockModel(),
    meetingRoom: mockModel(),
    bookingAttendee: mockModel(),
    leaveRequest: mockModel(),
    leaveType: mockModel(),
    attendance: mockModel(),
    verificationCode: mockModel(),
    request: mockModel(),
    mealSession: mockModel(),
    mealRegistration: mockModel(),
    mealMenu: mockModel(),
    car: mockModel(),
    carBooking: mockModel(),
    $transaction: jest.fn().mockImplementation((fn) =>
      typeof fn === 'function' ? fn({}) : Promise.all(fn),
    ),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
};

export type MockPrismaService = ReturnType<typeof createMockPrismaService>;

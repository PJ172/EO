import { z } from "zod";

// =====================================
// Common validation messages in Vietnamese
// =====================================
const messages = {
  required: "Trường này là bắt buộc",
  email: "Email không hợp lệ",
  min: (min: number) => `Tối thiểu ${min} ký tự`,
  max: (max: number) => `Tối đa ${max} ký tự`,
  minNumber: (min: number) => `Giá trị tối thiểu là ${min}`,
  maxNumber: (max: number) => `Giá trị tối đa là ${max}`,
  phone: "Số điện thoại không hợp lệ",
  date: "Ngày không hợp lệ",
  number: "Vui lòng nhập số hợp lệ",
  select: "Vui lòng chọn giá trị",
  positiveNumber: "Giá trị phải là số dương",
  invalidFormat: "Định dạng không hợp lệ",
};

// =====================================
// Login schema
// =====================================
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, messages.required)
    .min(2, messages.min(2))
    .max(50, messages.max(50)),
  password: z
    .string()
    .min(1, messages.required)
    .min(6, messages.min(6))
    .max(100, messages.max(100)),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// =====================================
// Employee schema
// =====================================
export const employeeSchema = z.object({
  employeeCode: z.string().min(1, "Mã nhân viên là bắt buộc").max(5, "Mã nhân viên có tối đa 5 ký tự"),
  fullName: z
    .string()
    .min(1, "Họ và tên là bắt buộc")
    .min(2, "Họ và tên tối thiểu 2 ký tự")
    .max(100, "Họ và tên tối đa 100 ký tự"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z
    .string()
    .min(10, "Số điện thoại tối thiểu 10 số")
    .max(15, "Số điện thoại tối đa 15 số")
    .optional()
    .or(z.literal("")),
  companyId: z.string().nullable().optional().or(z.literal("")),
  factoryId: z.string().nullable().optional().or(z.literal("")),
  divisionId: z.string().nullable().optional().or(z.literal("")),
  departmentId: z.string().nullable().optional().or(z.literal("")),
  sectionId: z.string().nullable().optional().or(z.literal("")),
  jobTitleId: z.string().nullable().optional().or(z.literal("")),
  positionId: z.string().nullable().optional().or(z.literal("")),
  managerEmployeeId: z.string().nullable().optional().or(z.literal("")),
  employmentStatus: z.enum([
    "PROBATION",
    "OFFICIAL",
    "SEASONAL",
    "RESIGNED",
    "MATERNITY_LEAVE",
  ]),
  joinedAt: z.string().optional(),
  resignedAt: z.string().optional(),
  dob: z.string().optional(),
  showOnOrgChart: z.boolean().optional(),
  orgLevel: z.string().optional().or(z.literal("")),
  // Personal Info
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  maritalStatus: z
    .enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"])
    .optional(),
  permanentAddress: z.string().max(500, "Địa chỉ tối đa 500 ký tự").optional(),
  temporaryAddress: z.string().max(500, "Địa chỉ tối đa 500 ký tự").optional(),
  birthPlace: z.string().max(200, "Nơi sinh tối đa 200 ký tự").optional(),
  ethnicity: z.string().max(50, "Dân tộc tối đa 50 ký tự").optional(),
  religion: z.string().max(50, "Tôn giáo tối đa 50 ký tự").optional(),
  personalEmail: z
    .string()
    .email("Email cá nhân không hợp lệ")
    .optional()
    .or(z.literal("")),
  note: z.string().max(1000, "Ghi chú tối đa 1000 ký tự").optional(),
  // CMND/CCCD
  nationalId: z
    .string()
    .max(20, "Số CMND/CCCD tối đa 20 ký tự")
    .optional()
    .or(z.literal("")),
  placeOfIssue: z
    .string()
    .max(200, "Nơi cấp tối đa 200 ký tự")
    .optional()
    .or(z.literal("")),
  dateOfIssue: z.string().optional().or(z.literal("")),
  // Bank Info
  bankName: z
    .string()
    .max(100, "Tên ngân hàng tối đa 100 ký tự")
    .optional()
    .or(z.literal("")),
  bankBranch: z
    .string()
    .max(100, "Chi nhánh tối đa 100 ký tự")
    .optional()
    .or(z.literal("")),
  bankAccountNo: z
    .string()
    .max(30, "Số tài khoản tối đa 30 ký tự")
    .optional()
    .or(z.literal("")),
  // Insurance & Tax
  socialInsuranceNo: z
    .string()
    .max(20, "Số BHXH tối đa 20 ký tự")
    .optional()
    .or(z.literal("")),
  healthInsuranceNo: z
    .string()
    .max(20, "Số BHYT tối đa 20 ký tự")
    .optional()
    .or(z.literal("")),
  taxCode: z
    .string()
    .max(20, "Mã số thuế tối đa 20 ký tự")
    .optional()
    .or(z.literal("")),
  // Uniform & Assets
  recordCode: z
    .string()
    .max(50, "Mã hồ sơ tối đa 50 ký tự")
    .optional()
    .or(z.literal("")),
  salaryLevel: z
    .string()
    .max(50, "Bậc lương tối đa 50 ký tự")
    .optional()
    .or(z.literal("")),
  accessCardId: z
    .string()
    .max(50, "Thẻ từ tối đa 50 ký tự")
    .optional()
    .or(z.literal("")),
  accessCardStatus: z.string().optional().or(z.literal("")),
  uniformPantsSize: z.string().max(10, "Size quần tối đa 10 ký tự").optional(),
  uniformShirtSize: z.string().max(10, "Size áo tối đa 10 ký tự").optional(),
  shoeSize: z.string().max(10, "Size giầy tối đa 10 ký tự").optional(),
  documentFile: z.string().optional(),
  emergencyPhone: z.string().max(20, "SĐT khẩn cấp tối đa 20 ký tự").optional(),
  emergencyContactName: z
    .string()
    .max(100, "Người LH khẩn cấp tối đa 100 ký tự")
    .optional(),
  referrer: z.string().max(100, "Người giới thiệu tối đa 100 ký tự").optional(),
  // Contract
  contractNumber: z.string().optional().or(z.literal("")),
  contractType: z
    .enum([
      "PROBATION",
      "INDEFINITE_TERM",
      "SEASONAL",
      "ONE_YEAR",
      "TWO_YEARS",
      "THREE_YEARS",
    ])
    .optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  // Education
  education: z
    .enum([
      "PRIMARY",
      "SECONDARY",
      "HIGH_SCHOOL",
      "VOCATIONAL",
      "COLLEGE",
      "UNIVERSITY",
      "MASTER",
      "DOCTOR",
      "GRADE_12_12",
      "GRADE_11_12",
      "GRADE_10_12",
      "GRADE_9_12",
      "GRADE_8_12",
      "GRADE_7_12",
      "GRADE_6_12",
      "GRADE_5_12",
      "GRADE_4_12",
      "GRADE_3_12",
      "GRADE_2_12",
      "GRADE_1_12",
    ])
    .optional(),
  major: z.string().max(100, "Chuyên ngành tối đa 100 ký tự").optional(),
  school: z.string().max(200, "Tên trường tối đa 200 ký tự").optional(),
  // graduationYear with coercion for form input
  graduationYear: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? undefined : val,
    z.coerce
      .number()
      .int("Năm tốt nghiệp phải là số nguyên")
      .min(1950, "Năm tốt nghiệp không hợp lệ")
      .max(2100, "Năm tốt nghiệp không hợp lệ")
      .optional(),
  ),

  // Nested Relations
  contracts: z
    .array(
      z.object({
        contractNumber: z.string().optional().or(z.literal("")),
        contractType: z
          .enum([
            "PROBATION",
            "INDEFINITE_TERM",
            "SEASONAL",
            "ONE_YEAR",
            "TWO_YEARS",
            "THREE_YEARS",
          ])
          .optional(),
        startDate: z.string().optional().or(z.literal("")),
        endDate: z.string().optional().or(z.literal("")),
        note: z.string().optional().or(z.literal("")),
      }),
    )
    .optional(),
  familyMembers: z
    .array(
      z.object({
        name: z.string().min(1, "Họ và tên là bắt buộc"),
        relationship: z
          .enum([
            "SPOUSE",
            "CHILD",
            "WIFE",
            "HUSBAND",
            "FATHER",
            "MOTHER",
            "BROTHER",
            "SISTER",
          ]),
        dob: z.string().optional().or(z.literal("")),
        phoneNumber: z.string().optional().or(z.literal("")),
        job: z.string().optional().or(z.literal("")),
        note: z.string().optional().or(z.literal("")),
      }),
    )
    .optional(),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

// =====================================
// Leave request schema
// =====================================
export const leaveRequestSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Vui lòng chọn loại nghỉ phép"),
    startDatetime: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
    endDatetime: z.string().min(1, "Vui lòng chọn ngày kết thúc"),
    reason: z.string().max(500, "Lý do tối đa 500 ký tự").optional(),
  })
  .refine(
    (data) => new Date(data.endDatetime) >= new Date(data.startDatetime),
    {
      message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
      path: ["endDatetime"],
    },
  );

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

// =====================================
// Room booking schema
// =====================================
export const roomBookingSchema = z
  .object({
    roomId: z.string().min(1, "Vui lòng chọn phòng họp"),
    title: z
      .string()
      .min(1, "Tiêu đề là bắt buộc")
      .min(5, "Tiêu đề tối thiểu 5 ký tự")
      .max(200, "Tiêu đề tối đa 200 ký tự"),
    description: z.string().max(1000, "Mô tả tối đa 1000 ký tự").optional(),
    startDatetime: z.string().min(1, "Vui lòng chọn thời gian bắt đầu"),
    endDatetime: z.string().min(1, "Vui lòng chọn thời gian kết thúc"),
  })
  .refine((data) => new Date(data.endDatetime) > new Date(data.startDatetime), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endDatetime"],
  });

export type RoomBookingFormData = z.infer<typeof roomBookingSchema>;

// =====================================
// Document schema
// =====================================
export const documentSchema = z.object({
  title: z
    .string()
    .min(1, "Tiêu đề là bắt buộc")
    .min(5, "Tiêu đề tối thiểu 5 ký tự")
    .max(200, "Tiêu đề tối đa 200 ký tự"),
  type: z.enum(["POLICY", "PROCESS"]),
  category: z.string().max(100, "Danh mục tối đa 100 ký tự").optional(),
  tags: z.array(z.string()).optional(),
});

export type DocumentFormData = z.infer<typeof documentSchema>;

// =====================================
// Department schema
// =====================================
export const departmentSchema = z.object({
  code: z
    .string()
    .min(1, "Mã đơn vị là bắt buộc")
    .max(50, "Mã đơn vị tối đa 50 ký tự"),
  name: z
    .string()
    .min(1, "Tên đơn vị là bắt buộc")
    .max(200, "Tên đơn vị tối đa 200 ký tự"),
  type: z.enum([
    "COMPANY",
    "FACTORY",
    "DIVISION",
    "DEPARTMENT",
    "SECTION",
    "GROUP",
  ]),
  parentId: z.string().optional(),
  managerEmployeeId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;

// =====================================
// Job Title schema
// =====================================
export const jobTitleSchema = z.object({
  code: z
    .string()
    .min(1, "Mã chức danh là bắt buộc")
    .max(50, "Mã chức danh tối đa 50 ký tự"),
  name: z
    .string()
    .min(1, "Tên chức danh là bắt buộc")
    .max(200, "Tên chức danh tối đa 200 ký tự"),
  level: z.coerce
    .number()
    .int("Cấp bậc phải là số nguyên")
    .min(1, "Cấp bậc tối thiểu là 1")
    .max(100, "Cấp bậc tối đa là 100")
    .optional(),
  description: z.string().max(500, "Mô tả tối đa 500 ký tự").optional(),
});

export type JobTitleFormData = z.infer<typeof jobTitleSchema>;

// =====================================
// Car Booking schema
// =====================================
export const carBookingSchema = z
  .object({
    carId: z.string().min(1, "Vui lòng chọn xe"),
    driverId: z.string().optional(),
    destination: z
      .string()
      .min(1, "Điểm đến là bắt buộc")
      .max(500, "Điểm đến tối đa 500 ký tự"),
    purpose: z.string().max(500, "Mục đích tối đa 500 ký tự").optional(),
    passengers: z.coerce
      .number()
      .int("Số khách phải là số nguyên")
      .min(1, "Tối thiểu 1 khách")
      .max(50, "Tối đa 50 khách")
      .optional(),
    startDatetime: z.string().min(1, "Vui lòng chọn thời gian bắt đầu"),
    endDatetime: z.string().min(1, "Vui lòng chọn thời gian kết thúc"),
  })
  .refine((data) => new Date(data.endDatetime) > new Date(data.startDatetime), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endDatetime"],
  });

export type CarBookingFormData = z.infer<typeof carBookingSchema>;

import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export enum EmploymentStatus {
  PROBATION = 'PROBATION',
  OFFICIAL = 'OFFICIAL',
  SEASONAL = 'SEASONAL',
  RESIGNED = 'RESIGNED',
  MATERNITY_LEAVE = 'MATERNITY_LEAVE',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

export enum ContractType {
  PROBATION = 'PROBATION',
  INDEFINITE_TERM = 'INDEFINITE_TERM',
  SEASONAL = 'SEASONAL',
  ONE_YEAR = 'ONE_YEAR',
  TWO_YEARS = 'TWO_YEARS',
  THREE_YEARS = 'THREE_YEARS',
}

export enum FamilyRelationship {
  SPOUSE = 'SPOUSE',
  WIFE = 'WIFE',
  HUSBAND = 'HUSBAND',
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  CHILD = 'CHILD',
  BROTHER = 'BROTHER',
  SISTER = 'SISTER',
}

export enum EducationLevel {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  VOCATIONAL = 'VOCATIONAL',
  COLLEGE = 'COLLEGE',
  UNIVERSITY = 'UNIVERSITY',
  MASTER = 'MASTER',
  DOCTOR = 'DOCTOR',
  GRADE_12_12 = 'GRADE_12_12',
  GRADE_11_12 = 'GRADE_11_12',
  GRADE_10_12 = 'GRADE_10_12',
  GRADE_9_12 = 'GRADE_9_12',
  GRADE_8_12 = 'GRADE_8_12',
  GRADE_7_12 = 'GRADE_7_12',
  GRADE_6_12 = 'GRADE_6_12',
  GRADE_5_12 = 'GRADE_5_12',
  GRADE_4_12 = 'GRADE_4_12',
  GRADE_3_12 = 'GRADE_3_12',
  GRADE_2_12 = 'GRADE_2_12',
  GRADE_1_12 = 'GRADE_1_12',
}

export class CreateEmployeeFamilyMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: FamilyRelationship })
  @IsEnum(FamilyRelationship)
  relationship: FamilyRelationship;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  job?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateEmployeeContractDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contractNumber: string;

  @ApiProperty({ enum: ContractType })
  @IsEnum(ContractType)
  contractType: ContractType;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateEmployeeDto {
  @ApiProperty({ example: '24207' })
  @IsString({ message: 'Mã nhân viên phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã nhân viên là bắt buộc' })
  @MaxLength(5, { message: 'Mã nhân viên tối đa 5 ký tự' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  employeeCode: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString({ message: 'Họ tên phải là chuỗi' })
  @IsNotEmpty({ message: 'Họ tên là bắt buộc' })
  @MaxLength(100, { message: 'Họ tên tối đa 100 ký tự' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  fullName: string;

  @ApiProperty({ required: false, example: '1990-01-15' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ (YYYY-MM-DD)' })
  dob?: string;

  @ApiProperty({ required: false, example: '0901234567' })
  @IsOptional()
  @IsString({ message: 'SĐT phải là chuỗi' })
  @MaxLength(15, { message: 'SĐT tối đa 15 ký tự' })
  phone?: string;

  @ApiProperty({ required: false, example: 'a.nguyen@company.com' })
  @IsOptional()
  @IsString({ message: 'Email công ty phải là chuỗi' })
  emailCompany?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  factoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  divisionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  managerEmployeeId?: string;

  @ApiProperty({ enum: EmploymentStatus, default: 'PROBATION' })
  @IsOptional()
  @IsEnum(EmploymentStatus, { message: 'Trạng thái làm việc không hợp lệ' })
  employmentStatus?: EmploymentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày vào làm không hợp lệ (YYYY-MM-DD)' })
  joinedAt?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  showOnOrgChart?: boolean;

  @ApiProperty({
    required: false,
    description: 'Cấp bậc tổ chức L1-L7 (Admin gán thủ công)',
    enum: ['L1','L2','L3','L4','L5','L6','L7'],
  })
  @IsOptional()
  @IsString()
  orgLevel?: string;

  // === Personal Info ===
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;

  @ApiProperty({ enum: MaritalStatus, required: false })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false, description: 'Địa chỉ thường trú' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Địa chỉ thường trú tối đa 500 ký tự' })
  permanentAddress?: string;

  @ApiProperty({ required: false, description: 'Địa chỉ tạm trú' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Địa chỉ tạm trú tối đa 500 ký tự' })
  temporaryAddress?: string;

  @ApiProperty({ required: false, description: 'Nơi sinh' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Nơi sinh tối đa 200 ký tự' })
  birthPlace?: string;

  @ApiProperty({ required: false, description: 'Dân tộc' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Dân tộc tối đa 50 ký tự' })
  ethnicity?: string;

  @ApiProperty({ required: false, description: 'Tôn giáo' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Tôn giáo tối đa 50 ký tự' })
  religion?: string;

  @ApiProperty({ required: false, description: 'Email cá nhân' })
  @IsOptional()
  @IsString()
  personalEmail?: string;

  // === CMND/CCCD ===
  @ApiProperty({ required: false, description: 'Số CMND/CCCD' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Số CMND/CCCD tối đa 20 ký tự' })
  nationalId?: string;

  @ApiProperty({ required: false, description: 'Nơi cấp' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Nơi cấp tối đa 200 ký tự' })
  placeOfIssue?: string;

  @ApiProperty({ required: false, description: 'Ngày cấp' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày cấp không hợp lệ (YYYY-MM-DD)' })
  dateOfIssue?: string;

  // === Bank Info ===
  @ApiProperty({ required: false, description: 'Tên ngân hàng' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tên ngân hàng tối đa 100 ký tự' })
  bankName?: string;

  @ApiProperty({ required: false, description: 'Chi nhánh' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Chi nhánh tối đa 100 ký tự' })
  bankBranch?: string;

  @ApiProperty({ required: false, description: 'Số tài khoản' })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Số tài khoản tối đa 30 ký tự' })
  bankAccountNo?: string;

  // === Insurance & Tax ===
  @ApiProperty({ required: false, description: 'Số sổ BHXH' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Số BHXH tối đa 20 ký tự' })
  socialInsuranceNo?: string;

  @ApiProperty({ required: false, description: 'Số thẻ BHYT' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Số BHYT tối đa 20 ký tự' })
  healthInsuranceNo?: string;

  @ApiProperty({ required: false, description: 'Mã số thuế' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Mã số thuế tối đa 20 ký tự' })
  taxCode?: string;

  // === Uniform & Assets ===
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recordCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  salaryLevel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accessCardId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accessCardStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  uniformPantsSize?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  uniformShirtSize?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shoeSize?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  documentFile?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @ApiProperty({ required: false, description: 'Tên người thân khẩn cấp' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tên người thân khẩn cấp tối đa 100 ký tự' })
  emergencyContactName?: string;

  @ApiProperty({ required: false, description: 'Người giới thiệu' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Người giới thiệu tối đa 100 ký tự' })
  referrer?: string;

  // === Contract ===
  @ApiProperty({ required: false, description: 'Số hợp đồng (Hiện tại)' })
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiProperty({
    enum: ContractType,
    required: false,
    description: 'Loại hợp đồng (Hiện tại)',
  })
  @IsOptional()
  @IsEnum(ContractType, { message: 'Loại hợp đồng không hợp lệ' })
  contractType?: ContractType;

  @ApiProperty({ required: false, description: 'Ngày bắt đầu HĐ (Hiện tại)' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu HĐ không hợp lệ (YYYY-MM-DD)' })
  contractStartDate?: string;

  @ApiProperty({ required: false, description: 'Ngày kết thúc HĐ (Hiện tại)' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc HĐ không hợp lệ (YYYY-MM-DD)' })
  contractEndDate?: string;

  // === Education ===
  @ApiProperty({
    enum: EducationLevel,
    required: false,
    description: 'Trình độ học vấn',
  })
  @IsOptional()
  @IsEnum(EducationLevel, { message: 'Trình độ học vấn không hợp lệ' })
  education?: EducationLevel;

  @ApiProperty({ required: false, description: 'Chuyên ngành' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Chuyên ngành tối đa 100 ký tự' })
  major?: string;

  @ApiProperty({ required: false, description: 'Trường' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Tên trường tối đa 200 ký tự' })
  school?: string;

  @ApiProperty({ required: false, description: 'Năm tốt nghiệp' })
  @IsOptional()
  @IsInt({ message: 'Năm tốt nghiệp phải là số nguyên' })
  @Min(1950, { message: 'Năm tốt nghiệp không hợp lệ (tối thiểu 1950)' })
  @Max(2100, { message: 'Năm tốt nghiệp không hợp lệ (tối đa 2100)' })
  graduationYear?: number;

  // === Relations (Nested) ===
  @ApiProperty({ type: [CreateEmployeeContractDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateEmployeeContractDto)
  contracts?: CreateEmployeeContractDto[];

  @ApiProperty({ type: [CreateEmployeeFamilyMemberDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateEmployeeFamilyMemberDto)
  familyMembers?: CreateEmployeeFamilyMemberDto[];
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày nghỉ việc không hợp lệ (YYYY-MM-DD)' })
  resignedAt?: string;
}

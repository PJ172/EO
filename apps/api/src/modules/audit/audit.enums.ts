// Map to Prisma Enum if possible, or define matching enum
export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  CANCEL = 'CANCEL',
  VIEW_SENSITIVE = 'VIEW_SENSITIVE',
}

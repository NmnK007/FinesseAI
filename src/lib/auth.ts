// Public display shape only. Authentication lives in security/auth-service.ts.
export type UserRole = 'customer' | 'lender' | 'admin';
export type Session = {role:UserRole;id:string;displayName:string;gstin?:string;employeeId?:string;bank?:string;loginAt:string};

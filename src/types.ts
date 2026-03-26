export type UserRole = 'admin' | 'doctor' | 'patient';

export interface Subscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'trial';
  expiryDate: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  specialization?: string; // For doctors
  employeeId?: string; // For doctors/staff
  createdAt: number;
  subscription?: Subscription;
}

export interface Patient {
  id: string; // National ID
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  createdAt: number;
}

export interface SickLeave {
  id: string;
  patientName: string;
  patientNameEn?: string;
  patientId: string; // National ID
  doctorId: string;
  doctorName: string;
  doctorNameEn?: string;
  diagnosis: string;
  diagnosisEn?: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: number;
  leaveNumber: string;
  qrCodeData: string;
  nationality?: string;
  nationalityEn?: string;
  employer?: string;
  employerEn?: string;
  doctorPosition?: string;
  doctorPositionEn?: string;
  admissionDate?: string;
  dischargeDate?: string;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: any;
}

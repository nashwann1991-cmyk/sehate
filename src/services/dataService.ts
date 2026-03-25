import { SickLeave, Patient } from '../types';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export const dataService = {
  getLeaves: async (): Promise<SickLeave[]> => {
    const path = 'sick_leaves';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SickLeave));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return []; // Unreachable but for TS
    }
  },

  getLeavesByDoctor: async (doctorId: string): Promise<SickLeave[]> => {
    const path = 'sick_leaves';
    try {
      const q = query(collection(db, path), where('doctorId', '==', doctorId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SickLeave));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  getLeaveById: async (id: string): Promise<SickLeave | null> => {
    const path = `sick_leaves/${id}`;
    try {
      const docRef = doc(db, 'sick_leaves', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as SickLeave;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  searchLeave: async (leaveNumber: string, patientId: string): Promise<SickLeave | null> => {
    const path = 'sick_leaves';
    try {
      // Try searching by leaveNumber first if provided
      if (leaveNumber) {
        const q = query(collection(db, path), where('leaveNumber', '==', leaveNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const leave = { ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id } as SickLeave;
          // If patientId is also provided, verify it matches
          if (patientId && leave.patientId !== patientId) return null;
          return leave;
        }
      }
      
      // If not found by leaveNumber or leaveNumber not provided, try by patientId
      if (patientId) {
        const q = query(collection(db, path), where('patientId', '==', patientId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          // Return the most recent one if multiple exist
          const sortedDocs = querySnapshot.docs.sort((a, b) => b.data().createdAt - a.data().createdAt);
          return { ...sortedDocs[0].data(), id: sortedDocs[0].id } as SickLeave;
        }
      }
      
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  addLeave: async (leave: Omit<SickLeave, 'id' | 'createdAt' | 'status' | 'qrCodeData' | 'leaveNumber'>): Promise<SickLeave> => {
    const path = 'sick_leaves';
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
      const leaveNumber = `GSL-${dateStr}-${randomStr}`;
      
      const docRef = doc(collection(db, path));
      const id = docRef.id;
      
      const newLeave = {
        ...leave,
        id,
        createdAt: Date.now(),
        status: 'active' as const,
        leaveNumber,
        qrCodeData: `${window.location.origin}/verify/${id}`
      };
      
      // Sanitize undefined fields
      const sanitizedLeave = Object.fromEntries(
        Object.entries(newLeave).map(([k, v]) => [k, v === undefined ? null : v])
      );
      
      await setDoc(docRef, sanitizedLeave);
      return newLeave as SickLeave;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  getPatients: async (): Promise<Patient[]> => {
    const path = 'patients';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Patient));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  addPatient: async (patient: Patient): Promise<Patient> => {
    const path = `patients/${patient.id}`;
    try {
      const newPatient = {
        ...patient,
        createdAt: Date.now()
      };
      
      const sanitizedPatient = Object.fromEntries(
        Object.entries(newPatient).map(([k, v]) => [k, v === undefined ? null : v])
      );
      
      await setDoc(doc(db, 'patients', patient.id), sanitizedPatient);
      return patient;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  updatePatient: async (id: string, data: Partial<Patient>): Promise<void> => {
    const path = `patients/${id}`;
    try {
      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  deletePatient: async (id: string): Promise<void> => {
    const path = `patients/${id}`;
    try {
      const docRef = doc(db, 'patients', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  },

  updateLeave: async (id: string, data: Partial<SickLeave>): Promise<void> => {
    const path = `sick_leaves/${id}`;
    try {
      const docRef = doc(db, 'sick_leaves', id);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  deleteLeave: async (id: string): Promise<void> => {
    const path = `sick_leaves/${id}`;
    try {
      const docRef = doc(db, 'sick_leaves', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }
};

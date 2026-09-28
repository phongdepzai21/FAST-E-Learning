import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export type UserRole = 'Owner' | 'Admin' | 'User';

export interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  isOwner: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isTeacher?: boolean;
  updatedAt?: string;
  createdAt?: string;
  status?: string;
}

// Hardcoded core emails
export const OWNER_EMAILS = [
  'h1h4phong@gmail.com',
  'trdung153@gmail.com'
];

export const ADMIN_EMAILS = [
  'h1h4phong@gmail.com',
  'hkc.qms@gmail.com',
  'trdung153@gmail.com',
  'lediem.ngo@gmail.com'
];

/**
 * Helper to determine role based on email
 */
export function determineUserRole(email: string): {
  role: UserRole;
  isOwner: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isTeacher: boolean;
} {
  const normalized = email.toLowerCase().trim();
  const isOwner = OWNER_EMAILS.includes(normalized);
  const isAdmin = ADMIN_EMAILS.includes(normalized);
  
  if (isOwner) {
    return {
      role: 'Owner',
      isOwner: true,
      isAdmin: true,
      isUser: true,
      isTeacher: true
    };
  } else if (isAdmin) {
    return {
      role: 'Admin',
      isOwner: false,
      isAdmin: true,
      isUser: true,
      isTeacher: true
    };
  } else {
    return {
      role: 'User',
      isOwner: false,
      isAdmin: false,
      isUser: true,
      isTeacher: false
    };
  }
}

/**
 * Access Control Authorization Rules
 */
export const RBAC = {
  // Ensure 'Owner' can manage all records
  canManageAllRecords(role: UserRole): boolean {
    return role === 'Owner';
  },

  // 'Admin' can access the synchronization dashboards
  canAccessSyncDashboards(role: UserRole): boolean {
    return role === 'Owner' || role === 'Admin';
  },

  // Enforce that only 'Owner' and 'Admin' roles can access the protected collections (FSA-Checklist, ATTP, Ads)
  canAccessProtectedCollections(role: UserRole): boolean {
    return role === 'Owner' || role === 'Admin';
  }
};

/**
 * Sync user profile to Firestore using RBAC rules
 */
export async function syncUserProfile(
  email: string,
  displayName?: string,
  photoURL?: string
): Promise<UserProfile> {
  const normalizedEmail = email.toLowerCase().trim();
  const roleInfo = determineUserRole(normalizedEmail);

  const userDocRef = doc(db, 'users', normalizedEmail);
  const userSnapshot = await getDoc(userDocRef);

  let profileData: Partial<UserProfile> = {
    email: normalizedEmail,
    displayName: displayName || 'Học viên',
    photoURL: photoURL || '',
    updatedAt: new Date().toISOString()
  };

  if (!userSnapshot.exists()) {
    // New user profile creation
    profileData.createdAt = new Date().toISOString();
    profileData.status = 'approved';
    profileData.role = roleInfo.role;
    profileData.isOwner = roleInfo.isOwner;
    profileData.isAdmin = roleInfo.isAdmin;
    profileData.isUser = roleInfo.isUser;
    profileData.isTeacher = roleInfo.isTeacher;
    
    await setDoc(userDocRef, profileData);
  } else {
    const existing = userSnapshot.data() as UserProfile;
    // For existing users, retain system roles unless they are hardcoded Owners/Admins
    const finalRole = roleInfo.isOwner ? 'Owner' : (roleInfo.isAdmin ? 'Admin' : (existing.role || 'User'));
    const finalIsOwner = roleInfo.isOwner || !!existing.isOwner;
    const finalIsAdmin = roleInfo.isAdmin || !!existing.isAdmin || finalRole === 'Admin' || finalRole === 'Owner';
    const finalIsTeacher = roleInfo.isTeacher || !!existing.isTeacher || finalIsAdmin;

    profileData.role = finalRole as UserRole;
    profileData.isOwner = finalIsOwner;
    profileData.isAdmin = finalIsAdmin;
    profileData.isUser = true;
    profileData.isTeacher = finalIsTeacher;

    await setDoc(userDocRef, profileData, { merge: true });
  }

  return {
    ...profileData,
    role: profileData.role || 'User',
    isOwner: !!profileData.isOwner,
    isAdmin: !!profileData.isAdmin,
    isUser: true
  } as UserProfile;
}

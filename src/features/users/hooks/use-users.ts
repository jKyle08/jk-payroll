// ==============================================================================
// JK-PAYROLL: CLIENT USE-USERS HOOK
// File: src/features/users/hooks/use-users.ts
// ==============================================================================

import { useState } from 'react';
import { UserProfileData } from '../../../components/layout/user-profile-popover.js';

export function useUsers(initialUsers: UserProfileData[] = []) {
  const [users, setUsers] = useState<UserProfileData[]>(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  return {
    users,
    setUsers,
    selectedUserId,
    setSelectedUserId,
  };
}

export default useUsers;

// ==============================================================================
// JK-PAYROLL: USER AVATAR COMPONENT
// File: src/features/users/components/user-avatar.tsx
// ==============================================================================

import React from 'react';

export interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, size = 'md' }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  return (
    <div
      className={`${sizeClasses} rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold tracking-wider flex-shrink-0`}
    >
      {initials || 'U'}
    </div>
  );
};

export default UserAvatar;

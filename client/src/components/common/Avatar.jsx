import React from 'react';

export default function Avatar({
  name = 'User',
  color = '#6366f1',
  size = 'md',
  isOnline = false,
  className = '',
  showTooltip = false
}) {
  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs font-semibold',
    lg: 'w-10 h-10 text-sm font-semibold',
    xl: 'w-12 h-12 text-base font-bold'
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5 ring-1',
    sm: 'w-2 h-2 ring-1.5',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-3.5 h-3.5 ring-2'
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full text-white font-medium shadow-sm select-none shrink-0 ${sizeClasses[size] || sizeClasses.md} ${className}`}
      style={{ backgroundColor: color || '#6366f1' }}
      title={showTooltip ? name : undefined}
    >
      <span>{getInitials(name)}</span>

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 bg-emerald-500 ring-white rounded-full ${dotSizes[size] || dotSizes.md}`}
          title="Online right now"
        />
      )}
    </div>
  );
}

import React from 'react';
import { AlertCircle, ArrowUp, ArrowDown, Clock } from 'lucide-react';

export function PriorityBadge({ priority = 'medium', size = 'sm' }) {
  const p = priority.toLowerCase();

  const configs = {
    urgent: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: AlertCircle,
      label: 'Urgent'
    },
    high: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: ArrowUp,
      label: 'High'
    },
    medium: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Clock,
      label: 'Medium'
    },
    low: {
      bg: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: ArrowDown,
      label: 'Low'
    }
  };

  const config = configs[p] || configs.medium;
  const Icon = config.icon;

  const sizeClass = size === 'xs' 
    ? 'text-[10px] px-1.5 py-0.5 gap-1' 
    : 'text-xs px-2 py-0.5 gap-1.5';

  return (
    <span className={`inline-flex items-center font-medium rounded-md border ${config.bg} ${sizeClass}`}>
      <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      <span>{config.label}</span>
    </span>
  );
}

export function LabelTag({ name, color = '#6366f1', onRemove = null, size = 'sm' }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border"
      style={{
        backgroundColor: `${color}15`,
        color: color,
        borderColor: `${color}30`
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-75 transition-opacity"
        >
          ×
        </button>
      )}
    </span>
  );
}

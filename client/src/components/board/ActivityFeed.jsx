import React from 'react';
import Avatar from '../common/Avatar';
import { 
  Activity as ActivityIcon, 
  PlusCircle, 
  ArrowRight, 
  MessageSquare, 
  UserPlus, 
  CheckCircle2, 
  Trash2 
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function ActivityFeed({ activities = [] }) {
  const getActionDetails = (activity) => {
    let details = {};
    try {
      details = JSON.parse(activity.details || '{}');
    } catch (e) {}

    switch (activity.action) {
      case 'created_project':
        return {
          icon: PlusCircle,
          iconColor: 'text-brand-600 bg-brand-50',
          text: `created the project "${details.name || ''}"`
        };
      case 'created_task':
        return {
          icon: PlusCircle,
          iconColor: 'text-indigo-600 bg-indigo-50',
          text: `created task "${details.taskTitle || ''}"`
        };
      case 'moved_task':
        return {
          icon: ArrowRight,
          iconColor: 'text-amber-600 bg-amber-50',
          text: `moved "${details.taskTitle || ''}" from ${details.fromColumn} to ${details.toColumn}`
        };
      case 'added_comment':
        return {
          icon: MessageSquare,
          iconColor: 'text-blue-600 bg-blue-50',
          text: `commented on task "${details.taskTitle || ''}"`
        };
      case 'added_member':
        return {
          icon: UserPlus,
          iconColor: 'text-emerald-600 bg-emerald-50',
          text: `added ${details.memberName || 'a new member'} as ${details.role}`
        };
      case 'deleted_task':
        return {
          icon: Trash2,
          iconColor: 'text-rose-600 bg-rose-50',
          text: `deleted task "${details.taskTitle || ''}"`
        };
      default:
        return {
          icon: ActivityIcon,
          iconColor: 'text-slate-600 bg-slate-50',
          text: activity.action
        };
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
        
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl">
            <ActivityIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Project Activity Stream</h2>
            <p className="text-xs text-slate-500">Real-time log of team collaborations and updates</p>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ActivityIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No activity recorded yet</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
            {activities.map((a) => {
              const info = getActionDetails(a);
              const Icon = info.icon;

              let timeAgo = 'recently';
              try {
                timeAgo = formatDistanceToNow(parseISO(a.created_at), { addSuffix: true });
              } catch (e) {}

              return (
                <div key={a.id} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1">
                    <Avatar name={a.user_name} color={a.avatar_color} size="xs" />
                  </div>

                  <div className="flex-1 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900">{a.user_name || 'Team member'}</span>
                      <span className="text-[10px] text-slate-400">{timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <div className={`p-1 rounded-md ${info.iconColor}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <p className="leading-snug">{info.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

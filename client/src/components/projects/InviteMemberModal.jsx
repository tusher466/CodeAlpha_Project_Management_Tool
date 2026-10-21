import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Avatar from '../common/Avatar';
import { X, UserPlus, Shield } from 'lucide-react';

export default function InviteMemberModal({
  isOpen,
  onClose,
  projectId,
  existingMemberIds = [],
  onMemberAdded
}) {
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getUsers().then(res => {
        setAllUsers(res.users || []);
        const eligible = (res.users || []).filter(u => !existingMemberIds.includes(u.id));
        if (eligible.length > 0) {
          setSelectedUserId(eligible[0].id);
        }
      }).catch(err => console.error(err));
    }
  }, [isOpen, existingMemberIds]);

  if (!isOpen) return null;

  const eligibleUsers = allUsers.filter(u => !existingMemberIds.includes(u.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      setLoading(true);
      const res = await api.addProjectMember(projectId, {
        userId: selectedUserId,
        role
      });
      onMemberAdded(res.member);
      onClose();
    } catch (err) {
      console.error('Failed to add member:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Invite Team Member</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {eligibleUsers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              All registered users are already members of this project!
            </p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select User
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {eligibleUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition-colors ${
                        selectedUserId === u.id
                          ? 'bg-brand-50 border border-brand-300 text-brand-700 font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700'
                      }`}
                    >
                      <Avatar name={u.name} color={u.avatar_color} size="xs" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{u.role || u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Project Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:border-brand-500 shadow-xs"
                >
                  <option value="member">Member (Can edit tasks & comments)</option>
                  <option value="admin">Admin (Can manage columns & members)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedUserId}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-40"
                >
                  {loading ? 'Adding...' : 'Add to Project'}
                </button>
              </div>
            </>
          )}

        </form>

      </div>
    </div>
  );
}

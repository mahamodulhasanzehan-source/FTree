import React from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { FamilyMember } from '../../types';

interface SidebarHeaderProps {
  member: FamilyMember;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  member,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <div className="h-11 px-3 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/95 flex-shrink-0 select-none">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 border border-slate-700/80 shadow-sm"
          style={{ backgroundColor: member.color || '#6366F1' }}
          title={`Lineage: ${member.color}`}
        />
        <h2 className="text-xs font-bold text-slate-100 truncate tracking-tight">
          {member.firstName || 'Unnamed'} {member.lastName}
        </h2>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          title="Close Sidebar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

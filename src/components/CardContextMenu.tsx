import React, { useEffect, useRef } from 'react';
import { 
  Heart, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  Layers 
} from 'lucide-react';
import { FamilyMember } from '../types';
import { calculateMemberGenerations, getMinAllowedGeneration } from '../utils/treeLayout';

interface CardContextMenuProps {
  x: number;
  y: number;
  member: FamilyMember | null;
  allMembers?: FamilyMember[];
  isOpen: boolean;
  onClose: () => void;
  onAddParent: (targetMember: FamilyMember) => void;
  onAddSpouse: (targetMember: FamilyMember) => void;
  onAddChild: (targetMember: FamilyMember) => void;
  onEditMember: (targetMember: FamilyMember) => void;
  onDeleteMember: (memberId: string) => void;
  onChangeGeneration?: (memberId: string, newGen: number) => void;
}

export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  x,
  y,
  member,
  allMembers = [],
  isOpen,
  onClose,
  onAddParent,
  onAddSpouse,
  onAddChild,
  onEditMember,
  onDeleteMember,
  onChangeGeneration,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleOutside);
      window.addEventListener('scroll', onClose);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', onClose);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  const currentGens = calculateMemberGenerations(allMembers);
  const currentGen = currentGens.get(member.id) ?? member.generation ?? 1;
  const minAllowed = getMinAllowedGeneration(member.id, allMembers);

  return (
    <div
      ref={menuRef}
      style={{
        top: Math.min(y, window.innerHeight - 340),
        left: Math.min(x, window.innerWidth - 250),
      }}
      className="fixed z-50 w-60 bg-slate-900/98 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={e => e.stopPropagation()}
    >
      {/* Target Member Header */}
      <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: member.color || '#64748B' }}
          />
          <div className="font-bold text-slate-100 truncate text-[11px]">
            {member.firstName || member.lastName ? `${member.firstName} ${member.lastName}`.trim() : 'Unnamed Member'}
          </div>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-950 border border-indigo-800/60 rounded text-indigo-300">
          Gen {currentGen}
        </span>
      </div>

      {/* Generation Selector */}
      <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-950/40 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <Layers size={12} className="text-indigo-400" /> Generation Level:
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Min: Gen {minAllowed}</span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6].map(g => {
            const isDisabled = g < minAllowed;
            const isSelected = currentGen === g;
            return (
              <button
                key={g}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  onChangeGeneration?.(member.id, g);
                  onClose();
                }}
                className={`flex-1 py-1 rounded text-[10px] font-mono font-semibold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDisabled
                    ? 'bg-slate-950/40 text-slate-600 cursor-not-allowed opacity-50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={isDisabled ? `Must be at least Generation ${minAllowed} based on parents` : `Set to Generation ${g}`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Relational Quick Actions */}
      <div className="py-1">
        <button
          onClick={() => {
            onAddParent(member);
            onClose();
          }}
          className="w-full px-3.5 py-1.5 text-left hover:bg-indigo-600 hover:text-white flex items-center gap-2.5 transition-colors font-medium text-slate-200"
        >
          <ArrowUp size={14} className="text-indigo-400" />
          <span>Add Parent</span>
        </button>

        <button
          onClick={() => {
            onAddSpouse(member);
            onClose();
          }}
          className="w-full px-3.5 py-1.5 text-left hover:bg-pink-600 hover:text-white flex items-center gap-2.5 transition-colors font-medium text-slate-200"
        >
          <Heart size={14} className="text-pink-400" />
          <span>Add Spouse / Partner</span>
        </button>

        <button
          onClick={() => {
            onAddChild(member);
            onClose();
          }}
          className="w-full px-3.5 py-1.5 text-left hover:bg-emerald-600 hover:text-white flex items-center gap-2.5 transition-colors font-medium text-slate-200"
        >
          <ArrowDown size={14} className="text-emerald-400" />
          <span>Add Child</span>
        </button>
      </div>

      <div className="my-1 border-t border-slate-800" />

      {/* Edit and Manage */}
      <div className="py-1">
        <button
          onClick={() => {
            onEditMember(member);
            onClose();
          }}
          className="w-full px-3.5 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-slate-300"
        >
          <Edit3 size={13} className="text-slate-400" />
          <span>Edit Details & Relationships</span>
        </button>

        <button
          onClick={() => {
            onDeleteMember(member.id);
            onClose();
          }}
          className="w-full px-3.5 py-1.5 text-left hover:bg-red-950/60 hover:text-red-300 flex items-center gap-2.5 transition-colors text-red-400"
        >
          <Trash2 size={13} />
          <span>Delete Member</span>
        </button>
      </div>
    </div>
  );
};

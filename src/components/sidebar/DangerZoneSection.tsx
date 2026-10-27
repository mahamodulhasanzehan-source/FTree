import React from 'react';
import { Trash2 } from 'lucide-react';
import { FamilyMember } from '../../types';

interface DangerZoneSectionProps {
  member: FamilyMember;
  onDeleteMember: (memberId: string) => void;
  onClose: () => void;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  member,
  onDeleteMember,
  onClose,
}) => {
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => {
          onDeleteMember(member.id);
          onClose();
        }}
        className="w-full py-1.5 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors"
      >
        <Trash2 size={12} /> Delete Member
      </button>
    </div>
  );
};

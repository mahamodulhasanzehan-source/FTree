import React from 'react';
import { Calendar } from 'lucide-react';
import { FamilyMember } from '../../types';

interface VitalDatesSectionProps {
  member: FamilyMember;
  onUpdateMember: (updated: FamilyMember) => void;
}

export const VitalDatesSection: React.FC<VitalDatesSectionProps> = ({
  member,
  onUpdateMember,
}) => {
  const calculateAge = (): string | null => {
    if (!member.birthDate) return null;
    const birth = new Date(member.birthDate);
    if (isNaN(birth.getTime())) return null;

    const endDate = !member.isLiving && member.deathDate
      ? new Date(member.deathDate)
      : new Date();

    if (isNaN(endDate.getTime())) return null;

    let age = endDate.getFullYear() - birth.getFullYear();
    const m = endDate.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && endDate.getDate() < birth.getDate())) {
      age--;
    }
    if (age < 0) return null;
    return !member.isLiving ? `${age} years old (at death)` : `${age} years old`;
  };

  const ageStr = calculateAge();

  return (
    <section className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Calendar size={13} className="text-indigo-400" /> Vital Dates
        </span>
      </div>

      {/* Vertical list of fields */}
      <div className="space-y-2 pt-0.5">
        {/* Currently Living checkbox */}
        <label className="flex items-center gap-2 p-1.5 bg-slate-950/60 border border-slate-800 rounded-md text-xs text-slate-300 cursor-pointer hover:bg-slate-950 transition-colors">
          <input
            type="checkbox"
            checked={member.isLiving}
            onChange={e => onUpdateMember({ ...member, isLiving: e.target.checked })}
            className="rounded border-slate-700 text-indigo-600 bg-slate-900 focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-[11px] font-medium text-slate-300">Currently Living</span>
        </label>

        {/* Date of Birth */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            value={member.birthDate || ''}
            onChange={e => onUpdateMember({ ...member, birthDate: e.target.value || undefined })}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
        </div>

        {/* Date of Death */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Date of Death {!member.isLiving && <span className="text-red-400">*</span>}
          </label>
          <input
            type="date"
            disabled={member.isLiving}
            value={member.deathDate || ''}
            onChange={e => onUpdateMember({ ...member, deathDate: e.target.value || undefined })}
            className={`w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors ${
              member.isLiving ? 'opacity-30 cursor-not-allowed bg-slate-900' : ''
            }`}
          />
        </div>

        {/* Age display badge */}
        {ageStr && (
          <div className="p-1.5 bg-indigo-950/40 border border-indigo-900/50 rounded-md text-[11px] text-indigo-300 flex items-center justify-between">
            <span className="text-slate-400">Age:</span>
            <span className="font-semibold">{ageStr}</span>
          </div>
        )}
      </div>
    </section>
  );
};

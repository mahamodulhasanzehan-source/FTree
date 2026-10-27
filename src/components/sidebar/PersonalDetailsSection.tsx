import React from 'react';
import { User, Layers } from 'lucide-react';
import { FamilyMember, Gender } from '../../types';
import { getGenderColor } from '../../utils/colorEngine';
import { calculateMemberGenerations, getMinAllowedGeneration } from '../../utils/treeLayout';

interface PersonalDetailsSectionProps {
  member: FamilyMember;
  allMembers?: FamilyMember[];
  onUpdateMember: (updated: FamilyMember) => void;
}

export const PersonalDetailsSection: React.FC<PersonalDetailsSectionProps> = ({
  member,
  allMembers = [],
  onUpdateMember,
}) => {
  const currentGens = calculateMemberGenerations(allMembers);
  const currentGen = currentGens.get(member.id) ?? member.generation ?? 1;
  const minAllowed = getMinAllowedGeneration(member.id, allMembers);

  return (
    <section className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 space-y-2">
      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
        <User size={13} className="text-indigo-400" /> Personal Details
      </span>

      {/* Vertical list of fields: First Name -> Last Name -> Maiden Name -> Gender -> Generation */}
      <div className="space-y-2 pt-0.5">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            First Name
          </label>
          <input
            type="text"
            value={member.firstName}
            onChange={e => onUpdateMember({ ...member, firstName: e.target.value })}
            placeholder="First name..."
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Last Name
          </label>
          <input
            type="text"
            value={member.lastName}
            onChange={e => onUpdateMember({ ...member, lastName: e.target.value })}
            placeholder="Last name..."
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Maiden Name
          </label>
          <input
            type="text"
            value={member.maidenName || ''}
            onChange={e => onUpdateMember({ ...member, maidenName: e.target.value || undefined })}
            placeholder="Optional birth surname..."
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Gender
          </label>
          <select
            value={member.gender}
            onChange={e => {
              const newGender = e.target.value as Gender;
              const updates: Partial<FamilyMember> = { gender: newGender };
              if (member.colorMode !== 'custom') {
                updates.color = getGenderColor(newGender);
              }
              onUpdateMember({ ...member, ...updates });
            }}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other / Non-Binary</option>
          </select>
        </div>

        {/* Generation Level Selector */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Layers size={11} className="text-indigo-400" /> Generation
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              Min: Gen {minAllowed}
            </span>
          </div>
          <select
            value={String(currentGen)}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              onUpdateMember({
                ...member,
                generation: Math.max(minAllowed, val),
              });
            }}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(g => (
              <option 
                key={g} 
                value={String(g)} 
                disabled={g < minAllowed}
              >
                Generation {g} {g < minAllowed ? `(Blocked: parent is Gen ${minAllowed - 1})` : ''}
              </option>
            ))}
          </select>
          {minAllowed > 1 && (
            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
              Parents must sit 1 generation above their children.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

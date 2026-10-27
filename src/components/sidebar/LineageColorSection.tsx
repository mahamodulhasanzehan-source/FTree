import React from 'react';
import { Palette, Shuffle, RotateCcw, UserCheck, Sparkles } from 'lucide-react';
import { FamilyMember } from '../../types';
import { 
  PRESET_COLORS, 
  isValidHex, 
  normalizeHex, 
  getRandomHexColor, 
  calculateInheritedColor,
  getGenderColor
} from '../../utils/colorEngine';

interface LineageColorSectionProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onUpdateMember: (updated: FamilyMember) => void;
}

export const LineageColorSection: React.FC<LineageColorSectionProps> = ({
  member,
  allMembers,
  onUpdateMember,
}) => {
  const isCustomMode = member.colorMode === 'custom';
  const genderColor = getGenderColor(member.gender);

  const handleSelectMode = (mode: 'gender' | 'custom') => {
    if (mode === 'gender') {
      onUpdateMember({
        ...member,
        colorMode: 'gender',
        color: genderColor,
        isCustomColor: false,
      });
    } else {
      onUpdateMember({
        ...member,
        colorMode: 'custom',
        isCustomColor: true,
      });
    }
  };

  const handleRandomizeColor = () => {
    const hex = getRandomHexColor();
    onUpdateMember({
      ...member,
      color: hex,
      colorMode: 'custom',
      isCustomColor: true,
    });
  };

  const handleResetToInherited = () => {
    const parentColors = (member.parentIds || []).map(pId => {
      const p = allMembers.find(m => m.id === pId);
      return p?.color;
    });
    const inherited = calculateInheritedColor(parentColors);
    onUpdateMember({
      ...member,
      color: inherited.color,
      colorMode: 'custom',
      isCustomColor: true,
    });
  };

  return (
    <section className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Palette size={13} className="text-indigo-400" /> Module Color
        </span>
      </div>

      {/* Mode Switcher: Gender-based (Default) vs Custom */}
      <div className="grid grid-cols-2 p-0.5 bg-slate-950 border border-slate-800 rounded-md text-[11px] font-medium">
        <button
          type="button"
          onClick={() => handleSelectMode('gender')}
          className={`py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
            !isCustomMode
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck size={11} /> By Gender
        </button>
        <button
          type="button"
          onClick={() => handleSelectMode('custom')}
          className={`py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
            isCustomMode
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={11} /> Custom
        </button>
      </div>

      {!isCustomMode ? (
        /* Gender-based Info & Color Preview */
        <div className="p-2 bg-slate-950/70 border border-slate-800/80 rounded-md space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Current Gender:</span>
            <span className="font-semibold capitalize text-slate-200 text-[11px]">
              {member.gender || 'other'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="text-[11px] text-slate-400">Assigned Color:</span>
            <div className="flex items-center gap-1.5">
              <span 
                className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: genderColor }}
              />
              <span className="font-mono text-[10px] text-slate-300">{genderColor}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 pt-0.5 leading-tight">
            Color automatically syncs with gender (Male: Blue, Female: Pink, Other: Gray).
          </p>
        </div>
      ) : (
        /* Custom Color Options */
        <div className="space-y-2">
          {/* Preset Swatches Palette */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onUpdateMember({
                    ...member,
                    color: c,
                    colorMode: 'custom',
                    isCustomColor: true,
                  });
                }}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  member.color === c ? 'scale-125 border-white shadow-sm ring-1 ring-white/50' : 'border-slate-700/80 hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          {/* Custom Hex input & quick action buttons in a neat list */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0"
                style={{ backgroundColor: member.color || '#4B5563' }}
              />
              <input
                type="text"
                value={member.color || '#4B5563'}
                onChange={e => {
                  if (isValidHex(e.target.value)) {
                    onUpdateMember({
                      ...member,
                      color: normalizeHex(e.target.value),
                      colorMode: 'custom',
                      isCustomColor: true,
                    });
                  }
                }}
                className="flex-1 px-2 py-1 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleRandomizeColor}
                className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-[11px] text-slate-200 rounded-md flex items-center justify-center gap-1 transition-colors"
              >
                <Shuffle size={11} /> Random
              </button>
              {member.parentIds && member.parentIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetToInherited}
                  className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-[11px] text-indigo-300 rounded-md flex items-center justify-center gap-1 transition-colors"
                >
                  <RotateCcw size={11} /> Inherit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

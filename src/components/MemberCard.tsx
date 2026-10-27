import React from 'react';
import { Calendar, User } from 'lucide-react';
import { FamilyMember } from '../types';
import { hexToRgb, getGenderColor } from '../utils/colorEngine';

interface MemberCardProps {
  member: FamilyMember;
  onSelect: (member: FamilyMember, e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent, member: FamilyMember) => void;
  onMouseDown?: (e: React.MouseEvent, member: FamilyMember) => void;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  showAges?: boolean;
  showDates?: boolean;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  onSelect,
  onContextMenu,
  onMouseDown,
  isSelected,
  isMultiSelected,
  showAges = true,
  showDates = true,
}) => {
  // Dynamically calculate age from DOB and current date / DOD
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
    return `${age} yrs`;
  };

  const getInitials = (): string => {
    const first = member.firstName?.trim().charAt(0) || '';
    const last = member.lastName?.trim().charAt(0) || '';
    return (first + last).toUpperCase();
  };

  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();

  // Dynamic font scaling: starts significantly larger (29px - 33px) and scales down only when actually approaching card boundaries
  const getNameFontClass = (len: number, hasDateRow: boolean) => {
    if (!hasDateRow) {
      if (len <= 8) return 'text-[33px]';
      if (len <= 11) return 'text-[29px]';
      if (len <= 14) return 'text-[25px]';
      if (len <= 17) return 'text-[21.5px]';
      if (len <= 22) return 'text-[18px]';
      if (len <= 28) return 'text-[15.5px]';
      return 'text-[14px]';
    }
    if (len <= 8) return 'text-[29px]';
    if (len <= 11) return 'text-[25px]';
    if (len <= 14) return 'text-[22px]';
    if (len <= 17) return 'text-[19px]';
    if (len <= 22) return 'text-[16.5px]';
    if (len <= 28) return 'text-[14.5px]';
    return 'text-[13px]';
  };

  const formatYear = (dateStr?: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : String(d.getFullYear());
  };

  const birthYear = formatYear(member.birthDate);
  const deathYear = formatYear(member.deathDate);
  const ageStr = calculateAge();

  const zoom = member.imageZoom ?? 1;
  const offsetX = member.imageOffsetX ?? 0;
  const offsetY = member.imageOffsetY ?? 0;

  // Theme color is gender-based by default (Male = Blue, Female = Pink, Other = Gray), or custom if configured
  const themeColor = member.colorMode === 'custom'
    ? (member.color || '#64748B')
    : getGenderColor(member.gender);
  const highlighted = isSelected || isMultiSelected;
  const isDefaultColor = !member.color || 
    member.color.toUpperCase() === '#64748B' || 
    member.color.toUpperCase() === '#4B5563';
  const rgb = hexToRgb(themeColor);

  return (
    <div
      onMouseDown={(e) => {
        onMouseDown?.(e, member);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(member, e);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, member);
      }}
      style={{
        width: 190,
        height: 250,
        borderColor: highlighted ? '#A5B4FC' : themeColor,
        borderWidth: highlighted ? 4.5 : 3.5,
        borderStyle: 'solid',
        boxShadow: highlighted
          ? `0 0 0 2px #6366F1, 0 0 22px ${themeColor}B3, 0 16px 32px -4px rgba(0, 0, 0, 0.7)`
          : `0 4px 16px -2px rgba(0, 0, 0, 0.45), 0 0 8px ${themeColor}26`,
      }}
      className={`group relative bg-slate-900 rounded-xl transition-shadow duration-150 cursor-pointer overflow-hidden flex flex-col hover:shadow-2xl select-none ${
        highlighted ? 'ring-2 ring-indigo-500/80' : ''
      }`}
    >
      {/* Multi-selection Check Indicator */}
      {isMultiSelected && (
        <div className="absolute top-2 left-2 z-20 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md border border-white/50">
          ✓
        </div>
      )}

      {/* Top Image Area */}
      <div className="relative w-full h-[164px] bg-slate-950 overflow-hidden flex items-center justify-center flex-shrink-0">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt={`${member.firstName} ${member.lastName}`}
            style={{
              transform: `scale(${zoom}) translate(${offsetX}%, ${offsetY}%)`,
              transformOrigin: 'center center',
            }}
            className="w-full h-full object-contain pointer-events-none transition-transform duration-100 ease-out"
          />
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-slate-950"
          >
            {/* Lineage subtle glow background */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(circle at center, ${themeColor}, transparent 70%)`
              }}
            />
            <div 
              className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-slate-100 font-bold text-xl shadow-inner z-10"
              style={{ borderColor: themeColor }}
            >
              {getInitials() || <User size={22} className="text-slate-500" />}
            </div>
            <span className="text-[10px] text-slate-500 mt-1.5 z-10 tracking-wider">No Photo</span>
          </div>
        )}

        {/* Deceased indicator badge */}
        {!member.isLiving && (
          <div
            title="Deceased"
            className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/85 backdrop-blur-sm border border-slate-700 text-[11px] font-bold text-slate-300 font-serif"
          >
            †
          </div>
        )}
      </div>

      {/* Bottom Information Area */}
      <div 
        className="flex-1 px-2.5 py-2 flex flex-col justify-center border-t transition-colors duration-150"
        style={{
          backgroundColor: !isDefaultColor 
            ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)` 
            : 'rgba(15, 23, 42, 0.95)',
          background: !isDefaultColor
            ? `linear-gradient(to bottom, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.24) 100%), #0F172A`
            : undefined,
          borderTopColor: !isDefaultColor 
            ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)` 
            : 'rgba(51, 65, 85, 0.8)',
        }}
      >
        <div>
          {/* Member Name with dynamic scaling (starts large by default and fills borders nicely) */}
          <h3 
            className={`font-bold text-slate-100 truncate leading-tight ${getNameFontClass(
              fullName.length,
              Boolean((showDates && (birthYear || deathYear || member.isLiving)) || (showAges && ageStr))
            )}`}
            title={fullName || 'Blank Member'}
          >
            {fullName || <span className="text-slate-500/80 font-normal italic text-xs tracking-wide">Untitled</span>}
          </h3>

          {/* Maiden Name (if present) */}
          {member.maidenName && (
            <div className="text-[11px] text-slate-400 truncate italic leading-tight mt-0.5">
              (née {member.maidenName})
            </div>
          )}

          {/* Alive Date Range and/or Age (respects showDates and showAges toggles) */}
          {((showDates && (birthYear || deathYear || member.isLiving)) || (showAges && ageStr)) && (
            <div className="mt-2 flex items-center gap-1.5 text-[13.5px] font-medium text-slate-200">
              {showDates && (
                <>
                  <Calendar size={13.5} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">
                    {birthYear || '?'} – {member.isLiving ? 'Present' : (deathYear || '†')}
                  </span>
                </>
              )}
              {showAges && ageStr && (
                <span className="font-semibold text-indigo-300 flex-shrink-0">
                  {showDates ? `• ${ageStr}` : `Age: ${ageStr}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

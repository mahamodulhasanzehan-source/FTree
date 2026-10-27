import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Shuffle, 
  RotateCcw, 
  Camera, 
  Calendar, 
  User, 
  Palette, 
  Check, 
  FileText 
} from 'lucide-react';
import { FamilyMember, Gender, AdoptionStatus } from '../types';
import { 
  PRESET_COLORS, 
  DEFAULT_MEMBER_COLOR, 
  isValidHex, 
  normalizeHex, 
  getRandomHexColor, 
  calculateInheritedColor,
  getContrastingTextColor 
} from '../utils/colorEngine';
import { convertImageToBase64 } from '../utils/fileSystem';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: FamilyMember) => void;
  initialMember?: FamilyMember | null;
  allMembers: FamilyMember[];
  presetParentIds?: string[];
  presetSpouseIds?: string[];
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMember,
  allMembers,
  presetParentIds = [],
  presetSpouseIds = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [maidenName, setMaidenName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [isLiving, setIsLiving] = useState(true);
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [color, setColor] = useState(DEFAULT_MEMBER_COLOR);
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [parentIds, setParentIds] = useState<string[]>([]);
  const [spouseIds, setSpouseIds] = useState<string[]>([]);
  const [adoptionStatus, setAdoptionStatus] = useState<AdoptionStatus>('biological');
  const [notes, setNotes] = useState('');
  const [colorInput, setColorInput] = useState(DEFAULT_MEMBER_COLOR);

  // Compute what the inherited color would be based on selected parent IDs
  const computeInherited = (currentParentIds: string[]) => {
    const parentColors = currentParentIds.map(pId => {
      const p = allMembers.find(m => m.id === pId);
      return p?.color;
    });
    return calculateInheritedColor(parentColors);
  };

  useEffect(() => {
    if (initialMember) {
      setFirstName(initialMember.firstName || '');
      setLastName(initialMember.lastName || '');
      setMaidenName(initialMember.maidenName || '');
      setNickname(initialMember.nickname || '');
      setGender(initialMember.gender || 'male');
      setBirthDate(initialMember.birthDate || '');
      setDeathDate(initialMember.deathDate || '');
      setIsLiving(initialMember.isLiving ?? true);
      setAvatar(initialMember.avatar);
      setColor(initialMember.color || DEFAULT_MEMBER_COLOR);
      setColorInput(initialMember.color || DEFAULT_MEMBER_COLOR);
      setIsCustomColor(Boolean(initialMember.isCustomColor));
      setParentIds(initialMember.parentIds || []);
      setSpouseIds(initialMember.spouseIds || []);
      setAdoptionStatus(initialMember.adoptionStatus || 'biological');
      setNotes(initialMember.notes || '');
    } else {
      // New Member
      setFirstName('');
      setLastName('');
      setMaidenName('');
      setNickname('');
      setGender('male');
      setBirthDate('');
      setDeathDate('');
      setIsLiving(true);
      setAvatar(undefined);
      setParentIds(presetParentIds);
      setSpouseIds(presetSpouseIds);
      setAdoptionStatus('biological');
      setNotes('');

      // Auto-calculate genetic blended color if parents were provided
      const inherited = computeInherited(presetParentIds);
      setColor(inherited.color);
      setColorInput(inherited.color);
      setIsCustomColor(false);
    }
  }, [initialMember, isOpen, presetParentIds, presetSpouseIds]);

  if (!isOpen) return null;

  // Age calculation preview
  const calculateAge = (): string | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;

    const endDate = !isLiving && deathDate ? new Date(deathDate) : new Date();
    if (isNaN(endDate.getTime())) return null;

    let age = endDate.getFullYear() - birth.getFullYear();
    const m = endDate.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && endDate.getDate() < birth.getDate())) {
      age--;
    }
    if (age < 0) return null;
    return !isLiving ? `${age} years old (at death)` : `${age} years old`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await convertImageToBase64(file);
      setAvatar(base64);
    } catch (err) {
      alert('Failed to process image. Please try another file.');
    }
  };

  const handleCustomColorChange = (hex: string) => {
    setColorInput(hex);
    if (isValidHex(hex)) {
      const normalized = normalizeHex(hex);
      setColor(normalized);
      setIsCustomColor(true);
    }
  };

  const handleRandomizeColor = () => {
    const randomHex = getRandomHexColor();
    setColor(randomHex);
    setColorInput(randomHex);
    setIsCustomColor(true);
  };

  const handleResetToInherited = () => {
    const inherited = computeInherited(parentIds);
    setColor(inherited.color);
    setColorInput(inherited.color);
    setIsCustomColor(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() && !lastName.trim()) {
      alert('Please provide at least a first or last name.');
      return;
    }

    const saved: FamilyMember = {
      id: initialMember?.id || `member-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      firstName: firstName.trim() || 'Unnamed',
      lastName: lastName.trim(),
      maidenName: maidenName.trim() || undefined,
      nickname: nickname.trim() || undefined,
      gender,
      birthDate: birthDate || undefined,
      deathDate: !isLiving ? (deathDate || undefined) : undefined,
      isLiving,
      avatar,
      color: isValidHex(color) ? normalizeHex(color) : DEFAULT_MEMBER_COLOR,
      isCustomColor,
      parentIds,
      spouseIds,
      adoptionStatus,
      notes: notes.trim() || undefined,
    };

    onSave(saved);
    onClose();
  };

  const agePreview = calculateAge();
  const inheritedInfo = computeInherited(parentIds);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="relative bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          className="h-1.5 w-full transition-colors"
          style={{ backgroundColor: color }}
        />
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <User size={18} className="text-indigo-400" />
              {initialMember ? 'Edit Family Member' : 'Add New Family Member'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure personal details, vital dates, lineage color, and photo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          {/* Avatar and Basic Info */}
          <div className="flex items-center gap-5">
            {/* Avatar Picker */}
            <div className="relative group">
              <div 
                className="w-20 h-20 rounded-full overflow-hidden border-2 flex items-center justify-center bg-slate-800 shadow-md cursor-pointer relative"
                style={{ borderColor: color }}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={26} className="text-slate-400" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-medium text-center p-1">
                  Upload Photo
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(undefined)}
                  className="mt-1 text-[11px] text-red-400 hover:text-red-300 block mx-auto text-center"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Names - Single column list */}
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="e.g. Eleanor"
                  className="w-full px-2.5 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="e.g. Vance"
                  className="w-full px-2.5 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                  Maiden / Birth Name
                </label>
                <input
                  type="text"
                  value={maidenName}
                  onChange={e => setMaidenName(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-2.5 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">
                  Gender / Role
                </label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                  className="w-full px-2.5 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Non-Binary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vital Dates - Single column list */}
          <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar size={13} className="text-indigo-400" /> Vital Dates & Status
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isLiving}
                  onChange={e => setIsLiving(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-800"
                />
                <span className="text-[11px]">Currently Living</span>
              </label>
            </div>

            <div className="space-y-2 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">
                  Date of Birth (DOB)
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">
                  Date of Death (DOD) {!isLiving && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="date"
                  disabled={isLiving}
                  value={deathDate}
                  onChange={e => setDeathDate(e.target.value)}
                  className={`w-full px-2.5 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 ${
                    isLiving ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>

            {agePreview && (
              <div className="text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-900/50 px-2.5 py-1 rounded-md flex items-center justify-between">
                <span>Calculated Age:</span>
                <span className="font-semibold">{agePreview}</span>
              </div>
            )}
          </div>

          {/* Lineage Color Engine */}
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Palette size={14} className="text-indigo-400" /> Lineage Color & Genetic Blending
              </span>
              {parentIds.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  {inheritedInfo.isInherited ? 'Genetic blend active' : 'Default inheritance'}
                </span>
              )}
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 items-center">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setColorInput(c);
                    setIsCustomColor(true);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-white shadow-md' : 'border-slate-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>

            {/* Controls: Custom Hex, Random, Reset */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 flex items-center bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1">
                <div 
                  className="w-4 h-4 rounded-full mr-2 border border-slate-600 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <input
                  type="text"
                  value={colorInput}
                  onChange={e => handleCustomColorChange(e.target.value)}
                  placeholder="#4B5563"
                  className="bg-transparent text-xs font-mono text-slate-200 w-full focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleRandomizeColor}
                title="Randomize Color"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-200 flex items-center gap-1 transition-colors"
              >
                <Shuffle size={12} /> Random
              </button>

              {parentIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetToInherited}
                  title="Reset to genetically blended parent color"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={12} /> Inherit
                </button>
              )}
            </div>

            {/* Biological / Adopted Status */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
              <span className="text-slate-400">Lineage Connection:</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="adoptionStatus"
                    value="biological"
                    checked={adoptionStatus === 'biological'}
                    onChange={() => setAdoptionStatus('biological')}
                    className="text-indigo-600"
                  />
                  <span>Biological (Solid line)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="adoptionStatus"
                    value="adopted"
                    checked={adoptionStatus === 'adopted'}
                    onChange={() => setAdoptionStatus('adopted')}
                    className="text-indigo-600"
                  />
                  <span>Adopted (Dashed line)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Notes / Biography */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-slate-400" /> Biography & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Life events, career, hobbies, notable achievements..."
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg shadow-md transition-colors flex items-center gap-1.5"
            >
              <Check size={14} />
              {initialMember ? 'Save Changes' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

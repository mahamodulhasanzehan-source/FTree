import React, { useState, useMemo } from 'react';
import { 
  GitFork, 
  Trash2, 
  Plus, 
  Search, 
  X, 
  Tag, 
  ArrowUp, 
  ArrowRight, 
  ArrowDown, 
  Heart, 
  Users 
} from 'lucide-react';
import { 
  FamilyMember, 
  RelationshipTypeDefinition, 
  RelationshipBehavior, 
  MemberRelationship 
} from '../../types';
import { 
  wouldCreateCycle, 
  getEffectiveParentIds, 
  getEffectiveSpouseIds 
} from '../../utils/treeLayout';
import { syncSpouseChildrenOnSpouseAdded } from '../../utils/relationshipConnector';
import { NewRelationshipTypeModal } from './NewRelationshipTypeModal';

const DEFAULT_RELATIONSHIP_TYPES: RelationshipTypeDefinition[] = [
  { id: 'parent', label: 'Parent', behavior: 'parent' },
  { id: 'spouse', label: 'Spouse / Partner', behavior: 'spouse' },
  { id: 'child', label: 'Child', behavior: 'child' },
  { id: 'friend', label: 'Friend', behavior: 'spouse' },
  { id: 'pet', label: 'Pet', behavior: 'child' },
];

interface RelationshipsSectionProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  relationshipTypes?: RelationshipTypeDefinition[];
  onAddRelationshipType?: (newType: RelationshipTypeDefinition) => void;
  onUpdateAllMembers: (members: FamilyMember[]) => void;
  onError: (msg: string | null) => void;
}

export const RelationshipsSection: React.FC<RelationshipsSectionProps> = ({
  member,
  allMembers,
  relationshipTypes = [],
  onAddRelationshipType,
  onUpdateAllMembers,
  onError,
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<string>('parent');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewTypeModalOpen, setIsNewTypeModalOpen] = useState(false);

  // Combine default and custom relationship types
  const allTypes = useMemo(() => {
    const combined = [...DEFAULT_RELATIONSHIP_TYPES];
    for (const custom of relationshipTypes) {
      if (!combined.some(t => t.id === custom.id)) {
        combined.push(custom);
      }
    }
    return combined;
  }, [relationshipTypes]);

  const activeType = allTypes.find(t => t.id === selectedTypeId) || allTypes[0];

  // List of candidate members to link
  const candidates = useMemo(() => {
    return allMembers.filter(m => {
      if (m.id === member.id) return false;

      // Filter based on search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
        if (!fullName.includes(query) && !m.nickname?.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [allMembers, member.id, searchQuery]);

  const selectedTargetMember = allMembers.find(m => m.id === selectedTargetId);

  // Handle relationship dropdown change
  const handleTypeSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsNewTypeModalOpen(true);
    } else {
      setSelectedTypeId(val);
    }
  };

  // Add relationship action
  const handleAddRelationship = () => {
    if (!selectedTargetId) {
      onError('Please select a person to link.');
      return;
    }
    onError(null);

    const typeDef = activeType;
    const targetMember = allMembers.find(m => m.id === selectedTargetId);
    if (!targetMember) return;

    // Check for cycles if behavior is parent or child
    if (typeDef.behavior === 'parent') {
      if (wouldCreateCycle(allMembers, member.id, targetMember.id)) {
        onError('Cannot link parent: this creates a circular lineage loop.');
        return;
      }
    } else if (typeDef.behavior === 'child') {
      if (wouldCreateCycle(allMembers, targetMember.id, member.id)) {
        onError('Cannot link child: this creates a circular lineage loop.');
        return;
      }
    }

    const updated = allMembers.map(m => {
      if (m.id === member.id) {
        const existingRels = m.relationships || [];
        const newRel: MemberRelationship = {
          id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          targetId: targetMember.id,
          typeId: typeDef.id,
          customLabel: typeDef.label,
          behavior: typeDef.behavior,
        };

        const updatedParentIds = typeDef.behavior === 'parent' && !m.parentIds.includes(targetMember.id)
          ? [...m.parentIds, targetMember.id]
          : m.parentIds;

        const updatedSpouseIds = typeDef.behavior === 'spouse' && !m.spouseIds.includes(targetMember.id)
          ? [...m.spouseIds, targetMember.id]
          : m.spouseIds;

        return {
          ...m,
          parentIds: updatedParentIds,
          spouseIds: updatedSpouseIds,
          relationships: [...existingRels, newRel],
        };
      }

      // Bidirectional sync for spouse or child behavior
      if (m.id === targetMember.id) {
        if (typeDef.behavior === 'spouse') {
          const sIds = m.spouseIds || [];
          return {
            ...m,
            spouseIds: sIds.includes(member.id) ? sIds : [...sIds, member.id],
          };
        }
        if (typeDef.behavior === 'child') {
          const pIds = m.parentIds || [];
          return {
            ...m,
            parentIds: pIds.includes(member.id) ? pIds : [...pIds, member.id],
          };
        }
      }

      return m;
    });

    const finalMembers = typeDef.behavior === 'spouse'
      ? syncSpouseChildrenOnSpouseAdded(updated, member.id, targetMember.id)
      : updated;

    onUpdateAllMembers(finalMembers);
    setSelectedTargetId('');
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // Break a relationship link
  const handleBreakRelationship = (targetId: string, relType: RelationshipBehavior) => {
    const updated = allMembers.map(m => {
      if (m.id === member.id) {
        return {
          ...m,
          parentIds: relType === 'parent' ? (m.parentIds || []).filter(id => id !== targetId) : m.parentIds,
          spouseIds: relType === 'spouse' ? (m.spouseIds || []).filter(id => id !== targetId) : m.spouseIds,
          relationships: (m.relationships || []).filter(r => !(r.targetId === targetId && r.behavior === relType)),
        };
      }
      if (m.id === targetId) {
        return {
          ...m,
          parentIds: relType === 'child' ? (m.parentIds || []).filter(id => id !== member.id) : m.parentIds,
          spouseIds: relType === 'spouse' ? (m.spouseIds || []).filter(id => id !== member.id) : m.spouseIds,
          relationships: (m.relationships || []).filter(r => !(r.targetId === member.id)),
        };
      }
      return m;
    });

    onUpdateAllMembers(updated);
  };

  // Build aggregated list of all currently linked relationships for this member
  const currentRelationships = useMemo(() => {
    const list: Array<{
      target: FamilyMember;
      label: string;
      behavior: RelationshipBehavior;
    }> = [];

    const recorded = new Set<string>();

    // 1. Explicit Custom Relationships
    if (member.relationships) {
      for (const r of member.relationships) {
        const target = allMembers.find(m => m.id === r.targetId);
        if (target) {
          const typeDef = allTypes.find(t => t.id === r.typeId);
          list.push({
            target,
            label: r.customLabel || typeDef?.label || 'Relation',
            behavior: r.behavior,
          });
          recorded.add(`${r.targetId}::${r.behavior}`);
        }
      }
    }

    // 2. Direct Parents
    for (const pId of member.parentIds || []) {
      if (!recorded.has(`${pId}::parent`)) {
        const target = allMembers.find(m => m.id === pId);
        if (target) {
          list.push({ target, label: 'Parent', behavior: 'parent' });
          recorded.add(`${pId}::parent`);
        }
      }
    }

    // 3. Direct Spouses
    for (const sId of member.spouseIds || []) {
      if (!recorded.has(`${sId}::spouse`)) {
        const target = allMembers.find(m => m.id === sId);
        if (target) {
          list.push({ target, label: 'Spouse', behavior: 'spouse' });
          recorded.add(`${sId}::spouse`);
        }
      }
    }

    // 4. Direct Children
    for (const child of allMembers) {
      if (child.parentIds && child.parentIds.includes(member.id)) {
        if (!recorded.has(`${child.id}::child`)) {
          list.push({ target: child, label: 'Child', behavior: 'child' });
          recorded.add(`${child.id}::child`);
        }
      }
    }

    return list;
  }, [member, allMembers, allTypes]);

  return (
    <section className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 space-y-3">
      {/* Section Title */}
      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
        <GitFork size={13} className="text-indigo-400 rotate-180" /> Relationships Module
      </span>

      {/* Unified Add Relationship Form */}
      <div className="space-y-2 p-2 bg-slate-950/80 border border-slate-800 rounded-lg">
        {/* Step 1: Select Relation Type */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            1. Select Relationship Type
          </label>
          <select
            value={selectedTypeId}
            onChange={handleTypeSelectChange}
            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700/80 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <optgroup label="Standard Relationships">
              <option value="parent">Parent (Above)</option>
              <option value="spouse">Spouse / Partner (Beside)</option>
              <option value="child">Child (Below)</option>
            </optgroup>

            <optgroup label="Custom Relationships">
              {allTypes
                .filter(t => t.id !== 'parent' && t.id !== 'spouse' && t.id !== 'child')
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.behavior})
                  </option>
                ))}
            </optgroup>

            <option value="__ADD_NEW__" className="text-indigo-400 font-bold">
              + Add New Relationship Type...
            </option>
          </select>
        </div>

        {/* Step 2: Search and Select Person */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            2. Search & Select Person
          </label>
          
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder={selectedTargetMember ? `${selectedTargetMember.firstName} ${selectedTargetMember.lastName}` : 'Search name or click to pick...'}
              className="w-full pl-7 pr-7 py-1.5 bg-slate-900 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
            {(searchQuery || selectedTargetId) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTargetId('');
                }}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-44 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-30 py-1 divide-y divide-slate-800/60">
              {candidates.length === 0 ? (
                <div className="p-2 text-center text-[11px] text-slate-500">
                  No matching members found
                </div>
              ) : (
                candidates.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedTargetId(c.id);
                      setSearchQuery(`${c.firstName} ${c.lastName}`);
                      setIsSearchOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between hover:bg-indigo-600 hover:text-white transition-colors ${
                      selectedTargetId === c.id ? 'bg-indigo-950/60 text-indigo-300 font-bold' : 'text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="truncate">{c.firstName} {c.lastName}</span>
                    </div>
                    {c.birthDate && (
                      <span className="text-[10px] text-slate-400 opacity-70">
                        {new Date(c.birthDate).getFullYear() || ''}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Step 3: Link Button */}
        <button
          type="button"
          onClick={handleAddRelationship}
          disabled={!selectedTargetId}
          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-sm mt-1"
        >
          <Plus size={13} /> Link as {activeType.label}
        </button>
      </div>

      {/* Current Relationships List */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Current Links ({currentRelationships.length})
        </label>

        {currentRelationships.length === 0 ? (
          <div className="p-2 text-center text-[11px] text-slate-500 italic bg-slate-950/40 rounded-md border border-slate-800/60">
            No relationships linked yet
          </div>
        ) : (
          <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
            {currentRelationships.map(({ target, label, behavior }) => (
              <div
                key={`${target.id}-${behavior}`}
                className="flex items-center justify-between p-1.5 rounded-md bg-slate-950 border border-slate-800/80 text-xs text-slate-200"
              >
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: target.color }}
                  />
                  <div className="truncate">
                    <span className="text-[11px] font-bold text-slate-100">{target.firstName} {target.lastName}</span>
                    <span className="ml-1 text-[10px] text-indigo-400 font-medium">({label})</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBreakRelationship(target.id, behavior)}
                  className="p-1 px-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded text-[10px] flex items-center gap-1 flex-shrink-0 transition-colors"
                  title="Remove relationship"
                >
                  <Trash2 size={10} /> Break
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Relationship Type Modal */}
      <NewRelationshipTypeModal
        isOpen={isNewTypeModalOpen}
        onClose={() => setIsNewTypeModalOpen(false)}
        onAddType={(newType) => {
          onAddRelationshipType?.(newType);
          setSelectedTypeId(newType.id);
        }}
      />
    </section>
  );
};

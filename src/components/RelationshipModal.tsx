import React, { useState } from 'react';
import { 
  X, 
  GitFork, 
  Heart, 
  Users, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  Check 
} from 'lucide-react';
import { FamilyMember } from '../types';
import { wouldCreateCycle } from '../utils/treeLayout';
import { syncSpouseChildrenOnSpouseAdded } from '../utils/relationshipConnector';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMember: FamilyMember;
  allMembers: FamilyMember[];
  onUpdateMember: (updatedMember: FamilyMember) => void;
  onUpdateTreeMembers: (members: FamilyMember[]) => void;
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  targetMember,
  allMembers,
  onUpdateTreeMembers,
}) => {
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedSpouseId, setSelectedSpouseId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentParents = (targetMember.parentIds || [])
    .map(id => allMembers.find(m => m.id === id))
    .filter((m): m is FamilyMember => m !== undefined);

  const currentSpouses = (targetMember.spouseIds || [])
    .map(id => allMembers.find(m => m.id === id))
    .filter((m): m is FamilyMember => m !== undefined);

  // Find children: any member whose parentIds includes targetMember.id
  const currentChildren = allMembers.filter(
    m => m.parentIds && m.parentIds.includes(targetMember.id)
  );

  // Candidate parents: not self, not existing parent, not already a descendant (no cycle)
  const candidateParents = allMembers.filter(m => {
    if (m.id === targetMember.id) return false;
    if (targetMember.parentIds?.includes(m.id)) return false;
    if (wouldCreateCycle(allMembers, targetMember.id, m.id)) return false;
    return true;
  });

  // Candidate spouses: not self, not existing spouse
  const candidateSpouses = allMembers.filter(m => {
    if (m.id === targetMember.id) return false;
    if (targetMember.spouseIds?.includes(m.id)) return false;
    return true;
  });

  // Candidate children: not self, not already child, would not create cycle
  const candidateChildren = allMembers.filter(m => {
    if (m.id === targetMember.id) return false;
    if (m.parentIds?.includes(targetMember.id)) return false;
    if (wouldCreateCycle(allMembers, m.id, targetMember.id)) return false;
    return true;
  });

  // Add Parent
  const handleAddParent = () => {
    if (!selectedParentId) return;
    setErrorMessage(null);

    if (wouldCreateCycle(allMembers, targetMember.id, selectedParentId)) {
      setErrorMessage('Cannot add this parent: it would cause a circular ancestry cycle.');
      return;
    }

    const updated = allMembers.map(m => {
      if (m.id === targetMember.id) {
        return {
          ...m,
          parentIds: [...(m.parentIds || []), selectedParentId],
        };
      }
      return m;
    });

    onUpdateTreeMembers(updated);
    setSelectedParentId('');
  };

  // Remove Parent
  const handleRemoveParent = (parentIdToRemove: string) => {
    const updated = allMembers.map(m => {
      if (m.id === targetMember.id) {
        return {
          ...m,
          parentIds: (m.parentIds || []).filter(id => id !== parentIdToRemove),
        };
      }
      return m;
    });
    onUpdateTreeMembers(updated);
  };

  // Add Spouse (bidirectional)
  const handleAddSpouse = () => {
    if (!selectedSpouseId) return;
    setErrorMessage(null);

    const updated = allMembers.map(m => {
      if (m.id === targetMember.id) {
        const existing = m.spouseIds || [];
        return {
          ...m,
          spouseIds: existing.includes(selectedSpouseId) ? existing : [...existing, selectedSpouseId],
        };
      }
      if (m.id === selectedSpouseId) {
        const existing = m.spouseIds || [];
        return {
          ...m,
          spouseIds: existing.includes(targetMember.id) ? existing : [...existing, targetMember.id],
        };
      }
      return m;
    });

    const fullySynced = syncSpouseChildrenOnSpouseAdded(updated, targetMember.id, selectedSpouseId);
    onUpdateTreeMembers(fullySynced);
    setSelectedSpouseId('');
  };

  // Remove Spouse (bidirectional)
  const handleRemoveSpouse = (spouseIdToRemove: string) => {
    const updated = allMembers.map(m => {
      if (m.id === targetMember.id) {
        return {
          ...m,
          spouseIds: (m.parentIds || []).filter(id => id !== spouseIdToRemove),
        };
      }
      if (m.id === spouseIdToRemove) {
        return {
          ...m,
          spouseIds: (m.parentIds || []).filter(id => id !== targetMember.id),
        };
      }
      return m;
    });
    onUpdateTreeMembers(updated);
  };

  // Add Child
  const handleAddChild = () => {
    if (!selectedChildId) return;
    setErrorMessage(null);

    if (wouldCreateCycle(allMembers, selectedChildId, targetMember.id)) {
      setErrorMessage('Cannot add this child: it would create a circular loop.');
      return;
    }

    const updated = allMembers.map(m => {
      if (m.id === selectedChildId) {
        const existingParents = m.parentIds || [];
        return {
          ...m,
          parentIds: existingParents.includes(targetMember.id) ? existingParents : [...existingParents, targetMember.id],
        };
      }
      return m;
    });

    onUpdateTreeMembers(updated);
    setSelectedChildId('');
  };

  // Remove Child
  const handleRemoveChild = (childIdToRemove: string) => {
    const updated = allMembers.map(m => {
      if (m.id === childIdToRemove) {
        return {
          ...m,
          parentIds: (m.parentIds || []).filter(id => id !== targetMember.id),
        };
      }
      return m;
    });
    onUpdateTreeMembers(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Users size={18} className="text-indigo-400" />
              Manage Relationships
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Connecting for <strong className="text-slate-200">{targetMember.firstName} {targetMember.lastName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parents Section */}
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <GitFork size={13} className="text-indigo-400 rotate-180" /> Parents
            </h3>

            {currentParents.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {currentParents.map(p => (
                  <div 
                    key={p.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span>{p.firstName} {p.lastName}</span>
                    <button
                      onClick={() => handleRemoveParent(p.id)}
                      className="text-slate-400 hover:text-red-400 p-0.5 ml-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No parents assigned (Root node).</p>
            )}

            {currentParents.length < 2 && candidateParents.length > 0 && (
              <div className="flex gap-2 pt-1">
                <select
                  value={selectedParentId}
                  onChange={e => setSelectedParentId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">Select parent to link...</option>
                  {candidateParents.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddParent}
                  disabled={!selectedParentId}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs text-white rounded-lg flex items-center gap-1"
                >
                  <Plus size={13} /> Link
                </button>
              </div>
            )}
          </div>

          {/* Spouses Section */}
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Heart size={13} className="text-pink-400" /> Spouse / Partner
            </h3>

            {currentSpouses.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {currentSpouses.map(s => (
                  <div 
                    key={s.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span>{s.firstName} {s.lastName}</span>
                    <button
                      onClick={() => handleRemoveSpouse(s.id)}
                      className="text-slate-400 hover:text-red-400 p-0.5 ml-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No partners assigned.</p>
            )}

            {candidateSpouses.length > 0 && (
              <div className="flex gap-2 pt-1">
                <select
                  value={selectedSpouseId}
                  onChange={e => setSelectedSpouseId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">Select spouse to link...</option>
                  {candidateSpouses.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSpouse}
                  disabled={!selectedSpouseId}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-xs text-white rounded-lg flex items-center gap-1"
                >
                  <Plus size={13} /> Link
                </button>
              </div>
            )}
          </div>

          {/* Children Section */}
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Users size={13} className="text-emerald-400" /> Children
            </h3>

            {currentChildren.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {currentChildren.map(c => (
                  <div 
                    key={c.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span>{c.firstName} {c.lastName}</span>
                    <button
                      onClick={() => handleRemoveChild(c.id)}
                      className="text-slate-400 hover:text-red-400 p-0.5 ml-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No children recorded.</p>
            )}

            {candidateChildren.length > 0 && (
              <div className="flex gap-2 pt-1">
                <select
                  value={selectedChildId}
                  onChange={e => setSelectedChildId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">Select child to link...</option>
                  {candidateChildren.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddChild}
                  disabled={!selectedChildId}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs text-white rounded-lg flex items-center gap-1"
                >
                  <Plus size={13} /> Link
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition-colors flex items-center gap-1"
          >
            <Check size={14} /> Done
          </button>
        </div>
      </div>
    </div>
  );
};

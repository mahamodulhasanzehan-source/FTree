import React, { useState } from 'react';
import { X, Plus, ArrowUp, ArrowRight, ArrowDown, Tag } from 'lucide-react';
import { RelationshipBehavior, RelationshipTypeDefinition } from '../../types';

interface NewRelationshipTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddType: (newType: RelationshipTypeDefinition) => void;
}

export const NewRelationshipTypeModal: React.FC<NewRelationshipTypeModalProps> = ({
  isOpen,
  onClose,
  onAddType,
}) => {
  const [label, setLabel] = useState('');
  const [behavior, setBehavior] = useState<RelationshipBehavior>('child');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) return;

    const id = `custom-${cleanLabel.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`;
    onAddType({
      id,
      label: cleanLabel,
      behavior,
      isCustom: true,
    });

    setLabel('');
    setBehavior('child');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-100">Add New Relationship Type</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Relationship Name / Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Friend, Pet, Mentor, Sibling..."
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-2">
              Behavior & Tree Placement
            </label>
            <div className="space-y-2">
              {/* Parent Behavior */}
              <button
                type="button"
                onClick={() => setBehavior('parent')}
                className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  behavior === 'parent'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="p-1.5 rounded-md bg-indigo-600/20 text-indigo-400 flex-shrink-0 mt-0.5">
                  <ArrowUp size={14} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 text-xs">Behaves Like Parent</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Appears above them, connecting from the top tier.
                  </div>
                </div>
              </button>

              {/* Spouse Behavior */}
              <button
                type="button"
                onClick={() => setBehavior('spouse')}
                className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  behavior === 'spouse'
                    ? 'border-pink-500 bg-pink-950/40 text-pink-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="p-1.5 rounded-md bg-pink-600/20 text-pink-400 flex-shrink-0 mt-0.5">
                  <ArrowRight size={14} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 text-xs">Behaves Like Spouse / Partner</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Appears beside them on the same tier, connecting from the side.
                  </div>
                </div>
              </button>

              {/* Child Behavior */}
              <button
                type="button"
                onClick={() => setBehavior('child')}
                className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  behavior === 'child'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="p-1.5 rounded-md bg-emerald-600/20 text-emerald-400 flex-shrink-0 mt-0.5">
                  <ArrowDown size={14} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 text-xs">Behaves Like Child</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Appears below them, connecting from below into a branch.
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!label.trim()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-md text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus size={13} /> Create Relationship Type
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

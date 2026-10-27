import React, { useState, useMemo } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  ArrowDownUp, 
  Spline, 
  Calendar, 
  Tag, 
  Check,
  Layers,
  AlignVerticalSpaceAround,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { TreeSettings, FamilyMember } from '../types';
import { calculateMemberGenerations } from '../utils/treeLayout';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TreeSettings;
  members?: FamilyMember[];
  onUpdateSettings: (newSettings: TreeSettings) => void;
  onAutoAlignGenerations?: (targetGen: number | 'all', gapUnits: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  members = [],
  onUpdateSettings,
  onAutoAlignGenerations,
}) => {
  const [selectedGen, setSelectedGen] = useState<string>('all');
  const [alignToast, setAlignToast] = useState<string | null>(null);

  const gapUnits = settings.generationGapUnits ?? 1;
  const lineThickness = settings.lineThickness ?? 5.5;

  const availableGenerations = useMemo(() => {
    if (!members.length) return [1];
    const gens = calculateMemberGenerations(members);
    const unique = Array.from(new Set(gens.values())).sort((a, b) => a - b);
    return unique.length > 0 ? unique : [1];
  }, [members]);

  if (!isOpen) return null;

  const handleApplyAlignment = () => {
    const target = selectedGen === 'all' ? 'all' : parseInt(selectedGen, 10);
    onAutoAlignGenerations?.(target, gapUnits);
    setAlignToast(
      selectedGen === 'all'
        ? `Aligned all ${availableGenerations.length} generations!`
        : `Aligned Generation ${selectedGen} cards!`
    );
    setTimeout(() => setAlignToast(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100">Tree Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* 1. Tree Name */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-indigo-400" /> Tree Name
            </label>
            <input
              type="text"
              value={settings.treeName}
              onChange={e => onUpdateSettings({ ...settings, treeName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 2. Relationship Line Thickness */}
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders size={14} className="text-indigo-400" /> Line Thickness
              </span>
              <div className="flex items-center gap-2">
                {lineThickness !== 5.5 && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, lineThickness: 5.5 })}
                    title="Reset to default (5.5 px)"
                    className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                )}
                <span className="font-mono text-indigo-300 text-xs px-2 py-0.5 bg-indigo-950/70 border border-indigo-800/60 rounded">
                  {lineThickness.toFixed(1)} px
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="28"
                step="0.5"
                value={lineThickness}
                onChange={e => onUpdateSettings({ ...settings, lineThickness: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              
              {/* Live Stroke Preview Line */}
              <div className="h-7 w-full bg-slate-950/80 rounded-md border border-slate-800/80 flex items-center justify-center px-4">
                <div 
                  className="w-full rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                  style={{ height: Math.min(20, lineThickness) }}
                />
              </div>
            </div>
          </div>

          {/* 3. Generations: Gap & Auto-Align */}
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-400" /> Auto Align Generations
              </span>
              <span className="font-mono text-indigo-300 text-xs px-2 py-0.5 bg-indigo-950/70 border border-indigo-800/60 rounded">
                {gapUnits} {gapUnits === 1 ? 'unit' : 'units'}
              </span>
            </div>

            {/* Gap Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Vertical Gap:</span>
                <span className="text-slate-300 font-mono">1 – 100 units</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={gapUnits}
                onChange={e => onUpdateSettings({ ...settings, generationGapUnits: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Auto Align Y-Level Controls */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={selectedGen}
                  onChange={e => setSelectedGen(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Generations (1 – {availableGenerations[availableGenerations.length - 1] || 1})</option>
                  {availableGenerations.map(g => (
                    <option key={g} value={String(g)}>
                      Generation {g} Only
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleApplyAlignment}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <AlignVerticalSpaceAround size={13} /> Align Y-Level
                </button>
              </div>

              {alignToast && (
                <p className="text-[11px] text-emerald-400 font-medium">
                  ✓ {alignToast}
                </p>
              )}
            </div>
          </div>

          {/* 4. Layout Flow & Connector Style */}
          <div className="grid grid-cols-2 gap-3">
            {/* Orientation Mode */}
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ArrowDownUp size={13} className="text-indigo-400" /> Direction
              </span>
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, orientation: 'top-to-bottom' })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-center transition-all ${
                    settings.orientation === 'top-to-bottom'
                      ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200'
                      : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Top-Down
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, orientation: 'bottom-to-up' })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-center transition-all ${
                    settings.orientation === 'bottom-to-up'
                      ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200'
                      : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bottom-Up
                </button>
              </div>
            </div>

            {/* Connector Line Style */}
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Spline size={13} className="text-indigo-400" /> Connector
              </span>
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, connectorStyle: 'curved' })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-center transition-all ${
                    settings.connectorStyle === 'curved'
                      ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200'
                      : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Curved
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, connectorStyle: 'orthogonal' })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium text-center transition-all ${
                    settings.connectorStyle === 'orthogonal'
                      ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200'
                      : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Elbows
                </button>
              </div>
            </div>
          </div>

          {/* 5. Card Display Badges */}
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-2">
              <Calendar size={13} className="text-indigo-400" /> Card Display Details
            </span>
            <div className="flex items-center gap-5 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showAges}
                  onChange={e => onUpdateSettings({ ...settings, showAges: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 bg-slate-800 accent-indigo-500"
                />
                <span>Show Ages</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showDates}
                  onChange={e => onUpdateSettings({ ...settings, showDates: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 bg-slate-800 accent-indigo-500"
                />
                <span>Show Birth & Death Dates</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Check size={14} /> Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import { UserPlus, Sparkles, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  onAddNewMember: () => void;
  onCenterView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetLayout?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  onAddNewMember,
  onCenterView,
  onZoomIn,
  onZoomOut,
  onResetLayout,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleOutside);
      window.addEventListener('scroll', onClose);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', onClose);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{
        top: Math.min(y, window.innerHeight - 240),
        left: Math.min(x, window.innerWidth - 220),
      }}
      className="fixed z-50 w-52 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onAddNewMember();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-indigo-600 hover:text-white flex items-center gap-2.5 transition-colors font-medium text-slate-100"
      >
        <UserPlus size={15} className="text-emerald-400" />
        <span>Add New Member Here</span>
      </button>

      <div className="my-1 border-t border-slate-800" />

      <button
        onClick={() => {
          onCenterView();
          onClose();
        }}
        className="w-full px-3.5 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-slate-300"
      >
        <Maximize2 size={14} className="text-slate-400" />
        <span>Center / Reset View</span>
      </button>

      {onResetLayout && (
        <button
          onClick={() => {
            onResetLayout();
            onClose();
          }}
          className="w-full px-3.5 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-slate-300"
        >
          <Sparkles size={14} className="text-amber-400" />
          <span>Auto-Align All Cards</span>
        </button>
      )}

      <button
        onClick={() => {
          onZoomIn();
          onClose();
        }}
        className="w-full px-3.5 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-slate-300"
      >
        <ZoomIn size={14} className="text-slate-400" />
        <span>Zoom In</span>
      </button>

      <button
        onClick={() => {
          onZoomOut();
          onClose();
        }}
        className="w-full px-3.5 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-slate-300"
      >
        <ZoomOut size={14} className="text-slate-400" />
        <span>Zoom Out</span>
      </button>
    </div>
  );
};

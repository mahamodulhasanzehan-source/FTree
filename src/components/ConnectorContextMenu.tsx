import React, { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { Connector } from '../types';

interface ConnectorContextMenuProps {
  x: number;
  y: number;
  connector: Connector | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteConnector: (connector: Connector) => void;
}

export const ConnectorContextMenu: React.FC<ConnectorContextMenuProps> = ({
  x,
  y,
  connector,
  isOpen,
  onClose,
  onDeleteConnector,
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

  if (!isOpen || !connector) return null;

  return (
    <div
      ref={menuRef}
      style={{
        top: Math.min(y, window.innerHeight - 100),
        left: Math.min(x, window.innerWidth - 200),
      }}
      className="fixed z-50 w-48 bg-slate-900/98 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={e => e.stopPropagation()}
    >
      <div className="py-1">
        <button
          onClick={() => {
            onDeleteConnector(connector);
            onClose();
          }}
          className="w-full px-3.5 py-2 text-left hover:bg-red-950/60 hover:text-red-300 flex items-center gap-2.5 transition-colors text-red-400 font-medium"
        >
          <Trash2 size={14} />
          <span>Delete Relationship</span>
        </button>
      </div>
    </div>
  );
};

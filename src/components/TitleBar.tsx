import React, { useState, useRef, useEffect } from 'react';
import { 
  GitFork, 
  Minus, 
  Square, 
  X, 
  FilePlus, 
  FolderOpen, 
  Save, 
  Image as ImageIcon, 
  Settings as SettingsIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  ChevronDown,
  UserPlus
} from 'lucide-react';
import { TreeData } from '../types';

interface TitleBarProps {
  treeData: TreeData;
  onNewTree: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onExportPng: () => void;
  onExportHighResImage: () => void;
  onOpenSettings: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onLoadSample: () => void;
  onAddNewMember: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  treeData,
  onNewTree,
  onOpenFile,
  onSaveFile,
  onExportPng,
  onExportHighResImage,
  onOpenSettings,
  onZoomIn,
  onZoomOut,
  onResetView,
  onLoadSample,
  onAddNewMember,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMinimize = () => {
    if ((window as any).electronAPI?.minimize) {
      (window as any).electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if ((window as any).electronAPI?.maximize) {
      (window as any).electronAPI.maximize();
      setIsMaximized(!isMaximized);
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsMaximized(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsMaximized(false);
      }
    }
  };

  const handleClose = () => {
    if ((window as any).electronAPI?.close) {
      (window as any).electronAPI.close();
    } else {
      window.close();
    }
  };

  const toggleMenu = (name: string) => {
    setActiveMenu(activeMenu === name ? null : name);
  };

  return (
    <header className="h-11 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between select-none app-drag-region z-50 text-slate-200 shadow-md">
      {/* Left: App Identity & Menus */}
      <div className="flex items-center space-x-1 pl-3 app-no-drag" ref={menuRef}>
        <div className="flex items-center space-x-2 mr-3 pr-3 border-r border-slate-800">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/90 border border-indigo-500/40 flex items-center justify-center text-white shadow-sm">
            <GitFork size={14} className="transform rotate-180 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-100 tracking-tight leading-none">
              Family Tree
            </span>
          </div>
        </div>

        {/* File Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('file')}
            className={`px-2.5 py-1 text-xs rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1 ${
              activeMenu === 'file' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300'
            }`}
          >
            <span>File</span>
            <ChevronDown size={11} className="opacity-60" />
          </button>
          {activeMenu === 'file' && (
            <div className="absolute left-0 top-full mt-1.5 w-52 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in duration-100">
              <button
                onClick={() => { onNewTree(); setActiveMenu(null); }}
                className="w-full px-3.5 py-1.5 text-xs text-left text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2"><FilePlus size={14} /> New Tree</span>
                <span className="text-[10px] text-slate-400">Ctrl+N</span>
              </button>
              <button
                onClick={() => { onOpenFile(); setActiveMenu(null); }}
                className="w-full px-3.5 py-1.5 text-xs text-left text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2"><FolderOpen size={14} /> Open .ftree</span>
                <span className="text-[10px] text-slate-400">Ctrl+O</span>
              </button>
              <button
                onClick={() => { onSaveFile(); setActiveMenu(null); }}
                className="w-full px-3.5 py-1.5 text-xs text-left text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2"><Save size={14} /> Save As .ftree</span>
                <span className="text-[10px] text-slate-400">Ctrl+S</span>
              </button>
              <div className="my-1.5 border-t border-slate-800" />
               <button
                onClick={() => { onExportHighResImage(); setActiveMenu(null); }}
                className="w-full px-3.5 py-1.5 text-xs text-left text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors group"
                title="Captures the whole tree at scaled high resolution with custom save destination"
              >
                <span className="flex items-center gap-2"><ImageIcon size={14} className="text-indigo-400 group-hover:text-white" /> Export HD Image</span>
                <span className="text-[10px] text-indigo-300 font-mono">Ultra HD</span>
              </button>
              <button
                onClick={() => { onExportPng(); setActiveMenu(null); }}
                className="w-full px-3.5 py-1.5 text-xs text-left text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
              >
                <ImageIcon size={14} /> Quick Viewport PNG
              </button>
              <button
                onClick={() => { onLoadSample(); setActiveMenu(null); }}
                className="w-full px-3.5 py-1.5 text-xs text-left text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
              >
                <Sparkles size={14} className="text-amber-400" /> Load Demo Family
              </button>
            </div>
          )}
        </div>

        {/* View Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('view')}
            className={`px-2.5 py-1 text-xs rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1 ${
              activeMenu === 'view' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300'
            }`}
          >
            <span>View</span>
            <ChevronDown size={11} className="opacity-60" />
          </button>
          {activeMenu === 'view' && (
            <div className="absolute left-0 top-full mt-1.5 w-48 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in duration-100">
              <button
                onClick={() => { onZoomIn(); setActiveMenu(null); }}
                className="w-full px-3.5 py-1.5 text-xs text-left text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2"><ZoomIn size={14} /> Zoom In</span>
                <span className="text-[10px] text-slate-400">+</span>
              </button>
              <button
                onClick={() => { onZoomOut(); setActiveMenu(null); }}
                className="w-full px-3.5 py-1.5 text-xs text-left text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2"><ZoomOut size={14} /> Zoom Out</span>
                <span className="text-[10px] text-slate-400">-</span>
              </button>
              <button
                onClick={() => { onResetView(); setActiveMenu(null); }}
                className="w-full px-3.5 py-1.5 text-xs text-left text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
              >
                <Maximize2 size={14} /> Center / Reset View
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: File Title & Tree Stats Pill */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/60 border border-slate-800 text-xs pointer-events-none">
        <span className="font-semibold text-slate-200 truncate max-w-xs">
          {treeData.treeName || 'Untitled Family Tree'}
        </span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400 font-mono text-[11px]">
          {treeData.members.length} {treeData.members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Right: Settings and Windows 11 Controls */}
      <div className="flex items-center h-full app-no-drag">
        <button
          onClick={onOpenSettings}
          className="h-8 px-2.5 mr-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs transition-colors"
          title="Tree Settings"
        >
          <SettingsIcon size={14} />
          <span className="hidden sm:inline">Settings</span>
        </button>

        {/* Windows 11 Window Action Buttons */}
        <div className="flex items-center h-full border-l border-slate-800">
          <button
            onClick={handleMinimize}
            className="h-full px-3.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full px-3.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
            title="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            onClick={handleClose}
            className="h-full px-4 hover:bg-red-600 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TreeData, FamilyMember, TreeSettings, RelationshipTypeDefinition } from './types';
import { TitleBar } from './components/TitleBar';
import { TreeCanvas } from './components/TreeCanvas';
import { MemberSidebar } from './components/MemberSidebar';
import { SettingsModal } from './components/SettingsModal';
import { 
  getStarterTree, 
  parseFtreeContent, 
  exportToFtreeFile, 
  exportCanvasAsPng, 
  CURRENT_FILE_VERSION 
} from './utils/fileSystem';
import { installHighResTreeImage } from './utils/treeExporter';
import { getRandomHexColor } from './utils/colorEngine';
import { autoAlignGenerations } from './utils/treeLayout';
import { syncSpouseChildrenOnSpouseAdded } from './utils/relationshipConnector';

const STORAGE_KEY = 'family_tree_current_data';

export default function App() {
  const [treeData, setTreeData] = useState<TreeData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return parseFtreeContent(saved);
      }
    } catch {
      console.warn('Failed to load tree from local storage, loading default.');
    }
    return getStarterTree();
  });

  // Selected Member for right-hand editing sidebar
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(() => {
    return treeData.members?.[0]?.id || null;
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Canvas DOM refs for PNG export and viewport controls
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync to local storage for crash protection & session persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(treeData));
    } catch (e) {
      console.warn('Local storage save failed:', e);
    }
  }, [treeData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewTree();
      } else if (e.key === 'Escape') {
        setSelectedMemberId(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea' && selectedMemberId) {
          e.preventDefault();
          handleDeleteMember(selectedMemberId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [treeData, selectedMemberId]);

  // File Handlers
  const handleNewTree = () => {
    setTreeData({
      version: CURRENT_FILE_VERSION,
      treeName: 'New Family Tree',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        orientation: 'top-to-bottom',
        connectorStyle: 'curved',
        showAges: true,
        showDates: true,
        treeName: 'New Family Tree',
      },
      members: [],
    });
    setSelectedMemberId(null);
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const loadedTree = parseFtreeContent(content);
        setTreeData(loadedTree);
        setSelectedMemberId(loadedTree.members?.[0]?.id || null);
      } catch (err: any) {
        alert(err.message || 'Failed to read .ftree file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveFile = () => {
    exportToFtreeFile(treeData);
  };

  const handleExportPng = async () => {
    if (!canvasContentRef.current) return;
    try {
      await exportCanvasAsPng(canvasContentRef.current, `${treeData.treeName || 'FamilyTree'}.png`);
    } catch {
      alert('Failed to export image.');
    }
  };

  const handleInstallHighResImage = async () => {
    if (treeData.members.length === 0) {
      alert('Your family tree is currently empty. Add at least one person first.');
      return;
    }

    try {
      setExportStatus('Analyzing tree bounds and calculating optimal scaling...');
      const result = await installHighResTreeImage(treeData, (msg) => {
        setExportStatus(msg);
      });

      if (result.success) {
        setExportSuccessMessage(`High-resolution image (${result.resolution}) saved!`);
        setTimeout(() => setExportSuccessMessage(null), 4500);
      }
    } catch (err: any) {
      console.error('High-resolution export error:', err);
      alert('Could not export high-resolution image: ' + (err.message || 'Unknown error'));
    } finally {
      setExportStatus(null);
    }
  };

  const handleLoadSample = () => {
    const sample = getStarterTree();
    setTreeData(sample);
    setSelectedMemberId(sample.members[0]?.id || null);
  };

  // Add new member and immediately focus in right sidebar
  const handleAddNewMember = (position?: { x: number; y: number }) => {
    const newId = `member-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    let targetPos = position;
    if (!targetPos) {
      if (treeData.members.length > 0) {
        const lastMember = treeData.members[treeData.members.length - 1];
        const lastX = lastMember.customPosition?.x ?? 0;
        const lastY = lastMember.customPosition?.y ?? 0;
        targetPos = { x: lastX + 240, y: lastY };
      } else {
        targetPos = { x: 200, y: 200 };
      }
    }

    const newMember: FamilyMember = {
      id: newId,
      firstName: '',
      lastName: '',
      gender: 'other',
      isLiving: true,
      color: '#64748B',
      colorMode: 'gender',
      isCustomColor: false,
      parentIds: [],
      spouseIds: [],
      customPosition: targetPos,
    };

    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      members: [...prev.members, newMember],
    }));

    setSelectedMemberId(newId);
  };

  // Update a single member from the sidebar
  const handleUpdateMember = (updatedMember: FamilyMember) => {
    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      members: prev.members.map(m => (m.id === updatedMember.id ? updatedMember : m)),
    }));
  };

  // Update all members (e.g. for multi-person relationship links)
  const handleUpdateAllMembers = (updatedMembers: FamilyMember[]) => {
    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      members: updatedMembers,
    }));
  };

  // Delete member and clean bidirectional references
  const handleDeleteMember = (memberId: string) => {
    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      members: prev.members
        .filter(m => m.id !== memberId)
        .map(m => ({
          ...m,
          parentIds: (m.parentIds || []).filter(id => id !== memberId),
          spouseIds: (m.spouseIds || []).filter(id => id !== memberId),
          relationships: (m.relationships || []).filter(r => r.targetId !== memberId),
        })),
    }));

    if (selectedMemberId === memberId) {
      setSelectedMemberId(null);
    }
  };

  // Right-click quick action: Add Parent to member
  const handleAddParentToMember = (targetMember: FamilyMember) => {
    const newId = `member-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newParent: FamilyMember = {
      id: newId,
      firstName: '',
      lastName: '',
      gender: 'other',
      isLiving: true,
      color: '#64748B',
      colorMode: 'gender',
      isCustomColor: false,
      parentIds: [],
      spouseIds: [],
    };

    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      members: [
        ...prev.members.map(m => m.id === targetMember.id ? { ...m, parentIds: [...(m.parentIds || []), newId] } : m),
        newParent,
      ],
    }));

    setSelectedMemberId(newId);
  };

  // Right-click quick action: Add Spouse to member with first-spouse child adoption
  const handleAddSpouseToMember = (targetMember: FamilyMember) => {
    const newId = `member-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSpouse: FamilyMember = {
      id: newId,
      firstName: '',
      lastName: '',
      gender: 'other',
      isLiving: true,
      color: '#64748B',
      colorMode: 'gender',
      isCustomColor: false,
      parentIds: [],
      spouseIds: [targetMember.id],
    };

    const isFirstSpouse = (targetMember.spouseIds || []).length === 0;

    setTreeData(prev => {
      const updatedMembers = prev.members.map(m => {
        if (m.id === targetMember.id) {
          return { ...m, spouseIds: [...(m.spouseIds || []), newId] };
        }
        return m;
      });

      const withNewSpouse = [...updatedMembers, newSpouse];
      const fullySynced = syncSpouseChildrenOnSpouseAdded(withNewSpouse, targetMember.id, newId);

      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        members: fullySynced,
      };
    });

    setSelectedMemberId(newId);
  };

  // Right-click quick action: Add Child to member
  const handleAddChildToMember = (targetMember: FamilyMember) => {
    const newId = `member-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newChild: FamilyMember = {
      id: newId,
      firstName: '',
      lastName: '',
      gender: 'other',
      isLiving: true,
      color: '#64748B',
      colorMode: 'gender',
      isCustomColor: false,
      parentIds: [targetMember.id],
      spouseIds: [],
    };

    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      members: [...prev.members, newChild],
    }));

    setSelectedMemberId(newId);
  };

  // Auto-align generation(s) to the same Y-level
  const handleAutoAlignGenerations = useCallback((targetGen: number | 'all', gapUnits: number) => {
    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      members: autoAlignGenerations(prev.members, targetGen, gapUnits, prev.settings.orientation),
    }));
  }, []);

  // Add custom relationship type definition
  const handleAddRelationshipType = (newType: RelationshipTypeDefinition) => {
    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      relationshipTypes: [...(prev.relationshipTypes || []), newType],
    }));
  };

  const handleUpdateSettings = (newSettings: TreeSettings) => {
    setTreeData(prev => ({
      ...prev,
      settings: newSettings,
      treeName: newSettings.treeName,
    }));
  };

  // Update multiple member positions after dragging
  const handleUpdateMemberPositions = useCallback((positions: Map<string, { x: number; y: number }>) => {
    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      members: prev.members.map(m => {
        const pos = positions.get(m.id);
        if (pos) {
          return {
            ...m,
            customPosition: { x: Math.round(pos.x), y: Math.round(pos.y) },
          };
        }
        return m;
      }),
    }));
  }, []);

  // Reset custom member positions to automatically calculated layout
  const handleResetLayoutPositions = useCallback(() => {
    setTreeData(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      members: prev.members.map(m => {
        const { customPosition, ...rest } = m;
        return rest;
      }),
    }));
  }, []);

  const selectedMember = treeData.members.find(m => m.id === selectedMemberId) || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
      {/* Hidden file input for .ftree loading */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ftree,.json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Windows 11 Native Custom Dark Titlebar & Context Bar */}
      <TitleBar
        treeData={treeData}
        onNewTree={handleNewTree}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onExportPng={handleExportPng}
        onExportHighResImage={handleInstallHighResImage}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onZoomIn={() => {
          const zoomBtn = document.querySelector('[title="Zoom In"]') as HTMLButtonElement;
          zoomBtn?.click();
        }}
        onZoomOut={() => {
          const zoomBtn = document.querySelector('[title="Zoom Out"]') as HTMLButtonElement;
          zoomBtn?.click();
        }}
        onResetView={() => {
          const resetBtn = document.querySelector('[title="Center / Reset View"]') as HTMLButtonElement;
          resetBtn?.click();
        }}
        onLoadSample={handleLoadSample}
        onAddNewMember={handleAddNewMember}
      />

      {/* Main Board & Right-Hand Sidebar Container */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Infinite Grid Board */}
        <main className="flex-1 relative overflow-hidden">
          <TreeCanvas
            members={treeData.members}
            settings={treeData.settings}
            selectedMemberId={selectedMemberId}
            onSelectMember={(member) => setSelectedMemberId(member.id)}
            onAddNewMember={handleAddNewMember}
            onExportHighResImage={handleInstallHighResImage}
            onAddParentToMember={handleAddParentToMember}
            onAddSpouseToMember={handleAddSpouseToMember}
            onAddChildToMember={handleAddChildToMember}
            onDeleteMember={handleDeleteMember}
            onUpdateMemberPositions={handleUpdateMemberPositions}
            onResetLayoutPositions={handleResetLayoutPositions}
            onUpdateMembers={handleUpdateAllMembers}
            canvasContainerRef={canvasContainerRef}
            canvasContentRef={canvasContentRef}
          />
        </main>

        {/* Right-Hand Sidebar for editing clicked member */}
        <MemberSidebar
          member={selectedMember}
          allMembers={treeData.members}
          relationshipTypes={treeData.relationshipTypes}
          onAddRelationshipType={handleAddRelationshipType}
          isOpen={Boolean(selectedMember)}
          onClose={() => setSelectedMemberId(null)}
          onUpdateMember={handleUpdateMember}
          onUpdateAllMembers={handleUpdateAllMembers}
          onDeleteMember={handleDeleteMember}
        />
      </div>

      {/* High-Resolution Full Tree Export Progress Modal */}
      {exportStatus && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl space-y-3">
            <div className="w-10 h-10 rounded-full border-3 border-indigo-500 border-t-transparent animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-100">Capturing Full Family Tree</h3>
            <p className="text-xs text-indigo-300 font-medium">{exportStatus}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dynamically scaling canvas resolution to ensure razor-sharp zoom clarity for names, dates, and portrait images.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification Toast */}
      {exportSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs select-none">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-100">{exportSuccessMessage}</span>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={treeData.settings}
        members={treeData.members}
        onUpdateSettings={handleUpdateSettings}
        onAutoAlignGenerations={handleAutoAlignGenerations}
      />
    </div>
  );
}

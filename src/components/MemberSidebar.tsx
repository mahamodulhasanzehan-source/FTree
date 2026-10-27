import React, { useState } from 'react';
import { AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { FamilyMember, RelationshipTypeDefinition } from '../types';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { PhotoSection } from './sidebar/PhotoSection';
import { PersonalDetailsSection } from './sidebar/PersonalDetailsSection';
import { VitalDatesSection } from './sidebar/VitalDatesSection';
import { LineageColorSection } from './sidebar/LineageColorSection';
import { RelationshipsSection } from './sidebar/RelationshipsSection';
import { DangerZoneSection } from './sidebar/DangerZoneSection';

interface MemberSidebarProps {
  member: FamilyMember | null;
  allMembers: FamilyMember[];
  relationshipTypes?: RelationshipTypeDefinition[];
  onAddRelationshipType?: (type: RelationshipTypeDefinition) => void;
  isOpen: boolean;
  onClose: () => void;
  onUpdateMember: (updated: FamilyMember) => void;
  onUpdateAllMembers: (members: FamilyMember[]) => void;
  onDeleteMember: (memberId: string) => void;
}

export const MemberSidebar: React.FC<MemberSidebarProps> = ({
  member,
  allMembers,
  relationshipTypes,
  onAddRelationshipType,
  isOpen,
  onClose,
  onUpdateMember,
  onUpdateAllMembers,
  onDeleteMember,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isOpen || !member) return null;

  return (
    <div className="relative flex h-full z-40 flex-shrink-0 select-none">
      {/* Quick toggle tab on left edge to collapse/expand for full tree view */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand Details Sidebar' : 'Collapse Details Sidebar'}
        className="absolute -left-3 top-12 z-50 w-6 h-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-l-md flex items-center justify-center text-slate-300 hover:text-white shadow-lg transition-colors cursor-pointer"
      >
        {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Main Narrow Sidebar Panel (Width: 270px) */}
      <aside
        className={`bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-0 border-l-0' : 'w-[270px]'
        }`}
      >
        {!isCollapsed && (
          <>
            {/* Header */}
            <SidebarHeader
              member={member}
              onClose={onClose}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => setIsCollapsed(true)}
            />

            {/* Scrollable Form Body with tight professional spacing */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {errorMsg && (
                <div className="p-2 bg-red-950/60 border border-red-800/80 rounded-md text-[11px] text-red-200 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Photo and alignment */}
              <PhotoSection
                member={member}
                onUpdateMember={onUpdateMember}
              />

              {/* 2. Personal Details (Vertical list: First Name -> Last Name -> Maiden Name -> Gender -> Generation) */}
              <PersonalDetailsSection
                member={member}
                allMembers={allMembers}
                onUpdateMember={onUpdateMember}
              />

              {/* 3. Vital Dates & Living Status (Vertical list) */}
              <VitalDatesSection
                member={member}
                onUpdateMember={onUpdateMember}
              />

              {/* 4. Lineage Color & Inherit Actions */}
              <LineageColorSection
                member={member}
                allMembers={allMembers}
                onUpdateMember={onUpdateMember}
              />

              {/* 5. Fused Relationships Module (Type selection + Searchable Name Picker + Custom Types) */}
              <RelationshipsSection
                member={member}
                allMembers={allMembers}
                relationshipTypes={relationshipTypes}
                onAddRelationshipType={onAddRelationshipType}
                onUpdateAllMembers={onUpdateAllMembers}
                onError={setErrorMsg}
              />

              {/* 6. Danger Zone */}
              <DangerZoneSection
                member={member}
                onDeleteMember={onDeleteMember}
                onClose={onClose}
              />
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

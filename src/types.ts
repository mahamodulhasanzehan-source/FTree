export type Gender = 'male' | 'female' | 'other';
export type AdoptionStatus = 'biological' | 'adopted';
export type TreeOrientation = 'top-to-bottom' | 'bottom-to-up';
export type ConnectorStyle = 'curved' | 'orthogonal';

export type RelationshipBehavior = 'parent' | 'spouse' | 'child';

export interface RelationshipTypeDefinition {
  id: string;
  label: string;
  behavior: RelationshipBehavior;
  isCustom?: boolean;
}

export interface MemberRelationship {
  id: string;
  targetId: string;
  typeId: string;
  customLabel?: string;
  behavior: RelationshipBehavior;
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  nickname?: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  isLiving: boolean;
  avatar?: string; // Base64 data URL
  imageZoom?: number; // Zoom level: 1.0 to 3.0
  imageOffsetX?: number; // Horizontal pan offset (-50 to +50%)
  imageOffsetY?: number; // Vertical pan offset (-50 to +50%)
  color: string; // Hex color code e.g. #4B5563
  colorMode?: 'gender' | 'custom'; // 'gender' (default) or 'custom'
  isCustomColor?: boolean; // True if manually assigned or randomized
  parentIds: string[]; // IDs of parents (usually up to 2)
  spouseIds: string[]; // IDs of spouses / partners
  relationships?: MemberRelationship[]; // Unified relationships list with custom types
  customPosition?: { x: number; y: number }; // User-dragged custom placement
  generation?: number; // 1-based generation index
  adoptionStatus?: AdoptionStatus;
  notes?: string;
}

export interface TreeSettings {
  orientation: TreeOrientation;
  connectorStyle: ConnectorStyle;
  showAges: boolean;
  showDates: boolean;
  treeName: string;
  generationGapUnits?: number; // 1 to 100 units
  lineThickness?: number; // 1 to 30 px, default 5.5
}

export interface TreeData {
  version: string;
  treeName: string;
  createdAt: string;
  updatedAt: string;
  settings: TreeSettings;
  members: FamilyMember[];
  relationshipTypes?: RelationshipTypeDefinition[];
}

export interface NodePosition {
  x: number;
  y: number;
  generation: number;
}

export interface Connector {
  id: string;
  type: 'marriage' | 'parent-child';
  path: string;
  color: string;
  fromId: string;
  toId?: string;
  dashed?: boolean;
}

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

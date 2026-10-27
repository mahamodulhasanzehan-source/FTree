import { toPng } from 'html-to-image';
import { TreeData, FamilyMember, TreeSettings } from '../types';

export const CURRENT_FILE_VERSION = '1.0.0';

/**
 * Returns a rich starter family tree to demonstrate generations,
 * color inheritance (Blue + Red = Purple), and photos/relationships.
 */
export function getStarterTree(): TreeData {
  const members: FamilyMember[] = [
    {
      id: 'member-1',
      firstName: 'Arthur',
      lastName: 'Pendleton',
      gender: 'male',
      birthDate: '1948-03-15',
      isLiving: true,
      color: '#0000FF', // Blue
      isCustomColor: true,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
      imageZoom: 1.1,
      imageOffsetX: 0,
      imageOffsetY: -5,
      parentIds: [],
      spouseIds: ['member-2'],
      notes: 'Family patriarch, retired architect.',
    },
    {
      id: 'member-2',
      firstName: 'Eleanor',
      lastName: 'Pendleton',
      maidenName: 'Vance',
      gender: 'female',
      birthDate: '1952-07-22',
      isLiving: true,
      color: '#FF0000', // Red
      isCustomColor: true,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      imageZoom: 1.15,
      imageOffsetX: 0,
      imageOffsetY: -5,
      parentIds: [],
      spouseIds: ['member-1'],
      notes: 'Botanist and master gardener.',
    },
    {
      id: 'member-3',
      firstName: 'David',
      lastName: 'Pendleton',
      gender: 'male',
      birthDate: '1976-11-04',
      isLiving: true,
      color: '#800080', // Blended Blue + Red = Purple (#800080)
      isCustomColor: false,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      imageZoom: 1.05,
      imageOffsetX: 0,
      imageOffsetY: -5,
      parentIds: ['member-1', 'member-2'],
      spouseIds: ['member-4'],
      notes: 'Inherited blended color from Arthur & Eleanor.',
    },
    {
      id: 'member-4',
      firstName: 'Sophia',
      lastName: 'Pendleton',
      maidenName: 'Lin',
      gender: 'female',
      birthDate: '1980-05-18',
      isLiving: true,
      color: '#059669', // Emerald Green
      isCustomColor: true,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      imageZoom: 1.1,
      imageOffsetX: 0,
      imageOffsetY: -5,
      parentIds: [],
      spouseIds: ['member-3'],
      notes: 'Software engineer and violinist.',
    },
    {
      id: 'member-5',
      firstName: 'Lucas',
      lastName: 'Pendleton',
      gender: 'male',
      birthDate: '2008-09-12',
      isLiving: true,
      color: '#434B75', // Blended Purple (#800080) + Green (#059669) = Slate/Navy (#434B75)
      isCustomColor: false,
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
      imageZoom: 1.1,
      imageOffsetX: 0,
      imageOffsetY: -5,
      parentIds: ['member-3', 'member-4'],
      spouseIds: [],
      notes: 'High school student and robotics enthusiast.',
    },
    {
      id: 'member-6',
      firstName: 'Mia',
      lastName: 'Pendleton',
      gender: 'female',
      birthDate: '2012-02-28',
      isLiving: true,
      color: '#434B75',
      isCustomColor: false,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      imageZoom: 1.15,
      imageOffsetX: 0,
      imageOffsetY: -5,
      parentIds: ['member-3', 'member-4'],
      spouseIds: [],
      notes: 'Loves astronomy and soccer.',
    },
  ];

  return {
    version: CURRENT_FILE_VERSION,
    treeName: 'Pendleton Family Tree',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      orientation: 'top-to-bottom',
      connectorStyle: 'curved',
      showAges: true,
      showDates: true,
      treeName: 'Pendleton Family Tree',
      lineThickness: 5.5,
    },
    members,
  };
}

/**
 * Validates and parses `.ftree` JSON data safely
 */
export function parseFtreeContent(jsonString: string): TreeData {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.members)) {
      throw new Error('Invalid format: missing members list');
    }

    return {
      version: parsed.version || CURRENT_FILE_VERSION,
      treeName: parsed.treeName || 'Untitled Family Tree',
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        orientation: parsed.settings?.orientation === 'bottom-to-up' ? 'bottom-to-up' : 'top-to-bottom',
        connectorStyle: parsed.settings?.connectorStyle === 'orthogonal' ? 'orthogonal' : 'curved',
        showAges: parsed.settings?.showAges ?? true,
        showDates: parsed.settings?.showDates ?? true,
        treeName: parsed.treeName || 'Untitled Family Tree',
        generationGapUnits: typeof parsed.settings?.generationGapUnits === 'number' ? parsed.settings.generationGapUnits : 1,
      },
      relationshipTypes: Array.isArray(parsed.relationshipTypes) ? parsed.relationshipTypes : undefined,
      members: parsed.members.map((m: any) => ({
        id: String(m.id || `member-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
        firstName: String(m.firstName ?? ''),
        lastName: String(m.lastName ?? ''),
        maidenName: m.maidenName ? String(m.maidenName) : undefined,
        nickname: m.nickname ? String(m.nickname) : undefined,
        gender: m.gender === 'male' || m.gender === 'female' ? m.gender : 'other',
        birthDate: m.birthDate ? String(m.birthDate) : undefined,
        deathDate: m.deathDate ? String(m.deathDate) : undefined,
        isLiving: Boolean(m.isLiving ?? true),
        avatar: m.avatar ? String(m.avatar) : undefined,
        imageZoom: typeof m.imageZoom === 'number' ? m.imageZoom : 1,
        imageOffsetX: typeof m.imageOffsetX === 'number' ? m.imageOffsetX : 0,
        imageOffsetY: typeof m.imageOffsetY === 'number' ? m.imageOffsetY : 0,
        color: m.color ? String(m.color) : '#4B5563',
        colorMode: m.colorMode === 'custom' ? 'custom' : 'gender',
        isCustomColor: Boolean(m.isCustomColor),
        parentIds: Array.isArray(m.parentIds) ? m.parentIds.map(String) : [],
        spouseIds: Array.isArray(m.spouseIds) ? m.spouseIds.map(String) : [],
        relationships: Array.isArray(m.relationships) ? m.relationships : undefined,
        customPosition: m.customPosition && typeof m.customPosition.x === 'number' && typeof m.customPosition.y === 'number'
          ? { x: m.customPosition.x, y: m.customPosition.y }
          : undefined,
        generation: typeof m.generation === 'number' ? m.generation : undefined,
        adoptionStatus: m.adoptionStatus === 'adopted' ? 'adopted' : 'biological',
        notes: m.notes ? String(m.notes) : undefined,
      })),
    };
  } catch (err: any) {
    throw new Error(`Failed to parse .ftree file: ${err.message}`);
  }
}

/**
 * Saves tree to a `.ftree` file download
 */
export function exportToFtreeFile(data: TreeData, filename?: string): void {
  const cleanFilename = (filename || data.treeName || 'FamilyTree')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .trim();
  const fileData = JSON.stringify(data, null, 2);
  const blob = new Blob([fileData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${cleanFilename}.ftree`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Exports current canvas DOM element to a high-res PNG image
 */
export async function exportCanvasAsPng(
  canvasElement: HTMLElement,
  filename = 'FamilyTree.png'
): Promise<void> {
  try {
    const dataUrl = await toPng(canvasElement, {
      backgroundColor: '#090D16',
      pixelRatio: 2, // 2x high resolution for printing/viewing
      filter: (node: HTMLElement) => {
        // Exclude interactive overlays or UI control handles
        if (node.classList && node.classList.contains('canvas-ui-overlay')) {
          return false;
        }
        return true;
      },
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to export canvas as PNG:', err);
    throw err;
  }
}

/**
 * Converts an image File object into a base64 data URL without cropping or black padding
 */
export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

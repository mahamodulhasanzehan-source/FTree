export const DEFAULT_MEMBER_COLOR = '#4B5563';

export const PRESET_COLORS: string[] = [
  '#4B5563', // Slate Gray (Default)
  '#2563EB', // Royal Blue
  '#DC2626', // Crimson Red
  '#059669', // Emerald Green
  '#7C3AED', // Violet Purple
  '#D97706', // Amber Gold
  '#DB2777', // Rose Pink
  '#0891B2', // Cyan
  '#EA580C', // Deep Orange
  '#4F46E5', // Indigo
  '#16A34A', // Forest Green
  '#9333EA', // Orchid
];

/**
 * Returns default module color based on gender:
 * - male: Royal Blue (#2563EB)
 * - female: Rose Pink (#DB2777)
 * - other: Slate Gray (#64748B)
 */
export function getGenderColor(gender?: string): string {
  if (gender === 'male') return '#2563EB';
  if (gender === 'female') return '#DB2777';
  return '#64748B';
}

/**
 * Normalizes hex string into 6-digit hex format (#RRGGBB)
 */
export function normalizeHex(hex: string): string {
  if (!hex) return DEFAULT_MEMBER_COLOR;
  let clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return DEFAULT_MEMBER_COLOR;
  return `#${clean.toUpperCase()}`;
}

/**
 * Validates whether string is a valid 3 or 6 hex code
 */
export function isValidHex(hex: string): boolean {
  if (!hex) return false;
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

/**
 * Converts Hex string to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHex(hex).slice(1);
  const r = parseInt(norm.substring(0, 2), 16);
  const g = parseInt(norm.substring(2, 4), 16);
  const b = parseInt(norm.substring(4, 6), 16);
  return {
    r: isNaN(r) ? 75 : r,
    g: isNaN(g) ? 85 : g,
    b: isNaN(b) ? 99 : b,
  };
}

/**
 * Converts RGB numbers (0-255) to #RRGGBB hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Mathematically blends two hex colors with a weight ratio (0 to 1)
 */
export function blendColors(hexA: string, hexB: string, ratio = 0.5): string {
  const c1 = hexToRgb(hexA);
  const c2 = hexToRgb(hexB);
  const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
  const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
  const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
  return rgbToHex(r, g, b);
}

/**
 * Genetic Color Mixing Rule:
 * - If 2 parents have custom colors, blend mathematically
 * - If only 1 parent has a custom color, inherit that color
 * - If no parents have custom colors, return DEFAULT_MEMBER_COLOR
 */
export function calculateInheritedColor(
  parentColors: (string | undefined | null)[]
): { color: string; isInherited: boolean } {
  const validColors = (parentColors || [])
    .filter((c): c is string => typeof c === 'string' && isValidHex(c))
    .map(c => normalizeHex(c))
    .filter(c => c !== DEFAULT_MEMBER_COLOR);

  if (validColors.length === 0) {
    // If parents only have default gray or no colors
    const anyParent = (parentColors || []).find(c => typeof c === 'string' && isValidHex(c));
    return {
      color: anyParent ? normalizeHex(anyParent) : DEFAULT_MEMBER_COLOR,
      isInherited: false,
    };
  }

  if (validColors.length === 1) {
    return {
      color: validColors[0],
      isInherited: true,
    };
  }

  // Two or more parents: calculate average mathematical blend
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (const col of validColors) {
    const rgb = hexToRgb(col);
    sumR += rgb.r;
    sumG += rgb.g;
    sumB += rgb.b;
  }

  const blended = rgbToHex(
    sumR / validColors.length,
    sumG / validColors.length,
    sumB / validColors.length
  );

  return {
    color: blended,
    isInherited: true,
  };
}

/**
 * Generates a vibrant, appealing random hex color
 */
export function getRandomHexColor(): string {
  // Generate appealing colors in HSL then convert to hex
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(65 + Math.random() * 25); // 65-90%
  const l = Math.floor(45 + Math.random() * 15); // 45-60%

  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  const sRatio = s / 100;
  const lRatio = l / 100;
  const c = (1 - Math.abs(2 * lRatio - 1)) * sRatio;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lRatio - c / 2;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/**
 * Returns white or dark text color based on background luminance
 */
export function getContrastingTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  // Perceptive luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0F172A' : '#FFFFFF';
}

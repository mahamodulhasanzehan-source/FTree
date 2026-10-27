import { toPng } from 'html-to-image';
import { TreeData, FamilyMember } from '../types';
import { calculateTreeLayout, CARD_WIDTH, CARD_HEIGHT } from './treeLayout';
import { hexToRgb } from './colorEngine';

export interface ExportProgressCallback {
  (message: string): void;
}

/**
 * Calculates optimal pixel ratio scale dynamically based on the full tree's footprint.
 * Ensures the output image is high-resolution enough to zoom in and read individual
 * names and photos, while staying within safe browser memory limits.
 */
function calculateOptimalScale(width: number, height: number): number {
  const maxSafeDimension = 11000;
  let scale = 3.0;

  if (width < 1200) {
    scale = 3.5;
  } else if (width < 2500) {
    scale = 2.8;
  } else if (width < 4000) {
    scale = 2.2;
  } else {
    scale = 1.8;
  }

  // Safety clamp against max browser canvas limit
  if (width * scale > maxSafeDimension || height * scale > maxSafeDimension) {
    scale = Math.min(maxSafeDimension / width, maxSafeDimension / height);
  }

  return Math.max(scale, 1.5);
}

/**
 * Creates an offscreen DOM element rendering the entire family tree
 * scaled with true aspect ratio, padding, title banner, and crisp SVG connectors.
 */
function createOffscreenTreeElement(
  treeData: TreeData
): { container: HTMLDivElement; totalWidth: number; totalHeight: number; scale: number } {
  const layout = calculateTreeLayout(
    treeData.members,
    treeData.settings.orientation,
    treeData.settings.connectorStyle
  );

  const bounds = layout.bounds;
  const paddingX = 80;
  const paddingY = 60;
  const headerHeight = 100;

  const contentWidth = Math.max(bounds.width + paddingX * 2, 700);
  const contentHeight = Math.max(bounds.height + paddingY * 2, 450);

  const totalWidth = contentWidth;
  const totalHeight = contentHeight + headerHeight;

  const scale = calculateOptimalScale(totalWidth, totalHeight);

  // Main container: position at top-left with negative z-index so browser rasterizes it cleanly without culling
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = `${totalWidth}px`;
  container.style.height = `${totalHeight}px`;
  container.style.backgroundColor = '#020617';
  container.style.backgroundImage = 'radial-gradient(circle, rgba(148, 163, 184, 0.12) 1.2px, transparent 1.2px)';
  container.style.backgroundSize = '24px 24px';
  container.style.fontFamily = "'Comic Sans MS', 'Comic Sans', 'Comic Neue', cursive, sans-serif";
  container.style.color = '#F8FAFC';
  container.style.overflow = 'hidden';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.visibility = 'visible';

  // 1. Title Banner
  const header = document.createElement('div');
  header.style.position = 'absolute';
  header.style.top = '24px';
  header.style.left = `${paddingX}px`;
  header.style.right = `${paddingX}px`;
  header.style.height = `${headerHeight - 34}px`;
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.borderBottom = '1px solid rgba(51, 65, 85, 0.7)';
  header.style.paddingBottom = '12px';

  const titleGroup = document.createElement('div');
  const title = document.createElement('h1');
  title.style.margin = '0';
  title.style.fontSize = '26px';
  title.style.fontWeight = '700';
  title.style.letterSpacing = '-0.02em';
  title.style.color = '#F8FAFC';
  title.textContent = treeData.treeName || 'Family Tree';

  const subtitle = document.createElement('p');
  subtitle.style.margin = '4px 0 0 0';
  subtitle.style.fontSize = '12px';
  subtitle.style.color = '#94A3B8';
  subtitle.textContent = `${treeData.members.length} Members • Ultra-High Resolution Archive`;

  titleGroup.appendChild(title);
  titleGroup.appendChild(subtitle);

  const datePill = document.createElement('div');
  datePill.style.fontSize = '11px';
  datePill.style.color = '#94A3B8';
  datePill.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
  datePill.style.padding = '6px 14px';
  datePill.style.borderRadius = '9999px';
  datePill.style.border = '1px solid rgba(51, 65, 85, 0.6)';
  datePill.textContent = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  header.appendChild(titleGroup);
  header.appendChild(datePill);
  container.appendChild(header);

  // Translation offset for all nodes and paths
  const offsetX = -bounds.minX + paddingX;
  const offsetY = -bounds.minY + paddingY + headerHeight;

  // 2. SVG Connectors Layer
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', String(totalWidth));
  svg.setAttribute('height', String(totalHeight));
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.pointerEvents = 'none';

  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);

  const baseThickness = treeData.settings?.lineThickness ?? 5.5;

  for (const conn of layout.connectors) {
    const isMarriage = conn.type === 'marriage';
    const strokeWidth = isMarriage ? Math.max(1, baseThickness - 0.5) : baseThickness;
    const shadowWidth = strokeWidth + 3;

    // Shadow outline
    const shadowPath = document.createElementNS(svgNS, 'path');
    shadowPath.setAttribute('d', conn.path);
    shadowPath.setAttribute('fill', 'none');
    shadowPath.setAttribute('stroke', '#020617');
    shadowPath.setAttribute('stroke-width', String(shadowWidth));
    shadowPath.setAttribute('stroke-linecap', 'round');
    shadowPath.setAttribute('stroke-linejoin', 'round');
    g.appendChild(shadowPath);

    // Foreground branch
    const branchPath = document.createElementNS(svgNS, 'path');
    branchPath.setAttribute('d', conn.path);
    branchPath.setAttribute('fill', 'none');
    branchPath.setAttribute('stroke', conn.color || '#94A3B8');
    branchPath.setAttribute('stroke-width', String(strokeWidth));
    if (conn.dashed) {
      branchPath.setAttribute('stroke-dasharray', '8,5');
    }
    branchPath.setAttribute('stroke-linecap', 'round');
    branchPath.setAttribute('stroke-linejoin', 'round');
    g.appendChild(branchPath);
  }

  svg.appendChild(g);
  container.appendChild(svg);

  // 3. Member Cards Layer
  for (const node of layout.nodes.values()) {
    const member = node.member;
    const cardColor = member.color || '#64748B';

    const card = document.createElement('div');
    card.style.position = 'absolute';
    card.style.left = `${node.x + offsetX}px`;
    card.style.top = `${node.y + offsetY}px`;
    card.style.width = `${CARD_WIDTH}px`;
    card.style.height = '250px';
    card.style.backgroundColor = '#0F172A';
    card.style.borderRadius = '12px';
    card.style.border = `3.5px solid ${cardColor}`;
    card.style.boxShadow = `0 4px 16px -2px rgba(0, 0, 0, 0.45), 0 0 8px ${cardColor}26`;
    card.style.overflow = 'hidden';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';

    // Portrait area
    const photoBox = document.createElement('div');
    photoBox.style.width = '100%';
    photoBox.style.height = '164px';
    photoBox.style.backgroundColor = '#020617';
    photoBox.style.position = 'relative';
    photoBox.style.overflow = 'hidden';
    photoBox.style.display = 'flex';
    photoBox.style.alignItems = 'center';
    photoBox.style.justifyContent = 'center';

    if (member.avatar) {
      const img = document.createElement('img');
      img.src = member.avatar;
      img.crossOrigin = 'anonymous';
      const zoom = member.imageZoom ?? 1;
      const ox = member.imageOffsetX ?? 0;
      const oy = member.imageOffsetY ?? 0;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.transform = `scale(${zoom}) translate(${ox}%, ${oy}%)`;
      img.style.transformOrigin = 'center center';
      photoBox.appendChild(img);
    } else {
      const initialsBox = document.createElement('div');
      initialsBox.style.width = '52px';
      initialsBox.style.height = '52px';
      initialsBox.style.borderRadius = '50%';
      initialsBox.style.border = `2px solid ${cardColor}`;
      initialsBox.style.display = 'flex';
      initialsBox.style.alignItems = 'center';
      initialsBox.style.justifyContent = 'center';
      initialsBox.style.fontSize = '16px';
      initialsBox.style.fontWeight = 'bold';
      initialsBox.style.color = '#E2E8F0';
      const first = member.firstName?.charAt(0) || '';
      const last = member.lastName?.charAt(0) || '';
      initialsBox.textContent = (first + last).toUpperCase() || '?';
      photoBox.appendChild(initialsBox);
    }

    if (!member.isLiving) {
      const badge = document.createElement('div');
      badge.style.position = 'absolute';
      badge.style.top = '8px';
      badge.style.right = '8px';
      badge.style.padding = '2px 6px';
      badge.style.backgroundColor = 'rgba(2, 6, 23, 0.85)';
      badge.style.borderRadius = '4px';
      badge.style.fontSize = '10px';
      badge.style.color = '#CBD5E1';
      badge.textContent = '†';
      photoBox.appendChild(badge);
    }

    card.appendChild(photoBox);

    // Info area
    const isDefaultColor = !member.color || 
      member.color.toUpperCase() === '#64748B' || 
      member.color.toUpperCase() === '#4B5563';
    const rgb = hexToRgb(cardColor);

    const info = document.createElement('div');
    info.style.flex = '1';
    info.style.padding = '10px';
    if (!isDefaultColor) {
      info.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.20)`;
      info.style.background = `linear-gradient(to bottom, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.24) 100%), #0F172A`;
      info.style.borderTop = `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`;
    } else {
      info.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
      info.style.borderTop = '1px solid rgba(51, 65, 85, 0.8)';
    }
    info.style.display = 'flex';
    info.style.flexDirection = 'column';
    info.style.justifyContent = 'center';

    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
    const nameLen = fullName.length;

    // Birth/death year + age calculation
    const formatYear = (d?: string) => {
      if (!d) return '';
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? '' : String(parsed.getFullYear());
    };

    const bYear = formatYear(member.birthDate);
    const dYear = formatYear(member.deathDate);

    let ageStr = '';
    if (member.birthDate) {
      const bDate = new Date(member.birthDate);
      if (!isNaN(bDate.getTime())) {
        const eDate = !member.isLiving && member.deathDate ? new Date(member.deathDate) : new Date();
        let age = eDate.getFullYear() - bDate.getFullYear();
        const m = eDate.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && eDate.getDate() < bDate.getDate())) age--;
        if (age >= 0) ageStr = `${age} yrs`;
      }
    }

    const showDates = treeData.settings?.showDates !== false;
    const showAges = treeData.settings?.showAges !== false;
    const hasDates = showDates && (Boolean(bYear) || Boolean(dYear) || member.isLiving);
    const hasAge = showAges && Boolean(ageStr);
    const showDateRow = hasDates || hasAge;

    const nameEl = document.createElement('h3');
    nameEl.style.margin = '0';
    let nameSize = showDateRow ? '29px' : '33px';
    if (nameLen > 28) nameSize = showDateRow ? '13px' : '14px';
    else if (nameLen > 22) nameSize = showDateRow ? '14.5px' : '15.5px';
    else if (nameLen > 17) nameSize = showDateRow ? '16.5px' : '18px';
    else if (nameLen > 14) nameSize = showDateRow ? '19px' : '21.5px';
    else if (nameLen > 11) nameSize = showDateRow ? '22px' : '25px';
    else if (nameLen > 8) nameSize = showDateRow ? '25px' : '29px';
    nameEl.style.fontSize = nameSize;
    nameEl.style.fontWeight = 'bold';
    nameEl.style.color = '#F1F5F9';
    nameEl.style.overflow = 'hidden';
    nameEl.style.textOverflow = 'ellipsis';
    nameEl.style.whiteSpace = 'nowrap';
    nameEl.textContent = fullName || 'Untitled';
    info.appendChild(nameEl);

    if (member.maidenName) {
      const maidenEl = document.createElement('div');
      maidenEl.style.fontSize = '11px';
      maidenEl.style.color = '#94A3B8';
      maidenEl.style.fontStyle = 'italic';
      maidenEl.textContent = `(née ${member.maidenName})`;
      info.appendChild(maidenEl);
    }

    if (showDateRow) {
      const dateRow = document.createElement('div');
      dateRow.style.marginTop = '6px';
      dateRow.style.fontSize = '13.5px';
      dateRow.style.fontWeight = '500';
      dateRow.style.color = '#E2E8F0';
      dateRow.style.display = 'flex';
      dateRow.style.alignItems = 'center';
      dateRow.style.gap = '5px';

      if (hasDates) {
        const dateSpan = document.createElement('span');
        dateSpan.textContent = `${bYear || '?'} – ${member.isLiving ? 'Present' : (dYear || '†')}`;
        dateRow.appendChild(dateSpan);
      }

      if (hasAge) {
        const ageSpan = document.createElement('span');
        ageSpan.style.color = '#A5B4FC';
        ageSpan.style.fontWeight = '600';
        ageSpan.textContent = hasDates ? `• ${ageStr}` : `Age: ${ageStr}`;
        dateRow.appendChild(ageSpan);
      }

      info.appendChild(dateRow);
    }
    card.appendChild(info);

    container.appendChild(card);
  }

  return { container, totalWidth, totalHeight, scale };
}

/**
 * Saves image dataUrl to the user's filesystem.
 * In standalone environments, tries window.showSaveFilePicker.
 * In cross-origin iframes (like web sandboxes), avoids SecurityError and uses clean anchor download.
 */
async function saveImageToFile(dataUrl: string, suggestedName: string): Promise<boolean> {
  const cleanName = suggestedName.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'FamilyTree';
  const fileName = `${cleanName}.png`;

  const isSubframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  // Native File System Access API (only attempt in top-level windows to prevent iframe SecurityError)
  if (!isSubframe && typeof (window as any).showSaveFilePicker === 'function') {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'PNG High-Resolution Image',
            accept: { 'image/png': ['.png'] },
          },
        ],
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled dialog
        return false;
      }
      console.warn('Native file picker notice, falling back to download link:', err);
    }
  }

  // Graceful fallback for iframes and browsers without showSaveFilePicker
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

/**
 * Captures the entire family tree at an ultra-high resolution tailored to its
 * dimensions, preserving exact aspect ratio and razor-sharp clarity.
 */
export async function installHighResTreeImage(
  treeData: TreeData,
  onProgress?: ExportProgressCallback
): Promise<{ success: boolean; resolution: string }> {
  if (!treeData.members || treeData.members.length === 0) {
    throw new Error('Family tree is empty. Add members first to export.');
  }

  onProgress?.('Preparing ultra-high resolution tree canvas...');

  const { container, totalWidth, totalHeight, scale } = createOffscreenTreeElement(treeData);
  document.body.appendChild(container);

  try {
    const finalWidth = Math.round(totalWidth * scale);
    const finalHeight = Math.round(totalHeight * scale);
    const resolutionStr = `${finalWidth} × ${finalHeight} px`;

    onProgress?.(`Rendering high-definition tree (${resolutionStr})...`);

    // Ensure all images are fully loaded before capturing
    const imgElements = Array.from(container.querySelectorAll('img'));
    if (imgElements.length > 0) {
      await Promise.all(
        imgElements.map(img => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 400);
          });
        })
      );
    }

    // Brief layout settle
    await new Promise(resolve => setTimeout(resolve, 60));

    // skipFonts: true prevents cross-origin CSSStyleSheet.cssRules SecurityError from Google Fonts
    const dataUrl = await toPng(container, {
      pixelRatio: scale,
      backgroundColor: '#020617',
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
    });

    onProgress?.('Saving your high-resolution tree archive...');
    const saved = await saveImageToFile(dataUrl, `${treeData.treeName || 'FamilyTree'}_UltraHD`);

    return {
      success: saved,
      resolution: resolutionStr,
    };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

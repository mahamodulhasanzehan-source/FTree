import { FamilyMember, TreeOrientation, ConnectorStyle, Connector } from '../types';

export const GRID_SIZE = 24;
export const CARD_WIDTH = 190;
export const CARD_HEIGHT = 250;
export const HORIZONTAL_GAP = 48; // Exactly 2 grid cells (2 * 24 = 48)
export const SPOUSE_GAP = 50; // Snaps to 10 grid cells (190 + 50 = 240px, >= 28px minimum gap)
export const VERTICAL_GAP = 134; // Snaps to 16 grid cells (250 + 134 = 384px, >= 84px minimum gap)

export const snapToGrid = (val: number, gridSize = GRID_SIZE): number => {
  return Math.round(val / gridSize) * gridSize;
};

export interface LayoutNode {
  member: FamilyMember;
  x: number;
  y: number;
  generation: number;
}

export interface TreeLayoutResult {
  nodes: Map<string, LayoutNode>;
  connectors: Connector[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number };
}

/**
 * Helper to get all effective parents (combines parentIds and custom relationships with 'parent' behavior)
 */
export function getEffectiveParentIds(m: FamilyMember): string[] {
  const set = new Set(m.parentIds || []);
  if (m.relationships) {
    for (const r of m.relationships) {
      if (r.behavior === 'parent') set.add(r.targetId);
    }
  }
  return Array.from(set);
}

/**
 * Helper to get all effective spouses (combines spouseIds and custom relationships with 'spouse' behavior)
 */
export function getEffectiveSpouseIds(m: FamilyMember): string[] {
  const set = new Set(m.spouseIds || []);
  if (m.relationships) {
    for (const r of m.relationships) {
      if (r.behavior === 'spouse') set.add(r.targetId);
    }
  }
  return Array.from(set);
}

/**
 * Checks if adding targetAncestorId as an ancestor of personId would create a cycle
 */
export function wouldCreateCycle(
  members: FamilyMember[],
  personId: string,
  proposedParentId: string
): boolean {
  if (personId === proposedParentId) return true;

  const memberMap = new Map<string, FamilyMember>();
  members.forEach(m => memberMap.set(m.id, m));

  const visited = new Set<string>();
  const queue = [proposedParentId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === personId) return true;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentMember = memberMap.get(currentId);
    if (currentMember) {
      const pIds = getEffectiveParentIds(currentMember);
      for (const pId of pIds) {
        if (!visited.has(pId)) {
          queue.push(pId);
        }
      }
    }
  }

  return false;
}

/**
 * Calculates generations for all members ensuring spouses share the same generation
 * and children are placed in parentGen + 1.
 */
/**
 * Calculates generations for all members ensuring:
 * - Roots of disconnected trees start at generation 0 (1-based Gen 1)
 * - Spouses share the same generation
 * - Children are placed at least parentGen + 1
 * - Honors manual member.generation override if valid
 */
function calculateGenerations(members: FamilyMember[]): Map<string, number> {
  const generations = new Map<string, number>();
  const memberMap = new Map<string, FamilyMember>();
  members.forEach(m => memberMap.set(m.id, m));

  // Partition into connected family components so separate trees root independently
  const visited = new Set<string>();
  const components: FamilyMember[][] = [];

  for (const member of members) {
    if (visited.has(member.id)) continue;
    const comp: FamilyMember[] = [];
    const queue = [member.id];
    visited.add(member.id);

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const curr = memberMap.get(currId);
      if (!curr) continue;
      comp.push(curr);

      const neighbors = [
        ...getEffectiveParentIds(curr),
        ...getEffectiveSpouseIds(curr),
        ...members.filter(m => getEffectiveParentIds(m).includes(currId)).map(m => m.id)
      ];

      for (const nId of neighbors) {
        if (!visited.has(nId) && memberMap.has(nId)) {
          visited.add(nId);
          queue.push(nId);
        }
      }
    }
    components.push(comp);
  }

  // Calculate generations per component
  for (const comp of components) {
    comp.forEach(m => {
      const manualGen = typeof m.generation === 'number' && m.generation >= 1 ? m.generation - 1 : 0;
      generations.set(m.id, manualGen);
    });

    let changed = true;
    let iterations = 0;
    const MAX_ITERATIONS = 50;

    while (changed && iterations < MAX_ITERATIONS) {
      changed = false;
      iterations++;

      for (const member of comp) {
        const currentGen = generations.get(member.id) ?? 0;
        const parents = getEffectiveParentIds(member).filter(pId => memberMap.has(pId));

        if (parents.length > 0) {
          let maxParentGen = -Infinity;
          for (const pId of parents) {
            const pGen = generations.get(pId) ?? 0;
            if (pGen > maxParentGen) maxParentGen = pGen;
          }
          if (maxParentGen !== -Infinity && currentGen <= maxParentGen) {
            generations.set(member.id, maxParentGen + 1);
            changed = true;
          }
        }

        const spouses = getEffectiveSpouseIds(member).filter(sId => memberMap.has(sId));
        if (spouses.length > 0) {
          for (const sId of spouses) {
            const sGen = generations.get(sId) ?? 0;
            const updatedGen = generations.get(member.id) ?? 0;
            if (sGen < updatedGen) {
              generations.set(sId, updatedGen);
              changed = true;
            } else if (sGen > updatedGen) {
              generations.set(member.id, sGen);
              changed = true;
            }
          }
        }
      }
    }

    // Normalize component so topmost generation is 0
    let compMinGen = Infinity;
    for (const m of comp) {
      const g = generations.get(m.id) ?? 0;
      if (g < compMinGen) compMinGen = g;
    }
    if (compMinGen !== Infinity && compMinGen > 0) {
      for (const m of comp) {
        generations.set(m.id, (generations.get(m.id) ?? 0) - compMinGen);
      }
    }
  }

  return generations;
}

/**
 * Returns 1-based generation numbers (Generation 1, 2, 3...) for all members.
 */
export function calculateMemberGenerations(members: FamilyMember[]): Map<string, number> {
  const zeroBased = calculateGenerations(members);
  const result = new Map<string, number>();
  zeroBased.forEach((g, id) => {
    result.set(id, g + 1);
  });
  return result;
}

/**
 * Returns minimum allowed generation for a member based on parents.
 */
export function getMinAllowedGeneration(memberId: string, members: FamilyMember[]): number {
  const member = members.find(m => m.id === memberId);
  if (!member) return 1;

  const gens = calculateMemberGenerations(members);
  const parents = getEffectiveParentIds(member);

  let maxParentGen = 0;
  for (const pId of parents) {
    const pGen = gens.get(pId);
    if (pGen && pGen > maxParentGen) {
      maxParentGen = pGen;
    }
  }

  return maxParentGen > 0 ? maxParentGen + 1 : 1;
}

/**
 * Auto-aligns cards of a target generation (or all generations) to the exact same Y-level.
 * Uses 1 to 100 units of vertical gap (1 unit = default gap of 100px).
 */
export function autoAlignGenerations(
  members: FamilyMember[],
  targetGen: number | 'all',
  gapUnits: number = 1,
  orientation: TreeOrientation = 'top-to-bottom'
): FamilyMember[] {
  const memberGenerations = calculateMemberGenerations(members);
  const clampedUnits = Math.max(1, Math.min(100, gapUnits));
  const effectiveGap = VERTICAL_GAP * clampedUnits;

  let maxGen = 1;
  memberGenerations.forEach(g => {
    if (g > maxGen) maxGen = g;
  });

  return members.map(m => {
    const gen = memberGenerations.get(m.id) ?? 1;
    if (targetGen !== 'all' && gen !== targetGen) {
      return m;
    }

    const effectiveGenIndex = orientation === 'top-to-bottom' ? gen - 1 : maxGen - gen;
    const targetY = snapToGrid(effectiveGenIndex * (CARD_HEIGHT + effectiveGap));
    const currentX = m.customPosition ? m.customPosition.x : 0;

    return {
      ...m,
      generation: gen,
      customPosition: {
        x: currentX,
        y: targetY,
      },
    };
  });
}

interface FamilyUnit {
  id: string;
  primary: FamilyMember;
  spouse?: FamilyMember;
  width: number;
  idealX: number;
  x: number;
  generation: number;
  parentKey: string;
}

/**
 * Computes smart node coordinates and SVG connector paths without kilometer gaps or card overlaps
 */
export function calculateTreeLayout(
  members: FamilyMember[],
  orientation: TreeOrientation = 'top-to-bottom',
  connectorStyle: ConnectorStyle = 'curved'
): TreeLayoutResult {
  const result: TreeLayoutResult = {
    nodes: new Map(),
    connectors: [],
    bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
  };

  if (!members || members.length === 0) {
    return result;
  }

  const memberMap = new Map<string, FamilyMember>();
  members.forEach(m => memberMap.set(m.id, m));

  const generations = calculateGenerations(members);
  let maxGen = 0;
  for (const gen of generations.values()) {
    if (gen > maxGen) maxGen = gen;
  }

  // Group members into generations
  const byGen = new Map<number, FamilyMember[]>();
  for (const member of members) {
    const gen = generations.get(member.id) ?? 0;
    if (!byGen.has(gen)) byGen.set(gen, []);
    byGen.get(gen)!.push(member);
  }

  // 1. Group into Family Units (Person + Spouse)
  const processedSpouse = new Set<string>();
  const genUnits = new Map<number, FamilyUnit[]>();

  for (let g = 0; g <= maxGen; g++) {
    const genMembers = byGen.get(g) || [];
    const units: FamilyUnit[] = [];

    for (const m of genMembers) {
      if (processedSpouse.has(m.id)) continue;

      const spouses = getEffectiveSpouseIds(m);
      const partnerId = spouses.find(
        sId => memberMap.has(sId) && !processedSpouse.has(sId) && (generations.get(sId) ?? 0) === g
      );

      const parents = getEffectiveParentIds(m).sort().join('::');

      if (partnerId) {
        const spouse = memberMap.get(partnerId)!;
        units.push({
          id: `${m.id}::${spouse.id}`,
          primary: m,
          spouse,
          width: CARD_WIDTH * 2 + SPOUSE_GAP,
          idealX: 0,
          x: 0,
          generation: g,
          parentKey: parents,
        });
        processedSpouse.add(m.id);
        processedSpouse.add(spouse.id);
      } else {
        units.push({
          id: m.id,
          primary: m,
          width: CARD_WIDTH,
          idealX: 0,
          x: 0,
          generation: g,
          parentKey: parents,
        });
        processedSpouse.add(m.id);
      }
    }
    genUnits.set(g, units);
  }

  // 2. Hierarchical Positioning Pass:
  // Step A: Base horizontal layout per generation with compact ordering
  for (let g = 0; g <= maxGen; g++) {
    const units = genUnits.get(g) || [];
    let curX = 0;
    for (const u of units) {
      u.idealX = curX;
      u.x = curX;
      curX += u.width + HORIZONTAL_GAP;
    }
  }

  // Step B: Top-Down & Bottom-Up Alignment
  // Pass from parents down: align sibling groups under their parents
  for (let g = 1; g <= maxGen; g++) {
    const parentUnits = genUnits.get(g - 1) || [];
    const currentUnits = genUnits.get(g) || [];

    // Map parentKey -> average parent X
    const parentCenterMap = new Map<string, number>();
    for (const pu of parentUnits) {
      const pCenter = pu.x + pu.width / 2;
      parentCenterMap.set(pu.primary.id, pCenter);
      if (pu.spouse) {
        parentCenterMap.set(pu.spouse.id, pCenter);
        const comboKey = [pu.primary.id, pu.spouse.id].sort().join('::');
        parentCenterMap.set(comboKey, pCenter);
      }
    }

    // Sort current generation units by their parent center position
    currentUnits.sort((a, b) => {
      const pCenterA = parentCenterMap.get(a.parentKey) ?? a.idealX;
      const pCenterB = parentCenterMap.get(b.parentKey) ?? b.idealX;
      return pCenterA - pCenterB;
    });

    // Place units keeping them centered near parents without collisions
    let cursorX = 0;
    for (const u of currentUnits) {
      const pCenter = parentCenterMap.get(u.parentKey);
      if (pCenter !== undefined) {
        const desiredX = pCenter - u.width / 2;
        u.x = Math.max(desiredX, cursorX);
      } else {
        u.x = Math.max(u.idealX, cursorX);
      }
      cursorX = u.x + u.width + HORIZONTAL_GAP;
    }
  }

  // Bottom-up adjustment: Center parents over their children's midpoint
  for (let g = maxGen - 1; g >= 0; g--) {
    const parentUnits = genUnits.get(g) || [];
    const childUnits = genUnits.get(g + 1) || [];

    for (const pu of parentUnits) {
      // Find all child units belonging to this parent unit
      const myChildren = childUnits.filter(cu => {
        const pIds = getEffectiveParentIds(cu.primary);
        return pIds.includes(pu.primary.id) || (pu.spouse && pIds.includes(pu.spouse.id));
      });

      if (myChildren.length > 0) {
        const minChild = Math.min(...myChildren.map(c => c.x));
        const maxChild = Math.max(...myChildren.map(c => c.x + c.width));
        const childMid = (minChild + maxChild) / 2;
        pu.idealX = childMid - pu.width / 2;
      }
    }

    // Relax parent units so no overlaps occur
    let cursorX = 0;
    for (const pu of parentUnits) {
      pu.x = Math.max(pu.idealX, cursorX);
      cursorX = pu.x + pu.width + HORIZONTAL_GAP;
    }
  }

  // Normalize minX so tree starts at 0
  let treeMinX = Infinity;
  for (let g = 0; g <= maxGen; g++) {
    for (const u of genUnits.get(g) || []) {
      if (u.x < treeMinX) treeMinX = u.x;
    }
  }
  if (treeMinX === Infinity) treeMinX = 0;

  // 3. Populate final node coordinates (snapped to rigid grid, respecting customPosition)
  for (let g = 0; g <= maxGen; g++) {
    const units = genUnits.get(g) || [];
    for (const unit of units) {
      const normalizedX = snapToGrid(unit.x - treeMinX);
      const effectiveGen = orientation === 'top-to-bottom' ? g : maxGen - g;
      const yPos = snapToGrid(effectiveGen * (CARD_HEIGHT + VERTICAL_GAP));

      result.nodes.set(unit.primary.id, {
        member: unit.primary,
        x: unit.primary.customPosition ? snapToGrid(unit.primary.customPosition.x) : normalizedX,
        y: unit.primary.customPosition ? snapToGrid(unit.primary.customPosition.y) : yPos,
        generation: g,
      });

      if (unit.spouse) {
        const spouseDefaultX = snapToGrid(normalizedX + CARD_WIDTH + SPOUSE_GAP);
        result.nodes.set(unit.spouse.id, {
          member: unit.spouse,
          x: unit.spouse.customPosition ? snapToGrid(unit.spouse.customPosition.x) : spouseDefaultX,
          y: unit.spouse.customPosition ? snapToGrid(unit.spouse.customPosition.y) : yPos,
          generation: g,
        });
      }
    }
  }

  // Safety fallback / standalone members layout with clean horizontal spacing
  const standaloneMembers = members.filter(m => !result.nodes.has(m.id));
  let standaloneIndex = 0;
  let baseStandaloneY = (maxGen + 1) * (CARD_HEIGHT + VERTICAL_GAP) + 50;
  if (baseStandaloneY < 50) baseStandaloneY = 600;

  for (const m of standaloneMembers) {
    const defaultX = snapToGrid(standaloneIndex * (CARD_WIDTH + HORIZONTAL_GAP));
    const defaultY = snapToGrid(baseStandaloneY);
    result.nodes.set(m.id, {
      member: m,
      x: m.customPosition ? snapToGrid(m.customPosition.x) : defaultX,
      y: m.customPosition ? snapToGrid(m.customPosition.y) : defaultY,
      generation: generations.get(m.id) ?? 0,
    });
    standaloneIndex++;
  }

  // 4. Spouse / Marriage connectors
  const handledMarriages = new Set<string>();
  const marriageMidpoints = new Map<string, { x: number; y: number }>();

  for (const m of members) {
    const spouses = getEffectiveSpouseIds(m);
    const node1 = result.nodes.get(m.id);
    if (!node1) continue;

    for (const sId of spouses) {
      const node2 = result.nodes.get(sId);
      if (!node2) continue;

      const marriageKey = [m.id, sId].sort().join('::');
      if (handledMarriages.has(marriageKey)) continue;
      handledMarriages.add(marriageKey);

      const leftNode = node1.x <= node2.x ? node1 : node2;
      const rightNode = node1.x <= node2.x ? node2 : node1;

      const startX = leftNode.x + CARD_WIDTH;
      const startY = leftNode.y + CARD_HEIGHT * 0.45;
      const endX = rightNode.x;
      const endY = rightNode.y + CARD_HEIGHT * 0.45;

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      marriageMidpoints.set(marriageKey, { x: midX, y: midY });

      let spousePath = '';
      if (Math.abs(startY - endY) < 3) {
        spousePath = `M ${startX} ${startY} L ${endX} ${endY}`;
      } else {
        spousePath = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
      }

      result.connectors.push({
        id: `marriage-${marriageKey}`,
        type: 'marriage',
        path: spousePath,
        color: '#94A3B8',
        fromId: leftNode.member.id,
        toId: rightNode.member.id,
      });
    }
  }

  // 5. Parent-to-Child connectors with corner-clearance vertical stems & middle gutter curving
  const isTopDown = orientation === 'top-to-bottom';
  const familyUnitsMap = new Map<string, string[]>();

  for (const m of members) {
    let parents = getEffectiveParentIds(m);
    if (parents.length === 1) {
      const soleParent = members.find(p => p.id === parents[0]);
      if (soleParent) {
        const spouses = getEffectiveSpouseIds(soleParent).filter(sId => result.nodes.has(sId));
        if (spouses.length === 1) {
          parents = [parents[0], spouses[0]];
        }
      }
    }
    if (parents.length > 0) {
      const pKey = [...parents].sort().join('::');
      if (!familyUnitsMap.has(pKey)) familyUnitsMap.set(pKey, []);
      familyUnitsMap.get(pKey)!.push(m.id);
    }
  }

  familyUnitsMap.forEach((childIds, pKey) => {
    const parentIds = pKey.split('::').filter(Boolean);
    const parentNodes = parentIds
      .map(id => result.nodes.get(id))
      .filter((n): n is LayoutNode => n !== undefined);

    if (parentNodes.length === 0) return;

    let originX: number;
    let originY: number;

    const marriagePoint = parentNodes.length >= 2 ? marriageMidpoints.get(pKey) : null;
    if (marriagePoint) {
      originX = marriagePoint.x;
      originY = marriagePoint.y;
    } else {
      const p = parentNodes[0];
      originX = p.x + CARD_WIDTH / 2;
      originY = isTopDown ? p.y + CARD_HEIGHT : p.y;
    }

    const childNodes = childIds
      .map(cId => result.nodes.get(cId))
      .filter((n): n is LayoutNode => n !== undefined);

    if (childNodes.length === 0) return;

    // Lowest bottom of parent cards in top-down (or highest top in bottom-up)
    const parentExitY = isTopDown 
      ? Math.max(...parentNodes.map(p => p.y + CARD_HEIGHT))
      : Math.min(...parentNodes.map(p => p.y));

    // Stays strictly vertical until at least 24px clearance past parent cards
    const clearanceY = isTopDown ? parentExitY + 24 : parentExitY - 24;

    // Connect to each child ensuring curve completes before entering child card
    for (const childNode of childNodes) {
      const targetX = childNode.x + CARD_WIDTH / 2;
      const targetY = isTopDown ? childNode.y : childNode.y + CARD_HEIGHT;
      const childClearanceY = isTopDown ? targetY - 24 : targetY + 24;

      let branchPath = '';

      if (Math.abs(originX - targetX) < 2) {
        // Direct vertical alignment
        branchPath = `M ${originX} ${originY} L ${targetX} ${targetY}`;
      } else if (isTopDown ? childClearanceY > clearanceY : childClearanceY < clearanceY) {
        // Normal gutter between rows: curve strictly in the middle
        const midY = (clearanceY + childClearanceY) / 2;

        if (connectorStyle === 'curved') {
          branchPath = 
            `M ${originX} ${originY} ` +
            `L ${originX} ${clearanceY} ` +
            `C ${originX} ${midY}, ${targetX} ${midY}, ${targetX} ${childClearanceY} ` +
            `L ${targetX} ${targetY}`;
        } else {
          const dirY = isTopDown ? 1 : -1;
          const dirX = targetX > originX ? 1 : -1;
          const maxR = 20;
          const r = Math.min(
            maxR,
            Math.abs(targetX - originX) / 2,
            Math.abs(childClearanceY - clearanceY) / 2
          );

          branchPath = 
            `M ${originX} ${originY} ` +
            `L ${originX} ${midY - dirY * r} ` +
            `Q ${originX} ${midY} ${originX + dirX * r} ${midY} ` +
            `L ${targetX - dirX * r} ${midY} ` +
            `Q ${targetX} ${midY} ${targetX} ${midY + dirY * r} ` +
            `L ${targetX} ${targetY}`;
        }
      } else {
        // Tight vertical clearance or custom dragged node
        const midY = (originY + targetY) / 2;
        branchPath = `M ${originX} ${originY} C ${originX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;
      }

      result.connectors.push({
        id: `branch-${pKey}-${childNode.member.id}`,
        type: 'parent-child',
        path: branchPath,
        color: childNode.member.color || '#64748B',
        fromId: parentNodes[0].member.id,
        toId: childNode.member.id,
        dashed: childNode.member.adoptionStatus === 'adopted',
      });
    }
  });

  // 6. Calculate total bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of result.nodes.values()) {
    if (node.x < minX) minX = node.x;
    if (node.x + CARD_WIDTH > maxX) maxX = node.x + CARD_WIDTH;
    if (node.y < minY) minY = node.y;
    if (node.y + CARD_HEIGHT > maxY) maxY = node.y + CARD_HEIGHT;
  }

  if (minX === Infinity) {
    minX = 0; maxX = 800; minY = 0; maxY = 600;
  }

  result.bounds = {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };

  return result;
}

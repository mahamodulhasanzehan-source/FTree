import { FamilyMember, TreeOrientation } from '../types';
import { getEffectiveParentIds, CARD_WIDTH, CARD_HEIGHT } from './treeLayout';

export const MIN_GAP_X = 28;
export const MIN_GAP_Y = 84;
export const MIN_DIST_X = CARD_WIDTH + MIN_GAP_X;
export const MIN_DIST_Y = CARD_HEIGHT + MIN_GAP_Y;

export interface ParentChildPair {
  parentId: string;
  childId: string;
}

export function getDirectParentChildPairs(members: FamilyMember[]): ParentChildPair[] {
  const pairs: ParentChildPair[] = [];
  const memberMap = new Map<string, FamilyMember>();
  members.forEach(m => memberMap.set(m.id, m));

  for (const m of members) {
    const parentIds = getEffectiveParentIds(m);
    for (const pId of parentIds) {
      if (memberMap.has(pId)) {
        pairs.push({ parentId: pId, childId: m.id });
      }
    }
    if (m.relationships) {
      for (const r of m.relationships) {
        if (r.behavior === 'child' && memberMap.has(r.targetId)) {
          pairs.push({ parentId: m.id, childId: r.targetId });
        }
      }
    }
  }
  return pairs;
}

export function isMoveValid(
  dx: number,
  dy: number,
  draggedIds: string[],
  initialPositions: Map<string, { x: number; y: number }>,
  stationaryNodes: Array<{ id: string; x: number; y: number }>,
  members: FamilyMember[],
  orientation: TreeOrientation
): boolean {
  const proposedPositions = new Map<string, { x: number; y: number }>();
  
  for (const stat of stationaryNodes) {
    proposedPositions.set(stat.id, { x: stat.x, y: stat.y });
  }
  for (const id of draggedIds) {
    const init = initialPositions.get(id);
    if (init) {
      proposedPositions.set(id, { x: init.x + dx, y: init.y + dy });
    }
  }

  // 1. Gap collision check
  const allIds = Array.from(proposedPositions.keys());
  for (let i = 0; i < allIds.length; i++) {
    for (let j = i + 1; j < allIds.length; j++) {
      const posA = proposedPositions.get(allIds[i])!;
      const posB = proposedPositions.get(allIds[j])!;
      const distX = Math.abs(posA.x - posB.x);
      const distY = Math.abs(posA.y - posB.y);
      if (distX < MIN_DIST_X && distY < MIN_DIST_Y) {
        return false;
      }
    }
  }

  // 2. Parent-child Y-level hierarchy rule check
  const isTopDown = orientation === 'top-to-bottom';
  const pairs = getDirectParentChildPairs(members);

  for (const pair of pairs) {
    const pPos = proposedPositions.get(pair.parentId);
    const cPos = proposedPositions.get(pair.childId);
    if (pPos && cPos) {
      if (isTopDown) {
        // Parent cannot be below child (parent.y must be <= child.y)
        if (pPos.y > cPos.y) {
          return false;
        }
      } else {
        // Bottom-to-top: parent cannot be above child (parent.y must be >= child.y)
        if (pPos.y < cPos.y) {
          return false;
        }
      }
    }
  }

  return true;
}

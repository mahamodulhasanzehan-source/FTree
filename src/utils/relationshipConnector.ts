import { FamilyMember, MemberRelationship, Connector } from '../types';
import { wouldCreateCycle } from './treeLayout';

export type BulbPosition = 'top' | 'bottom' | 'left' | 'right';

export interface BulbCoordinates {
  x: number;
  y: number;
}

export function isBulbCompatible(
  sourceBulb: BulbPosition,
  targetBulb: BulbPosition,
  sourceMemberId: string,
  targetMemberId: string
): boolean {
  if (sourceMemberId === targetMemberId) return false;

  // Horizontal linking (Spouse / Partner): left <-> right
  if ((sourceBulb === 'left' && targetBulb === 'right') || (sourceBulb === 'right' && targetBulb === 'left')) {
    return true;
  }

  // Vertical linking (Parent / Child): top <-> bottom
  if ((sourceBulb === 'top' && targetBulb === 'bottom') || (sourceBulb === 'bottom' && targetBulb === 'top')) {
    return true;
  }

  return false;
}

export function getBulbCanvasCoords(
  nodeX: number,
  nodeY: number,
  bulb: BulbPosition
): BulbCoordinates {
  switch (bulb) {
    case 'top':
      return { x: nodeX + 95, y: nodeY };
    case 'bottom':
      return { x: nodeX + 95, y: nodeY + 250 };
    case 'left':
      return { x: nodeX, y: nodeY + 125 };
    case 'right':
      return { x: nodeX + 190, y: nodeY + 125 };
  }
}

export interface ConnectBulbResult {
  updatedMembers: FamilyMember[];
  error?: string;
  successMessage?: string;
}

/**
 * Creates relationships when connecting two card bulbs
 */
export function connectMembersByBulbs(
  members: FamilyMember[],
  sourceMemberId: string,
  sourceBulb: BulbPosition,
  targetMemberId: string,
  targetBulb: BulbPosition
): ConnectBulbResult {
  if (!isBulbCompatible(sourceBulb, targetBulb, sourceMemberId, targetMemberId)) {
    return {
      updatedMembers: members,
      error: 'Incompatible connection points: connect left-to-right (partners) or top-to-bottom (parent/child).',
    };
  }

  const sourceMember = members.find(m => m.id === sourceMemberId);
  const targetMember = members.find(m => m.id === targetMemberId);
  if (!sourceMember || !targetMember) {
    return { updatedMembers: members, error: 'Member not found.' };
  }

  // 1. Horizontal connection -> Spouse / Partner
  if (
    (sourceBulb === 'left' && targetBulb === 'right') ||
    (sourceBulb === 'right' && targetBulb === 'left')
  ) {
    const isAlreadySpouse =
      (sourceMember.spouseIds || []).includes(targetMemberId) ||
      (targetMember.spouseIds || []).includes(sourceMemberId);

    if (isAlreadySpouse) {
      return { updatedMembers: members, successMessage: 'Already linked as partners.' };
    }

    const updated = members.map(m => {
      if (m.id === sourceMemberId) {
        const sIds = m.spouseIds || [];
        const rels = m.relationships || [];
        const newRel: MemberRelationship = {
          id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          targetId: targetMemberId,
          typeId: 'spouse',
          customLabel: 'Spouse / Partner',
          behavior: 'spouse',
        };
        return {
          ...m,
          spouseIds: sIds.includes(targetMemberId) ? sIds : [...sIds, targetMemberId],
          relationships: [...rels, newRel],
        };
      }
      if (m.id === targetMemberId) {
        const sIds = m.spouseIds || [];
        const rels = m.relationships || [];
        const newRel: MemberRelationship = {
          id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          targetId: sourceMemberId,
          typeId: 'spouse',
          customLabel: 'Spouse / Partner',
          behavior: 'spouse',
        };
        return {
          ...m,
          spouseIds: sIds.includes(sourceMemberId) ? sIds : [...sIds, sourceMemberId],
          relationships: [...rels, newRel],
        };
      }
      return m;
    });

    // Auto-associate existing children if this is the first spouse added
    const fullySynced = syncSpouseChildrenOnSpouseAdded(updated, sourceMemberId, targetMemberId);

    return {
      updatedMembers: fullySynced,
      successMessage: `Linked ${sourceMember.firstName || 'Member'} and ${targetMember.firstName || 'Member'} as partners.`,
    };
  }

  // 2. Vertical connection -> Parent / Child
  // top bulb on a card means it connects upward to a parent (this card is the child)
  // bottom bulb on a card means it connects downward to a child (this card is the parent)
  let parentId: string;
  let childId: string;

  if (sourceBulb === 'top' && targetBulb === 'bottom') {
    childId = sourceMemberId;
    parentId = targetMemberId;
  } else {
    childId = targetMemberId;
    parentId = sourceMemberId;
  }

  // Check cycles
  if (wouldCreateCycle(members, childId, parentId)) {
    return {
      updatedMembers: members,
      error: 'Cannot link parent: this creates a circular lineage loop.',
    };
  }

  const child = members.find(m => m.id === childId)!;
  const parent = members.find(m => m.id === parentId)!;

  // Smart dual-parent auto-link:
  // If parent is linked sideways to a spouse, and child connects to the bottom of the parent,
  // or if two cards linked to each other connect to child's top, add both parents!
  const parentSpouseIds = parent.spouseIds || [];
  const coParentsToAdd = new Set<string>([parentId]);

  for (const spouseId of parentSpouseIds) {
    const spouse = members.find(m => m.id === spouseId);
    if (spouse) {
      // Check if child already has this spouse as parent, or if spouse is married to parent
      coParentsToAdd.add(spouseId);
    }
  }

  // Limit parents to maximum 2
  const currentChildParents = new Set(child.parentIds || []);
  coParentsToAdd.forEach(pId => {
    if (currentChildParents.size < 2) {
      currentChildParents.add(pId);
    }
  });

  const finalParentIds = Array.from(currentChildParents);

  const updated = members.map(m => {
    if (m.id === childId) {
      const rels = [...(m.relationships || [])];
      for (const pId of finalParentIds) {
        if (!rels.some(r => r.targetId === pId && r.behavior === 'parent')) {
          rels.push({
            id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            targetId: pId,
            typeId: 'parent',
            customLabel: 'Parent',
            behavior: 'parent',
          });
        }
      }
      return {
        ...m,
        parentIds: finalParentIds,
        relationships: rels,
      };
    }

    if (finalParentIds.includes(m.id)) {
      const rels = [...(m.relationships || [])];
      if (!rels.some(r => r.targetId === childId && r.behavior === 'child')) {
        rels.push({
          id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          targetId: childId,
          typeId: 'child',
          customLabel: 'Child',
          behavior: 'child',
        });
      }
      return {
        ...m,
        relationships: rels,
      };
    }

    return m;
  });

  const parentNames = finalParentIds
    .map(id => members.find(m => m.id === id)?.firstName)
    .filter(Boolean)
    .join(' & ');

  return {
    updatedMembers: updated,
    successMessage: `Linked ${parentNames} as parent(s) of ${child.firstName}.`,
  };
}

export function deleteRelationshipByConnector(
  members: FamilyMember[],
  connector: Connector
): FamilyMember[] {
  if (connector.type === 'marriage' && connector.toId) {
    const idA = connector.fromId;
    const idB = connector.toId;
    return members.map(m => {
      if (m.id === idA || m.id === idB) {
        const otherId = m.id === idA ? idB : idA;
        return {
          ...m,
          spouseIds: (m.spouseIds || []).filter(id => id !== otherId),
          relationships: (m.relationships || []).filter(r => r.targetId !== otherId),
        };
      }
      return m;
    });
  } else if (connector.type === 'parent-child' && connector.toId) {
    const parentId = connector.fromId;
    const childId = connector.toId;
    return members.map(m => {
      if (m.id === childId) {
        return {
          ...m,
          parentIds: (m.parentIds || []).filter(id => id !== parentId),
          relationships: (m.relationships || []).filter(r => r.targetId !== parentId),
        };
      }
      if (m.id === parentId) {
        return {
          ...m,
          relationships: (m.relationships || []).filter(r => r.targetId !== childId),
        };
      }
      return m;
    });
  }
  return members;
}

/**
 * Automatically associates existing single-parent children with their new step-parent / co-parent
 * when a member links their first spouse. Extra subsequent spouses (2nd, 3rd) do not auto-reassign.
 */
export function syncSpouseChildrenOnSpouseAdded(
  members: FamilyMember[],
  personAId: string,
  personBId: string
): FamilyMember[] {
  const personA = members.find(m => m.id === personAId);
  const personB = members.find(m => m.id === personBId);
  if (!personA || !personB) return members;

  const priorSpousesA = (personA.spouseIds || []).filter(id => id !== personBId);
  const isFirstSpouseForA = priorSpousesA.length === 0;

  const priorSpousesB = (personB.spouseIds || []).filter(id => id !== personAId);
  const isFirstSpouseForB = priorSpousesB.length === 0;

  return members.map(m => {
    const isChildOfA = (m.parentIds || []).includes(personAId) ||
      (m.relationships || []).some(r => r.behavior === 'parent' && r.targetId === personAId);
    const isChildOfB = (m.parentIds || []).includes(personBId) ||
      (m.relationships || []).some(r => r.behavior === 'parent' && r.targetId === personBId);

    let parentIds = [...(m.parentIds || [])];

    // If personA had children before having any spouse, and personB is their first spouse:
    if (isFirstSpouseForA && isChildOfA && !isChildOfB) {
      if (parentIds.length < 2 && !parentIds.includes(personBId)) {
        parentIds.push(personBId);
      }
    }

    // If personB had children before having any spouse, and personA is their first spouse:
    if (isFirstSpouseForB && isChildOfB && !isChildOfA) {
      if (parentIds.length < 2 && !parentIds.includes(personAId)) {
        parentIds.push(personAId);
      }
    }

    if (parentIds.length !== (m.parentIds || []).length) {
      return { ...m, parentIds };
    }
    return m;
  });
}


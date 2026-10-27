import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sparkles,
  Image as ImageIcon,
  RotateCcw,
  MousePointer,
  Grid3X3
} from 'lucide-react';
import { FamilyMember, TreeSettings, CanvasTransform } from '../types';
import { 
  calculateTreeLayout, 
  CARD_WIDTH, 
  CARD_HEIGHT, 
  SPOUSE_GAP, 
  GRID_SIZE, 
  snapToGrid 
} from '../utils/treeLayout';
import { MemberCard } from './MemberCard';
import { ContextMenu } from './ContextMenu';
import { CardContextMenu } from './CardContextMenu';
import { CardConnectionBulbs } from './CardConnectionBulbs';
import { ConnectionDragPreview } from './ConnectionDragPreview';
import { 
  BulbPosition, 
  getBulbCanvasCoords, 
  isBulbCompatible, 
  connectMembersByBulbs,
  deleteRelationshipByConnector
} from '../utils/relationshipConnector';
import { isMoveValid } from '../utils/hierarchyValidator';
import { ConnectorContextMenu } from './ConnectorContextMenu';
import { Connector } from '../types';

const MIN_GAP_X = 28; // Spouse gap (28px)
const MIN_GAP_Y = 84; // 3x spouse gap (84px)
const MIN_DIST_X = CARD_WIDTH + MIN_GAP_X; // 218px
const MIN_DIST_Y = CARD_HEIGHT + MIN_GAP_Y; // 334px

interface TreeCanvasProps {
  members: FamilyMember[];
  settings: TreeSettings;
  selectedMemberId: string | null;
  onSelectMember: (member: FamilyMember) => void;
  onAddNewMember: (position?: { x: number; y: number }) => void;
  onExportHighResImage?: () => void;
  onAddParentToMember?: (targetMember: FamilyMember) => void;
  onAddSpouseToMember?: (targetMember: FamilyMember) => void;
  onAddChildToMember?: (targetMember: FamilyMember) => void;
  onDeleteMember?: (memberId: string) => void;
  onUpdateMemberPositions?: (positions: Map<string, { x: number; y: number }>) => void;
  onResetLayoutPositions?: () => void;
  onUpdateMembers?: (members: FamilyMember[]) => void;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasContentRef: React.RefObject<HTMLDivElement | null>;
}

interface DragState {
  isDragging: boolean;
  anchorId: string;
  startX: number;
  startY: number;
  lastDeltaX: number;
  lastDeltaY: number;
  draggedIds: string[];
  initialPositions: Map<string, { x: number; y: number }>;
  stationaryNodes: Array<{ id: string; x: number; y: number }>;
}

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  members,
  settings,
  selectedMemberId,
  onSelectMember,
  onAddNewMember,
  onExportHighResImage,
  onAddParentToMember,
  onAddSpouseToMember,
  onAddChildToMember,
  onDeleteMember,
  onUpdateMemberPositions,
  onResetLayoutPositions,
  onUpdateMembers,
  canvasContainerRef,
  canvasContentRef,
}) => {
  const [transform, setTransform] = useState<CanvasTransform>({ x: 120, y: 80, scale: 0.95 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 });

  // Hovered card ID for showing connection bulbs on card hover
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Active bulb relationship dragging state
  const [connectionDrag, setConnectionDrag] = useState<{
    sourceMemberId: string;
    sourceBulb: BulbPosition;
    sourcePos: { x: number; y: number };
    currentPos: { x: number; y: number };
  } | null>(null);

  const [hoveredTargetBulb, setHoveredTargetBulb] = useState<{
    memberId: string;
    bulb: BulbPosition;
    isValid: boolean;
  } | null>(null);

  const [connectionToast, setConnectionToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Multi-card selection state
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(() => {
    return selectedMemberId ? new Set([selectedMemberId]) : new Set();
  });

  // Dragging state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [liveDragOffsets, setLiveDragOffsets] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Marquee selection box state
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);

  // Board Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number; isOpen: boolean }>({
    x: 0,
    y: 0,
    canvasX: 0,
    canvasY: 0,
    isOpen: false,
  });

  // Card-specific Context Menu state
  const [cardContextMenu, setCardContextMenu] = useState<{
    x: number;
    y: number;
    member: FamilyMember | null;
    isOpen: boolean;
  }>({
    x: 0,
    y: 0,
    member: null,
    isOpen: false,
  });

  // Connector-specific Context Menu state
  const [connectorContextMenu, setConnectorContextMenu] = useState<{
    x: number;
    y: number;
    connector: Connector | null;
    isOpen: boolean;
  }>({
    x: 0,
    y: 0,
    connector: null,
    isOpen: false,
  });

  // Sync selectedMemberId prop from outside
  useEffect(() => {
    if (selectedMemberId) {
      setSelectedMemberIds(prev => {
        if (prev.has(selectedMemberId) && prev.size > 1) return prev;
        return new Set([selectedMemberId]);
      });
    }
  }, [selectedMemberId]);

  // Compute effective members merged with live drag offsets
  const effectiveMembers = useMemo(() => {
    if (liveDragOffsets.size === 0) return members;
    return members.map(m => {
      const livePos = liveDragOffsets.get(m.id);
      if (livePos) {
        return {
          ...m,
          customPosition: livePos,
        };
      }
      return m;
    });
  }, [members, liveDragOffsets]);

  const layout = useMemo(() => {
    return calculateTreeLayout(effectiveMembers, settings.orientation, settings.connectorStyle);
  }, [effectiveMembers, settings.orientation, settings.connectorStyle]);

  const centerView = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const { width: cWidth, height: cHeight } = container.getBoundingClientRect();

    if (members.length === 0) {
      setTransform({ x: cWidth / 2 - 100, y: cHeight / 2 - 130, scale: 1 });
      return;
    }

    const bounds = layout.bounds;
    const treeW = Math.max(bounds.width, 300);
    const treeH = Math.max(bounds.height, 300);

    const scaleX = (cWidth - 140) / treeW;
    const scaleY = (cHeight - 160) / treeH;
    const targetScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.05);

    const targetX = (cWidth - treeW * targetScale) / 2 - bounds.minX * targetScale;
    const targetY = (cHeight - treeH * targetScale) / 2 - bounds.minY * targetScale + 20;

    setTransform({
      x: targetX,
      y: targetY,
      scale: targetScale,
    });
  }, [layout.bounds, members.length, canvasContainerRef]);

  useEffect(() => {
    centerView();
  }, []);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasContainerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform(prev => {
      const nextScale = Math.min(Math.max(prev.scale * zoomFactor, 0.01), 3.5);
      if (nextScale === prev.scale) return prev;

      const newX = mouseX - (mouseX - prev.x) * (nextScale / prev.scale);
      const newY = mouseY - (mouseY - prev.y) * (nextScale / prev.scale);

      return {
        x: newX,
        y: newY,
        scale: nextScale,
      };
    });
  };

  // Convert client viewport coordinates to canvas tree coordinate space
  const screenToCanvasCoords = useCallback((clientX: number, clientY: number) => {
    return {
      x: (clientX - transform.x) / transform.scale,
      y: (clientY - transform.y) / transform.scale,
    };
  }, [transform]);

  // Canvas Mouse Down: handles Marquee selection (Ctrl/Meta) or Panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) return; // Right-click handled in context menu

    const target = e.target as HTMLElement;
    if (target.closest('.group') || target.closest('button') || target.closest('aside')) {
      return;
    }

    setContextMenu(prev => ({ ...prev, isOpen: false }));
    setCardContextMenu(prev => ({ ...prev, isOpen: false }));

    const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);

    // If Ctrl or Meta held on empty canvas -> Marquee selection box
    if (e.ctrlKey || e.metaKey) {
      setMarquee({
        startX: canvasCoords.x,
        startY: canvasCoords.y,
        currentX: canvasCoords.x,
        currentY: canvasCoords.y,
      });
      return;
    }

    // Normal empty canvas click: Clear selection and initiate panning
    setSelectedMemberIds(new Set());
    setIsPanning(true);
    setStartPanPos({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  // Card Mouse Down: initiates multi-card or single-card drag with strict gap collision
  const handleCardMouseDown = (e: React.MouseEvent, member: FamilyMember) => {
    if (e.button !== 0 || connectionDrag !== null) return; // Left mouse button only and not dragging connection

    // If Ctrl/Meta is pressed, don't drag; let handleCardSelect toggle membership
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    e.stopPropagation();

    // Determine dragged cards group:
    // If the card is already in the selected set, drag all selected cards together.
    // If the card is not selected, select it as the single dragged card.
    let targetIds: string[];
    if (selectedMemberIds.has(member.id) && selectedMemberIds.size > 0) {
      targetIds = Array.from(selectedMemberIds);
    } else {
      targetIds = [member.id];
      setSelectedMemberIds(new Set([member.id]));
      onSelectMember(member);
    }

    const initialPositions = new Map<string, { x: number; y: number }>();
    const stationaryNodes: Array<{ id: string; x: number; y: number }> = [];

    layout.nodes.forEach((node, id) => {
      if (targetIds.includes(id)) {
        initialPositions.set(id, { x: node.x, y: node.y });
      } else {
        stationaryNodes.push({ id, x: node.x, y: node.y });
      }
    });

    const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);

    setDragState({
      isDragging: true,
      anchorId: member.id,
      startX: canvasCoords.x,
      startY: canvasCoords.y,
      lastDeltaX: 0,
      lastDeltaY: 0,
      draggedIds: targetIds,
      initialPositions,
      stationaryNodes,
    });
  };

  // Card Select Click
  const handleCardSelect = (member: FamilyMember, e: React.MouseEvent) => {
    if (connectionDrag !== null) return;

    if (e.ctrlKey || e.metaKey) {
      // Toggle individual selection in multi-select group
      setSelectedMemberIds(prev => {
        const next = new Set(prev);
        if (next.has(member.id)) {
          next.delete(member.id);
          if (selectedMemberId === member.id) {
            const firstRemaining = next.values().next().value;
            if (firstRemaining) {
              const m = members.find(item => item.id === firstRemaining);
              if (m) onSelectMember(m);
            }
          }
        } else {
          next.add(member.id);
          onSelectMember(member);
        }
        return next;
      });
    } else {
      // Normal single selection
      setSelectedMemberIds(new Set([member.id]));
      onSelectMember(member);
    }
  };

  // Relationship Bulb Dragging Handlers
  const handleBulbStartDrag = (memberId: string, bulb: BulbPosition, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const node = layout.nodes.get(memberId);
    if (!node) return;

    const sourcePos = getBulbCanvasCoords(node.x, node.y, bulb);
    setConnectionDrag({
      sourceMemberId: memberId,
      sourceBulb: bulb,
      sourcePos,
      currentPos: sourcePos,
    });
    setHoveredTargetBulb(null);
  };

  const handleBulbHover = (targetMemberId: string, targetBulb: BulbPosition) => {
    if (!connectionDrag) return;
    const isValid = isBulbCompatible(
      connectionDrag.sourceBulb,
      targetBulb,
      connectionDrag.sourceMemberId,
      targetMemberId
    );
    setHoveredTargetBulb({
      memberId: targetMemberId,
      bulb: targetBulb,
      isValid,
    });

    if (isValid) {
      const targetNode = layout.nodes.get(targetMemberId);
      if (targetNode) {
        const targetPos = getBulbCanvasCoords(targetNode.x, targetNode.y, targetBulb);
        setConnectionDrag(prev => (prev ? { ...prev, currentPos: targetPos } : null));
      }
    }
  };

  const handleBulbUnhover = () => {
    setHoveredTargetBulb(null);
  };

  const handleBulbDrop = (targetMemberId: string, targetBulb: BulbPosition) => {
    if (!connectionDrag) return;

    if (isBulbCompatible(connectionDrag.sourceBulb, targetBulb, connectionDrag.sourceMemberId, targetMemberId)) {
      const result = connectMembersByBulbs(
        members,
        connectionDrag.sourceMemberId,
        connectionDrag.sourceBulb,
        targetMemberId,
        targetBulb
      );

      if (result.error) {
        setConnectionToast({ message: result.error, type: 'error' });
        setTimeout(() => setConnectionToast(null), 3500);
      } else if (result.successMessage) {
        if (onUpdateMembers) {
          onUpdateMembers(result.updatedMembers);
        }
        setConnectionToast({ message: result.successMessage, type: 'success' });
        setTimeout(() => setConnectionToast(null), 3500);
      }
    } else {
      setConnectionToast({
        message: 'Incompatible connection points: connect left-to-right (partners) or top-to-bottom (parent/child).',
        type: 'error',
      });
      setTimeout(() => setConnectionToast(null), 3500);
    }

    setConnectionDrag(null);
    setHoveredTargetBulb(null);
  };


  const handleMouseMove = useCallback((e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
    // 0. Active relationship connection drag from card bulb
    if (connectionDrag) {
      const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);
      if (hoveredTargetBulb && hoveredTargetBulb.isValid) {
        const targetNode = layout.nodes.get(hoveredTargetBulb.memberId);
        if (targetNode) {
          const targetCoords = getBulbCanvasCoords(targetNode.x, targetNode.y, hoveredTargetBulb.bulb);
          setConnectionDrag(prev => (prev ? { ...prev, currentPos: targetCoords } : null));
          return;
        }
      }
      setConnectionDrag(prev => (prev ? { ...prev, currentPos: canvasCoords } : null));
      return;
    }

    // 1. Panning canvas
    if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - startPanPos.x,
        y: e.clientY - startPanPos.y,
      }));
      return;
    }

    const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);

    // 2. Marquee selection drag
    if (marquee) {
      const curX = canvasCoords.x;
      const curY = canvasCoords.y;
      setMarquee(prev => (prev ? { ...prev, currentX: curX, currentY: curY } : null));

      // Calculate marquee bounding box
      const minX = Math.min(marquee.startX, curX);
      const maxX = Math.max(marquee.startX, curX);
      const minY = Math.min(marquee.startY, curY);
      const maxY = Math.max(marquee.startY, curY);

      // Check intersecting cards
      const newSelected = new Set<string>();
      layout.nodes.forEach((node, id) => {
        const cardRight = node.x + CARD_WIDTH;
        const cardBottom = node.y + CARD_HEIGHT;
        const intersects = !(node.x > maxX || cardRight < minX || node.y > maxY || cardBottom < minY);
        if (intersects) {
          newSelected.add(id);
        }
      });

      setSelectedMemberIds(newSelected);
      return;
    }

    // 3. Card dragging with rigid grid snap & strict collision enforcement
    if (dragState && dragState.isDragging) {
      const rawDx = canvasCoords.x - dragState.startX;
      const rawDy = canvasCoords.y - dragState.startY;

      const anchorInit = dragState.initialPositions.get(dragState.anchorId) || { x: 0, y: 0 };

      // Snap the destination coordinates directly to the rigid grid (GRID_SIZE = 24px)
      const snappedTargetX = snapToGrid(anchorInit.x + rawDx, GRID_SIZE);
      const snappedTargetY = snapToGrid(anchorInit.y + rawDy, GRID_SIZE);

      const desiredDx = snappedTargetX - anchorInit.x;
      const desiredDy = snappedTargetY - anchorInit.y;

      let appliedDx = dragState.lastDeltaX;
      let appliedDy = dragState.lastDeltaY;

      // Try full grid movement
      if (isMoveValid(desiredDx, desiredDy, dragState.draggedIds, dragState.initialPositions, dragState.stationaryNodes, members, settings.orientation)) {
        appliedDx = desiredDx;
        appliedDy = desiredDy;
      } else {
        // Try sliding horizontally on the grid
        if (isMoveValid(desiredDx, appliedDy, dragState.draggedIds, dragState.initialPositions, dragState.stationaryNodes, members, settings.orientation)) {
          appliedDx = desiredDx;
        }
        // Try sliding vertically on the grid
        if (isMoveValid(appliedDx, desiredDy, dragState.draggedIds, dragState.initialPositions, dragState.stationaryNodes, members, settings.orientation)) {
          appliedDy = desiredDy;
        }
      }

      if (appliedDx !== dragState.lastDeltaX || appliedDy !== dragState.lastDeltaY) {
        setDragState(prev => prev ? { ...prev, lastDeltaX: appliedDx, lastDeltaY: appliedDy } : null);

        // Apply live transient coordinates strictly snapped to the rigid grid
        const newOffsets = new Map<string, { x: number; y: number }>();
        dragState.draggedIds.forEach(id => {
          const init = dragState.initialPositions.get(id);
          if (init) {
            newOffsets.set(id, {
              x: snapToGrid(init.x + appliedDx, GRID_SIZE),
              y: snapToGrid(init.y + appliedDy, GRID_SIZE),
            });
          }
        });
        setLiveDragOffsets(newOffsets);
      }
    }
  }, [connectionDrag, hoveredTargetBulb, isPanning, startPanPos, marquee, dragState, members, settings.orientation, layout.nodes, screenToCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    if (connectionDrag) {
      if (hoveredTargetBulb && hoveredTargetBulb.isValid) {
        handleBulbDrop(hoveredTargetBulb.memberId, hoveredTargetBulb.bulb);
      } else {
        setConnectionDrag(null);
        setHoveredTargetBulb(null);
      }
      return;
    }

    setIsPanning(false);

    if (marquee) {
      setMarquee(null);
    }

    if (dragState) {
      const moved = Math.hypot(dragState.lastDeltaX, dragState.lastDeltaY) > 3;
      if (moved && onUpdateMemberPositions && liveDragOffsets.size > 0) {
        onUpdateMemberPositions(new Map(liveDragOffsets));
      }
      setDragState(null);
      setLiveDragOffsets(new Map());
    }
  }, [connectionDrag, hoveredTargetBulb, marquee, dragState, liveDragOffsets, onUpdateMemberPositions, handleBulbDrop]);

  // Global window listeners to ensure drag/pan never gets stuck or lost outside container
  useEffect(() => {
    if (!dragState && !isPanning && !connectionDrag && !marquee) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
    };

    const onWindowMouseUp = () => {
      handleMouseUp();
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [dragState, isPanning, connectionDrag, marquee, handleMouseMove, handleMouseUp]);

  // Right-click on MemberCard
  const handleCardContextMenu = (e: React.MouseEvent, m: FamilyMember) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(prev => ({ ...prev, isOpen: false }));
    setConnectorContextMenu(prev => ({ ...prev, isOpen: false }));
    setCardContextMenu({
      x: e.clientX,
      y: e.clientY,
      member: m,
      isOpen: true,
    });
  };

  // Right-click on empty canvas board
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (target.closest('aside') || target.closest('.group') || target.closest('button')) {
      return;
    }

    const coords = screenToCanvasCoords(e.clientX, e.clientY);

    setCardContextMenu(prev => ({ ...prev, isOpen: false }));
    setConnectorContextMenu(prev => ({ ...prev, isOpen: false }));
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasX: coords.x,
      canvasY: coords.y,
      isOpen: true,
    });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.2 : 0.8;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * factor, 0.01), 3.5),
    }));
  };

  return (
    <div 
      ref={canvasContainerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.20) 1.2px, transparent 1.2px)',
        backgroundSize: `${GRID_SIZE * transform.scale}px ${GRID_SIZE * transform.scale}px`,
        backgroundPosition: `${transform.x}px ${transform.y}px`,
      }}
      className={`relative w-full h-full overflow-hidden bg-slate-950 ${
        isPanning ? 'cursor-grabbing' : dragState ? 'cursor-move' : 'cursor-default'
      }`}
    >
      {/* Zoomable / Pannable Root Layer (unbounded infinite canvas) */}
      <div
        ref={canvasContentRef}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '12000px',
          height: '12000px',
        }}
        className="pointer-events-none"
      >
        {/* Dynamic SVG Connectors Layer (Thick, rounded, corner-clearing branches) */}
        <svg 
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-auto"
          style={{ zIndex: 1 }}
        >
          {layout.connectors.map(conn => {
            const isMarriage = conn.type === 'marriage';
            const baseThickness = settings.lineThickness ?? 5.5;
            const strokeWidth = isMarriage ? Math.max(1, baseThickness - 0.5) : baseThickness;
            const shadowWidth = strokeWidth + 3;
            const hitAreaWidth = Math.max(18, strokeWidth + 14);

            return (
              <g 
                key={conn.id}
                className="cursor-pointer group/conn"
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu(prev => ({ ...prev, isOpen: false }));
                  setCardContextMenu(prev => ({ ...prev, isOpen: false }));
                  setConnectorContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    connector: conn,
                    isOpen: true,
                  });
                }}
              >
                {/* Invisible wider hit area for easy hovering & right-click */}
                <path
                  d={conn.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={hitAreaWidth}
                />
                {/* Background Shadow Outline (thicker for crisp contrast) */}
                <path
                  d={conn.path}
                  fill="none"
                  stroke="#020617"
                  strokeWidth={shadowWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                  style={{
                    transition: isPanning || dragState
                      ? 'none'
                      : 'all 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
                {/* Foreground Branch Line with hover highlight effect */}
                <path
                  d={conn.path}
                  fill="none"
                  stroke={conn.color || '#94A3B8'}
                  strokeWidth={strokeWidth}
                  strokeDasharray={conn.dashed ? '8,5' : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-150 group-hover/conn:stroke-indigo-400 group-hover/conn:drop-shadow-[0_0_8px_rgba(99,102,241,0.7)]"
                  style={{
                    transition: isPanning || dragState
                      ? 'none'
                      : 'all 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </g>
            );
          })}

          {/* Active Relationship Bulb Drag Line Preview */}
          {connectionDrag && (
            <ConnectionDragPreview
              startX={connectionDrag.sourcePos.x}
              startY={connectionDrag.sourcePos.y}
              currentX={connectionDrag.currentPos.x}
              currentY={connectionDrag.currentPos.y}
              sourceBulb={connectionDrag.sourceBulb}
              isValidTargetHovered={Boolean(hoveredTargetBulb?.isValid)}
              lineThickness={settings.lineThickness ?? 5.5}
            />
          )}
        </svg>

        {/* DOM Cards Layer */}
        <div className="absolute inset-0 pointer-events-auto" style={{ zIndex: 10 }}>
          {Array.from(layout.nodes.values()).map(node => {
            const isThisSelected = selectedMemberId === node.member.id;
            const isMulti = selectedMemberIds.has(node.member.id) && selectedMemberIds.size > 1;
            const isHovered = hoveredCardId === node.member.id;

            return (
              <div
                key={node.member.id}
                onMouseEnter={() => setHoveredCardId(node.member.id)}
                onMouseLeave={() => {
                  if (hoveredCardId === node.member.id) {
                    setHoveredCardId(null);
                  }
                }}
                style={{
                  position: 'absolute',
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  transition: isPanning || dragState
                    ? 'none'
                    : 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
                  willChange: 'transform',
                }}
                className="relative group"
              >
                <MemberCard
                  member={node.member}
                  onSelect={handleCardSelect}
                  onMouseDown={handleCardMouseDown}
                  onContextMenu={handleCardContextMenu}
                  isSelected={isThisSelected}
                  isMultiSelected={isMulti}
                  showAges={settings.showAges}
                  showDates={settings.showDates}
                />

                {/* 4 Connection Points (Bulbs) on Hover / Active Drag */}
                <CardConnectionBulbs
                  memberId={node.member.id}
                  isCardHovered={isHovered}
                  activeDragSource={
                    connectionDrag
                      ? { memberId: connectionDrag.sourceMemberId, bulb: connectionDrag.sourceBulb }
                      : null
                  }
                  hoveredTargetBulb={hoveredTargetBulb}
                  onStartDrag={handleBulbStartDrag}
                  onHoverBulb={handleBulbHover}
                  onUnhoverBulb={handleBulbUnhover}
                  onDropBulb={handleBulbDrop}
                />
              </div>
            );
          })}
        </div>

        {/* Marquee Drag Box Layer */}
        {marquee && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(marquee.startX, marquee.currentX),
              top: Math.min(marquee.startY, marquee.currentY),
              width: Math.abs(marquee.currentX - marquee.startX),
              height: Math.abs(marquee.currentY - marquee.startY),
              backgroundColor: 'rgba(99, 102, 241, 0.16)',
              border: '1.5px dashed #818CF8',
              borderRadius: '6px',
              zIndex: 25,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Multi-Selection Floating Action Pill */}
      {selectedMemberIds.size > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-indigo-500/70 text-slate-100 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 z-30 select-none text-xs">
          <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
            <MousePointer size={14} />
            <span>{selectedMemberIds.size} cards selected</span>
          </div>
          <span className="text-slate-400 text-[11px]">Drag any selected card to move group together</span>
          <button
            onClick={() => setSelectedMemberIds(new Set())}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Empty State Banner */}
      {members.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-8 max-w-md text-center pointer-events-auto shadow-2xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">Your Tree is Empty</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Right-click anywhere or click the button below to add your first ancestral card.
            </p>
            <button
              onClick={() => onAddNewMember()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              <Plus size={15} /> Add First Member
            </button>
          </div>
        </div>
      )}

      {/* Floating Canvas Viewport Controls (Bottom Left) */}
      <div className="canvas-ui-overlay absolute bottom-5 left-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 shadow-2xl text-slate-300 z-30 select-none">
        <button
          onClick={() => handleZoom('in')}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>

        <span className="text-[11px] font-mono px-2 text-slate-400 min-w-[42px] text-center">
          {Math.round(transform.scale * 100)}%
        </span>

        <button
          onClick={() => handleZoom('out')}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>

        <button
          onClick={centerView}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Center / Reset View"
        >
          <Maximize2 size={15} />
        </button>

        {onResetLayoutPositions && (
          <button
            onClick={onResetLayoutPositions}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-amber-300 transition-colors"
            title="Auto-Align / Reset Custom Placements"
          >
            <RotateCcw size={15} />
          </button>
        )}

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <div 
          className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/70 border border-slate-700/60 rounded-lg text-slate-300 text-[11px] select-none"
          title="Cards snap rigidly to a 24px grid"
        >
          <Grid3X3 size={13} className="text-indigo-400" />
          <span className="font-mono text-[10px] text-slate-300">Snap: 24px</span>
        </div>
      </div>

      {/* Floating Relationship Connection Notification Toast */}
      {connectionToast && (
        <div 
          className={`absolute bottom-5 right-5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 z-40 transition-all duration-200 border animate-in slide-in-from-bottom-2 ${
            connectionToast.type === 'success'
              ? 'bg-slate-900/95 border-emerald-500/70 text-emerald-200 shadow-emerald-950/40'
              : 'bg-slate-900/95 border-rose-500/70 text-rose-200 shadow-rose-950/40'
          }`}
        >
          <span>{connectionToast.message}</span>
        </div>
      )}

      {/* Empty-board Right-click Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onAddNewMember={() => {
          onAddNewMember({
            x: snapToGrid(contextMenu.canvasX),
            y: snapToGrid(contextMenu.canvasY),
          });
        }}
        onCenterView={centerView}
        onZoomIn={() => handleZoom('in')}
        onZoomOut={() => handleZoom('out')}
        onResetLayout={onResetLayoutPositions}
      />

      {/* Card-specific Right-click Context Menu */}
      <CardContextMenu
        x={cardContextMenu.x}
        y={cardContextMenu.y}
        member={cardContextMenu.member}
        allMembers={members}
        isOpen={cardContextMenu.isOpen}
        onClose={() => setCardContextMenu(prev => ({ ...prev, isOpen: false }))}
        onAddParent={(target) => onAddParentToMember?.(target)}
        onAddSpouse={(target) => onAddSpouseToMember?.(target)}
        onAddChild={(target) => onAddChildToMember?.(target)}
        onEditMember={(target) => onSelectMember(target)}
        onDeleteMember={(id) => {
          setSelectedMemberIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          onDeleteMember?.(id);
        }}
        onChangeGeneration={(memberId, newGen) => {
          if (onUpdateMembers) {
            const updated = members.map(m => m.id === memberId ? { ...m, generation: newGen } : m);
            onUpdateMembers(updated);
          }
        }}
      />

      {/* Connector-specific Right-click Context Menu */}
      <ConnectorContextMenu
        x={connectorContextMenu.x}
        y={connectorContextMenu.y}
        connector={connectorContextMenu.connector}
        isOpen={connectorContextMenu.isOpen}
        onClose={() => setConnectorContextMenu(prev => ({ ...prev, isOpen: false }))}
        onDeleteConnector={(conn) => {
          if (onUpdateMembers) {
            const updated = deleteRelationshipByConnector(members, conn);
            onUpdateMembers(updated);
          }
        }}
      />
    </div>
  );
};

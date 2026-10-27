import React from 'react';
import { BulbPosition, isBulbCompatible } from '../utils/relationshipConnector';

interface CardConnectionBulbsProps {
  memberId: string;
  isCardHovered: boolean;
  activeDragSource: {
    memberId: string;
    bulb: BulbPosition;
  } | null;
  hoveredTargetBulb: {
    memberId: string;
    bulb: BulbPosition;
  } | null;
  onStartDrag: (memberId: string, bulb: BulbPosition, e: React.MouseEvent) => void;
  onHoverBulb: (memberId: string, bulb: BulbPosition) => void;
  onUnhoverBulb: () => void;
  onDropBulb: (memberId: string, bulb: BulbPosition) => void;
}

const BULB_POSITIONS: BulbPosition[] = ['top', 'bottom', 'left', 'right'];

export const CardConnectionBulbs: React.FC<CardConnectionBulbsProps> = ({
  memberId,
  isCardHovered,
  activeDragSource,
  hoveredTargetBulb,
  onStartDrag,
  onHoverBulb,
  onUnhoverBulb,
  onDropBulb,
}) => {
  const isThisSourceCard = activeDragSource?.memberId === memberId;
  const isDraggingAnywhere = activeDragSource !== null;

  return (
    <>
      {BULB_POSITIONS.map(pos => {
        const isThisBulbSource = isThisSourceCard && activeDragSource.bulb === pos;
        const isCompatibleTarget =
          isDraggingAnywhere &&
          !isThisSourceCard &&
          isBulbCompatible(activeDragSource.bulb, pos, activeDragSource.memberId, memberId);

        const isHoveredTarget =
          hoveredTargetBulb?.memberId === memberId && hoveredTargetBulb.bulb === pos;

        // Visibility rule: visible on card hover, or if it is a compatible drop target during drag, or is the source bulb
        const isVisible =
          isThisBulbSource ||
          isCompatibleTarget ||
          (!isDraggingAnywhere && isCardHovered);

        if (!isVisible && !isCardHovered) {
          return null;
        }

        // Base coordinate placement on edge of 190x250 card
        let positionClasses = '';
        let tooltipText = '';

        switch (pos) {
          case 'top':
            positionClasses = 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2';
            tooltipText = 'Connect to Parent';
            break;
          case 'bottom':
            positionClasses = 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2';
            tooltipText = 'Connect to Child';
            break;
          case 'left':
            positionClasses = 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2';
            tooltipText = 'Connect to Partner';
            break;
          case 'right':
            positionClasses = 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2';
            tooltipText = 'Connect to Partner';
            break;
        }

        return (
          <div
            key={pos}
            className={`absolute z-30 transition-all duration-150 flex items-center justify-center ${positionClasses} ${
              isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            style={{ width: 28, height: 28 }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartDrag(memberId, pos, e);
            }}
            onMouseEnter={() => {
              if (isDraggingAnywhere && !isThisSourceCard) {
                onHoverBulb(memberId, pos);
              }
            }}
            onMouseLeave={() => {
              if (isDraggingAnywhere && !isThisSourceCard) {
                onUnhoverBulb();
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              if (isDraggingAnywhere) {
                onDropBulb(memberId, pos);
              }
            }}
            title={tooltipText}
          >
            {/* Outer magnetic target ring */}
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center cursor-crosshair transition-all duration-150 ${
                isHoveredTarget
                  ? 'scale-150 bg-emerald-400 ring-4 ring-emerald-500/80 shadow-lg shadow-emerald-500/50'
                  : isCompatibleTarget
                  ? 'scale-125 bg-indigo-500 ring-4 ring-indigo-400/70 animate-pulse shadow-md shadow-indigo-500/50'
                  : isThisBulbSource
                  ? 'scale-125 bg-indigo-400 ring-4 ring-indigo-300 shadow-md'
                  : 'bg-white hover:scale-125 hover:bg-indigo-300 ring-2 ring-slate-900 shadow-sm'
              }`}
            >
              {/* Inner dot core */}
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isHoveredTarget
                    ? 'bg-slate-950'
                    : isCompatibleTarget || isThisBulbSource
                    ? 'bg-white'
                    : 'bg-slate-800'
                }`}
              />
            </div>
          </div>
        );
      })}
    </>
  );
};

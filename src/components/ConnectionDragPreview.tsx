import React from 'react';
import { BulbPosition } from '../utils/relationshipConnector';

interface ConnectionDragPreviewProps {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  sourceBulb: BulbPosition;
  isValidTargetHovered: boolean;
  lineThickness?: number;
}

export const ConnectionDragPreview: React.FC<ConnectionDragPreviewProps> = ({
  startX,
  startY,
  currentX,
  currentY,
  sourceBulb,
  isValidTargetHovered,
  lineThickness = 5.5,
}) => {
  // Compute smooth curved cubic bezier path
  let pathD = '';
  const dx = currentX - startX;
  const dy = currentY - startY;

  if (sourceBulb === 'left' || sourceBulb === 'right') {
    const cpDistance = Math.max(Math.abs(dx) * 0.5, 40);
    const cp1x = sourceBulb === 'right' ? startX + cpDistance : startX - cpDistance;
    const cp2x = sourceBulb === 'right' ? currentX - cpDistance : currentX + cpDistance;
    pathD = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${currentY}, ${currentX} ${currentY}`;
  } else {
    const cpDistance = Math.max(Math.abs(dy) * 0.5, 40);
    const cp1y = sourceBulb === 'bottom' ? startY + cpDistance : startY - cpDistance;
    const cp2y = sourceBulb === 'bottom' ? currentY - cpDistance : currentY + cpDistance;
    pathD = `M ${startX} ${startY} C ${startX} ${cp1y}, ${currentX} ${cp2y}, ${currentX} ${currentY}`;
  }

  const strokeColor = isValidTargetHovered ? '#22C55E' : '#818CF8';

  return (
    <g className="pointer-events-none">
      {/* Background shadow path */}
      <path
        d={pathD}
        fill="none"
        stroke="#020617"
        strokeWidth={lineThickness + 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* Animated dashed foreground line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={lineThickness}
        strokeDasharray="7,5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-pulse"
      />
      {/* Target Cursor Bulb Glow */}
      <circle
        cx={currentX}
        cy={currentY}
        r={7}
        fill={strokeColor}
        stroke="#020617"
        strokeWidth={2}
        className="transition-all duration-100"
      />
      <circle
        cx={currentX}
        cy={currentY}
        r={3}
        fill="#FFFFFF"
      />
    </g>
  );
};

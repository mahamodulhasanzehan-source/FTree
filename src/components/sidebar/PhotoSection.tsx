import React, { useRef } from 'react';
import { Camera, Upload, Trash2, ZoomIn, Move, RotateCcw } from 'lucide-react';
import { FamilyMember } from '../../types';
import { convertImageToBase64 } from '../../utils/fileSystem';

interface PhotoSectionProps {
  member: FamilyMember;
  onUpdateMember: (updated: FamilyMember) => void;
}

export const PhotoSection: React.FC<PhotoSectionProps> = ({
  member,
  onUpdateMember,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await convertImageToBase64(file);
      onUpdateMember({
        ...member,
        avatar: base64,
        imageZoom: 1,
        imageOffsetX: 0,
        imageOffsetY: 0,
      });
    } catch {
      alert('Could not upload image.');
    }
  };

  const handleRemovePhoto = () => {
    onUpdateMember({
      ...member,
      avatar: undefined,
      imageZoom: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
    });
  };

  const zoom = member.imageZoom ?? 1;
  const offsetX = member.imageOffsetX ?? 0;
  const offsetY = member.imageOffsetY ?? 0;

  return (
    <section className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Camera size={13} className="text-indigo-400" /> Photo & Alignment
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Portrait Box with Drag & Drop Support */}
      <div 
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files?.[0];
          if (!file || !file.type.startsWith('image/')) return;
          try {
            const base64 = await convertImageToBase64(file);
            onUpdateMember({
              ...member,
              avatar: base64,
              imageZoom: 1,
              imageOffsetX: 0,
              imageOffsetY: 0,
            });
          } catch {
            alert('Could not upload dropped image.');
          }
        }}
        className="relative w-full h-36 rounded-md overflow-hidden bg-slate-950 border border-slate-800 border-dashed hover:border-indigo-500/60 flex items-center justify-center transition-colors cursor-pointer"
        title="Drag and drop image here"
        onClick={() => fileInputRef.current?.click()}
      >
        {member.avatar ? (
          <img
            src={member.avatar}
            alt="Portrait"
            style={{
              transform: `scale(${zoom}) translate(${offsetX}%, ${offsetY}%)`,
              transformOrigin: 'center center',
            }}
            className="w-full h-full object-contain transition-transform duration-75 ease-out"
          />
        ) : (
          <div className="text-center p-3 pointer-events-none">
            <Upload size={24} className="text-slate-500 mx-auto mb-1.5" />
            <p className="text-[11px] text-slate-400 font-medium">Drag & drop photo here</p>
            <p className="text-[9px] text-slate-500 mt-0.5">or click to browse</p>
          </div>
        )}
      </div>

      {/* Photo Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <Upload size={12} /> {member.avatar ? 'Change' : 'Upload'}
        </button>
        {member.avatar && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="p-1 px-2 bg-slate-800 hover:bg-red-950/60 hover:text-red-300 border border-slate-700/80 text-slate-400 rounded-md text-xs transition-colors"
            title="Remove photo"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Zoom and Alignment controls */}
      {member.avatar && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
              <span className="flex items-center gap-1"><ZoomIn size={11} /> Zoom</span>
              <span className="font-mono text-indigo-300 text-[10px]">{zoom.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.05"
              value={zoom}
              onChange={e => onUpdateMember({ ...member, imageZoom: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
              <span className="flex items-center gap-1"><Move size={11} /> Horizontal</span>
              <span className="font-mono text-slate-400 text-[10px]">{offsetX}%</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={offsetX}
              onChange={e => onUpdateMember({ ...member, imageOffsetX: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
              <span className="flex items-center gap-1"><Move size={11} /> Vertical</span>
              <span className="font-mono text-slate-400 text-[10px]">{offsetY}%</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={offsetY}
              onChange={e => onUpdateMember({ ...member, imageOffsetY: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded"
            />
          </div>

          <button
            type="button"
            onClick={() => onUpdateMember({ ...member, imageZoom: 1, imageOffsetX: 0, imageOffsetY: 0 })}
            className="w-full text-center text-[10px] text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 pt-0.5"
          >
            <RotateCcw size={10} /> Reset Alignment
          </button>
        </div>
      )}
    </section>
  );
};

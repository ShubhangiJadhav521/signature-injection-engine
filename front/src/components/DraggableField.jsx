import React, { useState, useEffect, useRef } from 'react';

const DraggableField = ({
  field,
  containerWidth,
  containerHeight,
  onUpdate,
  onDelete,
  onSignClick
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialFieldPos = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const fileInputRef = useRef(null);

  const handleStart = (e) => {
    if (e.target.closest('.ignore-drag')) return;
    e.stopPropagation();
    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    dragStartPos.current = { x: clientX, y: clientY };
    initialFieldPos.current = { x: field.x, y: field.y, w: field.width, h: field.height };
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    dragStartPos.current = { x: clientX, y: clientY };
    initialFieldPos.current = { x: field.x, y: field.y, w: field.width, h: field.height };
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate(field.id, { value: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handleMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      if (isDragging) {
        const deltaX = ((clientX - dragStartPos.current.x) / containerWidth) * 100;
        const deltaY = ((clientY - dragStartPos.current.y) / containerHeight) * 100;

        let newX = initialFieldPos.current.x + deltaX;
        let newY = initialFieldPos.current.y + deltaY;

        newX = Math.max(0, Math.min(100 - field.width, newX));
        newY = Math.max(0, Math.min(100 - field.height, newY));

        onUpdate(field.id, { x: newX, y: newY });
      }

      if (isResizing) {
        const deltaX = ((clientX - dragStartPos.current.x) / containerWidth) * 100;
        const deltaY = ((clientY - dragStartPos.current.y) / containerHeight) * 100;

        let newW = initialFieldPos.current.w + deltaX;
        let newH = initialFieldPos.current.h + deltaY;

        newW = Math.max(2, Math.min(100 - field.x, newW));
        newH = Math.max(1, Math.min(100 - field.y, newH));

        onUpdate(field.id, { width: newW, height: newH });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing, field, containerWidth, containerHeight, onUpdate]);

  const renderContent = () => {
    switch (field.type) {
      case "SIGNATURE":
        return (
          <div 
            className={`field-item w-full h-full flex flex-col items-center justify-center bg-blue-50/90 border-2 border-dashed transition-all ${field.value ? 'border-blue-500 bg-white' : 'border-blue-300 hover:bg-blue-100'} rounded-lg overflow-hidden cursor-pointer shadow-sm`}
            onClick={() => onSignClick?.(field.id)}
          >
            {field.value ? (
              <img src={field.value} className="max-h-full max-w-full object-contain p-2" alt="signature" />
            ) : (
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Sign</span>
            )}
          </div>
        );
      case "RADIO":
        return (
          <div 
            className="field-item w-full h-full flex items-center justify-center bg-white border-2 border-slate-300 rounded-full shadow-sm cursor-pointer hover:border-blue-500 transition-colors ignore-drag"
            onClick={() => onUpdate(field.id, { checked: !field.checked })}
          >
             <div className={`w-3/5 h-3/5 rounded-full transition-all duration-200 ${field.checked ? 'bg-blue-600 scale-100' : 'bg-transparent scale-0'}`}></div>
          </div>
        );
      case "INPUT":
        return (
          <div className="field-item w-full h-full bg-white border-2 border-blue-200 rounded-md shadow-sm flex items-center px-2">
            <input
              type="text"
              className="w-full bg-transparent text-[10px] lg:text-[11px] font-bold text-gray-800 outline-none placeholder:text-gray-300 ignore-drag"
              placeholder="Text..."
              value={field.value || ''}
              onChange={(e) => onUpdate(field.id, { value: e.target.value })}
            />
          </div>
        );
      case "TEXT":
        return (
          <div className="field-item w-full h-full bg-white border-2 border-green-200 rounded-md shadow-sm flex items-start p-1.5 overflow-hidden">
            <textarea
              className="w-full h-full bg-transparent text-[10px] lg:text-[11px] font-medium text-gray-800 outline-none placeholder:text-gray-300 ignore-drag resize-none overflow-auto"
              placeholder="Text area..."
              value={field.value || ''}
              onChange={(e) => onUpdate(field.id, { value: e.target.value })}
              style={{ minHeight: '100%' }}
            />
          </div>
        );
      case "DATE":
        return (
          <div className="field-item w-full h-full flex items-center bg-slate-50 border-2 border-slate-300 px-1 lg:px-2 rounded-lg shadow-inner">
             <input 
               type="date"
               className="w-full bg-transparent text-[9px] lg:text-[10px] font-black text-slate-700 outline-none ignore-drag"
               value={field.value || ''}
               onChange={(e) => onUpdate(field.id, { value: e.target.value })}
             />
          </div>
        );
      case "IMAGE":
        return (
          <div 
            className={`field-item w-full h-full flex flex-col items-center justify-center bg-purple-50/80 border-2 border-dashed transition-all ${field.value ? 'border-purple-400 bg-white' : 'border-purple-300'} rounded-lg overflow-hidden cursor-pointer ignore-drag shadow-sm`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            {field.value ? (
              <img src={field.value} className="max-h-full max-w-full object-contain p-1" alt="uploaded" />
            ) : (
              <span className="text-[10px] font-black text-purple-600 uppercase">IMG</span>
            )}
          </div>
        );
      default:
        return <div className="field-item w-full h-full bg-slate-200 border-2 border-slate-400 rounded flex items-center justify-center font-bold">?</div>;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        zIndex: isDragging || isResizing ? 50 : 10,
        pointerEvents: 'auto'
      }}
      className={`group transition-transform ${isDragging ? 'cursor-grabbing scale-105 shadow-2xl z-50' : 'cursor-grab'}`}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    >
      {renderContent()}

      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(field.id); }}
        className="absolute -top-6 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg transition-all opacity-0 group-hover:opacity-100 z-50 lg:scale-100 scale-125"
      >
        &times;
      </button>

      <div
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-all shadow-md z-50"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      />
    </div>
  );
};

export default DraggableField;
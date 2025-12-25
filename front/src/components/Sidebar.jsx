import React from "react";
import { 
  FaFont, 
  FaAlignLeft, 
  FaPen, 
  FaCalendar, 
  FaImage, 
  FaCircle
} from 'react-icons/fa';

const TOOLS = [
  { type: "INPUT", label: "Single Line Input", icon: FaFont },
  { type: "TEXT", label: "Text Area", icon: FaAlignLeft },
  { type: "SIGNATURE", label: "Signature Point", icon: FaPen },
  { type: "DATE", label: "Date Selector", icon: FaCalendar },
  { type: "IMAGE", label: "Image Box", icon: FaImage },
  { type: "RADIO", label: "Boolean Radio", icon: FaCircle },
];

const Sidebar = ({ onDragStart }) => {
  return (
    <div className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col h-full shadow-lg z-10">
      <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
        Injection Tools
      </h2>
      <div className="space-y-3">
        {TOOLS.map((tool, index) => {
          const IconComponent = tool.icon;
          return (
            <div
              key={index}
              draggable
              onDragStart={() => onDragStart(tool.type)}
              className="flex items-center p-3 rounded-xl border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-all group shadow-sm bg-white"
            >
              <IconComponent className="text-xl mr-3 group-hover:scale-125 transition-transform duration-200 text-slate-600" />
              <span className="text-xs font-bold text-slate-700">
                {tool.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-slate-100">
        <div className="bg-slate-50 p-4 rounded-xl">
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">
            Instructions
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            Drag tools to the document. Use the corners to resize. Coordinates
            are relative to content for multi-device support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

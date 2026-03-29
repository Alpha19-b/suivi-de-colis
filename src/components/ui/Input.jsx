import React from 'react';

export const Input = ({ label, icon: Icon, type = "text", ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />}
      {type === "color" ? (
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <input 
            type="color"
            className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0"
            {...props}
          />
          <span className="font-mono text-sm text-slate-600 font-bold uppercase">{props.value}</span>
        </div>
      ) : (
        <input 
          type={type}
          className={`w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium shadow-sm placeholder:text-slate-400 ${Icon ? 'pl-11' : ''}`}
          {...props}
        />
      )}
    </div>
  </div>
);
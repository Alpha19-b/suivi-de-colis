import React from 'react';

export const Select = ({ label, children, ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">{label}</label>}
    <select 
      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium appearance-none shadow-sm cursor-pointer"
      {...props}
    >
      {children}
    </select>
  </div>
);
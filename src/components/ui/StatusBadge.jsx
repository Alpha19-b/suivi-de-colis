import React from 'react';

export const StatusBadge = ({ status, color, large = false }) => {
  const styles = {
    en_preparation: "bg-slate-100 text-slate-600 ring-slate-200/50",
    commande: "bg-slate-100 text-slate-600 ring-slate-200/50",
    transit_chine: "bg-blue-50 text-blue-700 ring-blue-200/50",
    entrepot_chine: "bg-indigo-50 text-indigo-700 ring-indigo-200/50",
    international: "bg-violet-50 text-violet-700 ring-violet-200/50",
    douane_guinee: "bg-amber-50 text-amber-700 ring-amber-200/50",
    livre: "bg-teal-50 text-teal-700 ring-teal-200/50",
    recupere: "bg-slate-800 text-white ring-slate-900/50",
  };
  
  let label = status ? status.replace(/_/g, " ").toUpperCase() : "INCONNU";
  if (status === 'douane_guinee') label = "DOUANE";
  if (status === 'livre') label = "DISPO. AGENCE";
  if (status === 'recupere') label = "RÉCUPÉRÉ";

  const customStyle = (color && (status === "livre" || status === "recupere"))
    ? { backgroundColor: status === "recupere" ? color : `${color}15`, color: status === "recupere" ? '#fff' : color }
    : {};

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-black tracking-wider ring-1 ring-inset ${large ? 'px-4 py-2 text-xs shadow-sm' : 'px-2.5 py-1 text-[10px]'} ${!color ? (styles[status] || "bg-gray-100 text-gray-600 ring-gray-200/50") : ""}`}
      style={customStyle}
    >
      {(status === 'livre' || status === 'recupere') && (
         <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'recupere' ? 'bg-white/80' : 'bg-teal-500 animate-pulse'}`}></span>
      )}
      {label}
    </span>
  );
};
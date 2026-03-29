import React from 'react';
import { 
  Box, Building2, Plane, ShieldCheck, 
  MapPin, CheckCircle2, Package, Settings 
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';

export const getStatusIcon = (status) => {
  switch (status) {
    case 'en_preparation': return <Box size={16} />;
    case 'entrepot_chine': return <Building2 size={16} />;
    case 'international': return <Plane size={16} />;
    case 'douane_guinee': return <ShieldCheck size={16} />;
    case 'livre': return <MapPin size={16} />;
    case 'recupere': return <CheckCircle2 size={16} />;
    default: return <Package size={16} />;
  }
};

export const Timeline = ({ updates, color }) => {
  const safeUpdates = Array.isArray(updates) ? updates : [];
  const sortedUpdates = [...safeUpdates].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedUpdates.length === 0) return (
    <div className="text-center p-10 bg-slate-50/50 rounded-3xl border border-slate-200 text-slate-400 font-medium">
      Aucun historique disponible pour le moment.
    </div>
  );

  return (
    <div className="relative space-y-10 my-6 ml-4 sm:ml-6 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-gradient-to-b before:from-slate-300 before:via-slate-200 before:to-transparent">
      {sortedUpdates.map((update, idx) => {
        const isLatest = idx === 0;
        
        // 🟢 On vérifie si une note existe et n'est pas juste des espaces vides
        const hasNote = update.note && update.note.trim() !== '';

        return (
          <div key={idx} className="relative flex items-start pl-10 sm:pl-12 group w-full">
            
            <div 
              className={`absolute left-[1px] top-0 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-sm transition-all duration-300 group-hover:scale-110 ${isLatest ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
              style={isLatest && color ? { backgroundColor: color } : {}}
            >
              {isLatest && <div className="absolute inset-0 rounded-full border-2 border-current animate-ping opacity-20"></div>}
              {getStatusIcon(update.status)}
            </div>
            
            <div className={`flex flex-col w-full pt-1 ${!isLatest ? 'opacity-60 group-hover:opacity-100 transition-opacity duration-300' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <span className={`text-sm font-black uppercase tracking-wider ${isLatest ? "text-slate-900" : "text-slate-600"}`}>
                  {String(update.status || "").replace(/_/g, " ")}
                </span>
                <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-full w-fit mt-1 sm:mt-0 shadow-sm border border-slate-200/50">
                  {formatDate(update.date)}
                </span>
              </div>
              
              {/* 🟢 CORRECTION : La boîte ne s'affiche QUE si hasNote est vrai */}
              {hasNote && (
                <p className={`mt-3 text-sm leading-relaxed font-medium p-4 rounded-2xl border shadow-sm ${isLatest ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-50 border-slate-100/60 text-slate-600'}`}>
                  {update.note}
                </p>
              )}

              {update.source && update.source !== 'manual' && (
                 <span className="mt-2 text-[10px] text-slate-400 uppercase tracking-widest font-black w-fit flex items-center gap-1">
                   <Settings size={10} /> Système
                 </span>
              )}
            </div>
            
          </div>
        );
      })}
    </div>
  );
};
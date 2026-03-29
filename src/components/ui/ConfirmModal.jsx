import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = "Supprimer", loading = false }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 transition-all duration-300">
    <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 fade-in duration-200">
      <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-6 bg-rose-100 text-rose-600 shadow-inner">
        <AlertCircle size={32} />
      </div>
      <h3 className="font-black text-2xl text-center text-slate-900 mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-600 font-medium text-center mb-8 leading-relaxed whitespace-pre-wrap">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={loading} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all">Annuler</button>
        <button onClick={onConfirm} disabled={loading} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex justify-center items-center">
          {loading ? <RefreshCw className="animate-spin" size={18} /> : confirmText}
        </button>
      </div>
    </div>
  </div>
);
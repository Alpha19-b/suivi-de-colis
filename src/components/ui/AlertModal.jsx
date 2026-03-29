import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { extractErrorMessage } from '../../utils/helpers';

export const AlertModal = ({ message, onClose }) => {
  if (!message) return null;
  const messageStr = extractErrorMessage(message);
  const isSuccess = messageStr.includes("✅");
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 transition-all duration-300">
      <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 fade-in duration-200">
        <div className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-6 ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {isSuccess ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
        </div>
        <h3 className="font-black text-2xl text-center text-slate-900 mb-3">{isSuccess ? 'Succès' : 'Attention'}</h3>
        <p className="text-slate-600 font-medium text-center mb-8 leading-relaxed">{messageStr.replace("✅ ", "").replace("❌ ", "")}</p>
        <button onClick={onClose} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-md">
          Compris
        </button>
      </div>
    </div>
  );
};
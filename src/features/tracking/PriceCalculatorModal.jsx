import React, { useState, useEffect } from 'react';
import { X, Calculator, Plane } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

export const PriceCalculatorModal = ({ onClose, rates }) => {
  const [transportType, setTransportType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState(0);

  const safeRates = rates || {};
  const getRate = (type) => {
    if (!type || !safeRates[type]) return 0;
    const rate = safeRates[type];
    return typeof rate === "object" ? Number(rate.price || 0) : Number(rate || 0);
  };
  const getLabel = (type) => {
    if (!type || !safeRates[type]) return type;
    const rate = safeRates[type];
    return typeof rate === "object" ? (rate.label || type) : type;
  };

  useEffect(() => {
    if (transportType && quantity) setTotal(Number(quantity) * getRate(transportType));
    else setTotal(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, transportType]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
        <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Calculator className="text-blue-500" size={28} /> Estimateur</h3>
        
        <div className="space-y-6">
          <div>
             <label className="text-xs font-black text-slate-500 uppercase tracking-wider pl-1 mb-2 block">Poids ou Volume total</label>
             <input type="number" autoFocus value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-4 border border-slate-200 bg-slate-50 rounded-2xl font-black text-3xl text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner" placeholder="0" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider pl-1 block">Mode d'expédition</label>
            <div className="grid grid-cols-1 gap-3">
              {Object.keys(safeRates).map((key) => (
                <button
                  key={key}
                  onClick={() => setTransportType(key)}
                  className={`p-4 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${transportType === key ? "border-blue-500 bg-blue-50/50 shadow-md" : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${transportType === key ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                      <Plane size={18} />
                    </div>
                    <span className={`font-black ${transportType === key ? 'text-blue-900' : 'text-slate-700'}`}>{getLabel(key)}</span>
                  </div>
                  <span className="text-xs font-black bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-slate-600">{formatCurrency(getRate(key))}</span>
                </button>
              ))}
            </div>
          </div>

          {transportType && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-xl shadow-slate-900/20 transform transition-all animate-in slide-in-from-bottom-4">
              <span className="text-slate-400 font-bold tracking-widest text-[10px] uppercase mb-1">Montant estimé</span>
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 drop-shadow-sm">{formatCurrency(total)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
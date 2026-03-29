import React from 'react';
import { 
  ArrowLeft, Building2, CheckCircle2, RefreshCw, 
  CreditCard, MapPin, Box, Scale 
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Timeline } from './Timeline';

export const TrackingScreen = ({
  shipmentData,
  activeBrand,
  setView,
  setActiveBrand,
  handleDirectPayment,
  isPaymentLoading
}) => {
  if (!shipmentData) return null;

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500">
      <div className="pb-32 pt-20 px-4 relative overflow-hidden" style={{ backgroundColor: activeBrand?.org_color || "#0f172a" }}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="container mx-auto max-w-4xl relative z-10">
          <button onClick={() => { setView("home"); setActiveBrand(null); }} className="text-white hover:bg-white/20 mb-10 flex items-center gap-2 text-sm font-bold bg-white/10 px-5 py-2.5 rounded-full w-fit backdrop-blur-md transition-all active:scale-95"><ArrowLeft size={18} /> Retour à l'accueil</button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div><p className="text-white/60 font-black tracking-widest text-xs uppercase mb-3">Suivi de colis</p><h1 className="text-5xl md:text-7xl font-black font-mono text-white tracking-tighter drop-shadow-md">{shipmentData.internal_id}</h1></div>
            <div className="bg-white p-2.5 rounded-3xl shadow-2xl"><StatusBadge status={shipmentData.status} color={activeBrand?.org_color} large /></div>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-4xl px-4 -mt-20 relative z-20 pb-24">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-6 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 bg-slate-50/50">
            <div className="flex items-center gap-5">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"><Building2 className="text-slate-400" size={28} /></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Transporteur</p><h2 className="text-2xl font-black tracking-tight" style={{ color: activeBrand?.org_color || "#0f172a" }}>{activeBrand?.org_name || "LOGISTIQUE PRO"}</h2></div>
            </div>
            {shipmentData.payment_status === 'paid' ? (
              <div className="bg-emerald-50 text-emerald-700 font-black py-4 px-6 rounded-2xl flex items-center gap-3 shadow-sm border border-emerald-200/50 w-full sm:w-auto justify-center text-lg"><CheckCircle2 size={24} /> Payé</div>
            ) : (
              <button onClick={handleDirectPayment} disabled={isPaymentLoading} className="bg-slate-900 hover:bg-slate-800 text-white font-black py-4 px-8 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-slate-900/20 active:scale-95 w-full sm:w-auto justify-center text-lg">{isPaymentLoading ? <RefreshCw className="animate-spin" size={20} /> : <CreditCard size={20} />} Régler la facture</button>
            )}
          </div>
          <div className="flex flex-col md:flex-row">
            <div className="p-6 sm:p-10 flex-1 space-y-10">
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Destinataire</p><p className="font-black text-slate-900 text-3xl">{shipmentData.client_name}</p></div>
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-3">Contenu</p><p className="font-bold text-slate-700 flex items-center gap-2 text-base"><Box size={20} className="text-blue-500" /> {shipmentData.description}</p></div>
                {shipmentData.weight_kg && (<div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-3">{shipmentData.transport_type === 'maritime' ? 'Volume' : 'Poids'}</p><p className="font-bold text-slate-700 flex items-center gap-2 text-base"><Scale size={20} className="text-emerald-500" /> {shipmentData.weight_kg} {shipmentData.transport_type === 'maritime' ? 'CBM' : 'Kg'}</p></div>)}
              </div>
            </div>
            {shipmentData.photo_path && (<div className="md:w-5/12 bg-slate-100 p-4 sm:p-8 flex items-center justify-center relative group"><div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div><img src={shipmentData.photo_path} alt="Photo du colis" className="w-full h-auto max-h-72 object-cover rounded-[2rem] shadow-lg border-8 border-white transform transition-transform duration-500 group-hover:scale-105" /></div>)}
          </div>
          <div className="p-6 sm:p-12 border-t border-slate-100">
            <h3 className="font-black text-3xl text-slate-900 mb-10 flex items-center gap-4 tracking-tight"><div className="p-3 bg-rose-100 text-rose-500 rounded-2xl"><MapPin size={28} /></div> Parcours du colis</h3>
            <Timeline updates={shipmentData.updates} color={activeBrand?.org_color} />
          </div>
        </div>
      </div>
    </div>
  );
};
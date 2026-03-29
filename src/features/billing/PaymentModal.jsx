import React, { useState } from 'react';
import { X, CreditCard, RefreshCw, Wallet } from 'lucide-react';
import { formatCurrency, extractErrorMessage, getReturnUrl } from '../../utils/helpers';

const CREDIT_PACKS = [
  { credits: 100, price: 20000, label: "Découverte" },
  { credits: 500, price: 96000, label: "Essentiel" },
  { credits: 1000, price: 168000, label: "Pro" },
  { credits: 5000, price: 750000, label: "Business" },
  { credits: 10000, price: 1500000, label: "Entreprise" },
];

export const PaymentModal = ({ onClose, contextData, supabase, userOrg, showAlert }) => {
  const [amount, setAmount] = useState(contextData.amount || "");
  const [loading, setLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);

  const isRecharge = contextData.type === "credit_recharge";
  
  const cargoPhone = userOrg?.phone || userOrg?.whatsapp_number || "";

  const handlePackSelect = (pack) => {
    setSelectedPack(pack);
    setAmount(pack.price);
  };

  const handlePayment = async () => {
    if (!amount) return showAlert("Veuillez sélectionner un montant.");
    if (!cargoPhone) return showAlert("Erreur : Aucun numéro de téléphone n'est configuré pour votre Cargo. Djomi en a besoin pour identifier le paiement.");
    if (!supabase) return showAlert("Erreur: Supabase non initialisé.");
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("djomi-pay", {
        body: {
          amount: Number(amount),
          type: contextData.type,
          reference_id: contextData.reference_id,
          phone: cargoPhone, 
          metadata: isRecharge && selectedPack ? { credits: selectedPack.credits } : {},
          return_url: getReturnUrl()
        }
      });

      if (error) throw error;
      
      const link = data?.payment_url || data?.link || data?.url;
      if (!link) {
        showAlert("Erreur: lien de paiement non reçu.");
        return;
      }

      const newWindow = window.open(link, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = link;
      } else {
          onClose();
      }
    } catch (e) {
      showAlert("Erreur paiement: " + extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
        
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-orange-400 to-rose-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30 transform -rotate-6">
            <CreditCard className="text-white" size={36} />
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Recharger</h3>
          <p className="text-sm font-medium text-slate-500 mt-2">Paiement 100% sécurisé via Djomi</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.credits}
                  onClick={() => handlePackSelect(pack)}
                  className={`p-4 rounded-2xl border-2 text-left flex justify-between items-center transition-all ${selectedPack === pack ? "border-orange-500 bg-orange-50/50 shadow-md transform scale-[1.02]" : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <div>
                    <div className={`font-black text-lg ${selectedPack === pack ? 'text-orange-600' : 'text-slate-800'}`}>{pack.credits} SMS</div>
                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{pack.label}</div>
                  </div>
                  <div className={`font-bold px-3 py-1.5 rounded-xl shadow-sm border ${selectedPack === pack ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-900 border-slate-200'}`}>
                    {formatCurrency(pack.price)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading || !selectedPack}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Wallet size={20} />}
            {loading ? "Initialisation..." : "Procéder au paiement"}
          </button>
        </div>
      </div>
    </div>
  );
};
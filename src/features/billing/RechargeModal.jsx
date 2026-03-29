import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Mail, Zap, RefreshCw } from 'lucide-react';
import { extractErrorMessage, getReturnUrl } from '../../utils/helpers';

export const RechargeModal = ({ type, onClose, userOrg, supabase, showAlert }) => {
  const [loadingPack, setLoadingPack] = useState(null);
  const [packs, setPacks] = useState([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);

  const isSms = type === 'sms';
  const TitleIcon = isSms ? MessageSquare : Mail;

  // 🟢 CONFIGURATION TAILWIND
  const themeConfig = {
    iconContainer: isSms ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500',
    spinner: isSms ? 'text-emerald-500' : 'text-blue-500',
    cardHighlight: isSms ? 'bg-white border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 z-10 scale-105' : 'bg-white border-2 border-blue-500 shadow-xl shadow-blue-500/10 z-10 scale-105',
    badge: isSms ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white',
    titleHighlight: isSms ? 'text-emerald-600' : 'text-blue-600',
    btnHighlight: isSms ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
  };

  // 🟢 LECTURE DEPUIS LA BDD (AVEC LE FILTRE 'TYPE' RÉACTIVÉ)
  useEffect(() => {
    const fetchPacks = async () => {
      if (!supabase) return;
      setIsLoadingPacks(true);
      try {
        const { data, error } = await supabase
          .from('recharge_packs')
          .select('*')
          .eq('type', type) // 🟢 C'EST ICI QU'ON FILTRE (sms ou email)
          .order('quantity', { ascending: true });

        if (error) throw error;
        
        setPacks(data || []);
        
      } catch (err) {
        console.error("Erreur chargement des packs:", err);
        setPacks([]);
      } finally {
        setIsLoadingPacks(false);
      }
    };
    
    fetchPacks();
  }, [supabase, type]); // On a remis 'type' dans les dépendances

  const handlePurchase = async (pack) => {
    const cargoPhone = userOrg?.phone || userOrg?.whatsapp_number || "";
    if (!cargoPhone) return showAlert("⚠️ Veuillez configurer un numéro WhatsApp dans vos paramètres pour valider le paiement.");
    if (!supabase) return showAlert("Erreur: Supabase non initialisé.");

    setLoadingPack(pack.id);

    try {
      const invincibleReferenceId = `${userOrg.id}___${type}___${pack.quantity}`;

      const { data, error } = await supabase.functions.invoke("djomi-pay", {
        body: {
          amount: pack.price_gnf,
          type: type === 'sms' ? 'pack_sms' : 'pack_email', 
          reference_id: invincibleReferenceId,
          phone: cargoPhone, 
          metadata: { pack_id: pack.id, quantity: pack.quantity, item_type: type },
          return_url: getReturnUrl()
        }
      });

      if (error) throw error;
      
      const link = data?.payment_url || data?.link || data?.url;
      if (!link) throw new Error("Lien de paiement non reçu.");

      window.location.href = link;
    } catch (e) {
      showAlert("Erreur de paiement : " + extractErrorMessage(e));
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/80 backdrop-blur-md custom-scrollbar flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 fade-in duration-300 m-auto">
        
        <button onClick={onClose} className="absolute top-6 right-6 z-50 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
          <X size={24} />
        </button>

        <div className="p-8 sm:p-12">
          <div className="text-center mb-10">
            <div className={`inline-flex items-center justify-center p-5 rounded-full mb-5 shadow-sm ${themeConfig.iconContainer}`}>
              <TitleIcon size={36} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              Recharger vos {isSms ? 'SMS' : 'E-mails'}
            </h2>
            <p className="text-slate-500 font-medium text-lg">Choisissez un pack. Les crédits seront ajoutés instantanément après paiement.</p>
          </div>

          {isLoadingPacks ? (
            <div className="flex justify-center py-10"><RefreshCw className={`animate-spin ${themeConfig.spinner}`} size={40} /></div>
          ) : packs.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
              <p className="text-slate-500 font-bold text-lg">Aucun pack disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packs.map((pack) => (
                <div key={pack.id} className={`rounded-3xl p-6 sm:p-8 flex flex-col relative transition-all duration-300 hover:-translate-y-1 ${pack.highlight ? themeConfig.cardHighlight : 'bg-slate-50 border border-slate-200 hover:shadow-md hover:bg-white'}`}>
                  
                  {pack.highlight && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${themeConfig.badge}`}>
                      Le plus choisi
                    </div>
                  )}
                  
                  <h3 className={`text-xl font-black mb-2 ${pack.highlight ? themeConfig.titleHighlight : 'text-slate-900'}`}>{pack.name}</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-black tracking-tight text-slate-900">+{new Intl.NumberFormat('fr-FR').format(pack.quantity)}</span>
                  </div>

                  <div className="mb-8 pb-8 border-b border-slate-200/60 flex-grow">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Prix unique</p>
                    <p className="text-2xl font-black text-slate-800">{new Intl.NumberFormat('fr-FR').format(pack.price_gnf)} GNF</p>
                  </div>

                  <button 
                    disabled={loadingPack === pack.id}
                    onClick={() => handlePurchase(pack)}
                    className={`w-full py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 text-lg ${pack.highlight ? themeConfig.btnHighlight : 'bg-slate-900 hover:bg-slate-800 text-white font-bold'}`}
                  >
                    {loadingPack === pack.id ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                    Acheter
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
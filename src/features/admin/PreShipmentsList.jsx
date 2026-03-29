import React, { useState, useEffect } from 'react';
import { 
  Package, Image as ImageIcon, MapPin, Phone, CheckCircle2, 
  X, RefreshCw, Plane, Ship, Zap, Copy, Megaphone, Lock, Crown, Send, AlertCircle
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { extractErrorMessage } from '../../utils/helpers';

export const PreShipmentsList = ({ supabase, userOrg, setAlertMessage, onConverted }) => {
  const [preShipments, setPreShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(true); // 🟢 Ajout pour synchroniser le chargement
  const [selectedItem, setSelectedItem] = useState(null);
  const [converting, setConverting] = useState(false);
  const [planFeatures, setPlanFeatures] = useState({});
  
  // Champs pour la conversion
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [transportType, setTransportType] = useState("aerien_normal");

  // Nouveaux états
  const [linkCopied, setLinkCopied] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState("");
  const [sendingAnnounce, setSendingAnnounce] = useState(false);

  // 🟢 Le lien public du cargo
  const publicLink = `https://guineatrack.com/?d=${userOrg?.slug || 'votre-cargo'}`;

  // 🟢 1. FETCH DES PERMISSIONS DYNAMIQUES (AVEC CORRECTION DU FALLBACK PRO)
  useEffect(() => {
    const fetchFeatures = async () => {
      if (!supabase || !userOrg?.plan) {
        setLoadingFeatures(false);
        return;
      }

      const isPro = userOrg.plan.toLowerCase() === 'pro' || userOrg.plan.toLowerCase() === 'premium';
      const defaultFeatures = isPro 
        ? { can_scan: true, can_bulk_update: true, can_export: true, can_view_stats: true, can_manage_pre_alerts: true } 
        : {};

      try {
        const { data } = await supabase
          .from('plans')
          .select('features')
          .eq('id', userOrg.plan.toLowerCase())
          .maybeSingle();
        
        if (data && data.features) {
          setPlanFeatures(data.features || defaultFeatures);
        } else {
          setPlanFeatures(defaultFeatures);
        }
      } catch (e) {
        console.error("Erreur chargement des permissions", e);
        setPlanFeatures(defaultFeatures);
      } finally {
        setLoadingFeatures(false);
      }
    };
    
    fetchFeatures();
  }, [supabase, userOrg?.plan]);

  // 🟢 2. LOGIQUE D'EXPIRATION CORRIGÉE (LE BUG DE 1970)
  const today = new Date();
  let daysRemaining = Infinity; 
  
  if (userOrg?.subscription_end_date) {
    const expirationDate = new Date(userOrg.subscription_end_date);
    const timeDiff = expirationDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Le compte n'est expiré QUE s'il y a une date de fin valide ET qu'elle est dépassée.
  const isExpired = userOrg?.plan !== 'free' && userOrg?.subscription_end_date && daysRemaining <= 0;
  const activeFeatures = isExpired ? {} : planFeatures;
  
  // L'onglet est accessible si la clé 'can_manage_pre_alerts' est à true dans la BDD
  const hasAccessToPreAlerts = !!activeFeatures.can_manage_pre_alerts;

  const fetchPreShipments = async () => {
    if (!supabase || !userOrg?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pre_shipments')
        .select('*')
        .eq('organization_id', userOrg.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPreShipments(data || []);
    } catch (err) {
      setAlertMessage("Erreur chargement pré-alertes : " + extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 🟢 3. SYNCHRONISATION DU CHARGEMENT
  useEffect(() => {
    if (loadingFeatures) return; // On attend que les permissions soient chargées

    if (hasAccessToPreAlerts) {
        fetchPreShipments();
    } else {
        setLoading(false); // On enlève le loading si c'est bloqué pour afficher l'écran flouté
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOrg?.id, hasAccessToPreAlerts, loadingFeatures]);

  useEffect(() => {
    if (selectedItem && weight && transportType && userOrg?.public_rates?.[transportType]) {
      const rate = userOrg.public_rates[transportType];
      const unitPrice = typeof rate === 'object' ? Number(rate.price || 0) : Number(rate || 0);
      setPrice(Number(weight) * unitPrice);
    } else if (weight === "") {
      setPrice("");
    }
  }, [weight, transportType, selectedItem, userOrg]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    let initialTransport = item.transport_type;
    if (initialTransport === 'aérien' || initialTransport === 'aerien') initialTransport = 'aerien_normal';
    setTransportType(initialTransport || 'aerien_normal');
    setWeight("");
    setPrice("");
  };

  const handleConvert = async () => {
    if (!weight) return setAlertMessage("Veuillez indiquer le poids réel.");
    setConverting(true);
    try {
      const payload = { 
        internal_id: selectedItem.tracking_code, 
        organization_id: userOrg.id, 
        client_name: selectedItem.client_name, 
        email: selectedItem.client_email, 
        phone: selectedItem.client_phone, 
        description: selectedItem.description, 
        weight_kg: Number(weight), 
        photo_path: selectedItem.photo_url, 
        transport_type: transportType, 
        status: "en_preparation", 
        payment_status: "unpaid", 
        amount_due_gnf: Number(price) || 0
      };

      const { data: newShipment, error: insertError } = await supabase.from('shipments').insert([payload]).select().single();
      if (insertError) throw insertError;

      await supabase.from('shipment_events').insert([{ shipment_id: newShipment.id, status: "en_preparation", note: "Colis réceptionné et validé depuis le portail client.", source: "manual" }]);
      await supabase.from('pre_shipments').delete().eq('id', selectedItem.id);

      setAlertMessage(`✅ Colis ${selectedItem.tracking_code} réceptionné !`);
      setSelectedItem(null);
      fetchPreShipments(); 
      if (onConverted) onConverted(); 
    } catch (err) {
      setAlertMessage("Erreur validation : " + extractErrorMessage(err));
    } finally {
      setConverting(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announceMsg.trim()) return setAlertMessage("Le message ne peut pas être vide.");
    setSendingAnnounce(true);
    try {
      const { error } = await supabase.from('announcements').insert([{
        sender_role: 'cargo',
        organization_id: userOrg.id,
        message: announceMsg.trim()
      }]);

      if (error) throw error;
      
      setAlertMessage("📢 Annonce enregistrée avec succès pour vos clients !");
      setShowAnnounceModal(false);
      setAnnounceMsg("");
    } catch (error) {
      setAlertMessage("Erreur d'enregistrement : " + extractErrorMessage(error));
    } finally {
      setSendingAnnounce(false);
    }
  };

  if (loading || loadingFeatures) return <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-slate-400" size={32} /></div>;

  return (
    <div className="relative">
      
      {/* 🟢 BLOCAGE PREMIUM DYNAMIQUE (FLOU) */}
      {!hasAccessToPreAlerts && (
        <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/60 rounded-[2.5rem] flex items-center justify-center border border-white/50">
           <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl flex flex-col items-center text-center max-w-md border border-slate-100">
             <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20">
               <Lock size={36} />
             </div>
             <h4 className="font-black text-3xl text-slate-900 mb-3 tracking-tight">Outils Premium</h4>
             <p className="text-slate-500 mb-8 leading-relaxed font-medium">Le portail de déclarations clients et l'envoi d'annonces en masse ne sont pas inclus dans votre forfait actuel.</p>
             <button onClick={() => setAlertMessage("Veuillez contacter l'administrateur ou aller dans les Paramètres pour changer de forfait.")} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-4 px-8 rounded-xl w-full transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex justify-center items-center gap-2 text-lg">
               <Crown size={24} className="text-amber-300"/> Mettre à niveau
             </button>
           </div>
        </div>
      )}

      {/* 🟢 CONTENU DU COMPOSANT (Flouté si non autorisé) */}
      <div className={`space-y-6 ${!hasAccessToPreAlerts ? 'opacity-30 pointer-events-none select-none filter blur-[6px] transition-all duration-500' : ''}`}>
        
        {/* En-tête et Bouton d'annonce */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><ImageIcon size={24} /></div>
            <div>
              <h3 className="font-black text-slate-900 text-2xl tracking-tight">Déclarations Clients</h3>
              <p className="text-slate-500 font-medium text-sm mt-0.5">Réceptionnez les pré-alertes de vos clients.</p>
            </div>
          </div>
          <button onClick={() => setShowAnnounceModal(true)} className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 px-5 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-sm active:scale-95 w-full sm:w-auto justify-center">
            <Megaphone size={18} /> Notifier les clients
          </button>
        </div>

     {/* 🟢 Bannière d'explication et Lien */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-5 sm:p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
          <div className="flex-1">
            <h4 className="font-black text-indigo-900 text-lg mb-2 flex items-center gap-2"><Package size={20} className="text-indigo-500"/> Automatisez votre réception</h4>
            <p className="text-sm text-indigo-700/80 font-medium leading-relaxed">
              Partagez ce lien avec vos clients <strong className="text-indigo-900">avant qu'ils n'envoient leurs colis</strong>. Ils pourront <strong className="text-indigo-900 bg-indigo-100/50 px-1.5 py-0.5 rounded">estimer le coût de leur expédition</strong>, déclarer le contenu et fournir la photo du carton. À l'arrivée, il ne vous restera plus qu'à valider le poids !
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-indigo-200 shadow-sm w-full md:w-auto">
            <code className="text-xs sm:text-sm font-bold text-slate-600 px-3 truncate max-w-[200px] sm:max-w-xs">{publicLink}</code>
            <button 
              onClick={handleCopyLink} 
              className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${linkCopied ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
            >
              {linkCopied ? <CheckCircle2 size={16}/> : <Copy size={16}/>}
              {linkCopied ? 'Copié !' : 'Copier'}
            </button>
          </div>
        </div>

        {preShipments.length === 0 ? (
          <div className="text-center p-16 bg-white rounded-[2rem] border-2 border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6"><Package size={40} /></div>
            <p className="text-slate-800 font-black text-xl mb-2">Aucun colis en attente.</p>
            <p className="text-slate-500 font-medium">Les déclarations de vos clients apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {preShipments.map(item => (
              <div key={item.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  {/* 🟢 LA MODIFICATION POUR LA PHOTO EST ICI (object-contain + p-2) */}
                  {item.photo_url ? (
                    <img src={item.photo_url} alt="Colis" className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-300 cursor-pointer" />
                  ) : (
                    <Package size={48} className="text-slate-300" />
                  )}
                  <div className="absolute top-3 right-3 bg-slate-900 text-white text-xs font-black tracking-widest px-3 py-1.5 rounded-lg shadow-lg">
                    {item.tracking_code}
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-slate-900 text-lg leading-tight">{item.client_name}</h4>
                      <p className="text-slate-500 text-sm font-bold flex items-center gap-1.5 mt-1"><Phone size={14}/> {item.client_phone}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl text-slate-500 border border-slate-100">
                      {item.transport_type === 'maritime' ? <Ship size={18} className="text-cyan-600"/> : item.transport_type === 'aerien_express' ? <Zap size={18} className="text-amber-500"/> : <Plane size={18} className="text-blue-600"/>}
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mb-4 line-clamp-2 border border-slate-100">{item.description}</p>
                  )}
                  
                  <button 
                    onClick={() => handleOpenModal(item)}
                    className="mt-auto w-full py-3.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-indigo-100 hover:border-indigo-600"
                  >
                    <CheckCircle2 size={18} /> Réceptionner ce colis
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 🟢 Modale de Validation de Réception */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-900 text-xl">Valider la réception</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 bg-indigo-50 text-indigo-800 p-4 rounded-xl border border-indigo-100">
                <Package size={20} />
                <p className="font-bold text-sm">Transfert du code <strong>{selectedItem.tracking_code}</strong> vers le guichet officiel.</p>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase ml-1 mb-1 block">Type de Transport</label>
                <Select value={transportType} onChange={(e) => setTransportType(e.target.value)}>
                  <option value="aerien_express">Express ✈️</option>
                  <option value="aerien_normal">Normal ✈️</option>
                  <option value="maritime">Bateau 🚢</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase ml-1 mb-1 block">Poids réel (Obligatoire)</label>
                <Input type="number" placeholder="Ex: 12.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase ml-1 mb-1 block">Prix à payer (GNF)</label>
                <Input type="number" placeholder="Calcul automatique ou manuel..." value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>

              <button 
                onClick={handleConvert}
                disabled={converting || !weight}
                className="w-full mt-4 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-all shadow-xl disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                {converting ? <RefreshCw className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>}
                Confirmer l'enregistrement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 Modale d'Annonce aux Clients */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 border-4 border-amber-400">
            <button onClick={() => setShowAnnounceModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-100 p-2.5 rounded-full transition-colors"><X size={20}/></button>
            
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl"><Megaphone size={28} /></div>
                <h3 className="text-3xl font-black text-slate-900">Annonce Globale</h3>
              </div>
              <p className="text-slate-500 font-medium mb-8">Envoyez une notification à tous vos clients enregistrés (changement de prix, promotion, retard de vol...).</p>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 ml-1 mb-2 block">Votre message</label>
                  <textarea 
                    value={announceMsg} 
                    onChange={(e) => setAnnounceMsg(e.target.value)}
                    placeholder="Ex: Bonjour à tous, nos tarifs baissent à partir de Lundi ! Le kilo est maintenant à..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium resize-none shadow-sm min-h-[120px]"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm font-medium">
                  <AlertCircle size={20} className="shrink-0 text-blue-500" />
                  <p>L'envoi de cette annonce consommera vos quotas d'e-mails ou de crédits SMS actuels en fonction du nombre de clients que vous avez dans votre base.</p>
                </div>

                <button 
                  onClick={handleSendAnnouncement}
                  disabled={sendingAnnounce || !announceMsg.trim()}
                  className="w-full mt-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-black py-4.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/30 active:scale-95 disabled:opacity-50 text-lg"
                >
                  {sendingAnnounce ? <RefreshCw className="animate-spin" size={24}/> : <Send size={20}/>}
                  {sendingAnnounce ? "Enregistrement en cours..." : "Diffuser l'annonce"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
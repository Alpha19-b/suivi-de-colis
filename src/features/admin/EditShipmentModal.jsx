import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, DollarSign, Edit, Lock, Mail, MapPin, MessageCircle, MessageSquare, RefreshCw, Smartphone, Users, Wallet, X, Calculator, ShieldAlert } from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';

const APP_URL = "https://guineatrack.com/";
const STATUS_HIERARCHY = ["en_preparation", "entrepot_chine", "international", "douane_guinee", "livre", "recupere"];

export const EditShipmentModal = ({ shipment, onClose, onSave, onUpdateInfo, wallet, currentUser, userOrg, supabase, currentUserRole }) => {
  const initialStatus = ["commande", "transit_chine"].includes(shipment.status) ? "en_preparation" : (shipment.status || "en_preparation");
  
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(shipment.payment_status || "unpaid");
  const [sendSmsAuto, setSendSmsAuto] = useState(true);
  const [sendEmailAuto, setSendEmailAuto] = useState(true);
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [modalError, setModalError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [actionWarning, setActionWarning] = useState({ show: false, execute: null, reasons: [] });
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [planSmsQuota, setPlanSmsQuota] = useState(0);
  
  const [formData, setFormData] = useState({
    client_name: shipment.client_name || "", email: shipment.email || "", phone: shipment.phone || "",
    description: shipment.description || "", transport_type: shipment.transport_type || "", estimated_delivery: shipment.estimated_delivery || "",
    weight_kg: shipment.weight_kg ?? "", amount_due_gnf: shipment.amount_due_gnf ?? ""
  });

  useEffect(() => {
    let isMounted = true;
    const fetchRealQuota = async () => {
      if (!supabase || !userOrg?.plan) return isMounted && setLoadingQuota(false);
      try {
        const { data } = await supabase.from('plans').select('monthly_sms_quota').eq('id', String(userOrg.plan).toLowerCase().trim()).maybeSingle();
        if (data && isMounted) setPlanSmsQuota(Number(data.monthly_sms_quota) || 0);
      } catch (err) { console.error(err); } finally { if (isMounted) setLoadingQuota(false); }
    };
    fetchRealQuota();
    return () => { isMounted = false; };
  }, [supabase, userOrg]);

  // 🟢 CALCULS & PERMISSIONS
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'superadmin';
  const isCompletelyLocked = shipment.status === 'recupere' && !isAdmin;
  const isFinanceLocked = shipment.payment_status === 'paid' && !isAdmin;
  const currentStatusIndex = STATUS_HIERARCHY.indexOf(initialStatus) !== -1 ? STATUS_HIERARCHY.indexOf(initialStatus) : 0;
  
  const smsAllowed = planSmsQuota + Number(wallet?.tracking_credits || 0); 
  const smsRemaining = Math.max(0, smsAllowed - Number(userOrg?.sms_sent_this_month || 0));
  const hasCredits = smsRemaining > 0 || planSmsQuota >= 100000; 

  const getCalculatedAmount = () => {
    if (formData.amount_due_gnf !== "" && formData.amount_due_gnf != null) return Number(formData.amount_due_gnf);
    if (formData.weight_kg && formData.transport_type && userOrg?.public_rates) {
      const unitPrice = Number(userOrg.public_rates[formData.transport_type]?.price || userOrg.public_rates[formData.transport_type] || 0);
      if (unitPrice > 0) return Number(formData.weight_kg) * unitPrice;
    }
    return null;
  };

  const buildUpdatedFields = () => ({
    client_name: formData.client_name, email: formData.email, phone: formData.phone, description: formData.description,
    estimated_delivery: formData.estimated_delivery || null, payment_status: paymentStatus,
    payment_method: paymentStatus === 'paid' && shipment.payment_status !== 'paid' ? 'liquide' : shipment.payment_method,
    weight_kg: isFinanceLocked ? shipment.weight_kg : (formData.weight_kg ? Number(formData.weight_kg) : null),
    amount_due_gnf: isFinanceLocked ? shipment.amount_due_gnf : getCalculatedAmount(),
    transport_type: isFinanceLocked ? (shipment.transport_type || null) : (formData.transport_type || null)
  });

  const checkActionRisks = (newStatus, newPaymentStatus, newAmount, newWeight) => {
    const reasons = [];
    if (isAdmin) {
      if (STATUS_HIERARCHY.indexOf(newStatus) !== -1 && STATUS_HIERARCHY.indexOf(newStatus) < currentStatusIndex) reasons.push("Faire reculer le statut du colis.");
      if (shipment.status === 'recupere' && newStatus !== 'recupere') reasons.push("Annuler le statut 'Récupéré'.");
      if (shipment.payment_status === 'paid' && newPaymentStatus !== 'paid') reasons.push("Annuler un paiement encaissé.");
      if (shipment.payment_status === 'paid' && newPaymentStatus === 'paid' && (Number(newAmount) !== Number(shipment.amount_due_gnf) || Number(newWeight) !== Number(shipment.weight_kg))) reasons.push("Modifier le prix/poids d'un colis payé.");
      if (newStatus === 'recupere' && newPaymentStatus !== 'paid') reasons.push("Remettre au client un colis non payé.");
    }
    return reasons;
  };

  // 🟢 MOTEUR UNIQUE D'ACTIONS
  const handleActionRequest = (actionType) => {
    if (isCompletelyLocked) return;

    if (actionType === 'SAVE_ALL') {
      if (!isAdmin && status === 'recupere' && paymentStatus !== 'paid') return setModalError("🚨 SÉCURITÉ : Le colis doit être payé avant la récupération.");
      if (!isAdmin && STATUS_HIERARCHY.indexOf(status) !== -1 && STATUS_HIERARCHY.indexOf(status) < currentStatusIndex) return setModalError("🚨 SÉCURITÉ : Seul un gérant peut faire reculer le statut.");
    }

    if (actionType === 'PAYMENT') return executeAction('PAYMENT');

    const fields = buildUpdatedFields();
    const risks = checkActionRisks(actionType === 'INFO_ONLY' ? shipment.status : status, paymentStatus, fields.amount_due_gnf, fields.weight_kg);
    
    if (risks.length > 0) setActionWarning({ show: true, reasons: risks, execute: () => executeAction(actionType, fields) });
    else executeAction(actionType, fields);
  };

  const executeAction = async (actionType, fields = null) => {
    setModalError(""); setLoading(true); setActionWarning({ show: false, execute: null, reasons: [] });
    try {
      if (actionType === 'PAYMENT') {
        await onUpdateInfo(shipment.id, { payment_status: 'paid', payment_method: 'liquide', payment_received_by: currentUser?.email || 'Staff Inconnu' });
      } else if (actionType === 'SAVE_ALL') {
        await onSave(shipment.id, status, note, fields, Boolean(hasCredits && sendSmsAuto), Boolean(formData.email && sendEmailAuto));
      } else {
        await onUpdateInfo(shipment.id, fields);
      }
      onClose(); 
    } catch (e) {
      setModalError(e.message?.includes("FRAUDE_BLOQUEE:") ? "❌ SÉCURITÉ : " + e.message.split("FRAUDE_BLOQUEE:")[1] : "Erreur : " + (e.message || "Erreur inconnue"));
    } finally { setLoading(false); setConfirmPaid(false); }
  };

  // 🟢 TEXTES & LIENS
  const cleanPhone = formData.phone ? formData.phone.replace(/\D/g, '') : '';
  let manualMessage = `Bonjour ${formData.client_name || 'Client'},\n\nVotre colis ${shipment.internal_id} a un nouveau statut : ${status}.\n\n`;
  if (note) manualMessage += `📝 Note : ${note}\n\n`;
  if (status !== 'recupere') manualMessage += `📍 Suivre mon colis :\n${APP_URL}?id=${shipment.internal_id}\n\n`;
  manualMessage += `🙏 Merci pour votre confiance.`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative max-h-[95vh] overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-200">
        
        {/* MODALE D'ALERTE */}
        {actionWarning.show && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md rounded-[2rem] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white border-2 border-rose-200 p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldAlert size={32} /></div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Attention Gérant</h3>
              <p className="text-sm font-medium text-slate-600 mb-4">Vous êtes sur le point de forcer l'action suivante :</p>
              <ul className="text-left bg-rose-50 text-rose-700 text-xs font-bold p-3 rounded-xl mb-6 space-y-2">
                {actionWarning.reasons.map((r, i) => <li key={i} className="flex items-start gap-2"><AlertCircle size={14} className="shrink-0 mt-0.5"/>{r}</li>)}
              </ul>
              <div className="flex gap-3">
                <button onClick={() => setActionWarning({ show: false, execute: null, reasons: [] })} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Annuler</button>
                <button onClick={actionWarning.execute} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md active:scale-95">Forcer</button>
              </div>
            </div>
          </div>
        )}

        <div className="sticky top-0 bg-white/90 backdrop-blur-xl px-6 py-5 border-b border-slate-100 flex justify-between items-center z-10 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3"><div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><Edit size={20} /></div> {shipment.internal_id}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
        </div>
        
        <div className="p-6 space-y-6">
          {isCompletelyLocked ? (
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 text-center shadow-sm animate-in fade-in">
              <div className="w-20 h-20 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={40} /></div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Dossier Verrouillé</h3>
              <p className="text-slate-600 font-medium">Ce colis a déjà été récupéré. Seul un gérant peut le déverrouiller.</p>
            </div>
          ) : (
            <>
              {modalError && <div className="bg-rose-50 text-rose-600 font-bold p-4 rounded-xl border border-rose-200 flex items-center gap-3 text-sm animate-in fade-in shadow-sm"><AlertCircle size={18} className="shrink-0" /> {modalError}</div>}

              <div className="space-y-5">
                <div className="relative">
                  <Select label="Mettre à jour le statut" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="en_preparation">En préparation</option><option value="entrepot_chine">Entrepôt Chine</option><option value="international">Vol International / Maritime</option><option value="douane_guinee">Douane</option><option value="livre">Disponible à l'agence</option><option value="recupere">Récupéré par le client</option>
                  </Select>
                  <ChevronDown className="absolute right-4 top-[38px] text-slate-400 pointer-events-none" size={20} />
                </div>
            
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Note (Visible par le client)</label>
                  <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : Attention produit fragile." className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none shadow-sm" />
                </div>

                <div className="pt-2 space-y-3">
                  <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-sm ${formData.email ? 'bg-blue-50 border-blue-200 text-blue-900 cursor-pointer' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <input id="cb-email" type="checkbox" checked={sendEmailAuto && !!formData.email} onChange={(e) => setSendEmailAuto(e.target.checked)} disabled={!formData.email} className="mt-0.5 w-6 h-6 text-blue-600 border-blue-300 rounded cursor-pointer disabled:opacity-50" />
                    <label htmlFor="cb-email" className={`flex flex-col flex-grow select-none ${formData.email ? 'cursor-pointer' : 'cursor-not-allowed'}`}><span className="text-sm font-black flex items-center gap-2"><Mail size={16}/> Envoyer un E-mail</span><span className="text-xs font-bold mt-1 opacity-80">{formData.email ? `À : ${formData.email}` : "Saisissez un e-mail plus bas."}</span></label>
                  </div>

                  {loadingQuota ? (
                    <div className="flex items-start gap-3 p-4 rounded-2xl border bg-slate-50 border-slate-200 text-slate-500 shadow-sm animate-pulse"><RefreshCw size={20} className="animate-spin shrink-0" /><p className="text-sm font-bold mt-0.5">Vérification SMS...</p></div>
                  ) : hasCredits ? (
                    <div className="flex items-start gap-3 p-4 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm cursor-pointer animate-in fade-in">
                      <input id="cb-sms" type="checkbox" checked={sendSmsAuto} onChange={(e) => setSendSmsAuto(e.target.checked)} className="mt-0.5 w-6 h-6 text-emerald-600 border-emerald-300 rounded cursor-pointer" />
                      <label htmlFor="cb-sms" className="flex flex-col cursor-pointer select-none flex-grow"><span className="text-sm font-black flex items-center gap-2">Envoyer un SMS</span><span className="text-xs text-emerald-700/80 font-bold mt-1">{planSmsQuota >= 100000 ? "Forfait SMS Illimité" : `Il reste ${smsRemaining} crédit(s).`}</span></label>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border bg-amber-50 border-amber-200 text-amber-900 shadow-sm flex items-start gap-3"><AlertCircle size={20} className="text-amber-500 shrink-0" /><div><p className="text-sm font-black">SMS inactif</p><p className="text-xs font-medium mt-1">Vous n'avez plus de crédits.</p></div></div>
                  )}

                  <button onClick={() => handleActionRequest('SAVE_ALL')} disabled={loading} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] text-lg flex items-center justify-center gap-2">
                    {loading ? <RefreshCw className="animate-spin" /> : <MapPin size={20} />} Enregistrer l'étape
                  </button>
                </div>
              </div>

              <div className="relative flex items-center py-2"><div className="flex-grow border-t border-slate-200"></div><span className="shrink-0 mx-4 text-slate-400 text-xs font-black uppercase">OU</span><div className="flex-grow border-t border-slate-200"></div></div>

              {cleanPhone && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-3xl border border-indigo-100/50 shadow-sm">
                  <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-4 flex items-center gap-2"><MessageCircle size={14} /> Messages Manuels</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a href={`sms:${cleanPhone}?body=${encodeURIComponent(manualMessage)}`} className="flex-1 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold"><Smartphone size={18} /> SMS</a>
                    <a href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(manualMessage)}`} target="_blank" rel="noreferrer" className="flex-1 bg-[#25D366] hover:bg-[#1DA851] text-white border-transparent py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold"><MessageSquare size={18} /> WhatsApp</a>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={14} /> Finance</h4>
                {shipment.payment_status === 'paid' ? (
                  <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-lg mb-3"><div className="bg-emerald-100 p-1.5 rounded-full"><CheckCircle2 size={20} /></div> Colis réglé</div>
                    <div className="flex flex-col gap-2">
                      {shipment.payment_received_by && <span className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl font-bold border flex items-center gap-2"><Users size={14} className="text-slate-400" /> Caisse : {shipment.payment_received_by}</span>}
                      {shipment.payment_method !== 'liquide' && <span className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-xl font-bold border border-green-100 flex items-center gap-2 w-fit"><Smartphone size={14} /> Mobile Money</span>}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col gap-4">
                    <span className="font-black text-amber-900 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500" /> En attente de paiement</span>
                    {confirmPaid ? (
                      <div className="flex flex-col gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in">
                        <span className="text-sm font-bold text-amber-900 text-center">Confirmer l'encaissement ?</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleActionRequest('PAYMENT')} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md">Oui, valider</button>
                          <button onClick={() => setConfirmPaid(false)} disabled={loading} className="flex-1 bg-white text-slate-700 font-bold py-3 rounded-xl border border-slate-200">Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmPaid(true)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-md"><Wallet size={18} /> Encaisser en Espèces</button>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                 <button onClick={() => setShowDetails(!showDetails)} className="flex items-center justify-between w-full text-sm font-black text-slate-800 hover:text-blue-600 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                   <span className="flex items-center gap-2"><Edit size={16} /> Modifier les détails du colis</span>
                   <div className={`p-1 rounded-full transition-transform ${showDetails ? 'rotate-180 bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}><ChevronDown size={18} /></div>
                 </button>
                 
                 {showDetails && (
                   <div className="mt-3 p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-lg space-y-5 animate-in fade-in">
                     {isFinanceLocked && isAdmin && <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2"><ShieldAlert size={16} className="shrink-0" /> Gérant : Colis encaissé. Confirmation requise pour modifier prix/poids.</div>}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <Input placeholder="Nom du Client" value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} />
                       <Input placeholder="Téléphone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                     </div>
                     <Input type="email" placeholder="Adresse E-mail" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                     <Input placeholder="Contenu (ex: Électronique)" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <Input type="number" placeholder={formData.transport_type === 'maritime' ? "Volume (CBM)" : "Poids (Kg)"} value={formData.weight_kg} onChange={(e) => setFormData({...formData, weight_kg: e.target.value})} disabled={isFinanceLocked && !isAdmin} />
                       <Select value={formData.transport_type} onChange={(e) => setFormData({...formData, transport_type: e.target.value})} disabled={isFinanceLocked && !isAdmin}>
                          <option value="">Transport</option><option value="aerien_express">Aérien Express</option><option value="aerien_normal">Aérien Normal</option><option value="maritime">Maritime</option>
                        </Select>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <Input type="date" label="Arrivée prévue" value={formData.estimated_delivery} onChange={(e) => setFormData({...formData, estimated_delivery: e.target.value})} />
                       <div className="flex flex-col gap-1.5">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Prix fixé (GNF)</label>
                         <div className="flex gap-2">
                           <input type="number" placeholder="Total" value={formData.amount_due_gnf} onChange={(e) => setFormData({...formData, amount_due_gnf: e.target.value})} disabled={isFinanceLocked && !isAdmin} className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium shadow-sm ${isFinanceLocked && !isAdmin ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`} />
                           {(!isFinanceLocked || isAdmin) && (
                             <button type="button" onClick={() => { const rate = userOrg?.public_rates?.[formData.transport_type]; const up = typeof rate === 'object' ? rate.price : rate; if (formData.weight_kg && up > 0) setFormData({...formData, amount_due_gnf: Number(formData.weight_kg) * Number(up)}); }} className="bg-slate-100 text-slate-600 hover:bg-blue-500 hover:text-white px-4 rounded-xl shadow-sm"><Calculator size={20} /></button>
                           )}
                         </div>
                       </div>
                     </div>
                     <button onClick={() => handleActionRequest('INFO_ONLY')} disabled={loading} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-md active:scale-95">
                       {loading ? <RefreshCw className="animate-spin mx-auto" /> : "Sauvegarder les modifications"}
                     </button>
                   </div>
                 )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
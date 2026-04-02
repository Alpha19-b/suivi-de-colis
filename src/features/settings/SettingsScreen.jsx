import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Building2, MessageSquare, 
  Palette, UploadCloud, Image, Key, Lock, 
  DollarSign, Plane, Anchor, Users, Crown, 
  Mail, RefreshCw, Trash2, Sparkles, AlertTriangle,
  MapPin, Ship, HelpCircle, X
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { extractErrorMessage } from '../../utils/helpers';
import { SubscriptionModal } from '../billing/SubscriptionModal';

export const SettingsScreen = ({ userOrg, setUserOrg, currentUser, supabase, setView, showAlert }) => {
  const [loading, setLoading] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  const [staffList, setStaffList] = useState([]);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [showSubscription, setShowSubscription] = useState(false);
  
  // 🟢 État pour la modale d'aide Google Maps
  const [showMapHelp, setShowMapHelp] = useState(false);
  
  const [planLimits, setPlanLimits] = useState({ max_users: 1 });

  useEffect(() => {
    const fetchLimits = async () => {
      if (!supabase || !userOrg) return;
      if (userOrg.plan) {
        const { data: planData } = await supabase.from('plans').select('max_users').eq('id', userOrg.plan).maybeSingle();
        if (planData) setPlanLimits(planData);
      }
    };
    fetchLimits();
  }, [supabase, userOrg]);

  // ==========================================
  // 🧠 GESTION DE L'EXPIRATION
  // ==========================================
  const daysRemaining = Math.ceil((new Date(userOrg?.subscription_end_date || 0).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  const isExpired = userOrg?.plan !== 'free' && daysRemaining <= 0;

  // Variables Équipe
  const maxStaff = isExpired ? 1 : (planLimits.max_users ?? 1);
  const isStaffLimitReached = staffList.length >= maxStaff;

  // 🟢 INTÉGRATION DES NOUVELLES ADRESSES ICI
  const [formData, setFormData] = useState({
      name: userOrg?.name || "",
      whatsapp_number: userOrg?.whatsapp_number || "",
      logo_url: userOrg?.logo_url || "",
      primary_color: userOrg?.primary_color || "#0f172a",
      china_air_express: userOrg?.china_air_express || "",
      china_air_normal: userOrg?.china_air_normal || "",
      china_maritime: userOrg?.china_maritime || "",
      conakry_address: userOrg?.conakry_address || "",
      rates: {
        aerien_express: userOrg?.public_rates?.aerien_express?.price || "",
        aerien_normal: userOrg?.public_rates?.aerien_normal?.price || "",
        maritime: userOrg?.public_rates?.maritime?.price || "",
      }
  });

  const fetchStaff = async () => {
    if (!supabase || !userOrg) return;
    try {
      const { data, error } = await supabase.from('staff_members').select('*').eq('organization_id', userOrg.id);
      if (!error && data) setStaffList(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStaff();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userOrg]);

  const handleSaveInfo = async () => {
    if (!supabase || !userOrg) return;
    setLoading(true);
    try {
      // 🟢 ENVOI DES NOUVELLES ADRESSES A SUPABASE
      const payload = {
        name: formData.name,
        whatsapp_number: formData.whatsapp_number,
        logo_url: formData.logo_url,
        primary_color: formData.primary_color,
        china_air_express: formData.china_air_express,
        china_air_normal: formData.china_air_normal,
        china_maritime: formData.china_maritime,
        conakry_address: formData.conakry_address,
        public_rates: {
          ...userOrg.public_rates,
          aerien_express: { label: "Aérien Express", price: Number(formData.rates.aerien_express) },
          aerien_normal: { label: "Aérien Normal", price: Number(formData.rates.aerien_normal) },
          maritime: { label: "Maritime", price: Number(formData.rates.maritime) },
        }
      };

      const { data, error } = await supabase.from('organizations').update(payload).eq('id', userOrg.id).select().single();
      if (error) throw error;
      
      setUserOrg(data);
      showAlert("✅ Paramètres enregistrés avec succès !");
    } catch (err) {
      showAlert("Erreur lors de la sauvegarde : " + extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword) return showAlert("Veuillez saisir votre ancien mot de passe.");
    if (!newPassword || newPassword.length < 6) return showAlert("Le nouveau mot de passe doit contenir au moins 6 caractères.");
    setIsChangingPwd(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: oldPassword });
      if (signInError) throw new Error("Ancien mot de passe incorrect.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showAlert("✅ Votre mot de passe a été mis à jour !");
      setOldPassword(""); setNewPassword("");
    } catch (err) {
      showAlert("Erreur : " + extractErrorMessage(err));
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleLogoUpload = async (event) => {
    if (!supabase) return showAlert("Système non prêt.");
    try {
      setIsUploadingLogo(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileName = `logo_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("shipment-photos").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("shipment-photos").getPublicUrl(fileName);
      setFormData((prev) => ({ ...prev, logo_url: data.publicUrl }));
    } catch (e) {
      showAlert("Erreur lors de l'upload: " + extractErrorMessage(e));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleInviteStaff = async () => {
    if (!newStaffEmail || !newStaffName) return showAlert("Nom et Email requis");
    if (isStaffLimitReached) return showAlert("Limite d'équipe atteinte pour votre forfait actuel.");
    
    setIsInviting(true);
    try {
      const { error } = await supabase.functions.invoke('invite-staff', {
        body: { email: newStaffEmail, full_name: newStaffName, organization_id: userOrg.id, role: 'agent' }
      });
      if (error) throw error;
      showAlert("✅ Invitation envoyée à " + newStaffName + ".");
      setNewStaffEmail(""); setNewStaffName(""); fetchStaff();
    } catch (err) {
      showAlert("❌ Erreur invitation : " + extractErrorMessage(err));
    } finally {
      setIsInviting(false);
    }
  };

  const executeDeleteStaff = async () => {
    if (!staffToDelete) return;
    setLoading(true);
    try {
      await supabase.from('staff_members').delete().eq('user_id', staffToDelete.user_id);
      await supabase.rpc('delete_user_account', { target_user_id: staffToDelete.user_id });
      showAlert("✅ Utilisateur supprimé.");
      fetchStaff();
    } catch (err) {
      showAlert("Erreur : " + extractErrorMessage(err));
    } finally {
      setLoading(false); setStaffToDelete(null);
    }
  };

  const handleRoleChange = async (staffId, newRole) => {
    setUpdatingRole(staffId);
    try {
      const { error } = await supabase.from('staff_members').update({ role: newRole }).eq('user_id', staffId);
      if (error) throw error;
      showAlert("✅ Droits mis à jour !");
      fetchStaff();
    } catch (err) {
      showAlert("❌ Erreur modification droits : " + extractErrorMessage(err));
    } finally {
      setUpdatingRole(null);
    }
  };

  return (
    <div className="flex-grow p-4 sm:p-8 animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
      {staffToDelete && (
        <ConfirmModal title="Révoquer l'accès ?" message="Le compte de cet utilisateur sera définitivement supprimé." onConfirm={executeDeleteStaff} onCancel={() => setStaffToDelete(null)} loading={loading} />
      )}
      
      {/* 🟢 MODALE D'AIDE GOOGLE MAPS */}
      {showMapHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowMapHelp(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
              <X size={24} />
            </button>
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <MapPin size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Lien Google Maps</h3>
            <p className="text-slate-500 font-medium mb-6">Comment obtenir le lien exact de votre point de retrait pour vos clients :</p>
            
            <ol className="space-y-4 text-sm font-bold text-slate-700">
              <li className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">1</span>Ouvrez l'application Google Maps sur votre téléphone.</li>
              <li className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">2</span>Cherchez votre point de retrait ou maintenez votre doigt sur la carte pour placer un repère.</li>
              <li className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">3</span>Appuyez sur le bouton <strong>Partager</strong> en bas de l'écran.</li>
              <li className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">4</span>Appuyez sur <strong>Copier le lien</strong>.</li>
              <li className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">5</span>Revenez ici et collez le lien dans le champ.</li>
            </ol>

            <button onClick={() => setShowMapHelp(false)} className="w-full mt-8 bg-slate-900 text-white font-black py-4 rounded-xl shadow-xl active:scale-95 transition-all">
              J'ai compris
            </button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm"><Settings size={32} /></div>
            Paramètres
          </h2>
          <p className="text-slate-500 font-medium mt-2 text-lg">Personnalisez votre espace et vos options.</p>
        </div>
        <button onClick={handleSaveInfo} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-xl transition-all flex items-center gap-3 shadow-xl shadow-slate-900/20 active:scale-95 whitespace-nowrap text-lg">
          {loading ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />} Sauvegarder
        </button>
      </div>

      {showSubscription && (
        <SubscriptionModal onClose={() => setShowSubscription(false)} currentPlan={userOrg?.plan || 'free'} supabase={supabase} userOrg={userOrg} showAlert={showAlert} />
      )}

      {/* --- SECTION ABONNEMENT EN BANNIÈRE --- */}
      <div className="mb-8">
        <div className={`w-full rounded-[2.5rem] p-8 sm:p-10 text-white shadow-xl relative overflow-hidden group flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${isExpired ? 'bg-rose-600' : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-700'}`}>
           <div className="absolute top-0 right-0 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
             <Crown size={240} className="-mt-16 -mr-16" />
           </div>
           
           <div className="relative z-10 flex-1">
             <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/20 mb-4 inline-block shadow-sm">
               {isExpired ? 'Abonnement Expiré' : 'Plan Actuel'}
             </span>
             <h3 className="text-4xl sm:text-5xl font-black tracking-tight mb-2 uppercase drop-shadow-sm">
               {isExpired ? 'VERROUILLÉ' : (userOrg?.plan || 'Free')}
             </h3>
             <p className={`${isExpired ? 'text-rose-100' : 'text-blue-100'} font-medium text-lg max-w-lg`}>
               {isExpired ? "Renouvelez votre abonnement pour débloquer l'ensemble de vos outils et quotas." : `Vous profitez pleinement de tous les avantages du forfait ${userOrg?.plan || 'Free'}.`}
             </p>
           </div>

           <button onClick={() => setShowSubscription(true)} className={`relative z-10 bg-white font-black px-8 py-5 rounded-2xl shadow-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3 whitespace-nowrap text-lg w-full md:w-auto ${isExpired ? 'text-rose-600 shadow-rose-900/20' : 'text-indigo-600 shadow-indigo-900/20'}`}>
             <Sparkles size={24} /> {isExpired ? 'Renouveler maintenant' : 'Gérer mon forfait'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><Building2 className="text-slate-400" /> Informations générales</h3>
            <div className="space-y-5">
              <Input label="Nom de l'entreprise" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} icon={Building2} />
              <Input label="Numéro WhatsApp (Service Client)" value={formData.whatsapp_number} onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})} icon={MessageSquare} placeholder="Ex: 224620000000" />
            </div>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><Palette className="text-slate-400" /> Personnalisation visuelle</h3>
            <div className="space-y-8">
              <div className="space-y-2 w-full">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Logo</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className={`cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 px-6 py-4 border border-slate-200 transition-all ${isUploadingLogo ? "opacity-50" : ""}`}>
                    {isUploadingLogo ? <RefreshCw className="animate-spin" size={20} /> : <UploadCloud size={20} />} Uploader
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                  </label>
                  <div className="relative flex-grow">
                    <Image className="absolute left-4 top-4 text-slate-400" size={20} />
                    <input type="text" placeholder="Ou lien URL..." value={formData.logo_url} onChange={(e) => setFormData({...formData, logo_url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                  </div>
                </div>
              </div>
              {formData.logo_url && <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex justify-center"><img src={formData.logo_url} alt="Aperçu" className="max-h-20 object-contain" /></div>}
              <Input label="Couleur principale (Thème)" type="color" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} />
            </div>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-orange-500">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><Key className="text-orange-500" /> Sécurité</h3>
            <div className="space-y-5">
              <Input type="password" label="Ancien mot de passe" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} icon={Key} />
              <Input type="password" label="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={Lock} />
              <button onClick={handleUpdatePassword} disabled={isChangingPwd || !newPassword || !oldPassword} className="w-full bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-800 font-black py-4 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 mt-2">
                {isChangingPwd ? "Mise à jour..." : "Modifier le mot de passe"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><DollarSign className="text-slate-400" /> Tarifs Expéditions</h3>
            <div className="space-y-5">
              <Input label="Aérien Express (Prix / Kg)" type="number" value={formData.rates.aerien_express} onChange={(e) => setFormData({...formData, rates: {...formData.rates, aerien_express: e.target.value}})} icon={Plane} />
              <Input label="Aérien Normal (Prix / Kg)" type="number" value={formData.rates.aerien_normal} onChange={(e) => setFormData({...formData, rates: {...formData.rates, aerien_normal: e.target.value}})} icon={Plane} />
              <Input label="Maritime (Prix / CBM)" type="number" value={formData.rates.maritime} onChange={(e) => setFormData({...formData, rates: {...formData.rates, maritime: e.target.value}})} icon={Anchor} />
            </div>
          </div>

          {/* 🟢 NOUVELLE SECTION ADRESSES ENTREPÔTS */}
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-xl border border-slate-200">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <MapPin size={24} />
                </div>
                Adresses des Entrepôts
              </h3>
              <p className="text-slate-500 font-medium">
                Renseignez vos adresses de réception en Chine et de retrait à Conakry pour guider vos clients.
              </p>
            </div>

            <div className="space-y-8">
              {/* 🇨🇳 ENTREPÔTS CHINE */}
              <div className="p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-3xl space-y-6">
                <h4 className="font-black text-slate-800 text-lg flex items-center gap-2 mb-2">
                  🇨🇳 Adresses de réception (Chine)
                </h4>
                
                <div className="space-y-5">
                  <Input 
                    label="Adresse Aérien Express" 
                    placeholder="Ex: Guangzhou, Baiyun District..." 
                    value={formData.china_air_express} 
                    onChange={(e) => setFormData({...formData, china_air_express: e.target.value})} 
                    icon={Plane} 
                  />
                  <Input 
                    label="Adresse Aérien Normal" 
                    placeholder="Ex: Guangzhou..." 
                    value={formData.china_air_normal} 
                    onChange={(e) => setFormData({...formData, china_air_normal: e.target.value})} 
                    icon={Plane} 
                  />
                  <Input 
                    label="Adresse Maritime" 
                    placeholder="Ex: Shenzhen Port..." 
                    value={formData.china_maritime} 
                    onChange={(e) => setFormData({...formData, china_maritime: e.target.value})} 
                    icon={Ship} 
                  />
                </div>
              </div>

              {/* 🇬🇳 ENTREPÔT CONAKRY */}
              <div className="p-6 sm:p-8 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    🇬🇳 Point de retrait (Conakry)
                  </h4>
                  <button 
                    onClick={() => setShowMapHelp(true)}
                    className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <HelpCircle size={14} /> Comment faire ?
                  </button>
                </div>
                
                <Input 
                  label="Adresse ou Lien Google Maps" 
                  placeholder="Collez le lien Maps ici..." 
                  value={formData.conakry_address} 
                  onChange={(e) => setFormData({...formData, conakry_address: e.target.value})} 
                  icon={MapPin} 
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-[2rem] shadow-sm border border-slate-100">
             <div className="mb-8 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-2"><Users className="text-slate-400" /> Équipe</h3>
                  <p className="text-slate-500 font-medium">Gérez les accès de vos collaborateurs.</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border ${isStaffLimitReached ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                   {isStaffLimitReached ? <AlertTriangle size={14}/> : <Users size={14}/>}
                   Effectif : {staffList.length} / {maxStaff}
                </div>
             </div>
             
             {isStaffLimitReached ? (
               <div className="mb-8 bg-slate-50 p-6 rounded-[2rem] border border-slate-200 text-center animate-in zoom-in-95 duration-300">
                 <div className="w-16 h-16 bg-white text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border border-amber-100"><Crown size={32}/></div>
                 <h4 className="font-black text-slate-900 text-lg mb-2">Limite d'équipe atteinte</h4>
                 <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">Votre forfait actuel ne permet plus d'ajouter de membres. Passez au niveau supérieur pour agrandir votre équipe.</p>
                 <button onClick={() => setShowSubscription(true)} className="bg-slate-900 text-white font-black px-8 py-4 rounded-2xl shadow-xl active:scale-95 transition-all w-full flex items-center justify-center gap-3">
                    <Sparkles size={20} className="text-amber-400" /> Passer au forfait supérieur
                 </button>
               </div>
             ) : (
               <div className="flex flex-col gap-4 mb-10 bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-100/50">
                 <Input placeholder="Nom complet de l'agent" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} icon={Users} />
                 <div className="flex flex-col sm:flex-row gap-3">
                   <div className="flex-grow">
                      <div className="relative group">
                        <Mail className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="Email professionnel" className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-sm transition-all" />
                      </div>
                   </div>
                   <button onClick={handleInviteStaff} disabled={isInviting || !newStaffEmail || !newStaffName} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 whitespace-nowrap">
                     {isInviting ? <RefreshCw className="animate-spin" size={20} /> : "Inviter"}
                   </button>
                 </div>
               </div>
             )}

             <div className="space-y-4">
               {staffList.map((staff) => (
                 <div key={staff.user_id} className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 group hover:bg-white hover:shadow-md transition-all">
                   <div className={`w-14 h-14 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${staff.role === 'admin' ? 'bg-slate-900' : 'bg-indigo-500'}`}>
                     {staff.full_name ? staff.full_name.charAt(0).toUpperCase() : "?"}
                   </div>
                   <div className="flex-grow">
                     <p className="font-black text-slate-900 text-lg">{staff.full_name || "Agent sans nom"} {staff.user_id === currentUser?.id && <span className="text-indigo-500 text-xs">(Moi)</span>}</p>
                     {staff.user_id !== currentUser?.id ? (
                       <div className="mt-1 flex items-center gap-2">
                         <select value={staff.role} onChange={(e) => handleRoleChange(staff.user_id, e.target.value)} disabled={updatingRole === staff.user_id} className="text-[11px] uppercase tracking-widest font-black px-3 py-1.5 rounded-lg border bg-white cursor-pointer transition-colors border-slate-200 hover:border-indigo-400 outline-none">
                           <option value="agent">Agent</option><option value="admin">Gérant</option>
                         </select>
                         {updatingRole === staff.user_id && <RefreshCw className="animate-spin text-indigo-500" size={14} />}
                       </div>
                     ) : <p className="text-[11px] uppercase tracking-widest font-black mt-1 text-slate-400">{staff.role === 'admin' ? "Gérant" : "Agent"}</p>}
                   </div>
                   {staff.user_id !== currentUser?.id && (
                     <button onClick={() => setStaffToDelete(staff)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={22} /></button>
                   )}
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
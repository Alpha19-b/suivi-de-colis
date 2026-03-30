import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, RefreshCw, LogOut, ShieldCheck, 
  CalendarDays, Settings, Users, CreditCard, X, Save, Mail,
  Crown, Plus, UserPlus, FileText, Trash2, Smartphone, Banknote, TrendingUp, Send, ChevronDown,
  Zap, Edit2, Package, MessageSquare, Sliders, ArrowDownToLine, CheckCircle2, Megaphone, Percent
} from 'lucide-react';
import { formatCurrency, extractErrorMessage } from '../../utils/helpers';
import { Input } from '../../components/ui/Input';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const SuperAdminScreen = ({ supabase, showAlert, setUserOrg, setView, fetchAdminData }) => {
  const [activeTab, setActiveTab] = useState("cargos"); 
  const [orgs, setOrgs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rechargePacks, setRechargePacks] = useState([]);
  const [clientPayments, setClientPayments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [payoutSearch, setPayoutSearch] = useState('');
  const [payoutSort, setPayoutSort] = useState('amount_desc'); 

  const [financeFilterOrg, setFinanceFilterOrg] = useState("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingPack, setEditingPack] = useState(null);
  
  const [godModeOrg, setGodModeOrg] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', whatsapp_number: '', admin_email: '', admin_name: '', primary_color: '#0f172a' });
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [orgToDelete, setOrgToDelete] = useState(null);

  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState("");
  const [sendingAnnounce, setSendingAnnounce] = useState(false);

  const [platformSettings, setPlatformSettings] = useState({ platform_fee_percent: 2, gateway_fee_percent: 1.5 });
  const [isEditingFees, setIsEditingFees] = useState(false);

  const fetchSaasData = async () => {
    setLoading(true);
    try {
      const { data: settingsData } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle();
      if (settingsData) {
        setPlatformSettings({
          platform_fee_percent: Number(settingsData.platform_fee_percent) || 0,
          gateway_fee_percent: Number(settingsData.gateway_fee_percent) || 0
        });
      }

      const { data: orgData, error: orgError } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
      if (orgError) throw orgError;

      const { data: walletsData } = await supabase.from('organization_wallets').select('organization_id, tracking_credits');

      const mergedOrgs = (orgData || []).map(org => {
        const wallet = walletsData?.find(w => w.organization_id === org.id);
        return { ...org, tracking_credits: wallet?.tracking_credits || 0 };
      });
      setOrgs(mergedOrgs);

      const { data: reqData, error: reqError } = await supabase.from('partner_requests').select('*').order('created_at', { ascending: false });
      if (reqError) throw reqError;
      setRequests(reqData || []);

      const { data: planData, error: planError } = await supabase.from('plans').select('*').order('price_gnf', { ascending: true });
      if (!planError) setPlans(planData || []);

      const { data: paymentData, error: payError } = await supabase.from('saas_payments').select('*, organizations(name)').order('created_at', { ascending: false });
      if (!payError) setPayments(paymentData || []);

      const { data: packsData, error: packsError } = await supabase.from('recharge_packs').select('*').order('quantity', { ascending: true });
      if (!packsError) setRechargePacks(packsData || []);
      
      const { data: clientPayData, error: clientPayError } = await supabase
        .from('payments')
        .select('*, organizations(name)')
        .eq('type', 'shipment_payment')
        .order('created_at', { ascending: false });
      if (!clientPayError) setClientPayments(clientPayData || []);

    } catch (e) {
      showAlert("Erreur chargement SaaS: " + extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaasData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPayments = payments.filter(p => financeFilterOrg === "all" || p.organization_id === financeFilterOrg);

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + Number(p.amount_gnf), 0);
  const thisMonthRevenue = filteredPayments
    .filter(p => new Date(p.created_at).getMonth() === new Date().getMonth() && new Date(p.created_at).getFullYear() === new Date().getFullYear())
    .reduce((sum, p) => sum + Number(p.amount_gnf), 0);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { error } = await supabase.from('platform_settings').upsert({
        id: 1,
        platform_fee_percent: Number(platformSettings.platform_fee_percent),
        gateway_fee_percent: Number(platformSettings.gateway_fee_percent)
      });
      if (error) throw error;
      showAlert("✅ Paramètres financiers mis à jour avec succès !");
      setIsEditingFees(false);
      fetchSaasData();
    } catch(e) {
      showAlert("❌ Erreur : " + extractErrorMessage(e) + " (Avez-vous créé la table platform_settings ?)");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenGodMode = (org) => {
    setGodModeOrg({
      ...org,
      subscription_end_date: org.subscription_end_date ? new Date(org.subscription_end_date).toISOString().split('T')[0] : '',
      gift_emails: '', 
      gift_sms: ''     
    });
  };

  const handleSaveGodMode = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { error: orgError } = await supabase.from('organizations').update({ 
        subscription_end_date: new Date(godModeOrg.subscription_end_date).toISOString()
      }).eq('id', godModeOrg.id);
      
      if (orgError) throw orgError;

      const giftEmails = Number(godModeOrg.gift_emails);
      if (giftEmails) {
        const { error: emailError } = await supabase.rpc('add_extra_email_quota', {
          p_org_id: godModeOrg.id,
          p_amount: giftEmails
        });
        
        if (emailError) {
          const currentOrg = orgs.find(o => o.id === godModeOrg.id);
          const newQuota = (currentOrg.extra_email_quota || 0) + giftEmails;
          await supabase.from('organizations').update({ extra_email_quota: newQuota }).eq('id', godModeOrg.id);
        }
      }

      const giftSms = Number(godModeOrg.gift_sms);
      if (giftSms) {
        const { error: smsError } = await supabase.rpc('add_tracking_credit', {
          p_org_id: godModeOrg.id,
          p_amount: giftSms
        });
        if (smsError) throw smsError;
      }

      showAlert(`✅ God Mode appliqué avec succès pour ${godModeOrg.name} !`);
      setGodModeOrg(null);
      fetchSaasData();
    } catch (error) {
      showAlert("❌ Erreur : " + extractErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async (orgId, newPlanId) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('organizations').update({ plan: newPlanId }).eq('id', orgId);
      if (error) throw error;
      showAlert(`✅ Forfait modifié en ${newPlanId.toUpperCase()} !`);
      fetchSaasData();
    } catch (error) {
      showAlert("❌ Erreur de modification : " + extractErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminder = async (org) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('saas-emails', {
        body: { action: 'manual_reminder', organization_id: org.id, email: org.email_contact }
      });
      if (error) throw new Error("L'Edge Function 'saas-emails' a échoué.");
      showAlert(`✉️ E-mail de relance envoyé avec succès à ${org.name} !`);
    } catch (error) {
      showAlert(`⚠️ Erreur d'envoi : ${extractErrorMessage(error)}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!formData.name) return showAlert("Le nom du Cargo est obligatoire.");
    setActionLoading(true);
    try {
      if (editingOrg) {
        const { error } = await supabase.from('organizations').update({ name: formData.name, whatsapp_number: formData.whatsapp_number, primary_color: formData.primary_color }).eq('id', editingOrg.id);
        if (error) throw error;
        showAlert("✅ Cargo mis à jour avec succès.");
      } else {
        if (!formData.admin_email || !formData.admin_name) return showAlert("Email et nom du gérant obligatoires pour la création.");
        
        const baseSlug = formData.name.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const generatedSlug = `${baseSlug}-${randomSuffix}`;

        const { data: newOrg, error: orgError } = await supabase.from('organizations').insert([{
          name: formData.name, slug: generatedSlug, whatsapp_number: formData.whatsapp_number, primary_color: formData.primary_color, email_contact: formData.admin_email, plan: 'essentiel', subscription_end_date: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString() 
        }]).select().single();
        if (orgError) throw orgError;

        if (pendingRequestId) {
          await supabase.from('partner_requests').delete().eq('id', pendingRequestId);
          setPendingRequestId(null);
        }

        const { error: inviteError } = await supabase.functions.invoke('invite-staff', { 
            body: { 
                email: formData.admin_email, 
                full_name: formData.admin_name, 
                organization_id: newOrg.id, 
                org_name: formData.name,
                role: 'admin',
                is_onboarding: true
            } 
        });

        if (inviteError) {
            showAlert("⚠️ Cargo créé, mais l'invitation e-mail a échoué.");
        } else {
            showAlert("✅ Cargo validé : Mois PRO offert et invitation envoyée au gérant !");
        }
      }
      setIsModalOpen(false);
      fetchSaasData();
    } catch (e) {
      showAlert("❌ Erreur : " + extractErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRequest = (req) => {
    setEditingOrg(null);
    setPendingRequestId(req.id);
    setFormData({ name: req.company_name, whatsapp_number: req.phone, admin_email: req.email, admin_name: req.contact_name, primary_color: '#0f172a' });
    setIsModalOpen(true);
  };

  const executeDeleteOrg = async () => {
    if (!orgToDelete) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', orgToDelete.id);
      if (error) throw error;
      showAlert(`✅ Le cargo "${orgToDelete.name}" a été définitivement supprimé.`);
      fetchSaasData();
    } catch (e) {
      showAlert("❌ Erreur : " + extractErrorMessage(e));
    } finally {
      setActionLoading(false);
      setOrgToDelete(null);
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { error } = await supabase.from('plans').update({ 
        price_gnf: Number(editingPlan.price_gnf) || 0, 
        max_users: Number(editingPlan.max_users) || 1, 
        monthly_email_quota: Number(editingPlan.monthly_email_quota) || 0,
        monthly_sms_quota: Number(editingPlan.monthly_sms_quota) || 0,
        features: editingPlan.features || {} 
      }).eq('id', editingPlan.id);
      
      if (error) throw error;
      showAlert("✅ Forfait mis à jour !");
      setEditingPlan(null);
      fetchSaasData();
    } catch (error) {
      showAlert("Erreur sauvegarde : " + extractErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePack = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { error } = await supabase.from('recharge_packs').update({ 
        name: editingPack.name,
        quantity: Number(editingPack.quantity) || 0,
        price_gnf: Number(editingPack.price_gnf) || 0,
        highlight: editingPack.highlight
      }).eq('id', editingPack.id);
      
      if (error) throw error;
      showAlert("✅ Pack mis à jour avec succès !");
      setEditingPack(null);
      fetchSaasData();
    } catch (error) {
      showAlert("Erreur sauvegarde : " + extractErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsSettled = async (orgId, orgName) => {
    if (!window.confirm(`Confirmez-vous avoir viré l'argent au cargo ${orgName} ?`)) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payout_status: 'settled' })
        .eq('organization_id', orgId)
        .eq('type', 'shipment_payment')
        .or('payout_status.eq.pending,payout_status.is.null'); 
        
      if (error) throw error;

      setClientPayments(prev => prev.map(p => 
        (p.organization_id === orgId && p.type === 'shipment_payment') 
        ? { ...p, payout_status: 'settled' } 
        : p
      ));

      showAlert(`✅ Les fonds pour ${orgName} ont été marqués comme reversés.`);
      fetchSaasData();
    } catch (e) {
      showAlert("❌ Erreur : " + extractErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuperAdminAnnouncement = async () => {
    if (!announceMsg.trim()) return showAlert("Le message ne peut pas être vide.");
    setSendingAnnounce(true);
    try {
      const { error } = await supabase.from('announcements').insert([{
        sender_role: 'superadmin',
        message: announceMsg.trim()
      }]);

      if (error) throw error;
      
      showAlert("📢 Annonce globale envoyée à tous les cargos !");
      setShowAnnounceModal(false);
      setAnnounceMsg("");
    } catch (error) {
      showAlert("Erreur d'envoi : " + extractErrorMessage(error));
    } finally {
      setSendingAnnounce(false);
    }
  };

  const filteredOrgs = orgs.filter(o => o.name?.toLowerCase().includes(search.toLowerCase()) || o.email_contact?.toLowerCase().includes(search.toLowerCase()));

  let processedPayouts = Object.entries(
    clientPayments
      .filter(p => p.payout_status === 'pending' || !p.payout_status)
      .reduce((acc, curr) => {
        if (!acc[curr.organization_id]) {
          acc[curr.organization_id] = { 
            orgId: curr.organization_id, 
            name: curr.organizations?.name || 'Inconnu', 
            totalGross: 0, 
            platformFee: 0,
            gatewayFee: 0,
            count: 0 
          };
        }
        
        const amount = Number(curr.amount_gnf) || 0;
        const pFee = curr.platform_fee_applied !== null && curr.platform_fee_applied !== undefined ? Number(curr.platform_fee_applied) : platformSettings.platform_fee_percent;
        const gFee = curr.gateway_fee_applied !== null && curr.gateway_fee_applied !== undefined ? Number(curr.gateway_fee_applied) : platformSettings.gateway_fee_percent;

        acc[curr.organization_id].totalGross += amount;
        acc[curr.organization_id].platformFee += amount * (pFee / 100);
        acc[curr.organization_id].gatewayFee += amount * (gFee / 100);
        acc[curr.organization_id].count += 1;
        
        return acc;
      }, {})
  ).map(([_, data]) => data);

  if (payoutSearch) {
    processedPayouts = processedPayouts.filter(d => d.name.toLowerCase().includes(payoutSearch.toLowerCase()));
  }

  processedPayouts.sort((a, b) => {
    if (payoutSort === 'amount_desc') return b.totalGross - a.totalGross;
    if (payoutSort === 'amount_asc') return a.totalGross - b.totalGross;
    if (payoutSort === 'name_asc') return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {orgToDelete && (
        <ConfirmModal title="Supprimer le Cargo ?" message={`Êtes-vous ABSOLUMENT sûr de vouloir supprimer "${orgToDelete.name}" ?`} onConfirm={executeDeleteOrg} onCancel={() => setOrgToDelete(null)} loading={actionLoading} />
      )}

      <div className="bg-slate-900 text-white pt-8 pb-20 px-4 sm:px-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3.5 rounded-2xl shadow-lg border border-white/10"><ShieldCheck size={32} className="text-white" /></div>
              <div><h1 className="text-3xl font-black tracking-tight">SaaS Manager</h1><p className="text-slate-400 font-medium text-sm mt-1">Supervision globale Logistique Pro</p></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAnnounceModal(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 border border-amber-400">
                <Megaphone size={18} /> Annonce Globale
              </button>

              <button onClick={() => { setEditingOrg(null); setPendingRequestId(null); setFormData({ name: '', whatsapp_number: '', admin_email: '', admin_name: '', primary_color: '#0f172a' }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 border border-indigo-400">
                <Plus size={18} /> Nouveau Cargo
              </button>
              <button onClick={async () => { await supabase?.auth.signOut(); setView('home'); }} className="flex items-center gap-2 bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 border border-white/5">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-6 border-b border-slate-700 pb-px overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('cargos')} className={`pb-4 px-2 font-bold text-sm sm:text-base border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'cargos' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}><Building2 size={18} /> Agences Actives</button>
            <button onClick={() => setActiveTab('requests')} className={`pb-4 px-2 font-bold text-sm sm:text-base border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'requests' ? 'border-amber-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}><FileText size={18} /> Demandes Entrantes {requests.length > 0 && <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] ml-1">{requests.length}</span>}</button>
            <button onClick={() => setActiveTab('plans')} className={`pb-4 px-2 font-bold text-sm sm:text-base border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'plans' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}><Crown size={18} /> Tarifs & Limites</button>
            <button onClick={() => setActiveTab('finances')} className={`pb-4 px-2 font-bold text-sm sm:text-base border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'finances' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}><Banknote size={18} /> Finances SaaS</button>
            <button onClick={() => setActiveTab('payouts')} className={`pb-4 px-2 font-bold text-sm sm:text-base border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'payouts' ? 'border-purple-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}><ArrowDownToLine size={18} /> Reversements</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-8 relative z-20">
        
        {loading ? (
          <div className="flex justify-center p-20 bg-white rounded-[2rem] shadow-xl border border-slate-200"><RefreshCw className="animate-spin text-indigo-500" size={40} /></div>
        ) : (
          <>
            {activeTab === 'cargos' && (
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-6 sm:p-10">
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-10">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Rechercher par nom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
                  </div>
                  <button onClick={fetchSaasData} className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-2xl transition-all shadow-sm active:scale-95"><RefreshCw size={18} /> Actualiser</button>
                </div>

                <div className="space-y-6">
                  {filteredOrgs.map(org => {
                    const daysRemaining = Math.ceil((new Date(org.subscription_end_date || 0).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    const isExpired = daysRemaining <= 0;
                    
                    const currentPlan = plans.find(p => p.id === org.plan) || { monthly_email_quota: 0, monthly_sms_quota: 0 };
                    
                    // 🟢 LA MAGIE DU SNAPSHOT EST ICI
                    const baseEmailLimit = (org.base_email_limit !== undefined && org.base_email_limit !== null) ? org.base_email_limit : (currentPlan.monthly_email_quota || 0);
                    const baseSmsLimit = (org.base_sms_limit !== undefined && org.base_sms_limit !== null) ? org.base_sms_limit : (currentPlan.monthly_sms_quota || 0);

                    const totalEmailsAllowed = baseEmailLimit + (org.extra_email_quota || 0);
                    const emailsSent = org.emails_sent_this_month || 0;
                    
                    const smsForfait = baseSmsLimit;
                    const smsPortefeuille = org.tracking_credits || 0; 
                    const totalSmsAllowed = smsForfait + smsPortefeuille;
                    const smsSent = org.sms_sent_this_month || 0;

                    const smsRemainingDisplay = `${smsSent} / ${totalSmsAllowed > 100000 ? '∞' : totalSmsAllowed} SMS`;

                    return (
                      <div key={org.id} className={`bg-white rounded-[2rem] border ${isExpired ? 'border-rose-200 shadow-rose-100' : 'border-slate-200 hover:border-indigo-300'} transition-all duration-300 overflow-hidden group shadow-sm`}>
                        
                        <div className={`p-6 sm:px-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 ${isExpired ? 'bg-rose-50/30' : 'bg-slate-50/50'}`}>
                          <div className="flex items-center gap-5">
                            {org.logo_url ? (
                              <img src={org.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-contain border border-slate-200 p-1 bg-white shadow-sm" />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-sm" style={{ backgroundColor: org.primary_color || '#0f172a' }}>{org.name.charAt(0).toUpperCase()}</div>
                            )}
                            <div>
                              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                                {org.name} {org.plan === 'pro' && <Crown size={16} className="text-amber-500" title="PRO" />}
                              </h3>
                              <p className="text-sm text-slate-500 font-medium mt-0.5">{org.email_contact || 'Pas d\'email'} • Inscrit le {new Date(org.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button 
                              onClick={() => handleOpenGodMode(org)} 
                              className="p-3 text-amber-500 hover:text-white hover:bg-amber-500 rounded-xl transition-colors border border-amber-200 shadow-sm bg-amber-50 flex items-center gap-2 font-bold text-sm" 
                              title="Contrôle Manuel (God Mode)"
                            >
                              <Sliders size={18} /> Gérer Cadeaux
                            </button>
                            
                            <button onClick={() => { setEditingOrg(org); setPendingRequestId(null); setFormData({ name: org.name, whatsapp_number: org.whatsapp_number || '', primary_color: org.primary_color || '#0f172a', admin_email: '', admin_name: '' }); setIsModalOpen(true); }} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-slate-200 bg-white shadow-sm" title="Modifier les infos"><Settings size={20} /></button>
                            <button onClick={() => setOrgToDelete(org)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 bg-white shadow-sm" title="Supprimer le cargo"><Trash2 size={20} /></button>
                            <button onClick={async () => { setUserOrg(org); await fetchAdminData(org.id); setView('admin'); }} className="flex-1 sm:flex-none px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap ml-2">Voir L'Espace</button>
                          </div>
                        </div>

                        <div className="p-6 sm:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
                          
                          <div className="flex flex-col justify-center">
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Abonnement</p>
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center gap-1.5 font-black text-sm px-3 py-1.5 rounded-lg border shadow-sm ${isExpired ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                                <CalendarDays size={16} />{isExpired ? 'Expiré' : `${daysRemaining} Jours restants`}
                              </div>
                              <button onClick={() => handleSendReminder(org)} disabled={actionLoading} className="p-2 bg-slate-50 border border-slate-200 hover:text-blue-600 rounded-lg shadow-sm transition-all" title="Relancer le gérant par E-mail">
                                <Send size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Consommation</p>
                            <div className="flex flex-col gap-2 text-sm font-bold">
                              <div className="flex items-center gap-2 text-slate-600" title="E-mails envoyés / E-mails autorisés">
                                <Mail size={16} className="text-blue-400"/> {emailsSent} / {totalEmailsAllowed > 100000 ? '∞' : totalEmailsAllowed} e-mails
                              </div>
                              <div className="flex items-center gap-2 text-slate-600" title="SMS envoyés / SMS autorisés">
                                <MessageSquare size={16} className="text-emerald-400"/> {smsRemainingDisplay}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
                             <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Forfait Actif</p>
                             <div className="relative">
                                <select
                                  value={org.plan || 'free'}
                                  onChange={(e) => handleChangePlan(org.id, e.target.value)}
                                  disabled={actionLoading}
                                  className={`w-full appearance-none bg-slate-50 border border-slate-200 font-black text-sm uppercase px-4 py-2 pr-10 rounded-xl shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${org.plan === 'pro' ? 'text-blue-600 border-blue-200' : org.plan === 'scale' ? 'text-purple-600 border-purple-200' : 'text-slate-700'}`}
                                >
                                  {plans.map(p => (
                                    <option key={p.id} value={p.id} className="text-slate-800 font-bold">{p.name.toUpperCase()}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                             </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ONGLET : DEMANDES ENTRANTES */}
            {activeTab === 'requests' && (
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-6 sm:p-10">
                <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><UserPlus size={24}/></div> Nouvelles Inscriptions</h3>
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div key={req.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-6 bg-gradient-to-r from-amber-50 to-white rounded-2xl border border-amber-100 gap-6 shadow-sm">
                      <div>
                        <h4 className="font-black text-slate-900 text-xl flex items-center gap-3 mb-2">{req.company_name} <span className="bg-amber-500 text-white text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-black shadow-sm">Nouveau</span></h4>
                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
                          <span className="flex items-center gap-1.5"><Users size={16} className="text-slate-400"/> {req.contact_name}</span>
                          <span className="flex items-center gap-1.5"><Mail size={16} className="text-slate-400"/> {req.email}</span>
                        </div>
                      </div>
                      <button onClick={() => handleApproveRequest(req)} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-4 rounded-xl shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-all"><ShieldCheck size={18} /> Valider l'Espace</button>
                    </div>
                  ))}
                  {requests.length === 0 && <div className="text-center py-16"><div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck size={32}/></div><p className="text-slate-500 font-bold text-lg">Tout est à jour. Aucune demande.</p></div>}
                </div>
              </div>
            )}

            {/* ONGLET : FORFAITS ET PACKS */}
            {activeTab === 'plans' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {plans.map(plan => (
                    <div key={plan.id} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 flex flex-col relative group hover:-translate-y-2 transition-all duration-300">
                      <div className="mb-6 border-b border-slate-100 pb-6"><h3 className="text-2xl font-black text-slate-900 mb-1">{plan.name}</h3><div className="text-4xl font-black text-emerald-600 tracking-tight">{formatCurrency(plan.price_gnf)}</div><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">/ mois</span></div>
                      <div className="space-y-5 mb-8 flex-grow">
                        <div className="flex items-center gap-4"><div className="p-2.5 bg-slate-50 rounded-xl text-slate-500"><Users size={20}/></div><div><p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Agents</p><p className="font-bold text-slate-800">{plan.max_users > 1000 ? 'Illimité' : plan.max_users}</p></div></div>
                        <div className="flex items-center gap-4"><div className="p-2.5 bg-slate-50 rounded-xl text-slate-500"><Mail size={20}/></div><div><p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">E-mails Auto</p><p className="font-bold text-slate-800">{plan.monthly_email_quota > 100000 ? 'Illimité' : plan.monthly_email_quota}</p></div></div>
                        <div className="flex items-center gap-4"><div className="p-2.5 bg-slate-50 rounded-xl text-slate-500"><Smartphone size={20}/></div><div><p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">SMS Auto</p><p className="font-bold text-slate-800">{plan.monthly_sms_quota > 100000 ? 'Illimité' : (plan.monthly_sms_quota || 0)}</p></div></div>
                      </div>
                      <button onClick={() => setEditingPlan(plan)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-xl flex items-center justify-center gap-2 transition-colors"><Settings size={18} /> Modifier Tarifs</button>
                    </div>
                  ))}
                </div>

                <div className="mt-12">
                  <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <Zap className="text-amber-500" /> Packs de Recharge (Pay-as-you-go)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                      <h4 className="font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MessageSquare size={18} className="text-emerald-500"/> Packs SMS
                      </h4>
                      <div className="space-y-3">
                        {rechargePacks.filter(p => p.type === 'sms').map(pack => (
                          <div key={pack.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-colors">
                            <div>
                              <p className="font-black text-slate-800 flex items-center gap-2">
                                {pack.name} {pack.highlight && <span className="bg-amber-100 text-amber-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Populaire</span>}
                              </p>
                              <p className="text-sm font-medium text-slate-500">{new Intl.NumberFormat('fr-FR').format(pack.quantity)} crédits • {new Intl.NumberFormat('fr-FR').format(pack.price_gnf)} GNF</p>
                            </div>
                            <button onClick={() => setEditingPack(pack)} className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 rounded-xl shadow-sm transition-all">
                              <Edit2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                      <h4 className="font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Mail size={18} className="text-blue-500"/> Packs E-mails
                      </h4>
                      <div className="space-y-3">
                        {rechargePacks.filter(p => p.type === 'email').map(pack => (
                          <div key={pack.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
                            <div>
                              <p className="font-black text-slate-800 flex items-center gap-2">
                                {pack.name} {pack.highlight && <span className="bg-amber-100 text-amber-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Populaire</span>}
                              </p>
                              <p className="text-sm font-medium text-slate-500">{new Intl.NumberFormat('fr-FR').format(pack.quantity)} crédits • {new Intl.NumberFormat('fr-FR').format(pack.price_gnf)} GNF</p>
                            </div>
                            <button onClick={() => setEditingPack(pack)} className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-xl shadow-sm transition-all">
                              <Edit2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET FINANCES */}
            {activeTab === 'finances' && (
              <div className="space-y-8 animate-in fade-in">
                
                <div className="bg-white p-4 sm:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Building2 size={20}/></div>
                    <div>
                      <p className="font-black text-slate-800">Filtrer les revenus</p>
                      <p className="text-xs text-slate-500 font-medium">Analysez les performances d'un cargo spécifique</p>
                    </div>
                  </div>
                  <div className="relative w-full sm:w-auto min-w-[250px]">
                    <select
                      value={financeFilterOrg}
                      onChange={(e) => setFinanceFilterOrg(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 font-black text-sm px-5 py-3 pr-10 rounded-xl shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
                    >
                      <option value="all">🌍 Toutes les agences (Global)</option>
                      {orgs.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18}/>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-blue-50"><Banknote size={120} className="rotate-12" /></div>
                    <div className="relative z-10">
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Revenu Total</p>
                      <h2 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">{formatCurrency(totalRevenue)}</h2>
                    </div>
                  </div>
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-emerald-50"><TrendingUp size={120} className="" /></div>
                    <div className="relative z-10">
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Revenu ce mois-ci</p>
                      <h2 className="text-5xl sm:text-6xl font-black text-emerald-600 tracking-tight">{formatCurrency(thisMonthRevenue)}</h2>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 p-6 sm:p-10">
                  <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><CreditCard size={24}/></div>
                    Historique des Transactions
                  </h3>
                  
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b-2 border-slate-100 text-xs uppercase tracking-widest text-slate-400">
                          <th className="pb-4 px-4 font-black">Date & Heure</th>
                          <th className="pb-4 px-4 font-black">Cargo</th>
                          <th className="pb-4 px-4 font-black">Type</th>
                          <th className="pb-4 px-4 font-black">Méthode</th>
                          <th className="pb-4 px-4 font-black text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-bold text-slate-700">
                        {filteredPayments.map((p) => (
                          <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                            <td className="py-5 px-4 text-slate-500 font-medium">
                              {new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-5 px-4 text-slate-900 font-black">{p.organizations?.name || 'Cargo Inconnu'}</td>
                            <td className="py-5 px-4">
                              <span className="uppercase text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest shadow-sm">
                                {p.type === 'shipment_payment' ? 'Paiement Colis' : p.type === 'credit_recharge' || p.type?.startsWith('pack_') ? 'Recharge SaaS' : p.plan_id || 'Abonnement'}
                              </span>
                            </td>
                            <td className="py-5 px-4 capitalize text-slate-500 font-medium">
                              <span className="flex items-center gap-2">
                                {p.payment_method === 'djomi' ? <Smartphone size={16} className="text-slate-400"/> : <Banknote size={16} className="text-slate-400"/>}
                                {p.payment_method}
                              </span>
                            </td>
                            <td className="py-5 px-4 text-right text-emerald-600 font-black text-lg">
                              +{formatCurrency(p.amount_gnf)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {filteredPayments.length === 0 && (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><CreditCard size={32}/></div>
                        <p className="text-slate-500 font-bold text-lg">Aucun paiement trouvé pour cette sélection.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* 🟢 ONGLET REVERSEMENTS (AVEC COMMISSION DYNAMIQUE) */}
            {activeTab === 'payouts' && (
              <div className="space-y-8 animate-in fade-in">
                
                {/* ⚙️ Panneau des Paramètres Financiers (Djomi & Commission) */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row gap-6 items-center justify-between shadow-sm">
                  <div>
                    <h3 className="text-xl font-black text-indigo-900 mb-2 flex items-center gap-2">
                      <Percent size={20} /> Paramètres de Commission
                    </h3>
                    <p className="text-indigo-700 font-medium text-sm">
                      Modifiez votre marge globale. Le calcul du net à reverser s'ajustera automatiquement pour tous les cargos.
                    </p>
                  </div>
                  
                  {isEditingFees ? (
                    <form onSubmit={handleSaveSettings} className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto bg-white p-3 rounded-2xl shadow-sm border border-indigo-200">
                      <div className="flex items-center gap-2 px-3 border-r border-slate-100">
                        <span className="text-xs font-black text-slate-400 uppercase">Frais Djomi</span>
                        <input type="number" step="0.1" value={platformSettings.gateway_fee_percent} onChange={e => setPlatformSettings({...platformSettings, gateway_fee_percent: e.target.value})} className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-slate-700 outline-none focus:border-indigo-500" required />
                        <span className="text-slate-400 font-bold">%</span>
                      </div>
                      <div className="flex items-center gap-2 px-3">
                        <span className="text-xs font-black text-slate-400 uppercase">Votre Frais (Cargos)</span>
                        <input type="number" step="0.1" value={platformSettings.platform_fee_percent} onChange={e => setPlatformSettings({...platformSettings, platform_fee_percent: e.target.value})} className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-indigo-700 outline-none focus:border-indigo-500" required />
                        <span className="text-slate-400 font-bold">%</span>
                      </div>
                      <button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 rounded-xl transition-all shadow-md active:scale-95 ml-2">
                        {actionLoading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-6 w-full lg:w-auto bg-white p-4 rounded-2xl shadow-sm border border-indigo-200">
                      <div className="text-center px-4 border-r border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Frais Djomi</p>
                        <p className="text-lg font-black text-slate-700">{platformSettings.gateway_fee_percent}%</p>
                      </div>
                      <div className="text-center px-4 border-r border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Commission Cargo</p>
                        <p className="text-lg font-black text-indigo-600">{platformSettings.platform_fee_percent}%</p>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bénéfice Net GT</p>
                        <p className="text-lg font-black text-emerald-500 bg-emerald-50 px-3 py-0.5 rounded-lg border border-emerald-100">
                          {(platformSettings.platform_fee_percent - platformSettings.gateway_fee_percent).toFixed(1)}%
                        </p>
                      </div>
                      <button onClick={() => setIsEditingFees(true)} className="ml-2 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors text-slate-600">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
                  <div className="mb-8">
                    <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3">
                      <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><ArrowDownToLine size={24}/></div>
                      Reversements en attente
                    </h3>
                    <p className="text-slate-500 font-medium">
                      Fonds encaissés via Djomi.
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative w-full md:flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="Rechercher un cargo..." 
                        value={payoutSearch} 
                        onChange={(e) => setPayoutSearch(e.target.value)} 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium transition-all" 
                      />
                    </div>
                    <div className="relative w-full md:w-72">
                      <select 
                        value={payoutSort} 
                        onChange={(e) => setPayoutSort(e.target.value)} 
                        className="w-full appearance-none bg-slate-50 border border-slate-200 font-bold text-sm px-4 py-3 pr-10 rounded-xl shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-700"
                      >
                        <option value="amount_desc">Trier : Plus grand montant</option>
                        <option value="amount_asc">Trier : Plus petit montant</option>
                        <option value="name_asc">Trier : Nom (A-Z)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18}/>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {processedPayouts.map((data) => {
                      const grossTotal = data.totalGross;
                      const platformFee = data.platformFee;
                      const gatewayFee = data.gatewayFee;
                      const netToCargo = grossTotal - platformFee;
                      const netProfit = platformFee - gatewayFee;

                      return (
                        <div key={data.orgId} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col hover:-translate-y-1 transition-all duration-300">
                          
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                              {data.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900">{data.name}</h4>
                              <p className="text-xs font-bold text-slate-500">{data.count} colis payés via Djomi</p>
                            </div>
                          </div>

                          <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Net à reverser au Cargo</div>
                          <div className="text-4xl font-black text-slate-900 tracking-tight mb-4">
                            {formatCurrency(netToCargo)}
                          </div>

                          <div className="flex justify-start mb-6">
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm flex items-center gap-1.5" title={`Djomi prend ${formatCurrency(gatewayFee)}`}>
                              <TrendingUp size={12} /> Ton Bénéfice : {formatCurrency(netProfit)}
                            </span>
                          </div>

                          <button 
                            onClick={() => handleMarkAsSettled(data.orgId, data.name)}
                            disabled={actionLoading}
                            className="mt-auto w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                          >
                            {actionLoading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                            Marquer comme Reversé
                          </button>
                        </div>
                      );
                    })}
                    
                    {processedPayouts.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400"><CheckCircle2 size={32}/></div>
                        <p className="text-slate-500 font-bold text-lg">
                          {payoutSearch ? "Aucun cargo ne correspond à votre recherche." : "Aucun reversement en attente. Vous êtes à jour !"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 🟢 NOUVELLE MODALE GOD MODE (DISTRIBUTEUR DE CADEAUX) */}
      {godModeOrg && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md relative animate-in zoom-in-95 border-4 border-amber-400">
            <button onClick={() => setGodModeOrg(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-100 p-2.5 rounded-full"><X size={20}/></button>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 text-amber-600 p-2 rounded-xl"><Sliders size={24} /></div>
              <h3 className="text-3xl font-black text-slate-900">God Mode</h3>
            </div>
            <p className="text-slate-500 font-medium mb-8">Offrez des crédits au cargo <strong>{godModeOrg.name}</strong> en toute discrétion (ces montants s'additionneront à ses achats).</p>
            
            <form onSubmit={handleSaveGodMode} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2"><CalendarDays size={14}/> Date d'expiration exacte</label>
                <Input type="date" value={godModeOrg.subscription_end_date} onChange={e => setGodModeOrg({...godModeOrg, subscription_end_date: e.target.value})} required />
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Faire un cadeau (Ajout)</p>
                
                <Input 
                  label="E-mails à offrir (+/-)" 
                  type="number" 
                  value={godModeOrg.gift_emails} 
                  onChange={e => setGodModeOrg({...godModeOrg, gift_emails: e.target.value})} 
                  icon={Mail} 
                  placeholder="Ex: 100"
                />
                
                <Input 
                  label="Crédits SMS à offrir (+/-)" 
                  type="number" 
                  value={godModeOrg.gift_sms} 
                  onChange={e => setGodModeOrg({...godModeOrg, gift_sms: e.target.value})} 
                  icon={MessageSquare} 
                  placeholder="Ex: 50"
                />
                <p className="text-[10px] text-slate-400 font-bold mt-1">Laissez vide pour ne rien ajouter. Tapez un nombre négatif pour retirer.</p>
              </div>

              <button type="submit" disabled={actionLoading} className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-black py-4.5 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-xl shadow-amber-500/20 text-lg">
                {actionLoading ? <RefreshCw className="animate-spin" size={24} /> : <Zap size={20} />} Appliquer les changements
              </button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-100 p-2.5 rounded-full transition-colors"><X size={20} /></button>
            <h3 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Building2 size={24}/></div> {editingOrg ? "Modifier le Cargo" : "Créer un Cargo"}</h3>
            <div className="space-y-5">
              <Input label="Nom de l'Entreprise" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} icon={Building2} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Numéro WhatsApp" value={formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} icon={Smartphone} />
                <Input type="color" label="Couleur de Marque" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})} />
              </div>
              {!editingOrg && (
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4 bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                   <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-2"><Users size={16}/> Accès Gérant</h4>
                   <Input label="Nom du Gérant" value={formData.admin_name} onChange={e => setFormData({...formData, admin_name: e.target.value})} icon={Users} />
                   <Input type="email" label="Email de connexion" value={formData.admin_email} onChange={e => setFormData({...formData, admin_email: e.target.value})} icon={Mail} />
                </div>
              )}
              <button onClick={handleSaveOrg} disabled={actionLoading} className="w-full mt-6 bg-slate-900 text-white font-black py-4.5 rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition-all text-lg flex items-center justify-center">
                 {actionLoading ? <RefreshCw className="animate-spin" size={24} /> : "Enregistrer le Cargo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setEditingPlan(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-100 p-2.5 rounded-full"><X size={20}/></button>
            <h3 className="text-3xl font-black text-slate-900 mb-2">Forfait {editingPlan.name}</h3>
            <p className="text-slate-500 font-medium mb-8">Ajustez les limites de ce forfait. La mise à jour sera immédiate pour tous les cargos.</p>
            
            <form onSubmit={handleSavePlan} className="space-y-5">
              <Input label="Prix GNF / mois" type="number" value={editingPlan.price_gnf} onChange={e => setEditingPlan({...editingPlan, price_gnf: e.target.value})} icon={CreditCard} required />
              <Input label="Employés Maximum" type="number" value={editingPlan.max_users} onChange={e => setEditingPlan({...editingPlan, max_users: e.target.value})} icon={Users} required />
              <Input label="Quota E-mails/mois" type="number" value={editingPlan.monthly_email_quota} onChange={e => setEditingPlan({...editingPlan, monthly_email_quota: e.target.value})} icon={Mail} required />
              <Input label="Quota SMS/mois" type="number" value={editingPlan.monthly_sms_quota || 0} onChange={e => setEditingPlan({...editingPlan, monthly_sms_quota: e.target.value})} icon={Smartphone} required />
              
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 mt-6">
                <p className="text-xs font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 pb-2">Fonctionnalités Incluses</p>
                
                {[
                  { key: 'can_scan', label: 'Scanner QR Code Rapide' },
                  { key: 'can_bulk_update', label: 'Mise à jour en Masse (Sélection)' },
                  { key: 'can_export', label: 'Exportation Excel / CSV' },
                  { key: 'can_view_stats', label: 'Bilan Financier & Statistiques' },
                  { key: 'can_manage_pre_alerts', label: 'Déclarations Clients (Pré-alertes)' }
                ].map(feature => (
                  <label key={feature.key} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={editingPlan.features?.[feature.key] || false} 
                      onChange={e => setEditingPlan({
                        ...editingPlan, 
                        features: { ...(editingPlan.features || {}), [feature.key]: e.target.checked }
                      })} 
                      className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" 
                    />
                    <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{feature.label}</span>
                  </label>
                ))}
              </div>

              <button type="submit" disabled={actionLoading} className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4.5 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 text-lg">
                {actionLoading ? <RefreshCw className="animate-spin" size={24} /> : <Save size={20} />} Sauvegarder
              </button>
            </form>
          </div>
        </div>
      )}

      {editingPack && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setEditingPack(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">Modifier le Pack</h3>
            <p className="text-slate-500 font-medium mb-8">Ajustez le tarif ou le nombre de crédits de ce pack {editingPack.type.toUpperCase()}.</p>

            <form onSubmit={handleSavePack} className="space-y-5">
              <Input label="Nom du Pack" value={editingPack.name} onChange={e => setEditingPack({...editingPack, name: e.target.value})} icon={Package} required />
              <Input label="Quantité de crédits" type="number" value={editingPack.quantity} onChange={e => setEditingPack({...editingPack, quantity: e.target.value})} icon={editingPack.type === 'sms' ? MessageSquare : Mail} required />
              <Input label="Prix (GNF)" type="number" value={editingPack.price_gnf} onChange={e => setEditingPack({...editingPack, price_gnf: e.target.value})} icon={CreditCard} required />
              
              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={editingPack.highlight} onChange={e => setEditingPack({...editingPack, highlight: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="font-bold text-slate-700">Mettre en avant (Label "Populaire")</span>
              </label>

              <button type="submit" disabled={actionLoading} className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4.5 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 text-lg">
                {actionLoading ? <RefreshCw className="animate-spin" size={24} /> : <Save size={20} />} Sauvegarder
              </button>
            </form>
          </div>
        </div>
      )}

      {showAnnounceModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 border-4 border-amber-400">
            <button onClick={() => setShowAnnounceModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-100 p-2.5 rounded-full transition-colors"><X size={20}/></button>
            
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl"><Megaphone size={28} /></div>
                <h3 className="text-3xl font-black text-slate-900">Message Système</h3>
              </div>
              <p className="text-slate-500 font-medium mb-8">Envoyez une notification qui sera visible par TOUS les administrateurs de Cargos.</p>
              
              <div className="space-y-6">
                <div>
                  <textarea 
                    value={announceMsg} 
                    onChange={(e) => setAnnounceMsg(e.target.value)}
                    placeholder="Ex: Une maintenance de 15 minutes aura lieu ce soir à 23h00..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium resize-none shadow-sm min-h-[120px]"
                  />
                </div>

                <button 
                  onClick={handleSuperAdminAnnouncement}
                  disabled={sendingAnnounce || !announceMsg.trim()}
                  className="w-full mt-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-black py-4.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50 text-lg"
                >
                  {sendingAnnounce ? <RefreshCw className="animate-spin" size={24}/> : <Send size={20}/>}
                  {sendingAnnounce ? "Enregistrement en cours..." : "Diffuser aux Cargos"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
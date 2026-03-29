import React, { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle2, ArrowDownToLine, RefreshCw, Package, Mail, MessageSquare, Zap, Activity, ShieldCheck } from 'lucide-react';
import { formatCurrency, extractErrorMessage } from '../../utils/helpers';
import { RechargeModal } from './RechargeModal';

export const CargoWalletScreen = ({ supabase, userOrg, showAlert }) => {
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [dbOrg, setDbOrg] = useState(null); 
  const [walletCredits, setWalletCredits] = useState(0); 
  const [loading, setLoading] = useState(true);
  
  const [rechargeType, setRechargeType] = useState(null);
  
  // 🟢 Frais globaux actuels (serviront uniquement de filet de sécurité)
  const [platformFeePercent, setPlatformFeePercent] = useState(2.0);

  const fetchWalletData = async () => {
    if (!userOrg?.id) return;
    setLoading(true);
    try {
      const { data: settingsData } = await supabase.from('platform_settings').select('platform_fee_percent').eq('id', 1).maybeSingle();
      if (settingsData && settingsData.platform_fee_percent !== undefined) {
         setPlatformFeePercent(Number(settingsData.platform_fee_percent));
      }

      const { data: orgData } = await supabase
        .from('organizations')
        .select('plan, extra_email_quota, emails_sent_this_month, sms_sent_this_month')
        .eq('id', userOrg.id)
        .single();
      if (orgData) setDbOrg(orgData);

      const { data: walletData } = await supabase
        .from('organization_wallets')
        .select('tracking_credits')
        .eq('organization_id', userOrg.id)
        .maybeSingle(); 

      if (walletData) {
        setWalletCredits(walletData.tracking_credits || 0);
      }

      // 🟢 Supabase va maintenant récupérer 'platform_fee_applied' automatiquement grâce au *
      const { data: payData } = await supabase
        .from('payments')
        .select(`*, shipments (*)`)
        .eq('organization_id', userOrg.id)
        .order('created_at', { ascending: false });

      if (payData) {
        const shipmentPayments = payData.filter(p => p.type === 'shipment_payment' || p.shipments);
        setPayments(shipmentPayments);
      }

      const { data: plansData } = await supabase.from('plans').select('*');
      if (plansData) setPlans(plansData);

    } catch (error) {
      console.error(error);
      showAlert("Erreur de mise à jour : " + extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOrg?.id]);

  const getPaymentAmount = (p) => {
    const fromPayment = Number(p.amount_gnf) || Number(p.amount) || Number(p.price) || Number(p.total) || 0;
    let fromShipment = 0;
    if (p.shipments) {
       fromShipment = Number(p.shipments.amount_due_gnf) || Number(p.shipments.price) || Number(p.shipments.amount) || 0;
    }
    return fromPayment > 0 ? fromPayment : fromShipment;
  };

  const currentPlan = plans.find(p => p.id === dbOrg?.plan) || { monthly_email_quota: 0, monthly_sms_quota: 0 };
  
  const totalEmailsAllowed = (currentPlan.monthly_email_quota || 0) + (dbOrg?.extra_email_quota || 0);
  const emailsSent = dbOrg?.emails_sent_this_month || 0;

  const smsForfait = currentPlan.monthly_sms_quota || 0;
  const smsPortefeuille = walletCredits; 
  const smsSent = dbOrg?.sms_sent_this_month || 0;
  const totalSmsAllowed = smsForfait + smsPortefeuille;

  // ==========================================
  // 🟢 NOUVEAU CALCUL FACTURE PAR FACTURE (SNAPSHOT)
  // ==========================================
  const pendingPayments = payments.filter(p => p.payout_status === 'pending' || !p.payout_status);
  const settledPayments = payments.filter(p => p.payout_status === 'settled');

  // En attente
  const pendingGrossBalance = pendingPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0);
  const pendingCommission = pendingPayments.reduce((sum, p) => {
    const amount = getPaymentAmount(p);
    const fee = p.platform_fee_applied !== undefined && p.platform_fee_applied !== null ? Number(p.platform_fee_applied) : platformFeePercent;
    return sum + (amount * (fee / 100));
  }, 0);
  const pendingNetBalance = pendingGrossBalance - pendingCommission;

  // Reversé
  const settledGrossBalance = settledPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0);
  const settledCommission = settledPayments.reduce((sum, p) => {
    const amount = getPaymentAmount(p);
    const fee = p.platform_fee_applied !== undefined && p.platform_fee_applied !== null ? Number(p.platform_fee_applied) : platformFeePercent;
    return sum + (amount * (fee / 100));
  }, 0);
  const settledNetBalance = settledGrossBalance - settledCommission;
  // ==========================================

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto animate-in fade-in">
      
      {rechargeType && (
        <RechargeModal 
          type={rechargeType} 
          onClose={() => setRechargeType(null)} 
          supabase={supabase} 
          userOrg={userOrg} 
          showAlert={showAlert} 
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><Wallet size={28} /></div>
            Mon Portefeuille
          </h1>
          <p className="text-slate-500 font-medium mt-2">Suivi des quotas et revenus en temps réel.</p>
        </div>
        <button onClick={fetchWalletData} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* CARTE E-MAILS */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">E-mails Auto du mois</p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-5xl font-black text-slate-900">{emailsSent}</h2>
                      <span className="text-slate-400 font-bold">/ {totalEmailsAllowed > 100000 ? '∞' : totalEmailsAllowed}</span>
                    </div>
                </div>
                <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform"><Mail size={32} /></div>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-8">
                <div className={`bg-blue-500 h-full transition-all duration-1000 ${emailsSent >= totalEmailsAllowed && totalEmailsAllowed > 0 ? 'bg-rose-500' : ''}`} style={{ width: `${Math.min(100, (emailsSent / (totalEmailsAllowed || 1)) * 100)}%` }}></div>
            </div>
            <button onClick={() => setRechargeType('email')} className="w-full py-4 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-900 font-black rounded-2xl border border-slate-200 hover:border-blue-600 transition-all active:scale-95">RECHARGER DES E-MAILS</button>
        </div>

        {/* CARTE SMS */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">SMS Auto du mois</p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-5xl font-black text-slate-900">{smsSent}</h2>
                      <span className="text-slate-400 font-bold">/ {totalSmsAllowed > 100000 ? '∞' : totalSmsAllowed}</span>
                    </div>
                </div>
                <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl group-hover:scale-110 transition-transform"><MessageSquare size={32} /></div>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-8">
                <div className={`h-full transition-all duration-1000 ${smsSent >= totalSmsAllowed && totalSmsAllowed > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (smsSent / (totalSmsAllowed || 1)) * 100)}%` }}></div>
            </div>
            <button onClick={() => setRechargeType('sms')} className="w-full py-4 bg-slate-50 hover:bg-rose-600 hover:text-white text-slate-900 font-black rounded-2xl border border-slate-200 hover:border-rose-600 transition-all active:scale-95">ACHETER DES SMS</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        {/* CARTE EN ATTENTE */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-6 sm:p-10 shadow-xl relative overflow-hidden text-white border border-slate-700 flex flex-col group">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
          
          <div className="relative z-10 flex-grow flex flex-col justify-center">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]"></span>
                <p className="text-sm font-black uppercase tracking-widest text-slate-300">En attente de reversement</p>
              </div>
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm"><Clock size={16} className="text-white" /></div>
            </div>
            
            <div className="mt-auto">
               <p className="text-slate-400 text-sm font-bold mb-1">Montant Net à recevoir</p>
               <span className="text-amber-400 text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md block">
                 {formatCurrency(pendingNetBalance)}
               </span>
            </div>
          </div>
        </div>

        {/* CARTE REVERSÉ */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-slate-200 relative overflow-hidden flex flex-col group hover:border-emerald-300 transition-all duration-300">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-40 h-40 bg-emerald-50 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
          
          <div className="relative z-10 flex-grow flex flex-col justify-center">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full"><ArrowDownToLine size={14} strokeWidth={3} /></div>
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">Total déjà reversé</p>
              </div>
              <div className="p-2 bg-slate-50 text-slate-400 rounded-xl"><CheckCircle2 size={16} /></div>
            </div>
            
            <div className="mt-auto">
               <p className="text-slate-400 text-sm font-bold mb-1">Montant Net reçu</p>
               <span className="text-emerald-600 text-4xl sm:text-5xl font-black tracking-tight block">
                 {formatCurrency(settledNetBalance)}
               </span>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Zap size={20} className="text-amber-500" /> Derniers encaissements clients</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Les montants ci-dessous correspondent à ce que les clients ont payé sur le portail.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                <th className="py-5 px-8">Date</th>
                <th className="py-5 px-8">Colis / Référence</th>
                <th className="py-5 px-8">Méthode</th>
                <th className="py-5 px-8">État</th>
                <th className="py-5 px-8 text-right">Montant (Payé par le client)</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold text-slate-700">
              {payments.length === 0 ? (
                <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-medium">Aucune transaction trouvée.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-5 px-8 text-slate-500 font-medium">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="py-5 px-8">
                      <span className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl text-xs font-black">
                        {p.shipments?.internal_id || p.provider_reference || 'N/A'}
                      </span>
                    </td>
                    <td className="py-5 px-8 capitalize text-slate-500 font-medium">{p.payment_method}</td>
                    <td className="py-5 px-8">
                      {p.payout_status === 'settled' ? 
                        <span className="flex w-fit items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase"><CheckCircle2 size={12}/> Reversé</span> : 
                        <span className="flex w-fit items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase"><Clock size={12}/> En attente</span>
                      }
                    </td>
                    <td className="py-5 px-8 text-right text-slate-900 font-black">{formatCurrency(getPaymentAmount(p))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
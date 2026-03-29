import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { extractErrorMessage, getReturnUrl } from '../../utils/helpers';

export const SubscriptionModal = ({ onClose, currentPlan = 'free', supabase, userOrg, showAlert }) => {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  
  const [planToConfirm, setPlanToConfirm] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from('plans').select('*');
        if (error) throw error;

        if (data) {
          const dynamicPlans = data.map(dbPlan => {
            const isFree = dbPlan.id === 'free';
            const isScale = dbPlan.id === 'scale';

            let priceDisplay = new Intl.NumberFormat('fr-FR').format(dbPlan.price_gnf) + ' GNF';
            if (isFree) priceDisplay = 'Gratuit';
            if (isScale) priceDisplay = 'Sur devis';

            const dbFeatures = dbPlan.features || {};
            
            // 🟢 Nettoyage des zéros : on récupère les quotas pour adapter le texte
            const emailQuota = dbPlan.monthly_email_quota || 0;
            const smsQuota = dbPlan.monthly_sms_quota || 0;

            const features = [
              { name: 'Suivi de colis avancé', included: true },
              { name: isScale ? 'Utilisateurs illimités' : (isFree ? '1 compte utilisateur' : `Jusqu'à ${dbPlan.max_users} utilisateurs`), included: true },
              
              // 🟢 Si quota = 0, on met un texte clair et on grise l'icône (included: false)
              { name: isScale ? 'E-mails auto illimités' : (emailQuota > 0 ? `${emailQuota} e-mails auto / mois` : "Pas d'e-mails auto"), included: isScale || emailQuota > 0 },
              { name: isScale ? 'SMS auto illimités' : (smsQuota > 0 ? `${smsQuota} SMS auto / mois` : "Pas de SMS auto"), included: isScale || smsQuota > 0 },
              
              { name: 'Scanner QR Code Rapide', included: isScale ? true : !!dbFeatures.can_scan },
              { name: 'Mise à jour en Masse', included: isScale ? true : !!dbFeatures.can_bulk_update },
              { name: 'Exportation Excel / CSV', included: isScale ? true : !!dbFeatures.can_export },
              { name: 'Bilan Financier & Statistiques', included: isScale ? true : !!dbFeatures.can_view_stats },
              { name: 'Déclarations Clients (Pré-alertes)', included: isScale ? true : !!dbFeatures.can_manage_pre_alerts }
            ];

            if (isScale) {
              features.push(
                { name: 'API Publique & E-commerce', included: true },
                { name: 'Gestion Multi-Agences', included: true },
                { name: 'Marque Blanche (Domaine pro)', included: true },
                { name: 'Portail de suivi Client B2B', included: true },
                { name: 'Account Manager & Support VIP', included: true }
              );
            }

            let name = dbPlan.name;
            let period = '/ mois';
            let description = '';
            let buttonStyle = 'bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md';
            let highlight = false;
            let buttonText = `Passer à ${name}`;

            if (isFree) {
              period = '\u00A0'; // 🟢 Espace insécable (Garde l'alignement mais masque "À VIE")
              description = 'Pour démarrer et offrir le suivi de base à vos clients.';
              buttonStyle = 'bg-slate-100 text-slate-700 font-bold border border-slate-200 hover:bg-slate-200';
              buttonText = 'Plan de base'; // 🟢 Plus pro que "Gratuit à vie"
            } else if (dbPlan.id === 'essentiel') {
              description = 'Pour les petites équipes en développement.';
            } else if (dbPlan.id === 'pro') {
              description = 'Pour les agences en pleine croissance.';
              buttonStyle = 'bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-600/30';
              highlight = true;
            } else if (isScale) {
              period = '/ an'; 
              description = 'L\'offre ultime pour les transitaires internationaux.';
              buttonText = 'Contacter le support';
              buttonStyle = 'bg-slate-900 hover:bg-black text-white font-black shadow-xl shadow-slate-900/20';
            }

            return { id: dbPlan.id, name, price: priceDisplay, priceValue: dbPlan.price_gnf, period, description, features, buttonText, buttonStyle, highlight };
          });

          const order = { 'free': 1, 'essentiel': 2, 'pro': 3, 'scale': 4 };
          dynamicPlans.sort((a, b) => (order[a.id] || 99) - (order[b.id] || 99));
          setPlans(dynamicPlans);
        }
      } catch (err) {
        console.error("Erreur chargement forfaits :", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [supabase]);

  const handleSubscribeClick = (plan) => {
    if (plan.id === 'scale') {
      const scaleMessage = "Bonjour ! Je gère un grand volume d'expéditions et je souhaite discuter de l'offre SCALE (Multi-Agences, API, Marque Blanche) pour mon cargo. Pouvons-nous en discuter ?";
      window.open(`https://wa.me/224623247746?text=${encodeURIComponent(scaleMessage)}`, '_blank');
      return;
    }

    if (currentPlan !== 'free' && currentPlan !== plan.id) {
      setPlanToConfirm(plan);
    } else {
      executePayment(plan);
    }
  };

  const executePayment = async (plan) => {
    const cargoPhone = userOrg?.phone || userOrg?.whatsapp_number || "";
    if (!cargoPhone) return showAlert("⚠️ Veuillez configurer un numéro WhatsApp/Téléphone dans vos paramètres.");
    if (!supabase) return showAlert("Erreur: Supabase non initialisé.");

    setLoadingPlan(plan.id);

    try {
      const invincibleReferenceId = `${userOrg.id}___plan___${plan.id}`;
      const { data, error } = await supabase.functions.invoke("djomi-pay", {
        body: {
          amount: plan.priceValue,
          type: "subscription",
          reference_id: invincibleReferenceId,
          phone: cargoPhone, 
          metadata: { plan_id: plan.id }, 
          return_url: getReturnUrl()
        }
      });

      if (error) throw error;
      
      const link = data?.payment_url || data?.link || data?.url;
      if (!link) return showAlert("Erreur: lien de paiement non reçu.");

      const newWindow = window.open(link, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = link;
      }
    } catch (e) {
      showAlert("Erreur paiement : " + extractErrorMessage(e));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-900/80 backdrop-blur-sm custom-scrollbar">
      <div className="flex min-h-full justify-center p-4 py-12 sm:p-8 sm:py-16 relative">
        
        <div className={`relative w-full max-w-7xl h-fit bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl transition-all duration-300 ${planToConfirm ? 'blur-sm scale-[0.98]' : 'animate-in zoom-in-95 fade-in'}`}>
          
          <button onClick={onClose} className="absolute top-6 right-6 sm:top-8 sm:right-8 z-50 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>

          <div className="p-6 sm:p-12 pt-16 sm:pt-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 rounded-full mb-6 border border-blue-100 shadow-sm">
                <Zap size={18} className="mr-2" />
                <span className="text-xs font-black uppercase tracking-widest">Mise à niveau</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Choisissez votre plan</h2>
              <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
                Débloquez tout le potentiel de Guinea Track pour développer votre activité de fret. Passez à la vitesse supérieure.
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-blue-500" size={40} /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 items-stretch">
                {plans.map((plan) => {
                  const isCurrentPlan = currentPlan === plan.id;
                  const isDisabled = isCurrentPlan || loadingPlan === plan.id || (plan.id === 'free' && currentPlan !== 'free');

                  return (
                    <div key={plan.id} className={`h-full rounded-[2rem] p-6 sm:p-8 flex flex-col relative transition-all duration-300 hover:-translate-y-1 ${plan.highlight ? 'bg-white border-2 border-blue-500 shadow-xl shadow-blue-500/10 z-10 scale-100 lg:scale-105' : 'bg-slate-50 border border-slate-200 hover:shadow-md hover:bg-white'}`}>
                      {plan.highlight && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm whitespace-nowrap">Le plus populaire</div>
                      )}
                      
                      <div className="mb-6">
                        <h3 className={`text-2xl font-black mb-2 ${plan.highlight ? 'text-blue-600' : 'text-slate-900'}`}>{plan.name}</h3>
                        <p className="text-slate-500 text-sm font-medium h-14 leading-relaxed">{plan.description}</p>
                      </div>

                      <div className="mb-8 pb-8 border-b border-slate-200/60">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-3xl xl:text-4xl font-black tracking-tight ${plan.price === 'Gratuit' || plan.price === 'Sur devis' ? 'text-slate-700' : 'text-slate-900'}`}>{plan.price}</span>
                        </div>
                        {/* On a gardé la hauteur de la span pour ne pas casser l'alignement même si le texte est invisible (\u00A0) */}
                        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider mt-1 block">{plan.period}</span>
                      </div>

                      <div className="space-y-4 mb-10 flex-grow">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className={`flex items-start gap-3 ${feature.included ? 'text-slate-700' : 'text-slate-400 opacity-60'}`}>
                            <CheckCircle2 size={18} className={`shrink-0 mt-0.5 ${feature.included ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <span className="text-sm font-bold leading-tight">{feature.name}</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        disabled={isDisabled}
                        className={`w-full py-4 rounded-xl transition-all mt-auto flex items-center justify-center gap-2 ${isCurrentPlan || (plan.id === 'free' && currentPlan !== 'free') ? 'bg-slate-100 text-slate-400 font-bold cursor-not-allowed border border-slate-200' : plan.buttonStyle} ${loadingPlan === plan.id ? 'opacity-70 cursor-wait' : 'active:scale-95'}`}
                        onClick={() => handleSubscribeClick(plan)}
                      >
                        {loadingPlan === plan.id ? <RefreshCw className="animate-spin" size={20} /> : null}
                        {isCurrentPlan ? 'Plan Actuel' : plan.buttonText}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 🎨 MODALE DE CONFIRMATION */}
        {planToConfirm && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-900/40 rounded-[2.5rem] animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] p-8 max-w-[500px] w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 m-4">
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Zap size={24} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Changement de Forfait</h3>
              </div>
              
              <p className="text-slate-600 mb-6 font-medium">
                Vous êtes sur le point d'activer le forfait <strong className="text-slate-900">{planToConfirm.name.toUpperCase()}</strong>. Voici comment seront traités vos jours restants actuels :
              </p>
              
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-5 mb-8 text-sm">
                
                <div className="flex items-start gap-3">
                  <div className="text-xl mt-0.5">📈</div>
                  <div>
                    <strong className="text-emerald-600 block mb-1">Si vous montez en gamme :</strong>
                    <p className="text-slate-600 leading-relaxed mb-3">
                      La valeur financière de vos jours restants est récupérée pour vous offrir des <strong className="text-slate-800">jours bonus</strong> du nouveau forfait.
                    </p>
                    <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg border border-emerald-100 font-medium text-xs leading-relaxed">
                      💡 <strong className="font-black">Exemple :</strong> Si le forfait PRO coûte le double du forfait ESSENTIEL, <strong className="text-emerald-800">2 jours ESSENTIEL</strong> restants seront convertis en <strong className="text-emerald-800">1 jour PRO bonus</strong>.
                    </div>
                  </div>
                </div>
                
                <div className="h-px bg-slate-200 w-full"></div>
                
                <div className="flex items-start gap-3">
                  <div className="text-xl mt-0.5">📉</div>
                  <div>
                    <strong className="text-amber-600 block mb-1">Si vous baissez en gamme :</strong>
                    <p className="text-slate-600 leading-relaxed">
                      Votre nouveau forfait démarre immédiatement pour 30 jours. Par mesure d'équité, <strong className="text-slate-800">vos anciens jours ne sont ni reportés ni remboursés</strong>.
                    </p>
                  </div>
                </div>

              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setPlanToConfirm(null)} 
                  className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => {
                    executePayment(planToConfirm);
                    setPlanToConfirm(null);
                  }} 
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                >
                  Confirmer & Payer
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
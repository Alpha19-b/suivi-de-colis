import React, { useState } from 'react';
import { Lock, LogOut, CreditCard, Sparkles } from 'lucide-react';
import { SubscriptionModal } from '../billing/SubscriptionModal'; // Assure-toi que le chemin est correct selon tes dossiers

export const SubscriptionExpiredScreen = ({ userOrg, supabase, setView, showAlert }) => {
  const [showSubscription, setShowSubscription] = useState(false);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    if (setView) {
      setView('home');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      
      {/* LA MODALE DE PAIEMENT QUI S'OUVRE AU CLIC */}
      {showSubscription && (
        <SubscriptionModal 
          onClose={() => setShowSubscription(false)} 
          currentPlan={userOrg?.plan || 'free'} 
          supabase={supabase}
          userOrg={userOrg}
          showAlert={showAlert || console.log}
        />
      )}

      {/* LA CARTE D'EXPIRATION */}
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500">
        
        {/* Ligne de couleur en haut */}
        <div className="h-2 w-full bg-gradient-to-r from-rose-500 to-orange-500"></div>
        
        <div className="p-8 sm:p-10 text-center">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100">
            <Lock size={32} />
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Abonnement Expiré</h2>
          
          <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm">
            Votre accès à l'Espace Cargo est temporairement suspendu. Vos données et vos colis sont en sécurité, mais vous devez renouveler votre abonnement pour continuer.
          </p>

          <div className="space-y-3">
            {/* NOUVEAU BOUTON : Payer et débloquer */}
            <button 
              onClick={() => setShowSubscription(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex justify-center items-center gap-2 text-lg"
            >
              <Sparkles size={20} className="text-blue-200" />
              Renouveler mon accès
            </button>

            {/* ANCIEN BOUTON : Se déconnecter */}
            <button 
              onClick={handleLogout}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95"
            >
              <LogOut size={20} className="text-slate-400" />
              Me déconnecter
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};
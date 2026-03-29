import React, { useState } from 'react';
import { Lock, Key, RefreshCw } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { extractErrorMessage } from '../../utils/helpers';

export const WelcomePasswordModal = ({ supabase, onComplete, showAlert, onCancel }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return showAlert("Le mot de passe doit contenir au moins 6 caractères.");
    
    setLoading(true);

    if (!supabase) {
      setLoading(false);
      return showAlert("⏳ Le système se connecte encore en arrière-plan. Veuillez patienter quelques secondes...");
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setLoading(false);
      return showAlert("⏳ Connexion en cours de validation. Veuillez patienter quelques secondes et cliquer à nouveau sur le bouton.");
    }

    const { error } = await supabase.auth.updateUser({ password: password });
    
    setLoading(false);
    if (error) {
      showAlert("Erreur : " + extractErrorMessage(error));
    } else {
      showAlert("✅ Mot de passe enregistré ! Bienvenue dans l'équipe.");
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 fade-in duration-300">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
          <Lock size={36} />
        </div>
        <h3 className="text-3xl font-black text-center text-slate-900 mb-3 tracking-tight">Bienvenue !</h3>
        <p className="text-center text-slate-500 font-medium mb-8 leading-relaxed">
          Pour sécuriser votre accès agent, veuillez choisir un mot de passe robuste.
        </p>
        
        <form onSubmit={handleSavePassword} className="space-y-5">
          <Input 
            type="password" 
            placeholder="Votre mot de passe secret" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            icon={Key} 
            required 
          />
          <button 
            type="submit" 
            disabled={loading || !password} 
            className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex justify-center items-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : "Sécuriser mon compte"}
          </button>

          <button 
            type="button" 
            onClick={async () => {
              if (supabase) await supabase.auth.signOut();
              if (onCancel) onCancel();
            }}
            className="w-full text-center text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors py-2 mt-2"
          >
            Annuler et refuser l'invitation
          </button>
        </form>
      </div>
    </div>
  );
};
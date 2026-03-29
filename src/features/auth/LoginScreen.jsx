import React, { useState } from 'react';
import { Lock, AlertCircle, MessageSquare, Key, RefreshCw } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { safeGetStorage, safeSetStorage, extractErrorMessage } from '../../utils/helpers';

export const LoginScreen = ({ onLogin, onCancel, supabase, hasConfig }) => {
  const [email, setEmail] = useState(safeGetStorage("savedStaffEmail") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!supabase) {
      setError("Erreur système: Supabase non chargé.");
      setLoading(false);
      return;
    }

    try {
      safeSetStorage("savedStaffEmail", email);
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (!data?.session) throw new Error("Pas de session.");
      onLogin();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>

      <div className="bg-white/90 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/20 transform rotate-3 hover:rotate-0 transition-transform">
          <Lock size={28} />
        </div>
        <h2 className="text-3xl font-black text-center text-slate-900 mb-8 tracking-tight">Accès Sécurisé</h2>
        
        {!hasConfig && (
           <div className="bg-amber-50 text-amber-600 text-xs p-3 mb-6 rounded-xl border border-amber-200 font-bold text-center flex items-center justify-center gap-2">
              <AlertCircle size={16} /> API non configurée
           </div>
        )}
        <form onSubmit={handleAuth} className="space-y-5">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email professionnel" icon={MessageSquare} required />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" icon={Key} required />
          
          {error && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>}
          
          <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] flex justify-center items-center gap-2 text-lg mt-2">
            {loading ? <RefreshCw className="animate-spin" size={20} /> : "Se connecter"}
          </button>
          
          <button type="button" onClick={onCancel} className="w-full py-3 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Retour à l'accueil</button>
        </form>
      </div>
    </div>
  );
};
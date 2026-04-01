import React, { useEffect, useState, useRef } from 'react';

export default function AuthConfirm({ supabase, setView, setIsNewInvite }) {
  const [status, setStatus] = useState("Authentification sécurisée en cours...");
  const [errorMsg, setErrorMsg] = useState(null);
  
  // 🟢 1. PROTECTION : Empêche React de consommer le lien 2 fois en local
  const isProcessing = useRef(false);

  useEffect(() => {
    const verifySession = async () => {
      if (isProcessing.current) return;
      isProcessing.current = true;

      const urlParams = new URLSearchParams(window.location.search);
      const token_hash = urlParams.get('token_hash');
      const type = urlParams.get('type');

      if (!token_hash || !type) {
        setErrorMsg("Lien invalide. Les paramètres d'authentification sont manquants.");
        setStatus("");
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (error) throw error;

        setStatus("Succès ! Ouverture de votre espace...");

        if (type === 'invite' || type === 'recovery') {
          // 🟢 2. PROTECTION : On NE NETTOIE PAS l'URL tout de suite.
          // Cela force App.jsx à te laisser tranquille le temps de taper ton mot de passe.
          setView('home');
          setIsNewInvite(true);
        } else {
          window.history.replaceState(null, '', '/');
          setView('login');
        }
      } catch (err) {
        console.error("Erreur de vérification :", err.message);
        setStatus("");
        setErrorMsg("Ce lien est invalide, a expiré, ou a déjà été utilisé.");
      }
    };

    if (supabase) verifySession();
  }, [supabase, setView, setIsNewInvite]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 text-center bg-slate-50">
      <h2 className="text-2xl font-bold text-blue-900 mb-5">Guinea Track 📦</h2>
      {status && <p className="text-lg text-slate-600 animate-pulse">{status}</p>}
      
      {errorMsg && (
        <div className="p-5 bg-red-100 text-red-800 rounded-lg max-w-md border border-red-200 shadow-sm">
          <p><strong>Erreur :</strong> {errorMsg}</p>
          <button
            onClick={() => { window.history.replaceState(null, '', '/'); setView('login'); }}
            className="mt-5 px-6 py-2 bg-blue-900 text-white rounded font-medium hover:bg-blue-800 transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      )}
    </div>
  );
}
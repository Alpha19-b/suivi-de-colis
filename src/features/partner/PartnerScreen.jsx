import React, { useState } from 'react';
import { 
  ArrowLeft, MessageSquare, Users, Globe, 
  CheckCircle2, Building2, Smartphone, RefreshCw, Send 
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { extractErrorMessage } from '../../utils/helpers';

export const PartnerScreen = ({ setView, supabase, showAlert }) => {
  const [formData, setFormData] = useState({ company_name: '', contact_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return showAlert("Système non connecté.");

    // 🟢 1. Validation de l'E-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return showAlert("⚠️ L'adresse e-mail n'est pas valide.");
    }

    // 🟢 2. Validation du Téléphone (Format international avec le '+')
    // On retire les espaces, tirets ou points que l'utilisateur aurait pu taper pour tester
    const cleanPhone = formData.phone.replace(/[\s\-\.]/g, '');
    // Regex : Doit commencer par +, suivi d'un chiffre de 1 à 9, puis 7 à 14 chiffres
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      return showAlert("⚠️ Le numéro de téléphone est invalide. N'oubliez pas l'indicatif du pays (ex: +224...).");
    }

    setLoading(true);
    try {
      // On sauvegarde le numéro formaté (sans espaces) pour avoir une base de données propre
      const payloadToSave = {
        ...formData,
        email: formData.email.trim().toLowerCase(),
        phone: cleanPhone
      };

      const { error } = await supabase.from('partner_requests').insert([payloadToSave]);
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      showAlert("Erreur lors de l'envoi. " + extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500">
      <div className="pb-32 pt-20 px-4 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-indigo-900/40"></div>
        <div className="container mx-auto max-w-5xl relative z-10">
          <button onClick={() => setView("home")} className="text-white hover:bg-white/20 mb-10 flex items-center gap-2 text-sm font-bold bg-white/10 px-5 py-2.5 rounded-full w-fit backdrop-blur-md transition-all">
            <ArrowLeft size={18} /> Retour
          </button>
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight drop-shadow-lg">
              Propulsez votre agence de fret dans <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">l'ère digitale</span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-300 font-medium mb-8">
              Rejoignez le réseau Logistique Pro. Offrez un suivi en temps réel à vos clients et optimisez la gestion de vos expéditions.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-20 relative z-20 pb-24">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/10 border border-slate-100 overflow-hidden flex flex-col md:flex-row">
          
          <div className="p-8 md:p-12 md:w-1/2 bg-slate-50 border-r border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-10">Pourquoi nous rejoindre ?</h3>
            <div className="space-y-10">
              <div className="flex gap-5 group">
                <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl h-fit shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors"><MessageSquare size={24} /></div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg mb-2">Fidélisez avec les SMS</h4>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">Informez automatiquement vos clients à chaque étape (Chine, Transit, Douane, Agence). Fini les appels incessants !</p>
                </div>
              </div>
              <div className="flex gap-5 group">
                <div className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl h-fit shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Users size={24} /></div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg mb-2">Gérez vos équipes et paiements</h4>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">Centralisez vos encaissements, suivez qui a payé, et sécurisez votre caisse avec une interface claire.</p>
                </div>
              </div>
              <div className="flex gap-5 group">
                <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl h-fit shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Globe size={24} /></div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg mb-2">Image internationale</h4>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">Offrez à votre marque une vitrine technologique digne des plus grands transporteurs mondiaux.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 md:w-1/2 bg-white">
            {success ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Demande envoyée !</h3>
                <p className="text-slate-600 font-medium text-lg leading-relaxed">Notre équipe va vous contacter très rapidement pour configurer votre Espace Cargo.</p>
                <button onClick={() => setView("home")} className="mt-8 bg-slate-900 text-white font-bold px-8 py-4 rounded-xl hover:bg-slate-800 transition-all shadow-xl active:scale-95">
                  Retour à l'accueil
                </button>
              </div>
            ) : (
              <>
                <div className="mb-10">
                  <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Passez au niveau supérieur</h3>
                  <p className="text-slate-500 font-medium">Remplissez ce formulaire pour être recontacté et obtenir votre accès personnalisé.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input placeholder="Nom de votre Cargo / Entreprise" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} icon={Building2} required />
                  <Input placeholder="Votre nom complet" value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} icon={Users} required />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} icon={MessageSquare} required />
                    
                    <div className="relative">
                      <Input 
                        type="tel" 
                        placeholder="Ex: +224..." 
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                        icon={Smartphone} 
                        required 
                      />
                      <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-2 uppercase tracking-widest">Indicatif Requis (+)</p>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-blue-600/30 active:scale-[0.98] flex items-center justify-center gap-2 text-lg">
                    {loading ? <RefreshCw className="animate-spin" size={24} /> : <Send size={24} />}
                    Demander mon accès
                  </button>
                </form>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
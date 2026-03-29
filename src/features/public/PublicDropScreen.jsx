import React, { useState, useEffect } from 'react';
import { 
  User, Phone, Mail, Package, Plane, Ship, Camera, 
  ArrowRight, ArrowLeft, CheckCircle2, Loader2, Image as ImageIcon, X, Zap, Calculator
} from 'lucide-react';
import { extractErrorMessage } from '../../utils/helpers'; 
import { PriceCalculatorModal } from '../tracking/PriceCalculatorModal';

export const PublicDropScreen = ({ supabase, cargoSlug }) => {
  const [step, setStep] = useState(1);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 🟢 État pour ouvrir l'estimateur de prix
  const [showCalculator, setShowCalculator] = useState(false);
  
  // Séparation des erreurs
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    transport_type: 'aerien_normal',
    description: ''
  });
  
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');

  // 1. Récupération des infos du Cargo
  useEffect(() => {
    let isMounted = true;

    if (!supabase || !cargoSlug) return;

    const fetchOrgDetails = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          setLoadError('');
        }

        const { data, error } = await supabase.rpc('get_public_org', { p_slug: cargoSlug });
          
        if (error) throw error;
        if (!data) throw new Error("Cargo introuvable.");
        
        if (isMounted) {
          setOrg(data);
          setLoadError('');
        }
      } catch (err) {
        if (isMounted) {
          setLoadError("Ce lien de dépôt n'est pas valide ou le cargo n'existe plus.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrgDetails();

    return () => { isMounted = false; };
  }, [cargoSlug, supabase]);

  // 2. Gestion de l'upload de photo en local
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("La photo est trop lourde (Max 5 Mo). Veuillez en choisir une autre.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // 3. Fonction de validation stricte de l'Étape 1
  const handleNextStep = () => {
    setSubmitError(''); 

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.client_email)) {
      setSubmitError("Veuillez entrer une adresse e-mail valide (ex: nom@email.com).");
      return;
    }

    const phoneRegex = /^\+?[\d\s\-]{8,}$/;
    if (!phoneRegex.test(formData.client_phone)) {
      setSubmitError("Le numéro de téléphone est invalide. Il ne doit contenir que des chiffres (minimum 8).");
      return;
    }

    setStep(2);
  };

  // 4. Soumission finale vers Supabase
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');

    try {
      let photo_url = null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `uploads_clients/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('package_photos')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('package_photos')
          .getPublicUrl(filePath);
          
        photo_url = publicUrlData.publicUrl;
      }

      const { data: trackingCode, error: dbError } = await supabase.rpc('submit_public_declaration', {
        p_org_id: org.id,
        p_client_name: formData.client_name,
        p_client_phone: formData.client_phone,
        p_client_email: formData.client_email,
        p_transport_type: formData.transport_type,
        p_description: formData.description,
        p_photo_url: photo_url
      });

      if (dbError) throw dbError;

      setGeneratedCode(trackingCode);
      setStep(3);

    } catch (err) {
      setSubmitError(extractErrorMessage(err) || "Une erreur est survenue lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" size={40} /></div>;
  if (loadError && !org) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="bg-white p-8 rounded-3xl shadow-xl text-center"><X className="mx-auto text-rose-500 mb-4" size={48}/><h2 className="text-xl font-black text-slate-800">{loadError}</h2></div></div>;

  const brandColor = org.primary_color || '#0f172a';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 pb-10">
      
      {/* 🟢 MODALE ESTIMATEUR DE PRIX */}
      {showCalculator && (
        <PriceCalculatorModal 
          onClose={() => setShowCalculator(false)} 
          rates={org.public_rates || {}} 
        />
      )}

      {/* HEADER DYNAMIQUE DU CARGO */}
      <div className="bg-white shadow-sm py-4 px-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          {org.logo_url ? (
            <img src={org.logo_url} alt="Logo" className="h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ backgroundColor: brandColor }}>
              {org.name.charAt(0)}
            </div>
          )}
          <h1 className="font-black text-xl text-slate-900 hidden sm:block">{org.name}</h1>
        </div>
        
        {/* 🟢 BOUTON ESTIMATEUR DANS LE HEADER */}
        <button 
          onClick={() => setShowCalculator(true)}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
        >
          <Calculator size={16} className="text-blue-500" /> 
          <span className="hidden sm:inline">Estimer un envoi</span>
          <span className="sm:hidden">Estimer</span>
        </button>
      </div>

      {/* CONTENU DU FORMULAIRE */}
      <div className="flex-1 flex flex-col items-center p-4 sm:p-8 w-full max-w-lg mx-auto">
        
        {/* BARRE DE PROGRESSION */}
        {step < 3 && (
          <div className="w-full flex items-center gap-2 mb-8 mt-4">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-slate-800' : 'bg-slate-200'} transition-colors`} style={{ backgroundColor: step >= 1 ? brandColor : '' }}></div>
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-slate-800' : 'bg-slate-200'} transition-colors`} style={{ backgroundColor: step >= 2 ? brandColor : '' }}></div>
          </div>
        )}

        <div className="bg-white w-full p-6 sm:p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
          
          {/* AFFICHAGE DE L'ERREUR DE VALIDATION */}
          {submitError && <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">{submitError}</div>}

          {/* ÉTAPE 1 : IDENTITÉ */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <h2 className="text-2xl font-black text-slate-900 mb-2">Vos coordonnées</h2>
              <p className="text-slate-500 text-sm font-medium mb-8">Nous avons besoin de ces informations pour vous contacter lors de la réception.</p>
              
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 ml-1 mb-1 block">Nom Complet *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 outline-none font-bold text-slate-900 transition-all" style={{ '--tw-ring-color': brandColor }} placeholder="Ex: Mamadou Diallo" required />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 ml-1 mb-1 block">Téléphone *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="tel" value={formData.client_phone} onChange={e => setFormData({...formData, client_phone: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 outline-none font-bold text-slate-900 transition-all" style={{ '--tw-ring-color': brandColor }} placeholder="Ex: +224 622 00 00 00" required />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500 ml-1 mb-1 block">Adresse E-mail *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="email" value={formData.client_email} onChange={e => setFormData({...formData, client_email: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 outline-none font-bold text-slate-900 transition-all" style={{ '--tw-ring-color': brandColor }} placeholder="Ex: mamadou@email.com" required />
                  </div>
                </div>

                <button 
                  onClick={handleNextStep} 
                  disabled={!formData.client_name || !formData.client_phone || !formData.client_email}
                  className="w-full mt-4 py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                  style={{ backgroundColor: brandColor }}
                >
                  Continuer <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : LE COLIS */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <button onClick={() => { setStep(1); setSubmitError(''); }} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-bold text-sm mb-6 transition-colors"><ArrowLeft size={16}/> Retour</button>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Votre Colis</h2>
              <p className="text-slate-500 text-sm font-medium mb-6">Informations de transport et preuve photographique (recommandé).</p>

              <div className="space-y-6">
                
                {/* Choix du Transport */}
                <div>
                   <label className="text-xs font-black uppercase text-slate-500 ml-1 mb-2 block">Moyen de transport souhaité</label>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button 
                        onClick={() => setFormData({...formData, transport_type: 'aerien_express'})} 
                        className={`py-3 px-2 flex flex-col items-center justify-center gap-1 rounded-xl border-2 font-bold transition-all ${formData.transport_type === 'aerien_express' ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' : 'border-slate-100 text-slate-500 bg-white hover:border-slate-200'}`}
                      >
                        <Zap size={20} className={formData.transport_type === 'aerien_express' ? 'text-amber-500' : 'text-slate-400'}/> 
                        <span className="text-sm">Aérien Express</span>
                      </button>

                      <button 
                        onClick={() => setFormData({...formData, transport_type: 'aerien_normal'})} 
                        className={`py-3 px-2 flex flex-col items-center justify-center gap-1 rounded-xl border-2 font-bold transition-all ${formData.transport_type === 'aerien_normal' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-slate-100 text-slate-500 bg-white hover:border-slate-200'}`}
                      >
                        <Plane size={20} className={formData.transport_type === 'aerien_normal' ? 'text-blue-500' : 'text-slate-400'}/> 
                        <span className="text-sm">Aérien Normal</span>
                      </button>

                      <button 
                        onClick={() => setFormData({...formData, transport_type: 'maritime'})} 
                        className={`py-3 px-2 flex flex-col items-center justify-center gap-1 rounded-xl border-2 font-bold transition-all ${formData.transport_type === 'maritime' ? 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm' : 'border-slate-100 text-slate-500 bg-white hover:border-slate-200'}`}
                      >
                        <Ship size={20} className={formData.transport_type === 'maritime' ? 'text-cyan-500' : 'text-slate-400'}/> 
                        <span className="text-sm">Maritime</span>
                      </button>
                   </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 ml-1 mb-1 block">Contenu du colis</label>
                  <div className="relative">
                    <Package className="absolute left-4 top-4 text-slate-400" size={18} />
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 outline-none font-bold text-slate-900 min-h-[100px] resize-none transition-all" style={{ '--tw-ring-color': brandColor }} placeholder="Ex: 2 paires de chaussures, 3 t-shirts..." />
                  </div>
                </div>

                {/* Upload Photo */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 ml-1 mb-1 block">Photo du colis (Une seule)</label>
                  {!photoPreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-500">
                        <Camera className="mb-2" size={24} />
                        <p className="text-sm font-bold">Appuyez pour prendre une photo</p>
                      </div>
                      {/* 🟢 CORRECTION : J'ai enlevé 'capture="environment"' pour permettre le choix (Galerie ou Appareil photo) */}
                      <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handlePhotoChange} />
                    </label>
                  ) : (
                    <div className="relative w-full h-40 rounded-2xl border-2 border-slate-200 overflow-hidden group">
                      <img src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                      <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="absolute top-2 right-2 p-2 bg-slate-900/50 backdrop-blur-sm text-white rounded-full hover:bg-rose-500 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl disabled:opacity-70 disabled:active:scale-100"
                    style={{ backgroundColor: brandColor, boxShadow: `0 10px 15px -3px ${brandColor}40` }}
                  >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} 
                    {submitting ? "Enregistrement..." : "Valider mon colis"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : SUCCÈS & CODE GÉNÉRÉ */}
          {step === 3 && (
            <div className="text-center py-6 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Colis Déclaré !</h2>
              <p className="text-slate-500 font-medium mb-8">Votre déclaration a bien été transmise à notre entrepôt. Voici votre code unique d'identification :</p>
              
              <div className="bg-slate-900 text-white py-6 px-8 rounded-3xl mb-8 relative overflow-hidden inline-block shadow-2xl">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><Package size={80} className="-rotate-12"/></div>
                 <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1 relative z-10">CODE À CONSERVER</p>
                 <p className="text-5xl font-black tracking-widest relative z-10">{generatedCode}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left mb-6">
                 <h4 className="font-black text-amber-800 flex items-center gap-2 mb-1"><ImageIcon size={16}/> Instruction importante</h4>
                 <p className="text-sm text-amber-700 font-medium">Veuillez communiquer ce code <strong>{generatedCode}</strong> à votre vendeur pour qu'il l'écrive au marqueur sur votre carton avant l'expédition.</p>
              </div>

              <button onClick={() => window.location.reload()} className="text-slate-400 hover:text-slate-800 font-bold transition-colors">Déclarer un autre colis</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
import React, { useEffect, useState } from "react";
import {
  Package, Search, Plane, CheckCircle2,
  MapPin, AlertCircle, ChevronRight, Anchor,
  LogOut, Plus, RefreshCw, Calculator,
  MessageCircle, X, Edit, Lock,
  Scale, UploadCloud, Clock, Coins, ArrowLeft,
  CreditCard, Wallet, CalendarDays, ChevronDown, ChevronUp,
  Smartphone, MessageSquare, Printer
} from "lucide-react";

/* =========================================================
   CONFIG
========================================================= */
// --- CONFIGURATION ACTUELLE (HARDCODED) ---
const SUPABASE_URL = "https://rvkidhldutbufaugdxiy.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2a2lkaGxkdXRidWZhdWdkeGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTQzMDMsImV4cCI6MjA4MjE3MDMwM30.TFy03OOytt9DvH-PRU9lulUjFLWZibcY_XN0r3eofvg";

// Avertissement visuel si les clés manquent
const hasConfig = SUPABASE_URL && SUPABASE_ANON_KEY;

// --- PACKS DE CREDITS (Nimba + 20%) ---
const CREDIT_PACKS = [
  { credits: 100, price: 19200, label: "Découverte" },
  { credits: 500, price: 96000, label: "Essentiel" },
  { credits: 1000, price: 168000, label: "Pro" },
  { credits: 5000, price: 750000, label: "Business" },
  { credits: 10000, price: 1500000, label: "Entreprise" },
];

/* =========================================================
   UTILS (SAFE LOCAL STORAGE & API)
========================================================= */
const safeGetStorage = (key) => {
  try { return localStorage.getItem(key); } catch (e) { return null; }
};

const safeSetStorage = (key, value) => {
  try { localStorage.setItem(key, value); } catch (e) { }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (amount) => {
  if (isNaN(amount) || amount === null) return "0 GNF";
  return new Intl.NumberFormat("fr-GN", {
    style: "currency",
    currency: "GNF",
    maximumFractionDigits: 0
  }).format(amount);
};

// --- FIX URL HTTPS POUR DJOMI (Check Localhost) ---
const getReturnUrl = () => {
    // Djomi exige HTTPS. Si on est en local, on met une URL bidon HTTPS (ex: Google) pour que ça passe.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return "https://google.com"; 
    }
    return window.location.href;
};

/* =========================================================
   UI Components
========================================================= */
const StatusBadge = ({ status, color }) => {
  const styles = {
    commande: "bg-slate-100 text-slate-600",
    transit_chine: "bg-indigo-50 text-indigo-700",
    entrepot_chine: "bg-blue-50 text-blue-700",
    international: "bg-violet-50 text-violet-700",
    douane_guinee: "bg-orange-50 text-orange-700",
    livre: "bg-emerald-50 text-emerald-700",
  };
  
  const label = status ? status.replace(/_/g, " ").toUpperCase() : "INCONNU";

  const customStyle = (color && status === "livre")
    ? { backgroundColor: `${color}20`, color }
    : {};

  return (
    <span
      className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${!color ? (styles[status] || "bg-gray-100") : ""}`}
      style={customStyle}
    >
      {label}
    </span>
  );
};

const Timeline = ({ updates, color }) => {
  const safeUpdates = Array.isArray(updates) ? updates : [];
  const sortedUpdates = [...safeUpdates].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedUpdates.length === 0) return <p className="text-sm text-slate-400 italic">Aucun historique disponible.</p>;

  return (
    <div className="relative pl-8 border-l-2 border-slate-200 space-y-8 my-8 ml-2">
      {sortedUpdates.map((update, idx) => (
        <div key={idx} className="relative">
          <div
            className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white ${idx === 0 ? "bg-slate-800" : "bg-slate-300"}`}
            style={idx === 0 && color ? { backgroundColor: color } : {}}
          />
          <div className={`pl-4 ${idx === 0 ? "" : "opacity-80"}`}>
            <div className="flex justify-between items-start mb-1">
              <span className={`text-sm font-bold ${idx === 0 ? "text-slate-800" : "text-slate-600"}`}>
                {String(update.status || "").replace(/_/g, " ").toUpperCase()}
              </span>
              <span className="text-xs text-slate-400 font-mono">{formatDate(update.date)}</span>
            </div>
            <p className="text-slate-800 font-medium">{update.note}</p>
            {update.source && update.source !== 'manual' && (
               <span className="text-[10px] text-slate-400 uppercase tracking-widest border border-slate-200 px-1 rounded ml-1">
                 {update.source}
               </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const Navbar = ({ view, setView, setShowCalculator, brand }) => {
  const primaryColor = brand?.org_color || "#0f172a";
  const brandName = brand?.org_name || "PLATEFORME LOGISTIQUE";
  const logoUrl = brand?.org_logo || brand?.logo_url || null;

  return (
    <nav className="text-white shadow-lg sticky top-0 z-50 h-16 flex-none" style={{ backgroundColor: primaryColor }}>
      <div className="container mx-auto px-6 h-full flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("home")}>
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-9 w-auto max-w-[120px] rounded bg-white p-1 object-contain shadow-sm border border-white/10" />
          ) : (
            <div className="bg-white/10 p-1.5 rounded-lg shadow-lg">
              <Anchor className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="font-bold text-lg uppercase tracking-wider truncate max-w-[200px] sm:max-w-none">{brandName}</span>
        </div>
        <div className="flex items-center gap-6">
          {view === "track" && (
            <>
              <button
                onClick={() => setShowCalculator(true)}
                className="text-sm font-medium text-white/90 hover:text-white flex items-center gap-2 transition hover:bg-white/10 px-3 py-2 rounded-lg"
              >
                <Calculator size={18} /> <span className="hidden sm:inline">Estimateur</span>
              </button>
              {brand?.org_whatsapp && (
                <a
                  href={`https://wa.me/${String(brand.org_whatsapp).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-300 hover:text-green-200 transition p-2 hover:bg-white/10 rounded-full"
                >
                  <MessageCircle size={20} />
                </a>
              )}
            </>
          )}
          {view === "admin" && (
            <button
              onClick={() => setView("home")}
              className="text-xs font-medium text-white/80 hover:text-white flex items-center gap-2 border border-white/30 hover:bg-white/10 px-3 py-1.5 rounded-lg"
            >
              <LogOut size={14} /> Quitter
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

/* =========================================================
   MODALS
========================================================= */

// --- MODAL DE CONNEXION ---
const LoginScreen = ({ onLogin, onCancel, supabase }) => {
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.session) throw new Error("Pas de session.");
      onLogin();
    } catch (err) {
      setError("Erreur : " + (err.message || "Identifiants incorrects"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Espace Staff</h2>
        {!hasConfig && (
           <div className="bg-amber-50 text-amber-600 text-xs p-2 mb-4 rounded border border-amber-200">
             Attention: Clés API non configurées dans le code.
           </div>
        )}
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg" placeholder="Mot de passe" />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          <button type="button" onClick={onCancel} className="w-full py-3 text-slate-400 font-medium text-sm">Retour</button>
        </form>
      </div>
    </div>
  );
};

// --- MODAL ESTIMATEUR ---
const PriceCalculatorModal = ({ onClose, rates }) => {
  const [transportType, setTransportType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState(0);

  const safeRates = rates || {};
  const getRate = (type) => {
    if (!type || !safeRates[type]) return 0;
    const rate = safeRates[type];
    return typeof rate === "object" ? Number(rate.price || 0) : Number(rate || 0);
  };
  const getLabel = (type) => {
    if (!type || !safeRates[type]) return type;
    const rate = safeRates[type];
    return typeof rate === "object" ? (rate.label || type) : type;
  };

  useEffect(() => {
    if (transportType && quantity) setTotal(Number(quantity) * getRate(transportType));
    else setTotal(0);
  }, [quantity, transportType]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in zoom-in-95">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"><X size={24} /></button>
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Calculator className="text-blue-600" size={24} /> Estimateur</h3>
        <div className="space-y-5">
          <input type="number" autoFocus value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-lg" placeholder="Poids ou Volume" />
          <div className="grid grid-cols-1 gap-2">
            {Object.keys(safeRates).map((key) => (
              <button
                key={key}
                onClick={() => setTransportType(key)}
                className={`p-3 rounded-xl border text-left flex justify-between items-center transition ${transportType === key ? "border-blue-500 bg-blue-50 text-blue-800 ring-1" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="flex items-center gap-2"><Plane size={18} /> {getLabel(key)}</div>
                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-blue-100">{getRate(key).toLocaleString()} FG</span>
              </button>
            ))}
          </div>
          {transportType && (
            <div className="bg-slate-900 text-white p-5 rounded-xl flex justify-between items-center shadow-lg">
              <span className="text-slate-400 font-medium text-sm">Total Estimé</span>
              <span className="text-2xl font-bold text-green-400">{formatCurrency(total)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MODAL PAIEMENT DJOMI (UNIQUEMENT RECHARGE) ---
const PaymentModal = ({ onClose, contextData, supabase }) => {
  const [amount, setAmount] = useState(contextData.amount || "");
  const [payerPhone, setPayerPhone] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);

  const isRecharge = contextData.type === "credit_recharge";

  // Gestion de la sélection de pack
  const handlePackSelect = (pack) => {
    setSelectedPack(pack);
    setAmount(pack.price);
  };

  const handlePayment = async () => {
    if (!amount) return alert("Veuillez sélectionner un montant");
    if (!payerPhone) return alert("Veuillez entrer le numéro de téléphone pour le paiement (Orange Money / MTN).");
    if (!supabase) return alert("Erreur: Supabase non initialisé");
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("djomi-pay", {
        body: {
          amount: Number(amount),
          type: contextData.type,
          reference_id: contextData.reference_id,
          phone: payerPhone,
          metadata: isRecharge && selectedPack ? { credits: selectedPack.credits } : {},
          return_url: getReturnUrl() // <--- FIX APPLIQUÉ ICI
        }
      });

      if (error) throw error;
      
      const link = data?.payment_url || data?.link || data?.url;
      if (!link) {
        alert("Erreur: lien de paiement non reçu.");
        return;
      }
      window.location.href = link;
    } catch (e) {
      alert("Erreur paiement: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm relative overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"><X size={24} /></button>
        <div className="text-center mb-6">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <CreditCard className="text-orange-600" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Recharger Crédits
          </h3>
          <p className="text-xs text-slate-400 mt-1">Paiement sécurisé</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase block">Choisir un Pack</label>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.credits}
                  onClick={() => handlePackSelect(pack)}
                  className={`p-3 rounded-lg border text-left flex justify-between items-center transition ${selectedPack === pack ? "border-orange-500 bg-orange-50 ring-1 ring-orange-200" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <div>
                    <div className="font-bold text-slate-800">{pack.credits} SMS</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">{pack.label}</div>
                  </div>
                  <div className="text-orange-700 font-bold text-sm">
                    {formatCurrency(pack.price)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 uppercase block">Numéro de paiement (OM/MOMO)</label>
             <div className="relative">
                <Smartphone className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    type="tel"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    className="w-full pl-10 p-3 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                    placeholder="Ex: 622000000"
                />
             </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
              <Smartphone size={14} /> 
              Vous serez redirigé pour le paiement.
            </p>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading || !selectedPack || !payerPhone}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="animate-spin" /> : <Wallet size={18} />}
            {loading ? "Initialisation..." : "Payer"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL EDITION (MANUEL + SMS TRIGGER) ---
const EditShipmentModal = ({ shipment, onClose, onSave, wallet }) => {
  const [status, setStatus] = useState(shipment.status || "commande");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [showDetails, setShowDetails] = useState(false);
  const [formData, setFormData] = useState({
    client_name: shipment.client_name || "",
    phone: shipment.phone || "",
    description: shipment.description || "",
    weight_kg: shipment.weight_kg || "",
    transport_type: shipment.transport_type || "",
    estimated_delivery: shipment.estimated_delivery || ""
  });

  const hasCredits = wallet && wallet.tracking_credits > 0;

  const handleSave = async () => {
    if (!note) return alert("Ajoutez une note pour cet événement.");
    setLoading(true);

    const updatedFields = {
      client_name: formData.client_name,
      phone: formData.phone,
      description: formData.description,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
      transport_type: formData.transport_type,
      estimated_delivery: formData.estimated_delivery || null,
    };

    // On passe l'intention d'envoyer le SMS si des crédits existent
    await onSave(shipment.id, status, note, updatedFields, hasCredits);
    setLoading(false);
    onClose();
  };

  const cleanPhone = formData.phone ? formData.phone.replace(/\D/g, '') : '';
  const manualMessage = `Bonjour ${formData.client_name}, le statut de votre colis ${shipment.internal_id} a changé: ${status.toUpperCase()}.`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"><X size={24}/></button>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Edit className="text-blue-600" /> Mettre à jour {shipment.internal_id}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nouveau Statut</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-3 border rounded-lg bg-white"
            >
              <option value="commande">Commande</option>
              <option value="transit_chine">Transit Chine</option>
              <option value="entrepot_chine">Entrepôt Chine</option>
              <option value="international">Vol International / Maritime</option>
              <option value="douane_guinee">Douane Conakry</option>
              <option value="livre">Livré</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note / Détail (ex: Lieu)</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Arrivé à l'entrepôt."
              className="w-full p-3 border rounded-lg"
            />
          </div>

          {cleanPhone && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
               <p className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-1">
                 <MessageCircle size={14} /> Notifications Manuelles
               </p>
               <div className="flex gap-2">
                 <a 
                   href={`sms:${cleanPhone}?body=${encodeURIComponent(manualMessage)}`}
                   className="flex-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 transition"
                 >
                   <Smartphone size={14} /> SMS
                 </a>
                 <a 
                   href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(manualMessage)}`}
                   target="_blank"
                   rel="noreferrer"
                   className="flex-1 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-2 transition"
                 >
                   <MessageSquare size={14} /> WhatsApp
                 </a>
               </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
             <button 
               onClick={() => setShowDetails(!showDetails)}
               className="flex items-center justify-between w-full text-left text-sm font-bold text-slate-700 hover:text-slate-900 mb-2"
             >
               <span>Modifier les infos du colis (Client, Poids...)</span>
               {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>
             
             {showDetails && (
               <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-200 animate-in fade-in slide-in-from-top-2">
                 <input 
                   className="w-full p-2 border rounded text-sm" 
                   placeholder="Nom Client" 
                   value={formData.client_name} 
                   onChange={(e) => setFormData({...formData, client_name: e.target.value})} 
                 />
                 <input 
                   className="w-full p-2 border rounded text-sm" 
                   placeholder="Téléphone" 
                   value={formData.phone} 
                   onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                 />
                 <textarea 
                   className="w-full p-2 border rounded text-sm" 
                   rows="2"
                   placeholder="Description" 
                   value={formData.description} 
                   onChange={(e) => setFormData({...formData, description: e.target.value})} 
                 />
                 <div className="grid grid-cols-2 gap-2">
                   <input 
                     type="number"
                     className="w-full p-2 border rounded text-sm" 
                     placeholder="Poids (Kg)" 
                     value={formData.weight_kg} 
                     onChange={(e) => setFormData({...formData, weight_kg: e.target.value})} 
                   />
                    <select 
                      className="w-full p-2 border rounded text-sm"
                      value={formData.transport_type}
                      onChange={(e) => setFormData({...formData, transport_type: e.target.value})}
                    >
                      <option value="">Type...</option>
                      <option value="aerien_express">Aérien Express</option>
                      <option value="aerien_normal">Aérien Normal</option>
                      <option value="maritime">Maritime</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Arrivée estimée</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border rounded text-sm" 
                      value={formData.estimated_delivery} 
                      onChange={(e) => setFormData({...formData, estimated_delivery: e.target.value})} 
                    />
                 </div>
               </div>
             )}
          </div>

          <div className={`p-3 rounded text-xs flex items-center gap-2 mt-4 ${hasCredits ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
             <MessageCircle size={14} /> 
             <span>
               {hasCredits 
                 ? `Crédits disponibles (${wallet.tracking_credits}). SMS envoyé automatiquement.` 
                 : "Pas de crédits. Envoi manuel requis (WhatsApp/SMS)."}
             </span>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {loading ? "Enregistrement..." : "Ajouter l'événement & Mettre à jour"}
          </button>
        </div>
      </div>
    </div>
  );
};


/* =========================================================
   MAIN APP
========================================================= */
export default function App() {
  const [view, setView] = useState("home");
  const [showCalculator, setShowCalculator] = useState(false);
  const [supabase, setSupabase] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Etats globaux
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Recherche
  const [searchId, setSearchId] = useState("");
  const [shipmentData, setShipmentData] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);

  // Admin
  const [userOrg, setUserOrg] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [adminList, setAdminList] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Actions
  const [editingItem, setEditingItem] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentContext, setPaymentContext] = useState({});
  const [uploading, setUploading] = useState(false);

  // Nouveau Colis Form
  const [newShipment, setNewShipment] = useState({
    client_name: "", phone: "", description: "",
    china_tracking: "", intl_tracking: "", weight_kg: "",
    photo_path: "", transport_type: "", estimated_delivery: "",
  });

  // Chargement initial: Historique & SDK Supabase
  useEffect(() => {
    const saved = safeGetStorage("recentSearches");
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch {}
    }

    if (!document.getElementById("supabase-script")) {
      const script = document.createElement("script");
      script.id = "supabase-script";
      script.src = "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js";
      script.async = true;
      script.onload = () => {
        if (window.supabase && hasConfig) {
          const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          setSupabase(client);
          setSdkLoaded(true);
        }
      };
      document.body.appendChild(script);
    } else {
      if (window.supabase && hasConfig && !supabase) {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSupabase(client);
        setSdkLoaded(true);
      }
    }
  }, []);

  // AUTO-LOAD URL PARAMS
  useEffect(() => {
    if (supabase) {
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');
        if (idParam) {
            setSearchId(idParam);
            handleSearch(null, idParam);
        }
    }
  }, [supabase]);

  const handleDirectPayment = async () => {
    if (!supabase || !shipmentData) return;
    
    // 1. VERIFICATION TELEPHONE (OBLIGATOIRE POUR DJOMI)
    if (!shipmentData.phone) {
        alert("⚠️ Impossible de payer : Le numéro de téléphone du client est manquant sur ce colis.");
        return;
    }

    let amount = 0;
    const rates = activeBrand?.org_rates;
    if (shipmentData.weight_kg && rates && shipmentData.transport_type) {
        const rate = rates[shipmentData.transport_type];
        const price = typeof rate === "object" ? Number(rate.price || 0) : Number(rate || 0);
        if (price) amount = Number(shipmentData.weight_kg) * price;
    }

    if (amount <= 0) {
        alert("Montant invalide ou à 0. Impossible de procéder au paiement.");
        return;
    }

    setIsPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("djomi-pay", {
        body: {
          amount: Number(amount),
          type: "shipment_payment",
          reference_id: shipmentData.internal_id, 
          phone: shipmentData.phone,              
          return_url: getReturnUrl() // <--- FIX APPLIQUÉ ICI AUSSI
        }
      });

      if (error) {
         try {
            const errorBody = await error.context.json();
            throw new Error(errorBody.error || error.message);
        } catch (e) {
            throw error;
        }
      }
      
      const link = data?.payment_url || data?.link || data?.url;
      if (link) {
          window.location.href = link;
      } else {
          alert("Erreur technique: lien de paiement non reçu.");
      }
    } catch (e) {
      console.error("Erreur Paiement:", e);
      alert("Erreur initiation paiement: " + (e.message || "Erreur inconnue"));
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handlePrintLabel = (shipment) => {
    if (!userOrg) return alert("Données de l'organisation manquantes");

    let priceDisplay = "N/A";
    if (shipment.amount_due_gnf) {
        priceDisplay = formatCurrency(shipment.amount_due_gnf);
    } else if (shipment.weight_kg && shipment.transport_type && userOrg.public_rates) {
        const rate = userOrg.public_rates[shipment.transport_type];
        const unitPrice = typeof rate === 'object' ? Number(rate.price || 0) : Number(rate || 0);
        if (unitPrice > 0) {
            priceDisplay = formatCurrency(Number(shipment.weight_kg) * unitPrice);
        }
    }

    const printWindow = window.open('', '_blank', 'width=500,height=600');
    if (!printWindow) return alert("Veuillez autoriser les pop-ups pour imprimer.");

    const logoHtml = userOrg.logo_url 
      ? `<img src="${userOrg.logo_url}" alt="Logo" style="max-height: 80px; display: block; margin: 0 auto 15px;" />` 
      : `<h2 style="margin: 0; text-transform: uppercase;">${userOrg.name}</h2>`;

    const trackingUrl = window.location.href.split('?')[0] + '?id=' + shipment.internal_id;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquette ${shipment.internal_id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; margin: 0; text-align: center; width: 100%; box-sizing: border-box; }
          .container { border: 4px solid #000; padding: 20px; max-width: 500px; margin: 0 auto; }
          .header { border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; }
          .org-info { font-size: 16px; color: #333; }
          .big-dest { font-size: 36px; font-weight: 900; margin: 10px 0; text-transform: uppercase; }
          .tracking-box { border: 4px solid #000; padding: 10px; font-size: 42px; font-weight: 900; letter-spacing: 2px; margin: 20px 0; background: #eee; }
          .client-info { text-align: left; font-size: 18px; line-height: 1.6; border-top: 2px solid #000; padding-top: 15px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .label { font-weight: bold; text-transform: uppercase; }
          .value { font-weight: bold; font-size: 20px; }
          .qr-section { margin-top: 20px; padding-top: 20px; border-top: 2px dashed #000; }
          .qr-img { width: 120px; height: 120px; }
          .scan-text { font-size: 12px; font-weight: bold; margin-top: 5px; text-transform: uppercase; }
          .meta { margin-top: 20px; font-size: 10px; border-top: 1px dotted #999; padding-top: 5px; }
          @media print { body { padding: 0; } .container { border: none; max-width: 100%; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoHtml}
            <div class="org-info">
              <strong>${userOrg.name}</strong><br/>
              ${userOrg.phone || userOrg.whatsapp_number || ''}<br/>
              ${userOrg.email_contact || ''}
            </div>
          </div>
          <div class="big-dest">CONAKRY (GN)</div>
          <div class="tracking-box">${shipment.internal_id}</div>
          <div class="client-info">
            <div class="row"><span class="label">Client:</span><span class="value">${shipment.client_name}</span></div>
            <div class="row"><span class="label">Tél:</span><span class="value">${shipment.phone}</span></div>
            <div class="row"><span class="label">Poids:</span><span class="value">${shipment.weight_kg ? shipment.weight_kg + ' KG' : 'N/A'}</span></div>
            <div class="row"><span class="label">Type:</span><span class="value">${shipment.transport_type ? shipment.transport_type.replace('_', ' ').toUpperCase() : 'STANDARD'}</span></div>
            <div class="row"><span class="label">Prix:</span><span class="value">${priceDisplay}</span></div>
             <div class="row" style="margin-top:10px;"><span class="label">Contenu:</span></div>
            <div style="font-style:italic;">${shipment.description || 'Non spécifié'}</div>
          </div>
          <div class="qr-section"><img src="${qrCodeUrl}" alt="QR Code" class="qr-img" /><div class="scan-text">Scanner pour suivre</div></div>
          <div class="meta">Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
        </div>
        <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const fetchUserOrg = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; 

      const { data: staffData } = await supabase.from("staff_members").select("organization_id").eq("user_id", user.id).single();
      if (!staffData) return;

      const { data: orgData } = await supabase.from("organizations").select("*").eq("id", staffData.organization_id).single();
      setUserOrg(orgData);

      const { data: walletData } = await supabase.rpc("get_my_org_wallet");
      if (walletData && walletData.length > 0) setWallet(walletData[0]);
    } catch (e) { setErrorMsg(e.message); } finally { setLoading(false); }
  };

  const fetchAdminData = async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.from("shipments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setAdminList(data || []);
    } catch (e) { setErrorMsg(e.message); } finally { setLoading(false); }
  };

  const handleSearch = async (e, forcedId = null) => {
    if (e) e.preventDefault();
    const idToSearch = (forcedId || searchId || "").trim();
    if (!idToSearch) return;
    if (idToSearch.toUpperCase() === "STAFF") { setView("login"); setSearchId(""); return; }
    if (!supabase) return;

    setLoading(true);
    setErrorMsg("");
    try {
      const { data, error } = await supabase.rpc("get_public_shipment", { p_internal_id: idToSearch });
      if (error || !data || data.length === 0) throw new Error("Numéro de suivi introuvable.");
      const result = Array.isArray(data) ? data[0] : data;
      setShipmentData(result);
      setActiveBrand({ org_name: result.org_name, org_logo: result.org_logo, org_color: result.org_color, org_whatsapp: result.org_whatsapp, org_rates: result.org_public_rates });
      const newHistory = [result.internal_id, ...recentSearches.filter((x) => x !== result.internal_id)].slice(0, 3);
      setRecentSearches(newHistory);
      safeSetStorage("recentSearches", JSON.stringify(newHistory));
      setView("track");
    } catch (err) { setErrorMsg(err.message); } finally { setLoading(false); }
  };

  const createShipment = async () => {
    if (!supabase) return alert("Système non prêt");
    try {
      setLoading(true);
      if (!userOrg?.id) throw new Error("Organisation introuvable.");
      const id = `GN-${Math.floor(10000 + Math.random() * 90000)}`;
      const payload = { internal_id: id, organization_id: userOrg.id, client_name: newShipment.client_name, phone: newShipment.phone, description: newShipment.description, china_tracking: newShipment.china_tracking, intl_tracking: newShipment.intl_tracking, weight_kg: newShipment.weight_kg ? Number(newShipment.weight_kg) : null, photo_path: newShipment.photo_path || null, transport_type: newShipment.transport_type || null, estimated_delivery: newShipment.estimated_delivery || null, status: "commande" };
      const { data: insertedShipment, error: insertError } = await supabase.from("shipments").insert([payload]).select().single();
      if (insertError) throw insertError;
      await supabase.from("shipment_events").insert([{ shipment_id: insertedShipment.id, status: "commande", note: "Dossier ouvert.", source: "manual" }]);
      alert(`Colis créé : ${id}`);
      setNewShipment({ client_name: "", phone: "", description: "", china_tracking: "", intl_tracking: "", weight_kg: "", photo_path: "", transport_type: "", estimated_delivery: "" });
      await fetchAdminData();
    } catch(e) { setErrorMsg(e.message); } finally { setLoading(false); }
  };

  /**
   * SECTION MISE À JOUR & SMS
   * Synchronisé avec l'Edge Function "notify-sms" du Canvas
   */
  const updateShipmentStatus = async (shipmentId, newStatus, note, extraFields = {}, sendSms = false) => {
    if (!supabase) return alert("Système non prêt");
    try {
        // 1. Ajouter l'événement historique
        const { error: eventError } = await supabase
            .from("shipment_events")
            .insert([{ shipment_id: shipmentId, status: newStatus, note: note, source: "manual" }]);
        if (eventError) throw eventError;

        // 2. Mise à jour des champs du colis
        const updatePayload = { status: newStatus, ...extraFields };
        const { error: updateError } = await supabase
            .from("shipments")
            .update(updatePayload)
            .eq("id", shipmentId);
        if (updateError) throw updateError;

        // 3. Envoi SMS automatique via Edge Function "notify-sms"
        if (sendSms) {
             if (!userOrg?.id) {
                 alert("Erreur: Organisation non identifiée pour l'envoi SMS.");
                 return;
             }

             const item = adminList.find(s => s.id === shipmentId);

             // Appel à notify-sms (Edge Function du Canvas)
             const { error: smsError } = await supabase.functions.invoke('notify-sms', {
                body: { 
                    phone: extraFields.phone || item?.phone, 
                    internal_id: item?.internal_id || 'Colis',
                    client_name: extraFields.client_name || item?.client_name,
                    status: newStatus,
                    note: note,
                    organization_id: userOrg.id // Obligatoire pour les crédits
                }
            });
            
            if (smsError) {
                console.error("Erreur Edge Function:", smsError);
                alert("Statut mis à jour, mais l'envoi du SMS a échoué (CORS ou crédits).");
            } else {
                alert("Statut mis à jour et SMS envoyé !");
                fetchUserOrg(); // Mise à jour des crédits affichés
            }
        } else {
            alert("Mise à jour effectuée.");
        }

        await fetchAdminData();
    } catch (e) {
        alert("Erreur: " + e.message);
    }
  };

  const handleNewShipmentUpload = async (event) => {
    if (!supabase) return alert("Système non prêt");
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileName = `temp_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("shipment-photos").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("shipment-photos").getPublicUrl(fileName);
      setNewShipment((prev) => ({ ...prev, photo_path: data.publicUrl }));
    } catch (e) { alert(e.message); } finally { setUploading(false); }
  };

  if (view === "login") {
    return <LoginScreen onLogin={async () => { await fetchUserOrg(); setView("admin"); await fetchAdminData(); }} onCancel={() => setView("home")} supabase={supabase} />;
  }

  const currentBrand = view === "track" ? activeBrand : { org_name: userOrg?.name, org_logo: userOrg?.logo_url, org_color: userOrg?.primary_color, org_whatsapp: userOrg?.whatsapp_number };
  const calculatorRates = view === "track" ? activeBrand?.org_rates : userOrg?.public_rates || userOrg?.rates || null;
  const homeBgColor = activeBrand?.org_color || "#1e3a8a";

  const filteredAdminList = adminList.filter((item) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "chine" && (item.status === "transit_chine" || item.status === "entrepot_chine")) return true;
    if (filterStatus === "inter" && item.status === "international") return true;
    if (filterStatus === "douane" && item.status === "douane_guinee") return true;
    if (filterStatus === "livre" && item.status === "livre") return true;
    return false;
  });

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen relative flex flex-col overflow-x-hidden">
      <Navbar view={view} setView={setView} setShowCalculator={setShowCalculator} brand={currentBrand} />
      
      {showCalculator && <PriceCalculatorModal onClose={() => setShowCalculator(false)} rates={calculatorRates} />}
      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} contextData={paymentContext} supabase={supabase} />}
      
      {editingItem && (
        <EditShipmentModal 
            shipment={editingItem} 
            onClose={() => setEditingItem(null)} 
            onSave={updateShipmentStatus}
            wallet={wallet}
        />
      )}

      {view === "admin" && (
        <div className="flex-grow bg-slate-100 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Administration</h2>
                {userOrg && (
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-slate-500 font-medium">{userOrg.name}</p>
                    {wallet && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${wallet.tracking_credits > 0 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                          <Coins size={12} /> {wallet.tracking_credits} Crédits (SMS)
                        </span>
                        <button onClick={() => { setPaymentContext({ type: "credit_recharge", reference_id: userOrg.id }); setShowPaymentModal(true); }} className="text-[10px] font-bold bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700 transition flex items-center gap-1">
                          <Plus size={10} /> Recharger
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {errorMsg && <div className="mb-4 text-red-600 bg-red-50 py-2 px-4 rounded-lg border border-red-100 flex items-center gap-2"><AlertCircle size={18} /> {errorMsg}</div>}

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {[{ id: "all", label: "Tout" }, { id: "chine", label: "Chine", icon: <Package size={14} /> }, { id: "inter", label: "International", icon: <Plane size={14} /> }, { id: "douane", label: "Douane", icon: <Lock size={14} /> }, { id: "livre", label: "Livré", icon: <CheckCircle2 size={14} /> }].map((f) => (
                <button key={f.id} onClick={() => setFilterStatus(f.id)} className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${filterStatus === f.id ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-200"}`}>{f.icon} {f.label}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-600" /> Nouveau Colis</h3>
                  <div className="space-y-3">
                    <input className="w-full p-2 border rounded text-sm" placeholder="Nom Client" value={newShipment.client_name} onChange={(e) => setNewShipment({ ...newShipment, client_name: e.target.value })} />
                    <input className="w-full p-2 border rounded text-sm" placeholder="Téléphone" value={newShipment.phone} onChange={(e) => setNewShipment({ ...newShipment, phone: e.target.value })} />
                    <textarea className="w-full p-2 border rounded text-sm" rows="3" placeholder="Description" value={newShipment.description} onChange={(e) => setNewShipment({ ...newShipment, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 border rounded">
                      <select className="w-full p-1.5 border rounded text-xs" value={newShipment.transport_type} onChange={(e) => setNewShipment({ ...newShipment, transport_type: e.target.value })}>
                        <option value="">Transport...</option>
                        <option value="aerien_express">Aérien Express</option>
                        <option value="aerien_normal">Aérien Normal</option>
                        <option value="maritime">Maritime</option>
                      </select>
                      <input type="date" className="w-full p-1.5 border rounded text-xs" value={newShipment.estimated_delivery} onChange={(e) => setNewShipment({ ...newShipment, estimated_delivery: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" className="w-full p-2 border rounded text-xs" placeholder="Poids (Kg)" value={newShipment.weight_kg} onChange={(e) => setNewShipment({ ...newShipment, weight_kg: e.target.value })} />
                      <label className={`cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-2 py-2 rounded flex items-center gap-1 w-full justify-center border border-slate-300 ${uploading ? "opacity-50" : ""}`}>
                        {uploading ? <RefreshCw className="animate-spin" size={12} /> : <UploadCloud size={14} />} Photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleNewShipmentUpload} disabled={uploading} />
                      </label>
                    </div>
                    <button onClick={createShipment} disabled={loading || uploading} className="w-full bg-slate-900 text-white font-bold py-2 rounded hover:bg-slate-800 transition">Créer le Colis</button>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-3">
                {filteredAdminList.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:border-blue-300 transition gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-sm">{item.internal_id}</span>
                        <span className="text-slate-900 font-bold text-sm truncate">{item.client_name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <StatusBadge status={item.status} />
                      <button onClick={() => handlePrintLabel(item)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition border border-slate-200"><Printer size={16} /></button>
                      <button onClick={() => setEditingItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition border border-blue-100"><Edit size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "home" && (
        <div className="flex-grow flex flex-col items-center justify-center p-4 relative w-full">
          <div className="absolute top-0 left-0 w-full h-96 skew-y-3 origin-top-left -translate-y-24 z-0 pointer-events-none" style={{ backgroundColor: homeBgColor }} />
          <div className="relative z-10 w-full max-w-4xl text-center mt-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Suivi Logistique International</h1>
            <div className="bg-white p-2 rounded-xl shadow-2xl max-w-xl mx-auto border border-slate-100">
              <form onSubmit={(e) => handleSearch(e)} className="flex flex-col md:flex-row gap-2 w-full">
                <div className="relative flex-grow">
                  <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                  <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="Entrez votre numéro de suivi" className="w-full pl-12 pr-4 py-3 bg-transparent outline-none font-medium text-lg" />
                </div>
                <button type="submit" disabled={loading} className="text-white font-bold py-3 px-8 rounded-lg transition shadow-lg" style={{ backgroundColor: homeBgColor }}>{loading ? <RefreshCw className="animate-spin" /> : <ChevronRight />}</button>
              </form>
            </div>
            {recentSearches.length > 0 && (
              <div className="mt-12 flex flex-col items-center relative z-10">
                <p className="text-black font-bold text-xs uppercase mb-3 flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-lg border border-white/50"><Clock size={14} /> Vos dernières recherches</p>
                <div className="flex gap-3 flex-wrap justify-center">
                  {recentSearches.map((id) => (
                    <button key={id} onClick={() => { setSearchId(id); handleSearch(null, id); }} className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-100 px-5 py-2.5 rounded-xl text-sm font-mono font-bold transition shadow-lg hover:shadow-xl flex items-center gap-2"><Package size={16} className="text-emerald-500" /> {id}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-8"><button onClick={() => setView("login")} className="text-white/90 hover:text-white font-bold text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full backdrop-blur-sm">Accès STAFF</button></div>
          </div>
        </div>
      )}

      {view === "track" && shipmentData && (
        <div className="flex-grow flex flex-col min-h-screen">
          <div className="pb-24 pt-12 px-4" style={{ backgroundColor: activeBrand?.org_color || "#1e3a8a" }}>
            <div className="container mx-auto max-w-4xl">
              <button onClick={() => { setView("home"); setActiveBrand(null); }} className="text-white hover:text-white/80 mb-6 flex items-center gap-2 text-sm font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full w-fit backdrop-blur-sm shadow-sm"><ArrowLeft size={18} /> Retour</button>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div><p className="text-white/70 font-bold tracking-wider text-sm uppercase mb-1">Numéro de suivi</p><h1 className="text-4xl font-mono font-bold text-white">{shipmentData.internal_id}</h1></div>
                <StatusBadge status={shipmentData.status} color={activeBrand?.org_color} />
              </div>
            </div>
          </div>
          <div className="container mx-auto max-w-4xl px-4 -mt-16 relative z-10 pb-10">
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div><p className="text-xs text-slate-400 uppercase font-bold">Colis suivi par</p><h2 className="text-xl font-bold" style={{ color: activeBrand?.org_color || "#1e293b" }}>{activeBrand?.org_name || "PLATEFORME LOGISTIQUE"}</h2></div>
                <button onClick={handleDirectPayment} disabled={isPaymentLoading} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition shadow-md text-sm disabled:opacity-50">{isPaymentLoading ? <RefreshCw className="animate-spin" size={16} /> : <CreditCard size={16} />} Payer la livraison</button>
              </div>
              <div className="flex flex-col md:flex-row">
                <div className="p-6 md:p-8 flex-1 space-y-6">
                  <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Client</p><p className="font-bold text-slate-800 text-lg">{shipmentData.client_name}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Contenu</p><p className="font-semibold text-slate-800 flex items-center gap-2 text-sm"><Package size={16} /> {shipmentData.description}</p></div>
                    {shipmentData.weight_kg && <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Poids</p><p className="font-semibold text-slate-800 flex items-center gap-2 text-sm"><Scale size={16} /> {shipmentData.weight_kg} Kg</p></div>}
                  </div>
                </div>
                {shipmentData.photo_path && <div className="md:w-1/2 bg-slate-100 border-l border-slate-100 p-4 flex items-center justify-center"><img src={shipmentData.photo_path} alt="Photo" className="max-h-64 rounded-lg shadow-sm border border-white object-contain" /></div>}
              </div>
              <div className="p-6 md:p-8 border-t border-slate-100 mt-4"><h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2"><MapPin size={20} /> Historique</h3><Timeline updates={shipmentData.updates} color={activeBrand?.org_color} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from "react";
import {
  Package, Search, Plane, CheckCircle2,
  MapPin, AlertCircle, ChevronRight, Anchor,
  LogOut, Plus, RefreshCw, Calculator,
  MessageCircle, X, Edit, Lock,
  Scale, UploadCloud, Clock, Coins, ArrowLeft,
  CreditCard, Wallet, ChevronDown, ChevronUp,
  Smartphone, MessageSquare, Printer, Building2, ShieldCheck, Box
} from "lucide-react";

/* =========================================================
   CONFIG
========================================================= */
const SUPABASE_URL = "https://rvkidhldutbufaugdxiy.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2a2lkaGxkdXRidWZhdWdkeGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTQzMDMsImV4cCI6MjA4MjE3MDMwM30.TFy03OOytt9DvH-PRU9lulUjFLWZibcY_XN0r3eofvg";

const APP_URL = "https://guineatrack.com/";

const hasConfig = SUPABASE_URL && SUPABASE_ANON_KEY;

const CREDIT_PACKS = [
  { credits: 100, price: 20000, label: "Découverte" },
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
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(date);
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

const getReturnUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return "https://google.com"; 
    }
    return window.location.href;
};

/* =========================================================
   UI Components - REFRESHED ✨
========================================================= */
const AlertModal = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-4 text-rose-600">
          <AlertCircle size={24} />
          <h3 className="font-black text-lg">Attention</h3>
        </div>
        <p className="text-slate-700 font-medium mb-6">{message}</p>
        <button onClick={onClose} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">
          Compris
        </button>
      </div>
    </div>
  );
};

const StatusBadge = ({ status, color, large = false }) => {
  const styles = {
    en_preparation: "bg-slate-100 text-slate-700 ring-slate-200/50",
    commande: "bg-slate-100 text-slate-700 ring-slate-200/50",
    transit_chine: "bg-blue-50 text-blue-700 ring-blue-200/50",
    entrepot_chine: "bg-indigo-50 text-indigo-700 ring-indigo-200/50",
    international: "bg-violet-50 text-violet-700 ring-violet-200/50",
    douane_guinee: "bg-amber-50 text-amber-700 ring-amber-200/50",
    livre: "bg-teal-50 text-teal-700 ring-teal-200/50",
    recupere: "bg-slate-800 text-white ring-slate-900/50",
  };
  
  let label = status ? status.replace(/_/g, " ").toUpperCase() : "INCONNU";
  if (status === 'douane_guinee') label = "DOUANE";
  if (status === 'livre') label = "DISPO. AGENCE";
  if (status === 'recupere') label = "RÉCUPÉRÉ";

  const customStyle = (color && (status === "livre" || status === "recupere"))
    ? { backgroundColor: status === "recupere" ? color : `${color}15`, color: status === "recupere" ? '#fff' : color }
    : {};

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold tracking-wider ring-1 ring-inset ${large ? 'px-4 py-2 text-xs' : 'px-2.5 py-1 text-[10px]'} ${!color ? (styles[status] || "bg-gray-100 text-gray-600 ring-gray-200/50") : ""}`}
      style={customStyle}
    >
      {label}
    </span>
  );
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'en_preparation': return <Box size={16} />;
    case 'entrepot_chine': return <Building2 size={16} />;
    case 'international': return <Plane size={16} />;
    case 'douane_guinee': return <ShieldCheck size={16} />;
    case 'livre': return <MapPin size={16} />;
    case 'recupere': return <CheckCircle2 size={16} />;
    default: return <Package size={16} />;
  }
};

const Timeline = ({ updates, color }) => {
  const safeUpdates = Array.isArray(updates) ? updates : [];
  const sortedUpdates = [...safeUpdates].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedUpdates.length === 0) return <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 font-medium">Aucun historique disponible.</div>;

  return (
    <div className="relative pl-6 space-y-8 my-4 ml-2 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:to-transparent">
      {sortedUpdates.map((update, idx) => {
        const isLatest = idx === 0;
        return (
          <div key={idx} className="relative flex items-start group">
            <div 
              className={`absolute left-[-24px] flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-110 ${isLatest ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}
              style={isLatest && color ? { backgroundColor: color } : {}}
            >
              {getStatusIcon(update.status)}
            </div>
            <div className={`ml-8 flex flex-col pt-1 ${!isLatest && 'opacity-70 group-hover:opacity-100 transition-opacity'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <span className={`text-sm font-black uppercase tracking-wide ${isLatest ? "text-slate-900" : "text-slate-600"}`}>
                  {String(update.status || "").replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1 sm:mt-0">
                  {formatDate(update.date)}
                </span>
              </div>
              <p className="mt-2 text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100/60 shadow-sm">{update.note}</p>
              {update.source && update.source !== 'manual' && (
                 <span className="mt-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold w-fit">
                   Système
                 </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Navbar = ({ view, setView, setShowCalculator, brand }) => {
  const primaryColor = brand?.org_color || "#0f172a"; // Slate-900 default
  const brandName = brand?.org_name || "LOGISTIQUE PRO";
  const logoUrl = brand?.org_logo || brand?.logo_url || null;

  return (
    <nav className="sticky top-0 z-50 transition-all duration-300 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView("home")}>
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-10 w-auto max-w-[120px] rounded-xl bg-white p-1 object-contain shadow-sm border border-slate-100 group-hover:shadow-md transition-all" />
          ) : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-2 rounded-xl shadow-md group-hover:shadow-lg transition-all" style={brand?.org_color ? { background: primaryColor } : {}}>
              <Anchor className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="font-black text-lg tracking-tight text-slate-900 truncate max-w-[180px] sm:max-w-none">{brandName}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {view === "track" && (
            <>
              <button
                onClick={() => setShowCalculator(true)}
                className="hidden sm:flex text-sm font-bold text-slate-600 hover:text-slate-900 items-center gap-2 transition bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full"
              >
                <Calculator size={16} /> <span>Estimer</span>
              </button>
              <button
                onClick={() => setShowCalculator(true)}
                className="sm:hidden text-slate-600 hover:text-slate-900 p-2 transition bg-slate-100 hover:bg-slate-200 rounded-full"
              >
                <Calculator size={18} />
              </button>
              
              {brand?.org_whatsapp && (
                <a
                  href={`https://wa.me/${String(brand.org_whatsapp).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition p-2.5 rounded-full flex items-center justify-center shadow-sm"
                >
                  <MessageCircle size={18} className="fill-current" />
                </a>
              )}
            </>
          )}
          {view === "admin" && (
            <button
              onClick={() => {
                if(window.supabase) window.supabase.auth.signOut();
                setView("home");
              }}
              className="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 flex items-center gap-2 bg-rose-50 px-4 py-2 rounded-full transition-colors shadow-sm"
            >
              <LogOut size={14} /> <span className="hidden sm:inline">Déconnexion</span>
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

const Input = ({ label, icon: Icon, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-3.5 text-slate-400" size={18} />}
      <input 
        className={`w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-medium ${Icon ? 'pl-10' : ''}`}
        {...props}
      />
    </div>
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">{label}</label>}
    <select 
      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-medium appearance-none"
      {...props}
    >
      {children}
    </select>
  </div>
);

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
      setError("Erreur : Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white w-full max-w-sm relative z-10">
        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Lock size={24} />
        </div>
        <h2 className="text-2xl font-black text-center text-slate-900 mb-8 tracking-tight">Accès Sécurisé</h2>
        
        {!hasConfig && (
           <div className="bg-amber-50 text-amber-600 text-xs p-3 mb-6 rounded-xl border border-amber-200 font-medium text-center">
             ⚠️ API Supabase non configurée
           </div>
        )}
        <form onSubmit={handleAuth} className="space-y-5">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email professionnel" icon={MessageSquare} required />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" icon={Lock} required />
          
          {error && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 p-2 rounded-lg">{error}</p>}
          
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex justify-center items-center gap-2">
            {loading ? <RefreshCw className="animate-spin" size={18} /> : "Se connecter"}
          </button>
          
          <button type="button" onClick={onCancel} className="w-full py-3 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Retour à l'accueil</button>
        </form>
      </div>
    </div>
  );
};

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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 bg-slate-100 p-2 rounded-full transition-colors"><X size={20} /></button>
        <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Calculator className="text-blue-600" size={28} /> Estimateur</h3>
        
        <div className="space-y-6">
          <div>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 mb-2 block">Poids ou Volume total</label>
             <input type="number" autoFocus value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-4 border border-slate-200 bg-slate-50 rounded-2xl font-black text-2xl text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="0" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 block">Mode d'expédition</label>
            <div className="grid grid-cols-1 gap-2">
              {Object.keys(safeRates).map((key) => (
                <button
                  key={key}
                  onClick={() => setTransportType(key)}
                  className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${transportType === key ? "border-blue-500 bg-blue-50/50 shadow-[0_0_0_2px_rgba(59,130,246,0.1)]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${transportType === key ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Plane size={18} />
                    </div>
                    <span className={`font-bold ${transportType === key ? 'text-blue-900' : 'text-slate-700'}`}>{getLabel(key)}</span>
                  </div>
                  <span className="text-xs font-black bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-slate-600">{getRate(key).toLocaleString()} GNF</span>
                </button>
              ))}
            </div>
          </div>

          {transportType && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-xl transform transition-all">
              <span className="text-slate-400 font-bold tracking-wider text-xs uppercase mb-1">Montant estimé</span>
              <span className="text-4xl font-black text-emerald-400 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">{formatCurrency(total)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ onClose, contextData, supabase, userOrg, showAlert }) => {
  const [amount, setAmount] = useState(contextData.amount || "");
  const [loading, setLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);

  const isRecharge = contextData.type === "credit_recharge";
  
  // On récupère automatiquement le numéro du Cargo en arrière-plan
  const cargoPhone = userOrg?.phone || userOrg?.whatsapp_number || "";

  const handlePackSelect = (pack) => {
    setSelectedPack(pack);
    setAmount(pack.price);
  };

  const handlePayment = async () => {
    if (!amount) return showAlert("Veuillez sélectionner un montant.");
    if (!cargoPhone) return showAlert("Erreur : Aucun numéro de téléphone n'est configuré pour votre Cargo. Djomi en a besoin pour identifier le paiement.");
    if (!supabase) return showAlert("Erreur: Supabase non initialisé.");
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("djomi-pay", {
        body: {
          amount: Number(amount),
          type: contextData.type,
          reference_id: contextData.reference_id,
          phone: cargoPhone, // <-- Envoi invisible à Djomi
          metadata: isRecharge && selectedPack ? { credits: selectedPack.credits } : {},
          return_url: getReturnUrl()
        }
      });

      if (error) throw error;
      
      const link = data?.payment_url || data?.link || data?.url;
      if (!link) {
        showAlert("Erreur: lien de paiement non reçu.");
        return;
      }

      const newWindow = window.open(link, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = link;
      } else {
          onClose();
      }
    } catch (e) {
      showAlert("Erreur paiement: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 bg-slate-100 p-2 rounded-full transition-colors"><X size={20} /></button>
        
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-orange-400 to-rose-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30 transform -rotate-6">
            <CreditCard className="text-white" size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Recharger</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Paiement sécurisé via Djomi</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.credits}
                  onClick={() => handlePackSelect(pack)}
                  className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${selectedPack === pack ? "border-orange-500 bg-orange-50/50 shadow-[0_0_0_2px_rgba(249,115,22,0.1)]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <div>
                    <div className={`font-black text-lg ${selectedPack === pack ? 'text-orange-600' : 'text-slate-800'}`}>{pack.credits} SMS</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{pack.label}</div>
                  </div>
                  <div className="text-slate-900 font-bold bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                    {formatCurrency(pack.price)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading || !selectedPack}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Wallet size={20} />}
            {loading ? "Initialisation..." : "Procéder au paiement"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditShipmentModal = ({ shipment, onClose, onSave, onUpdateInfo, wallet, currentUser }) => {
  const defaultNotes = {
    en_preparation: "Votre colis est en cours de préparation.",
    entrepot_chine: "Votre colis a été réceptionné dans notre entrepôt en Chine.",
    international: "Votre colis est en route vers la Guinée.",
    douane_guinee: "Votre colis est arrivé à Conakry et est en cours d'inspection douanière.",
    livre: "Votre colis est arrivé ! Il est disponible et vous attend à notre agence.",
    recupere: "Votre colis a bien été récupéré. Merci pour votre confiance !"
  };

  const initialStatus = ["commande", "transit_chine"].includes(shipment.status) ? "en_preparation" : (shipment.status || "en_preparation");
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(defaultNotes[initialStatus] || "");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(shipment.payment_status || "unpaid");
  const [sendSmsAuto, setSendSmsAuto] = useState(true);
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [modalError, setModalError] = useState("");
  
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
    if (!note) {
      setModalError("Veuillez ajouter une note pour cet événement.");
      return;
    }
    setModalError("");
    setLoading(true);

    const updatedFields = {
      client_name: formData.client_name,
      phone: formData.phone,
      description: formData.description,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
      transport_type: formData.transport_type,
      estimated_delivery: formData.estimated_delivery || null,
      payment_status: paymentStatus,
      payment_method: paymentStatus === 'paid' && shipment.payment_status !== 'paid' ? 'liquide' : shipment.payment_method,
    };

    await onSave(shipment.id, status, note, updatedFields, hasCredits && sendSmsAuto);
    setLoading(false);
    onClose();
  };

  const handleUpdateInfoOnly = async () => {
    setLoading(true);
    const updatedFields = {
      client_name: formData.client_name,
      phone: formData.phone,
      description: formData.description,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
      transport_type: formData.transport_type,
      estimated_delivery: formData.estimated_delivery || null,
      payment_status: paymentStatus,
      payment_method: paymentStatus === 'paid' && shipment.payment_status !== 'paid' ? 'liquide' : shipment.payment_method,
    };
    await onUpdateInfo(shipment.id, updatedFields);
    setLoading(false);
    onClose();
  };

  const handleMarkAsPaid = () => {
    setConfirmPaid(true);
  };

  const executeMarkAsPaid = async () => {
    setLoading(true);
    const updatedFields = {
      payment_status: 'paid',
      payment_method: 'liquide',
      payment_received_by: currentUser?.email || 'Staff Inconnu'
    };
    await onUpdateInfo(shipment.id, updatedFields);
    setLoading(false);
    onClose();
  };

  const cleanPhone = formData.phone ? formData.phone.replace(/\D/g, '') : '';
  const trackingLink = `${APP_URL}?id=${shipment.internal_id}`;
  
  // Formate la note pour intégrer naturellement l'ID du colis
  const formattedNote = note.replace(/^Votre colis/i, `Votre colis ${shipment.internal_id}`);
  const finalMessageStr = formattedNote.includes(shipment.internal_id) ? formattedNote : `Votre colis ${shipment.internal_id} : ${note}`;
  
  const manualMessage = `${formData.client_name ? `Bonjour ${formData.client_name},\n\n` : ''}${finalMessageStr}\n\nSuivez l'avancée de votre colis ici :\n${trackingLink}`;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative max-h-[95vh] overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-200">
        
        <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-5 border-b border-slate-100 flex justify-between items-center z-10">
          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <Edit size={20} />
            </div>
            {shipment.internal_id}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
        </div>
        
        <div className="p-6 space-y-6">
          
          {modalError && (
            <div className="bg-rose-50 text-rose-600 font-bold p-3 rounded-xl border border-rose-200 flex items-center gap-2 text-sm animate-in fade-in">
              <AlertCircle size={16} /> {modalError}
            </div>
          )}

          <div className="space-y-4">
            <Select 
              label="Nouveau Statut"
              value={status} 
              onChange={(e) => {
                const newStatus = e.target.value;
                setStatus(newStatus);
                setNote(defaultNotes[newStatus] || "");
              }}
            >
              <option value="en_preparation">En préparation</option>
              <option value="entrepot_chine">Entrepôt Chine</option>
              <option value="international">Vol International / Maritime</option>
              <option value="douane_guinee">Douane</option>
              <option value="livre">Disponible à l'agence</option>
              <option value="recupere">Récupéré par le client</option>
            </Select>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Note (Visible par le client)</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Arrivé à l'entrepôt."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-medium resize-none"
              />
            </div>

            <div className="pt-2 pb-2">
              {hasCredits ? (
                <label className="flex items-start gap-3 p-4 rounded-2xl mb-4 border bg-emerald-50 border-emerald-200 text-emerald-800 cursor-pointer transition-colors hover:bg-emerald-100/50 shadow-sm">
                  <input 
                    type="checkbox" 
                    checked={sendSmsAuto} 
                    onChange={(e) => setSendSmsAuto(e.target.checked)} 
                    className="mt-0.5 w-5 h-5 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-black flex items-center gap-2 tracking-tight">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      Envoyer un SMS automatique
                    </span>
                    <span className="text-xs text-emerald-600/80 font-bold mt-0.5">
                      Il vous reste {wallet.tracking_credits} crédits.
                    </span>
                  </div>
                </label>
              ) : (
                <div className="p-4 rounded-2xl mb-4 border bg-amber-50 border-amber-200 text-amber-800 shadow-sm">
                   <p className="text-xs font-black flex items-center gap-2">
                     <AlertCircle size={16} className="text-amber-500" />
                     Pas de crédits. SMS automatique inactif.
                   </p>
                </div>
              )}

              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98] text-lg flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" /> : <MapPin size={20} />}
                Mettre à jour le statut
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {cleanPhone && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-2xl border border-indigo-100/50">
               <p className="text-[10px] font-black text-indigo-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                 <MessageCircle size={14} /> Messages Rapides
               </p>
               <div className="flex flex-wrap sm:flex-nowrap gap-2">
                 <a 
                   href={`sms:${cleanPhone}?body=${encodeURIComponent(manualMessage)}`}
                   className="flex-1 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                 >
                   <Smartphone size={16} /> SMS
                 </a>
                 <a 
                   href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(manualMessage)}`}
                   target="_blank"
                   rel="noreferrer"
                   className="flex-1 bg-[#25D366] hover:bg-[#1DA851] text-white border border-transparent text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                 >
                   <MessageSquare size={16} /> WhatsApp
                 </a>
               </div>
               <p className="text-xs text-indigo-600/70 mt-3 font-medium text-center">
                 * N'oubliez pas de cliquer sur "Mettre à jour le statut" ci-dessus pour enregistrer.
               </p>
            </div>
          )}

          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 mb-2">Finance</h4>
            
            {shipment.payment_status === 'paid' ? (
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-700 font-black">
                  <div className="bg-emerald-200/50 p-1 rounded-full"><CheckCircle2 size={18} /></div>
                  Colis réglé
                </div>
                <div className="flex flex-col gap-1">
                  {shipment.payment_received_by && (
                    <span className="text-xs text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg font-bold w-fit border border-emerald-200/50">
                      Caisse : {shipment.payment_received_by}
                    </span>
                  )}
                  {shipment.payment_method !== 'liquide' && (
                    <span className="text-xs text-green-700 bg-green-100 px-3 py-1.5 rounded-lg font-bold w-fit border border-green-200/50 flex items-center gap-1.5">
                      <Smartphone size={12} /> Via Mobile
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100/50 flex flex-col gap-4">
                <span className="font-bold text-amber-900 text-sm">Ce colis est en attente de paiement.</span>
                {confirmPaid ? (
                  <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95">
                    <span className="text-xs font-bold text-amber-800">Confirmer l'encaissement en espèces ?</span>
                    <div className="flex gap-2">
                      <button onClick={executeMarkAsPaid} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm">Oui</button>
                      <button onClick={() => setConfirmPaid(false)} disabled={loading} className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl border border-slate-200 transition-all shadow-sm">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleMarkAsPaid}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                  >
                    <Wallet size={18} /> Encaisser (Espèces)
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-6">
             <button 
               onClick={() => setShowDetails(!showDetails)}
               className="flex items-center justify-between w-full text-left text-sm font-black text-slate-800 hover:text-slate-600 transition-colors"
             >
               <span>Modifier les détails du colis</span>
               <div className="bg-slate-100 p-1 rounded-full">
                 {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
               </div>
             </button>
             
             {showDetails && (
               <div className="mt-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <Input placeholder="Client" value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} />
                   <Input placeholder="Tél" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                 </div>
                 <Input placeholder="Contenu (ex: Chaussures)" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <Input type="number" placeholder={formData.transport_type === 'maritime' ? "Volume (CBM)" : "Poids (Kg)"} value={formData.weight_kg} onChange={(e) => setFormData({...formData, weight_kg: e.target.value})} />
                   <Select value={formData.transport_type} onChange={(e) => setFormData({...formData, transport_type: e.target.value})}>
                      <option value="">Transport</option>
                      <option value="aerien_express">Aérien Express</option>
                      <option value="aerien_normal">Aérien Normal</option>
                      <option value="maritime">Maritime</option>
                    </Select>
                 </div>
                 <Input type="date" label="Arrivée prévue" value={formData.estimated_delivery} onChange={(e) => setFormData({...formData, estimated_delivery: e.target.value})} />
                 
                 <button 
                   onClick={handleUpdateInfoOnly}
                   disabled={loading}
                   className="w-full mt-2 bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-800 hover:text-slate-900 font-bold py-3 rounded-xl transition-all"
                 >
                   {loading ? "Sauvegarde..." : "Sauvegarder"}
                 </button>
               </div>
             )}
          </div>
          
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
  
  // Alert Globale
  const [alertMessage, setAlertMessage] = useState("");

  // Etats globaux
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false); // État pour le menu déroulant sur mobile

  // Recherche
  const [searchId, setSearchId] = useState("");
  const [shipmentData, setShipmentData] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);

  // Admin
  const [userOrg, setUserOrg] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
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
    photo_path: "", transport_type: "", estimated_delivery: ""
  });

  const getWhatsAppReminderLink = (item) => {
    const cleanPhone = item.phone ? item.phone.replace(/\D/g, '') : '';
    const trackingUrl = `${APP_URL}?id=${item.internal_id}`;
    const message = `Bonjour ${item.client_name || 'Cher client'},\n\nVotre colis *${item.internal_id}* vous attend !\n\nPour gagner du temps lors du retrait, vous pouvez régler votre facture dès maintenant de manière sécurisée via ce lien :\n${trackingUrl}\n\nMerci de votre confiance et à très vite !`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

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

  // RÉCUPÉRATION D'URL (SANS AUTO-LOGIN FORCE)
  useEffect(() => {
    if (supabase) {
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');
        if (idParam) {
            setSearchId(idParam);
            handleSearch(null, idParam);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const refreshWalletSilently = async () => {
    if (!supabase) return;
    try {
      const { data: walletData } = await supabase.rpc("get_my_org_wallet");
      if (walletData && walletData.length > 0) setWallet(walletData[0]);
    } catch (e) {
      console.error("Erreur actualisation portefeuille", e);
    }
  };

  useEffect(() => {
    let interval;
    if (view === "admin" && supabase) {
      interval = setInterval(() => {
        refreshWalletSilently();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [view, supabase]);

  const manualRefreshWallet = async () => {
    setIsRefreshingWallet(true);
    await refreshWalletSilently();
    setTimeout(() => setIsRefreshingWallet(false), 500); 
  };

  const handleDirectPayment = async () => {
    if (!supabase || !shipmentData) return;
    
    if (!shipmentData.phone) {
        setAlertMessage("⚠️ Impossible de payer : Le numéro de téléphone du client est manquant sur ce colis.");
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
        setAlertMessage("Montant invalide ou à 0. Impossible de procéder au paiement.");
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
          return_url: getReturnUrl()
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
      if (!link) {
          setAlertMessage("Erreur technique: lien de paiement non reçu.");
          return;
      }
      window.location.href = link;
    } catch (e) {
      console.error("Erreur Paiement:", e);
      setAlertMessage("Erreur initiation paiement: " + (e.message || "Erreur inconnue"));
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handlePrintLabel = (shipment) => {
    if (!userOrg) return setAlertMessage("Données de l'organisation manquantes");

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
    if (!printWindow) return setAlertMessage("Veuillez autoriser les pop-ups pour imprimer.");

    const logoHtml = userOrg.logo_url 
      ? `<img src="${userOrg.logo_url}" alt="Logo" style="max-height: 80px; display: block; margin: 0 auto 15px;" />` 
      : `<h2 style="margin: 0; text-transform: uppercase;">${userOrg.name}</h2>`;

    const trackingUrl = `${APP_URL}?id=${shipment.internal_id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`;

    const unit = shipment.transport_type === 'maritime' ? 'CBM' : 'KG';
    const weightLabel = shipment.transport_type === 'maritime' ? 'Volume:' : 'Poids:';

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
          <div class="big-dest">CONAKRY</div>
          <div class="tracking-box">${shipment.internal_id}</div>
          <div class="client-info">
            <div class="row"><span class="label">Client:</span><span class="value">${shipment.client_name}</span></div>
            <div class="row"><span class="label">Tél:</span><span class="value">${shipment.phone}</span></div>
            <div class="row"><span class="label">${weightLabel}</span><span class="value">${shipment.weight_kg ? shipment.weight_kg + ' ' + unit : 'N/A'}</span></div>
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

  const fetchUserOrg = async (prefetchedUser = null) => {
    try {
      setLoading(true);
      setErrorMsg("");
      if (!supabase) return;
      
      let user = prefetchedUser;
      if (!user) {
         const { data } = await supabase.auth.getUser();
         user = data?.user;
      }
      if (!user) return; 

      setCurrentUser(user);

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
    if (!supabase) return setAlertMessage("Système non prêt");
    try {
      setLoading(true);
      if (!userOrg?.id) throw new Error("Organisation introuvable.");
      const id = `GN-${Math.floor(10000 + Math.random() * 90000)}`;
      const payload = { 
        internal_id: id, organization_id: userOrg.id, client_name: newShipment.client_name, 
        phone: newShipment.phone, description: newShipment.description, china_tracking: newShipment.china_tracking, 
        intl_tracking: newShipment.intl_tracking, weight_kg: newShipment.weight_kg ? Number(newShipment.weight_kg) : null, 
        photo_path: newShipment.photo_path || null, transport_type: newShipment.transport_type || null, 
        estimated_delivery: newShipment.estimated_delivery || null, status: "en_preparation",
        payment_status: "unpaid"
      };
      const { data: insertedShipment, error: insertError } = await supabase.from("shipments").insert([payload]).select().single();
      if (insertError) throw insertError;
      await supabase.from("shipment_events").insert([{ shipment_id: insertedShipment.id, status: "en_preparation", note: "Dossier ouvert.", source: "manual" }]);
      
      setNewShipment({ client_name: "", phone: "", description: "", china_tracking: "", intl_tracking: "", weight_kg: "", photo_path: "", transport_type: "", estimated_delivery: "" });
      setIsNewShipmentOpen(false); // Ferme l'accordéon après création sur mobile
      await fetchAdminData();
    } catch(e) { setErrorMsg(e.message); } finally { setLoading(false); }
  };

  const updateShipmentInfo = async (shipmentId, extraFields) => {
    if (!supabase) return setAlertMessage("Système non prêt");
    try {
        const { error: updateError } = await supabase
            .from("shipments")
            .update(extraFields)
            .eq("id", shipmentId);
        if (updateError) throw updateError;
        await fetchAdminData();
    } catch (e) {
        setAlertMessage("Erreur: " + e.message);
    }
  };

  const updateShipmentStatus = async (shipmentId, newStatus, note, extraFields = {}, sendSms = false) => {
    if (!supabase) return setAlertMessage("Système non prêt");
    try {
        const { error: eventError } = await supabase
            .from("shipment_events")
            .insert([{ shipment_id: shipmentId, status: newStatus, note: note, source: "manual" }]);
        if (eventError) throw eventError;

        const updatePayload = { status: newStatus, ...extraFields };
        const { error: updateError } = await supabase
            .from("shipments")
            .update(updatePayload)
            .eq("id", shipmentId);
        if (updateError) throw updateError;

        if (sendSms) {
             if (!userOrg?.id) {
                 setAlertMessage("Erreur: Organisation non identifiée pour l'envoi SMS.");
                 return;
             }

             const item = adminList.find(s => s.id === shipmentId);

             const { error: smsError } = await supabase.functions.invoke('notify-sms', {
                body: { 
                    phone: extraFields.phone || item?.phone, 
                    internal_id: item?.internal_id || 'Colis',
                    client_name: extraFields.client_name || item?.client_name,
                    status: newStatus,
                    note: note,
                    organization_id: userOrg.id 
                }
            });
            
            if (smsError) {
                console.error("Erreur Edge Function:", smsError);
                setAlertMessage("Statut mis à jour, mais l'envoi du SMS a échoué (CORS ou crédits).");
            } else {
                refreshWalletSilently(); 
            }
        }
        await fetchAdminData();
    } catch (e) {
        setAlertMessage("Erreur: " + e.message);
    }
  };

  const handleNewShipmentUpload = async (event) => {
    if (!supabase) return setAlertMessage("Système non prêt");
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileName = `temp_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("shipment-photos").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("shipment-photos").getPublicUrl(fileName);
      setNewShipment((prev) => ({ ...prev, photo_path: data.publicUrl }));
    } catch (e) { setAlertMessage(e.message); } finally { setUploading(false); }
  };

  if (view === "login") {
    return <LoginScreen onLogin={async () => { await fetchUserOrg(); setView("admin"); await fetchAdminData(); }} onCancel={() => setView("home")} supabase={supabase} />;
  }

  const currentBrand = view === "track" ? activeBrand : { org_name: userOrg?.name, org_logo: userOrg?.logo_url, org_color: userOrg?.primary_color, org_whatsapp: userOrg?.whatsapp_number };
  const calculatorRates = view === "track" ? activeBrand?.org_rates : userOrg?.public_rates || userOrg?.rates || null;
  const homeBgColor = activeBrand?.org_color || "#0f172a"; // Default dark slate

  const filteredAdminList = adminList.filter((item) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "paye" && item.payment_status === "paid") return true;
    if (filterStatus === "non_paye" && item.payment_status !== "paid") return true;
    if (filterStatus === "chine" && (item.status === "en_preparation" || item.status === "commande" || item.status === "transit_chine" || item.status === "entrepot_chine")) return true;
    if (filterStatus === "inter" && item.status === "international") return true;
    if (filterStatus === "douane" && item.status === "douane_guinee") return true;
    if (filterStatus === "livre" && item.status === "livre") return true;
    if (filterStatus === "recupere" && item.status === "recupere") return true;
    return false;
  });

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen flex flex-col selection:bg-blue-200">
      
      {/* Affichage de la boîte de dialogue d'alerte */}
      <AlertModal message={alertMessage} onClose={() => setAlertMessage("")} />

      <Navbar view={view} setView={setView} setShowCalculator={setShowCalculator} brand={currentBrand} />
      
      {showCalculator && <PriceCalculatorModal onClose={() => setShowCalculator(false)} rates={calculatorRates} />}
      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} contextData={paymentContext} supabase={supabase} userOrg={userOrg} showAlert={setAlertMessage} />}
      
      {editingItem && (
        <EditShipmentModal 
            shipment={editingItem} 
            onClose={() => setEditingItem(null)} 
            onSave={updateShipmentStatus}
            onUpdateInfo={updateShipmentInfo}
            wallet={wallet}
            currentUser={currentUser}
        />
      )}

      {/* VUE ADMIN */}
      {view === "admin" && (
        <div className="flex-grow p-4 sm:p-8 animate-in fade-in duration-500">
          <div className="max-w-7xl mx-auto">
            
            {/* Header Admin */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tableau de Bord</h2>
                {userOrg && <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-widest">{userOrg.name}</p>}
              </div>
              
              {wallet && (
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2">
                  <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-black text-sm ${wallet.tracking_credits > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    <MessageSquare size={16} /> {wallet.tracking_credits} <span className="hidden sm:inline">Crédits</span>
                  </div>
                  
                  <button 
                    onClick={manualRefreshWallet} 
                    className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors" 
                    title="Actualiser les crédits"
                  >
                    <RefreshCw size={18} className={`${isRefreshingWallet ? "animate-spin text-blue-600" : ""}`} />
                  </button>

                  <button 
                    onClick={() => { setPaymentContext({ type: "credit_recharge", reference_id: userOrg.id }); setShowPaymentModal(true); }} 
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-md active:scale-95"
                  >
                    <Plus size={16} /> <span className="hidden sm:inline">Recharger</span>
                  </button>
                </div>
              )}
            </div>

            {errorMsg && <div className="mb-6 bg-rose-50 text-rose-600 font-bold p-4 rounded-2xl border border-rose-200 flex items-center gap-3"><AlertCircle size={20} /> {errorMsg}</div>}

            {/* Filtres Pilules */}
            <div className="flex gap-2 sm:gap-3 mb-8 overflow-x-auto pb-4 custom-scrollbar snap-x">
              {[{ id: "all", label: "Tous" }, { id: "paye", label: "Payés", icon: <CheckCircle2 size={16} /> }, { id: "non_paye", label: "Non Payés", icon: <AlertCircle size={16} /> }, { id: "chine", label: "Chine", icon: <Building2 size={16} /> }, { id: "inter", label: "Transit", icon: <Plane size={16} /> }, { id: "douane", label: "Douane", icon: <ShieldCheck size={16} /> }, { id: "livre", label: "Agence", icon: <MapPin size={16} /> }, { id: "recupere", label: "Terminé", icon: <CheckCircle2 size={16} /> }].map((f) => (
                <button 
                  key={f.id} 
                  onClick={() => setFilterStatus(f.id)} 
                  className={`snap-start px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap border-2 ${filterStatus === f.id ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-white border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-900 shadow-sm"}`}
                >
                  {f.icon} {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Création Colis (Accordéon sur mobile) */}
              <div className="lg:col-span-4">
                <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 lg:sticky top-24">
                  <button 
                    onClick={() => setIsNewShipmentOpen(!isNewShipmentOpen)}
                    className="w-full flex items-center justify-between lg:pointer-events-none"
                  >
                    <h3 className="font-black text-slate-900 flex items-center gap-3 text-lg">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><Package size={20} /></div>
                      Nouveau Colis
                    </h3>
                    <div className="lg:hidden bg-slate-100 p-1.5 rounded-full text-slate-600">
                      {isNewShipmentOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  <div className={`mt-6 space-y-4 ${isNewShipmentOpen ? 'block' : 'hidden'} lg:block`}>
                    <Input placeholder="Nom du Client" value={newShipment.client_name} onChange={(e) => setNewShipment({ ...newShipment, client_name: e.target.value })} />
                    <Input placeholder="Numéro de Téléphone" value={newShipment.phone} onChange={(e) => setNewShipment({ ...newShipment, phone: e.target.value })} />
                    
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-medium resize-none" 
                      rows="2" 
                      placeholder="Description du contenu" 
                      value={newShipment.description} 
                      onChange={(e) => setNewShipment({ ...newShipment, description: e.target.value })} 
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select value={newShipment.transport_type} onChange={(e) => setNewShipment({ ...newShipment, transport_type: e.target.value })}>
                        <option value="">Transport</option>
                        <option value="aerien_express">Express ✈️</option>
                        <option value="aerien_normal">Normal ✈️</option>
                        <option value="maritime">Bateau 🚢</option>
                      </Select>
                      <Input type="date" value={newShipment.estimated_delivery} onChange={(e) => setNewShipment({ ...newShipment, estimated_delivery: e.target.value })} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <Input type="number" placeholder={newShipment.transport_type === 'maritime' ? "Volume (CBM)" : "Poids (Kg)"} value={newShipment.weight_kg} onChange={(e) => setNewShipment({ ...newShipment, weight_kg: e.target.value })} />
                      <label className={`cursor-pointer h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-colors ${uploading ? "opacity-50" : ""}`}>
                        {uploading ? <RefreshCw className="animate-spin" size={18} /> : <UploadCloud size={18} />} Photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleNewShipmentUpload} disabled={uploading} />
                      </label>
                    </div>
                    
                    <button onClick={createShipment} disabled={loading || uploading} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-[0.98]">
                      Créer le Dossier
                    </button>
                  </div>
                </div>
              </div>

              {/* Liste Colis */}
              <div className="lg:col-span-8 space-y-4">
                {filteredAdminList.map((item) => (
                  <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5 group">
                    <div className="flex items-start gap-4">
                      <div className="hidden sm:flex h-12 w-12 bg-slate-50 border border-slate-100 rounded-2xl items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                        {getStatusIcon(item.status)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-black text-slate-900 tracking-tight text-lg">{item.client_name || "Client Inconnu"}</span>
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200">{item.internal_id}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 line-clamp-1 max-w-md">{item.description || "Aucune description"}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
                      {item.payment_status === 'paid' ? (
                        item.payment_method !== 'liquide' ? (
                          <span className="text-[10px] bg-green-50 text-green-700 font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-green-200/50 whitespace-nowrap">
                            <Smartphone size={14} /> MOBILE
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-emerald-200/50 whitespace-nowrap">
                            <Coins size={14} /> ESPÈCES
                          </span>
                        )
                      ) : (
                        item.phone ? (
                          <a 
                            href={getWhatsAppReminderLink(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-rose-200/50 whitespace-nowrap transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Envoyer un rappel de paiement sur WhatsApp"
                          >
                            <AlertCircle size={14} /> NON PAYÉ <MessageSquare size={12} className="ml-1 opacity-60" />
                          </a>
                        ) : (
                          <button 
                            onClick={() => setErrorMsg(`Le colis ${item.internal_id} n'a pas de numéro de téléphone enregistré.`)}
                            className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-rose-200/50 whitespace-nowrap transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Numéro manquant"
                          >
                            <AlertCircle size={14} /> NON PAYÉ
                          </button>
                        )
                      )}
                      
                      <div className="flex-1 sm:flex-none flex justify-end">
                        <StatusBadge status={item.status} />
                      </div>

                      <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
                        <button onClick={() => handlePrintLabel(item)} className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><Printer size={18} /></button>
                        <button onClick={() => setEditingItem(item)} className="p-2.5 text-blue-600 hover:bg-blue-100 bg-blue-50 rounded-xl transition-colors"><Edit size={18} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredAdminList.length === 0 && (
                  <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 border-dashed">
                    <Package size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold text-lg">Aucun colis trouvé.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VUE HOME - MODERNISÉE ✨ */}
      {view === "home" && (
        <div className="flex-grow flex flex-col items-center justify-center p-4 relative w-full overflow-hidden">
          
          {/* Animated Background Blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob" style={{ backgroundColor: homeBgColor }}></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000" style={{ backgroundColor: homeBgColor }}></div>

          <div className="relative z-10 w-full max-w-2xl text-center mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tighter leading-tight drop-shadow-sm">
              Où est votre <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 pr-2 pb-2 inline-block">colis ?</span>
            </h1>
            
            <div className="bg-white/60 backdrop-blur-2xl p-3 rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-white/80 mx-auto transform transition-all focus-within:scale-[1.02] focus-within:shadow-[0_8px_50px_rgb(0,0,0,0.12)]">
              <form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative flex-grow flex items-center">
                  <Search className="absolute left-6 text-slate-400" size={24} />
                  <input 
                    type="text" 
                    value={searchId} 
                    onChange={(e) => setSearchId(e.target.value)} 
                    placeholder="Entrez votre numéro GN-..." 
                    className="w-full pl-16 pr-6 py-4 bg-transparent outline-none font-bold text-xl sm:text-2xl text-slate-800 placeholder:text-slate-400 placeholder:font-medium tracking-wide" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="text-white font-black text-lg py-4 px-10 rounded-[1.5rem] transition-all shadow-lg hover:shadow-xl flex items-center justify-center min-w-[140px]" 
                  style={{ backgroundColor: homeBgColor }}
                >
                  {loading ? <RefreshCw className="animate-spin" size={24} /> : "Suivre"}
                </button>
              </form>
            </div>

            {recentSearches.length > 0 && (
              <div className="mt-16 flex flex-col items-center relative z-10 animate-in fade-in duration-1000 delay-300">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-4">Consultés récemment</p>
                <div className="flex gap-3 flex-wrap justify-center">
                  {recentSearches.map((id) => (
                    <button 
                      key={id} 
                      onClick={() => { setSearchId(id); handleSearch(null, id); }} 
                      className="bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 border border-slate-200/50 px-5 py-2.5 rounded-2xl text-sm font-mono font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <Package size={16} className="text-blue-500" /> {id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VUE TRACKING */}
      {view === "track" && shipmentData && (
        <div className="flex-grow flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500">
          
          {/* Header coloré du suivi */}
          <div className="pb-32 pt-16 px-4 relative overflow-hidden" style={{ backgroundColor: activeBrand?.org_color || "#0f172a" }}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="container mx-auto max-w-3xl relative z-10">
              <button onClick={() => { setView("home"); setActiveBrand(null); }} className="text-white hover:bg-white/20 mb-8 flex items-center gap-2 text-sm font-bold bg-white/10 px-5 py-2.5 rounded-full w-fit backdrop-blur-md transition-all">
                <ArrowLeft size={18} /> Retour à l'accueil
              </button>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <p className="text-white/60 font-bold tracking-widest text-xs uppercase mb-2">Suivi de colis</p>
                  <h1 className="text-5xl md:text-6xl font-black font-mono text-white tracking-tighter drop-shadow-md">{shipmentData.internal_id}</h1>
                </div>
                <div className="bg-white p-2 rounded-3xl shadow-2xl">
                   <StatusBadge status={shipmentData.status} color={activeBrand?.org_color} large />
                </div>
              </div>
            </div>
          </div>

          {/* Corps du suivi */}
          <div className="container mx-auto max-w-3xl px-4 -mt-24 relative z-20 pb-20">
            <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              
              <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <Building2 className="text-slate-400" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Transporteur</p>
                    <h2 className="text-xl font-black tracking-tight" style={{ color: activeBrand?.org_color || "#0f172a" }}>{activeBrand?.org_name || "LOGISTIQUE PRO"}</h2>
                  </div>
                </div>
                
                {shipmentData.payment_status === 'paid' ? (
                  <div className="bg-emerald-50 text-emerald-700 font-black py-3 px-5 rounded-2xl flex items-center gap-2 shadow-sm border border-emerald-200/50 w-full sm:w-auto justify-center">
                    <CheckCircle2 size={20} /> Payé
                  </div>
                ) : (
                  <button onClick={handleDirectPayment} disabled={isPaymentLoading} className="bg-slate-900 hover:bg-slate-800 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg active:scale-95 w-full sm:w-auto justify-center">
                    {isPaymentLoading ? <RefreshCw className="animate-spin" size={18} /> : <CreditCard size={18} />} Régler la facture
                  </button>
                )}
              </div>

              <div className="flex flex-col md:flex-row">
                <div className="p-6 sm:p-8 flex-1 space-y-8">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Destinataire</p>
                    <p className="font-black text-slate-900 text-2xl">{shipmentData.client_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Contenu</p>
                      <p className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                        <Box size={18} className="text-blue-500" /> {shipmentData.description}
                      </p>
                    </div>
                    {shipmentData.weight_kg && (
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">
                          {shipmentData.transport_type === 'maritime' ? 'Volume' : 'Poids'}
                        </p>
                        <p className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                          <Scale size={18} className="text-emerald-500" /> {shipmentData.weight_kg} {shipmentData.transport_type === 'maritime' ? 'CBM' : 'Kg'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {shipmentData.photo_path && (
                  <div className="md:w-5/12 bg-slate-100 p-4 sm:p-8 flex items-center justify-center relative group">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                    <img src={shipmentData.photo_path} alt="Photo du colis" className="w-full h-auto max-h-64 object-cover rounded-2xl shadow-md border-4 border-white transform transition-transform group-hover:scale-105" />
                  </div>
                )}
              </div>
              
              <div className="p-6 sm:p-10 border-t border-slate-100">
                <h3 className="font-black text-2xl text-slate-900 mb-8 flex items-center gap-3 tracking-tight">
                  <MapPin className="text-rose-500" size={28} /> Parcours du colis
                </h3>
                <Timeline updates={shipmentData.updates} color={activeBrand?.org_color} />
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
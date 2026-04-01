import React, { useEffect, useState } from "react";
import {
  Package, Search, Plane, CheckCircle2,
  MapPin, AlertCircle, ChevronRight, Anchor,
  LogOut, Plus, RefreshCw, Calculator,
  MessageCircle, X, Edit, Lock,
  Scale, UploadCloud, Clock, Coins, ArrowLeft,
  CreditCard, Wallet, ChevronDown, ChevronUp,
  Smartphone, MessageSquare, Printer, Building2, ShieldCheck, Box,
  Rocket, Users, Globe, Send, Settings, Save, Palette, DollarSign, Image,
  Key, Trash2, Mail, Download, BarChart3, PieChart, Activity, Crown, UserPlus, FileText
} from "lucide-react";
import { 
  safeGetStorage, safeSetStorage, formatDate, 
  formatCurrency, getReturnUrl, extractErrorMessage 
} from "./utils/helpers";
import { Input } from "./components/ui/Input";
import { Select } from "./components/ui/Select";
import { StatusBadge } from "./components/ui/StatusBadge";
import { AlertModal } from "./components/ui/AlertModal";
import { ConfirmModal } from "./components/ui/ConfirmModal";
import { Navbar } from "./components/layout/Navbar";
import { LoginScreen } from "./features/auth/LoginScreen";
import { SuperAdminScreen } from "./features/superadmin/SuperAdminScreen";
import { PartnerScreen } from "./features/partner/PartnerScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { EditShipmentModal } from "./features/admin/EditShipmentModal";
import { PaymentModal } from "./features/billing/PaymentModal";
import { PriceCalculatorModal } from "./features/tracking/PriceCalculatorModal";
import { Timeline, getStatusIcon } from "./features/tracking/Timeline";
import { WelcomePasswordModal } from "./features/auth/WelcomePasswordModal";
import { SubscriptionExpiredScreen } from "./features/billing/SubscriptionExpiredScreen";
import { HomeScreen } from "./features/home/HomeScreen";
import { TrackingScreen } from "./features/tracking/TrackingScreen";
import { AdminScreen } from "./features/admin/AdminScreen"; 
import { CargoWalletScreen } from "./features/billing/CargoWalletScreen";
import { PublicDropScreen } from "./features/public/PublicDropScreen";

// 🟢 IMPORT DU NOUVEAU COMPOSANT
import AuthConfirm from "./features/auth/AuthConfirm";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const APP_URL = "https://guineatrack.com/";
const hasConfig = SUPABASE_URL && SUPABASE_ANON_KEY;

let globalSupabaseClient = null;

export default function App() {
  // 🟢 AIGUILLAGE INTELLIGENT
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      // 🟢 Si le lien pointe vers /auth/confirm, on charge cette vue
      if (pathname.startsWith('/auth/confirm')) {
        return 'auth_confirm';
      }

      const hostname = window.location.hostname;
      if (hostname.startsWith('pro.') || hostname.startsWith('app.')) {
        return 'login';
      }
    }
    return 'home'; 
  });
  
  const [dropSlug, setDropSlug] = useState(""); 
  const [showCalculator, setShowCalculator] = useState(false);
  const [supabase, setSupabase] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  
  const [alertMessage, setAlertMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);
  const [isNewInvite, setIsNewInvite] = useState(false);

  const [searchId, setSearchId] = useState("");
  const [shipmentData, setShipmentData] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);

  const [userOrg, setUserOrg] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null); 
  const [wallet, setWallet] = useState(null);
  const [adminList, setAdminList] = useState([]);
  
  const [editingItem, setEditingItem] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentContext, setPaymentContext] = useState({});
  const [shipmentToDelete, setShipmentToDelete] = useState(null);

  useEffect(() => {
    const currentUrl = window.location.href;
    const isConfirmPage = currentUrl.includes('/auth/confirm');
    
    // 🟢 Ne déclencher le modal que si on n'est PAS sur la page de confirmation (qui gère ça toute seule)
    if (!isConfirmPage) {
      const isInvite = currentUrl.includes('type=invite') || currentUrl.includes('recovery');
      if (isInvite) setIsNewInvite(true);
    }
  }, []);

  useEffect(() => {
    const saved = safeGetStorage("recentSearches");
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch {}
    }

    const initSupabase = () => {
      if (window.supabase && hasConfig) {
        if (!globalSupabaseClient) {
          globalSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { storage: window.localStorage }
          });
        }
        setSupabase(globalSupabaseClient);
        setSdkLoaded(true);
      }
    };

    if (!document.getElementById("supabase-script")) {
      const script = document.createElement("script");
      script.id = "supabase-script";
      script.src = "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js";
      script.async = true;
      script.onload = initSupabase;
      document.body.appendChild(script);
    } else {
      initSupabase();
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dropParam = urlParams.get('d');
    
    if (dropParam) {
      setDropSlug(dropParam);
      setView('public_drop');
    }

    if (supabase) {
        const idParam = urlParams.get('id');
        if (idParam) {
            setSearchId(idParam);
            handleSearch(null, idParam);
        }
        
        const hashStr = window.location.hash.substring(1);
        if (hashStr) {
            const hashParams = new URLSearchParams(hashStr);
            if (hashParams.get('error')) {
                const errorDesc = hashParams.get('error_description');
                setAlertMessage("Désolé, ce lien est invalide ou a expiré. Détail : " + (errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : ""));
                window.history.replaceState(null, '', window.location.pathname);
            }
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    const initializeAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('d') || window.location.pathname.startsWith('/auth/confirm')) return;
      
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          await supabase.auth.signOut();
          return;
        }

        if (session?.user && isMounted) {
          const isAuthorized = await fetchUserOrg(session.user);
          if (isAuthorized === 'superadmin') {
            setView('superadmin');
          } else if (isAuthorized === true) {
            await fetchAdminData();
            setView('admin');
          } else {
            await supabase.auth.signOut();
            setView('home');
            setAlertMessage("❌ Accès refusé ou compte révoqué.");
          }
        }
      } catch (err) {
        console.error("Erreur d'authentification :", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isConfirmPage = window.location.pathname.startsWith('/auth/confirm');
      
      if (!isConfirmPage && (event === 'PASSWORD_RECOVERY' || window.location.href.includes('type=invite') || window.location.hash.includes('type=invite') || window.location.hash.includes('recovery'))) {
        setIsNewInvite(true);
      }

      const urlParams = new URLSearchParams(window.location.search);
      const isPublicDrop = urlParams.get('d');

      if (event === 'SIGNED_IN' && !isPublicDrop && !isConfirmPage) {
        initializeAuth();
      } else if (event === 'SIGNED_OUT') {
         setUserOrg(null);
         setCurrentUser(null);
         setCurrentUserRole(null);
         setAdminList([]);
         if (!isPublicDrop && !isConfirmPage) setView('home');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const refreshWalletSilently = async () => {
    if (!supabase || !userOrg?.id) return;
    try {
      const { data } = await supabase
        .from('organization_wallets')
        .select('tracking_credits')
        .eq('organization_id', userOrg.id)
        .maybeSingle();

      if (data) {
        setWallet({ tracking_credits: data.tracking_credits });
      } else {
        setWallet({ tracking_credits: 0 });
      }
    } catch (e) {
      console.error("Erreur actualisation portefeuille", e);
    }
  };

  useEffect(() => {
    refreshWalletSilently();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOrg?.id]);

  useEffect(() => {
    let interval;
    if ((view === "admin" || view === "settings") && supabase) {
      interval = setInterval(() => {
        refreshWalletSilently();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [view, supabase, userOrg]);

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

    let amount = Number(shipmentData.amount_due_gnf) || 0;

    if (amount <= 0) {
        setAlertMessage("Montant invalide ou non défini. Impossible de procéder au paiement.");
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
      setAlertMessage("Erreur initiation paiement: " + extractErrorMessage(e));
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const fetchUserOrg = async (prefetchedUser = null) => {
    try {
      setLoading(true);
      setErrorMsg("");
      if (!supabase) return false;
      
      let user = prefetchedUser;
      if (!user) {
         const { data } = await supabase.auth.getUser();
         user = data?.user;
      }
      if (!user) return false; 

      const { data: superAdminData } = await supabase
          .from('superadmins')
          .select('email')
          .eq('email', user.email)
          .maybeSingle();

      if (superAdminData) {
          setCurrentUser(user);
          setCurrentUserRole('superadmin');
          return 'superadmin';
      }

      setCurrentUser(user);

      const { data: staffData, error: staffError } = await supabase.from("staff_members").select("organization_id, role").eq("user_id", user.id).single();
      if (staffError || !staffData) return false;

      setCurrentUserRole(staffData.role);

      const { data: orgData } = await supabase.from("organizations").select("*").eq("id", staffData.organization_id).single();
      setUserOrg(orgData);

      const { data: walletData } = await supabase
        .from('organization_wallets')
        .select('tracking_credits')
        .eq('organization_id', orgData.id)
        .maybeSingle();
        
      if (walletData) {
        setWallet({ tracking_credits: walletData.tracking_credits });
      } else {
        setWallet({ tracking_credits: 0 });
      }
      
      return true;
    } catch (e) {
      setErrorMsg(extractErrorMessage(e));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async (orgId = null) => {
    if (!supabase) return;
    try {
      setLoading(true);
      const targetOrgId = orgId || userOrg?.id;
      let query = supabase.from("shipments").select("*").order("created_at", { ascending: false });
      if (targetOrgId) query = query.eq('organization_id', targetOrgId);
      const { data, error } = await query;
      if (error) throw error;
      setAdminList(data || []);
    } catch (e) { setErrorMsg(extractErrorMessage(e)); } finally { setLoading(false); }
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
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(`Désolé, le numéro de suivi ${idToSearch} est introuvable ou n'existe pas.`);
      
      const result = Array.isArray(data) ? data[0] : data;
      setShipmentData(result);
      setActiveBrand({ org_name: result.org_name, org_logo: result.org_logo, org_color: result.org_color, org_whatsapp: result.org_whatsapp, org_rates: result.org_public_rates });
      const newHistory = [result.internal_id, ...recentSearches.filter((x) => x !== result.internal_id)].slice(0, 3);
      setRecentSearches(newHistory);
      safeSetStorage("recentSearches", JSON.stringify(newHistory));
      setView("track");
    } catch (err) { 
      setErrorMsg(extractErrorMessage(err)); 
      setAlertMessage("❌ " + extractErrorMessage(err)); 
    } finally { 
      setLoading(false); 
    }
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
        setAlertMessage("Erreur: " + extractErrorMessage(e));
    }
  };

  const updateShipmentStatus = async (shipmentId, newStatus, note, extraFields = {}, sendSms = false, sendEmail = false) => {
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

        const item = adminList.find(s => s.id === shipmentId);
        const trackingLink = `${APP_URL}?id=${item?.internal_id || 'Colis'}`;

        if (sendSms === true && userOrg?.id) {
             const { error: smsError } = await supabase.functions.invoke('notify-sms', {
                body: { 
                    phone: extraFields.phone || item?.phone, 
                    internal_id: item?.internal_id || 'Colis',
                    client_name: extraFields.client_name || item?.client_name,
                    status: newStatus,
                    note: note,
                    tracking_url: trackingLink,
                    organization_id: userOrg.id 
                }
            });

            if (smsError) {
                console.error("Erreur Edge Function SMS:", smsError);
                let isOutOfCredits = false;
                try {
                    const errBody = await smsError.context.json();
                    if (errBody.error && errBody.error.includes("Crédits insuffisants")) isOutOfCredits = true;
                } catch(e) {
                    if (smsError.message && smsError.message.includes("Crédits insuffisants")) isOutOfCredits = true;
                }

                if (isOutOfCredits) {
                    setAlertMessage("⚠️ Statut modifié, mais SMS non envoyé : Vous n'avez plus de crédits. Veuillez recharger votre portefeuille.");
                } else {
                    setAlertMessage("⚠️ Statut mis à jour, mais une erreur technique a empêché l'envoi du SMS.");
                }
            } else {
                if (typeof setWallet === 'function') {
                    setWallet(prev => prev ? { ...prev, tracking_credits: prev.tracking_credits - 1 } : prev);
                }
                if (typeof refreshWalletSilently === 'function') {
                    refreshWalletSilently(); 
                }
            }
        }
        if (sendEmail === true && extraFields.email) {
            const { error: emailError } = await supabase.functions.invoke('notify-email', {
                body: { 
                    email: extraFields.email, 
                    internal_id: item?.internal_id || 'Colis',
                    client_name: extraFields.client_name || item?.client_name,
                    status: newStatus,
                    note: note,
                    tracking_url: trackingLink,
                    organization_name: userOrg?.name || "LOGISTIQUE PRO",
                    organization_logo: userOrg?.logo_url || null,
                    organization_id: userOrg?.id 
                }
            });

            if (emailError) {
                console.error("Erreur Edge Function Email:", emailError);
                let isQuotaReached = false;
                try {
                    const errBody = await emailError.context.json();
                    if (errBody.error === "QUOTA_ATTEINT") isQuotaReached = true;
                } catch(e) {
                    if (emailError.message && emailError.message.includes("403")) isQuotaReached = true;
                }

                if (isQuotaReached) {
                    setAlertMessage("⚠️ Statut modifié, mais l'e-mail n'a pas été envoyé. Votre quota mensuel d'e-mails est épuisé ! Passez au forfait supérieur.");
                } else {
                    setAlertMessage("⚠️ Statut mis à jour, mais un problème technique a empêché l'envoi de l'e-mail.");
                }
            } else {
                if (typeof setUserOrg === 'function') {
                    setUserOrg(prevOrg => ({
                        ...prevOrg,
                        emails_sent_this_month: (prevOrg.emails_sent_this_month || 0) + 1
                    }));
                }
            }
        }

        await fetchAdminData();
    } catch (e) {
        setAlertMessage("Erreur: " + extractErrorMessage(e));
    }
  };

  const executeDeleteShipment = async () => {
    if (!shipmentToDelete) return;
    setLoading(true);
    try {
      const { error: eventsError } = await supabase.from('shipment_events').delete().eq('shipment_id', shipmentToDelete.id);
      if (eventsError) console.warn("Avertissement suppression événements:", eventsError);

      const { error } = await supabase.from('shipments').delete().eq('id', shipmentToDelete.id);
      if (error) throw error;

      setAlertMessage("✅ Colis supprimé avec succès.");
      await fetchAdminData();
    } catch (error) {
      console.error("Erreur de suppression:", error);
      setAlertMessage("❌ Erreur lors de la suppression : " + extractErrorMessage(error));
    } finally {
      setLoading(false);
      setShipmentToDelete(null);
    }
  };


  if (view === "login") {
    return <LoginScreen 
      onLogin={async () => { 
        const ok = await fetchUserOrg(); 
        if(ok === 'superadmin') {
            setView("superadmin");
        } else if(ok === true) { 
            setView("admin"); await fetchAdminData(); 
        } else { 
            supabase?.auth.signOut(); setAlertMessage("❌ Accès refusé ou révoqué."); 
        } 
      }} 
      onCancel={() => setView("home")} 
      supabase={supabase} 
      hasConfig={hasConfig} 
    />;
  }

  const currentBrand = (view === "track") ? activeBrand : { org_name: userOrg?.name, org_logo: userOrg?.logo_url, org_color: userOrg?.primary_color, org_whatsapp: userOrg?.whatsapp_number };
  const calculatorRates = view === "track" ? activeBrand?.org_rates : userOrg?.public_rates || userOrg?.rates || null;
  const homeBgColor = activeBrand?.org_color || "#0f172a"; 

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen flex flex-col selection:bg-blue-200">
      
      <AlertModal message={alertMessage} onClose={() => setAlertMessage("")} />

      {shipmentToDelete && (
        <ConfirmModal 
          title="Supprimer le Colis ?" 
          message={`Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT le colis ${shipmentToDelete.internal_id} ?\n\nCette action est irréversible.`} 
          onConfirm={executeDeleteShipment} 
          onCancel={() => setShipmentToDelete(null)} 
          loading={loading} 
        />
      )}

      {isNewInvite && (
        <WelcomePasswordModal 
          supabase={supabase} 
          showAlert={setAlertMessage}
          onComplete={() => {
              setIsNewInvite(false);
              window.history.replaceState(null, '', window.location.pathname);
              // Optionnel: Recharger la page ou envoyer au login
              setView('login');
          }} 
          onCancel={() => { 
              setIsNewInvite(false); 
              window.history.replaceState(null, '', window.location.pathname);
              setView("home"); 
          }}
        />
      )}

      {/* 🟢 LA NAVBAR EST CACHÉE SUR LA VUE PUBLIQUE ET LA CONFIRMATION */}
      {view !== "public_drop" && view !== "auth_confirm" && (
        <Navbar 
          view={view} 
          setView={setView} 
          setShowCalculator={setShowCalculator} 
          brand={currentBrand} 
          currentUserRole={currentUserRole} 
          supabase={supabase} 
          setUserOrg={setUserOrg} 
        />
      )}
      
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
            userOrg={userOrg}
            supabase={supabase}
            currentUserRole={currentUserRole}
        />
      )}

      {/* 🟢 LA NOUVELLE VUE DE CONFIRMATION */}
      {view === "auth_confirm" && (
        <AuthConfirm 
          supabase={supabase} 
          setView={setView} 
          setIsNewInvite={setIsNewInvite} 
        />
      )}

      {view === "public_drop" && (
        <PublicDropScreen 
          supabase={supabase} 
          cargoSlug={dropSlug} 
        />
      )}

      {view === "superadmin" && (
         <SuperAdminScreen supabase={supabase} showAlert={setAlertMessage} setUserOrg={setUserOrg} setView={setView} fetchAdminData={fetchAdminData} />
      )}

      {view === "settings" && (
        <SettingsScreen 
          userOrg={userOrg} 
          setUserOrg={setUserOrg}
          currentUser={currentUser}
          supabase={supabase} 
          setView={setView} 
          showAlert={setAlertMessage} 
          wallet={wallet}
          manualRefreshWallet={manualRefreshWallet}
        />
      )}

      {view === "admin" && (
        <AdminScreen 
          userOrg={userOrg}
          wallet={wallet}
          manualRefreshWallet={manualRefreshWallet}
          isRefreshingWallet={isRefreshingWallet}
          setPaymentContext={setPaymentContext}
          setShowPaymentModal={setShowPaymentModal}
          errorMsg={errorMsg}
          setErrorMsg={setErrorMsg}
          currentUserRole={currentUserRole}
          adminList={adminList}
          setEditingItem={setEditingItem}
          setShipmentToDelete={setShipmentToDelete}
          supabase={supabase}
          fetchAdminData={fetchAdminData}
          setAlertMessage={setAlertMessage}
        />
      )}

      {view === "wallet" && (
        <CargoWalletScreen 
          supabase={supabase} 
          userOrg={userOrg} 
          showAlert={setAlertMessage} 
        />
      )}

      {view === "home" && (
        <HomeScreen 
          homeBgColor={homeBgColor}
          searchId={searchId}
          setSearchId={setSearchId}
          handleSearch={handleSearch}
          loading={loading}
          recentSearches={recentSearches}
        />
      )}

      {view === "partner" && <PartnerScreen setView={setView} supabase={supabase} showAlert={setAlertMessage} />}

      {view === "track" && (
        <TrackingScreen 
          shipmentData={shipmentData}
          activeBrand={activeBrand}
          setView={setView}
          setActiveBrand={setActiveBrand}
          handleDirectPayment={handleDirectPayment}
          isPaymentLoading={isPaymentLoading}
        />
      )}
    </div>
  );
}
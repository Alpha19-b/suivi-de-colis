import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, CheckCircle2, AlertCircle, Building2, Plane, ShieldCheck, 
  MapPin, Package, ChevronUp, ChevronDown, Users, Smartphone, 
  Mail, UploadCloud, RefreshCw, Activity, Download, Lock, Crown, 
  Coins, BarChart3, PieChart, Printer, Edit, Trash2, Box, Scale,
  MessageSquare, Plus, ScanLine, Save, X, Calendar, ShieldAlert
} from 'lucide-react';
import { formatCurrency, extractErrorMessage } from '../../utils/helpers';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getStatusIcon } from '../tracking/Timeline';
import { ScannerModal } from './ScannerModal';
import { SubscriptionModal } from '../billing/SubscriptionModal'; 
import { PreShipmentsList } from './PreShipmentsList'; 

const APP_URL = "https://guineatrack.com/";

const STATUS_HIERARCHY = [
  "en_preparation",
  "entrepot_chine",
  "international",
  "douane_guinee",
  "livre",
  "recupere"
];

export const AdminScreen = ({ 
  userOrg, wallet, manualRefreshWallet, isRefreshingWallet, 
  setPaymentContext, setShowPaymentModal, errorMsg, setErrorMsg, 
  currentUserRole, adminList, setEditingItem, setShipmentToDelete,
  supabase, fetchAdminData, setAlertMessage
}) => {
  const [filterStatus, setFilterStatus] = useState("all");
  const [adminSearch, setAdminSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  
  const [activeTab, setActiveTab] = useState("actifs"); 
  const [visibleItemsCount, setVisibleItemsCount] = useState(50);

  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState({ show: false, feature: "" });
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportFormat, setExportFormat] = useState("excel"); 
  
  const [planFeatures, setPlanFeatures] = useState({});
  const [planEmailQuota, setPlanEmailQuota] = useState(0); 
  const [planSmsQuota, setPlanSmsQuota] = useState(0); 
  const [loadingFeatures, setLoadingFeatures] = useState(true);

  const [platformFeePercent, setPlatformFeePercent] = useState(2.0);
  const [mobilePayments, setMobilePayments] = useState([]);

  const [newShipment, setNewShipment] = useState({
    client_name: "", email: "", phone: "", description: "",
    china_tracking: "", intl_tracking: "", weight_kg: "",
    photo_path: "", transport_type: "", estimated_delivery: ""
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkSendSms, setBulkSendSms] = useState(false);
  const [bulkSendEmail, setBulkSendEmail] = useState(true);
  const [bulkNote, setBulkNote] = useState("");
  const [showBulkNoteInput, setShowBulkNoteInput] = useState(false);

  const [adminBulkWarning, setAdminBulkWarning] = useState({ show: false, warnings: [] });

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'superadmin';

  useEffect(() => {
    setVisibleItemsCount(50);
  }, [adminSearch, filterStatus, filterDate]);

  useEffect(() => {
    const fetchFeaturesAndFees = async () => {
      if (!supabase) {
        setLoadingFeatures(false);
        return;
      }
      try {
        const { data: settingsData } = await supabase.from('platform_settings').select('platform_fee_percent').eq('id', 1).maybeSingle();
        if (settingsData && settingsData.platform_fee_percent !== undefined) {
           setPlatformFeePercent(Number(settingsData.platform_fee_percent));
        }

        if (userOrg?.id) {
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('shipment_id, platform_fee_applied')
            .eq('organization_id', userOrg.id)
            .eq('type', 'shipment_payment');
          
          if (paymentsData) setMobilePayments(paymentsData);
        }

        if (userOrg?.plan) {
            const { data } = await supabase.from('plans').select('features, monthly_email_quota, monthly_sms_quota').eq('id', userOrg.plan).maybeSingle();
            if (data) {
              if (data.features) setPlanFeatures(data.features);
              if (data.monthly_email_quota !== undefined) setPlanEmailQuota(data.monthly_email_quota);
              if (data.monthly_sms_quota !== undefined) setPlanSmsQuota(data.monthly_sms_quota);
            }
        }
      } catch (e) {
        console.error("Erreur chargement", e);
      } finally {
        setLoadingFeatures(false);
      }
    };
    
    fetchFeaturesAndFees();
  }, [supabase, userOrg?.plan]);
  
  const today = new Date();
  const expirationDate = new Date(userOrg?.subscription_end_date || 0);
  const timeDiff = expirationDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

  const isExpired = userOrg?.plan !== 'free' && daysRemaining <= 0;
  const activeFeatures = isExpired ? {} : planFeatures;

  const isScannerLocked = !activeFeatures.can_scan;
  const isBulkLocked = !activeFeatures.can_bulk_update;
  const isExportLocked = !activeFeatures.can_export;
  const isStatsLocked = !activeFeatures.can_view_stats;
  const isPreAlertsLocked = !activeFeatures.can_manage_pre_alerts;

  const filteredAdminList = useMemo(() => {
    return adminList.filter((item) => {
      if (adminSearch) {
        const searchLower = adminSearch.toLowerCase();
        const matchName = item.client_name?.toLowerCase().includes(searchLower);
        const matchId = item.internal_id?.toLowerCase().includes(searchLower);
        const matchPhone = item.phone?.includes(searchLower);
        if (!matchName && !matchId && !matchPhone) return false;
      }

      if (filterDate) {
        if (!item.created_at) return false;
        const dateObj = new Date(item.created_at);
        if (isNaN(dateObj.getTime())) return false;
        const itemDate = dateObj.toISOString().split('T')[0];
        if (itemDate !== filterDate) return false;
      }

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
  }, [adminList, adminSearch, filterDate, filterStatus]);

  const displayedAdminList = filteredAdminList.slice(0, visibleItemsCount);

  const financialStats = useMemo(() => {
    return adminList.reduce((acc, item) => {
      let itemAmount = Number(item.amount_due_gnf) || 0;
      if (item.payment_status === 'paid') {
        if (item.payment_method === 'liquide') {
            acc.cash += itemAmount;
        } else {
            acc.mobile += itemAmount;
            const frozenPayment = mobilePayments.find(p => p.shipment_id === item.id);
            let feePercent = platformFeePercent; 
            if (frozenPayment && frozenPayment.platform_fee_applied !== null && frozenPayment.platform_fee_applied !== undefined) {
                feePercent = Number(frozenPayment.platform_fee_applied);
            } else if (item.platform_fee_applied !== null && item.platform_fee_applied !== undefined) {
                feePercent = Number(item.platform_fee_applied);
            }
            acc.mobileCommission = (acc.mobileCommission || 0) + (itemAmount * (feePercent / 100));
        }
      } else {
        acc.unpaid += itemAmount;
      }
      return acc;
    }, { cash: 0, mobile: 0, mobileCommission: 0, unpaid: 0 });
  }, [adminList, mobilePayments, platformFeePercent]);

  const netMobileAmount = financialStats.mobile - (financialStats.mobileCommission || 0);

  const statusCounts = useMemo(() => {
    const counts = { en_preparation: 0, entrepot_chine: 0, international: 0, douane_guinee: 0, livre: 0, recupere: 0 };
    adminList.forEach(item => { if (counts[item.status] !== undefined) counts[item.status]++; });
    return counts;
  }, [adminList]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const selectableItems = filteredAdminList.filter(item => isAdmin || item.status !== 'recupere');
      setSelectedIds(selectableItems.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus) return setAlertMessage("⚠️ Veuillez choisir un nouveau statut.");
    
    const selectedShipments = filteredAdminList.filter(item => selectedIds.includes(item.id));
    let bulkWarnings = [];

    const bulkStatusIndex = STATUS_HIERARCHY.indexOf(bulkStatus);
    const isRetrograding = selectedShipments.some(item => {
      const itemStatusIndex = STATUS_HIERARCHY.indexOf(item.status || "en_preparation");
      return bulkStatusIndex !== -1 && bulkStatusIndex < itemStatusIndex;
    });

    if (isRetrograding) {
      bulkWarnings.push("Faire reculer le statut d'un ou plusieurs colis (retour à une étape précédente).");
    }

    if (!isAdmin) {
      const hasLocked = selectedShipments.some(item => item.status === 'recupere');
      if (hasLocked) return setAlertMessage("❌ ALERTE SÉCURITÉ : Votre sélection contient un colis déjà 'Récupéré'. Seul un gérant peut modifier ce dossier.");
      const hasUnpaid = selectedShipments.some(item => item.payment_status !== 'paid');
      if (bulkStatus === 'recupere' && hasUnpaid) return setAlertMessage("❌ ALERTE SÉCURITÉ : Impossible de marquer en 'Récupéré'. Certains colis sélectionnés n'ont pas encore été encaissés !");
    } else {
      if (selectedShipments.some(item => item.status === 'recupere')) bulkWarnings.push("Modifier le statut de colis déjà récupérés.");
      if (bulkStatus === 'recupere' && selectedShipments.some(item => item.payment_status !== 'paid')) bulkWarnings.push("Marquer comme 'Récupéré' des colis non encaissés.");
    }

    if (bulkWarnings.length > 0) {
      setAdminBulkWarning({ show: true, warnings: bulkWarnings });
      return; 
    }

    executeBulkUpdate();
  };

  const executeBulkUpdate = async () => {
    setAdminBulkWarning({ show: false, warnings: [] }); 
    const selectedShipments = filteredAdminList.filter(item => selectedIds.includes(item.id));

    const emailsUsed = userOrg?.emails_sent_this_month || 0;
    const emailsAllowed = planEmailQuota + (userOrg?.extra_email_quota || 0);
    const emailsRemaining = emailsAllowed - emailsUsed;

    const smsUsed = userOrg?.sms_sent_this_month || 0;
    const smsAllowed = planSmsQuota + (wallet?.tracking_credits || 0);
    const smsRemaining = Math.max(0, smsAllowed - smsUsed);
    const hasSmsCredits = smsRemaining > 0 || planSmsQuota >= 100000;

    if (bulkSendSms && !hasSmsCredits) return setAlertMessage(`❌ Crédits SMS insuffisants.`);
    if (bulkSendEmail && emailsAllowed < 100000 && emailsRemaining < selectedIds.length) return setAlertMessage(`❌ Quota d'e-mails insuffisant.`);

    setIsBulkUpdating(true);
    try {
      const { error: updateError } = await supabase.from('shipments').update({ status: bulkStatus }).in('id', selectedIds);
      if (updateError) throw updateError;

      const eventsToInsert = selectedIds.map(id => ({
        shipment_id: id, status: bulkStatus, note: bulkNote || "", source: "manual"
      }));
      const { error: eventError } = await supabase.from("shipment_events").insert(eventsToInsert);
      if (eventError) throw eventError;

      const safeCargoName = userOrg?.name || 'Votre Cargo';
      const safeOrgId = userOrg?.id || null;

      if (bulkSendSms || bulkSendEmail) {
        await Promise.all(selectedShipments.map(async (item) => {
          const safeClientName = item.client_name || 'Client';
          const safeInternalId = item.internal_id || 'Colis';

          if (bulkSendSms && item.phone) {
             await supabase.functions.invoke('notify-sms', {
                body: { phone: item.phone, internal_id: safeInternalId, client_name: safeClientName, status: bulkStatus, note: bulkNote, organization_id: safeOrgId, company_name: safeCargoName }
             });
          }
          if (bulkSendEmail && (item.email || item.client_email)) {
             await supabase.functions.invoke('notify-email', {
                body: { email: item.email || item.client_email, internal_id: safeInternalId, client_name: safeClientName, status: bulkStatus, note: bulkNote, organization_id: safeOrgId, company_name: safeCargoName }
             });
          }
        }));
        if (typeof manualRefreshWallet === 'function') manualRefreshWallet();
      }

      setAlertMessage(`✅ ${selectedIds.length} colis mis à jour avec succès !`);
      setSelectedIds([]); setBulkStatus(''); setBulkNote(''); setShowBulkNoteInput(false);
      await fetchAdminData();
    } catch (e) {
      const errorStr = extractErrorMessage(e);
      if (errorStr.includes("FRAUDE_BLOQUEE:")) setAlertMessage("❌ ALERTE SÉCURITÉ : " + errorStr.split("FRAUDE_BLOQUEE:")[1]);
      else setAlertMessage("Erreur : " + errorStr);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleScanSuccess = (scannedText) => {
    setShowScanner(false);
    const cleanId = scannedText.trim();
    const foundItem = adminList.find(item => item.internal_id === cleanId || item.id === cleanId);
    if (foundItem) {
      setEditingItem(foundItem);
    } else {
      try {
        if(cleanId.includes('?id=')) {
           const extractedId = cleanId.split('?id=')[1].split('&')[0];
           const foundByUrl = adminList.find(item => item.internal_id === extractedId);
           if(foundByUrl) return setEditingItem(foundByUrl);
        }
      } catch(e) {}
      setAlertMessage(`⚠️ Aucun colis trouvé pour le scan : ${cleanId}`);
    }
  };

  const statusLabelsAndColors = {
    en_preparation: { label: "En préparation", color: "bg-slate-400" },
    entrepot_chine: { label: "Entrepôt Chine", color: "bg-indigo-500" },
    international: { label: "International", color: "bg-violet-500" },
    douane_guinee: { label: "Douane", color: "bg-amber-500" },
    livre: { label: "Dispo. Agence", color: "bg-teal-500" },
    recupere: { label: "Récupéré", color: "bg-slate-800" }
  };

  const totalCollected = financialStats.cash + financialStats.mobile;
  const totalExpected = totalCollected + financialStats.unpaid;
  const collectionRateDisplay = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : "0.0";
  const mobilePercentageDisplay = totalCollected > 0 ? ((financialStats.mobile / totalCollected) * 100).toFixed(1) : "0.0";
  const cashPercentageDisplay = totalCollected > 0 ? ((financialStats.cash / totalCollected) * 100).toFixed(1) : "0.0";
  const rawCollectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const getWhatsAppReminderLink = (item) => {
    const cleanPhone = item.phone ? item.phone.replace(/\D/g, '') : '';
    const trackingUrl = `${APP_URL}?id=${item.internal_id}`;
    const message = `Bonjour ${item.client_name || 'Cher client'},\n\nVotre colis *${item.internal_id}* vous attend !\n\nPour gagner du temps lors du retrait, vous pouvez régler votre facture dès maintenant via ce lien :\n${trackingUrl}\n\nMerci de votre confiance et à très vite !`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleExportData = () => {
    let dataToExport = adminList;
    
    if (exportStartDate) {
      dataToExport = dataToExport.filter(item => item.created_at && new Date(item.created_at) >= new Date(exportStartDate));
    }
    if (exportEndDate) {
      const end = new Date(exportEndDate); 
      end.setHours(23, 59, 59, 999);
      dataToExport = dataToExport.filter(item => item.created_at && new Date(item.created_at) <= end);
    }
    
    if (dataToExport.length === 0) {
      setAlertMessage("⚠️ Aucun colis trouvé pour cette période.");
      setShowExportModal(false); 
      return;
    }

    const headers = [
      "ID Colis", "Date", "Client", "Téléphone", "Email", 
      "Description", "Transport", "Poids/Vol", "Statut", 
      "Paiement", "Montant (GNF)"
    ];

    // Sécurisation du nom de fichier
    const orgNameSafe = userOrg?.name ? userOrg.name.replace(/\s+/g, '_') : 'Cargo';

    if (exportFormat === "excel") {
      const rows = dataToExport.map(item => [
        item.internal_id || "", 
        new Date(item.created_at).toLocaleDateString('fr-FR'), 
        item.client_name || "", 
        item.phone || "", 
        item.email || "", 
        item.description || "", 
        item.transport_type ? item.transport_type.replace('_', ' ').toUpperCase() : "STANDARD",
        item.weight_kg || "", 
        statusLabelsAndColors[item.status]?.label || item.status, 
        item.payment_status === 'paid' ? 'PAYÉ' : 'NON PAYÉ', 
        item.amount_due_gnf || 0
      ]);

      let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body><table border="1">`;
      tableHtml += `<thead><tr>${headers.map(h => `<th style="background-color: #f8fafc; font-weight: bold; text-align: left; padding: 10px;">${h}</th>`).join('')}</tr></thead>`;
      tableHtml += `<tbody>`;
      rows.forEach(row => {
        tableHtml += `<tr>${row.map(cell => `<td style="padding: 5px;">${cell}</td>`).join('')}</tr>`;
      });
      tableHtml += `</tbody></table></body></html>`;

      const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Export_${orgNameSafe}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } else {
      const rows = dataToExport.map(item => {
        const cleanDesc = item.description ? `"${item.description.replace(/"/g, '""').replace(/\n/g, ' ')}"` : "";
        const cleanClient = item.client_name ? `"${item.client_name.replace(/"/g, '""')}"` : "";
        const prettyTransport = item.transport_type ? item.transport_type.replace('_', ' ').toUpperCase() : "STANDARD";
        const prettyStatus = statusLabelsAndColors[item.status]?.label || item.status;
        const prettyPayment = item.payment_status === 'paid' ? 'PAYÉ' : 'NON PAYÉ';

        return [
          item.internal_id || "", 
          new Date(item.created_at).toLocaleDateString('fr-FR'), 
          cleanClient, 
          item.phone || "", 
          item.email || "", 
          cleanDesc, 
          prettyTransport,
          item.weight_kg || "", 
          prettyStatus, 
          prettyPayment, 
          item.amount_due_gnf || 0
        ];
      });

      let csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.map(e => e.join(";")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Export_${orgNameSafe}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setShowExportModal(false);
    setExportStartDate("");
    setExportEndDate("");
    setAlertMessage(`✅ Exportation ${exportFormat.toUpperCase()} réussie (${dataToExport.length} colis).`);
  };

  const handlePrintLabel = (shipment) => {
    if (!userOrg) return setAlertMessage("Données de l'organisation manquantes");
    let priceDisplay = "N/A";
    if (shipment.amount_due_gnf !== null && shipment.amount_due_gnf !== undefined && shipment.amount_due_gnf !== "") {
        priceDisplay = formatCurrency(shipment.amount_due_gnf);
    } 
    const printWindow = window.open('', '_blank', 'width=500,height=600');
    if (!printWindow) return setAlertMessage("Veuillez autoriser pop-ups pour imprimer.");

    const logoHtml = userOrg.logo_url ? `<img src="${userOrg.logo_url}" alt="Logo" style="max-height: 80px; display: block; margin: 0 auto 15px;" />` : `<h2 style="margin: 0; text-transform: uppercase;">${userOrg.name}</h2>`;
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
          <div class="header">${logoHtml}<div class="org-info"><strong>${userOrg.name}</strong><br/>${userOrg.phone || userOrg.whatsapp_number || ''}<br/>${userOrg.email_contact || ''}</div></div>
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
    } catch (e) { 
      setAlertMessage(extractErrorMessage(e)); 
    } finally { 
      setUploading(false); 
    }
  };

  const createShipment = async () => {
    if (!supabase) return setAlertMessage("Système non prêt");

    // 🟢 VALIDATION STRICTE DU FORMULAIRE
    if (!newShipment.client_name.trim()) {
      return setAlertMessage("⚠️ Le nom du client est obligatoire.");
    }
    
    const phoneClean = newShipment.phone.replace(/\D/g, '');
    if (!newShipment.phone.trim() || phoneClean.length < 8) {
      return setAlertMessage("⚠️ Un numéro de téléphone valide (min 8 chiffres) est obligatoire.");
    }

    if (newShipment.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newShipment.email)) {
      return setAlertMessage("⚠️ L'adresse e-mail n'est pas au bon format.");
    }

    if (newShipment.weight_kg !== "" && Number(newShipment.weight_kg) < 0) {
      return setAlertMessage("⚠️ Le poids ou volume ne peut pas être négatif.");
    }

    try {
      setLoading(true);
      if (!userOrg?.id) throw new Error("Organisation introuvable.");
      const id = `GN-${Math.floor(10000 + Math.random() * 90000)}`;
      let initial_amount_due = null;
      if (newShipment.weight_kg && newShipment.transport_type && userOrg?.public_rates?.[newShipment.transport_type]) {
          const rate = userOrg.public_rates[newShipment.transport_type];
          const unitPrice = typeof rate === 'object' ? Number(rate.price || 0) : Number(rate || 0);
          initial_amount_due = Number(newShipment.weight_kg) * unitPrice;
      }
      const payload = { 
        internal_id: id, organization_id: userOrg.id, client_name: newShipment.client_name, 
        email: newShipment.email || null, phone: newShipment.phone, description: newShipment.description, 
        china_tracking: newShipment.china_tracking, intl_tracking: newShipment.intl_tracking, 
        weight_kg: newShipment.weight_kg ? Number(newShipment.weight_kg) : null, photo_path: newShipment.photo_path || null, 
        transport_type: newShipment.transport_type || null, estimated_delivery: newShipment.estimated_delivery || null, 
        status: "en_preparation", payment_status: "unpaid", amount_due_gnf: initial_amount_due 
      };
      const { data: insertedShipment, error: insertError } = await supabase.from("shipments").insert([payload]).select().single();
      if (insertError) throw insertError;
      await supabase.from("shipment_events").insert([{ shipment_id: insertedShipment.id, status: "en_preparation", note: "Dossier ouvert.", source: "manual" }]);
      
      setNewShipment({ client_name: "", email: "", phone: "", description: "", china_tracking: "", intl_tracking: "", weight_kg: "", photo_path: "", transport_type: "", estimated_delivery: "" });
      setIsNewShipmentOpen(false); 
      await fetchAdminData();
      setAlertMessage("✅ Dossier créé avec succès !");
    } catch(e) { 
      setErrorMsg(extractErrorMessage(e)); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="flex-grow p-4 sm:p-8 animate-in fade-in duration-500 pb-24 relative">
      
      {adminBulkWarning.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 sm:p-10 animate-in zoom-in-95 text-center relative">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><ShieldAlert size={40} /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{isAdmin ? "Attention Gérant" : "Confirmation de sécurité"}</h3>
            <p className="text-sm font-medium text-slate-600 mb-6">Vous êtes sur le point de forcer l'action suivante :</p>
            <ul className="text-left bg-rose-50 text-rose-700 text-sm font-bold p-4 rounded-2xl mb-8 space-y-3 border border-rose-100">
              {adminBulkWarning.warnings.map((w, i) => <li key={i} className="flex items-start gap-3"><AlertCircle size={18} className="shrink-0 mt-0.5"/> {w}</li>)}
            </ul>
            {isAdmin && <p className="text-sm font-bold text-slate-500 mb-8">Cela peut fausser les statistiques et le bilan financier.</p>}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setAdminBulkWarning({ show: false, warnings: [] })} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl transition-colors active:scale-95">Annuler</button>
              <button onClick={executeBulkUpdate} className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"><ShieldAlert size={18} />Forcer</button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative p-8 sm:p-10 animate-in zoom-in-95">
            <button onClick={() => setShowExportModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-100 p-2.5 rounded-full transition-colors"><X size={20}/></button>
            <div className="flex items-center gap-3 mb-6"><div className="bg-blue-100 text-blue-600 p-3 rounded-2xl"><Download size={24} /></div><h3 className="text-2xl font-black text-slate-900">Exportation</h3></div>
            <div className="space-y-6 mb-8">
              <div>
                <label className="text-xs font-black uppercase text-slate-500 ml-1 mb-2 block">Format de fichier</label>
                <div className="flex gap-3">
                  <button onClick={() => setExportFormat("excel")} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${exportFormat === "excel" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"}`}><div className={`p-1.5 rounded-lg ${exportFormat === "excel" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}><BarChart3 size={16}/></div>Excel (.xls)</button>
                  <button onClick={() => setExportFormat("csv")} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all ${exportFormat === "csv" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"}`}><div className={`p-1.5 rounded-lg ${exportFormat === "csv" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400"}`}><Box size={16}/></div>CSV (.csv)</button>
                </div>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div><label className="text-xs font-black uppercase text-slate-500 ml-1 mb-2 flex items-center gap-2"><Calendar size={14}/> Date de début</label><Input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} /></div>
                <div><label className="text-xs font-black uppercase text-slate-500 ml-1 mb-2 flex items-center gap-2"><Calendar size={14}/> Date de fin</label><Input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} /></div>
              </div>
            </div>
            <button onClick={handleExportData} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-900/20 active:scale-95 text-lg"><Download size={20} /> Exporter</button>
            <p className="text-center text-xs text-slate-400 font-medium mt-4">Laissez les dates vides pour tout exporter.</p>
          </div>
        </div>
      )}

      {showSubscription && ( <SubscriptionModal onClose={() => setShowSubscription(false)} currentPlan={userOrg?.plan || 'free'} supabase={supabase} userOrg={userOrg} showAlert={setAlertMessage}/> )}

      {upgradePrompt.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="p-8 sm:p-10 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-200"><Crown size={36} /></div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Fonctionnalité Premium</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">L'outil <strong className="text-slate-800">{upgradePrompt.feature}</strong> est réservé aux forfaits supérieurs.</p>
              <div className="space-y-3">
                <button onClick={() => { setUpgradePrompt({ show: false, feature: "" }); setShowSubscription(true); }} className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2"><Crown size={20} />Passer à Premium</button>
                <button onClick={() => setUpgradePrompt({ show: false, feature: "" })} className="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-bold py-3.5 rounded-xl transition-all active:scale-95">Plus tard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScanner && <ScannerModal onClose={() => setShowScanner(false)} onScan={handleScanSuccess} />}

      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Tableau de Bord</h2>
            {userOrg && <p className="text-base text-slate-500 font-bold mt-1 uppercase tracking-widest">{userOrg.name}</p>}
          </div>
        </div>

        {errorMsg && <div className="mb-6 bg-rose-50 text-rose-600 font-bold p-4 rounded-2xl border border-rose-200 flex items-center gap-3"><AlertCircle size={20} /> {errorMsg}</div>}

        {isExpired ? (
          <div className="mb-8 bg-rose-50 border border-rose-200 p-4 sm:p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-4">
              <div className="bg-rose-100 p-3 rounded-full text-rose-600"><AlertCircle size={24} /></div>
              <div><h4 className="font-black text-rose-900 text-lg">Abonnement Expiré</h4><p className="text-rose-700 font-medium text-sm">Votre compte est passé en mode Gratuit.</p></div>
            </div>
            <button onClick={() => setShowSubscription(true)} className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap">Débloquer mon compte</button>
          </div>
        ) : (
          daysRemaining > 0 && daysRemaining <= 5 && userOrg?.plan !== 'free' && (
            <div className="mb-8 bg-amber-50 border border-amber-200 p-4 sm:p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 p-3 rounded-full text-amber-600"><AlertCircle size={24} /></div>
                <div><h4 className="font-black text-amber-900 text-lg">Votre abonnement expire bientôt !</h4><p className="text-amber-700 font-medium text-sm">Il reste <strong className="text-rose-600">{daysRemaining} jour(s)</strong>.</p></div>
              </div>
              <button onClick={() => setShowSubscription(true)} className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap">Renouveler maintenant</button>
            </div>
          )
        )}

        {(currentUserRole === 'admin' || currentUserRole === 'superadmin') && (
          <div className="mb-10 relative">
            <div className="flex justify-between items-end mb-4">
              <h3 className="font-black text-slate-800 text-xl flex items-center gap-2"><Activity className="text-blue-500"/> Bilan & Statistiques</h3>
              <button onClick={() => { if(loadingFeatures) return; if(isExportLocked) setUpgradePrompt({ show: true, feature: "L'export Excel/CSV" }); else setShowExportModal(true); }} className={`text-xs font-bold text-slate-700 flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-colors shadow-sm ${loadingFeatures ? 'opacity-50 cursor-wait' : 'hover:text-blue-600 hover:border-blue-200 active:scale-95'}`}>
                {loadingFeatures ? <RefreshCw size={14} className="animate-spin text-slate-400" /> : isExportLocked ? <Lock size={14} className="text-amber-500" /> : <Download size={14} />}<span className="hidden sm:inline">Exporter</span>
              </button>
            </div>
            
            {loadingFeatures ? (
              <div className="absolute inset-0 top-12 z-20 backdrop-blur-md bg-white/60 rounded-[2.5rem] flex items-center justify-center border border-white/50"><RefreshCw className="animate-spin text-blue-500" size={40} /></div>
            ) : isStatsLocked ? (
              <div className="absolute inset-0 top-12 z-20 backdrop-blur-md bg-white/60 rounded-[2.5rem] flex items-center justify-center border border-white/50 animate-in fade-in duration-500">
                 <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl flex flex-col items-center text-center max-w-md border border-slate-100">
                   <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 text-amber-400 rounded-full flex items-center justify-center mb-6 shadow-xl"><Lock size={36} /></div>
                   <h4 className="font-black text-3xl text-slate-900 mb-3 tracking-tight">Bilan Bloqué</h4>
                   <p className="text-slate-500 mb-8 leading-relaxed font-medium">Passez à un forfait supérieur pour débloquer votre bilan financier.</p>
                   <button onClick={() => setShowSubscription(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-xl w-full transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2 text-lg"><Crown size={24} className="text-amber-300"/> Débloquer</button>
                 </div>
              </div>
            ) : null}

            <div className={`space-y-6 ${loadingFeatures || isStatsLocked ? 'opacity-30 pointer-events-none select-none filter blur-[6px] transition-all duration-500' : ''}`}>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                 
                 <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 p-6 sm:p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20 group flex flex-col justify-between border border-emerald-400/30">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
                    <div className="relative z-10 mb-2">
                      <span className="text-emerald-50 text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner"><Coins size={16} /></div> Total Espèces
                      </span>
                      <p className="text-emerald-100 text-xs font-bold mb-1">Montant Net (Caisse)</p>
                      <span className="text-white text-3xl sm:text-4xl font-black tracking-tight drop-shadow-md">{formatCurrency(financialStats.cash)}</span>
                    </div>
                 </div>

                 <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 p-6 sm:p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 group flex flex-col justify-between border border-blue-400/30">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
                    <div className="relative z-10 mb-2">
                      <span className="text-blue-50 text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner"><Smartphone size={16} /></div> Paiements Mobile
                      </span>
                      <p className="text-blue-100 text-xs font-bold mb-1">Montant Net (Djomi)</p>
                      <span className="text-white text-3xl sm:text-4xl font-black tracking-tight drop-shadow-md block">{formatCurrency(netMobileAmount)}</span>
                    </div>
                 </div>

                 <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 p-6 sm:p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-900/20 group flex flex-col justify-between border border-slate-600/50">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 rounded-full bg-white/5 blur-2xl group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
                    <div className="relative z-10 mb-2">
                      <span className="text-slate-300 text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm shadow-inner"><AlertCircle size={16} className="text-rose-400" /></div> Reste à payer
                      </span>
                      <p className="text-slate-400 text-xs font-bold mb-1">En attente de collecte</p>
                      <span className="text-white text-3xl sm:text-4xl font-black tracking-tight drop-shadow-md">{formatCurrency(financialStats.unpaid)}</span>
                    </div>
                 </div>

               </div>

               {adminList.length > 0 && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
                   <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                     <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-blue-500" /> Répartition des expéditions</h3>
                     <div className="space-y-5">
                       {Object.entries(statusCounts).map(([status, count]) => {
                         const rawPercentage = adminList.length > 0 ? (count / adminList.length) * 100 : 0;
                         const percentageDisplay = adminList.length > 0 ? ((count / adminList.length) * 100).toFixed(1) : "0.0";
                         if (count === 0 && status !== 'en_preparation') return null; 
                         const config = statusLabelsAndColors[status];
                         return (
                           <div key={status} className="group">
                             <div className="flex justify-between text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                               <span>{config.label}</span>
                               <span className="text-slate-400 group-hover:text-slate-800 transition-colors">{count} colis ({percentageDisplay}%)</span>
                             </div>
                             <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden shadow-inner">
                               <div className={`h-full rounded-full ${config.color} transition-all duration-1000 ease-out relative`} style={{ width: `${rawPercentage}%` }}>
                                  <div className="absolute inset-0 bg-white/20 w-full h-full"></div>
                               </div>
                             </div>
                           </div>
                         )
                       })}
                     </div>
                   </div>

                   <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                     <div>
                       <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2"><PieChart size={20} className="text-emerald-500" /> Taux de Recouvrement</h3>
                       <div className="mb-8">
                         <div className="flex justify-between items-end mb-3">
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Encaissé vs Attente</span>
                           <span className={`text-4xl font-black tracking-tight ${rawCollectionRate >= 80 ? "text-emerald-500" : "text-amber-500"}`}>{collectionRateDisplay}%</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden flex shadow-inner">
                           <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${rawCollectionRate}%` }}></div>
                           <div className="bg-rose-400 h-full transition-all duration-1000 ease-out opacity-80" style={{ width: `${100 - rawCollectionRate}%` }}></div>
                         </div>
                         <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><span>Sécurisé</span><span>À collecter</span></div>
                       </div>
                     </div>

                     {totalCollected > 0 && (
                       <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                         <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Activity size={16} /> Mix des encaissements</h4>
                         <div className="flex items-center gap-4">
                           <div className="flex-1 flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                             <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm border-2 border-white"></div>
                             <div><p className="text-xs font-bold text-slate-700">Espèces</p><p className="text-[10px] text-slate-400 font-black">{cashPercentageDisplay}%</p></div>
                           </div>
                           <div className="flex-1 flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                             <div className="w-4 h-4 rounded-full bg-blue-500 shadow-sm border-2 border-white"></div>
                             <div><p className="text-xs font-bold text-slate-700">Mobile</p><p className="text-[10px] text-slate-400 font-black">{mobilePercentageDisplay}%</p></div>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        )}

        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl mb-6 w-full sm:w-auto inline-flex overflow-x-auto relative z-10">
          <button onClick={() => setActiveTab("actifs")} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap ${activeTab === "actifs" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>📦 Colis Actifs & Historique</button>
          <button onClick={() => { if (loadingFeatures) return; if (isPreAlertsLocked) setUpgradePrompt({ show: true, feature: "Déclarations Clients (Pré-alertes)" }); else setActiveTab("pre_alertes"); }} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "pre_alertes" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-500 hover:text-slate-700"} ${loadingFeatures ? 'opacity-50 cursor-wait' : ''}`}>
            {loadingFeatures ? <RefreshCw size={16} className="animate-spin text-slate-400" /> : isPreAlertsLocked ? <Lock size={16} className="text-amber-500" /> : <ShieldCheck size={16} className="text-indigo-400" />}📸 Déclarations Clients
          </button>
        </div>

        {activeTab === "pre_alertes" && !isPreAlertsLocked ? (
          <div className="animate-in fade-in duration-300">
            <PreShipmentsList supabase={supabase} userOrg={userOrg} setAlertMessage={setAlertMessage} onConverted={() => { fetchAdminData(); setActiveTab("actifs"); }} />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
              <div className="flex flex-row items-center flex-grow bg-white border border-slate-200 rounded-full shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all h-14 sm:h-16">
                <div className="relative flex-grow flex items-center h-full pl-4 sm:pl-5">
                  <Search className="text-slate-400 shrink-0" size={20} />
                  <input type="text" value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} placeholder="Rechercher nom, tél, ID..." className="w-full h-full bg-transparent border-none outline-none px-3 font-medium text-sm sm:text-base text-slate-900 placeholder:text-slate-400" />
                </div>
                <div className="w-px h-8 bg-slate-200 shrink-0"></div>
                <div className="relative flex items-center justify-center px-3 sm:px-4 h-full shrink-0">
                  {filterDate ? (
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-black shadow-sm animate-in zoom-in-95">
                      <span className="hidden sm:inline">{new Date(filterDate).toLocaleDateString('fr-FR')}</span>
                      <span className="sm:hidden">{filterDate.split('-')[2]}/{filterDate.split('-')[1]}</span>
                      <button onClick={() => setFilterDate("")} className="hover:bg-blue-200 p-1 rounded-full transition-colors ml-1"><X size={12} /></button>
                    </div>
                  ) : (
                    <label className="relative flex items-center justify-center w-10 h-10 text-slate-400 hover:text-blue-500 hover:bg-slate-50 rounded-full cursor-pointer transition-colors group">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                      <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Filtrer par date" />
                    </label>
                  )}
                </div>
              </div>
              <button onClick={() => { if (loadingFeatures) return; if (isScannerLocked) setUpgradePrompt({ show: true, feature: "Le Scanner rapide" }); else setShowScanner(true); }} className={`flex-shrink-0 px-6 h-14 sm:h-16 rounded-full flex items-center justify-center gap-3 font-black shadow-lg transition-all w-full sm:w-auto ${loadingFeatures ? "bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-wait" : isScannerLocked ? "bg-slate-100 text-slate-500 border border-slate-200 shadow-none hover:bg-slate-200 cursor-pointer active:scale-95" : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 active:scale-95"}`}>
                {loadingFeatures ? <RefreshCw size={20} className="animate-spin text-slate-400" /> : isScannerLocked ? <Lock size={20} className="text-amber-500" /> : <ScanLine size={20} className="text-blue-400" />}<span>Scanner</span>
              </button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 custom-scrollbar snap-x items-center">
              {[{ id: "all", label: "Tous" }, { id: "paye", label: "Payés", icon: <CheckCircle2 size={16} /> }, { id: "non_paye", label: "Non Payés", icon: <AlertCircle size={16} /> }, { id: "chine", label: "Chine", icon: <Building2 size={16} /> }, { id: "inter", label: "Transit", icon: <Plane size={16} /> }, { id: "douane", label: "Douane", icon: <ShieldCheck size={16} /> }, { id: "livre", label: "Agence", icon: <MapPin size={16} /> }, { id: "recupere", label: "Terminé", icon: <CheckCircle2 size={16} /> }].map((f) => (
                <button key={f.id} onClick={() => setFilterStatus(f.id)} className={`snap-start px-5 py-3 rounded-full text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap border-2 ${filterStatus === f.id ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-white border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-900 shadow-sm"}`}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4">
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 lg:sticky top-28">
                  <button onClick={() => setIsNewShipmentOpen(!isNewShipmentOpen)} className="w-full flex items-center justify-between lg:pointer-events-none">
                    <h3 className="font-black text-slate-900 flex items-center gap-3 text-xl"><div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl"><Package size={24} /></div>Nouveau Colis</h3>
                    <div className="lg:hidden bg-slate-50 p-2 rounded-full text-slate-600 border border-slate-200">{isNewShipmentOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                  </button>
                  <div className={`mt-8 space-y-5 ${isNewShipmentOpen ? 'block' : 'hidden'} lg:block`}>
                    <Input placeholder="Nom du Client" value={newShipment.client_name} onChange={(e) => setNewShipment({ ...newShipment, client_name: e.target.value })} icon={Users} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input placeholder="Numéro de Téléphone" value={newShipment.phone} onChange={(e) => setNewShipment({ ...newShipment, phone: e.target.value })} icon={Smartphone} />
                      <Input type="email" placeholder="Adresse E-mail" value={newShipment.email} onChange={(e) => setNewShipment({ ...newShipment, email: e.target.value })} icon={Mail} />
                    </div>
                    <textarea className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none shadow-sm placeholder:text-slate-400" rows="2" placeholder="Description du contenu" value={newShipment.description} onChange={(e) => setNewShipment({ ...newShipment, description: e.target.value })} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative w-full mt-2 sm:mt-0">
                        <select value={newShipment.transport_type} onChange={(e) => setNewShipment({ ...newShipment, transport_type: e.target.value })} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 font-bold px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm">
                          <option value="">Sélectionner le transport...</option><option value="aerien_express">Express ✈️</option><option value="aerien_normal">Normal ✈️</option><option value="maritime">Bateau 🚢</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                      </div>
                      <div className="relative w-full mt-2 sm:mt-0">
                        <label className="absolute -top-2.5 left-3 bg-white px-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest z-10 rounded">Arrivée estimée</label>
                        <Input type="date" value={newShipment.estimated_delivery} onChange={(e) => setNewShipment({ ...newShipment, estimated_delivery: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <Input 
                        type="number" 
                        min="0"
                        step="0.01"
                        placeholder={newShipment.transport_type === 'maritime' ? "Volume (CBM)" : "Poids (Kg)"} 
                        value={newShipment.weight_kg} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || Number(val) >= 0) setNewShipment({ ...newShipment, weight_kg: val });
                        }} 
                      />
                      <label className={`cursor-pointer h-[52px] text-sm font-bold rounded-xl flex items-center justify-center gap-2 border transition-all shadow-sm active:scale-95 ${uploading ? "opacity-50 bg-slate-50 text-slate-500 border-slate-200" : newShipment.photo_path ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {uploading ? <RefreshCw className="animate-spin" size={18} /> : newShipment.photo_path ? <CheckCircle2 size={18} /> : <UploadCloud size={18} />}
                        {uploading ? "Chargement..." : newShipment.photo_path ? "Photo ajoutée" : "Ajouter une Photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleNewShipmentUpload} disabled={uploading} />
                      </label>
                    </div>
                    <button onClick={createShipment} disabled={loading || uploading} className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 text-lg">Créer le Dossier</button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-5">
                {displayedAdminList.length > 0 && (
                  <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
                    {loadingFeatures ? (
                      <div className="flex items-center gap-3 text-slate-400 font-bold"><RefreshCw size={18} className="animate-spin" /> Chargement des droits...</div>
                    ) : isBulkLocked ? (
                       <button onClick={() => { setUpgradePrompt({ show: true, feature: "La modification en masse" }); }} className="flex items-center gap-3 text-slate-400 hover:text-amber-600 font-bold transition-colors group">
                         <Lock size={18} className="text-amber-500 group-hover:scale-110 transition-transform" /> Débloquer les actions groupées
                       </button>
                    ) : (
                       <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === filteredAdminList.length} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                         <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Tout sélectionner ({filteredAdminList.length})</span>
                       </label>
                    )}
                    {selectedIds.length > 0 && <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{selectedIds.length} sélectionné(s)</span>}
                  </div>
                )}

                {displayedAdminList.map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 hover:shadow-slate-200/50 border border-slate-100 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group">
                    <div className="flex items-start gap-5">
                      <div className="flex h-14 items-center">
                        {loadingFeatures ? (
                          <RefreshCw size={16} className="animate-spin text-slate-300" />
                        ) : isBulkLocked ? (
                          <button onClick={() => setUpgradePrompt({ show: true, feature: "La gestion groupée" })} className="p-1 text-slate-300 hover:text-amber-500 transition-colors" title="Débloquer l'action groupée"><Lock size={16} /></button>
                        ) : item.status === 'recupere' && currentUserRole !== 'superadmin' && currentUserRole !== 'admin' ? (
                          <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-50 border border-slate-200" title="Dossier verrouillé (Colis récupéré)"><Lock size={12} className="text-slate-400" /></div>
                        ) : (
                          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        )}
                      </div>
                      <div className="hidden sm:flex h-14 w-14 bg-slate-50 border border-slate-100 rounded-2xl items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 group-hover:scale-110 transition-all duration-300">
                        {getStatusIcon(item.status)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="font-black text-slate-900 tracking-tight text-xl">{item.client_name || "Client Inconnu"}</span>
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">{item.internal_id}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 line-clamp-1 max-w-md">{item.description || "Aucune description"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full sm:w-auto ml-10 sm:ml-0">
                      {item.payment_status === 'paid' ? (
                        item.payment_method !== 'liquide' ? (
                          <span className="text-[11px] bg-blue-50 text-blue-700 font-black px-4 py-2 rounded-xl flex items-center gap-1.5 border border-blue-200/50 whitespace-nowrap shadow-sm"><Smartphone size={16} /> MOBILE</span>
                        ) : (
                          <span className="text-[11px] bg-emerald-50 text-emerald-700 font-black px-4 py-2 rounded-xl flex items-center gap-1.5 border border-emerald-200/50 whitespace-nowrap shadow-sm"><Coins size={16} /> ESPÈCES</span>
                        )
                      ) : (
                        item.phone ? (
                          <a href={getWhatsAppReminderLink(item)} target="_blank" rel="noopener noreferrer" className="text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-black px-4 py-2 rounded-xl flex items-center gap-1.5 border border-rose-200/50 whitespace-nowrap transition-all shadow-sm active:scale-95 cursor-pointer" title="Envoyer un rappel de paiement sur WhatsApp"><AlertCircle size={16} /> NON PAYÉ <MessageSquare size={14} className="ml-1 opacity-60" /></a>
                        ) : (
                          <button onClick={() => setErrorMsg(`Le colis ${item.internal_id} n'a pas de numéro de téléphone enregistré.`)} className="text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-black px-4 py-2 rounded-xl flex items-center gap-1.5 border border-rose-200/50 whitespace-nowrap transition-all shadow-sm active:scale-95 cursor-pointer" title="Numéro manquant"><AlertCircle size={16} /> NON PAYÉ</button>
                        )
                      )}
                      <div className="flex-1 sm:flex-none flex justify-end"><StatusBadge status={item.status} /></div>
                      <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                        <button onClick={() => handlePrintLabel(item)} className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all active:scale-95" title="Imprimer"><Printer size={18} /></button>
                        <button onClick={() => setEditingItem(item)} className="p-3 text-blue-600 hover:bg-blue-600 hover:text-white bg-blue-50 rounded-xl transition-all active:scale-95 shadow-sm" title="Éditer"><Edit size={18} /></button>
                        {(currentUserRole === 'admin' || currentUserRole === 'superadmin') && (
                          <button onClick={() => setShipmentToDelete(item)} className="p-3 text-rose-500 hover:bg-rose-600 hover:text-white bg-rose-50 rounded-xl transition-all active:scale-95 shadow-sm" title="Supprimer le colis"><Trash2 size={18} /></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredAdminList.length > visibleItemsCount && (
                  <div className="flex justify-center mt-6">
                    <button onClick={() => setVisibleItemsCount(prev => prev + 50)} className="bg-white border border-slate-200 text-slate-700 font-bold px-8 py-3 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95">Afficher plus de colis ({filteredAdminList.length - visibleItemsCount} restants)</button>
                  </div>
                )}

                {filteredAdminList.length === 0 && (
                  <div className="text-center p-16 bg-white rounded-[2rem] border-2 border-slate-100 border-dashed">
                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6"><Package size={40} /></div>
                    <p className="text-slate-800 font-black text-xl mb-2">Aucun colis trouvé.</p>
                    <p className="text-slate-500 font-medium">Modifiez votre recherche ou créez un nouveau dossier.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {selectedIds.length > 0 && activeTab === "actifs" && (
        <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300 w-[95%] max-w-6xl">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-4 flex flex-col lg:flex-row items-center justify-between gap-4 overflow-hidden">
            <div className="flex items-center gap-3 w-full lg:w-auto flex-shrink-0">
              <div className="bg-indigo-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-inner">{selectedIds.length}</div>
              <p className="font-bold text-slate-200 whitespace-nowrap">Colis sélectionnés</p>
            </div>
            <div className="flex flex-row flex-wrap lg:flex-nowrap items-center justify-end gap-3 w-full lg:flex-grow">
              {showBulkNoteInput && (
                <div className="w-full sm:w-auto sm:flex-1 animate-in fade-in slide-in-from-right-4 order-1 lg:order-none">
                  <input type="text" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="Ajouter une note (ex: Vol AF203)" className="w-full bg-slate-800 border border-slate-600 text-white placeholder:text-slate-400 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
              )}
              <button onClick={() => setShowBulkNoteInput(!showBulkNoteInput)} className={`p-2.5 rounded-xl border transition-colors flex-shrink-0 order-2 lg:order-none ${showBulkNoteInput || bulkNote ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`} title="Ajouter une note"><Edit size={20} /></button>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="flex-1 sm:flex-none w-full sm:w-auto bg-slate-800 border border-slate-700 text-white font-bold px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm order-3 lg:order-none">
                <option value="">Sélectionner un statut...</option><option value="en_preparation">📦 En preparation</option><option value="entrepot_chine">🏢 Entrepôt Chine</option><option value="international">✈️ Vol International / Maritime</option><option value="douane_guinee">🛡️ Douane</option><option value="livre">🎉 Disponible à l'agence</option><option value="recupere">✅ Récupéré par le client</option>
              </select>
              <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl flex-1 sm:flex-none justify-center order-4 lg:order-none">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium hover:text-emerald-400 transition-colors whitespace-nowrap"><input type="checkbox" checked={bulkSendSms} onChange={(e) => setBulkSendSms(e.target.checked)} className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-600 focus:ring-emerald-500" />SMS</label>
                <div className="w-px h-5 bg-slate-600"></div>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium hover:text-blue-400 transition-colors whitespace-nowrap"><input type="checkbox" checked={bulkSendEmail} onChange={(e) => setBulkSendEmail(e.target.checked)} className="w-4 h-4 rounded text-blue-500 bg-slate-900 border-slate-600 focus:ring-blue-500" />E-mail</label>
              </div>
              <button onClick={handleBulkUpdate} disabled={isBulkUpdating || !bulkStatus} className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white font-black px-6 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 order-5 lg:order-none flex-shrink-0">
                {isBulkUpdating ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Valider
              </button>
            </div>
          </div>
        </div>
      )} 
    </div>
  );
};
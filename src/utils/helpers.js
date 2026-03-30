// src/utils/helpers.js

export const safeGetStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

export const safeSetStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
};

export const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return String(dateString);
  }
};

export const formatCurrency = (amount) => {
  if (isNaN(amount) || amount === null) return "0 GNF";
  return new Intl.NumberFormat("fr-GN", {
    style: "currency",
    currency: "GNF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

export const getReturnUrl = () => {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "https://google.com";
  }
  return window.location.href;
};

export const extractErrorMessage = (err) => {
  if (!err) return "Erreur inconnue.";

  // 1. Extraction du message d'erreur brut
  let msg = "Erreur technique.";
  if (typeof err === "string") {
    msg = err;
  } else if (err.message && typeof err.message === "string") {
    msg = err.message;
  } else if (
    err.error_description &&
    typeof err.error_description === "string"
  ) {
    msg = err.error_description;
  } else if (err.error && typeof err.error === "string") {
    msg = err.error;
  } else {
    try {
      msg = JSON.stringify(err);
    } catch {
      return "Erreur technique.";
    }
  }

  // 2. DICTIONNAIRE DE TRADUCTION EN FRANÇAIS

  if (msg.includes("invalid input value for enum transport_type")) {
    return "Veuillez sélectionner un type de transport valide (Express, Normal, Bateau) ou laissez le champ vide.";
  }
  if (msg.includes("invalid input value for enum")) {
    return "Valeur incorrecte sélectionnée. Veuillez vérifier vos choix.";
  }
  if (msg.includes("duplicate key value violates unique constraint")) {
    return "Attention : Cet identifiant ou numéro existe déjà dans le système.";
  }
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Problème de connexion. Veuillez vérifier votre connexion internet.";
  }
  if (
    msg.includes("JWT expired") ||
    msg.includes("jwt expired") ||
    msg.includes("Auth session missing")
  ) {
    return "Votre session a expiré. Veuillez recharger la page et vous reconnecter.";
  }
  if (
    msg.includes("new row violates row-level security policy") ||
    msg.includes("violates row-level security")
  ) {
    return "Accès refusé : Vous n'avez pas l'autorisation d'effectuer cette action.";
  }
  if (msg.includes("invalid input syntax for type uuid")) {
    return "L'identifiant fourni n'est pas reconnu par le système.";
  }
  if (msg.includes("FRAUDE_BLOQUEE:")) {
    return (
      msg.split("FRAUDE_BLOQUEE:")[1]?.trim() ||
      "Action bloquée par mesure de sécurité."
    );
  }

  // Si l'erreur n'est pas dans le dictionnaire, on renvoie le texte d'origine
  return msg;
};

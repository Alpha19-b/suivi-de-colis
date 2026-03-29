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
  if (typeof err === "string") return err;
  if (err.message && typeof err.message === "string") return err.message;
  if (err.error_description && typeof err.error_description === "string")
    return err.error_description;
  if (err.error && typeof err.error === "string") return err.error;
  try {
    return JSON.stringify(err);
  } catch {
    return "Erreur technique.";
  }
};

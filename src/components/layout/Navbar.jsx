import React from 'react';
import { 
  Crown, Anchor, Rocket, Calculator, 
  MessageCircle, Settings, LogOut, ArrowLeft, Wallet 
} from 'lucide-react';

export const Navbar = ({ view, setView, setShowCalculator, brand, currentUserRole, supabase, setUserOrg }) => {
  const primaryColor = brand?.org_color || "#0f172a"; 
  const logoUrl = brand?.org_logo || brand?.logo_url || null;

  return (
    <nav className="sticky top-0 z-50 transition-all duration-300 backdrop-blur-2xl bg-white/80 border-b border-slate-200/60 shadow-sm">
      <div className="container mx-auto px-4 h-[72px] flex justify-between items-center">
        
        {/* 🟢 BLOC GAUCHE : LOGO ET NOM */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0" onClick={() => setView("home")}>
          {view === "superadmin" ? (
             <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 sm:p-2.5 rounded-xl shadow-md group-hover:shadow-lg transition-all">
               <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
             </div>
          ) : logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 sm:h-10 w-auto max-w-[100px] sm:max-w-[120px] rounded-xl bg-white p-1 object-contain shadow-sm border border-slate-100 group-hover:shadow-md transition-all" />
          ) : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-2 sm:p-2.5 rounded-xl shadow-md group-hover:shadow-lg transition-all" style={brand?.org_color ? { background: primaryColor } : {}}>
              <Anchor className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          )}
          
          <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 truncate max-w-[120px] sm:max-w-none">
            {view === "superadmin" ? "SaaS Manager" : (
              brand?.org_name ? brand.org_name : (
                <>
                  <span className="hidden sm:inline">Guinea Track</span>
                  <span className="sm:hidden">GN Track</span>
                </>
              )
            )}
          </span>
        </div>

        {/* 🟢 BLOC DROIT : BOUTONS D'ACTION */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          
          {view === "home" && (
            <button
              onClick={() => setView("partner")}
              className="text-[11px] sm:text-sm font-bold text-blue-600 hover:text-white border-2 border-blue-600 hover:bg-blue-600 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
            >
              <Rocket size={14} className="sm:w-4 sm:h-4 shrink-0" /> 
              <span className="hidden sm:inline">Ajouter mon Cargo</span>
              <span className="sm:hidden">Mon Cargo</span>
            </button>
          )}

          {view === "track" && (
            <>
              <button
                onClick={() => setShowCalculator(true)}
                className="hidden sm:flex text-sm font-bold text-slate-700 hover:text-slate-900 items-center gap-2 transition-all bg-white border border-slate-200 hover:border-slate-300 shadow-sm px-5 py-2.5 rounded-full active:scale-95"
              >
                <Calculator size={16} className="text-blue-500" /> <span>Estimer un prix</span>
              </button>
              <button
                onClick={() => setShowCalculator(true)}
                className="sm:hidden text-slate-700 hover:text-slate-900 p-2 transition bg-white border border-slate-200 shadow-sm rounded-full active:scale-95"
              >
                <Calculator size={16} className="text-blue-500" />
              </button>
              
              {brand?.org_whatsapp && (
                <a
                  href={`https://wa.me/${String(brand.org_whatsapp).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white hover:bg-[#1DA851] transition-all p-2 sm:px-5 sm:py-2.5 rounded-full flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95"
                >
                  <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline font-bold text-sm">Contact</span>
                </a>
              )}
            </>
          )}
          
          {(view === "admin" || view === "superadmin" || view === "settings" || view === "wallet") && (
            <>
              {currentUserRole === 'superadmin' && view !== 'superadmin' && (
                <button
                  onClick={() => {
                    if (setUserOrg) setUserOrg(null);
                    setView("superadmin");
                  }}
                  className="text-[11px] sm:text-xs font-bold text-indigo-600 hover:text-white hover:bg-indigo-500 flex items-center gap-1.5 sm:gap-2 bg-indigo-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <Crown size={14} /> <span className="hidden sm:inline">SaaS Manager</span>
                </button>
              )}

              {(currentUserRole === 'admin' || currentUserRole === 'superadmin') && view !== 'wallet' && view !== 'superadmin' && (
                <button
                  onClick={() => setView("wallet")}
                  className="text-[11px] sm:text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 sm:gap-2 bg-emerald-50 border border-emerald-200 hover:border-emerald-300 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <Wallet size={14} /> <span className="hidden sm:inline">Portefeuille</span>
                </button>
              )}

              {(currentUserRole === 'admin' || currentUserRole === 'superadmin') && view !== 'settings' && view !== 'superadmin' && (
                <button
                  onClick={() => setView("settings")}
                  className="text-[11px] sm:text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200 hover:border-blue-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <Settings size={14} /> <span className="hidden sm:inline">Paramètres</span>
                </button>
              )}
              
              <button
                onClick={async () => {
                  if (supabase) await supabase.auth.signOut();
                  setView("home");
                }}
                className="text-[11px] sm:text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-500 flex items-center gap-1.5 sm:gap-2 bg-rose-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </>
          )}
          
          {(view === "settings" || view === "wallet") && (
            <button
              onClick={() => setView("admin")}
              className="text-[11px] sm:text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200 hover:bg-slate-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <ArrowLeft size={14} /> <span className="hidden sm:inline">Retour Dashboard</span>
            </button>
          )}
        </div>

      </div>
    </nav>
  );
};
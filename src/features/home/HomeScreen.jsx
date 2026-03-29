import React from 'react';
import { Search, Package, RefreshCw } from 'lucide-react';

export const HomeScreen = ({ 
  homeBgColor, 
  searchId, 
  setSearchId, 
  handleSearch, 
  loading, 
  recentSearches 
}) => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 relative w-full overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-blob" style={{ backgroundColor: homeBgColor }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob animation-delay-2000" style={{ backgroundColor: homeBgColor }}></div>
      <div className="relative z-10 w-full max-w-3xl text-center mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 tracking-tighter leading-tight drop-shadow-sm">Où est votre <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 pr-2 pb-2 inline-block">colis ?</span></h1>
        <div className="bg-white/70 backdrop-blur-2xl p-4 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-white mx-auto transform transition-all focus-within:scale-[1.02] focus-within:shadow-[0_8px_50px_rgb(0,0,0,0.12)]">
          <form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-grow flex items-center">
              <Search className="absolute left-6 text-slate-400" size={28} />
              <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="Entrez votre numéro GN-..." className="w-full pl-16 pr-6 py-5 bg-transparent outline-none font-black text-xl sm:text-2xl text-slate-800 placeholder:text-slate-400 placeholder:font-bold tracking-wide" />
            </div>
            <button type="submit" disabled={loading} className="text-white font-black text-xl py-5 px-12 rounded-[2rem] transition-all shadow-xl hover:shadow-2xl flex items-center justify-center min-w-[160px] active:scale-95" style={{ backgroundColor: homeBgColor }}>{loading ? <RefreshCw className="animate-spin" size={28} /> : "Suivre"}</button>
          </form>
        </div>
        {recentSearches.length > 0 && (
          <div className="mt-20 flex flex-col items-center relative z-10 animate-in fade-in duration-1000 delay-300">
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-5">Consultés récemment</p>
            <div className="flex gap-4 flex-wrap justify-center">
              {recentSearches.map((id) => (
                <button key={id} onClick={() => { setSearchId(id); handleSearch(null, id); }} className="bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 border border-slate-200/50 px-6 py-3 rounded-2xl text-sm font-mono font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-1 flex items-center gap-3 active:scale-95"><Package size={18} className="text-blue-500" /> {id}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
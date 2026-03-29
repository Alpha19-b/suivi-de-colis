import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode'; // 🟢 MODIFICATION : On importe le moteur pur
import { X, ScanLine } from 'lucide-react';

export const ScannerModal = ({ onClose, onScan }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    // 1. Initialisation du moteur pur (sans l'interface avec les boutons)
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    // 2. Fonction pour démarrer la caméra
    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // 🟢 LA MAGIE EST ICI : Force la caméra arrière direct !
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // Succès de la lecture !
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                html5QrCode.clear(); // Nettoie le cadre HTML
                onScan(decodedText);
              }).catch(err => console.error("Erreur d'arrêt du scanner:", err));
            }
          },
          (errorMessage) => {
            // On ignore les erreurs de lecture continues (quand il cherche le code)
          }
        );
      } catch (err) {
        console.error("Impossible de démarrer la caméra :", err);
        // Si l'utilisateur refuse la permission ou n'a pas de caméra arrière, l'erreur sera capturée ici
      }
    };

    // On lance le scanner automatiquement au montage du composant
    startScanner();

    // 3. Nettoyage à la fermeture de la modale
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop()
          .then(() => scannerRef.current.clear())
          .catch(error => console.error("Erreur nettoyage caméra", error));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-700">
        
        {/* Header du Scanner */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400">
              <ScanLine size={24} />
            </div>
            <h3 className="font-black text-xl tracking-tight">Scanner un colis</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Zone de scan */}
        <div className="p-6 bg-slate-50">
          <p className="text-center text-slate-500 text-sm font-medium mb-6">
            Placez le QR Code de l'étiquette au centre du cadre.
          </p>
          
          <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-200">
            {/* Le flux vidéo apparaîtra automatiquement ici */}
            <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-dashed border-blue-500/50 min-h-[250px] bg-slate-900 flex items-center justify-center relative">
               {/* Un petit texte de chargement qui s'affiche pendant que la caméra s'allume */}
               <span className="text-slate-500 absolute z-0 text-sm font-bold animate-pulse">Lancement de la caméra...</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    
    console.log('🔄 Google Callback - Code:', !!code, 'Error:', error);
    
    if (error) {
      console.error('❌ Erreur OAuth Google:', error);
      // Envoyer l'erreur au parent
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error
        }, window.location.origin);
      }
      window.close();
      return;
    }

    if (code) {
      console.log('✅ Code Google reçu, envoi au parent...');
      // Envoyer le code au parent pour qu'il l'échange contre un token
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          code: code,
          state: state
        }, window.location.origin);
      }
      window.close();
      return;
    }

    // Si aucun code ni erreur, attendre un peu puis fermer
    console.log('⚠️ Aucun code ni erreur reçu');
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Aucun code d\'autorisation reçu'
        }, window.location.origin);
      }
      window.close();
    }, 3000);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Connexion avec Google en cours...</p>
        <p className="text-xs text-muted-foreground mt-2">
          Cette fenêtre se fermera automatiquement
        </p>
      </div>
    </div>
  );
}
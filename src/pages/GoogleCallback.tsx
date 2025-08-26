import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('🔍 GoogleCallback démarré');
    console.log('URL complète:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search params:', window.location.search);
    
    const error = searchParams.get('error');
    
    if (error) {
      console.log('❌ Erreur OAuth détectée:', error);
      // Envoyer l'erreur au parent
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error
        }, window.location.origin);
      }
      console.log('🚪 Fermeture popup (erreur)');
      window.close();
      return;
    }

    // Vérifier d'abord le hash fragment pour les tokens Supabase
    const fragment = window.location.hash.substring(1);
    console.log('Fragment:', fragment);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    
    console.log('Access token:', accessToken ? 'TROUVÉ' : 'NON TROUVÉ');
    console.log('Refresh token:', refreshToken ? 'TROUVÉ' : 'NON TROUVÉ');
    
    if (accessToken) {
      console.log('✅ Token Google trouvé, envoi au parent');
      // Envoyer le token au parent
      if (window.opener) {
        console.log('📤 Envoi message au parent');
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          token: accessToken,
          refreshToken: refreshToken
        }, window.location.origin);
      } else {
        console.log('❌ Pas de window.opener');
      }
      console.log('🚪 Fermeture popup (succès)');
      // Fermer immédiatement la popup
      window.close();
      return;
    }

    // Vérifier aussi les query params au cas où
    const code = searchParams.get('code');
    console.log('Code OAuth:', code ? 'TROUVÉ' : 'NON TROUVÉ');
    
    if (code) {
      console.log('✅ Code OAuth trouvé, envoi au parent');
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          token: code,
          refreshToken: null
        }, window.location.origin);
      }
      console.log('🚪 Fermeture popup (code)');
      window.close();
      return;
    }

    // Si aucun token, attendre un peu puis fermer
    console.log('⏳ Aucun token trouvé, attente 2s puis fermeture');
    setTimeout(() => {
      console.log('❌ Timeout atteint, fermeture de la popup');
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Aucun token reçu'
        }, window.location.origin);
      }
      window.close();
    }, 2000);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Connexion avec Google en cours...</p>
      </div>
    </div>
  );
}
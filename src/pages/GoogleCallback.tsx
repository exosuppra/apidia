import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    
    if (error) {
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

    // Vérifier d'abord le hash fragment pour les tokens Supabase
    const fragment = window.location.hash.substring(1);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    
    if (accessToken) {
      console.log('✅ Token Google trouvé, fermeture de la popup');
      // Envoyer le token au parent
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          token: accessToken,
          refreshToken: refreshToken
        }, window.location.origin);
      }
      // Fermer immédiatement la popup
      setTimeout(() => window.close(), 100);
      return;
    }

    // Vérifier aussi les query params au cas où
    const code = searchParams.get('code');
    if (code) {
      console.log('✅ Code OAuth trouvé, fermeture de la popup');
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          token: code,
          refreshToken: null
        }, window.location.origin);
      }
      setTimeout(() => window.close(), 100);
      return;
    }

    // Si aucun token, attendre un peu puis fermer
    setTimeout(() => {
      console.log('❌ Aucun token trouvé, fermeture de la popup');
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
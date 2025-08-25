import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  twitterCard?: string;
  keywords?: string;
  structuredData?: object;
}

export default function Seo({ 
  title, 
  description, 
  canonical, 
  ogImage,
  ogType = "website",
  ogUrl,
  twitterCard = "summary_large_image",
  keywords,
  structuredData
}: SeoProps) {
  useEffect(() => {
    document.title = title;

    // Meta description
    let descTag = document.querySelector<HTMLMetaElement>(`meta[name="description"]`);
    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.setAttribute("name", "description");
      document.head.appendChild(descTag);
    }
    if (description) descTag.setAttribute("content", description);

    // Keywords
    if (keywords) {
      let keywordsTag = document.querySelector<HTMLMetaElement>(`meta[name="keywords"]`);
      if (!keywordsTag) {
        keywordsTag = document.createElement("meta");
        keywordsTag.setAttribute("name", "keywords");
        document.head.appendChild(keywordsTag);
      }
      keywordsTag.setAttribute("content", keywords);
    }

    // Canonical URL
    const linkRelCanonical = Array.from(document.getElementsByTagName("link")).find(
      (l) => l.getAttribute("rel") === "canonical"
    ) as HTMLLinkElement | undefined;
    const href = canonical || window.location.href;
    if (linkRelCanonical) {
      linkRelCanonical.href = href;
    } else {
      const link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      link.setAttribute("href", href);
      document.head.appendChild(link);
    }

    // Open Graph tags
    const updateMetaProperty = (property: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    updateMetaProperty("og:title", title);
    if (description) updateMetaProperty("og:description", description);
    updateMetaProperty("og:type", ogType);
    if (ogImage) updateMetaProperty("og:image", ogImage);
    if (ogUrl) updateMetaProperty("og:url", ogUrl);
    updateMetaProperty("og:site_name", "ApidIA");
    updateMetaProperty("og:locale", "fr_FR");

    // Twitter Cards
    const updateTwitterMeta = (name: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    updateTwitterMeta("twitter:card", twitterCard);
    updateTwitterMeta("twitter:title", title);
    if (description) updateTwitterMeta("twitter:description", description);
    if (ogImage) updateTwitterMeta("twitter:image", ogImage);

    // Structured Data (JSON-LD)
    if (structuredData) {
      let existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup structured data on unmount
      if (structuredData) {
        const script = document.querySelector('script[type="application/ld+json"]');
        if (script) script.remove();
      }
    };
  }, [title, description, canonical, ogImage, ogType, ogUrl, twitterCard, keywords, structuredData]);

  return null;
}

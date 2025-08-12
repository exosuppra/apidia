import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  canonical?: string;
}

export default function Seo({ title, description, canonical }: SeoProps) {
  useEffect(() => {
    document.title = title;

    const descId = "meta-description";
    let descTag = document.querySelector<HTMLMetaElement>(`meta[name="description"]`);
    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.setAttribute("name", "description");
      document.head.appendChild(descTag);
    }
    if (description) descTag.setAttribute("content", description);

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

    return () => {
      // no cleanup for SEO tags
    };
  }, [title, description, canonical]);

  return null;
}

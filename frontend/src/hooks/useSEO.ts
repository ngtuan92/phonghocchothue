import { useEffect, useMemo } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  robots?: string;
  ogType?: string;
  ogImage?: string;
  ogUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  twitterImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  structuredData?: {
    id?: string;
    data?: any;
  } | Record<string, any>;
  image?: string;
  url?: string;
}

const getHead = () => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.head;
};

const useSEO = (options: SEOOptions = {}) => {
  const {
    title,
    description,
    keywords,
    canonical,
    robots = "index,follow",
    ogType = "website",
    ogImage,
    ogUrl,
    ogTitle,
    ogDescription,
    twitterCard = "summary_large_image",
    twitterImage,
    twitterTitle,
    twitterDescription,
    structuredData,
    image,
    url,
  } = options;

  const serializedLdJson = useMemo(() => {
    if (!structuredData) return null;
    const payload =
      typeof structuredData === "object" && "data" in structuredData && structuredData.data
        ? structuredData.data
        : structuredData;
    try {
      return JSON.stringify(payload);
    } catch {
      return null;
    }
  }, [structuredData]);

  useEffect(() => {
    const head = getHead();
    if (!head) return undefined;

    const cleanups: (() => void)[] = [];

    const setMeta = (attr: string, attrValue: string, content?: string) => {
      if (!content) return;
      let tag = head.querySelector(`meta[${attr}="${attrValue}"]`);
      const isNew = !tag;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, attrValue);
        head.appendChild(tag);
      }
      const prev = tag.getAttribute("content");
      tag.setAttribute("content", content);
      cleanups.push(() => {
        if (isNew && !prev) {
          tag?.remove();
        } else if (prev !== null && tag) {
          tag.setAttribute("content", prev);
        }
      });
    };

    const setLink = (rel: string, href?: string) => {
      if (!href) return;
      let link = head.querySelector(`link[rel="${rel}"]`);
      const isNew = !link;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        head.appendChild(link);
      }
      const prev = link.getAttribute("href");
      link.setAttribute("href", href);
      cleanups.push(() => {
        if (isNew && !prev) {
          link?.remove();
        } else if (prev !== null && link) {
          link.setAttribute("href", prev);
        }
      });
    };

    const setStructuredData = () => {
      if (!serializedLdJson) return;
      const scriptId =
        typeof structuredData === "object" && "id" in structuredData && structuredData.id
          ? structuredData.id
          : "ld-json";
      let script = document.getElementById(scriptId);
      const isNew = !script;

      if (!script) {
        script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        script.id = scriptId;
        head.appendChild(script);
      }

      const prevContent = script.textContent;
      script.textContent = serializedLdJson;

      cleanups.push(() => {
        if (isNew && !prevContent) {
          script?.remove();
        } else if (prevContent !== null && script) {
          script.textContent = prevContent;
        }
      });
    };

    if (title) {
      const previousTitle = document.title;
      document.title = title;
      cleanups.push(() => {
        document.title = previousTitle;
      });
    }

    setMeta("name", "description", description);
    setMeta("name", "keywords", keywords);
    setMeta("name", "robots", robots);
    setMeta("property", "og:title", ogTitle || title);
    setMeta("property", "og:description", ogDescription || description);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:url", ogUrl || url || canonical);
    setMeta("property", "og:image", ogImage || image);
    setMeta("name", "twitter:card", twitterCard);
    setMeta("name", "twitter:title", twitterTitle || title);
    setMeta("name", "twitter:description", twitterDescription || description);
    setMeta("name", "twitter:image", twitterImage || ogImage || image);

    setLink("canonical", canonical || url);

    setStructuredData();

    return () => {
      cleanups.reverse();
      for (const fn of cleanups) {
        fn();
      }
    };
  }, [
    title,
    description,
    keywords,
    canonical,
    robots,
    ogType,
    ogImage,
    ogUrl,
    ogTitle,
    ogDescription,
    twitterCard,
    twitterImage,
    twitterTitle,
    twitterDescription,
    serializedLdJson,
    structuredData?.id,
    image,
    url,
  ]);
};

export default useSEO;

import { useEffect, useMemo } from "react";

const getHead = () => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.head;
};

const useSEO = (options = {}) => {
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
  } = options;

  const serializedLdJson = useMemo(() => {
    if (!structuredData?.data && !structuredData) return null;
    const payload = structuredData?.data ?? structuredData;
    try {
      return JSON.stringify(payload);
    } catch {
      return null;
    }
  }, [structuredData]);

  useEffect(() => {
    const head = getHead();
    if (!head) return undefined;

    const cleanups = [];

    const setMeta = (attr, attrValue, content) => {
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
          tag.remove();
        } else if (prev !== null) {
          tag.setAttribute("content", prev);
        }
      });
    };

    const setLink = (rel, href) => {
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
          link.remove();
        } else if (prev !== null) {
          link.setAttribute("href", prev);
        }
      });
    };

    const setStructuredData = () => {
      if (!serializedLdJson) return;
      const scriptId = structuredData?.id || "ld-json";
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
          script.remove();
        } else if (prevContent !== null) {
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
    setMeta("property", "og:url", ogUrl || canonical);
    setMeta("property", "og:image", ogImage);
    setMeta("name", "twitter:card", twitterCard);
    setMeta("name", "twitter:title", twitterTitle || title);
    setMeta("name", "twitter:description", twitterDescription || description);
    setMeta("name", "twitter:image", twitterImage || ogImage);

    setLink("canonical", canonical);

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
  ]);
};

export default useSEO;


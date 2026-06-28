"use client";

import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Describe from "@/components/Describe";
import Contact from "@/components/Contact";
import NurseryHeader from "@/components/NurseryHeader";
import ProductCard from "@/components/ProductCard";
import Amenities from "@/components/Amenities";
import Gallery from "@/components/Gallery";
import Blog from "@/components/Blog";
import FAQ from "@/components/FAQ";
import RichTextRenderer from "@/components/RichTextRenderer";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useSEO from "@/hooks/useSEO";
import { useCountVisit } from "@/hooks/api/useVisits";
import { stripHtmlAndCss } from "@/utils/seoHelpers";

const URL_API =
  process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

export default function Home() {
  const [showNotification, setShowNotification] = useState(true);

  const colorBg = useConfigContentByKey("color-bg");
  const pageStyle = colorBg ? { backgroundColor: colorBg } : {};

  const background = {
    backgroundImage: useConfigContentByKey("background"),
    imgBird: useConfigContentByKey("icon-goc"),
  };

  const seoTitle =
    useConfigContentByKey("seo-title-home") ||
    "Cho thuê phòng dạy học tại Đà Nẵng | Phòng học đầy đủ tiện nghi.";
  const seoDescription =
    useConfigContentByKey("seo-description-home") ||
    "Cho thuê phòng dạy học theo giờ, buổi, dài hạn tại Đà Nẵng. Phòng học sạch sẽ, wifi mạnh, máy chiếu, bàn ghế tiêu chuẩn. Liên hệ đặt phòng nhanh chóng.";
  const seoKeywords =
    useConfigContentByKey("seo-keywords-home") ||
    "thuê phòng học Đà Nẵng, thuê phòng họp, phòng đào tạo, phòng sự kiện";
  const seoImage =
    useConfigContentByKey("seo-image-home") || background.backgroundImage;
  const notificationText = useConfigContentByKey("textNotication");
  const notificationLink = useConfigContentByKey("linkNotication");
  const textBtnNotication = useConfigContentByKey("textBtnNotication") || "Go";
  const logo = useConfigContentByKey("logo");

  const origin =
    typeof globalThis !== "undefined" && globalThis.location
      ? globalThis.location.origin
      : "";
  const canonicalUrl = origin || "https://phonghocchothue.com";

  const buildAbsoluteUrl = (value: string | undefined) => {
    if (!value || typeof value !== "string") return undefined;
    if (value.startsWith("http")) return value;
    return `${URL_API}${value.replaceAll("\\", "/")}`;
  };

  const buildCanonicalAssetUrl = (value: string | undefined) => {
    if (!value || typeof value !== "string") return undefined;
    if (value.startsWith("http")) {
      return value.replace(/https?:\/\/localhost:\d+/gi, canonicalUrl).replace(/https?:\/\/api\.phonghocchothue\.com/gi, canonicalUrl);
    }
    const cleanPath = value.replaceAll("\\", "/").replace(/^\//, "");
    return `${canonicalUrl}/${cleanPath}`;
  };

  const seoImageUrl = buildCanonicalAssetUrl(seoImage);
  const phone = useConfigContentByKey("phone");
  const address = useConfigContentByKey("address");
  const nameBrand = useConfigContentByKey("nameBrand");
  const logoUrl = buildCanonicalAssetUrl(logo);
  const faqSchema = useConfigContentByKey("faq-schema-ld-json");
  const email = useConfigContentByKey("email");
  const linkfb = useConfigContentByKey("linkfb");
  const linkYoutube = useConfigContentByKey("linkYoutube");
  const googleMap = useConfigContentByKey("googleMap");

  const homeStructuredData = useMemo(
    () => {
      const cleanTitle = stripHtmlAndCss(seoTitle);
      const cleanDescription = stripHtmlAndCss(seoDescription);
      const cleanNameBrand = stripHtmlAndCss(nameBrand) || "Hoa Học Trò";
      const cleanAddress = stripHtmlAndCss(address) || "54 Lê Đình Lý, Phường Thạc Gián, Quận Thanh Khê, Đà Nẵng";
      const cleanPhone = stripHtmlAndCss(phone) || "0905.803.954";
      const cleanEmail = stripHtmlAndCss(email) || "hoahoctro.dn@gmail.com";
      const cleanGoogleMap = googleMap || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3834.1373977532296!2d108.2120015!3d16.0598858!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314219b4cfb1b11b%3A0xe54d241775a2f5ab!2zNTQgTMOqIMSQw6xuaCBMw70sIFRo4bqhYyBHacOhbiwgVGhhbmggS2jDqSwgxJDDoCBO4bq5bmcgNTUwMDAwLCBWaWV0bmFt!5e0!3m2!1sen!2s!4v1717326880000!5m2!1sen!2s";

      const sameAsLinks = [];
      if (linkfb) sameAsLinks.push(linkfb);
      if (linkYoutube) sameAsLinks.push(linkYoutube);
      if (sameAsLinks.length === 0) {
        sameAsLinks.push("https://www.facebook.com/phonghocchothuedanang");
      }

      const baseStructured: any[] = [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": "https://phonghocchothue.com/#website",
          "url": "https://phonghocchothue.com",
          "name": "Hoa Học Trò",
          "publisher": {
            "@id": "https://phonghocchothue.com/#localbusiness"
          }
        },
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": "https://phonghocchothue.com/#webpage",
          "url": "https://phonghocchothue.com",
          "name": cleanTitle,
          "description": cleanDescription,
          "isPartOf": {
            "@id": "https://phonghocchothue.com/#website"
          },
          "about": {
            "@id": "https://phonghocchothue.com/#localbusiness"
          },
          "publisher": {
            "@id": "https://phonghocchothue.com/#localbusiness"
          },
          "primaryImageOfPage": seoImageUrl,
        },
        {
          "@context": "https://schema.org",
          "@type": "TutoringCenter",
          "@id": "https://phonghocchothue.com/#localbusiness",
          "name": cleanNameBrand,
          "legalName": "Hoa Học Trò - Phòng Học Cho Thuê Đà Nẵng",
          "url": "https://phonghocchothue.com",
          "logo": logoUrl || "https://phonghocchothue.com/favicon.png",
          "image": seoImageUrl || logoUrl || "https://phonghocchothue.com/favicon.png",
          "telephone": cleanPhone,
          "email": cleanEmail,
          "priceRange": "VND",
          "sameAs": sameAsLinks,
          "hasMap": cleanGoogleMap,
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": cleanPhone,
            "contactType": "customer service",
            "areaServed": "VN",
            "availableLanguage": ["vi", "en"]
          },
          "address": {
            "@type": "PostalAddress",
            "streetAddress": cleanAddress,
            "addressLocality": "Đà Nẵng",
            "addressRegion": "Đà Nẵng",
            "postalCode": "550000",
            "addressCountry": "VN",
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 16.0598858,
            "longitude": 108.2120015,
          },
          "areaServed": [
            {
              "@type": "AdministrativeArea",
              "name": "Đà Nẵng",
            },
            {
              "@type": "AdministrativeArea",
              "name": "Thanh Khê",
            },
            {
              "@type": "AdministrativeArea",
              "name": "Hải Châu",
            }
          ],
          "openingHoursSpecification": [
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday"
              ],
              "opens": "07:00",
              "closes": "22:00"
            }
          ]
        },
        {
          "@context": "https://schema.org",
          "@type": "Service",
          "@id": "https://phonghocchothue.com/#service",
          "name": "Cho thuê phòng dạy học Đà Nẵng",
          "provider": {
            "@type": "TutoringCenter",
            "@id": "https://phonghocchothue.com/#localbusiness"
          },
          "serviceType": "Cho thuê phòng học, phòng dạy học, phòng họp theo giờ",
          "areaServed": {
            "@type": "AdministrativeArea",
            "name": "Đà Nẵng"
          },
          "description": cleanDescription || "Dịch vụ cho thuê phòng học, phòng dạy học chất lượng cao, đầy đủ tiện nghi thiết bị tại Đà Nẵng."
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "@id": "https://phonghocchothue.com/#breadcrumb",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Trang chủ",
              "item": {
                "@type": "WebPage",
                "@id": "https://phonghocchothue.com/",
                "url": "https://phonghocchothue.com/",
                "name": "Trang chủ"
              }
            }
          ]
        }
      ];

      if (faqSchema) {
        try {
          const parsed = typeof faqSchema === "string" ? JSON.parse(faqSchema) : faqSchema;
          if (parsed && typeof parsed === "object") {
            if (parsed.mainEntity && Array.isArray(parsed.mainEntity)) {
              parsed.mainEntity = parsed.mainEntity.map((item: any) => ({
                ...item,
                name: stripHtmlAndCss(item.name),
                acceptedAnswer: item.acceptedAnswer ? {
                  ...item.acceptedAnswer,
                  text: stripHtmlAndCss(item.acceptedAnswer.text)
                } : undefined
              }));
            }
            parsed["@id"] = "https://phonghocchothue.com/#faq";
            parsed["isPartOf"] = { "@id": "https://phonghocchothue.com/#webpage" };
            parsed["about"] = { "@id": "https://phonghocchothue.com/#localbusiness" };
            baseStructured.push(parsed);
          }
        } catch (e) {
          console.error("Lỗi parse FAQ schema:", e);
        }
      }

      return baseStructured;
    },
    [seoTitle, seoDescription, seoImageUrl, nameBrand, logoUrl, phone, address, faqSchema, email, linkfb, linkYoutube, googleMap]
  );

  const homeStructuredDataPayload = useMemo(
    () => ({ id: "home-ld-json", data: homeStructuredData }),
    [homeStructuredData]
  );

  useSEO({
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    canonical: canonicalUrl,
    ogType: "website",
    ogImage: seoImageUrl,
    ogUrl: canonicalUrl,
    twitterImage: seoImageUrl,
    structuredData: homeStructuredDataPayload,
  });

  const countVisit = useCountVisit();

  useEffect(() => {
    countVisit.mutate();
  }, []);

  useEffect(() => {
    const container = document.getElementById("main-scroll-container");
    if (container) {
      container.scrollTop = 0;
    }
    const timer = setTimeout(() => {
      const container2 = document.getElementById("main-scroll-container");
      if (container2) {
        container2.scrollTop = 0;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="overflow-hidden">
      {background.backgroundImage && (
        <div className="fixed top-0 left-0 w-full h-screen -z-10">
          <Image
            src={`${URL_API}${background.backgroundImage.replaceAll("\\", "/")}`}
            alt="Hình nền khu vực phòng cho thuê"
            fill
            className="object-cover"
            sizes="100vw"
            priority
            quality={85}
          />
        </div>
      )}

      {showNotification && notificationText && (
        <div
          className="fixed bottom-5 left-5 bg-white shadow-lg rounded-[8px] p-3 sm:p-6 sm:px-3 border-[1px] border-[#799f85] z-50 flex flex-col items-center text-center transition-all duration-500 ease-in-out opacity-100 translate-y-0 w-[210px] sm:w-[230px] md:w-[230px] lg:w-[230px] xl:w-[230px] max-sm:w-[170px]"
        >
          {background.imgBird && (
            <Image
              src={`${URL_API}${background.imgBird.replaceAll("\\", "/")}`}
              alt="Biểu tượng chú chim thông báo"
              width={96}
              height={96}
              className="w-[58px] absolute -top-[44px] sm:w-20 md:w-20 lg:w-20 xl:w-24 lg:-top-18 md:-top-15 sm:-top-12"
              sizes="(max-width: 640px) 58px, (max-width: 1024px) 80px, 96px"
              quality={85}
              loading="lazy"
            />
          )}

          <div className="bg-[#799f85] absolute -top-2 -right-2 rounded-xl p-1 flex justify-center items-center cursor-pointer">
            <FontAwesomeIcon
              icon={faTimes}
              className="text-white w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5"
              onClick={() => setShowNotification(false)}
            />
          </div>

          <RichTextRenderer
            html={notificationText}
            className="notification-rich-text text-[#563c39] mt-0 text-[10px] sm:text-xs raleway !font-[400] leading-[14px]"
          />

          {notificationLink && (
            <a
              href={notificationLink}
              className="inline-block cursor-pointer mt-2 font-bold px-3 bg-[var(--color-btn-purple)] text-white rounded-tl-xl rounded-br-xl hover:bg-[var(--color-btn-purple-hover)] hover:rounded-bl-xl hover:rounded-tr-xl hover:rounded-br-none hover:rounded-tl-none py-1 uppercase text-xs transition-all duration-300 ease-in-out"
            >
              <RichTextRenderer
                html={textBtnNotication}
                className="inline-rich-text"
                as="span"
              />
            </a>
          )}
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center px-[34px] py-[30px] sm:p-[70px] 1400px:p-[70px] 1700px:p-[85px]">
        <div
          id="main-scroll-container"
          className="w-full h-full rounded-[15px] sm:rounded-[30px] overflow-y-auto sm:overflow-y-hidden overflow-x-hidden hover:overflow-y-auto hide-scrollbar scroll-smooth"
          style={pageStyle}
        >
          <Header />
          <div id="about">
            <Describe />
          </div>
          <div id="room">
            <ProductCard />
          </div>
          <div id="amenities">
            <Amenities />
          </div>
          <div id="gallery">
            <Gallery />
          </div>
          <div id="blog">
            <Blog isHomePage={true} hideTabs={true} />
          </div>
          <div id="faq">
            <FAQ />
          </div>
          <div id="contact">
            <Contact />
          </div>
          <NurseryHeader />
          <Footer />
        </div>
      </div>
    </div>
  );
}

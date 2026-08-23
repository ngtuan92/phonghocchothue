"use client";

export const runtime = 'edge'
import Image from "next/image";
import { Button, Modal, Textarea, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { toNumber, get } from "lodash";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { showToastSuccess, showToastError } from "@/helpers/toast";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useProduct, useProducts } from "@/hooks/api/useProducts";
import { useCreateBooking } from "@/hooks/api/useBookings";
import CarouselWithThumb from "@/components/carousel/CarouselWithThumb";
import { formatNumber } from "@/utils/helpers";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import useSEO from "@/hooks/useSEO";
import { stripHtmlAndCss } from "@/utils/seoHelpers";
import dynamic from "next/dynamic";

const RichTextRenderer = dynamic(() => import("@/components/RichTextRenderer"), { ssr: false });

const URL_API =
  process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  studentNum: string;
  message: string;
}

interface ProductData {
  product: {
    name: string;
    name_rich?: string;
    images: any[];
    image: string;
    contains: any;
    equipment: any;
    price: any;
    content: string;
    description?: string;
    lineHeight?: string;
    lineHeightMobile?: string;
    fontSize?: string;
    fontSizeMobile?: string;
    nameFontSize?: string;
    nameFontSizeMobile?: string;
    translateY?: string;
    translateYMobile?: string;
  };
}

const extractPrice = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // Match the first sequence of digits, dots, or commas
    const match = value.match(/[\d.,]+/);
    if (match) {
      // Remove dots and commas to get the raw number
      const raw = match[0].replace(/[.,]/g, "");
      return parseInt(raw, 10) || 0;
    }
  }
  return 0;
};

const hasMeaningfulPrice = (value: any): boolean => {
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value !== "string") return false;
  return stripHtmlAndCss(value).trim() !== "";
};

const formatPlainPrice = (value: any): string => {
  if (typeof value === "number") return formatNumber(value);
  const text = String(value || "").trim();
  const numericValue = Number(text);
  return Number.isFinite(numericValue) ? formatNumber(numericValue) : text;
};

export default function DetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string) || "";

  // Form state
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    studentNum: "",
    message: "",
  });

  const [opened, { open, close }] = useDisclosure(false);

  // API hooks
  const { data: product, isLoading: isLoadingProduct } = useProduct(slug);
  const { data: allProducts = [] } = useProducts({ limit: 4 });
  const createBooking = useCreateBooking();

  // Config hooks
  const colorBg = useConfigContentByKey("color-bg");
  const imgIcon = useConfigContentByKey("logo-page-detail");
  const bgConfig = useConfigContentByKey("background");
  const btnColor = useConfigContentByKey("color-btn") || "#b8c7b0";

  // Memoized values
  const pageStyle = useMemo(
    () => (colorBg ? { backgroundColor: colorBg } : {}),
    [colorBg]
  );

  const buildAbsoluteUrl = useCallback((value: string | undefined): string | null => {
    if (!value || typeof value !== "string") return null;
    if (value.startsWith("http")) return value;
    return `${URL_API}${value.replaceAll("\\", "/")}`;
  }, []);

  const canonicalUrl = "https://phonghocchothue.com";

  const buildCanonicalAssetUrl = useCallback((value: string | undefined): string | null => {
    if (!value || typeof value !== "string") return null;
    if (value.startsWith("http")) {
      return value.replace(/https?:\/\/localhost:\d+/gi, canonicalUrl).replace(/https?:\/\/api\.phonghocchothue\.com/gi, canonicalUrl);
    }
    const cleanPath = value.replaceAll("\\", "/").replace(/^\//, "");
    return `${canonicalUrl}/${cleanPath}`;
  }, []);

  const iconHeader = useMemo(() => {
    if (typeof imgIcon === "string" && imgIcon.trim() !== "") {
      return `${URL_API}${imgIcon.replaceAll("\\", "/")}`;
    }
    return null;
  }, [imgIcon]);

  const bg = useMemo(() => {
    if (typeof bgConfig === "string" && bgConfig.trim() !== "") {
      return `${URL_API}${bgConfig.replaceAll("\\", "/")}`;
    }
    return null;
  }, [bgConfig]);


  const images = useMemo(() => {
    if (!product?.images || !Array.isArray(product.images)) return [];
    return product.images
      .map((img: any) => {
        const imagePath =
          typeof img === "string" ? img : img?.image_detail || img?.image;
        return buildAbsoluteUrl(imagePath);
      })
      .filter(Boolean) as string[];
  }, [product, buildAbsoluteUrl]);

  const productData: ProductData = useMemo(() => {
    if (!product) {
      return {
        product: {
          name: "",
          images: [],
          image: "",
          contains: 0,
          equipment: "",
          price: 0,
          content: "",
          description: "",
        },
      };
    }

    return {
      product: {
        name: product.name || "",
        name_rich: product.name_rich || "",
        images: product.images || [],
        image: product.image || "",
        contains: product.contains || 0,
        equipment: product.equipment || "",
        price: product.price,
        content: product.content || product.description || "",
        description: product.description || "",
        lineHeight: product.lineHeight || "",
        lineHeightMobile: product.lineHeightMobile || "",
        fontSize: product.fontSize || "",
        fontSizeMobile: product.fontSizeMobile || "",
        nameFontSize: product.nameFontSize || "",
        nameFontSizeMobile: product.nameFontSizeMobile || "",
        translateY: product.translateY || "",
        translateYMobile: product.translateYMobile || "",
      },
    };
  }, [product]);

  // SEO
  const seoTitle = useMemo(() => {
    const customTitle = product?.seoTitle?.trim();
    if (customTitle) return stripHtmlAndCss(customTitle);
    return product?.name ? `${stripHtmlAndCss(product.name)} - Cho Thuê Phòng Học` : "Chi tiết phòng học";
  }, [product]);

  const seoDescription = useMemo(() => {
    const customDescription = product?.seoDescription?.trim();
    if (customDescription) return stripHtmlAndCss(customDescription);
    return stripHtmlAndCss(product?.description || "");
  }, [product]);

  const seoImage = useMemo(() => {
    if (product?.seoImage) {
      return buildCanonicalAssetUrl(product.seoImage) || "";
    }
    const rawImage = product?.images?.[0] ? (typeof product.images[0] === "string" ? product.images[0] : (product.images[0]?.image_detail || product.images[0]?.image)) : null;
    return buildCanonicalAssetUrl(rawImage || bgConfig) || "";
  }, [product, bgConfig, buildCanonicalAssetUrl]);

  const seoKeywords = useMemo(() => stripHtmlAndCss(product?.seoKeywords?.trim() || ""), [product]);

  const availability = product?.status === 1 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  // Xử lý content từ CKEditor để hiển thị đúng
  const processedContent = useMemo(() => {
    const content = get(productData, "product.content", "");
    if (!content || typeof content !== "string") return "";

    // Convert relative image URLs thành absolute URLs
    let processed = content.replace(
      /<img([^>]*?)src=["']([^"']+?)["']/gi,
      (match, attributes, src) => {
        // Nếu URL đã là absolute (http/https/blob/data), giữ nguyên
        if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("blob:") || src.startsWith("data:")) {
          return match;
        }
        // Nếu URL bắt đầu bằng /, thêm base URL
        if (src.startsWith("/")) {
          return `<img${attributes}src="${URL_API}${src.substring(1)}"`;
        }
        // Nếu là relative path, thêm base URL
        const absoluteUrl = buildAbsoluteUrl(src);
        return `<img${attributes}src="${absoluteUrl || src}"`;
      }
    );

    // Xử lý các thẻ iframe (nếu có)
    processed = processed.replace(
      /<iframe([^>]*?)src=["']([^"']+?)["']/gi,
      (match, attributes, src) => {
        if (src.startsWith("http://") || src.startsWith("https://")) {
          return match;
        }
        const absoluteUrl = buildAbsoluteUrl(src);
        return `<iframe${attributes}src="${absoluteUrl || src}"`;
      }
    );

    return processed;
  }, [productData, buildAbsoluteUrl]);

  const processedName = useMemo(() => {
    const name = productData.product.name_rich || productData.product.name;
    if (!name || typeof name !== "string") return "";
    // Replace any heading tags (h1-h6) with p tags to prevent having headings before the main H1
    return name.replace(/<h[1-6]([^>]*?)>/gi, "<p$1>").replace(/<\/h[1-6]>/gi, "</p>");
  }, [productData]);



  useSEO({
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    image: seoImage,
    ogTitle: seoTitle,
    ogDescription: seoDescription,
    ogImage: seoImage,
    ogUrl:
      typeof globalThis !== "undefined" && globalThis.window
        ? globalThis.window.location.href
        : "",
    twitterTitle: seoTitle,
    twitterDescription: seoDescription,
    twitterImage: seoImage,
    url:
      typeof globalThis !== "undefined" && globalThis.window
        ? globalThis.window.location.href
        : "",
    structuredData: {
      data: [
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: stripHtmlAndCss(product?.name || ""),
          description: seoDescription,
          image: seoImage ? [seoImage] : undefined,
          brand: {
            "@type": "Brand",
            "name": "Hoa Học Trò",
            "@id": "https://phonghocchothue.com/#localbusiness"
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: "287",
            bestRating: "5",
            worstRating: "1"
          },
          review: [
            {
              "@type": "Review",
              "author": {
                "@type": "Person",
                "name": "Nguyễn Minh"
              },
              "reviewBody": "Phòng học rất sạch sẽ, trang bị đầy đủ, giá hợp lý. Tôi đã thuê nhiều lần và rất hài lòng.",
              "reviewRating": {
                "@type": "Rating",
                "ratingValue": "5",
                "bestRating": "5",
                "worstRating": "1"
              }
            },
            {
              "@type": "Review",
              "author": {
                "@type": "Person",
                "name": "Lan Anh"
              },
              "reviewBody": "Máy chiếu rõ nét, bàn ghế thoải mái, phòng mát mẻ. Dịch vụ hỗ trợ nhanh chóng.",
              "reviewRating": {
                "@type": "Rating",
                "ratingValue": "5",
                "bestRating": "5",
                "worstRating": "1"
              }
            },
            {
              "@type": "Review",
              "author": {
                "@type": "Person",
                "name": "Trần Phúc"
              },
              "reviewBody": "Chất lượng phòng rất tốt, nhân viên nhiệt tình. Sẽ tiếp tục sử dụng cho các khóa học sau.",
              "reviewRating": {
                "@type": "Rating",
                "ratingValue": "4",
                "bestRating": "5",
                "worstRating": "1"
              }
            }
          ],
          offers: {
            "@type": "Offer",
            priceCurrency: "VND",
            price: extractPrice(product?.price),
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            availability,
            seller: {
              "@type": "TutoringCenter",
              "@id": "https://phonghocchothue.com/#localbusiness",
              "name": "Hoa Học Trò"
            },
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: {
                "@type": "MonetaryAmount",
                value: "0",
                currency: "VND"
              },
              shippingDestination: {
                "@type": "DefinedRegion",
                addressCountry: "VN"
              },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                handlingTime: {
                  "@type": "QuantitativeValue",
                  minValue: 1,
                  maxValue: 2,
                  unitCode: "DAY"
                },
                transitTime: {
                  "@type": "QuantitativeValue",
                  minValue: 2,
                  maxValue: 5,
                  unitCode: "DAY"
                }
              }
            },
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "VN",
              returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
              merchantReturnDays: 7,
              returnMethod: "ReturnByMail",
              returnFees: "FreeReturn"
            }
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "@id": typeof window !== "undefined" ? `${window.location.href}#breadcrumb` : `https://phonghocchothue.com/phong/${slug}#breadcrumb`,
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
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Phòng học",
              "item": {
                "@type": "WebPage",
                "@id": "https://phonghocchothue.com/#room",
                "url": "https://phonghocchothue.com/#room",
                "name": "Phòng học"
              }
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": stripHtmlAndCss(product?.name || "Chi tiết phòng học"),
              "item": {
                "@type": "WebPage",
                "@id": typeof window !== "undefined" ? window.location.href : `https://phonghocchothue.com/phong/${slug}`,
                "url": typeof window !== "undefined" ? window.location.href : `https://phonghocchothue.com/phong/${slug}`,
                "name": stripHtmlAndCss(product?.name || "Chi tiết phòng học")
              }
            }
          ]
        }
      ]
    },
  });

  // Handlers
  const goToHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      studentNum: "",
      message: "",
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    resetForm();
    close();
  }, [resetForm, close]);

  const handleInputChange = useCallback(
    (field: keyof BookingFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.preventDefault();
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    },
    []
  );

  const handleInputAbort = useCallback(
    (field: keyof BookingFormData) => (e: React.SyntheticEvent) => {
      e.preventDefault();
      setFormData((prev) => ({ ...prev, [field]: "" }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    const { name, email, phone, subject, studentNum, message } = formData;

    // Validation
    if (!name || !email || !phone) {
      showToastError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (!product) {
      showToastError("Không tìm thấy thông tin sản phẩm");
      return;
    }

    try {
      const productId = product.id || product._id || slug;
      const bookingData = {
        name,
        email,
        phone,
        subject,
        studentNum: toNumber(studentNum) || 0,
        message,
        productId,
      };

      await createBooking.mutateAsync(bookingData);
      showToastSuccess("Đặt phòng thành công!");
      handleCloseModal();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Có lỗi xảy ra khi đặt phòng";
      showToastError(errorMessage);
    }
  }, [formData, product, slug, createBooking, handleCloseModal]);

  useEffect(() => {
    const container = document.getElementById("detail-scroll-container");
    if (container) {
      container.scrollTop = 0;
    }
    const timer = setTimeout(() => {
      const container2 = document.getElementById("detail-scroll-container");
      if (container2) {
        container2.scrollTop = 0;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [slug]);

  // Loading state
  if (isLoadingProduct) {
    return (
      <div style={pageStyle} className="min-h-screen flex items-center justify-center">
        <div>Đang tải...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={pageStyle} className="min-h-screen flex items-center justify-center">
        <div>Không tìm thấy sản phẩm</div>
      </div>
    );
  }

  const nameHasOwnLayout = /data-rich-text-controls|--custom-line-height|--translate-y/.test(
    productData.product.name_rich || ""
  );

  return (
    <div className="overflow-hidden">
      {bg && (
        <Image
          src={bg}
          alt="bg"
          fill
          className="object-cover fixed top-0 left-0 -z-10"
          sizes="100vw"
          quality={85}
          priority
          loading="eager"
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center p-[30px] sm:p-[70px] 1400px:p-[70px] 1700px:p-[85px]">
        <div
          id="detail-scroll-container"
          className="w-full h-full rounded-[15px] sm:rounded-[30px] overflow-y-auto sm:overflow-y-hidden overflow-x-hidden hover:overflow-y-auto hide-scrollbar"
          style={pageStyle}
        >
          <Header />
          <div
            className={`flex flex-col justify-center items-center px-2 my-4 sm:my-2 z-2 sm:h-auto relative max-sm:top-10`}
          >
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            {iconHeader && (
              <Image
                onClick={goToHome}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToHome();
                  }
                }}
                tabIndex={0}
                src={iconHeader}
                alt="logo"
                width={73}
                height={80}
                className="w-[51px] sm:w-[73px] sm:mt-[30px] h-auto object-contain cursor-pointer"
                sizes="(max-width: 640px) 51px, 73px"
                quality={85}
                priority
              />
            )}
          </div>
          <Modal
            opened={opened}
            onClose={handleCloseModal}
            withCloseButton
            title="Đăng ký thuê phòng"
            overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
            styles={{
              content: {
                width: "100%",
              },
            }}
          >
            <div className="mt-4 w-full flex gap-5 flex-col">
              <TextInput
                placeholder="Họ và tên"
                value={formData.name}
                onChange={handleInputChange("name")}
                onAbort={handleInputAbort("name")}
              />
              <TextInput
                placeholder="Số điện thoại"
                value={formData.phone}
                onChange={handleInputChange("phone")}
                onAbort={handleInputAbort("phone")}
              />
              <TextInput
                placeholder="Bộ môn"
                value={formData.subject}
                onChange={handleInputChange("subject")}
                onAbort={handleInputAbort("subject")}
              />
              <TextInput
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange("email")}
                onAbort={handleInputAbort("email")}
              />
              <TextInput
                placeholder="Số lượng học sinh trong một lớp"
                value={formData.studentNum}
                onChange={handleInputChange("studentNum")}
                onAbort={handleInputAbort("studentNum")}
              />
              <Textarea
                placeholder="Yêu cầu thêm"
                minRows={4}
                value={formData.message}
                onChange={handleInputChange("message")}
                onAbort={handleInputAbort("message")}
              />
            </div>
            <div className="mt-8 w-full flex justify-end gap-3">
              <Button
                disabled={createBooking.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 w-full"
                onClick={handleSubmit}
              >
                {createBooking.isPending ? (
                  <>
                    <svg
                      aria-hidden="true"
                      className="inline w-4 h-4 me-3 text-white animate-spin"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="#E5E7EB"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentColor"
                      />
                    </svg>
                    Đang gửi...
                  </>
                ) : (
                  "Đăng ký ngay"
                )}
              </Button>
            </div>
          </Modal>
          {/* Header section */}
          <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 py-16 px-[40px] sm:px-20 pb-3 sm:pb-16 items-start sm:-mt-[30px]" id="#">
            <div className="flex-1 relative">
              <CarouselWithThumb
                items={productData.product.images}
                avatar={productData.product.image}
                colorBg={colorBg}
                thumbsPerView={5}
                classNames={{
                  wrapper:
                    "lg:mx-auto lg:max-w-[calc(100dvh-300px)] 1700px:max-w-[calc(100dvh-320px)]",
                }}
              />
            </div>
            <div className="flex-1 rounded-lg text-left lg:pl-4">
              <div className="title-product-detail mb-2 sm:mb-4">
                {productData.product.name_rich ? (
                  <RichTextRenderer
                    html={processedName}
                    className="title-product-detail-rich"
                    fontSize={product.nameFontSize}
                    fontSizeMobile={product.nameFontSizeMobile}
                    lineHeight={nameHasOwnLayout ? undefined : product.lineHeight}
                    lineHeightMobile={nameHasOwnLayout ? undefined : product.lineHeightMobile}
                    translateY={nameHasOwnLayout ? undefined : product.translateY}
                    translateYMobile={nameHasOwnLayout ? undefined : product.translateYMobile}
                    preserveNbsp
                  />
                ) : (
                  <p className="text-[20px] max-sm:mb-[10px] sm:text-[35px] text-[#9F853A] font-bold cursor-pointer">
                    {productData.product.name}
                  </p>
                )}
              </div>
              <div className="room-summary-desc pl-3 sm:pl-4 text-xs sm:text-base mt-0 sm:mt-1 pt-0 pb-1">
                {/* Fallback for contains if it has old data */}
                {!!(productData.product.contains && String(productData.product.contains).trim() && String(productData.product.contains).trim() !== "0") && (
                  <div className="mb-1 sm:mb-1.5">
                    {typeof productData.product.contains === "string" && productData.product.contains.includes("<") ? (
                      <RichTextRenderer
                        html={productData.product.contains}
                        className="inline-rich-text"
                        as="span"
                        fontSize={product.fontSize}
                        fontSizeMobile={product.fontSizeMobile}
                        lineHeight={product.lineHeight}
                        lineHeightMobile={product.lineHeightMobile}
                        translateY={product.translateY}
                        translateYMobile={product.translateYMobile}
                      />
                    ) : (
                      formatNumber(toNumber(productData.product.contains) || 0)
                    )}
                  </div>
                )}

                {/* Render equipment (which is the new Mô tả field) */}
                {productData.product.equipment && String(productData.product.equipment).trim() && (
                  <div>
                    {typeof productData.product.equipment === "string" && productData.product.equipment.includes("<") ? (
                      <RichTextRenderer
                        html={productData.product.equipment}
                        as="div"
                        fontSize={product.fontSize}
                        fontSizeMobile={product.fontSizeMobile}
                        lineHeight={product.lineHeight}
                        lineHeightMobile={product.lineHeightMobile}
                        translateY={product.translateY}
                        translateYMobile={product.translateYMobile}
                      />
                    ) : (
                      productData.product.equipment
                    )}
                  </div>
                )}
              </div>
              {hasMeaningfulPrice(productData.product.price) && (
                <div className="room-price-summary pl-3 sm:pl-4 text-xs sm:text-base mt-1 sm:mt-2 mb-4">
                  {typeof productData.product.price === "string" && productData.product.price.includes("<") ? (
                    <RichTextRenderer
                      html={productData.product.price}
                      className="inline-rich-text"
                      as="span"
                      fontSize={product.fontSize}
                      fontSizeMobile={product.fontSizeMobile}
                      lineHeight={product.lineHeight}
                      lineHeightMobile={product.lineHeightMobile}
                      translateY={product.translateY}
                      translateYMobile={product.translateYMobile}
                    />
                  ) : (
                    formatPlainPrice(productData.product.price)
                  )}
                </div>
              )}
              <Button
                className="!w-auto !h-[40px] !bg-[var(--btn-color)] !px-[15px] sm:!px-[20px] !text-white !rounded-tl-xl !text-xs sm:!text-lg !rounded-br-xl !py-2 hover:!bg-[#e57f7f]"
                style={{ '--btn-color': btnColor } as React.CSSProperties}
                onClick={open}
              >
                Đăng ký ngay
              </Button>
            </div>
          </div>
          {/* Detail section */}
          <div
            className="mt-8 w-auto border-b-2 border-[#003a6a] px-0 flex justify-start mx-[40px] sm:mx-20"
            id="about"
          >
            <span className="px-4 py-2 bg-[#003a6a] text-white poppins-bold text-sm sm:text-lg">
              Chi tiết
            </span>
          </div>
          <>
            <style dangerouslySetInnerHTML={{
              __html: `
                .room-summary-desc ul {
                  list-style-type: disc !important;
                  padding-left: 1.25rem !important;
                  margin: 0.5rem 0 !important;
                }
                .room-summary-desc ol {
                  padding-left: 1.25rem !important;
                  margin: 0.5rem 0 !important;
                }
                .room-summary-desc ol:not(:has(li[data-list])) {
                  list-style-type: decimal !important;
                }
                .room-summary-desc ol:has(li[data-list="bullet"]) {
                  list-style-type: none !important;
                }
                .room-summary-desc ol:has(li[data-list="ordered"]) {
                  list-style-type: none !important;
                }
                .room-summary-desc li[data-list="bullet"] {
                  list-style-type: disc !important;
                  display: list-item !important;
                }
                .room-summary-desc li[data-list="ordered"] {
                  list-style-type: decimal !important;
                  display: list-item !important;
                }
                .room-summary-desc li:not([data-list]) {
                  display: list-item !important;
                }
                .room-summary-desc li {
                  margin: 0.25rem 0 !important;
                  line-height: 1.6 !important;
                  list-style-position: outside !important;
                  padding-left: 0 !important;
                }
                .room-summary-desc .rich-text-renderer li {
                  margin-top: 0 !important;
                  margin-bottom: 0 !important;
                  line-height: inherit !important;
                }
                .room-summary-desc .rich-text-renderer [style*="--custom-line-height:"],
                .room-summary-desc .rich-text-renderer [style*="--custom-line-height:"] * {
                  line-height: var(--custom-line-height) !important;
                }
                @media (max-width: 767px) {
                  .room-summary-desc .rich-text-renderer [style*="--custom-line-height-mobile:"],
                  .room-summary-desc .rich-text-renderer [style*="--custom-line-height-mobile:"] * {
                    line-height: var(--custom-line-height-mobile, var(--custom-line-height)) !important;
                  }
                }
                .room-summary-desc li::marker {
                  color: currentColor;
                  font-size: 1em;
                  line-height: inherit;
                }
                .room-summary-desc .ql-ui,
                .room-summary-desc li::before {
                  content: none !important;
                  display: none !important;
                }
                 .ckeditor-content ul {
                  list-style-type: disc !important;
                  padding-left: 1.5rem !important;
                  margin: 1rem 0 !important;
                }
                .ckeditor-content ol {
                  padding-left: 1.5rem !important;
                  margin: 1rem 0 !important;
                }
                .ckeditor-content ol:not(:has(li[data-list])) {
                  list-style-type: decimal !important;
                }
                .ckeditor-content ol:has(li[data-list="bullet"]) {
                  list-style-type: none !important;
                }
                .ckeditor-content ol:has(li[data-list="ordered"]) {
                  list-style-type: none !important;
                }
                .ckeditor-content li[data-list="bullet"] {
                  list-style-type: disc !important;
                  display: list-item !important;
                }
                .ckeditor-content li[data-list="ordered"] {
                  list-style-type: decimal !important;
                  display: list-item !important;
                }
                .ckeditor-content ul ul,
                .ckeditor-content ol ul {
                  list-style-type: circle !important;
                  margin-top: 0.5rem !important;
                  margin-bottom: 0.5rem !important;
                }
                .ckeditor-content ol ol,
                .ckeditor-content ul ol {
                  list-style-type: lower-alpha !important;
                  margin-top: 0.5rem !important;
                  margin-bottom: 0.5rem !important;
                }
                .ckeditor-content li {
                  margin: 0.5rem 0 !important;
                  line-height: inherit !important;
                  display: list-item !important;
                  list-style-position: outside !important;
                  padding-left: 0 !important;
                }
                .ckeditor-content li::marker {
                  color: currentColor;
                  font-size: 1em;
                  line-height: inherit;
                }
                .ckeditor-content .ql-ui,
                .ckeditor-content li::before {
                  content: none !important;
                  display: none !important;
                }
                .ckeditor-content p {
                  margin: 1rem 0 !important;
                  line-height: inherit !important;
                }
                .ckeditor-content h1 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                }
                .ckeditor-content h2 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                }
                .ckeditor-content h3 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                }
                .ckeditor-content h4 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                }
                .ckeditor-content h5 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                }
                .ckeditor-content h6 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                }
                .ckeditor-content table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin: 1rem 0 !important;
                }
                .ckeditor-content table td,
                .ckeditor-content table th {
                  padding: 0.5rem !important;
                  border: 1px solid #ddd !important;
                }
                .ckeditor-content a {
                  color: #2563eb !important;
                  text-decoration: underline !important;
                }
                .ckeditor-content a:hover {
                  color: #1d4ed8 !important;
                  text-decoration: underline !important;
                }
                .ckeditor-content a:visited {
                  color: #1d4ed8 !important;
                  text-decoration: underline !important;
                }
                .room-summary-desc img,
                .ckeditor-content img {
                  display: block !important;
                  max-width: 100% !important;
                  height: auto !important;
                  margin-left: auto !important;
                  margin-right: auto !important;
                }
                .room-summary-desc .image-wrapper,
                .ckeditor-content .image-wrapper {
                  width: auto !important;
                  max-width: 100% !important;
                }
                .room-summary-desc .image-wrapper[data-wrap="none"] img,
                .ckeditor-content .image-wrapper[data-wrap="none"] img {
                  margin-left: auto !important;
                  margin-right: auto !important;
                }
                @media (max-width: 768px) {
                  .ckeditor-content {
                  }

                  .ckeditor-content p,
                  .ckeditor-content li {
                    line-height: inherit !important;
                  }

                  .ckeditor-content h1 {
                  }

                  .ckeditor-content h2 {
                  }

                  .ckeditor-content h3 {
                  }

                  .ckeditor-content h4 {
                  }

                  .ckeditor-content h5 {
                  }

                  .ckeditor-content h6 {
                  }

                  .ckeditor-content table {
                  }
                   .ckeditor-content img {
                    height: auto !important;
                  }
                }
              `
            }} />
            <div
              className="mt-4 px-[40px] sm:px-20 content-img text-xs sm:text-base ckeditor-content"
              style={{
                wordWrap: "break-word",
                lineHeight: "1.6",
                letterSpacing: "0.01em",
              }}
            >
              <RichTextRenderer 
                html={processedContent} 
                className="room-detail-content" 
                fontSize={product.fontSize}
                fontSizeMobile={product.fontSizeMobile}
                lineHeight={product.lineHeight}
                lineHeightMobile={product.lineHeightMobile}
                translateY={product.translateY}
                translateYMobile={product.translateYMobile}
                naturalTextWrapping
                preserveLeadingIndent
              />
            </div>
          </>
          <div id="room" className="mb-[60px] sm:mb-0">
            <ProductCard />
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

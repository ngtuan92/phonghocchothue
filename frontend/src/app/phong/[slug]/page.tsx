"use client";

import Image from "next/image";
import { Button, Modal, Textarea, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { toNumber, get } from "lodash";
import { useMemo, useState, useCallback } from "react";
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
import parse from "html-react-parser";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import useSEO from "@/hooks/useSEO";

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
    contains: number;
    equipment: string;
    price: number;
    content: string;
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
      },
    };
  }, [product]);

  // SEO
  const seoTitle = useMemo(() => {
    const customTitle = product?.seoTitle?.trim();
    if (customTitle) return customTitle;
    return product?.name ? `${product.name} - Cho Thuê Phòng Học` : "Chi tiết phòng học";
  }, [product]);

  const seoDescription = useMemo(() => {
    const customDescription = product?.seoDescription?.trim();
    if (customDescription) return customDescription;
    return product?.description || "";
  }, [product]);

  const seoImage = useMemo(() => {
    if (product?.seoImage) {
      return buildAbsoluteUrl(product.seoImage) || "";
    }
    return images[0] || buildAbsoluteUrl(bgConfig) || "";
  }, [product, images, buildAbsoluteUrl, bgConfig]);

  const seoKeywords = useMemo(() => product?.seoKeywords?.trim() || "", [product]);

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
    return name;
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
      data: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product?.name || "",
        description: seoDescription,
        image: seoImage ? [seoImage] : undefined,
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
      }
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
                width={110}
                height={120}
                className="w-[77px] h-[86px] sm:w-[110px] sm:h-[120px] cursor-pointer"
                sizes="(max-width: 640px) 77px, 110px"
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
                placeholder="Môn học"
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
          <div className="flex flex-col lg:flex-row gap-4 py-16 px-[40px] sm:px-20 pb-3 sm:pb-16" id="#">
            <div className="flex-1 relative">
              <CarouselWithThumb
                items={productData.product.images}
                avatar={productData.product.image}
              />
            </div>
            <div className="flex-1 p-4 rounded-lg text-left">
              <div className="title-product-detail mb-4">
                {productData.product.name_rich ? (
                  <div className="ckeditor-content">
                    {parse(processedName)}
                  </div>
                ) : (
                  <h1 className="text-[20px] max-sm:mb-[10px] sm:text-[35px] text-[#9F853A] font-bold cursor-pointer">
                    {productData.product.name}
                  </h1>
                )}
              </div>
              <h3 className="text-sm sm:text-lg text-foreground-100 raleway !font-bold mb-2">
                Mô tả :
              </h3>
              <ul className="list-disc pl-6 text-xs sm:text-base py-4 border-t-2 border-b-2 border-[#ccc]">
                <li className="">
                  Sức chứa: {formatNumber(get(productData, "product.contains", 0))}
                </li>
                <li className="">Trang bị: {get(productData, "product.equipment")}</li>
              </ul>
              <h2 className="text-xs sm:text-base font-bold text-red-600 my-4">
                <span className="text-stone-800 text-base">Giá:</span>{" "}
                {`${formatNumber(get(productData, "product.price"))}` || "Liên hệ"}
              </h2>
              <Button
                className="!w-auto !h-[40px] !bg-[#b8c7b0] !px-[15px] sm:!px-[20px] !text-white !rounded-tl-xl !text-xs sm:!text-lg !rounded-br-xl !py-2 hover:!bg-[#e57f7f]"
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
            <span className="px-4 py-2 bg-[#003a6a] text-white uppercase poppins-bold text-sm sm:text-lg">
              Chi tiết
            </span>
          </div>
          <>
            <style dangerouslySetInnerHTML={{
              __html: `
                .ckeditor-content ul {
                  list-style-type: disc !important;
                  padding-left: 1.5rem !important;
                  margin: 1rem 0 !important;
                }
                .ckeditor-content ol {
                  list-style-type: decimal !important;
                  padding-left: 1.5rem !important;
                  margin: 1rem 0 !important;
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
                  line-height: 1.6 !important;
                  display: list-item !important;
                  font-size: 1rem !important;
                }
                .ckeditor-content p {
                  margin: 1rem 0 !important;
                  line-height: 1.6 !important;
                  font-size: 1rem !important;
                }
                .ckeditor-content h1 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                  font-size: 2rem !important;
                }
                .ckeditor-content h2 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                  font-size: 1.5rem !important;
                }
                .ckeditor-content h3 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                  font-size: 1.25rem !important;
                }
                .ckeditor-content h4 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                  font-size: 1.125rem !important;
                }
                .ckeditor-content h5 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                  font-size: 1rem !important;
                }
                .ckeditor-content h6 {
                  margin: 1rem 0 1rem 0 !important;
                  line-height: 1.2 !important;
                  font-size: 0.875rem !important;
                }
                .ckeditor-content table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin: 1rem 0 !important;
                  font-size: 1rem !important;
                }
                .ckeditor-content table td,
                .ckeditor-content table th {
                  padding: 0.5rem !important;
                  border: 1px solid #ddd !important;
                  font-size: 1rem !important;
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
                @media (max-width: 768px) {
                  .ckeditor-content {
                    font-size: 0.9rem; /* giảm toàn bộ */
                  }

                  .ckeditor-content p,
                  .ckeditor-content li {
                    font-size: 0.9rem !important;
                    line-height: 1.6 !important;
                  }

                  .ckeditor-content h1 {
                    font-size: 1.4rem !important;
                  }

                  .ckeditor-content h2 {
                    font-size: 1.25rem !important;
                  }

                  .ckeditor-content h3 {
                    font-size: 1.15rem !important;
                  }

                  .ckeditor-content h4 {
                    font-size: 1.05rem !important;
                  }

                  .ckeditor-content h5 {
                    font-size: 0.95rem !important;
                  }

                  .ckeditor-content h6 {
                    font-size: 0.9rem !important;
                  }

                  .ckeditor-content table {
                    font-size: 0.85rem !important;
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
              {parse(processedContent, {
                replace: (domNode: any) => {
                  if (!domNode || typeof domNode !== "object" || !domNode.name) return domNode;

                  // Xử lý thẻ img để đảm bảo responsive
                  if (domNode.name === "img" && domNode.attribs) {
                    const { width, height, style, alt, class: className, src } = domNode.attribs;

                    // Parse existing styles if any
                    const existingStyles: React.CSSProperties = {};
                    if (style) {
                      style.split(';').forEach((s: any) => {
                        const [key, value] = s.split(':');
                        if (key && value) {
                          const camelKey = key.trim().replace(/-([a-z])/g, (g: any) => g[1].toUpperCase());
                          (existingStyles as any)[camelKey] = value.trim();
                        }
                      });
                    }

                    return (
                      <img
                        key={src}
                        src={src}
                        alt={alt || "Content image"}
                        className={className}
                        style={{
                          maxWidth: "100%",
                          display: "block",
                          width: width ? `${width}${width.includes('%') ? '' : 'px'}` : (existingStyles.width || "100%"),
                          height: height ? `${height}${height.includes('%') ? '' : 'px'}` : (existingStyles.height || "auto"),
                          ...existingStyles,
                        }}
                        loading="lazy"
                      />
                    );
                  }

                  // Xử lý thẻ iframe (video, embed) để responsive
                  if (domNode.name === "iframe" && domNode.attribs) {
                    return (
                      <div
                        key={domNode.attribs.src}
                        className="iframe-wrapper"
                        style={{
                          position: "relative",
                          paddingBottom: "56.25%",
                          height: 0,
                          overflow: "hidden",
                          margin: "1rem 0"
                        }}
                      >
                        <iframe
                          src={domNode.attribs.src}
                          className={domNode.attribs.class}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                          }}
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                  return domNode;
                },
              })}
            </div>
          </>
          <div id="room" className="">
            <ProductCard />
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}


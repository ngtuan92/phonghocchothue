"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import Image from "next/image";
import useConfigContentByKey from "../hooks/useConfigContentByKey";
import { useSliders } from "@/hooks/api/useSlider";
import RichTextRenderer from "./RichTextRenderer";

import "swiper/css";
import "swiper/css/effect-fade";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

interface SliderItem {
    image: string;
    [key: string]: any;
}

const cleanWatermarkHtml = (html: string | undefined) => {
    if (!html) return "";
    let cleaned = html.replace(/\u00a0/g, " ");
    cleaned = cleaned
        .replace(/<p>&nbsp;<\/p>/gi, "")
        .replace(/<p>\s*<\/p>/gi, "");
    cleaned = cleaned
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, "");
    cleaned = cleaned.replace(/style="([^"]*)"/gi, (match, styleContent) => {
        let cleanStyles = styleContent
            .split(";")
            .filter((style: string) => {
                let s = style.trim().toLowerCase();
                return !(s.startsWith("text-align") ||
                    s.startsWith("padding") ||
                    s.startsWith("margin") ||
                    s.startsWith("line-height") ||
                    s.startsWith("letter-spacing"));
            })
            .join(";");
        return cleanStyles.trim() ? `style="${cleanStyles}"` : "";
    });
    cleaned = cleaned
        .replace(/>(&nbsp;|\s)+/gi, ">")
        .replace(/(&nbsp;|\s)+</gi, "<");
    return cleaned.trim();
};

const cleanHeadingHtml = (html: string | undefined) => {
    if (!html) return "";
    let cleaned = html.replace(/\u00a0/g, " ");
    cleaned = cleaned.replace(/style="([^"]*)"/gi, (match, styleContent) => {
        let cleanStyles = styleContent
            .split(";")
            .filter((style: string) => {
                let s = style.trim().toLowerCase();
                return !(s.startsWith("text-align") || s.startsWith("margin") || s.startsWith("padding"));
            })
            .join(";");
        return cleanStyles.trim() ? `style="${cleanStyles}"` : "";
    });
    cleaned = cleaned.replace(/style='([^']*)'/gi, (match, styleContent) => {
        let cleanStyles = styleContent
            .split(";")
            .filter((style: string) => {
                let s = style.trim().toLowerCase();
                return !(s.startsWith("text-align") || s.startsWith("margin") || s.startsWith("padding"));
            })
            .join(";");
        return cleanStyles.trim() ? `style='${cleanStyles}'` : "";
    });
    cleaned = cleaned
        .replace(/<p>&nbsp;<\/p>/gi, "")
        .replace(/<p>\s*<\/p>/gi, "");
    return cleaned.trim();
};

const Describe = () => {
    const { data: sliderData = [] } = useSliders("gallery");
    const description = useConfigContentByKey("textDecription");
    const describeHeading = useConfigContentByKey("describe-heading");
    const h1Text = useConfigContentByKey("seo-h1-main");
    const bgTitle = useConfigContentByKey("bgTitle");
    const logo = useConfigContentByKey("logo");
    const watermarkText = useConfigContentByKey("describe-bg-text");
    const watermarkHtml = cleanWatermarkHtml(watermarkText);
    const describePhone = useConfigContentByKey("describe-phone");
    const describeQuoteText = useConfigContentByKey("describe-quote-text");
    const describeFrameImage = useConfigContentByKey("describe-frame-image");
    const describeFrameImageRadius = useConfigContentByKey("describe-frame-image", "borderRadius");
    const frameBorderRadius = describeFrameImageRadius ? `${describeFrameImageRadius}px` : '0px';
    const describeFrameImageMobile = useConfigContentByKey("describe-frame-image-mobile");
    const describeFrameImageMobileRadius = useConfigContentByKey("describe-frame-image-mobile", "borderRadius");
    const activeMobileFrameImage = describeFrameImageMobile || describeFrameImage;
    const activeMobileFrameRadius = describeFrameImageMobileRadius ? `${describeFrameImageMobileRadius}px` : frameBorderRadius;
    const gallerySliderRadius = useConfigContentByKey("gallery-slider-radius");
    const galleryRadius = gallerySliderRadius ? `${gallerySliderRadius}px` : '0px';

    const buildUrl = (path: string | undefined) => {
        if (!path) return "";
        return `${URL_API}${path.replace(/\\/g, "/")}`;
    };

    const cleanHeading = (html: string | undefined) => {
        if (!html) return "";
        return html
            .replace(/<img[^>]*>/g, "")
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<\/p><p>/gi, " ")
            .replace(/<p[^>]*>/gi, "")
            .replace(/<\/p>/gi, "");
    };

    const replaceTagName = (html: string | undefined, newTag: string) => {
        if (!html) return "";
        return html
            .replace(/<h1([^>]*)>/gi, `<${newTag}$1>`)
            .replace(/<\/h1>/gi, `</${newTag}>`);
    };

    const normalizeSeoH1Html = (html: string | undefined) => {
        if (!html) return "";
        return html
            .replace(/<img[^>]*>/gi, "")
            .replace(/<\/(h[1-6]|p|div)>\s*<(h[1-6]|p|div)([^>]*)>/gi, "<br>")
            .replace(/<(h[1-6]|p|div)([^>]*)>/gi, "")
            .replace(/<\/(h[1-6]|p|div)>/gi, "")
            .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
            .trim();
    };

    const stripHtml = (html: string | undefined) => {
        if (!html) return "";
        return html
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim();
    };

    return (
        <div className="mb-[64px] sm:mb-36 main-container overflow-x-hidden">
            <div className="describe-stage relative w-full h-[calc(100dvh-60px)] sm:h-[calc(100vh-140px)] 1700px:h-[calc(100vh-170px)] sm:mb-12 md:mb-16 lg:mb-40">
                <div className="hidden sm:flex absolute inset-0 flex-col items-center justify-center z-10 pt-0 pb-0">
                    <div className="describe-anchor describe-anchor-desktop relative w-full max-w-[650px] md:max-w-[850px] lg:max-w-[1140px] flex flex-col items-center -translate-y-[14px] md:-translate-y-[15px] lg:-translate-y-[16px]">
                        {describeFrameImage && (
                            <div
                                className="describe-frame absolute z-[-1] top-[58px] md:top-[70px] lg:top-[82px] h-[238px] md:h-[315px] lg:h-[420px] -left-8 -right-8 md:-left-12 md:-right-12 lg:-left-16 lg:-right-16 overflow-hidden pointer-events-none"
                                style={{ borderRadius: frameBorderRadius }}
                            >
                                <img
                                    src={buildUrl(describeFrameImage)}
                                    alt="Frame"
                                    className="w-full h-full object-contain opacity-100"
                                    style={{ borderRadius: frameBorderRadius, objectPosition: "center top" }}
                                />
                            </div>
                        )}

                        {logo && (
                            <div className="w-[95px] md:w-[120px] lg:w-[150px] h-[95px] md:h-[120px] lg:h-[150px] flex items-center justify-center transition-all duration-700 mb-4 md:mb-6 lg:mb-8">
                                <img
                                    src={buildUrl(logo)}
                                    alt="Logo"
                                    className="w-[76px] md:w-[95px] lg:w-[118px] h-auto object-contain drop-shadow-xl relative z-10 translate-y-[8px]"
                                />
                            </div>
                        )}

                        <div className="describe-title-main-slot relative w-full flex items-center justify-center py-2 md:py-3 lg:py-4">
                            <div className="absolute -top-16 -bottom-16 -left-8 -right-8 md:-left-12 md:-right-12 lg:-left-16 lg:-right-16 mx-auto w-max flex items-center justify-center select-none pointer-events-none z-0 overflow-visible">
                                <RichTextRenderer
                                    html={replaceTagName(watermarkHtml, "div")}
                                    configKey="describe-bg-text"
                                    className="title-bg-text text-[60px] sm:text-[13vw] lg:text-[15vw] leading-none text-[#f8ebdb] flex items-center justify-center transform sm:translate-y-[5px] md:translate-y-[8px] lg:translate-y-[10px]"
                                />
                            </div>

                            <div className="relative z-10 w-full flex justify-center">
                                <RichTextRenderer
                                    html={cleanHeadingHtml(replaceTagName(describeHeading, "div"))}
                                    configKey="describe-heading"
                                    className="title-main-text text-center mx-auto w-max"
                                />
                            </div>
                        </div>

                        <div className="describe-desktop-seo w-full text-center mb-2 md:mb-2 lg:mb-3 md:mt-7 lg:mt-10 relative z-10">
                            <RichTextRenderer
                                html={normalizeSeoH1Html(h1Text)}
                                configKey="seo-h1-main"
                                className="inline-block w-full max-w-[95%] !normal-case [&_*]:!normal-case text-[#563c39] text-center"
                                as="h1"
                            />
                        </div>

                        <div className="describe-desktop-meta w-full flex flex-row justify-between items-center px-16 md:px-24 lg:px-30 relative z-10">
                            <div className="text-lg md:text-[24px] lg:text-[26px] font-bold text-[#563c39] font-wide whitespace-nowrap flex items-center flex-1 min-w-0">
                                <RichTextRenderer
                                    html={describePhone}
                                    configKey="describe-phone"
                                    className="block w-full !tracking-normal [&_*]:!tracking-normal hero-phone-text"
                                    as="div"
                                    preserveNbsp={true}
                                />
                            </div>
                            <div className="flex items-center gap-2 hero-slogan-container flex-1 min-w-0">
                                <RichTextRenderer
                                    html={describeQuoteText}
                                    configKey="describe-quote-text"
                                    className="block w-full [&_*]:m-0 [&_*]:p-0 !tracking-normal [&_*]:!tracking-normal hero-slogan-text"
                                    as="div"
                                    preserveNbsp={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sm:hidden relative z-10 w-full h-full flex flex-col items-center justify-center pt-0 pb-0">
                    <div className="describe-anchor describe-anchor-mobile relative isolate w-full flex flex-col items-center -translate-y-[10px]">
                        {activeMobileFrameImage && (
                            <div
                                className="describe-frame-mobile absolute z-0 top-[38px] aspect-[420/310] left-1/2 transform -translate-x-1/2 w-[calc(100%+4.5rem)] max-w-[420px] overflow-hidden pointer-events-none"
                                style={{ borderRadius: activeMobileFrameRadius }}
                            >
                                <img
                                    src={buildUrl(activeMobileFrameImage)}
                                    alt="Frame"
                                    className="w-full h-full object-contain opacity-100"
                                    style={{ borderRadius: activeMobileFrameRadius, objectPosition: "center top" }}
                                />
                            </div>
                        )}

                        {logo && (
                            <div className="relative z-10 transition-all duration-700 mb-12">
                                <img
                                    src={buildUrl(logo)}
                                    alt="Logo"
                                    className="w-[75px] h-auto object-contain drop-shadow-xl relative z-10"
                                />
                            </div>
                        )}

                        <div className="relative w-full flex items-center justify-center py-0.5 watermark-container-wrapper">
                            <div className="absolute -top-12 -bottom-12 left-0 right-0 w-full flex items-center justify-center select-none pointer-events-none z-0 overflow-visible">
                                <RichTextRenderer
                                    html={replaceTagName(watermarkHtml, "div")}
                                    configKey="describe-bg-text"
                                    className="mobile-watermark-text"
                                />
                            </div>

                            <div className="relative z-10 w-full flex justify-center -translate-y-1">
                                <RichTextRenderer
                                    html={cleanHeadingHtml(replaceTagName(describeHeading, "div"))}
                                    configKey="describe-heading"
                                    className="title-main-text text-center mx-auto w-max transform translate-x-[1px]"
                                />
                            </div>
                        </div>

                        <div className="describe-mobile-seo w-full text-center mt-[14px] mb-0 relative z-10">
                            <RichTextRenderer
                                html={normalizeSeoH1Html(h1Text)}
                                configKey="seo-h1-main"
                                className="inline-block w-auto max-w-[95%] !normal-case [&_*]:!normal-case text-[#563c39] text-center"
                                as="p"
                            />
                        </div>

                        <div className="describe-mobile-meta w-[calc(100%+2.0rem)] flex flex-row justify-between items-center px-0 gap-1 mt-0 relative z-10">
                            <div className="flex-shrink-0 flex items-center describe-mobile-meta-item">
                                <span className="text-[10px] font-bold text-[#563c39] whitespace-nowrap flex items-center">
                                    <RichTextRenderer
                                        html={describePhone}
                                        configKey="describe-phone"
                                        className="inline-block [&_*]:inline [&_*]:m-0 [&_*]:p-0 !tracking-normal [&_*]:!tracking-normal hero-phone-text"
                                        as="span"
                                        preserveNbsp={true}
                                    />
                                </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 hero-slogan-container describe-mobile-meta-item">
                                <RichTextRenderer
                                    html={describeQuoteText}
                                    configKey="describe-quote-text"
                                    className="inline-block [&_*]:inline [&_*]:m-0 [&_*]:p-0 text-[10px] !tracking-normal [&_*]:!tracking-normal hero-slogan-text"
                                    as="span"
                                    preserveNbsp={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto" id="about">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-10 lg:gap-20 items-center mt-0 sm:mt-4 lg:mt-6">
                    <div className="about-copy-column md:col-span-6 flex flex-col items-center md:items-start text-center md:text-left mb-0 md:mb-0">
                        <div className="space-y-3 md:space-y-5 w-full">
                            {bgTitle && (
                                <div className="w-full flex justify-center decoration-image-wrapper">
                                    <Image
                                        src={`${URL_API}${bgTitle.replace(/\\/g, "/")}`}
                                        alt="Decoration"
                                        width={800}
                                        height={240}
                                        className="w-full h-auto object-contain max-w-[200px] md:max-w-[500px]"
                                        quality={100}
                                        priority
                                    />
                                </div>
                            )}

                            {description && (
                                <div className="text-sm md:text-base text-[#323232] raleway font-normal leading-relaxed opacity-90 w-full max-w-3xl describe-description-wrapper text-center md:text-left">
                                    <RichTextRenderer html={description} configKey="textDecription" className="text-center md:text-left" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-6 w-full flex justify-center relative">
                        <div
                            className={`w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-none relative z-10 overflow-hidden ${galleryRadius !== "0px" ? "shadow-sm" : ""
                                }`}
                            style={{ borderRadius: galleryRadius, backgroundColor: "transparent" }}
                        >
                            <Swiper
                                key={`gallery-slider-${sliderData.length}`}
                                modules={[Autoplay, EffectFade]}
                                effect="fade"
                                fadeEffect={{ crossFade: true }}
                                slidesPerView={1}
                                loop={sliderData.length > 1}
                                speed={320}
                                autoplay={
                                    sliderData.length > 1
                                        ? {
                                            delay: 2000,
                                            disableOnInteraction: false,
                                            pauseOnMouseEnter: false,
                                            waitForTransition: false,
                                        }
                                        : false
                                }
                                onSwiper={(swiper) => {
                                    if (sliderData.length <= 1) return;
                                    window.setTimeout(() => {
                                        swiper.update();
                                        swiper.autoplay?.start();
                                    }, 0);
                                }}
                                observer={true}
                                observeParents={true}
                                className="w-full h-full bg-transparent"
                                style={{ borderRadius: galleryRadius, backgroundColor: "transparent" }}
                            >
                                {sliderData.map((fadeImage: SliderItem, index: number) => (
                                    <SwiperSlide key={index} className="bg-transparent" style={{ borderRadius: galleryRadius, backgroundColor: "transparent" }}>
                                      <div className="relative w-full overflow-hidden bg-transparent" style={{ borderRadius: galleryRadius, backgroundColor: "transparent" }}>
                                        <Image
                                            className="w-full h-auto object-contain bg-transparent"
                                            src={encodeURI(`${URL_API.replace(/\/$/, "")}/${fadeImage.image?.replace(/\\/g, "/")}`)}
                                            alt={`Slide ${index + 1}`}
                                            width={1200}
                                            height={625}
                                            sizes="(max-width: 768px) 95vw, 42vw"
                                            quality={85}
                                            priority={index === 0}
                                            loading={index === 0 ? "eager" : "lazy"}
                                            style={{ backgroundColor: "transparent" }}
                                        />
                                      </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Describe;

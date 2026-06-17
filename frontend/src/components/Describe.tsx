"use client";

import { Fade } from "react-slideshow-image";
import Image from "next/image";
import useConfigContentByKey from "../hooks/useConfigContentByKey";
import { useSliders } from "@/hooks/api/useSlider";
import RichTextRenderer from "./RichTextRenderer";

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
    const watermarkHtml = cleanWatermarkHtml(watermarkText) || "HOAHOCTRO";
    const describePhone = useConfigContentByKey("describe-phone");
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

    const stripHtml = (html: string | undefined) => {
        if (!html) return "";
        return html
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim();
    };

    return (
        <div className="mb-[64px] sm:mb-36 main-container overflow-x-hidden">
            <div className="relative w-full h-[calc(100dvh-60px)] sm:h-[calc(100vh-140px)] 1700px:h-[calc(100vh-170px)] sm:mb-12 md:mb-16 lg:mb-40">
                <div className="hidden sm:flex absolute inset-0 flex-col items-center justify-center z-10 pt-0 pb-0">
                    <div className="relative w-full max-w-[650px] md:max-w-[850px] lg:max-w-[1140px] flex flex-col items-center -translate-y-[4px] md:-translate-y-[5px] lg:-translate-y-[6px]">
                        {describeFrameImage && (
                            <div
                                className="absolute z-[-1] top-[58px] md:top-[70px] lg:top-[82px] bottom-[-8px] md:bottom-[-10px] lg:bottom-[-12px] -left-8 -right-8 md:-left-12 md:-right-12 lg:-left-16 lg:-right-16 overflow-hidden pointer-events-none"
                                style={{ borderRadius: frameBorderRadius }}
                            >
                                <img
                                    src={buildUrl(describeFrameImage)}
                                    alt="Frame"
                                    className="w-full h-full object-fill opacity-100"
                                    style={{ borderRadius: frameBorderRadius }}
                                />
                            </div>
                        )}

                        {logo && (
                            <div className="transition-all duration-700 mb-4 md:mb-6 lg:mb-8">
                                <img
                                    src={buildUrl(logo)}
                                    alt="Logo"
                                    className="w-[95px] md:w-[120px] lg:w-[150px] h-auto object-contain drop-shadow-xl relative z-10"
                                />
                            </div>
                        )}

                        <div className="relative w-full flex items-center justify-center py-2 md:py-3 lg:py-4">
                            <div className="absolute -top-16 -bottom-16 -left-8 -right-8 md:-left-12 md:-right-12 lg:-left-16 lg:-right-16 mx-auto w-max flex items-center justify-center opacity-50 select-none pointer-events-none z-0 overflow-visible">
                                <RichTextRenderer
                                    html={replaceTagName(watermarkHtml, "div")}
                                    configKey="describe-bg-text"
                                    className="title-bg-text text-[60px] sm:text-[13vw] lg:text-[15vw] tracking-[-0.05em] leading-none text-[#f8ebdb] uppercase opacity-60 flex items-center justify-center transform -translate-x-[15px] md:-translate-x-[10px] sm:translate-y-[5px] md:translate-y-[8px] lg:translate-y-[10px]"
                                />
                            </div>

                            <div className="relative z-10 w-full flex justify-center">
                                <RichTextRenderer
                                    html={cleanHeadingHtml(replaceTagName(describeHeading, "div"))}
                                    configKey="describe-heading"
                                    className="title-main-text text-center mx-auto w-max transform -translate-x-[13px] md:-translate-x-[8px]"
                                />
                            </div>
                        </div>

                        <div className="w-full text-center mb-2 md:mb-2 lg:mb-3 md:mt-7 lg:mt-10 relative z-10">
                            <h1
                                className="title-sub-text text-[10px] md:text-xs lg:text-[14px] py-0.5 px-4 inline-block w-full max-w-[95%] tracking-[0.1em] md:tracking-[0.4em] uppercase text-[#563c39] text-center transform translate-x-[40px] md:translate-x-[25px]"
                                dangerouslySetInnerHTML={{ __html: replaceTagName(h1Text, "span") }}
                            />
                        </div>

                        <div className="w-full flex flex-row justify-between items-center px-16 md:px-24 lg:px-30 relative z-10">
                            <span className="text-lg md:text-[24px] lg:text-[26px] font-bold tracking-[0.25em] text-[#563c39] font-wide whitespace-nowrap">
                                <RichTextRenderer
                                    html={describePhone}
                                    configKey="describe-phone"
                                    className="inline-block [&_*]:inline hero-phone-text"
                                />
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg md:text-[24px] lg:text-[26px] title-quote-text italic whitespace-nowrap">Teaching room for rent</span>
                                <span className="text-[#563c39] opacity-60 text-lg md:text-xl">♡</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sm:hidden relative z-10 w-full h-full flex flex-col items-center justify-center pt-[20px] pb-[76px]">
                    <div className="relative w-full flex flex-col items-center">
                        {activeMobileFrameImage && (
                            <div
                                className="absolute z-[-1] top-[40px] bottom-[-56px] left-1/2 transform -translate-x-1/2 w-[calc(100%+4.5rem)] sm:max-w-[420px] overflow-hidden pointer-events-none"
                                style={{ borderRadius: activeMobileFrameRadius }}
                            >
                                <img
                                    src={buildUrl(activeMobileFrameImage)}
                                    alt="Frame"
                                    className="w-full h-full object-contain opacity-100"
                                    style={{ borderRadius: activeMobileFrameRadius }}
                                />
                            </div>
                        )}

                        {logo && (
                            <div className="transition-all duration-700 mb-12">
                                <img
                                    src={buildUrl(logo)}
                                    alt="Logo"
                                    className="w-[75px] h-auto object-contain drop-shadow-xl relative z-10"
                                />
                            </div>
                        )}

                        <div className="relative w-full flex items-center justify-center py-0.5 watermark-container-wrapper">
                            <div className="absolute -top-12 -bottom-12 left-0 right-0 w-full flex items-center justify-center opacity-50 select-none pointer-events-none z-0 overflow-visible">
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

                        <div className="w-full text-center mt-[14px] mb-0 relative z-10">
                            <p
                                className="title-sub-text text-[clamp(6px,2.2vw,10px)] pt-1.5 pb-[3px] px-2 inline-block w-auto max-w-[95%] tracking-normal xs:tracking-[0.1em] uppercase text-[#563c39] whitespace-nowrap text-center transform translate-x-[1px] !pl-0 !pr-0"
                                dangerouslySetInnerHTML={{ __html: replaceTagName(h1Text, "span") }}
                            />
                        </div>

                        <div className="w-full flex flex-row justify-between items-center px-0 gap-1 mt-[-2px] relative z-10">
                            <div className="flex-shrink-0">
                                <span className="text-[10px] font-bold tracking-[0.05em] text-[#563c39] font-wide whitespace-nowrap">
                                    <RichTextRenderer
                                        html={describePhone}
                                        configKey="describe-phone"
                                        className="inline-block [&_*]:inline [&_*]:m-0 [&_*]:p-0 hero-phone-text"
                                    />
                                </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[11px] title-quote-text italic whitespace-nowrap">Teaching room for rent</span>
                                <span className="text-[#563c39] opacity-60 text-[10px]">♡</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-10 lg:gap-20 items-center mt-0 sm:mt-4 lg:mt-6">
                    <div className="md:col-span-6 flex flex-col items-center md:items-start text-center md:text-left mb-0 md:mb-0">
                        <div className="space-y-4 md:space-y-5 w-full">
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
                            className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-none relative z-10 overflow-hidden shadow-sm"
                            style={{ borderRadius: galleryRadius }}
                        >
                            <Fade
                                autoplay={true}
                                duration={3000}
                                transitionDuration={800}
                                arrows={false}
                            >
                                {sliderData.map((fadeImage: SliderItem, index: number) => (
                                    <div key={index} className="relative w-full overflow-hidden" style={{ borderRadius: galleryRadius }}>
                                        <Image
                                            className="w-full h-auto object-contain"
                                            src={encodeURI(`${URL_API.replace(/\/$/, "")}/${fadeImage.image?.replace(/\\/g, "/")}`)}
                                            alt={`Slide ${index + 1}`}
                                            width={1200}
                                            height={800}
                                            sizes="(max-width: 768px) 95vw, 58vw"
                                            quality={95}
                                            priority={index === 0}
                                        />
                                    </div>
                                ))}
                            </Fade>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Describe;

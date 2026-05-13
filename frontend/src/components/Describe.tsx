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

const Describe = () => {
    const { data: sliderData = [] } = useSliders("gallery");
    const description = useConfigContentByKey("textDecription");
    const describeHeading = useConfigContentByKey("describe-heading");
    const h1Text = useConfigContentByKey("seo-h1-main");
    const describeH2 = useConfigContentByKey("describe-h2");
    const bgTitle = useConfigContentByKey("bgTitle");
    const logo = useConfigContentByKey("logo");
    const watermarkText = useConfigContentByKey("describe-bg-text");
    const describePhone = useConfigContentByKey("describe-phone");

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

    return (
        <div className="mb-32 sm:mb-20 main-container overflow-x-hidden">
            <div className="relative w-full h-screen sm:h-[85vh] md:h-[90vh] lg:h-[92vh]">
                <div className="absolute inset-0 hidden sm:flex items-center justify-center pointer-events-none select-none z-0 -translate-y-8 lg:-translate-y-12">
                    <RichTextRenderer
                        html={watermarkText || "HOAHOCTRO"}
                        className="title-bg-text text-[60px] sm:text-[18vw] lg:text-[20vw] tracking-[-0.02em] leading-none text-[#f8ebdb] uppercase opacity-60 flex items-center justify-center"
                    />
                </div>

                <div className="hidden sm:flex absolute inset-0 flex-col items-center justify-between pt-2 lg:pt-4 pb-20 lg:pb-32 z-10">
                    {logo && (
                        <div className="transition-all duration-700">
                            <img
                                src={buildUrl(logo)}
                                alt="Logo"
                                className="w-[60px] md:w-[90px] lg:w-[110px] h-auto object-contain drop-shadow-xl"
                            />
                        </div>
                    )}

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+32px)] lg:-translate-y-[calc(50%+48px)] w-full">
                        <RichTextRenderer
                            html={describeHeading}
                            className="title-main-text text-center"
                        />
                    </div>

                    <div className="w-full flex flex-col items-center gap-2 lg:gap-3 mb-2 lg:mb-4">
                        <div className="title-sub-text text-[10px] md:text-xs lg:text-[14px] border-t border-b border-[#563c39]/10 py-1.5 px-4 inline-block w-full max-w-[95%] md:max-w-[1100px] tracking-[0.1em] md:tracking-[0.4em] uppercase text-[#563c39] text-center">
                            <RichTextRenderer
                                html={h1Text}
                                className="text-center"
                            />
                        </div>

                        <div className="w-full max-w-[1100px] flex flex-row justify-between items-center px-16">
                            <span className="text-lg md:text-[24px] lg:text-[26px] font-bold tracking-[0.25em] text-[#563c39] font-wide whitespace-nowrap">
                                <RichTextRenderer
                                    html={describePhone}
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

                <div className="sm:hidden relative z-10 w-full h-full flex flex-col items-center justify-center pt-4 pb-4">
                    {logo && (
                        <div className="transition-all duration-700 mb-10">
                            <img
                                src={buildUrl(logo)}
                                alt="Logo"
                                className="w-[90px] h-auto object-contain drop-shadow-xl"
                            />
                        </div>
                    )}

                    <div className="relative w-full flex items-center justify-center py-2">
                        <div className="absolute inset-0 flex items-center justify-center opacity-50 select-none pointer-events-none">
                            <RichTextRenderer
                                html={watermarkText || "HOAHOCTRO"}
                                className="mobile-watermark-text"
                            />
                        </div>

                        <div className="relative z-10 -translate-y-1">
                            <RichTextRenderer
                                html={describeHeading}
                                className="title-main-text text-center"
                            />
                        </div>
                    </div>

                    <div className="w-full text-center mb-2">
                        <div className="title-sub-text text-[clamp(7px,2.4vw,11px)] border-t border-b border-[#563c39]/10 py-1.5 px-2 inline-block w-auto max-w-[95%] tracking-normal xs:tracking-[0.1em] uppercase text-[#563c39] whitespace-nowrap">
                            <RichTextRenderer
                                html={h1Text}
                                className="text-center"
                            />
                        </div>
                    </div>

                    <div className="w-full flex flex-row justify-between items-center px-2 gap-1 mt-0">
                        <div className="flex-shrink-0">
                            <span className="text-[12px] font-bold tracking-[0.05em] text-[#563c39] font-wide whitespace-nowrap">
                                <RichTextRenderer
                                    html={describePhone}
                                    className="inline-block [&_*]:inline [&_*]:m-0 [&_*]:p-0 hero-phone-text"
                                />
                            </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[12px] title-quote-text italic whitespace-nowrap">Teaching room for rent</span>
                            <span className="text-[#563c39] opacity-60 text-[11px]">♡</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-20 items-center md:px-0 mt-2 sm:mt-10 lg:mt-16">
                <div className="md:col-span-6 flex flex-col items-center md:items-start text-center md:text-left">
                    {bgTitle && (
                        <div className="w-full mb-2 flex justify-center md:pl-5 decoration-image-wrapper">
                            <Image
                                src={`${URL_API}${bgTitle.replace(/\\/g, "/")}`}
                                alt="Decoration"
                                width={800}
                                height={240}
                                className="w-full h-auto object-contain max-w-[380px] md:max-w-none"
                                quality={100}
                                priority
                            />
                        </div>
                    )}

                    {describeH2 && (
                        <div className="w-full mb-8 describe-h2-wrapper">
                            <RichTextRenderer
                                html={describeH2}
                                className="mx-auto text-center md:text-left"
                            />
                        </div>
                    )}

                    {description && (
                        <div className="text-sm md:text-base text-[#323232] raleway font-normal leading-relaxed opacity-90 w-full max-w-3xl describe-description-wrapper text-center md:text-left">
                            <RichTextRenderer html={description} className="text-center md:text-left" />
                        </div>
                    )}
                </div>

                <div className="md:col-span-6 w-full flex justify-center relative">
                    <div className="w-full max-w-[700px] md:max-w-none relative z-10">
                        <Fade
                            autoplay={true}
                            duration={3000}
                            transitionDuration={800}
                            arrows={false}
                        >
                            {sliderData.map((fadeImage: SliderItem, index: number) => (
                                <div key={index} className="relative w-full overflow-hidden rounded-[10px] shadow-sm">
                                    <Image
                                        className="w-full h-auto object-contain"
                                        src={encodeURI(`${URL_API.replace(/\/$/, "")}/${fadeImage.image?.replace(/\\/g, "/")}`)}
                                        alt={`Slide ${index + 1}`}
                                        width={1200}
                                        height={800}
                                        sizes="(max-width: 768px) 100vw, 45vw"
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
    );
};

export default Describe;

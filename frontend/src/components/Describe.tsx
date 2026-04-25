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
    const { data: sliderData = [] } = useSliders();
    const description = useConfigContentByKey("textDecription");
    const describeHeading = useConfigContentByKey("describe-heading");
    const h1Text = useConfigContentByKey("seo-h1-main");
    const describeH2 = useConfigContentByKey("describe-h2");
    const bgTitle = useConfigContentByKey("bgTitle");
    const logo = useConfigContentByKey("logo");

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
        <div className="mb-12 sm:mb-20 px-4 sm:px-10 lg:px-[90px]">
            <div className="relative w-full h-[calc(100vh-130px)] min-h-[450px] max-h-[850px] flex flex-col justify-between items-center py-4 lg:py-6 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                    <span className="title-bg-text text-[24vw] lg:text-[20vw] tracking-[-0.02em] leading-none text-[#f8ebdb] font-black uppercase opacity-60">
                        HOAHOCTRO
                    </span>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-center px-4 z-10">
                    <RichTextRenderer
                        html={describeHeading}
                        className="title-main-text text-center"
                    />
                </div>

                <div className="relative z-10 w-full flex justify-center">
                    {logo && (
                        <div className="transition-all duration-700">
                            <img
                                src={buildUrl(logo)}
                                alt="Logo"
                                className="w-[60px] md:w-[90px] lg:w-[110px] h-auto object-contain drop-shadow-xl"
                            />
                        </div>
                    )}
                </div>

                <div className="relative z-10 w-full flex flex-col items-center gap-4 lg:gap-5 mb-[4vh] lg:mb-[6vh]">
                    <div className="w-full text-center">
                        <div className="title-sub-text text-[10px] md:text-xs lg:text-[14px] border-t border-b border-[#563c39]/10 py-2 px-6 inline-block w-full max-w-[95%] md:max-w-[1100px] tracking-[0.2em] md:tracking-[0.4em] uppercase font-bold text-[#563c39]">
                            <RichTextRenderer
                                html={h1Text}
                                className="text-center"
                            />
                        </div>
                    </div>

                    <div className="w-full max-w-[95%] md:max-w-[1100px] flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 px-4 md:px-16">
                        <span className="text-sm md:text-lg lg:text-[20px] font-bold tracking-[0.15em] md:tracking-[0.25em] text-[#563c39] font-wide whitespace-nowrap">
                            0931 939 120
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs md:text-xl lg:text-[22px] title-quote-text italic whitespace-nowrap">Teaching room for rent</span>
                            <span className="text-[#563c39] opacity-60 text-sm md:text-xl">♡</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-20 items-center px-4 md:px-0 mt-10 lg:mt-16">
                <div className="md:col-span-6 flex flex-col items-center md:items-start text-center md:text-left">
                    {bgTitle && (
                        <div className="w-full -mb-3 flex justify-center md:justify-start">
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
                        <div className="w-full mb-6">
                            <RichTextRenderer
                                html={describeH2}
                                className="mx-auto md:mx-0"
                            />
                        </div>
                    )}

                    {description && (
                        <div className="text-sm md:text-base text-[#323232] raleway font-normal leading-relaxed opacity-90 w-full max-w-2xl">
                            <RichTextRenderer html={description} />
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
                                <div key={index} className="relative w-full">
                                    <Image
                                        className="w-full h-auto object-contain"
                                        src={encodeURI(`${URL_API.replace(/\/$/, "")}/${fadeImage.image?.replace(/\\/g, "/")}`)}
                                        alt={`Slide ${index + 1}`}
                                        width={1200}
                                        height={1200}
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

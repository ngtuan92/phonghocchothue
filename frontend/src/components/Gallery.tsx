"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import Image from "next/image";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import { useSliders } from "@/hooks/api/useSlider";
import RichTextRenderer from "./RichTextRenderer";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/effect-fade";
import "swiper/css/pagination";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Gallery: React.FC = () => {
  const galleryHeading = useConfigContentByKey("gallery-heading");
  const describeH2 = useConfigContentByKey("describe-h2");
  const { data: sliderData = [] } = useSliders("spaces");

  if (sliderData.length === 0) return null;

  return (
    <section id="gallery" className="w-full flex flex-col items-center justify-center bg-[#fdf8e9] overflow-hidden py-8 sm:py-14">
      <div className="w-full main-container flex flex-col items-center h-full max-w-[1400px]">

        {describeH2 && (
          <div className="mb-4 sm:mb-6 text-center w-full describe-h2-wrapper">
            <RichTextRenderer
              html={describeH2}
              className="text-center text-[#563c39]"
            />
          </div>
        )}

        <div className="mb-8 sm:mb-14 text-center w-full describe-h2-wrapper">
          <RichTextRenderer
            html={galleryHeading}
            className="text-center text-[#563c39]"
          />
        </div>

        <div className="relative group/gallery w-full max-w-[1000px] mx-auto">
          <Swiper
            modules={[Navigation, Autoplay, EffectFade]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            speed={1000}
            spaceBetween={0}
            slidesPerView={1}
            loop={true}
            navigation={{
              nextEl: ".gallery-next",
              prevEl: ".gallery-prev",
            }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            className="w-full gallery-swiper rounded-[12px] shadow-xl overflow-hidden border border-white/50"
          >
            {sliderData.map((item: any, index: number) => (
              <SwiperSlide key={index}>
                <div className="relative aspect-[16/9] sm:aspect-[16/8] w-full bg-white">
                  <Image
                    src={`${URL_API}${item.image.replace(/\\/g, "/")}`}
                    alt={`Ảnh không gian ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1100px) 100vw, 1100px"
                    quality={95}
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-black/5"></div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Buttons - Hidden on Mobile, Visible on Desktop */}
          <div className="gallery-prev swiper-button-prev-custom hidden md:flex !-left-12 lg:!-left-20 !z-20 shadow-md">
            <Image
              className="w-full h-full rounded-[50%]"
              src="/assets/images/pre-new.jpg"
              alt="pre"
              fill
              sizes="50px"
            />
          </div>
          <div className="gallery-next swiper-button-next-custom hidden md:flex !-right-12 lg:!-right-20 !z-20 shadow-md">
            <Image
              className="w-full h-full rounded-[50%]"
              src="/assets/images/next-new.jpg"
              alt="next"
              fill
              sizes="50px"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Gallery;

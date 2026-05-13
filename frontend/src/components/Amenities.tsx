"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Navigation } from "swiper/modules";
import Image from "next/image";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";
import { useSliders } from "@/hooks/api/useSlider";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Amenities: React.FC = () => {
  const amenitiesHeading = useConfigContentByKey("amenities-content");
  const amenitiesDescription = useConfigContentByKey("amenities-description");
  const { data: sliderData = [] } = useSliders("services");

  if (!amenitiesHeading && !amenitiesDescription) return null;

  const renderSlider = (data: any[], keyPrefix: string) => {
    if (data.length === 0) {
      return (
        <div className="w-full h-full bg-gray-50 rounded-[12px] flex items-center justify-center border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-medium italic">Tiện ích đang được cập nhật...</p>
        </div>
      );
    }

    return (
      <div className="relative w-full aspect-[16/10] group shadow-sm border border-[#799f851a] rounded-[10px] overflow-hidden">
        <Swiper
          modules={[Autoplay, EffectFade, Navigation]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
          slidesPerView={1}
          loop={true}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          className="w-full h-full bg-gray-50"
        >
          {data.map((item: any, index: number) => (
            <SwiperSlide key={`${keyPrefix}-${index}`}>
              <div className="relative w-full h-full overflow-hidden">
                <img
                  src={`${URL_API}${item.image.replace(/\\/g, "/")}`}
                  alt={`Tiện ích ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 block"
                  loading={index === 0 ? "eager" : "lazy"}
                />
                <div className="absolute inset-0 z-20 bg-black/5 pointer-events-none" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    );
  };

  return (
    <section id="amenities" className="mt-18 lg:mt-16 mb-12 sm:mb-24 overflow-hidden">
      <div className="container mx-auto main-container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-20 items-center">

          <div className="md:col-span-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="space-y-5 md:space-y-8 w-full">
              <div className="describe-h2-wrapper">
                <RichTextRenderer
                  html={amenitiesHeading}
                  className="text-[#563c39] mx-auto md:mx-0"
                  fallback={
                    <h2 className="text-sm sm:text-lg lg:text-4xl font-bold text-[#563c39]">
                      Đầy đủ các tiện nghi sẵn sàng cho mỗi buổi học
                    </h2>
                  }
                />
              </div>

              {/* Slider cho Mobile - Nằm giữa H2 và Text */}
              <div className="block lg:hidden w-full relative">
                {renderSlider(sliderData, "mobile")}
              </div>

              {amenitiesDescription && (
                <div className="prose prose-sm sm:prose-lg max-w-3xl describe-description-wrapper mx-auto md:mx-0">
                  <RichTextRenderer html={amenitiesDescription} className="text-center md:text-left" />
                </div>
              )}
            </div>
          </div>

          {/* Slider cho Desktop - Nằm bên phải */}
          <div className="hidden md:block md:col-span-6 w-full relative">
            {renderSlider(sliderData, "desktop")}
          </div>

        </div>
      </div>
    </section>
  );
};

export default Amenities;

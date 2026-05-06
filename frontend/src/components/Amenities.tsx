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
      <div className="relative w-full h-full group shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-[#799f851a] rounded-[12px] overflow-hidden">
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
    <section id="amenities" className="my-8 sm:my-24 md:my-32 overflow-hidden">
      <div className="container mx-auto main-container">
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-16">

          <div className="w-full lg:w-[58%]">
            <div className="space-y-6">
              <div className="describe-h2-wrapper">
                <RichTextRenderer
                  html={amenitiesHeading}
                  className="text-[#563c39]"
                  fallback={
                    <h2 className="text-sm sm:text-lg lg:text-4xl font-bold text-[#563c39]">
                      Đầy đủ các tiện nghi sẵn sàng cho mỗi buổi học
                    </h2>
                  }
                />
              </div>

              {/* Slider cho Mobile - Nằm giữa H2 và Text */}
              <div className="block lg:hidden w-full relative h-[210px] sm:h-[280px]">
                {renderSlider(sliderData, "mobile")}
              </div>

              {amenitiesDescription && (
                <div className="prose prose-sm sm:prose-lg max-w-none">
                  <RichTextRenderer html={amenitiesDescription} />
                </div>
              )}
            </div>
          </div>

          {/* Slider cho Desktop - Nằm bên phải */}
          <div className="hidden lg:block w-full lg:w-[42%] relative lg:h-[260px] xl:h-[300px]">
            {renderSlider(sliderData, "desktop")}
          </div>

        </div>
      </div>
    </section>
  );
};

export default Amenities;

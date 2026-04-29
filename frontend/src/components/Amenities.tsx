"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import Image from "next/image";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";
import { useSliders } from "@/hooks/api/useSlider";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import "swiper/css/pagination";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Amenities: React.FC = () => {
  const amenitiesHeading = useConfigContentByKey("amenities-content");
  const amenitiesDescription = useConfigContentByKey("amenities-description");
  const { data: sliderData = [] } = useSliders("services");

  if (!amenitiesHeading && !amenitiesDescription) return null;

  return (
    <section id="amenities" className="my-12 sm:my-24 md:my-32 overflow-hidden">
      <div className="container mx-auto px-6 sm:px-[60px] lg:px-[90px]">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left Column: Text Content */}
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <div className="space-y-6">
              <RichTextRenderer
                html={amenitiesHeading}
                className="text-[#563c39]"
                fallback={
                  <h2 className="text-3xl sm:text-4xl font-bold text-[#563c39]">
                    Đầy đủ các tiện nghi sẵn sàng cho mỗi buổi học
                  </h2>
                }
              />

              {amenitiesDescription && (
                <div className="prose prose-lg max-w-none">
                  <RichTextRenderer html={amenitiesDescription} />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Image Slider */}
          <div className="w-full lg:w-1/2 order-1 lg:order-2 aspect-video lg:aspect-[4/3] xl:aspect-video relative">
            {sliderData.length > 0 ? (
              <Swiper
                modules={[Autoplay, EffectFade, Navigation, Pagination]}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                slidesPerView={1}
                loop={true}
                autoplay={{
                  delay: 4000,
                  disableOnInteraction: false,
                }}
                pagination={{
                  clickable: true,
                  bulletActiveClass: "amenities-bullet-active",
                  bulletClass: "swiper-pagination-bullet amenities-bullet",
                }}
                className="w-full h-full rounded-[40px] shadow-2xl shadow-black/10"
              >
                {sliderData.map((item: any, index: number) => (
                  <SwiperSlide key={index}>
                    <div className="relative w-full h-full group">
                      <Image
                        src={`${URL_API}${item.image.replace(/\\/g, "/")}`}
                        alt={`Tiện ích ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        quality={90}
                        priority={index === 0}
                      />
                      {/* Subtle overlay for depth */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-[40px] flex items-center justify-center border-2 border-dashed border-gray-200">
                 <p className="text-gray-400 font-medium italic">Tiện ích đang được cập nhật...</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

export default Amenities;

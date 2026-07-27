"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Navigation } from "swiper/modules";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";
import { useSliders } from "@/hooks/api/useSlider";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

type AmenitySlide = {
  image?: string;
};

const AmenitySlider: React.FC<{ data: AmenitySlide[]; keyPrefix: string; borderRadius: string }> = ({
  data,
  keyPrefix,
  borderRadius,
}) => {
  if (data.length === 0) {
    return null;
  }

  const hasBorder = borderRadius !== "0px";

  return (
    <div
      className={`relative w-full aspect-[16/10] group overflow-hidden transition-all duration-300 ${
        hasBorder ? "border border-[#799f851a]" : "border-0"
      }`}
      style={{ borderRadius, backgroundColor: "transparent" }}
    >
      <Swiper
        modules={[Autoplay, EffectFade, Navigation]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        slidesPerView={1}
        loop={data.length > 1}
        autoplay={
          data.length > 1
            ? {
                delay: 4000,
                disableOnInteraction: false,
              }
            : false
        }
        className="w-full h-full bg-transparent"
        style={{ backgroundColor: "transparent" }}
      >
        {data.map((item, index) => {
          const imagePath = item.image?.replace(/\\/g, "/");

          if (!imagePath) {
            return null;
          }

          return (
            <SwiperSlide key={`${keyPrefix}-${index}`} className="bg-transparent" style={{ backgroundColor: "transparent" }}>
              <div className="relative w-full h-full overflow-hidden bg-transparent" style={{ borderRadius }}>
                <img
                  src={`${URL_API}${imagePath}`}
                  alt={`Tien ich ${index + 1}`}
                  className="w-full h-full object-cover block bg-transparent"
                  style={{ borderRadius, backgroundColor: "transparent" }}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

const Amenities: React.FC = () => {
  const amenitiesHeading = useConfigContentByKey("amenities-content");
  const amenitiesDescription = useConfigContentByKey("amenities-description");
  const amenitiesSliderRadius = useConfigContentByKey("amenities-slider-radius");
  const { data: sliderData = [] } = useSliders("services");

  if (!amenitiesHeading && !amenitiesDescription) return null;

  const sliderRadius = amenitiesSliderRadius ? `${amenitiesSliderRadius}px` : "0px";

  const renderSlider = (data: AmenitySlide[], keyPrefix: string) => {
    return <AmenitySlider data={data} keyPrefix={keyPrefix} borderRadius={sliderRadius} />;
  };

  return (
    <section id="amenities" className="mt-[54px] sm:mt-36 lg:mt-36 mb-[44px] sm:mb-20 overflow-hidden">
      <div className="container mx-auto main-container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-20 items-center">
          <div className="md:col-span-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="space-y-4 md:space-y-5 w-full">
              <div className="describe-h2-wrapper">
                <RichTextRenderer
                  html={amenitiesHeading}
                  configKey="amenities-content"
                  className="text-[#563c39] mx-auto md:mx-0"
                />
              </div>

              <div className="block md:hidden w-full relative">{renderSlider(sliderData, "mobile")}</div>

              {amenitiesDescription && (
                <div className="prose prose-sm sm:prose-lg max-w-3xl describe-description-wrapper mx-auto md:mx-0">
                  <RichTextRenderer
                    html={amenitiesDescription}
                    configKey="amenities-description"
                    className="text-center md:text-left"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:block md:col-span-6 w-full relative">{renderSlider(sliderData, "desktop")}</div>
        </div>
      </div>
    </section>
  );
};

export default Amenities;

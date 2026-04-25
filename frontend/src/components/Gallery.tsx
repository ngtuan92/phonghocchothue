"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import Image from "next/image";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import { useSliders } from "@/hooks/api/useSlider";
import RichTextRenderer from "./RichTextRenderer";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Gallery: React.FC = () => {
  const galleryHeading = useConfigContentByKey("gallery-heading");
  const { data: sliderData = [] } = useSliders();

  if (sliderData.length === 0) return null;

  return (
    <section id="gallery" className="my-10 sm:my-36">
      <div className="container mx-auto px-6 sm:px-[60px] lg:px-[90px] mb-8">
        <RichTextRenderer
          html={galleryHeading}
          className="text-center text-[#563c39]"
          fallback={
            <h2 className="text-center text-5xl sm:text-7xl text-[#563c39] font-cursive">
              Không gian phòng học qua từng khung hình
            </h2>
          }
        />
      </div>

      <div className="w-full h-[300px] sm:h-[600px] relative group/gallery">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={0}
          slidesPerView={1}
          navigation={{
            nextEl: ".gallery-next",
            prevEl: ".gallery-prev",
          }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          loop={true}
          className="w-full h-full gallery-swiper"
        >
          {sliderData.map((item: any, index: number) => (
            <SwiperSlide key={index}>
              <div className="relative w-full h-full">
                <Image
                  src={`${URL_API}${item.image.replace(/\\/g, "/")}`}
                  alt={`Ảnh không gian ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  quality={90}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="gallery-prev swiper-button-prev-custom !left-4 sm:!left-10 lg:!left-14">
          <Image
            className="w-full h-full rounded-[50%]"
            src="/assets/images/pre-new.jpg"
            alt="pre"
            fill
            sizes="50px"
          />
        </div>
        <div className="gallery-next swiper-button-next-custom !right-4 sm:!right-10 lg:!right-14">
          <Image
            className="w-full h-full rounded-[50%]"
            src="/assets/images/next-new.jpg"
            alt="next"
            fill
            sizes="50px"
          />
        </div>
      </div>
    </section>
  );
};

export default Gallery;

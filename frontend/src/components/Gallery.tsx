"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, Grid } from "swiper/modules";
import Image from "next/image";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import { useSliders } from "@/hooks/api/useSlider";
import RichTextRenderer from "./RichTextRenderer";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/grid";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Gallery: React.FC = () => {
  const describeH2 = useConfigContentByKey("describe-h2");
  const describeH2Image = useConfigContentByKey("describe-h2-image");
  const describeH2ImageRadius = useConfigContentByKey("describe-h2-image", "borderRadius");
  const imageBorderRadius = describeH2ImageRadius ? `${describeH2ImageRadius}px` : "0px";

  const describeH2ImageMobile = useConfigContentByKey("describe-h2-image-mobile");
  const describeH2ImageMobileRadius = useConfigContentByKey("describe-h2-image-mobile", "borderRadius");
  const mobileImageBorderRadius = describeH2ImageMobileRadius ? `${describeH2ImageMobileRadius}px` : imageBorderRadius;

  const galleryHeading = useConfigContentByKey("gallery-heading");
  const gallerySliderRadius = useConfigContentByKey("gallery-slider-radius");
  const galleryRadius = gallerySliderRadius ? `${gallerySliderRadius}px` : "0px";
  const { data: sliderData = [] } = useSliders("spaces");

  const desktopSwiperRef = React.useRef<any>(null);

  const handleDesktopPrev = () => {
    if (desktopSwiperRef.current) {
      const swiper = desktopSwiperRef.current;
      if (swiper.isBeginning) {
        swiper.slideTo(swiper.slides.length - 1);
      } else {
        swiper.slidePrev();
      }
    }
  };

  const handleDesktopNext = () => {
    if (desktopSwiperRef.current) {
      const swiper = desktopSwiperRef.current;
      if (swiper.isEnd) {
        swiper.slideTo(0);
      } else {
        swiper.slideNext();
      }
    }
  };

  const buildUrl = (path: string | undefined) => {
    if (!path) return "";
    return `${URL_API}${path.replace(/\\/g, "/")}`;
  };

  const hasDescribeSection = !!(describeH2 || describeH2Image || describeH2ImageMobile);
  const hasSpacesSection = sliderData.length > 0;

  if (!hasDescribeSection && !hasSpacesSection) return null;

  return (
    <section id="gallery" className="w-full flex flex-col items-center justify-center bg-[#fdf8e9] overflow-hidden pt-[16px] pb-0 sm:pt-12 lg:pt-16 sm:pb-12 lg:pb-16 scroll-mt-20">
      <div className="w-full main-container flex flex-col items-center h-full max-w-[1200px] px-4 md:px-0">

        {hasDescribeSection && (
          <div className="w-full flex flex-col items-center">
            {describeH2 && (
              <div className="describe-h2-wrapper w-full max-w-none text-center mb-0 md:mb-3">
                <RichTextRenderer
                  html={describeH2}
                  configKey="describe-h2"
                  className="text-center text-[#563c39]"
                />
              </div>
            )}

            {(describeH2Image || describeH2ImageMobile) && (
              <div className="w-full mt-0">
                {/* Desktop Image */}
                {describeH2Image && (
                  <div
                    className={`relative w-full max-w-[1100px] mx-auto hidden md:block overflow-hidden transition-all duration-300 ${
                      imageBorderRadius !== "0px" ? "border border-[#799f851a]" : "border-0"
                    }`}
                    style={{ borderRadius: imageBorderRadius, aspectRatio: "1100 / 405", backgroundColor: "transparent" }}
                  >
                    <img
                      src={buildUrl(describeH2Image)}
                      alt="Ảnh Giải pháp tiện ích dịch vụ phòng học (Desktop)"
                      className="absolute inset-0 w-full h-full object-cover block"
                      style={{ borderRadius: imageBorderRadius, backgroundColor: "transparent" }}
                    />
                  </div>
                )}

                {/* Mobile Image */}
                {(describeH2ImageMobile || describeH2Image) && (
                  <div
                    className={`relative w-full mx-auto block md:hidden overflow-hidden transition-all duration-300 ${
                      mobileImageBorderRadius !== "0px" ? "border border-[#799f851a]" : "border-0"
                    }`}
                    style={{ borderRadius: mobileImageBorderRadius, aspectRatio: "2 / 1", backgroundColor: "transparent" }}
                  >
                    <img
                      src={buildUrl(describeH2ImageMobile || describeH2Image)}
                      alt="Ảnh Giải pháp tiện ích dịch vụ phòng học (Mobile)"
                      className="absolute inset-0 w-full h-full object-cover block"
                      style={{ borderRadius: mobileImageBorderRadius, backgroundColor: "transparent" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {hasSpacesSection && (
          <div className="w-full max-w-[1100px] flex flex-col items-center mt-[68px] sm:mt-36 lg:mt-36 mx-auto">
            <div className="mb-2 sm:mb-4 text-center w-full">
              <RichTextRenderer
                html={galleryHeading}
                configKey="gallery-heading"
                className="text-center text-[#563c39]"
              />
            </div>

            <div className="relative group/gallery w-full md:px-10 lg:px-0 aspect-[3/2] lg:aspect-[1100/491]">
              <div className="w-full h-full hidden lg:block">
                <Swiper
                  modules={[Navigation, Pagination, Autoplay, Grid]}
                  grid={{
                    rows: 2,
                    fill: "row",
                  }}
                  spaceBetween={20}
                  slidesPerView={3}
                  slidesPerGroup={3}
                  onSwiper={(swiper) => {
                    desktopSwiperRef.current = swiper;
                  }}
                  autoplay={{ delay: 6000, disableOnInteraction: false }}
                  loop={false}
                  observer={true}
                  observeParents={true}
                  className="w-full h-full gallery-swiper bg-transparent"
                  style={{ backgroundColor: "transparent" }}
                >
                  {sliderData.map((item: any, index: number) => {
                    const hasSpacesBorder = galleryRadius !== "0px" || mobileImageBorderRadius !== "0px";
                    return (
                      <SwiperSlide key={`desktop-${index}`} className="h-full lg:!h-[calc((100%-20px)/2)] bg-transparent" style={{ backgroundColor: "transparent" }}>
                        <div
                          className={`relative w-full h-full overflow-hidden group/item transition-all duration-300 md:duration-500 gallery-swiper-slide-container ${
                            hasSpacesBorder ? "border border-[#799f851a] md:border-2 md:border-white/50" : "border-0"
                          }`}
                          style={{
                            ['--mobile-radius' as any]: mobileImageBorderRadius,
                            ['--desktop-radius' as any]: galleryRadius,
                            backgroundColor: "transparent",
                          }}
                        >
                          <Image
                            src={`${URL_API}${item.image.replace(/\\/g, "/")}`}
                            alt={`Ảnh không gian ${index + 1}`}
                            fill
                            className="object-cover bg-transparent"
                            sizes="33vw"
                            quality={90}
                            style={{ backgroundColor: "transparent" }}
                          />
                        </div>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>

              {/* Mobile/Tablet Swiper */}
              <div className="w-full h-full block lg:hidden">
                <Swiper
                  modules={[Navigation, Pagination, Autoplay]}
                  spaceBetween={20}
                  slidesPerView={1}
                  slidesPerGroup={1}
                  navigation={{
                    nextEl: ".gallery-mobile-next",
                    prevEl: ".gallery-mobile-prev",
                  }}
                  autoplay={{ delay: 6000, disableOnInteraction: false }}
                  loop={true}
                  observer={true}
                  observeParents={true}
                  className="w-full h-full gallery-swiper bg-transparent"
                  style={{ backgroundColor: "transparent" }}
                >
                  {sliderData.map((item: any, index: number) => {
                    const hasSpacesBorder = galleryRadius !== "0px" || mobileImageBorderRadius !== "0px";
                    return (
                      <SwiperSlide key={`mobile-${index}`} className="h-full bg-transparent" style={{ backgroundColor: "transparent" }}>
                        <div
                          className={`relative w-full h-full overflow-hidden group/item transition-all duration-300 md:duration-500 gallery-swiper-slide-container ${
                            hasSpacesBorder ? "border border-[#799f851a] md:border-2 md:border-white/50" : "border-0"
                          }`}
                          style={{
                            ['--mobile-radius' as any]: mobileImageBorderRadius,
                            ['--desktop-radius' as any]: galleryRadius,
                            backgroundColor: "transparent",
                          }}
                        >
                          <Image
                            src={`${URL_API}${item.image.replace(/\\/g, "/")}`}
                            alt={`Ảnh không gian ${index + 1}`}
                            fill
                            className="object-cover bg-transparent"
                            sizes="(max-width: 1024px) 100vw"
                            quality={90}
                            style={{ backgroundColor: "transparent" }}
                          />
                        </div>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>

              {/* Desktop Navigation Buttons */}
              <div 
                className="gallery-desktop-prev swiper-button-prev-custom hidden lg:flex !z-20"
                style={{ left: "-45px" }}
                onClick={handleDesktopPrev}
              >
                <Image
                  className="w-full h-full rounded-[50%]"
                  src="/assets/images/pre-new.jpg"
                  alt="pre"
                  fill
                  sizes="50px"
                />
              </div>
              <div 
                className="gallery-desktop-next swiper-button-next-custom hidden lg:flex !z-20"
                style={{ right: "-45px" }}
                onClick={handleDesktopNext}
              >
                <Image
                  className="w-full h-full rounded-[50%]"
                  src="/assets/images/next-new.jpg"
                  alt="next"
                  fill
                  sizes="50px"
                />
              </div>

              {/* Mobile/Tablet Navigation Buttons */}
              <div 
                className="gallery-mobile-prev swiper-button-prev-custom hidden md:flex lg:hidden !z-20"
                style={{ left: "5px" }}
              >
                <Image
                  className="w-full h-full rounded-[50%]"
                  src="/assets/images/pre-new.jpg"
                  alt="pre"
                  fill
                  sizes="50px"
                />
              </div>
              <div 
                className="gallery-mobile-next swiper-button-next-custom hidden md:flex lg:hidden !z-20"
                style={{ right: "5px" }}
              >
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
        )}

      </div>
    </section>
  );
};

export default Gallery;

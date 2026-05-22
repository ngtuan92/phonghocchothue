"use client";

import React from "react";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Gallery: React.FC = () => {
  const describeH2 = useConfigContentByKey("describe-h2");
  const describeH2Image = useConfigContentByKey("describe-h2-image");
  const describeH2ImageRadius = useConfigContentByKey("describe-h2-image", "borderRadius");
  const imageBorderRadius = describeH2ImageRadius ? `${describeH2ImageRadius}px` : '0px';

  const describeH2ImageMobile = useConfigContentByKey("describe-h2-image-mobile");
  const describeH2ImageMobileRadius = useConfigContentByKey("describe-h2-image-mobile", "borderRadius");
  const mobileImageBorderRadius = describeH2ImageMobileRadius ? `${describeH2ImageMobileRadius}px` : imageBorderRadius;

  const buildUrl = (path: string | undefined) => {
    if (!path) return "";
    return `${URL_API}${path.replace(/\\/g, "/")}`;
  };

  if (!describeH2 && !describeH2Image && !describeH2ImageMobile) return null;

  return (
    <section id="gallery" className="w-full flex flex-col items-center justify-center bg-[#fdf8e9] overflow-hidden py-10 sm:py-16">
      <div className="w-full main-container flex flex-col items-center h-full max-w-[1200px] px-4 md:px-0">

        {describeH2 && (
          <div className="describe-h2-wrapper w-full max-w-none text-center mb-2 md:mb-3">
            <RichTextRenderer
              html={describeH2}
              className="text-center text-[#563c39]"
            />
          </div>
        )}

        {(describeH2Image || describeH2ImageMobile) && (
          <div className="w-full flex justify-center mt-2 md:mt-3">
            {/* Desktop Image */}
            {describeH2Image && (
              <div 
                className="relative w-full max-w-[1100px] hidden md:block overflow-hidden shadow-md border border-[#799f851a] hover:shadow-lg transition-all duration-300"
                style={{ borderRadius: imageBorderRadius }}
              >
                <img
                  src={buildUrl(describeH2Image)}
                  alt="Ảnh Giải pháp tiện ích dịch vụ phòng học (Desktop)"
                  className="w-full h-[405px] object-cover block"
                  style={{ borderRadius: imageBorderRadius }}
                />
              </div>
            )}

            {/* Mobile Image */}
            {(describeH2ImageMobile || describeH2Image) && (
              <div 
                className="relative w-[95vw] sm:w-[90vw] block md:hidden overflow-hidden shadow-md border border-[#799f851a] hover:shadow-lg transition-all duration-300"
                style={{ borderRadius: mobileImageBorderRadius }}
              >
                <img
                  src={buildUrl(describeH2ImageMobile || describeH2Image)}
                  alt="Ảnh Giải pháp tiện ích dịch vụ phòng học (Mobile)"
                  className="w-full h-[180px] sm:h-[300px] object-cover block"
                  style={{ borderRadius: mobileImageBorderRadius }}
                />
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};

export default Gallery;

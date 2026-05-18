"use client";

import React from "react";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Gallery: React.FC = () => {
  const describeH2 = useConfigContentByKey("describe-h2");
  const describeH2Image = useConfigContentByKey("describe-h2-image");

  const buildUrl = (path: string | undefined) => {
    if (!path) return "";
    return `${URL_API}${path.replace(/\\/g, "/")}`;
  };

  if (!describeH2 && !describeH2Image) return null;

  return (
    <section id="gallery" className="w-full flex flex-col items-center justify-center bg-[#fdf8e9] overflow-hidden py-10 sm:py-16">
      <div className="w-full main-container flex flex-col items-center h-full max-w-[1200px] px-4 md:px-0">

        {describeH2 && (
          <div className="describe-h2-wrapper w-full max-w-none text-center mb-2 md:mb-6">
            <RichTextRenderer
              html={describeH2}
              className="text-center text-[#563c39]"
            />
          </div>
        )}

        {describeH2Image && (
          <div className="w-full flex justify-center mt-2 md:mt-4">
            <div className="relative w-full max-w-[720px] rounded-[12px] overflow-hidden shadow-md border border-[#799f851a] hover:shadow-lg transition-all duration-300">
              <img
                src={buildUrl(describeH2Image)}
                alt="Ảnh Giải pháp tiện ích dịch vụ phòng học"
                className="w-full h-auto object-cover block"
              />
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default Gallery;

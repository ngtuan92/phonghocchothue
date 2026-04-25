"use client";

import React from "react";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";

const Amenities: React.FC = () => {
  const amenitiesHeading = useConfigContentByKey("amenities-content");
  const amenitiesDescription = useConfigContentByKey("amenities-description");

  if (!amenitiesHeading && !amenitiesDescription) return null;

  return (
    <section id="amenities" className="my-12 sm:my-24 md:my-32 px-6 sm:px-[60px] lg:px-[90px]">
      <div className="container mx-auto">
        <RichTextRenderer
          html={amenitiesHeading}
          className="text-[#563c39] max-w-5xl mx-auto text-center"
          fallback={
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-center">
              Đầy đủ các tiện nghi sẵn sàng cho mỗi buổi học
            </h2>
          }
        />
        
        {amenitiesDescription && (
          <div className="mt-8 max-w-4xl mx-auto">
            <RichTextRenderer html={amenitiesDescription} />
          </div>
        )}
      </div>
    </section>
  );
};

export default Amenities;

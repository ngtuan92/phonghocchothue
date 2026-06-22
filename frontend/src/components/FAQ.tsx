import React, { useMemo, useState } from "react";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";

interface FAQItem {
  question: string;
  answer: string;
  qLineHeight?: string;
  qLineHeightMobile?: string;
  aLineHeight?: string;
  aLineHeightMobile?: string;
}

const FAQ = () => {
  const faqDataString = useConfigContentByKey("faq_list");
  const faqHeading = useConfigContentByKey("faq-heading");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const faqData: FAQItem[] = useMemo(() => {
    try {
      if (typeof faqDataString === 'string') {
        const parsed = JSON.parse(faqDataString);
        return Array.isArray(parsed) ? parsed : [];
      } else if (Array.isArray(faqDataString)) {
        return faqDataString;
      }
      return [];
    } catch (e) {
      console.error("Lỗi parse FAQ data:", e);
      return [];
    }
  }, [faqDataString]);

  const handleToggle = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpenIndex(openIndex === index ? null : index);
  };

  if (!faqData || faqData.length === 0) {
    return null;
  }

  return (
    <section className="pt-0 pb-0 sm:pt-0 sm:pb-0 max-w-5xl mx-auto main-container mt-[70px] sm:mt-16 md:mt-16 mb-10 sm:mb-12">
      <div className="describe-h2-wrapper w-full max-w-none text-center mb-4 md:mb-5">
        <RichTextRenderer
          html={faqHeading}
          configKey="faq-heading"
          className="text-center text-[#563c39]"
        />
      </div>

      <div 
        className="faq-container bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-[30px] p-5 sm:p-10 shadow-default border-[1px] border-[#799f85]"
      >
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <details
              key={index}
              className="group border-b border-[#799f85]/30 pb-4 last:border-b-0 last:pb-0"
              open={openIndex === index}
            >
              <summary 
                className="list-none cursor-pointer flex justify-between items-center font-semibold text-base sm:text-lg text-[#563c39] hover:text-[#e57f7f] transition-colors duration-300 py-2"
                onClick={handleToggle(index)}
              >
                <div className="pr-4 leading-relaxed font-bold raleway w-full">
                  <RichTextRenderer 
                    html={item.question} 
                    lineHeight={item.qLineHeight}
                    lineHeightMobile={item.qLineHeightMobile}
                  />
                </div>
                <span className="transition-transform duration-300 group-open:rotate-180 flex-shrink-0 text-[#799f85] font-bold text-xl">
                  ▼
                </span>
              </summary>

              <div
                className="mt-4 text-[#323232] leading-relaxed relative pl-4 border-l-2 border-[#e57f7f]"
              >
                <div className="raleway">
                  <RichTextRenderer 
                    html={item.answer} 
                    lineHeight={item.aLineHeight}
                    lineHeightMobile={item.aLineHeightMobile}
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;

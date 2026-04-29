import React, { useMemo, useState } from "react";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";

interface FAQItem {
  question: string;
  answer: string;
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
    <section className="py-12 max-w-4xl mx-auto px-6 sm:px-10 mt-12 sm:mt-24 md:mt-32 mb-12 sm:mb-24">
      <RichTextRenderer
        html={faqHeading}
        className="text-center mb-8"
        fallback={<h2 className="text-center text-5xl sm:text-7xl mb-10 text-[#563c39] font-cursive">Bạn hỏi - Hoa Học Trò đáp</h2>}
      />

      <div 
        itemScope 
        itemType="https://schema.org/FAQPage" 
        className="faq-container bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-[30px] p-6 sm:p-10 shadow-default border-[1px] border-[#799f85]"
      >
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <details
              key={index}
              className="group border-b border-[#799f85]/30 pb-4 last:border-b-0 last:pb-0"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
              open={openIndex === index}
            >
              <summary 
                className="list-none cursor-pointer flex justify-between items-center font-semibold text-lg text-[#563c39] hover:text-[#e57f7f] transition-colors duration-300 py-2"
                onClick={handleToggle(index)}
              >
                <div itemProp="name" className="pr-4 leading-relaxed font-bold raleway w-full">
                  <RichTextRenderer html={item.question} />
                </div>
                <span className="transition-transform duration-300 group-open:rotate-180 flex-shrink-0 text-[#799f85] font-bold text-xl">
                  ▼
                </span>
              </summary>

              <div
                className="mt-4 text-[#323232] leading-relaxed relative pl-4 border-l-2 border-[#e57f7f]"
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <div itemProp="text" className="raleway">
                  <RichTextRenderer html={item.answer} />
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

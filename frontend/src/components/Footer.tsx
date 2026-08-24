"use client";

import {
  faEnvelopeCircleCheck,
  faLocationDot,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useConfigContentByKey from "../hooks/useConfigContentByKey";
import RichTextRenderer from "./RichTextRenderer";
import { stripHtmlAndCss } from "../utils/seoHelpers";

const Footer = () => {
  const bgFt = useConfigContentByKey("color-bg-footer");
  const nameBrand = useConfigContentByKey("nameBrand");
  const footerContactTitle =
    useConfigContentByKey("footer-contact-title") || "<p>LIÊN HỆ</p>";
  const address = useConfigContentByKey("address");
  const phone = useConfigContentByKey("phone");
  const email = useConfigContentByKey("email");
  const googleMap = useConfigContentByKey("googleMap");

  return (
    <footer
      className="mx-auto text-white rounded-b-[15px] p-4"
      style={{ backgroundColor: bgFt }}
    >
      <div className=" grid grid-cols-1 md:grid-cols-3 gap-10 lg:mx-14 place-items-center place-content-center">
        <div className=" text-2xl sm:text-3xl title-footer-custom max-sm:mt-4">
          <RichTextRenderer html={nameBrand} configKey="nameBrand" />
        </div>
        <div className="w-full px-0.5 md:px-0 md:w-auto">
          <div className="text-xl sm:text-2xl font-bold mb-4 footer-contact-title">
            <RichTextRenderer html={footerContactTitle} configKey="footer-contact-title" />
          </div>
          {address && (
            <div className="flex items-center my-3">
              <FontAwesomeIcon
                icon={faLocationDot}
                className="mr-4 text-center flex-shrink-0"
              />
              <RichTextRenderer html={address} configKey="address" className="flex-1 !text-left" />
            </div>
          )}
          {phone && (
            <div className="flex items-center mb-2">
              <FontAwesomeIcon icon={faPhone} className="mr-3 text-center flex-shrink-0" />
              <div className="flex flex-wrap items-center gap-1">
                <RichTextRenderer html={phone} configKey="phone" as="span" className="inline-rich-text" />
              </div>
            </div>
          )}
          {email && (
            <div className="flex items-center mb-2">
              <FontAwesomeIcon
                icon={faEnvelopeCircleCheck}
                className="mr-2 text-center flex-shrink-0"
              />
              <div className="flex flex-wrap items-center gap-1">
                <a href={`mailto:${stripHtmlAndCss(email)}`} className="break-all">
                  <RichTextRenderer html={email} configKey="email" as="span" className="inline-rich-text" />
                </a>
              </div>
            </div>
          )}
        </div>
        {googleMap && (
          <div className=" w-full flex justify-center">
            <iframe
              src={googleMap}
              title="Bản đồ chỉ đường đến PhongHocChoThue"
              className="w-full h-52 rounded-xl "
              loading="lazy"
              allowFullScreen
              aria-hidden="false"
              tabIndex={0}
            ></iframe>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;

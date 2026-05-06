"use client";

import {
  faEnvelopeCircleCheck,
  faLocationDot,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useConfigContentByKey from "../hooks/useConfigContentByKey";

const Footer = () => {
  const bgFt = useConfigContentByKey("color-bg-footer");
  const nameBrand = useConfigContentByKey("nameBrand");
  const address = useConfigContentByKey("address");
  const phone = useConfigContentByKey("phone");
  const email = useConfigContentByKey("email");
  const googleMap = useConfigContentByKey("googleMap");

  return (
    <footer
      className="mx-auto text-white rounded-b-[15px] main-container py-8"
      style={{ backgroundColor: bgFt }}
    >
      <div className=" grid grid-cols-1 md:grid-cols-3 gap-10 lg:mx-14 place-items-center place-content-center">
        <p className="text-lg sm:text-3xl title-footer-custom max-sm:mt-4 text-center md:text-left">
          {nameBrand}
        </p>
        <div className="">
          <h2 className="text-base sm:text-2xl font-bold mb-3 underline">
            LIÊN HỆ
          </h2>
          {address && (
            <div className="flex items-center my-2 ">
              <FontAwesomeIcon
                icon={faLocationDot}
                className="mr-3 text-center"
              />
              <div className="text-sm sm:text-base">
                {address.split(",").map((line: any, index: number) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          )}
          {phone && (
            <div className="flex items-center mb-1.5 text-sm sm:text-base">
              <FontAwesomeIcon icon={faPhone} className="mr-3 text-center" />
              <p>Phone: {phone}</p>
            </div>
          )}
          {email && (
            <div className="flex items-center mb-2">
              <FontAwesomeIcon
                icon={faEnvelopeCircleCheck}
                className="mr-2 text-center"
              />
              <p>
                Email:{" "}
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            </div>
          )}
        </div>
        {googleMap && (
          <div className=" w-full flex justify-center">
            <iframe
              src={googleMap}
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


"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  faFacebook,
  faFacebookMessenger,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import { faBars, faPhone, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import classNames from "classnames";
import ReactAudioPlayer from "react-audio-player";
import { FaPlay, FaPause } from "react-icons/fa";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

type LegacyMarqueeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  behavior?: "scroll" | "slide" | "alternate";
  direction?: "left" | "right" | "up" | "down";
  scrollAmount?: number;
};

const LegacyMarquee: React.FC<LegacyMarqueeProps> = ({
  children,
  behavior,
  direction,
  scrollAmount,
  ...rest
}) =>
  React.createElement(
    "marquee",
    {
      ...rest,
      ...(behavior ? { behavior } : {}),
      ...(direction ? { direction } : {}),
      ...(typeof scrollAmount === "number"
        ? { scrollamount: scrollAmount }
        : {}),
    },
    children,
  );

interface HeaderProps {
  icon?: string;
}

const Header = ({ icon }: HeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const homeMusic = useConfigContentByKey("home-music");
  const homeMusicName = useConfigContentByKey("home-music", "musicName");

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    e.preventDefault();
    if (typeof document === "undefined") return;
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    closeMenu();
  };

  const audioRef = useRef<ReactAudioPlayer>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollAmount, setScrollAmount] = useState(3);

  const handleTogglePlay = () => {
    const audio = audioRef.current?.audioEl?.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.log("Không phát được nhạc:", err);
        });
    }
  };

  useEffect(() => {
    const globalWindow = globalThis as Window & typeof globalThis;

    const handleUserAction = () => {
      if (audioRef.current?.audioEl?.current) {
        audioRef.current.audioEl.current.muted = false;
        audioRef.current.audioEl.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log("Không phát được nhạc:", err);
          });
      }

      globalWindow.removeEventListener?.("click", handleUserAction);
      globalWindow.removeEventListener?.("keydown", handleUserAction);
      globalWindow.removeEventListener?.("scroll", handleUserAction);
    };

    globalWindow.addEventListener?.("click", handleUserAction);
    globalWindow.addEventListener?.("keydown", handleUserAction);
    globalWindow.addEventListener?.("scroll", handleUserAction);

    return () => {
      globalWindow.removeEventListener?.("click", handleUserAction);
      globalWindow.removeEventListener?.("keydown", handleUserAction);
      globalWindow.removeEventListener?.("scroll", handleUserAction);
    };
  }, []);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header
      className={classNames(
        "z-10 fixed left-[43px] right-[43px] sm:left-[70px] sm:right-[70px] 1400px:left-[70px] 1400px:right-[70px] 1700px:left-[85px] 1700px:right-[85px] mt-[10px] sm:mt-[8px] max-sm:pl-[5px] flex justify-between items-center"
      )}
    >
      <div className="flex items-center justify-start sm:ml-[25px]">
        <a
          href={useConfigContentByKey("linkfb") || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon
            icon={faFacebook}
            className="w-[18px] sm:w-[22px] h-[18px] mr-[18px] sm:mr-[20px] sm:h-[22px] text-[#563c39] hover:scale-150 transition-transform duration-300 wl-max-[1380px]"
          />
        </a>
        <a
          href={useConfigContentByKey("linkMess") || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon
            icon={faFacebookMessenger}
            className="w-[18px] sm:w-[22px] h-[18px] mr-[18px] sm:mr-[20px] sm:h-[22px] text-[#563c39] hover:scale-150 transition-transform duration-300 wl-max-[1380px]"
          />
        </a>
        <a
          href={useConfigContentByKey("linkYoutube") || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon
            icon={faYoutube}
            className="w-[18px] sm:w-[23px] h-[18px] mr-[18px] sm:mr-[20px] sm:h-[23px] text-[#563c39] hover:scale-150 transition-transform duration-300 wl-max-[1380px]"
          />
        </a>
        <a
          href={`tel:${useConfigContentByKey("phone") || ""}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon
            icon={faPhone}
            className="w-[18px] sm:w-[22px] h-[18px] sm:h-[22px] text-[#563c39] hover:scale-150 transition-transform duration-300 wl-max-[1380px]"
          />
        </a>
      </div>
      <div className="flex items-center justify-end w-full max-sm:mb-[3px]">
        <div className="flex items-center px-[2px] justify-between bg-[#AD9551] rounded-[15px] h-[24px] max-sm:h-[20px] w-[250px] max-sm:w-[93%]">
          <div className="w-[20px] max-sm:w-[16px] h-[20px] max-sm:h-[16px] rounded-[50%] overflow-hidden">
            <img
              src={icon || "/favicon.jpg"}
              className={`w-full h-full rounded-full ${
                isPlaying ? "animate-spin-slow" : ""
              }`}
              alt="icon"
            />
          </div>
          <div className="w-[200px] max-sm:w-[calc(100%-35px)] flex items-center justify-center">
            <LegacyMarquee
              behavior="scroll"
              direction="left"
              scrollAmount={scrollAmount}
              className="text-sm"
            >
              <span className="text-[10px] sm:text-[13px] text-black raleway !font-normal">
                {homeMusicName}
              </span>
            </LegacyMarquee>
          </div>

          <button
            aria-label="Play And Pause Music"
            onClick={handleTogglePlay}
            className="w-[20px] max-sm:w-[16px] h-[20px] max-sm:h-[16px] flex items-center justify-center border-none bg-white text-[#563c39] rounded-[50%]"
          >
            {isPlaying ? (
              <FaPause className="w-[12px] max-sm:w-[10px] h-[12px] max-sm:h-[10px]" />
            ) : (
              <FaPlay className="w-[12px] max-sm:w-[10px] h-[12px] max-sm:h-[10px]" />
            )}
          </button>
        </div>
        <div className="hidden">
          {isMounted && (
            <ReactAudioPlayer
              ref={audioRef}
              src={`${URL_API}${
                typeof homeMusic === "string" ? homeMusic.replaceAll("\\", "/") : ""
              }`}
              autoPlay={false}
              controls
              loop={false}
            />
          )}
        </div>
      </div>
      <div className="flex items-center">
        <button
          onClick={toggleMenu}
          className="relative focus:outline-none "
        >
          <FontAwesomeIcon
            icon={isOpen ? faTimes : faBars}
            className="w-[22px] h-[22px] sm:w-7 sm:h-7 m-2 sm:mr-[22px] text-[#563c39] z-[9999] relative"
          />
          <div
            className={`z-30 -top-[10px] -right-[13px] sm:right-[0px] sm:-top-[8px] absolute w-[250px] sm:w-111 h-[250px] sm:h-100 bg-nav text-white shadow-lg rounded-tr-xl rounded-bl-full transform transition-transform duration-500 ease-in-out rounded-tr-[15x] sm:rounded-tr-[20px] ${
              isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0"
            }`}
            style={{
              transformOrigin: "top right",
            }}
          >
            <div className="h-8"></div>
            <ul className="ml-16 mt-0 sm:mt-4 text-center text-sm sm:text-xl font-medium">
              <li className="mb-4">
                <a href="/" className="hover:underline decoration-wavy p-4">
                  Trang chủ
                </a>
              </li>
              <li className="mb-4">
                <a
                  href="#about"
                  className="hover:underline decoration-wavy p-4"
                  onClick={(e) => handleSmoothScroll(e, "#about")}
                >
                  Giới thiệu
                </a>
              </li>
              <li className="mb-4">
                <a
                  href="#room"
                  className="hover:underline decoration-wavy p-4"
                  onClick={(e) => handleSmoothScroll(e, "#room")}
                >
                  Dịch vụ
                </a>
              </li>
              <li className="mb-4">
                <a
                  href="#blog"
                  className="hover:underline decoration-wavy p-4"
                  onClick={(e) => handleSmoothScroll(e, "#blog")}
                >
                  Blog
                </a>
              </li>
              <li className="mb-4">
                <a
                  href="#faq"
                  className="hover:underline decoration-wavy p-4"
                  onClick={(e) => handleSmoothScroll(e, "#faq")}
                >
                  FAQ
                </a>
              </li>
              <li className="mb-4">
                <a
                  href="#contact"
                  className="hover:underline decoration-wavy p-4"
                  onClick={(e) => handleSmoothScroll(e, "#contact")}
                >
                  Liên hệ
                </a>
              </li>
            </ul>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;

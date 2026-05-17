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

  const handleSmoothScroll = (targetId: string) => {
    setIsOpen(false);
    if (typeof document === "undefined") return;
    const target = document.querySelector(targetId) as HTMLElement | null;
    if (target) {
      const container = document.getElementById('main-scroll-container');
      const headerOffset = 80;
      
      const isMobile = window.innerWidth < 640;

      if (isMobile || !container) {
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      } else {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const scrollTarget = targetRect.top - containerRect.top + container.scrollTop - headerOffset;

        container.scrollTo({
          top: scrollTarget,
          behavior: "smooth"
        });
      }
    }
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
      className="z-10 fixed left-[43px] right-[43px] sm:left-[70px] sm:right-[70px] 1400px:left-[70px] 1400px:right-[70px] 1700px:left-[85px] 1700px:right-[85px] mt-[10px] sm:mt-[8px] max-sm:pl-[5px] flex justify-between items-center"
    >
      <div className="flex items-center justify-start sm:ml-[25px]">
        <a
          href={useConfigContentByKey("linkfb") || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon
            icon={faFacebook}
            className="w-[18px] sm:w-[22px] h-[18px] mr-[18px] sm:mr-[20px] sm:h-[22px] text-[#563c39] hover:scale-150 transition-transform duration-300"
          />
        </a>
        <a
          href={useConfigContentByKey("linkMess") || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon
            icon={faFacebookMessenger}
            className="w-[18px] sm:w-[22px] h-[18px] mr-[18px] sm:mr-[20px] sm:h-[22px] text-[#563c39] hover:scale-150 transition-transform duration-300"
          />
        </a>
        <a
          href={useConfigContentByKey("linkYoutube") || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon
            icon={faYoutube}
            className="w-[18px] sm:w-[23px] h-[18px] mr-[18px] sm:mr-[20px] sm:h-[23px] text-[#563c39] hover:scale-150 transition-transform duration-300"
          />
        </a>
        <a
          href={useConfigContentByKey("phone") || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon
            icon={faPhone}
            className="w-[18px] sm:w-[22px] h-[18px] sm:h-[22px] text-[#563c39] hover:scale-150 transition-transform duration-300"
          />
        </a>
      </div>
      
      <div className="flex items-center justify-end w-full max-sm:mb-[3px]">
        <div className="flex items-center px-[2px] justify-between bg-[#AD9551] rounded-[15px] h-[24px] max-sm:h-[20px] w-[250px] max-sm:w-[93%]">
          <div className="w-[20px] max-sm:w-[16px] h-[20px] max-sm:h-[16px] rounded-[50%] overflow-hidden flex-shrink-0">
            <img
              src={icon || "/favicon.jpg"}
              className={`w-full h-full rounded-full ${
                isPlaying ? "animate-spin-slow" : ""
              }`}
              alt="icon"
            />
          </div>
          <div className="w-[200px] max-sm:w-[calc(100%-35px)] flex items-center justify-center overflow-hidden">
            <LegacyMarquee
              behavior="scroll"
              direction="left"
              scrollAmount={scrollAmount}
              className="text-sm w-full"
            >
              <span className="text-[10px] sm:text-[13px] text-black raleway !font-normal whitespace-nowrap">
                {homeMusicName}
              </span>
            </LegacyMarquee>
          </div>

          <button
            aria-label="Play And Pause Music"
            onClick={handleTogglePlay}
            className="w-[20px] max-sm:w-[16px] h-[20px] max-sm:h-[16px] flex items-center justify-center border-none bg-white text-[#563c39] rounded-[50%] flex-shrink-0"
          >
            {isPlaying ? (
              <FaPause className="w-[9px] sm:w-[12px] h-[9px] sm:h-[12px] max-sm:w-[8px] max-sm:h-[8px]" />
            ) : (
              <FaPlay className="w-[9px] sm:w-[12px] h-[9px] sm:h-[12px] max-sm:w-[8px] max-sm:h-[8px]" />
            )}
          </button>
        </div>
      </div>
      
      <div className="flex items-center">
        <div className="relative flex items-center justify-end">
          <button
            onClick={toggleMenu}
            className="relative focus:outline-none z-[9999]"
          >
            <FontAwesomeIcon
              icon={isOpen ? faTimes : faBars}
              className="w-[22px] h-[22px] sm:w-7 sm:h-7 m-2 sm:mr-[22px] text-[#563c39] relative"
            />
          </button>
        </div>
        <div
          className={`z-[9998] top-[-10px] right-0 sm:!right-[-46px] lg:!right-[-46px] xl:!right-[-20px] sm:!top-[-8px] lg:!top-[-8px] xl:!top-[-8px] absolute w-[250px] sm:w-111 h-[250px] sm:h-100 bg-nav text-white shadow-lg rounded-tr-xl rounded-bl-full transform transition-all duration-500 ease-in-out rounded-tr-[15px] sm:rounded-tr-[20px] ${
            isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-0 opacity-0 pointer-events-none"
          }`}
          style={{
            transformOrigin: "top right",
          }}
        >
          <div className="h-6 sm:h-8"></div>
          <ul className="ml-12 sm:ml-16 mt-0 sm:mt-4 text-center text-[13px] sm:text-xl font-medium">
            {[
              { label: "Trang chủ", href: "/", onClick: () => setIsOpen(false) },
              { label: "Giới thiệu", href: "#about", onClick: () => handleSmoothScroll("#about") },
              { label: "Dịch vụ", href: "#room", onClick: () => handleSmoothScroll("#room") },
              { label: "Blog", href: "#blog", onClick: () => handleSmoothScroll("#blog") },
              { label: "FAQ", href: "#faq", onClick: () => handleSmoothScroll("#faq") },
              { label: "Liên hệ", href: "#contact", onClick: () => handleSmoothScroll("#contact") },
            ].map((item, index) => (
              <li
                key={index}
                className="mb-0 sm:mb-1 cursor-pointer pointer-events-auto"
                onClick={item.onClick}
              >
                <a
                  href={item.href}
                  onClick={(e) => {
                    if (item.href.startsWith("#")) {
                      e.preventDefault();
                    }
                  }}
                  className="hover:underline decoration-wavy py-1 px-4 sm:p-2 block w-full relative z-[10005] pointer-events-auto"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
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
    </header>
  );
};

export default Header;

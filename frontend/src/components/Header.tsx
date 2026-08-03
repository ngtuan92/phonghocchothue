"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  faFacebook,
  faFacebookMessenger,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import { faBars, faPhone, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useConfigContentByKey from "@/hooks/useConfigContentByKey";
import classNames from "classnames";
import { FaPlay, FaPause } from "react-icons/fa";
import { stripHtmlAndCss } from "@/utils/seoHelpers";
import { isMobile, openMessengerApp } from "@/social/openExternalApp";

const getAudioSrc = (pathStr: any) => {
  if (typeof pathStr !== "string") return "";
  const cleanPath = pathStr.replaceAll("\\", "/");
  return cleanPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
};

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";
const MESSENGER_PAGE_ID = process.env.NEXT_PUBLIC_MESSENGER_PAGE_ID;

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
  const linkFb = useConfigContentByKey("linkfb");
  const linkMess = useConfigContentByKey("linkMess");
  const linkYoutube = useConfigContentByKey("linkYoutube");
  const phone = useConfigContentByKey("phone");
  const cleanPhoneLink = phone ? stripHtmlAndCss(phone).replace(/\s+/g, "") : "";
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const menuItems = useMemo(() => {
    if (isHomePage) {
      return [
        { label: "Trang chủ", href: "/", onClick: () => setIsOpen(false) },
        { label: "Giới thiệu", href: "#about", onClick: () => handleSmoothScroll("#about") },
        { label: "Dịch vụ", href: "#room", onClick: () => handleSmoothScroll("#room") },
        { label: "Blog", href: "#blog", onClick: () => handleSmoothScroll("#blog") },
        { label: "FAQ", href: "#faq", onClick: () => handleSmoothScroll("#faq") },
        { label: "Liên hệ", href: "#contact", onClick: () => handleSmoothScroll("#contact") },
      ];
    }
    return [
      { label: "Trang chủ", href: "/", onClick: () => setIsOpen(false) },
    ];
  }, [isHomePage]);

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
      let headerOffset = 80;
      if (targetId === "#blog") {
        headerOffset = 0;
      } else if (targetId === "#about") {
        headerOffset = 30; // cuộn xuống thêm 50px (bớt khoảng cách lề trên)
      } else if (targetId === "#room") {
        headerOffset = 120;
      }

      if (!container) {
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollAmount, setScrollAmount] = useState(3);

  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio
        .play()
        .catch((err) => {
          console.log("Không phát được nhạc:", err);
        });
    }
  };

  useEffect(() => {
    const globalWindow = globalThis as Window & typeof globalThis;

    const handleUserAction = () => {
      const audio = audioRef.current;
      if (audio) {
        audio.muted = false;
        audio
          .play()
          .catch((err) => {
            console.log("Tự động phát nhạc thất bại:", err);
          });
      }

      globalWindow.removeEventListener?.("click", handleUserAction);
      globalWindow.removeEventListener?.("keydown", handleUserAction);
    };

    globalWindow.addEventListener?.("click", handleUserAction);
    globalWindow.addEventListener?.("keydown", handleUserAction);

    return () => {
      globalWindow.removeEventListener?.("click", handleUserAction);
      globalWindow.removeEventListener?.("keydown", handleUserAction);
    };
  }, []);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (audioRef.current && homeMusic) {
      audioRef.current.load();
    }
  }, [homeMusic]);

  // Mobile links stay in the current context so iOS/Android can dispatch the
  // HTTPS Universal Link/App Link. Desktop links open in a separate tab.
  const externalLinkTarget = isMounted && !isMobile() ? "_blank" : undefined;

  return (
    <header
      className="z-40 fixed left-[47px] right-[47px] sm:left-[70px] sm:right-[70px] 1400px:left-[70px] 1400px:right-[70px] 1700px:left-[85px] 1700px:right-[85px] mt-[10px] sm:mt-[8px] max-sm:pl-[5px] flex justify-between items-center"
    >
      <div className="flex items-center justify-start sm:ml-[25px] flex-shrink-0 gap-[16px] sm:gap-[20px]">
        <a
          href={linkFb || "#"}
          target={externalLinkTarget}
          rel="noopener noreferrer"
          aria-label="Trang Facebook của chúng tôi"
        >
          <FontAwesomeIcon
            icon={faFacebook}
            className="w-[18px] sm:w-[22px] h-[18px] sm:h-[22px] text-[#563c39] hover:scale-150 transition-transform duration-300"
          />
        </a>
        <a
          href={linkMess || "#"}
          target={externalLinkTarget}
          rel="noopener noreferrer"
          onClick={(event) => {
            if (!linkMess || !isMobile()) return;
            event.preventDefault();
            openMessengerApp(linkMess, MESSENGER_PAGE_ID);
          }}
          aria-label="Nhắn tin với chúng tôi qua Messenger"
        >
          <FontAwesomeIcon
            icon={faFacebookMessenger}
            className="w-[18px] sm:w-[22px] h-[18px] sm:h-[22px] text-[#563c39] hover:scale-150 transition-transform duration-300"
          />
        </a>
        <a
          href={linkYoutube || "#"}
          target={externalLinkTarget}
          rel="noopener noreferrer"
          aria-label="Kênh Youtube của chúng tôi"
        >
          <FontAwesomeIcon
            icon={faYoutube}
            className="w-[18px] sm:w-[23px] h-[18px] sm:h-[23px] text-[#563c39] hover:scale-150 transition-transform duration-300"
          />
        </a>
        <a
          href={cleanPhoneLink ? `tel:${cleanPhoneLink}` : "#"}
          aria-label="Gọi điện thoại hotline"
        >
          <FontAwesomeIcon
            icon={faPhone}
            className="w-[18px] sm:w-[22px] h-[18px] sm:h-[22px] text-[#563c39] hover:scale-150 transition-transform duration-300"
          />
        </a>
      </div>

      <div className="flex items-center justify-end sm:w-full flex-1 max-sm:gap-[4px] sm:gap-[15px]">
        <div
          onClick={handleTogglePlay}
          className="cursor-pointer flex items-center px-[2px] justify-between bg-[#AD9551] rounded-[15px] h-[24px] max-sm:h-[20px] w-[210px] max-sm:w-[120px] flex-shrink-0 max-sm:mb-[3px]"
        >
          <div className="w-[20px] max-sm:w-[16px] h-[20px] max-sm:h-[16px] rounded-[50%] overflow-hidden flex-shrink-0">
            <img
              src={icon || "/favicon.jpg"}
              className={`w-full h-full rounded-full ${isPlaying ? "animate-spin-slow" : ""
                }`}
              alt="icon"
            />
          </div>
          <div className="w-[160px] max-sm:w-[calc(100%-36px)] flex items-center justify-center overflow-hidden">
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

        <div className="flex items-center flex-shrink-0">
          {isOpen && (
            <div
              className="fixed inset-0 z-[9997] bg-transparent cursor-default"
              onClick={closeMenu}
            />
          )}
          <div className="relative flex items-center justify-end">
            <button
              onClick={toggleMenu}
              className="relative focus:outline-none z-[9999]"
              aria-label="Mở menu điều hướng"
            >
              <FontAwesomeIcon
                icon={isOpen ? faTimes : faBars}
                className="w-[22px] h-[22px] sm:w-7 sm:h-7 my-2 max-sm:ml-[2px] sm:ml-2 mr-0 sm:m-2 sm:mr-[22px] text-[#563c39] relative"
              />
            </button>
          </div>
          <div
            className={`z-[9998] -top-[10px] -right-[18px] sm:right-0 sm:-top-2 absolute bg-nav text-white shadow-lg rounded-bl-full transform transition-all duration-500 ease-in-out rounded-tr-[15px] sm:rounded-tr-[20px] ${isHomePage
              ? "w-[250px] sm:w-111 h-[250px] sm:h-100"
              : "w-[150px] sm:w-[165px] h-[150px] sm:h-[165px]"
              } ${isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-0 opacity-0 pointer-events-none"
              }`}
            style={{
              transformOrigin: "top right",
            }}

          >
            <div className={isHomePage ? "h-6 sm:h-8" : "h-8 sm:h-10"}></div>
            <ul className={isHomePage ? "ml-12 sm:ml-16 mt-0 sm:mt-4 text-center text-[13px] sm:text-xl font-medium leading-tight sm:leading-normal" : "ml-2 sm:ml-3 mr-7 sm:mr-8 mt-1 text-center text-[13px] sm:text-base font-medium leading-tight sm:leading-normal"}>
              {menuItems.map((item, index) => (
                <li key={index} className="mb-1 sm:mb-1 cursor-pointer pointer-events-auto">
                  <a
                    href={item.href}
                    onClick={(e) => {
                      if (item.href.startsWith("#")) e.preventDefault();
                      item.onClick?.();
                    }}
                    className="hover:underline decoration-wavy py-1 sm:py-2 pl-10 pr-2 md:px-2 block w-full relative z-[10005] pointer-events-auto"                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="hidden">
        <audio
          ref={audioRef}
          src={homeMusic ? `${URL_API}${getAudioSrc(homeMusic)}` : undefined}
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      </div>
    </header>
  );
};

export default Header;

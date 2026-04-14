"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button onClick={toggleMenu}>
        <FontAwesomeIcon icon={faBars} className="w-9 h-9 m-2" />
      </button>

      <div
        className={`fixed top-0 right-0 h-full w-full bg-pink-400 text-white transform ${
          isOpen ? "scale-100" : "scale-0"
        } transition-transform duration-500 origin-top-right`}
        style={{
          clipPath: "circle(150% at 100% 0)",
        }}
      >
        <button
          onClick={toggleMenu}
          className="absolute top-4 right-4 text-xl font-bold focus:outline-none"
        >
          ×
        </button>
        <ul className="mt-20 space-y-6 text-center text-xl font-medium">
          <li>
            <a href="#home" className="hover:underline">
              Home
            </a>
          </li>
          <li>
            <a href="#about" className="hover:underline">
              About
            </a>
          </li>
          <li>
            <a href="#portfolio" className="hover:underline">
              Portfolio
            </a>
          </li>
          <li>
            <a href="#store" className="hover:underline">
              Store
            </a>
          </li>
          <li>
            <a href="#contact" className="hover:underline">
              Contact
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}


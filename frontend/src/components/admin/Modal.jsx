import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { MdClose } from "react-icons/md";

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      <div className={`relative bg-white rounded-2xl w-full ${maxWidth} shadow-2xl z-10 overflow-hidden border border-gray-100 transform transition-all animate-in zoom-in duration-200`}>
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-navy-700">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white rounded-full transition-all group shadow-sm border border-transparent hover:border-gray-100"
          >
            <MdClose className="h-5 w-5 text-gray-500 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;

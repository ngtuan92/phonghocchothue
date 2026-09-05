import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const safeNumber = (val, fallback = 0) => {
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Hook to handle click-outside logic for popups
 */
function useClickOutside(ref, anchor, onClose, visible = true) {
  useEffect(() => {
    if (!visible) return;
    const handleOutsideClick = (event) => {
      const el = ref.current;
      if (!el) return;
      // If clicking inside popup or clicking the anchor button that toggles it, do nothing
      if (el.contains(event.target) || anchor?.contains?.(event.target)) {
        return;
      }
      onClose?.();
    };

    document.addEventListener('mousedown', handleOutsideClick, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
    };
  }, [anchor, onClose, ref, visible]);
}

/**
 * Popup điều khiển Cỡ chữ (Desktop & Mobile)
 */
export const FontSizePopup = React.memo(function FontSizePopup({
  visible,
  position,
  anchor,
  initialDesktop = '',
  initialMobile = '',
  onChangeDesktop,
  onChangeMobile,
  onStepDesktop,
  onStepMobile,
  onClose,
}) {
  const popupRef = useRef(null);
  const [desktop, setDesktop] = useState(initialDesktop);
  const [mobile, setMobile] = useState(initialMobile);

  useEffect(() => {
    setDesktop(initialDesktop);
  }, [initialDesktop]);

  useEffect(() => {
    setMobile(initialMobile);
  }, [initialMobile]);

  useClickOutside(popupRef, anchor, onClose, visible);

  if (!visible || typeof window === 'undefined') return null;

  const handleStep = (device, delta) => {
    if (device === 'desktop') {
      const current = parseInt(desktop) || 16;
      const next = Math.max(1, current + delta).toString();
      setDesktop(next);
      onStepDesktop?.(next);
    } else {
      const current = parseInt(mobile) || 14;
      const next = Math.max(1, current + delta).toString();
      setMobile(next);
      onStepMobile?.(next);
    }
  };

  return createPortal(
    <div
      ref={popupRef}
      className="ql-font-size-popup fixed bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[99999]"
      style={{
        position: 'fixed',
        top: safeNumber(position?.top),
        left: safeNumber(position?.left, 12),
        width: `${safeNumber(position?.width, 210)}px`,
        maxWidth: 'calc(100vw - 24px)',
        boxSizing: 'border-box',
        zIndex: 99999,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>
          Cỡ chữ
        </span>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Máy tính */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
            Máy tính
          </span>
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleStep('desktop', -1)}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none cursor-pointer"
            >
              -
            </button>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={desktop}
                onChange={(e) => {
                  setDesktop(e.target.value);
                  onChangeDesktop?.(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onClose?.();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-12 h-8 text-center bg-white border border-gray-200 rounded font-semibold text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                style={{ fontSize: '16px' }}
                placeholder=""
              />
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleStep('desktop', 1)}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Điện thoại */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
            Điện thoại
          </span>
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleStep('mobile', -1)}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none cursor-pointer"
            >
              -
            </button>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  onChangeMobile?.(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onClose?.();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-12 h-8 text-center bg-white border border-gray-200 rounded font-semibold text-black focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                style={{ fontSize: '16px' }}
                placeholder=""
              />
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleStep('mobile', 1)}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded font-bold transition-all text-xs focus:outline-none cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

/**
 * Popup điều khiển Giãn dòng (Line Height)
 */
export const SpacingPopup = React.memo(function SpacingPopup({
  visible,
  position,
  anchor,
  initialDesktop = '',
  initialMobile = '',
  onChangeDesktop,
  onChangeMobile,
  onApply,
  onClose,
}) {
  const popupRef = useRef(null);
  const [desktop, setDesktop] = useState(initialDesktop);
  const [mobile, setMobile] = useState(initialMobile);

  useEffect(() => {
    setDesktop(initialDesktop);
  }, [initialDesktop]);

  useEffect(() => {
    setMobile(initialMobile);
  }, [initialMobile]);

  useClickOutside(popupRef, anchor, onClose, visible);

  if (!visible || typeof window === 'undefined') return null;

  return createPortal(
    <div
      ref={popupRef}
      className="ql-line-height-popup fixed bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[99999]"
      style={{
        position: 'fixed',
        top: safeNumber(position?.top),
        left: safeNumber(position?.left, 12),
        width: `${safeNumber(position?.width, 200)}px`,
        maxWidth: 'calc(100vw - 24px)',
        boxSizing: 'border-box',
        zIndex: 99999,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>
          Giãn dòng
        </span>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#4b5563' }}>
              Máy tính (px)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Mặc định. VD: 32"
              value={desktop}
              onChange={(e) => {
                setDesktop(e.target.value);
                onChangeDesktop?.(e.target.value);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onApply?.();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1 focus:border-primary focus:outline-none"
              style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#4b5563' }}>
              Điện thoại (px)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Mặc định. VD: 24"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                onChangeMobile?.(e.target.value);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onApply?.();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1 focus:border-primary focus:outline-none"
              style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-all focus:outline-none cursor-pointer"
            onClick={onApply}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

/**
 * Popup điều khiển Dịch ngang (Translate X)
 */
export const TranslateXPopup = React.memo(function TranslateXPopup({
  visible,
  position,
  anchor,
  initialDesktop = '',
  initialMobile = '',
  onChangeDesktop,
  onChangeMobile,
  onClose,
}) {
  const popupRef = useRef(null);
  const [desktop, setDesktop] = useState(initialDesktop);
  const [mobile, setMobile] = useState(initialMobile);

  useEffect(() => {
    setDesktop(initialDesktop);
  }, [initialDesktop]);

  useEffect(() => {
    setMobile(initialMobile);
  }, [initialMobile]);

  useClickOutside(popupRef, anchor, onClose, visible);

  if (!visible || typeof window === 'undefined') return null;

  return createPortal(
    <div
      ref={popupRef}
      className="ql-translate-x-popup fixed bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[99999]"
      style={{
        position: 'fixed',
        top: safeNumber(position?.top),
        left: safeNumber(position?.left, 12),
        width: `${safeNumber(position?.width, 200)}px`,
        maxWidth: 'calc(100vw - 24px)',
        boxSizing: 'border-box',
        zIndex: 99999,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>
          Dịch ngang
        </span>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>
            Máy tính (px)
          </label>
          <input
            type="text"
            placeholder="VD: -20 hoặc 10"
            value={desktop}
            onChange={(e) => {
              setDesktop(e.target.value);
              onChangeDesktop?.(e.target.value);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                onClose?.();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-primary focus:outline-none"
            style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>
            Điện thoại (px)
          </label>
          <input
            type="text"
            placeholder="VD: -10 hoặc 5"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              onChangeMobile?.(e.target.value);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                onClose?.();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-primary focus:outline-none"
            style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
});

/**
 * Popup điều khiển Dịch dọc (Translate Y)
 */
export const TranslateYPopup = React.memo(function TranslateYPopup({
  visible,
  position,
  anchor,
  initialDesktop = '',
  initialMobile = '',
  onChangeDesktop,
  onChangeMobile,
  onApply,
  onClose,
}) {
  const popupRef = useRef(null);
  const [desktop, setDesktop] = useState(initialDesktop);
  const [mobile, setMobile] = useState(initialMobile);

  useEffect(() => {
    setDesktop(initialDesktop);
  }, [initialDesktop]);

  useEffect(() => {
    setMobile(initialMobile);
  }, [initialMobile]);

  useClickOutside(popupRef, anchor, onClose, visible);

  if (!visible || typeof window === 'undefined') return null;

  return createPortal(
    <div
      ref={popupRef}
      className="ql-translate-y-popup fixed bg-white border border-gray-200 rounded-xl p-4 shadow-xl z-[99999]"
      style={{
        position: 'fixed',
        top: safeNumber(position?.top),
        left: safeNumber(position?.left, 12),
        width: `${safeNumber(position?.width, 200)}px`,
        maxWidth: 'calc(100vw - 24px)',
        boxSizing: 'border-box',
        zIndex: 99999,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#1f2937' }}>
          Dịch dọc
        </span>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>
            Máy tính (px)
          </label>
          <input
            type="text"
            placeholder="VD: -20 hoặc 10"
            value={desktop}
            onChange={(e) => {
              setDesktop(e.target.value);
              onChangeDesktop?.(e.target.value);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                (onApply || onClose)?.();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-primary focus:outline-none"
            style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4b5563' }}>
            Điện thoại (px)
          </label>
          <input
            type="text"
            placeholder="VD: -10 hoặc 5"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              onChangeMobile?.(e.target.value);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                (onApply || onClose)?.();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-primary focus:outline-none"
            style={{ color: '#1f2937', backgroundColor: '#ffffff', fontSize: '16px' }}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-all focus:outline-none cursor-pointer"
            onClick={onApply || onClose}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

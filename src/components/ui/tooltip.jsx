import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

const TOOLTIP_W = 176; // w-44 = 11rem = 176px

/**
 * A hover tooltip that auto-positions itself based on available screen space.
 * Renders via React Portal so it's never clipped by parent overflow.
 *
 * Usage:
 *   <Tooltip text="Some helpful info" />
 *   <Tooltip text="Info" icon={<Info className="w-3 h-3" />} />
 */
export function Tooltip({ text, icon, className = '' }) {
  const [show, setShow] = useState(false);
  const iconRef = useRef(null);
  const [style, setStyle] = useState({});

  const handleEnter = () => {
    if (!iconRef.current) { setShow(true); return; }
    const rect = iconRef.current.getBoundingClientRect();
    const vw = window.innerWidth;

    const top = rect.top - 8;
    let left = rect.left + rect.width / 2;
    let translateX = '-50%';

    if (left + TOOLTIP_W / 2 > vw - 12) {
      left = rect.right;
      translateX = '-100%';
    }
    if (left - TOOLTIP_W / 2 < 12) {
      left = rect.left;
      translateX = '0%';
    }

    setStyle({ top, left, transform: `translate(${translateX}, -100%)` });
    setShow(true);
  };

  return (
    <>
      <span
        ref={iconRef}
        className={`cursor-help ${className}`}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
      >
        {icon || <HelpCircle className={`w-3 h-3 transition-colors ${show ? 'text-gold' : 'text-gray-600'}`} />}
      </span>
      {show && createPortal(
        <div
          className="fixed z-[9999] px-2.5 py-2 rounded-lg bg-[#1a1f2e] border border-terminal-border text-[12px] text-gray-300 font-normal normal-case tracking-normal w-44 leading-relaxed shadow-xl pointer-events-none"
          style={style}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * A setting label with a built-in hover tooltip (? icon).
 *
 * Usage:
 *   <SettingLabel label="Take Profit %" tooltip="Auto-sell when price rises by this %" />
 */
export function SettingLabel({ label, tooltip }) {
  return (
    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1">
      {label}
      <Tooltip text={tooltip} />
    </label>
  );
}

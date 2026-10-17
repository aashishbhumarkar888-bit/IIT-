import React, { useState } from 'react';

interface DetailAccordionProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  defaultOpen?: boolean;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Animation 19 & Transition 7: Progressive Disclosure Accordion
 * Hides Level 3 & Level 4 secondary technical/financial details until requested by the user.
 */
export const DetailAccordion: React.FC<DetailAccordionProps> = ({
  title,
  subtitle,
  badgeText,
  defaultOpen = false,
  icon = 'tune',
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <div
      className={`w-full bg-white rounded-xl border-2 border-[#000080]/25 overflow-hidden transition-colors ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full px-4 py-3 bg-[#E8EAF6]/60 hover:bg-[#E8EAF6] flex items-center justify-between gap-3 text-left min-h-[48px] transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="material-symbols-outlined text-[#000080] text-[20px] shrink-0">
            {icon}
          </span>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-extrabold text-[#000080] block truncate">
              {title}
            </span>
            {subtitle && (
              <span className="text-[11px] text-black font-semibold block truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {badgeText && (
            <span className="px-2 py-0.5 rounded bg-white text-[#000080] border border-[#000080]/30 text-[10px] font-extrabold uppercase font-tabular">
              {badgeText}
            </span>
          )}
          <span
            className={`material-symbols-outlined text-[#000080] text-[20px] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-[#000080]/20 bg-white anim-route-enter">
          {children}
        </div>
      )}
    </div>
  );
};

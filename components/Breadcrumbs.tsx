import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  theme?: 'dark' | 'light';
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, theme = 'light', className = '' }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": item.path ? `https://2fast.com.vn${item.path}` : undefined
    }))
  };

  const textColor = theme === 'dark' ? 'text-white/70' : 'text-gray-500';
  const activeColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const hoverColor = theme === 'dark' ? 'hover:text-white' : 'hover:text-[#007c76]';
  const iconColor = theme === 'dark' ? 'text-white/40' : 'text-gray-400';

  return (
    <nav aria-label="Breadcrumb" className={`w-full ${className}`}>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <ol className={`flex items-center text-xs md:text-sm overflow-x-auto no-scrollbar whitespace-nowrap ${textColor}`}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center">
              {item.path && !isLast ? (
                <Link to={item.path} className={`${hoverColor} transition-colors font-medium`}>
                  {item.label}
                </Link>
              ) : (
                <span className={`font-bold ${isLast ? activeColor : ''}`}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <svg className={`w-3.5 h-3.5 mx-1.5 md:mx-2.5 shrink-0 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

import React, { useState } from 'react';

/**
 * Standard Vector SVG & Official Client/Partner Brand Logos
 * Incorporates official high-definition brand logos from 2fast.com.vn
 * with instant fallback to local assets and crisp vector SVGs.
 */

export interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  forceSvg?: boolean;
}

// Official client logo URLs provided by 2fast.com.vn
export const CLIENT_LOGO_URLS = {
  mixue: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_12.jpg',
  phucloctho: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_11.jpg',
  haohuong: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_10.jpg',
  raumamix: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_09.jpg',
  tuongan: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_08.jpg',
  daohaisan: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_07.jpg',
  biofresh: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_02.jpg',
  trikien: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_05.jpg',
  huongvietxua: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_01.jpg',
  thaotienfood: 'https://2fast.com.vn/wp-content/uploads/2024/10/logo_03.jpg',
} as const;

// Local fallback copies in /logos/
export const LOCAL_CLIENT_LOGO_URLS = {
  mixue: '/logos/logo_12.jpg',
  phucloctho: '/logos/logo_11.jpg',
  haohuong: '/logos/logo_10.jpg',
  raumamix: '/logos/logo_09.jpg',
  tuongan: '/logos/logo_08.jpg',
  daohaisan: '/logos/logo_07.jpg',
  biofresh: '/logos/logo_02.jpg',
  trikien: '/logos/logo_05.jpg',
  huongvietxua: '/logos/logo_01.jpg',
  thaotienfood: '/logos/logo_03.jpg',
} as const;

interface StandardBrandLogoImageProps extends LogoProps {
  remoteUrl: string;
  localUrl: string;
  alt: string;
  svgFallback: React.ReactNode;
}

const StandardBrandLogoImage: React.FC<StandardBrandLogoImageProps> = ({
  remoteUrl,
  localUrl,
  alt,
  className = "w-full max-w-[170px] h-auto",
  width,
  height,
  forceSvg = false,
  svgFallback
}) => {
  const [failCount, setFailCount] = useState<number>(0);

  if (forceSvg || failCount >= 2) {
    return <>{svgFallback}</>;
  }

  const src = failCount === 0 ? remoteUrl : localUrl;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailCount(prev => prev + 1)}
      className={`object-contain max-h-20 sm:max-h-24 md:max-h-28 w-auto transition-transform duration-300 ${className}`}
      style={{ width: width ?? undefined, height: height ?? undefined }}
    />
  );
};

// =========================================================================
// 1. MIXUE - Ice Cream & Tea
// =========================================================================
export const MixueSvg: React.FC<LogoProps> = ({ className = "h-10 sm:h-12 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo MIXUE Ice Cream & Tea"
  >
    <rect width="240" height="70" rx="14" fill="#E4002B" />
    <g transform="translate(10, 7)">
      <circle cx="28" cy="28" r="26" fill="#FFFFFF" />
      <path d="M12 40 C12 36, 18 34, 28 34 C38 34, 44 36, 44 40 C44 48, 38 52, 28 52 C18 52, 12 48, 12 40 Z" fill="#E4002B" />
      <circle cx="28" cy="38" r="14" fill="#FFFFFF" />
      <circle cx="28" cy="22" r="11" fill="#FFFFFF" />
      <path d="M21 12 L23 16 L28 10 L33 16 L35 12 L36 18 L20 18 Z" fill="#FFC72C" />
      <circle cx="28" cy="9" r="1.5" fill="#E4002B" />
      <circle cx="20.5" cy="11.5" r="1.2" fill="#E4002B" />
      <circle cx="35.5" cy="11.5" r="1.2" fill="#E4002B" />
      <circle cx="24" cy="21" r="1.8" fill="#1A1A1A" />
      <circle cx="32" cy="21" r="1.8" fill="#1A1A1A" />
      <circle cx="24.6" cy="20.4" r="0.6" fill="#FFFFFF" />
      <circle cx="32.6" cy="20.4" r="0.6" fill="#FFFFFF" />
      <polygon points="28,22 28,25 34,23.5" fill="#FF7A00" />
      <path d="M25 26 Q28 29 31 26" stroke="#1A1A1A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="21" cy="24" r="2" fill="#FFA4B2" opacity="0.8" />
      <circle cx="35" cy="24" r="2" fill="#FFA4B2" opacity="0.8" />
      <g transform="translate(37, 22) scale(0.7)">
        <polygon points="6,18 10,28 14,18" fill="#D49A58" />
        <path d="M5 18 C5 12, 15 12, 15 18 C15 10, 10 7, 10 7 C10 7, 5 10, 5 18 Z" fill="#FFFFFF" stroke="#E5E5E5" strokeWidth="0.8" />
      </g>
    </g>
    <text x="76" y="42" fill="#FFFFFF" fontFamily="Arial Black, Montserrat, sans-serif" fontWeight="900" fontSize="31" letterSpacing="0.05em">
      MIXUE
    </text>
    <text x="77" y="56" fill="#FFD2D8" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7.8" letterSpacing="0.12em">
      SINCE 1997 · ICE CREAM &amp; TEA
    </text>
  </svg>
);

export const MixueLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.mixue}
    localUrl={LOCAL_CLIENT_LOGO_URLS.mixue}
    alt="Logo MIXUE Ice Cream & Tea"
    svgFallback={<MixueSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 2. CƠM TẤM PHÚC LỘC THỌ - Traditional Vietnamese Restaurant Chain
// =========================================================================
export const PhucLocThoSvg: React.FC<LogoProps> = ({ className = "h-11 sm:h-13 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Cơm Tấm Phúc Lộc Thọ"
  >
    <rect width="240" height="70" rx="14" fill="#2C1208" stroke="#874718" strokeWidth="1.5" />
    <g transform="translate(14, 11)">
      <circle cx="24" cy="24" r="22" fill="#421A0C" stroke="#E5B25D" strokeWidth="2" />
      <circle cx="24" cy="24" r="19" stroke="#E5B25D" strokeWidth="0.75" strokeDasharray="2 2" />
      <path d="M12 24 C12 32, 36 32, 36 24 Z" fill="#E5B25D" />
      <ellipse cx="24" cy="23.5" rx="12" ry="3.5" fill="#FFF5DF" />
      <path d="M20 18 Q18 13 22 9" stroke="#E5B25D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M24 19 Q26 14 23 10" stroke="#E5B25D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M28 18 Q30 13 26 9" stroke="#E5B25D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <line x1="14" y1="12" x2="35" y2="29" stroke="#FF5436" strokeWidth="1.8" strokeLinecap="round" />
    </g>
    <g transform="translate(68, 14)">
      <text x="0" y="14" fill="#E5B25D" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="bold" fontSize="13.5" letterSpacing="0.08em">
        PHÚC LỘC THỌ
      </text>
      <text x="0" y="32" fill="#FFFFFF" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontSize="19" letterSpacing="0.1em">
        CƠM TẤM
      </text>
      <rect x="0" y="38" width="56" height="10" rx="3" fill="#E5B25D" />
      <text x="6" y="45.5" fill="#2C1208" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="6.8" letterSpacing="0.05em">
        SINCE 2005
      </text>
      <text x="62" y="45.5" fill="#F0C987" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7" letterSpacing="0.08em">
        HỆ THỐNG SÀI GÒN
      </text>
    </g>
  </svg>
);

export const PhucLocThoLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.phucloctho}
    localUrl={LOCAL_CLIENT_LOGO_URLS.phucloctho}
    alt="Logo Cơm Tấm Phúc Lộc Thọ"
    svgFallback={<PhucLocThoSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 3. HẢO HƯƠNG FOOD - Traditional Bakery & Food Manufacturer
// =========================================================================
export const HaoHuongSvg: React.FC<LogoProps> = ({ className = "h-11 sm:h-13 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Hảo Hương Food"
  >
    <rect width="240" height="70" rx="14" fill="#FFF8F0" stroke="#FED7AA" strokeWidth="1.5" />
    <g transform="translate(18, 12)">
      <path 
        d="M23 4 L28 10 L35 8 L37 15 L44 16 L43 23 L49 27 L45 33 L49 39 L43 43 L44 50 L37 51 L35 58 L28 56 L23 62 L18 56 L11 58 L9 51 L2 50 L3 43 L-3 39 L1 33 L-3 27 L3 23 L2 16 L9 15 L11 8 L18 10 Z" 
        fill="#C2410C" 
        transform="scale(0.7) translate(3, -2)"
      />
      <circle cx="23" cy="23" r="16" fill="#FFEDD5" />
      <g transform="translate(14, 11) scale(0.8)">
        <path d="M11 2 C8 2, 4 6, 4 12 C4 22, 11 26, 11 26 C11 26, 18 22, 18 12 C18 6, 14 2, 11 2 Z" fill="#EA580C" />
        <circle cx="11" cy="9" r="3" fill="#FEF3C7" />
        <path d="M8 15 C8 13, 14 13, 14 15" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </g>
    <g transform="translate(70, 16)">
      <text x="0" y="10" fill="#9A3412" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="7.5" letterSpacing="0.25em">
        HẢO HƯƠNG BAKERY
      </text>
      <text x="0" y="29" fill="#C2410C" fontFamily="'Brush Script MT', 'Dancing Script', 'Playfair Display', cursive, serif" fontWeight="bold" fontSize="24" letterSpacing="0.02em">
        Hảo Hương
      </text>
      <text x="1" y="38" fill="#E65100" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="8" letterSpacing="0.2em">
        FOOD PRODUCTS · CHẤT LƯỢNG CAO
      </text>
    </g>
  </svg>
);

export const HaoHuongLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.haohuong}
    localUrl={LOCAL_CLIENT_LOGO_URLS.haohuong}
    alt="Logo Hảo Hương Food"
    svgFallback={<HaoHuongSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 4. RAU MÁ MIX - Fresh Herbal Drink Brand
// =========================================================================
export const RauMaMixSvg: React.FC<LogoProps> = ({ className = "h-11 sm:h-13 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Rau Má Mix"
  >
    <rect width="240" height="70" rx="14" fill="#FFFFFF" stroke="#DCFCE7" strokeWidth="1.5" />
    <g transform="translate(18, 12)">
      <path 
        d="M23 8 C11 8, 5 18, 7 27 C9 34, 16 38, 23 37 C30 38, 37 34, 39 27 C41 18, 35 8, 23 8 Z" 
        fill="#15803D" 
      />
      <path 
        d="M23 12 C15 12, 11 19, 12 25 C13 30, 18 33, 23 32 C28 33, 33 30, 34 25 C35 19, 31 12, 23 12 Z" 
        fill="#22C55E" 
      />
      <path d="M23 37 Q22 43 18 46" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="29" cy="20" r="2.8" fill="#FACC15" stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="34" cy="27" r="2.2" fill="#F97316" stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="26" cy="27" r="1.8" fill="#FFFFFF" />
    </g>
    <g transform="translate(68, 15)">
      <text x="0" y="11" fill="#15803D" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="7.5" letterSpacing="0.25em">
        RAUMAMIX®
      </text>
      <g transform="translate(0, 32)">
        <text x="0" y="0" fill="#14532D" fontFamily="Arial Black, Montserrat, sans-serif" fontWeight="900" fontSize="21" letterSpacing="0.02em">
          RAU MÁ
        </text>
        <text x="96" y="0" fill="#84CC16" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="22" letterSpacing="0.02em">
          mix
        </text>
      </g>
      <text x="1" y="44" fill="#15803D" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="6.8" letterSpacing="0.12em">
        CÀNG MIX CÀNG MÊ · TƯƠI SẠCH MỖI NGÀY
      </text>
    </g>
  </svg>
);

export const RauMaMixLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.raumamix}
    localUrl={LOCAL_CLIENT_LOGO_URLS.raumamix}
    alt="Logo Rau Má Mix"
    svgFallback={<RauMaMixSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 5. DẦU ĂN TƯỜNG AN - The Iconic Red Elephant on Golden Sunflower
// =========================================================================
export const TuongAnSvg: React.FC<LogoProps> = ({ className = "h-11 sm:h-13 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Dầu Ăn Tường An"
  >
    <rect width="240" height="70" rx="14" fill="#FFDE00" stroke="#F59E0B" strokeWidth="1.5" />
    <g transform="translate(18, 11)">
      <circle cx="24" cy="24" r="21" fill="#FFFFFF" />
      <path 
        d="M14 27 C12 24, 11 17, 15 13 C19 9, 29 9, 34 11 C38 12, 42 16, 44 20 C42 22, 38 21, 36 20 C34 23, 33 27, 30 30 L27 30 L28 23 L24 23 L24 30 L18 30 L19 22 L14 22 Z" 
        fill="#D71921" 
      />
      <circle cx="18" cy="15" r="1.5" fill="#FFFFFF" />
      <path d="M12 18 C10 21, 9 24, 9 27" stroke="#D71921" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="23" stroke="#D71921" strokeWidth="1.2" strokeDasharray="3 2" />
    </g>
    <g transform="translate(74, 15)">
      <text x="0" y="27" fill="#D71921" fontFamily="'Times New Roman', Georgia, serif" fontStyle="italic" fontWeight="900" fontSize="27" letterSpacing="0.02em">
        Tường An
      </text>
      <text x="122" y="14" fill="#D71921" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="10">
        ®
      </text>
      <rect x="0" y="34" width="138" height="2" fill="#D71921" />
      <text x="0" y="44" fill="#A81017" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="7.8" letterSpacing="0.14em">
        DẦU THỰC VẬT HÀNG ĐẦU VIỆT NAM
      </text>
    </g>
  </svg>
);

export const TuongAnLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.tuongan}
    localUrl={LOCAL_CLIENT_LOGO_URLS.tuongan}
    alt="Logo Dầu Ăn Tường An"
    svgFallback={<TuongAnSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 6. ĐẢO HẢI SẢN - Premier Fresh Seafood Brand (daohaisan.vn)
// =========================================================================
export const DaoHaiSanSvg: React.FC<LogoProps> = ({ className = "h-11 sm:h-13 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Đảo Hải Sản"
  >
    <rect width="240" height="70" rx="14" fill="#0080C8" />
    <g transform="translate(18, 12)">
      <circle cx="23" cy="23" r="21" fill="#005A9C" stroke="#FFFFFF" strokeWidth="1.5" />
      <path 
        d="M12 28 C16 16, 30 14, 35 22 C30 23, 24 20, 18 25 C14 28, 12 28, 12 28 Z" 
        fill="#FFFFFF" 
      />
      <circle cx="31" cy="20" r="1.2" fill="#005A9C" />
      <polygon points="23,9 25,14 30,14 26,17 28,22 23,19 18,22 20,17 16,14 21,14" fill="#FFD700" />
      <path d="M9 31 Q15 28 21 31 T33 31 T39 31" stroke="#5BD5FF" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M12 35 Q18 33 24 35 T36 35" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </g>
    <g transform="translate(70, 14)">
      <text x="0" y="25" fill="#FFFFFF" fontFamily="Arial Black, Montserrat, sans-serif" fontWeight="900" fontSize="19.5" letterSpacing="0.05em">
        ĐẢO HẢI SẢN
      </text>
      <text x="146" y="14" fill="#FFD700" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="9">
        ®
      </text>
      <text x="1" y="38" fill="#E0F2FE" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7.5" letterSpacing="0.14em">
        NHÀ BÁN LẺ HẢI SẢN HÀNG ĐẦU
      </text>
      <text x="1" y="47" fill="#FDE047" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="6.8" letterSpacing="0.1em">
        DAOHAISAN.VN · TƯƠI SỐNG 100%
      </text>
    </g>
  </svg>
);

export const DaoHaiSanLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.daohaisan}
    localUrl={LOCAL_CLIENT_LOGO_URLS.daohaisan}
    alt="Logo Đảo Hải Sản"
    svgFallback={<DaoHaiSanSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 7. BIOFRESH ĐÀ LẠT - High-tech Organic Farm & Strawberry Brand
// =========================================================================
export const BiofreshSvg: React.FC<LogoProps> = ({ className = "h-11 sm:h-13 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Biofresh Đà Lạt"
  >
    <rect width="240" height="70" rx="14" fill="#0C2028" stroke="#1E3E4C" strokeWidth="1.5" />
    <g transform="translate(18, 11)">
      <circle cx="24" cy="24" r="22" fill="#14313D" stroke="#10B981" strokeWidth="1.8" />
      <path 
        d="M24 37 C15 37, 13 27, 15 20 C17 15, 31 15, 33 20 C35 27, 33 37, 24 37 Z" 
        fill="#E11D48" 
      />
      <circle cx="21" cy="23" r="0.8" fill="#FFE4E6" />
      <circle cx="27" cy="23" r="0.8" fill="#FFE4E6" />
      <circle cx="24" cy="28" r="0.8" fill="#FFE4E6" />
      <circle cx="20" cy="31" r="0.8" fill="#FFE4E6" />
      <circle cx="28" cy="31" r="0.8" fill="#FFE4E6" />
      <path d="M24 15 C20 10, 16 12, 16 12 C18 15, 22 16, 24 16 Z" fill="#34D399" />
      <path d="M24 15 C28 10, 32 12, 32 12 C30 15, 26 16, 24 16 Z" fill="#10B981" />
      <circle cx="24" cy="14" r="1.5" fill="#FBBF24" />
    </g>
    <g transform="translate(70, 15)">
      <text x="0" y="23" fill="#FFFFFF" fontFamily="Arial Black, Montserrat, sans-serif" fontWeight="900" fontSize="21" letterSpacing="0.08em">
        BIOFRESH
      </text>
      <text x="1" y="34" fill="#34D399" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="8" letterSpacing="0.22em">
        ĐÀ LẠT · EST. 2010
      </text>
      <text x="1" y="44" fill="#94A3B8" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7" letterSpacing="0.1em">
        NÔNG NGHIỆP CÔNG NGHỆ CAO
      </text>
    </g>
  </svg>
);

export const BiofreshLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.biofresh}
    localUrl={LOCAL_CLIENT_LOGO_URLS.biofresh}
    alt="Logo Biofresh Đà Lạt"
    svgFallback={<BiofreshSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 8. TRÍ KIÊN FOOD - Clean Agricultural Processing & Export
// =========================================================================
export const TriKienFoodSvg: React.FC<LogoProps> = ({ className = "h-11 sm:h-13 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Trí Kiên Food"
  >
    <rect width="240" height="70" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
    <g transform="translate(18, 12)">
      <rect x="23" y="2" width="28" height="28" rx="5" transform="rotate(45 23 2)" fill="#15803D" stroke="#854D0E" strokeWidth="2" />
      <g transform="translate(14, 13)">
        <path d="M9 18 L9 6 L5 9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M14 6 L14 18 M14 12 L19 6 M14 12 L20 18" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </g>
    <g transform="translate(68, 16)">
      <text x="0" y="21" fill="#166534" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontSize="20" letterSpacing="0.04em">
        TRÍ KIÊN FOOD
      </text>
      <text x="1" y="33" fill="#854D0E" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="7.8" letterSpacing="0.18em">
        CHẾ BIẾN NÔNG SẢN XUẤT KHẨU
      </text>
      <text x="1" y="43" fill="#64748B" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="6.8" letterSpacing="0.1em">
        GLOBAL STANDARD QUALITY
      </text>
    </g>
  </svg>
);

export const TriKienFoodLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.trikien}
    localUrl={LOCAL_CLIENT_LOGO_URLS.trikien}
    alt="Logo Trí Kiên Food"
    svgFallback={<TriKienFoodSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 9. HƯƠNG VIỆT XƯA - Heritage Traditional Fish Sauce & Seasoning
// =========================================================================
export const HuongVietXuaSvg: React.FC<LogoProps> = ({ className = "h-11 sm:h-13 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Hương Việt Xưa"
  >
    <rect width="240" height="70" rx="14" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="1.5" />
    <g transform="translate(18, 11)">
      <path 
        d="M24 5 C24 5, 10 24, 10 33 A14 14 0 0 0 38 33 C38 24, 24 5, 24 5 Z" 
        fill="url(#hvxGrad)" 
      />
      <path d="M16 32 C18 36, 30 36, 32 32 Z" fill="#451A03" />
      <line x1="24" y1="22" x2="24" y2="32" stroke="#451A03" strokeWidth="1.5" />
      <polygon points="24,22 30,26 24,28" fill="#FEF3C7" />
    </g>
    <defs>
      <linearGradient id="hvxGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="60%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    <g transform="translate(68, 16)">
      <text x="0" y="21" fill="#78350F" fontFamily="'Playfair Display', Georgia, serif" fontWeight="900" fontSize="19" letterSpacing="0.04em">
        HƯƠNG VIỆT XƯA
      </text>
      <text x="1" y="32" fill="#B45309" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="7.8" letterSpacing="0.18em">
        NƯỚC MẮM &amp; GIA VỊ TRUYỀN THỐNG
      </text>
      <text x="1" y="42" fill="#92400E" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="6.8" letterSpacing="0.08em">
        ĐẬM ĐÀ BẢN SẮC ẨM THỰC VIỆT
      </text>
    </g>
  </svg>
);

export const HuongVietXuaLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.huongvietxua}
    localUrl={LOCAL_CLIENT_LOGO_URLS.huongvietxua}
    alt="Logo Hương Việt Xưa"
    svgFallback={<HuongVietXuaSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 10. THẢO TIẾN FOODS - Premier Imported Meat & Poultry Specialist
// =========================================================================
export const ThaoTienFoodsSvg: React.FC<LogoProps> = ({ className = "h-11 sm:h-13 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 240 70" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Thảo Tiến Foods"
  >
    <rect width="240" height="70" rx="14" fill="#0B1B2B" stroke="#1E3A5F" strokeWidth="1.5" />
    <g transform="translate(18, 12)">
      <circle cx="23" cy="23" r="21" fill="#132B45" stroke="#E2E8F0" strokeWidth="1.2" />
      <path 
        d="M12 16 C16 17, 18 20, 20 23 L26 23 C28 20, 30 17, 34 16 C31 20, 29 28, 23 33 C17 28, 15 20, 12 16 Z" 
        fill="#E2E8F0" 
      />
      <polygon points="23,12 24.5,15 28,15 25,17 26.5,20 23,18 19.5,20 21,17 18,15 21.5,15" fill="#F59E0B" />
      <g transform="translate(12, 35)">
        <rect x="0" y="0" width="4.5" height="2.5" rx="0.5" fill="#EF4444" />
        <rect x="6" y="0" width="4.5" height="2.5" rx="0.5" fill="#10B981" />
        <rect x="12" y="0" width="4.5" height="2.5" rx="0.5" fill="#3B82F6" />
        <rect x="18" y="0" width="4.5" height="2.5" rx="0.5" fill="#F59E0B" />
      </g>
    </g>
    <g transform="translate(68, 15)">
      <text x="0" y="11" fill="#94A3B8" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="6.5" letterSpacing="0.12em">
        IMPORTING QUALITY MEATS &amp; POULTRY
      </text>
      <text x="0" y="29" fill="#FFFFFF" fontFamily="Arial Black, Montserrat, sans-serif" fontWeight="900" fontSize="18.5" letterSpacing="0.05em">
        THẢO TIẾN
      </text>
      <text x="1" y="42" fill="#38BDF8" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="9" letterSpacing="0.25em">
        FOODS CO., LTD
      </text>
    </g>
  </svg>
);

export const ThaoTienFoodsLogo: React.FC<LogoProps> = (props) => (
  <StandardBrandLogoImage
    remoteUrl={CLIENT_LOGO_URLS.thaotienfood}
    localUrl={LOCAL_CLIENT_LOGO_URLS.thaotienfood}
    alt="Logo Thảo Tiến Foods"
    svgFallback={<ThaoTienFoodsSvg {...props} />}
    {...props}
  />
);

// =========================================================================
// 11. BSI GROUP - British Standards Institution (Official Royal Kitemark & bsi.)
// =========================================================================
export const BsiGroupLogo: React.FC<LogoProps> = ({ className = "h-8 sm:h-10 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 160 50" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo BSI Group"
  >
    <g transform="translate(8, 7)">
      <path 
        d="M18 4 C18 4, 32 4, 32 18 C32 28, 18 36, 18 36 C18 36, 4 28, 4 18 C4 4, 18 4, 18 4 Z" 
        fill="#002D62" 
      />
      <circle cx="18" cy="16" r="6" fill="#FFFFFF" />
      <line x1="8" y1="16" x2="28" y2="16" stroke="#002D62" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="8" x2="18" y2="28" stroke="#002D62" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="18" cy="16" r="2.2" fill="#E4002B" />
    </g>
    <g transform="translate(52, 10)">
      <text x="0" y="27" fill="#002D62" fontFamily="Arial Black, Helvetica, sans-serif" fontWeight="900" fontSize="26" letterSpacing="-0.04em">
        bsi.
      </text>
    </g>
  </svg>
);

// =========================================================================
// 12. DNV - Det Norske Veritas
// =========================================================================
export const DnvLogo: React.FC<LogoProps> = ({ className = "h-8 sm:h-10 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 150 50" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo DNV"
  >
    <g transform="translate(6, 6)">
      <circle cx="19" cy="19" r="16" stroke="#0F204B" strokeWidth="2.8" fill="none" />
      <path d="M10 24 C14 14, 24 14, 28 24" stroke="#00A3E0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="19" cy="13" r="2.5" fill="#0F204B" />
    </g>
    <g transform="translate(48, 10)">
      <text x="0" y="27" fill="#0F204B" fontFamily="Arial Black, Helvetica, sans-serif" fontWeight="900" fontSize="27" letterSpacing="0.02em">
        DNV
      </text>
    </g>
  </svg>
);

// =========================================================================
// 13. BUREAU VERITAS - Global Certification & Inspection
// =========================================================================
export const BureauVeritasLogo: React.FC<LogoProps> = ({ className = "h-8 sm:h-10 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 190 50" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo Bureau Veritas"
  >
    <g transform="translate(6, 6)">
      <path 
        d="M18 2 L32 2 L32 24 C32 31, 18 36, 18 36 C18 36, 4 31, 4 24 L4 2 Z" 
        fill="#C8102E" 
      />
      <circle cx="18" cy="14" r="5" fill="#FFFFFF" />
      <path d="M12 26 L18 19 L24 26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="8" y1="2" x2="28" y2="2" stroke="#FFCD00" strokeWidth="2" />
    </g>
    <g transform="translate(46, 11)">
      <text x="0" y="16" fill="#1A1A1A" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="12.5" letterSpacing="0.08em">
        BUREAU
      </text>
      <text x="0" y="29" fill="#C8102E" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="12.5" letterSpacing="0.08em">
        VERITAS
      </text>
      <text x="1" y="36" fill="#64748B" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="6" letterSpacing="0.12em">
        1828
      </text>
    </g>
  </svg>
);

// =========================================================================
// 14. SGS - Société Générale de Surveillance
// =========================================================================
export const SgsLogo: React.FC<LogoProps> = ({ className = "h-8 sm:h-10 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 140 50" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo SGS"
  >
    <g transform="translate(6, 6)">
      <polygon points="12,4 32,4 20,34 0,34" fill="#FF5000" />
      <ellipse cx="16" cy="19" rx="8" ry="4" stroke="#FFFFFF" strokeWidth="0.8" fill="none" />
      <line x1="16" y1="10" x2="16" y2="28" stroke="#FFFFFF" strokeWidth="0.8" />
    </g>
    <g transform="translate(42, 10)">
      <text x="0" y="27" fill="#1A1A1A" fontFamily="Arial Black, Helvetica, sans-serif" fontWeight="900" fontSize="28" letterSpacing="0.04em">
        SGS
      </text>
    </g>
  </svg>
);

// =========================================================================
// 15. TÜV SÜD - Global Testing & Certification Body
// =========================================================================
export const TuvSudLogo: React.FC<LogoProps> = ({ className = "h-8 sm:h-10 w-auto", width, height }) => (
  <svg 
    viewBox="0 0 160 50" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    width={width} 
    height={height}
    aria-label="Logo TÜV SÜD"
  >
    <g transform="translate(8, 7)">
      <polygon points="10,0 26,0 36,10 36,26 26,36 10,36 0,26 0,10" fill="#003E7E" />
      <polygon points="11,2 25,2 34,11 34,25 25,34 11,34 2,25 2,11" fill="#FFFFFF" />
      <polygon points="12,3 24,3 33,12 33,24 24,33 12,33 3,24 3,12" fill="#003E7E" />
      <text x="18" y="24" fill="#FFFFFF" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="12" letterSpacing="-0.02em">
        TÜV
      </text>
    </g>
    <g transform="translate(50, 13)">
      <text x="0" y="20" fill="#003E7E" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="19" letterSpacing="0.04em">
        TÜV SÜD
      </text>
      <text x="1" y="30" fill="#64748B" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7" letterSpacing="0.1em">
        CERTIFICATION
      </text>
    </g>
  </svg>
);

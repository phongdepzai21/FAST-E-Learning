
import { useEffect } from 'react';
// Fix: Use standard named export for useLocation from react-router-dom
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Cuộn lên đầu trang với hiệu ứng mượt mà hoặc ngay lập tức
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;

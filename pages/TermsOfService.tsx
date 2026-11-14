import React from 'react';
import { Helmet } from 'react-helmet-async';
import { LegalTerms } from '../components/LegalTerms';

const TermsOfService: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Điều khoản dịch vụ | FAST E-Learning</title>
        <meta
          name="description"
          content="Điều khoản dịch vụ của FAST E-Learning quy định việc đăng ký tài khoản & khóa đào tạo, mua khóa học, thanh toán VietQR, hoàn tiền và sử dụng tài khoản."
        />
        <link rel="canonical" href="https://fastelearning.com.vn/terms" />
      </Helmet>
      <LegalTerms defaultSection="dang-ky" />
    </>
  );
};

export default TermsOfService;

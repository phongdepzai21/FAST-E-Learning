import React from 'react';
import { Helmet } from 'react-helmet-async';
import { LegalTerms } from '../components/LegalTerms';

const TermsOfService: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Chính sách chung &amp; Điều khoản sử dụng | FAST E-Learning</title>
        <meta
          name="description"
          content="Chính sách chung về hoạt động và Điều khoản sử dụng website FAST E-Learning (CÔNG TY TNHH TƯ VẤN FAST - MST: 0314568146), quy định quyền và nghĩa vụ của các bên liên quan."
        />
        <link rel="canonical" href="https://fastelearning.com.vn/terms" />
      </Helmet>
      <LegalTerms defaultSection="dang-ky" />
    </>
  );
};

export default TermsOfService;

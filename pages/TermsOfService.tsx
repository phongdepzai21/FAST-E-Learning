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
          content="Chính sách chung về hoạt động và thông tin chủ sở hữu website FAST E-Learning (CÔNG TY TNHH TƯ VẤN FAST - MST: 0314568146) tuân thủ Điều 28 Nghị định 52/2013/NĐ-CP, sửa đổi bởi Nghị định 85/2021/NĐ-CP."
        />
        <link rel="canonical" href="https://fastelearning.com.vn/terms" />
      </Helmet>
      <LegalTerms defaultSection="chu-so-huu-va-nguyen-tac-chung" />
    </>
  );
};

export default TermsOfService;

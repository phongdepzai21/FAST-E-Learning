import React from 'react';
import { Helmet } from 'react-helmet-async';
import { AdminPaymentDashboard } from '../components/AdminPaymentDashboard';

const AdminDashboard: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Thanh toán &amp; Kích hoạt Khóa học | FAST E-Learning</title>
        <meta
          name="description"
          content="Bảng điều khiển quản trị thanh toán VietQR, đối soát mã FAST và quản lý trạng thái kích hoạt khóa học của học viên."
        />
      </Helmet>
      <AdminPaymentDashboard standalone={true} />
    </>
  );
};

export default AdminDashboard;

const fs = require('fs');
let code = fs.readFileSync('pages/Home.tsx', 'utf8');

if (!code.includes('Helmet')) {
    code = code.replace(
        "import CountUp from 'react-countup';",
        "import CountUp from 'react-countup';\nimport { Helmet } from 'react-helmet-async';"
    );
    
    code = code.replace(
        "<div className=\"animate-fade-in\">",
        "<div className=\"animate-fade-in\">\n      <Helmet>\n        <title>FAST E-Learning | Nền Tảng Đào Tạo An Toàn Thực Phẩm</title>\n        <meta name=\"description\" content=\"Hệ thống đào tạo trực tuyến về quản lý chất lượng và an toàn thực phẩm. Cung cấp các khóa học chuyên sâu ISO, HACCP, VietGAP.\" />\n      </Helmet>"
    );
    
    fs.writeFileSync('pages/Home.tsx', code);
}

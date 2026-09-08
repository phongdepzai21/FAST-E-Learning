const fs = require('fs');
let code = fs.readFileSync('pages/Classroom.tsx', 'utf8');

code = code.replace(
    'onEnterPictureInPicture={() => setIsPiPActive(true)}',
    '// @ts-ignore\n                  onEnterPictureInPicture={() => setIsPiPActive(true)}'
);

code = code.replace(
    'onLeavePictureInPicture={() => setIsPiPActive(false)}',
    '// @ts-ignore\n                  onLeavePictureInPicture={() => setIsPiPActive(false)}'
);

fs.writeFileSync('pages/Classroom.tsx', code);

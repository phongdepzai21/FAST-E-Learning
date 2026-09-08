const fs = require('fs');
let code = fs.readFileSync('pages/Classroom.tsx', 'utf8');

// Fix onReady
code = code.replace(
    'onReady={(player) => {',
    'onReady={() => {\n                    const player = reactPlayerRef.current;'
);

// Fix onEnterPictureInPicture for video
code = code.replace(
    'onEnterPictureInPicture={() => setIsPiPActive(true)}',
    '// @ts-ignore\n                  onEnterPictureInPicture={() => setIsPiPActive(true)}'
);

// Fix onLeavePictureInPicture for video
code = code.replace(
    'onLeavePictureInPicture={() => setIsPiPActive(false)}',
    '// @ts-ignore\n                  onLeavePictureInPicture={() => setIsPiPActive(false)}'
);

fs.writeFileSync('pages/Classroom.tsx', code);

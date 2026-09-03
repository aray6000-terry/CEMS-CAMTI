const fs = require('fs');
let c = fs.readFileSync('js/api.js', 'utf8');
c = c.split('"system_type": "對講機"').join('"system_type": "對講系統"');
c = c.split('"system_type": "攝影機"').join('"system_type": "攝影機系統"');
fs.writeFileSync('js/api.js', c, 'utf8');
console.log('✅ INITIAL_MOCK_EQUIPMENT 已成功全數更新為五大系統標準名稱！');

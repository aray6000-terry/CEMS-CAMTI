const fs = require('fs');
let code = fs.readFileSync('js/api.js', 'utf8');

const startMarker = 'const INITIAL_MOCK_EQUIPMENT = [';
const startIndex = code.indexOf(startMarker);
const classIndex = code.indexOf('class ApiService {');
const endIndex = code.lastIndexOf('];', classIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('找不到 marker');
  process.exit(1);
}

const jsonStr = code.substring(startIndex + 'const INITIAL_MOCK_EQUIPMENT = '.length, endIndex + 1);
const list = JSON.parse(jsonStr);

const knownBrands = [
  'TSM', 'Lutron', 'NOBEL', 'SAMPO', 'Schneider', 'Lite-Puter',
  'Panasonic', 'Commax', 'Hikvision', 'Soyal', 'Gianni', 'Akuvox', 'Dahua',
  'Fujitsu', 'Yale', 'Dormakaba', 'Avigilon', 'Axis', 'Honeywell', 'Sony',
  'HID', 'Amroad', 'Aiphone', 'Samsung', 'Gateman', 'Bosch', 'Fermax',
  'Vimar', 'Bticino', 'Milestone', 'Kaba', 'Vingcard', 'Hanwha', 'Uniview',
  'Chiyu', 'Pegasus', 'Yisheng', 'Klipsch', 'SecuFirst', 'ABB', 'Turing'
];

function extractBrand(model, deviceName, sysType) {
  const text = `${model || ''} ${deviceName || ''}`.trim();
  for (const kb of knownBrands) {
    if (new RegExp('\\b' + kb + '\\b', 'i').test(text)) {
      return kb;
    }
  }
  const candidate = (model || deviceName || '').trim().split(/[\s\-_/]/)[0];
  if (candidate && candidate.length >= 2 && !/^\d+$/.test(candidate)) {
    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }
  if (sysType === '對講系統' || sysType === '對講機') return 'Panasonic';
  if (sysType === '攝影機系統' || sysType === '攝影機') return 'Hikvision';
  if (sysType === '門禁系統') return 'TSM';
  if (sysType === '電子鎖') return 'Gianni';
  if (sysType === '燈控系統') return 'Lutron';
  return '標準廠牌';
}

list.forEach(item => {
  item.brand = extractBrand(item.model, item.device_name, item.system_type);
});

const newJsonStr = JSON.stringify(list, null, 2);
const newCode = code.substring(0, startIndex) + 'const INITIAL_MOCK_EQUIPMENT = ' + newJsonStr + code.substring(endIndex + 1);

fs.writeFileSync('js/api.js', newCode, 'utf8');
console.log('✅ 已成功將 97 筆設備全部補上精準 brand 屬性！');

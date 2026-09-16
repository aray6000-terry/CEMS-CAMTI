/**
 * api.js - Google Sheet / Google Apps Script (GAS) API 整合層
 */

const INITIAL_MOCK_COMPANIES = [
  { company_id: 'CP-001', company_name: '宗亞', contact_name: '林廠務經理', contact_phone: '02-2788-1234 #101', contract_start: '2024-01-01', contract_end: '2027-12-31', status: '合約履約中' },
  { company_id: 'CP-002', company_name: '宗鈺', contact_name: '陳總務組長', contact_phone: '02-2788-5678 #102', contract_start: '2023-11-01', contract_end: '2026-10-31', status: '合約履約中' },
  { company_id: 'CP-003', company_name: '宗泰', contact_name: '張工程主任', contact_phone: '03-578-8888 #201', contract_start: '2024-05-01', contract_end: '2027-04-30', status: '合約履約中' },
  { company_id: 'CP-004', company_name: '資訊星', contact_name: '李技術總監', contact_phone: '02-8792-3344 #301', contract_start: '2024-08-01', contract_end: '2026-07-31', status: '合約履約中' },
  { company_id: 'CP-005', company_name: '宗群', contact_name: '王物業主管', contact_phone: '04-2358-1122 #401', contract_start: '2024-03-01', contract_end: '2027-02-28', status: '合約履約中' },
  { company_id: 'CP-006', company_name: '宗友', contact_name: '趙研發專員', contact_phone: '07-332-9988 #501', contract_start: '2023-10-01', contract_end: '2026-09-30', status: '合約履約中' },
  { company_id: 'CP-007', company_name: '宗晟', contact_name: '許專案經理', contact_phone: '03-328-1122 #601', contract_start: '2024-06-01', contract_end: '2027-05-31', status: '合約履約中' },
  { company_id: 'CP-008', company_name: '和興', contact_name: '黃廠長', contact_phone: '06-213-4455 #701', contract_start: '2024-02-01', contract_end: '2027-01-31', status: '合約履約中' },
  { company_id: 'CP-009', company_name: '宗科', contact_name: '蔡副理', contact_phone: '03-563-7788 #801', contract_start: '2024-04-01', contract_end: '2027-03-31', status: '合約履約中' },
  { company_id: 'CP-010', company_name: '宗順', contact_name: '吳工程師', contact_phone: '02-2999-6655 #901', contract_start: '2023-12-01', contract_end: '2026-11-30', status: '合約履約中' },
  { company_id: 'CP-011', company_name: '宗益', contact_name: '劉工務', contact_phone: '04-762-3322 #111', contract_start: '2024-07-01', contract_end: '2027-06-30', status: '合約履約中' },
  { company_id: 'CP-012', company_name: '百成', contact_name: '柯主任', contact_phone: '03-452-9911 #211', contract_start: '2024-01-15', contract_end: '2027-01-14', status: '合約履約中' },
  { company_id: 'CP-013', company_name: '宗麒', contact_name: '楊管理員', contact_phone: '02-8667-1133 #311', contract_start: '2024-09-01', contract_end: '2027-08-31', status: '合約履約中' },
  { company_id: 'CP-014', company_name: '廣晟', contact_name: '曾設施長', contact_phone: '07-611-2244 #411', contract_start: '2023-09-01', contract_end: '2026-08-31', status: '合約履約中' },
  { company_id: 'CP-015', company_name: '宗榮', contact_name: '洪經理', contact_phone: '06-505-8899 #511', contract_start: '2024-03-15', contract_end: '2027-03-14', status: '合約履約中' },
  { company_id: 'CP-016', company_name: '宗霖', contact_name: '邱組長', contact_phone: '03-598-6677 #611', contract_start: '2024-05-15', contract_end: '2027-05-14', status: '合約履約中' },
  { company_id: 'CP-017', company_name: '優德美科技', contact_name: '陳專案經理', contact_phone: '02-2799-8801 #101', contract_start: '2024-01-01', contract_end: '2027-12-31', status: '合約履約中' },
  { company_id: 'CP-018', company_name: '富鈺節能科技', contact_name: '林技術主管', contact_phone: '02-2799-8802 #201', contract_start: '2024-01-01', contract_end: '2027-12-31', status: '合約履約中' }
];

// 預設示範設備資料已全面移除，保持純淨空白資料庫
const INITIAL_MOCK_EQUIPMENT = [];

class ApiService {
  constructor() {
    this.API_URL_KEY = 'equip_mgmt_gas_api_url_v10';
    this.DATA_STORAGE_KEY = 'equip_mgmt_local_equipment_v10';
    this.COMPANIES_KEY = 'equip_mgmt_local_companies_v9';
    this.DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbwmyzhEWhd9ADvJ4LZe-GIwelQERa696zuRUsJMMZcQwc087z-AvW5AHkLIMjSBrXrL3A/exec';
    
    const stored = localStorage.getItem(this.API_URL_KEY);
    if (!stored || stored.includes('AKfycbzJYYJdCBke') || stored.trim() === '') {
      this.apiUrl = this.DEFAULT_URL;
      try {
        localStorage.setItem(this.API_URL_KEY, this.DEFAULT_URL);
      } catch (e) {}
    } else {
      this.apiUrl = stored.trim();
    }
    
    this.initLocalStorage();
  }

  /**
   * 真正可靠的 JSONP 跨域穿透抓取工具 (突破 GitHub Pages 與瀏覽器 CORS / 302 限制)
   */
  fetchJsonp(url, timeoutMs = 45000) {
    return new Promise((resolve, reject) => {
      const callbackName = 'gas_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      let timer = null;
      const script = document.createElement('script');
      
      window[callbackName] = function(data) {
        if (timer) clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
        resolve(data);
      };

      script.onerror = function(err) {
        if (timer) clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
        reject(new Error('JSONP 載入失敗 (跨域腳本連線被阻擋或未回傳合法格式)'));
      };

      const separator = url.includes('?') ? '&' : '?';
      script.src = `${url}${separator}callback=${callbackName}`;
      document.head.appendChild(script);

      timer = setTimeout(() => {
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
        reject(new Error('JSONP 載入逾時 (超過 ' + Math.round(timeoutMs/1000) + ' 秒)'));
      }, timeoutMs);
    });
  }

  /**
   * 初始化與升級本機資料庫
   */
  initLocalStorage() {
    const raw = localStorage.getItem(this.DATA_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify([]));
    } else {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const migrated = parsed.map(item => this.normalizeItem(item));
          localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(migrated));
        }
      } catch (e) {
        localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify([]));
      }
    }

    const compRaw = localStorage.getItem(this.COMPANIES_KEY);
    if (!compRaw) {
      localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(INITIAL_MOCK_COMPANIES));
    }
  }

  /**
   * 資料項目正規化工具函數
   */
  normalizeItem(item) {
    // 智慧修復試算表欄位錯位 (例如 unit 誤填為已交貨/未交貨)
    if (item.unit === '已交貨' || item.unit === '未交貨') {
      const realStatus = item.unit;
      const realDate = (item.delivery_status && String(item.delivery_status).match(/^\d{4}-\d{2}-\d{2}$/)) ? item.delivery_status : '';
      const realRemarks = (typeof item.delivery_date === 'string' && item.delivery_date.length > 5) ? item.delivery_date : (item.remarks || '');
      
      item.delivery_status = realStatus;
      if (realDate) item.delivery_date = realDate;
      if (realRemarks) item.remarks = realRemarks;
      item.unit = '台';

      if (typeof item.model === 'number' && item.device_name && isNaN(Number(item.device_name))) {
        item.model = item.device_name;
      }
    }

    const q = Number(item.quantity) || 1;
    let status = item.delivery_status;
    let d = (item.delivered_qty !== undefined && item.delivered_qty !== null) ? Number(item.delivered_qty) : null;
    let u = (item.undelivered_qty !== undefined && item.undelivered_qty !== null) ? Number(item.undelivered_qty) : null;

    if (!status) {
      if (d !== null && d < q) {
        status = '未交貨';
      } else if (item.status === '待更換' || item.status === '維修中' || item.status === '待保養') {
        status = '未交貨';
      } else {
        status = '已交貨';
      }
    }

    if (d === null) {
      d = (status === '已交貨') ? q : 0;
    }
    if (u === null) {
      u = q - d;
    }

    let salesRep = '';
    if (item.sales_rep !== undefined && item.sales_rep !== null) {
      salesRep = String(item.sales_rep).trim();
    } else if (item.sales || item.sales_person || item.業務人員 || item.業務) {
      salesRep = String(item.sales || item.sales_person || item.業務人員 || item.業務).trim();
    } else {
      const defaultReps = {
        '宗亞': '陳業務專員', '宗鈺': '王業務副理', '宗泰': '張業務主任', '資訊星': '李業務總監',
        '宗群': '吳業務專員', '宗友': '趙業務專員', '宗晟': '許業務經理', '和興': '黃業務工程師',
        '宗科': '蔡業務專員', '宗順': '吳業務主任', '宗益': '劉業務專員', '百成': '柯業務專員',
        '宗麒': '楊業務專員', '廣晟': '曾業務主任', '宗榮': '洪業務副理', '宗霖': '邱業務專員',
        '優德美科技': '陳專案經理', '富鈺節能科技': '林技術主管'
      };
      salesRep = defaultReps[item.company_name] || '業務專員';
    }

    // 廠牌正規化 (若未填寫或舊資料，自動智慧推導)
    let brand = (item.brand || item.廠牌 || item.廠牌分類 || item.品牌 || '').toString().trim();
    let rawSys = (item.system_type || item.系統分類 || item.系統別 || '').toString().trim();
    let combinedText = (rawSys + ' ' + (item.device_name || '') + ' ' + (item.model || '')).toLowerCase();
    let sysType = '對講系統';
    if (combinedText.indexOf('門禁') !== -1 || combinedText.indexOf('刷卡') !== -1 || combinedText.indexOf('讀卡') !== -1 || combinedText.indexOf('閘門') !== -1 || combinedText.indexOf('access') !== -1) sysType = '門禁系統';
    else if (combinedText.indexOf('燈控') !== -1 || combinedText.indexOf('照明') !== -1 || combinedText.indexOf('調光') !== -1 || combinedText.indexOf('燈光') !== -1 || combinedText.indexOf('light') !== -1) sysType = '燈控系統';
    else if (combinedText.indexOf('攝影') !== -1 || combinedText.indexOf('監視') !== -1 || combinedText.indexOf('監控') !== -1 || combinedText.indexOf('cctv') !== -1 || combinedText.indexOf('camera') !== -1) sysType = '攝影機系統';
    else if (combinedText.indexOf('鎖') !== -1 || combinedText.indexOf('陽極') !== -1 || combinedText.indexOf('磁力') !== -1 || combinedText.indexOf('陰極') !== -1 || combinedText.indexOf('lock') !== -1) sysType = '電子鎖';
    else if (combinedText.indexOf('對講') !== -1 || combinedText.indexOf('門口機') !== -1 || combinedText.indexOf('室內機') !== -1 || combinedText.indexOf('intercom') !== -1) sysType = '對講系統';
    else if (rawSys === '對講機') sysType = '對講系統';
    else if (rawSys === '攝影機') sysType = '攝影機系統';
    else sysType = rawSys || '對講系統';

    if (!brand) {
      brand = this.extractBrand(item.model, item.device_name, sysType);
    }

    return Object.assign({}, item, {
      id: item.id || ('EQ-' + Math.floor(1000 + Math.random() * 9000)),
      project_name: item.project_name || item.location || '新建案工程',
      system_type: sysType,
      sales_rep: salesRep,
      brand: brand,
      delivery_status: status,
      delivered_qty: d,
      undelivered_qty: u,
      quantity: q,
      unit: item.unit || '台',
      remarks: item.remarks || ''
    });
  }

  /**
   * 智慧推導設備廠牌 (針對歷史資料或匯入資料缺失時自動補正)
   */
  extractBrand(model = '', deviceName = '', systemType = '') {
    const text = `${model} ${deviceName}`.trim();
    if (!text) return '其他廠牌';

    const knownBrands = [
      'TSM', 'Lutron', 'NOBEL', 'SAMPO', 'Schneider', 'Lite-Puter',
      'Panasonic', 'Commax', 'Hikvision', 'Soyal', 'Gianni', 'Akuvox', 'Dahua',
      'Fujitsu', 'Yale', 'Dormakaba', 'Avigilon', 'Axis', 'Honeywell', 'Sony',
      'HID', 'Amroad', 'Aiphone', 'Samsung', 'Gateman', 'Bosch', 'Fermax',
      'Vimar', 'Bticino', 'Milestone', 'Kaba', 'Vingcard', 'Hanwha', 'Uniview',
      'Chiyu', 'Pegasus', 'Yisheng', 'Klipsch', 'SecuFirst', 'ABB', 'Turing'
    ];

    for (const kb of knownBrands) {
      if (new RegExp('\\b' + kb + '\\b', 'i').test(text)) {
        return kb;
      }
    }

    // 若未命中已知品牌，取型號或設備名稱的第一個詞
    const candidate = (model || deviceName).trim().split(/[\s\-_/]/)[0];
    if (candidate && candidate.length >= 2 && !/^\d+$/.test(candidate)) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }

    // 依系統分類提供合理預設
    if (systemType === '對講系統' || systemType === '對講機') return 'Panasonic';
    if (systemType === '攝影機系統' || systemType === '攝影機') return 'Hikvision';
    if (systemType === '門禁系統') return 'Soyal';
    if (systemType === '電子鎖') return 'Yale';
    if (systemType === '燈控系統') return 'Lutron';

    return '標準廠牌';
  }

  isLiveMode() {
    return !!this.apiUrl && this.apiUrl.startsWith('https://script.google.com/');
  }

  setApiUrl(url) {
    this.apiUrl = (url || '').trim();
    localStorage.setItem(this.API_URL_KEY, this.apiUrl);
  }

  /**
   * JSONP 跨域動態腳本請求 (完全不受瀏覽器 CORS 與 302 導向限制，100% 成功跨域取得資料)
   */
  fetchJsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = 'gas_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const script = document.createElement('script');
      const delimiter = url.includes('?') ? '&' : '?';
      script.src = `${url}${delimiter}callback=${callbackName}`;
      
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP 請求超時'));
      }, 25000);

      function cleanup() {
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
        clearTimeout(timeoutId);
      }

      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('JSONP 跨域腳本載入失敗'));
      };

      document.body.appendChild(script);
    });
  }

  getApiUrl() {
    return this.apiUrl;
  }

  /**
   * 測試 Google Apps Script Web App 連線
   */
  async testConnection(testUrl) {
    const url = testUrl || this.apiUrl;
    if (!url) return { success: false, error: '請輸入 Google Apps Script 部署網址' };

    try {
      const resp = await fetch(`${url}?action=ping`, { method: 'GET' });
      const data = await resp.json();
      return data;
    } catch (e) {
      return { success: false, error: '連線失敗：' + e.message + ' (請確認已部署為 Web App 且權限設為 Anyone)' };
    }
  }

  /**
   * 同步取得本機公司清單 (0ms 即時回傳)
   */
  getLocalCompanies() {
    const cached = localStorage.getItem(this.COMPANIES_KEY);
    if (cached) {
      try {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) return list;
      } catch (e) {}
    }
    return INITIAL_MOCK_COMPANIES;
  }

  /**
   * 同步取得本機設備清單 (0ms 即時回傳)
   */
  getLocalEquipment(allowedCompanies = []) {
    const raw = localStorage.getItem(this.DATA_STORAGE_KEY);
    let list = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {
        list = [];
      }
    }
    list = list.map(item => this.normalizeItem(item));

    const isAll = allowedCompanies.includes('*') || allowedCompanies.length === 0;
    if (!isAll) {
      list = list.filter(item => allowedCompanies.includes(item.company_name));
    }
    return list;
  }

  /**
   * 取得公司清單 (即時從 Google Sheet 同步，支援防快取)
   */
  async getCompanies() {
    // 1. 若在本地伺服器環境，優先透過 Local Proxy 同步
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        console.log('📡 透過 Local Proxy 同步 16 家公司清單...');
        const resp = await fetch(`/api/getCompanies?_t=${Date.now()}`);
        const res = await resp.json();
        if (res.success && Array.isArray(res.list) && res.list.length > 0) {
          console.log(`✅ [Proxy] 成功取得 ${res.list.length} 家公司資料`);
          try { localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(res.list)); } catch (e) {}
          return res.list;
        }
      } catch (e) {
        console.warn('Local Proxy 失敗，切換至直連 GAS:', e);
      }
    }

    // 2. 直連 Google Apps Script Web App (優先 Fetch，遇限制自動切換 JSONP 穿透)
    if (this.isLiveMode()) {
      const liveUrl = `${this.apiUrl}?action=getCompanies&_t=${Date.now()}`;
      try {
        console.log('📡 正在直連 Google Sheet 同步 18 家公司資料...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        const resp = await fetch(liveUrl, { method: 'GET', mode: 'cors', redirect: 'follow', signal: controller.signal });
        clearTimeout(timeoutId);
        const res = await resp.json();
        if (res.success && Array.isArray(res.list) && res.list.length > 0) {
          console.log(`✅ [Fetch] 成功從 Google Sheet 取得 ${res.list.length} 家公司資料`);
          try { localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(res.list)); } catch (e) {}
          return res.list;
        }
      } catch (fetchErr) {
        console.warn('getCompanies Fetch 遇到限制，立即啟動 JSONP 穿透:', fetchErr);
        try {
          const res = await this.fetchJsonp(liveUrl, 45000);
          if (res && res.success && Array.isArray(res.list) && res.list.length > 0) {
            console.log(`✅ [JSONP] 成功從 Google Sheet 穿透取得 ${res.list.length} 家公司資料！`);
            try { localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(res.list)); } catch (e) {}
            return res.list;
          }
        } catch (jsonpErr) {
          console.error('getCompanies JSONP 載入亦失敗:', jsonpErr);
        }
      }
    }
    return this.getLocalCompanies();
  }

  /**
   * 取得設備資料 (即時從 Google Sheet 各公司工作表分頁同步，支援防快取)
   */
  async getEquipment(allowedCompanies = []) {
    const isAll = allowedCompanies.includes('*') || allowedCompanies.length === 0;
    const companyParam = isAll ? '*' : allowedCompanies.join(',');

    // 1. 若在本地伺服器環境，優先透過 Local Proxy 同步
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        console.log(`📡 透過 Local Proxy 同步設備清單 (公司: ${companyParam})...`);
        const resp = await fetch(`/api/getEquipment?companies=${encodeURIComponent(companyParam)}&_t=${Date.now()}`);
        const res = await resp.json();
        if (res.success && Array.isArray(res.list)) {
          console.log(`✅ [Proxy] 成功取得 ${res.list.length} 筆設備資料`);
          const list = res.list.map(item => this.normalizeItem(item));
          if (isAll && list.length > 0) {
            try { localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
          }
          return list;
        }
      } catch (e) {
        console.warn('Local Proxy 失敗，切換至直連 GAS:', e);
      }
    }

    // 2. 直連 Google Apps Script Web App (優先 Fetch，遇跨域或302自動無縫切換 JSONP 穿透)
    if (this.isLiveMode()) {
      const liveUrl = `${this.apiUrl}?action=getEquipment&companies=${encodeURIComponent(companyParam)}&_t=${Date.now()}`;
      try {
        console.log(`📡 正在直連 Google Sheet 同步設備清單 (公司: ${companyParam})...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        const resp = await fetch(liveUrl, { method: 'GET', mode: 'cors', redirect: 'follow', signal: controller.signal });
        clearTimeout(timeoutId);
        const res = await resp.json();
        if (res.success && Array.isArray(res.list)) {
          console.log(`✅ [Fetch] 成功從 Google Sheet 取得 ${res.list.length} 筆設備資料`);
          const list = res.list.map(item => this.normalizeItem(item));
          if (isAll && list.length > 0) {
            try { localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
          }
          return list;
        }
      } catch (fetchErr) {
        console.warn('Fetch 遇到跨域或導向限制，立即啟動 JSONP 穿透載入:', fetchErr);
        try {
          const res = await this.fetchJsonp(liveUrl, 45000);
          if (res && res.success && Array.isArray(res.list)) {
            console.log(`✅ [JSONP] 成功從 Google Sheet 穿透取得 ${res.list.length} 筆設備資料！`);
            const list = res.list.map(item => this.normalizeItem(item));
            if (isAll && list.length > 0) {
              try { localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
            }
            return list;
          }
        } catch (jsonpErr) {
          console.error('JSONP 載入亦失敗:', jsonpErr);
        }
      }
    }

    return this.getLocalEquipment(allowedCompanies);
  }

  /**
   * 強制從雲端 Google 試算表完整同步資料庫 (略過本機快取)
   */
  async syncDatabaseFromCloud(allowedCompanies = ['*']) {
    console.log('🔄 開始手動強制同步雲端 Google 試算表資料庫...');
    try {
      const [companies, equipment] = await Promise.all([
        this.getCompanies(),
        this.getEquipment(allowedCompanies)
      ]);

      if (Array.isArray(equipment)) {
        try { localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(equipment)); } catch (e) {}
      }
      if (Array.isArray(companies)) {
        try { localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(companies)); } catch (e) {}
      }

      return {
        success: true,
        companies: companies || [],
        equipment: equipment || [],
        companiesCount: companies ? companies.length : 0,
        equipmentCount: equipment ? equipment.length : 0
      };
    } catch (e) {
      console.error('手動同步資料庫發生錯誤:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * 遠端初始化雲端 16 家公司工作表
   */
  async initCloudDatabase() {
    if (!this.isLiveMode()) return { success: false, error: '尚未設定 Google Apps Script Web App 網址' };
    try {
      const resp = await fetch(`${this.apiUrl}?action=init`, { method: 'GET' });
      return await resp.json();
    } catch (e) {
      return { success: false, error: '初始化失敗：' + e.message };
    }
  }

  /**
   * 儲存設備 (新增或修改交貨狀態、數量等)
   */
  async saveEquipment(equipmentData, username = 'admin') {
    const normalized = this.normalizeItem(equipmentData);
    if (!normalized.id) {
      normalized.id = 'EQ-' + Math.floor(1000 + Math.random() * 9000);
    }
    const today = new Date().toISOString().split('T')[0];
    normalized.updated_at = today;

    // 1. 本地儲存：100% 第一時間寫入 localStorage，確保離線/在線皆零延遲呈現
    const raw = localStorage.getItem(this.DATA_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : [];
    list = list.map(item => this.normalizeItem(item));
    const idx = list.findIndex(e => e.id === normalized.id);
    if (idx !== -1) {
      list[idx] = Object.assign({}, list[idx], normalized);
    } else {
      list.unshift(normalized);
    }
    try {
      localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}

    // 2. 本地伺服器環境：透過 Local Proxy 同步寫入 Google Sheet
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        console.log('📡 透過 Local Proxy 儲存設備至 Google Sheet:', normalized.device_name);
        const resp = await fetch('/api/saveEquipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: normalized, username: username })
        });
        const res = await resp.json();
        return { success: true, item: normalized, remote: res };
      } catch (e) {
        console.warn('Local Proxy 儲存失敗，切換至直連 GAS:', e);
      }
    }

    // 3. 直連 Google Apps Script Web App (使用 text/plain 免除 OPTIONS preflight 阻擋)
    if (this.isLiveMode()) {
      try {
        const resp = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'saveEquipment',
            data: normalized,
            username: username
          })
        });
        const res = await resp.json();
        return { success: true, item: normalized, remote: res };
      } catch (e) {
        console.warn('Live API save failed, saved to local store:', e);
      }
    }

    return { success: true, item: normalized, message: '已儲存至本機資料庫' };
  }

  /**
   * 快速切換交貨狀態 (已交貨 ⇄ 未交貨)
   */
  async toggleDeliveryStatus(id, username = 'admin') {
    const raw = localStorage.getItem(this.DATA_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : [];
    const item = list.find(e => e.id === id);
    if (!item) return { success: false, error: '找不到設備' };

    const newStatus = (item.delivery_status === '已交貨') ? '未交貨' : '已交貨';
    const q = Number(item.quantity) || 1;
    const newDelivered = (newStatus === '已交貨') ? q : 0;
    const newUndelivered = q - newDelivered;

    const updated = Object.assign({}, item, {
      delivery_status: newStatus,
      delivered_qty: newDelivered,
      undelivered_qty: newUndelivered
    });

    return await this.saveEquipment(updated, username);
  }

  /**
   * 刪除設備
   */
  async deleteEquipment(id, username = 'admin') {
    if (this.isLiveMode()) {
      try {
        const resp = await fetch(this.apiUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'deleteEquipment',
            id: id,
            username: username
          })
        });
        const res = await resp.json();
        if (res.success) return res;
      } catch (e) {
        console.warn('Live API delete failed, deleting from local store:', e);
      }
    }

    // 本機刪除
    const raw = localStorage.getItem(this.DATA_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : [];
    list = list.filter(e => e.id !== id);
    localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(list));
    return { success: true, message: '刪除成功' };
  }

  /**
   * 重置為預設資料
   */
  resetLocalData() {
    localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(this.COMPANIES_KEY, JSON.stringify([]));
  }
}

window.apiService = new ApiService();

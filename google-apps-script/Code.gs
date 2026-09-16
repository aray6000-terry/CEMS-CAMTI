/**
 * 合約設備管理系統 - Google Apps Script (GAS) Web App API
 * 
 * 部署說明：
 * 1. 在 Google 試算表中點擊「擴充功能」->「Apps Script」
 * 2. 清空現有程式碼，將此檔案內容全部複製貼上並存檔 (Ctrl + S)
 * 3. 點擊右上角「部署」->「新增部署作業」
 * 4. 齒輪選擇「網頁應用程式 (Web App)」
 * 5. 說明：設備管理 API (16家公司獨立工作表分頁、支援完整電話/信箱帳號註冊與審核)
 * 6. 執行身分：我 (您的 Google 帳號)
 * 7. 誰可以存取：任何人 (Anyone) - 確保跨域能正常讀寫
 * 8. 點擊「部署」，複製「網頁應用程式網址 (Web App URL)」貼到前端系統即可！
 */

const SYSTEM_SHEETS = {
  USERS: 'Users',
  COMPANIES: 'Companies',
  LOGS: 'Logs',
  EQUIPMENT_LEGACY: 'Equipment'
};

const COMPANY_NAMES = [
  '宗亞', '宗鈺', '宗泰', '資訊星', '宗群', '宗友', '宗晟', '和興',
  '宗科', '宗順', '宗益', '百成', '宗麒', '廣晟', '宗榮', '宗霖',
  '優德美科技', '富鈺節能科技'
];

const EQ_HEADERS = [
  'id', 'company_name', 'contract_id', 'project_name', 'sales_rep', 'system_type', 'brand', 'device_name',
  'model', 'quantity', 'delivered_qty', 'undelivered_qty', 'unit', 'delivery_status',
  'delivery_date', 'remarks', 'updated_at'
];

const USER_HEADERS = [
  'username', 'password', 'full_name', 'role', 'allowed_companies', 'status', 'email', 'phone', 'created_at'
];

// 預設示範設備資料已全面移除，保持純淨空白資料庫
const SAMPLE_EQ_MAP = {};

/**
 * 處理 GET 請求
 */
function doGet(e) {
  var shouldEncrypt = (e && e.parameter && e.parameter.encrypt !== 'false');
  try {
    const action = (e && e.parameter && e.parameter.action) || 'ping';
    let result = {};

    switch (action) {
      case 'ping':
        result = { 
          success: true, 
          message: '設備管理系統 API 運作正常 (支援 16 家公司獨立工作表分頁、端到端資料加密)', 
          encrypted: shouldEncrypt,
          timestamp: new Date().toISOString() 
        };
        break;

      case 'login':
        const loginUser = (e && e.parameter && e.parameter.username) || '';
        const loginPass = (e && e.parameter && e.parameter.password) || '';
        result = handleLogin(loginUser, loginPass);
        break;

      case 'register':
        result = handleRegister(e.parameter || {});
        break;

      case 'getEquipment':
        const userCompanies = (e && e.parameter && e.parameter.companies) || '';
        result = getEquipmentList(userCompanies);
        break;

      case 'getCompanies':
        result = getCompaniesList();
        break;

      case 'getUsers':
        result = getUsersList();
        break;

      case 'init':
        initDatabaseIfEmpty(false);
        result = { success: true, message: '工作表結構檢查完畢（已停用預設範本資料建置功能）' };
        break;

      case 'upgradeSheets':
        result = upgradeAllSheetsAddSalesRep();
        break;

      case 'ensureSheets':
        result = ensureAllCompanySheets();
        break;

      case 'saveUser':
        result = saveUser(e.parameter || {}, (e && e.parameter && e.parameter.operator) || 'admin');
        break;

      default:
        result = { success: false, error: '未知的 GET action 參數: ' + action };
    }

    const callback = (e && e.parameter && (e.parameter.callback || e.parameter.prefix)) || '';
    return createJsonResponse(result, callback, shouldEncrypt);
  } catch (err) {
    const callback = (e && e.parameter && (e.parameter.callback || e.parameter.prefix)) || '';
    return createJsonResponse({ success: false, error: err.toString() }, callback, false);
  }
}

/**
 * 處理 POST 請求 (新增、更新、刪除、註冊、登入)
 */
function doPost(e) {
  var shouldEncrypt = true;
  try {
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = (typeof e.postData.contents === 'string') ? JSON.parse(e.postData.contents) : e.postData.contents;
      } catch (ex) {
        postData = (e && e.parameter) || {};
      }
    } else if (e && e.parameter) {
      postData = e.parameter;
    }

    // 若前端以加密信封傳入，先進行自動解密
    if (postData && (postData.encrypted === true || postData.encrypted === 'true') && postData.data && typeof CryptoSecurity !== 'undefined') {
      try {
        var decryptedBody = CryptoSecurity.decrypt(postData.data);
        if (decryptedBody && typeof decryptedBody === 'object') {
          postData = decryptedBody;
        }
      } catch (decErr) {
        return createJsonResponse({ success: false, error: '後端解密請求資料失敗: ' + decErr.message }, null, false);
      }
    }

    if (e && e.parameter && e.parameter.encrypt === 'false') {
      shouldEncrypt = false;
    } else if (postData && postData.encrypt === false) {
      shouldEncrypt = false;
    }

    const action = postData.action || (e && e.parameter && e.parameter.action);
    let data = postData.data;
    if (!data && e && e.parameter && e.parameter.data) {
      try {
        data = (typeof e.parameter.data === 'string') ? JSON.parse(e.parameter.data) : e.parameter.data;
      } catch (ex) {
        data = e.parameter.data;
      }
    }

    // 若 data 欄位本身為加密字串，進行解密
    if (data && typeof data === 'string' && data.length > 36 && typeof CryptoSecurity !== 'undefined') {
      try {
        var decryptedData = CryptoSecurity.decrypt(data);
        if (decryptedData) data = decryptedData;
      } catch (eIgnore) {}
    }

    const username = postData.username || (e && e.parameter && e.parameter.username);
    const id = postData.id || (e && e.parameter && e.parameter.id);

    let result = {};

    switch (action) {
      case 'login':
        result = handleLogin(username || (data && data.username), postData.password || (data && data.password));
        break;

      case 'register':
        result = handleRegister(data || postData);
        break;

      case 'saveEquipment':
        result = saveEquipment(data, username);
        break;

      case 'deleteEquipment':
        result = deleteEquipment(id, username);
        break;

      case 'saveCompany':
        result = saveCompany(data, username);
        break;

      case 'saveUser':
        result = saveUser(data || postData, username);
        break;

      case 'init':
        initDatabaseIfEmpty(false);
        result = { success: true, message: '工作表結構檢查完畢（已停用預設範本資料建置功能）' };
        break;

      case 'upgradeSheets':
        result = upgradeAllSheetsAddSalesRep();
        break;

      default:
        result = { success: false, error: '未知的 POST action: ' + action };
    }

    return createJsonResponse(result, null, shouldEncrypt);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() }, null, false);
  }
}

/**
 * 建立 JSON / 加密 JSON 回應 (含 CORS 標頭與加密信封)
 */
function createJsonResponse(data, callback, shouldEncrypt) {
  var outputData = data;
  if (shouldEncrypt !== false && typeof CryptoSecurity !== 'undefined' && data) {
    try {
      var cipher = CryptoSecurity.encrypt(data);
      outputData = {
        success: data.success !== false,
        encrypted: true,
        data: cipher,
        timestamp: new Date().getTime()
      };
    } catch (encErr) {
      outputData = data;
    }
  }

  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(outputData) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(outputData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 系統分類權威標準化 (只參考 system_type 分類，絕不參考 device_name 設備名稱或型號)
 */
function canonicalSystemType(rawType) {
  var s = String(rawType || '').trim();
  if (!s) return '對講系統';

  var lower = s.toLowerCase();
  if (lower.indexOf('門禁') !== -1 || lower.indexOf('access') !== -1) {
    return '門禁系統';
  }
  if (lower.indexOf('燈控') !== -1 || lower.indexOf('照明') !== -1 || lower.indexOf('調光') !== -1 || lower.indexOf('燈光') !== -1 || lower.indexOf('light') !== -1) {
    return '燈控系統';
  }
  if (lower.indexOf('攝影') !== -1 || lower.indexOf('監視') !== -1 || lower.indexOf('監控') !== -1 || lower.indexOf('cctv') !== -1 || lower.indexOf('camera') !== -1) {
    return '攝影機系統';
  }
  if (lower.indexOf('鎖') !== -1 || lower.indexOf('lock') !== -1) {
    return '電子鎖';
  }
  if (lower.indexOf('對講') !== -1 || lower.indexOf('intercom') !== -1) {
    return '對講系統';
  }

  // 若為其他明確自訂系統 (如「廣播系統」)，完整忠實保留
  return s;
}

/**
 * 設備工作表欄位名稱正規化對照表 (相容中文表頭與英文表頭)
 */
function normalizeHeaderKey(rawHeader) {
  if (!rawHeader) return '';
  var h = String(rawHeader).trim().toLowerCase();
  if (h === 'id' || h.indexOf('編號') !== -1 || h.indexOf('序號') !== -1) return 'id';
  if (h.indexOf('公司') !== -1) return 'company_name';
  if (h.indexOf('合約') !== -1 || h.indexOf('案號') !== -1) return 'contract_id';
  if (h.indexOf('建案') !== -1 || h.indexOf('專案') !== -1 || h.indexOf('工程') !== -1) return 'project_name';
  if (h.indexOf('業務') !== -1 || h.indexOf('負責') !== -1) return 'sales_rep';
  if (h.indexOf('系統') !== -1 || h.indexOf('分類') !== -1 || h.indexOf('類別') !== -1) return 'system_type';
  if (h.indexOf('廠牌') !== -1 || h.indexOf('品牌') !== -1) return 'brand';
  if (h.indexOf('名稱') !== -1 || h.indexOf('品名') !== -1 || h.indexOf('項目') !== -1) return 'device_name';
  if (h.indexOf('型號') !== -1 || h.indexOf('規格') !== -1) return 'model';
  if (h.indexOf('已交') !== -1) return 'delivered_qty';
  if (h.indexOf('未交') !== -1) return 'undelivered_qty';
  if (h.indexOf('數量') !== -1 || h.indexOf('總數') !== -1 || h === '數量' || h === '總量') return 'quantity';
  if (h.indexOf('單位') !== -1) return 'unit';
  if (h.indexOf('狀態') !== -1) return 'delivery_status';
  if (h.indexOf('日期') !== -1 || h.indexOf('交期') !== -1 || h.indexOf('時間') !== -1) return 'delivery_date';
  if (h.indexOf('備註') !== -1 || h.indexOf('說明') !== -1) return 'remarks';
  if (h.indexOf('更新') !== -1 || h.indexOf('修改') !== -1) return 'updated_at';
  return h;
}

/**
 * 檢查並自動補齊公司設備工作表之標題列
 */
function ensureEquipmentSheetHeaders(sheet) {
  if (!sheet) return;
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(EQ_HEADERS);
    sheet.getRange(1, 1, 1, EQ_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#1E293B')
      .setFontColor('#F8FAFC');
    sheet.setFrozenRows(1);
    return;
  }
}

/**
 * 使用者欄位名稱正規化對照表 (相容中文表頭與英文表頭)
 */
function normalizeUserHeaderKey(rawHeader) {
  if (!rawHeader) return '';
  const h = String(rawHeader).trim().toLowerCase();
  if (h.indexOf('密碼') !== -1 || h.indexOf('pwd') !== -1 || h.indexOf('pass') !== -1) return 'password';
  if (h.indexOf('帳號') !== -1 || h.indexOf('使用者') !== -1 || h.indexOf('用戶') !== -1 || h === 'username' || h === 'user') return 'username';
  if (h.indexOf('姓名') !== -1 || h.indexOf('稱謂') !== -1 || h.indexOf('名字') !== -1 || h === 'fullname' || h === 'full_name' || h === 'name') return 'full_name';
  if (h.indexOf('角色') !== -1 || h.indexOf('權限') !== -1 || h === 'role') return 'role';
  if (h.indexOf('公司') !== -1 || h.indexOf('授權') !== -1) return 'allowed_companies';
  if (h.indexOf('狀態') !== -1 || h.indexOf('審核') !== -1 || h === 'status') return 'status';
  if (h.indexOf('信箱') !== -1 || h.indexOf('郵件') !== -1 || h.indexOf('mail') !== -1) return 'email';
  if (h.indexOf('電話') !== -1 || h.indexOf('手機') !== -1 || h.indexOf('分機') !== -1 || h.indexOf('phone') !== -1) return 'phone';
  if (h.indexOf('時間') !== -1 || h.indexOf('日期') !== -1 || h.indexOf('created') !== -1) return 'created_at';
  return h;
}

/**
 * 檢查並自動補齊 Users 工作表之標題列 (確保電話、信箱、建立時間欄位存在)
 */
function ensureUserSheetHeaders(sheet) {
  if (!sheet) return;
  const desiredHeaders = USER_HEADERS;
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(desiredHeaders);
    sheet.getRange(1, 1, 1, desiredHeaders.length)
      .setFontWeight('bold')
      .setBackground('#1E293B')
      .setFontColor('#F8FAFC');
    sheet.setFrozenRows(1);
    return;
  }

  const headerRange = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1));
  const rawHeaders = headerRange.getValues()[0].map(function(h) { return String(h).trim(); });
  const normalized = rawHeaders.map(normalizeUserHeaderKey);

  desiredHeaders.forEach(function(key) {
    if (normalized.indexOf(key) === -1) {
      const targetCol = rawHeaders.length + 1;
      sheet.getRange(1, targetCol).setValue(key)
        .setFontWeight('bold')
        .setBackground('#1E293B')
        .setFontColor('#F8FAFC');
      rawHeaders.push(key);
      normalized.push(key);
    }
  });
}

/**
 * 檢查並自動補齊各公司專屬工作表之標題列 (確保 sales_rep 業務人員欄位於專案名稱後方安全存在)
 */
function ensureEquipmentSheetHeaders(sheet) {
  if (!sheet) return;
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(EQ_HEADERS);
    sheet.getRange(1, 1, 1, EQ_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#1E293B')
      .setFontColor('#F8FAFC');
    sheet.setFrozenRows(1);
    return;
  }

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
  const normalized = rawHeaders.map(normalizeHeaderKey);

  if (normalized.indexOf('sales_rep') === -1) {
    const projectIdx = normalized.indexOf('project_name');
    if (projectIdx !== -1) {
      // 在 project_name 後方插入一欄，確保欄位緊鄰於專案名稱後面
      sheet.insertColumnAfter(projectIdx + 1);
      sheet.getRange(1, projectIdx + 2).setValue('業務人員')
        .setFontWeight('bold')
        .setBackground('#1E293B')
        .setFontColor('#F8FAFC');
    } else {
      // 若無 project_name 則追加在末端
      const targetCol = rawHeaders.length + 1;
      sheet.getRange(1, targetCol).setValue('業務人員')
        .setFontWeight('bold')
        .setBackground('#1E293B')
        .setFontColor('#F8FAFC');
    }
  }
}

/**
 * 當試算表開啟時，自動在 Google Sheet 頂部建立系統專屬工具選單
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('⚡ 設備管理工具')
      .addItem('🚀 一鍵升級：補齊各分頁「業務人員」欄位', 'upgradeAllSheetsAddSalesRep')
      .addItem('🔄 重新整理所有工作表標題列', 'upgradeAllSheetsAddSalesRep')
      .addToUi();
  } catch (e) {}
}

/**
 * 一鍵為所有現存 16 家公司工作表補齊「業務人員」欄位並自動填入預設業務人員
 */
function upgradeAllSheetsAddSalesRep() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, error: '找不到試算表' };

  const defaultReps = {
    '宗亞': '陳業務專員', '宗鈺': '王業務副理', '宗泰': '張業務主任', '資訊星': '李業務總監',
    '宗群': '吳業務專員', '宗友': '趙業務專員', '宗晟': '許業務經理', '和興': '黃業務工程師',
    '宗科': '蔡業務專員', '宗順': '吳業務主任', '宗益': '劉業務專員', '百成': '柯業務專員',
    '宗麒': '楊業務專員', '廣晟': '曾業務主任', '宗榮': '洪業務副理', '宗霖': '邱業務專員',
    '優德美科技': '陳專案經理', '富鈺節能科技': '林技術主管'
  };

  const sheets = ss.getSheets();
  let updatedCount = 0;
  let filledRowsCount = 0;
  const updatedSheets = [];

  sheets.forEach(function(sheet) {
    const sheetName = sheet.getName();
    if (sheetName === SYSTEM_SHEETS.USERS || 
        sheetName === SYSTEM_SHEETS.COMPANIES || 
        sheetName === SYSTEM_SHEETS.LOGS) {
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow === 0) return;

    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
    const normalized = rawHeaders.map(normalizeHeaderKey);

    let salesRepCol = normalized.indexOf('sales_rep') + 1; // 1-indexed

    // 1. 若缺少「業務人員」欄位，則自動於專案名稱後方插入
    if (salesRepCol === 0) {
      const projectIdx = normalized.indexOf('project_name');
      const insertCol = (projectIdx !== -1) ? (projectIdx + 1) : 4;
      sheet.insertColumnAfter(insertCol);
      salesRepCol = insertCol + 1;
      sheet.getRange(1, salesRepCol).setValue('業務人員')
        .setFontWeight('bold')
        .setBackground('#1E293B')
        .setFontColor('#F8FAFC');
      updatedCount++;
      updatedSheets.push(sheetName);
    }

    // 2. 檢查現存各資料列，若「業務人員」欄位為空，自動填入對應公司業務
    if (lastRow > 1) {
      const repName = defaultReps[sheetName] || '業務專員';
      const cellRange = sheet.getRange(2, salesRepCol, lastRow - 1, 1);
      const values = cellRange.getValues();
      let changed = false;

      for (let r = 0; r < values.length; r++) {
        if (!values[r][0] || String(values[r][0]).trim() === '') {
          values[r][0] = repName;
          changed = true;
          filledRowsCount++;
        }
      }

      if (changed) {
        cellRange.setValues(values);
      }
    }
  });

  return {
    success: true,
    message: '已成功檢查所有工作表，共為 ' + updatedCount + ' 個分頁建立新欄位，並為 ' + filledRowsCount + ' 筆設備填入負責業務姓名！',
    updatedCount: updatedCount,
    filledRowsCount: filledRowsCount,
    updatedSheets: updatedSheets
  };
}

/**
 * 一鍵自動補齊所有缺失的公司專屬工作表分頁 (安全無損，絕不影響現有工作表)
 * 執行後會在 Google 試算表下方自動長出「優德美科技」、「富鈺節能科技」等新工作表！
 */
function ensureAllCompanySheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, error: '找不到試算表' };

  let createdSheets = [];

  // 檢查 COMPANY_NAMES 中所有公司，若工作表分頁不存在則建立空白工作表與表頭（絕不插入任何預設示範資料）
  for (let c = 0; c < COMPANY_NAMES.length; c++) {
    const compName = COMPANY_NAMES[c];
    let sheet = ss.getSheetByName(compName);
    if (!sheet) {
      sheet = ss.insertSheet(compName);
      sheet.appendRow(EQ_HEADERS);
      sheet.getRange(1, 1, 1, EQ_HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#1E293B')
        .setFontColor('#F8FAFC');
      sheet.setFrozenRows(1);
      createdSheets.push(compName);
    } else {
      // 若工作表已存在，僅自動檢查並補齊欄位標頭，絕不自動填入任何預設資料
      ensureEquipmentSheetHeaders(sheet);
    }
  }

  return {
    success: true,
    message: createdSheets.length > 0 
      ? '已檢查並建立公司工作表分頁：' + createdSheets.join('、')
      : '所有公司工作表分頁皆已存在，無需新增！',
    createdSheets: createdSheets
  };
}

/**
 * 取得指定工作表，若不存在則建立並寫入標題列
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (headers && headers.length > 0 && sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1E293B')
      .setFontColor('#F8FAFC');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * 初始化資料庫範本與 16 家公司專屬分頁
 */
function initDatabaseIfEmpty(forceReset) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  // 1. Users 表
  let userSheet = ss.getSheetByName(SYSTEM_SHEETS.USERS);
  if (!userSheet || forceReset) {
    if (!userSheet) userSheet = ss.insertSheet(SYSTEM_SHEETS.USERS);
    userSheet.clear();
    userSheet.appendRow(USER_HEADERS);
    userSheet.getRange(1, 1, 1, USER_HEADERS.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#F8FAFC');
    userSheet.setFrozenRows(1);

    // 僅保留系統超級管理員帳號以供登入
    userSheet.appendRow(['admin', 'admin123', '系統超級管理員', 'admin', '*', '啟用', 'admin@cems.com', '02-2788-1234 #800', '2025-01-01 00:00:00']);
  } else {
    ensureUserSheetHeaders(userSheet);
  }

  // 2. Companies 表
  const compHeaders = ['company_id', 'company_name', 'contact_name', 'contact_phone', 'contract_start', 'contract_end', 'status'];
  let compSheet = ss.getSheetByName(SYSTEM_SHEETS.COMPANIES);
  if (!compSheet || forceReset) {
    if (!compSheet) compSheet = ss.insertSheet(SYSTEM_SHEETS.COMPANIES);
    compSheet.clear();
    compSheet.appendRow(compHeaders);
    compSheet.getRange(1, 1, 1, compHeaders.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#F8FAFC');
    compSheet.setFrozenRows(1);
    // 絕不自動寫入預設示範公司，維持乾淨空白
  }

  // 3. 各公司專屬工作表分頁 (僅建立表頭，絕不寫入預設示範設備)
  for (let c = 0; c < COMPANY_NAMES.length; c++) {
    const compName = COMPANY_NAMES[c];
    let sheet = ss.getSheetByName(compName);
    if (!sheet || forceReset) {
      if (!sheet) sheet = ss.insertSheet(compName);
      sheet.clear();
      sheet.appendRow(EQ_HEADERS);
      sheet.getRange(1, 1, 1, EQ_HEADERS.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#F8FAFC');
      sheet.setFrozenRows(1);
    }
  }

  // 4. Logs 表
  const logHeaders = ['timestamp', 'username', 'action', 'details'];
  let logSheet = ss.getSheetByName(SYSTEM_SHEETS.LOGS);
  if (!logSheet) {
    logSheet = ss.insertSheet(SYSTEM_SHEETS.LOGS);
    logSheet.appendRow(logHeaders);
    logSheet.getRange(1, 1, 1, logHeaders.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#F8FAFC');
    logSheet.setFrozenRows(1);
  }

  // 5. 移除預設的「工作表1」或「Sheet1」
  const defaultSheet = ss.getSheetByName('工作表1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {}
  }
}

/**
 * 處理登入驗證 (動態欄位解析，支援中英文表頭、去除空格、純數字相容與狀態寬鬆識別)
 */
function handleLogin(username, password) {
  if (!username || !password) {
    return { success: false, error: '請輸入帳號與密碼！' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SYSTEM_SHEETS.USERS);
  if (!sheet) return { success: false, error: '找不到使用者資料表 (Users)' };
  ensureUserSheetHeaders(sheet);

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, error: '使用者資料表為空，請先建立帳號！' };

  // 動態依照表頭名稱解析欄位索引 (完全不受中英文表頭或欄位順序影響)
  const headers = data[0].map(normalizeUserHeaderKey);
  const idxUsername = headers.indexOf('username') !== -1 ? headers.indexOf('username') : 0;
  const idxPassword = headers.indexOf('password') !== -1 ? headers.indexOf('password') : 1;
  const idxFullName = headers.indexOf('full_name') !== -1 ? headers.indexOf('full_name') : 2;
  const idxRole = headers.indexOf('role') !== -1 ? headers.indexOf('role') : 3;
  const idxAllowed = headers.indexOf('allowed_companies') !== -1 ? headers.indexOf('allowed_companies') : 4;
  const idxStatus = headers.indexOf('status') !== -1 ? headers.indexOf('status') : 5;
  const idxEmail = headers.indexOf('email') !== -1 ? headers.indexOf('email') : 6;
  const idxPhone = headers.indexOf('phone') !== -1 ? headers.indexOf('phone') : 7;
  const idxCreatedAt = headers.indexOf('created_at') !== -1 ? headers.indexOf('created_at') : 8;

  const targetUser = String(username).trim().toLowerCase();
  const targetPass = String(password).trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowUser = String(row[idxUsername] !== undefined && row[idxUsername] !== null ? row[idxUsername] : '').trim().toLowerCase();
    if (!rowUser) continue;

    if (rowUser === targetUser) {
      // 密碼嚴格比對 (依據 Google Sheet 設定，雙向去除前後空格並容錯純數字格式)
      const rowPass = String(row[idxPassword] !== undefined && row[idxPassword] !== null ? row[idxPassword] : '').trim();
      const cleanRowPass = rowPass.replace(/\.0+$/, '');
      const cleanTargetPass = targetPass.replace(/\.0+$/, '');
      
      const isMatch = (cleanRowPass === cleanTargetPass) || (rowPass === targetPass);
      
      if (isMatch) {
        const rawStatus = String(row[idxStatus] !== undefined && row[idxStatus] !== null ? row[idxStatus] : '').trim();
        
        // 狀態判斷
        if (rowUser !== 'admin') {
          if (rawStatus === '停用') {
            return {
              success: false,
              error: '此帳號已被停用，請聯繫系統管理員！'
            };
          }
          if (rawStatus === '待審核' || rawStatus === '審核中') {
            return {
              success: false,
              error: '此帳號目前為【' + rawStatus + '】狀態，尚未由管理員審核啟用！'
            };
          }
        }

        let allowedCompanies = ['*'];
        const rawCompanies = String(row[idxAllowed] || '*').trim();
        if (rawCompanies !== '*' && rawCompanies !== '') {
          allowedCompanies = rawCompanies.split(',').map(function(c) { return c.trim(); }).filter(Boolean);
        }

        logAudit(targetUser, 'LOGIN', '使用者登入成功');

        return {
          success: true,
          user: {
            username: String(row[idxUsername]).trim(),
            fullName: String(row[idxFullName] || row[idxUsername]).trim(),
            role: String(row[idxRole] || 'client').trim(),
            status: rawStatus || '啟用',
            allowedCompanies: allowedCompanies,
            email: String(row[idxEmail] || '').trim(),
            phone: String(row[idxPhone] || '').trim(),
            createdAt: String(row[idxCreatedAt] || '').trim()
          }
        };
      } else {
        return { success: false, error: '密碼錯誤！請檢查大小寫或是否有輸入錯誤。' };
      }
    }
  }

  return { success: false, error: '找不到該帳號「' + username + '」，請確認帳號名稱是否正確！' };
}

/**
 * 處理帳號申請 / 註冊 (預設為「待審核」狀態，確實寫入電話與信箱，需由超級管理者啟用)
 */
function handleRegister(userData) {
  if (!userData || !userData.username || !userData.password) {
    return { success: false, error: '請完整填寫帳號與密碼' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SYSTEM_SHEETS.USERS);
  if (!sheet) {
    initDatabaseIfEmpty(false);
    sheet = ss.getSheetByName(SYSTEM_SHEETS.USERS);
  }
  ensureUserSheetHeaders(sheet);

  const username = String(userData.username).trim();
  const password = String(userData.password).trim();
  const fullName = String(userData.fullName || userData.full_name || username).trim();
  const role = String(userData.role || 'client').trim();
  const companyName = String(userData.companyName || userData.company_name || userData.allowedCompanies || userData.allowed_companies || '*').trim();
  const email = String(userData.email || '').trim();
  const phone = String(userData.phone || '').trim();

  // 檢查帳號是否已存在
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === username.toLowerCase()) {
      return { success: false, error: '該帳號名稱「' + username + '」已存在，請使用其他帳號或直接登入' };
    }
  }

  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  
  // 新增使用者資料行 (預設狀態為「待審核」，記錄 9 個完整欄位)
  sheet.appendRow([
    username,
    password,
    fullName,
    role,
    companyName,
    '待審核',
    email,
    phone,
    nowStr
  ]);

  logAudit(username, 'REGISTER', '新帳號註冊申請: ' + username + ' (姓名:' + fullName + ', 電話:' + phone + ', 信箱:' + email + ', 狀態: 待審核)');

  return {
    success: true,
    message: '🎉 帳號申請已送出！目前狀態為【待審核】，需由超級管理者審核啟用後方可登入。',
    user: {
      username: username,
      fullName: fullName,
      role: role,
      phone: phone,
      email: email,
      status: '待審核'
    }
  };
}


/**
 * 取得設備清單 (支援跨公司獨立分頁或單一 Equipment 工作表)
 */
function getEquipmentList(userCompanies) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allowedList = (userCompanies === '*' || !userCompanies) ? ['*'] : userCompanies.split(',').map(function(c) { return c.trim(); });
  const list = [];

  const sheets = ss.getSheets();

  sheets.forEach(function(sheet) {
    const sheetName = sheet.getName();
    
    // 略過系統表
    if (sheetName === SYSTEM_SHEETS.USERS || 
        sheetName === SYSTEM_SHEETS.COMPANIES || 
        sheetName === SYSTEM_SHEETS.LOGS) {
      return;
    }

    // 檢查公司存取權限
    if (sheetName !== SYSTEM_SHEETS.EQUIPMENT_LEGACY) {
      if (allowedList.indexOf('*') === -1 && allowedList.indexOf(sheetName) === -1) {
        return;
      }
    }

    // 自動檢查並補齊 sales_rep 等標頭
    ensureEquipmentSheetHeaders(sheet);

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    const rawHeaders = data[0];
    const normalizedHeaders = rawHeaders.map(normalizeHeaderKey);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // 檢查整列是否皆為空
      const hasContent = row.some(function(cell) { return String(cell).trim() !== ''; });
      if (!hasContent) continue;

      const item = {};
      for (let j = 0; j < normalizedHeaders.length; j++) {
        let val = row[j];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        item[normalizedHeaders[j]] = val;
      }

      // 公司名稱若未填則預設為工作表名稱
      const compName = String(item.company_name || sheetName).trim();
      if (allowedList.indexOf('*') === -1 && allowedList.indexOf(compName) === -1) {
        continue;
      }
      item.company_name = compName;

      // 補齊預設值與系統別名稱正規化容錯
      if (!item.id) item.id = 'EQ-' + sheetName + '-' + i;
      
      // 權威標準化系統分類 (只參考 system_type 分類，絕不參考設備名稱/型號)
      var rawType = String(item.system_type || (row.length > 5 ? row[5] : '') || '').trim();
      item.system_type = canonicalSystemType(rawType);
      if (!item.device_name) item.device_name = '設備項目 ' + i;
      
      const q = Number(item.quantity) || 1;
      item.quantity = q;
      
      let status = item.delivery_status || '已交貨';
      let dQty = (item.delivered_qty !== undefined && item.delivered_qty !== '' && item.delivered_qty !== null) 
        ? Number(item.delivered_qty) 
        : (status === '已交貨' ? q : 0);
      let uQty = (item.undelivered_qty !== undefined && item.undelivered_qty !== '' && item.undelivered_qty !== null) 
        ? Number(item.undelivered_qty) 
        : (q - dQty);

      item.delivered_qty = dQty;
      item.undelivered_qty = uQty;
      item.delivery_status = (dQty >= q) ? '已交貨' : (status || '未交貨');
      if (!item.unit) item.unit = '台';
      if (!item.project_name) item.project_name = '建案工程';
      if (!item.sales_rep) item.sales_rep = '';

      list.push(item);
    }
  });

  return { success: true, list: list };
}

/**
 * 取得公司清單 (智慧合併 Companies 表與所有公司工作表分頁)
 */
function getCompaniesList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const list = [];
  const compSet = {};

  // 1. 先讀取 Companies 工作表
  const compSheet = ss.getSheetByName(SYSTEM_SHEETS.COMPANIES);
  if (compSheet) {
    const data = compSheet.getDataRange().getValues();
    if (data.length > 1) {
      const headers = data[0].map(normalizeHeaderKey);
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[1] || String(row[1]).trim() === '') continue;
        const item = {};
        for (let j = 0; j < headers.length; j++) {
          let val = row[j];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          }
          item[headers[j]] = val;
        }
        if (item.company_name) {
          list.push(item);
          compSet[item.company_name] = true;
        }
      }
    }
  }

  // 2. 智慧掃描現有工作表分頁，若有新分頁自動納入公司清單
  const sheets = ss.getSheets();
  sheets.forEach(function(sheet, idx) {
    const sheetName = sheet.getName();
    if (sheetName === SYSTEM_SHEETS.USERS || 
        sheetName === SYSTEM_SHEETS.COMPANIES || 
        sheetName === SYSTEM_SHEETS.LOGS ||
        sheetName === SYSTEM_SHEETS.EQUIPMENT_LEGACY) {
      return;
    }

    if (!compSet[sheetName]) {
      list.push({
        company_id: 'CP-' + String(100 + idx),
        company_name: sheetName,
        contact_name: '總務窗口',
        contact_phone: '',
        contract_start: '2024-01-01',
        contract_end: '2027-12-31',
        status: '合約履約中'
      });
      compSet[sheetName] = true;
    }
  });

  return { success: true, list: list };
}

/**
 * 取得所有使用者 (限管理員使用，完整回傳姓名、公司權限、狀態、信箱、電話、時間)
 */
function getUsersList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SYSTEM_SHEETS.USERS);
  if (!sheet) return { success: true, list: [] };
  ensureUserSheetHeaders(sheet);

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, list: [] };

  const headers = data[0].map(normalizeUserHeaderKey);
  const idxUsername = headers.indexOf('username') !== -1 ? headers.indexOf('username') : 0;
  const idxFullName = headers.indexOf('full_name') !== -1 ? headers.indexOf('full_name') : 2;
  const idxRole = headers.indexOf('role') !== -1 ? headers.indexOf('role') : 3;
  const idxAllowed = headers.indexOf('allowed_companies') !== -1 ? headers.indexOf('allowed_companies') : 4;
  const idxStatus = headers.indexOf('status') !== -1 ? headers.indexOf('status') : 5;
  const idxEmail = headers.indexOf('email') !== -1 ? headers.indexOf('email') : 6;
  const idxPhone = headers.indexOf('phone') !== -1 ? headers.indexOf('phone') : 7;
  const idxCreatedAt = headers.indexOf('created_at') !== -1 ? headers.indexOf('created_at') : 8;

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[idxUsername] || String(row[idxUsername]).trim() === '') continue;
    list.push({
      username: String(row[idxUsername]).trim(),
      fullName: String(row[idxFullName] || row[idxUsername]).trim(),
      role: String(row[idxRole] || 'client').trim(),
      allowedCompanies: String(row[idxAllowed] || '*').trim(),
      status: String(row[idxStatus] || '待審核').trim(),
      email: String(row[idxEmail] || '').trim(),
      phone: String(row[idxPhone] || '').trim(),
      createdAt: String(row[idxCreatedAt] || '').trim()
    });
  }
  return { success: true, list: list };
}

/**
 * 新增或更新設備 (直接儲存至該公司專屬工作表分頁)
 */
function saveEquipment(item, username) {
  if (!item) return { success: false, error: '缺少設備資料' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const companyName = item.company_name || '宗亞';
  const targetSheet = getOrCreateSheet(companyName, EQ_HEADERS);
  ensureEquipmentSheetHeaders(targetSheet);

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const id = item.id || ('EQ-' + Math.floor(1000 + Math.random() * 9000));

  const totalQty = Number(item.quantity) || 1;
  const status = item.delivery_status || '已交貨';
  const deliveredQty = (item.delivered_qty !== undefined && item.delivered_qty !== null) 
    ? Number(item.delivered_qty) 
    : (status === '已交貨' ? totalQty : 0);
  const undeliveredQty = (item.undelivered_qty !== undefined && item.undelivered_qty !== null) 
    ? Number(item.undelivered_qty) 
    : (totalQty - deliveredQty);

  // 動態依照工作表表頭順序組裝資料，確保絕無欄位位移
  const targetHeaders = targetSheet.getRange(1, 1, 1, Math.max(targetSheet.getLastColumn(), 1)).getValues()[0].map(normalizeHeaderKey);
  const savedSysType = canonicalSystemType(item.system_type);
  const valMap = {
    id: id,
    company_name: companyName,
    contract_id: item.contract_id || '',
    project_name: item.project_name || '',
    sales_rep: item.sales_rep || '',
    system_type: savedSysType,
    brand: item.brand || '',
    device_name: item.device_name || '',
    model: item.model || '',
    quantity: totalQty,
    delivered_qty: deliveredQty,
    undelivered_qty: undeliveredQty,
    unit: item.unit || '台',
    delivery_status: status,
    delivery_date: item.delivery_date || todayStr,
    remarks: item.remarks || '',
    updated_at: todayStr
  };

  const rowValues = (targetHeaders.length > 0 && targetHeaders[0] !== '') 
    ? targetHeaders.map(function(key) { return (valMap[key] !== undefined) ? valMap[key] : (item[key] || ''); })
    : [
      id, companyName, item.contract_id || '', item.project_name || '', item.sales_rep || '',
      savedSysType, item.brand || '', item.device_name || '', item.model || '', totalQty, deliveredQty,
      undeliveredQty, item.unit || '台', status, item.delivery_date || todayStr, item.remarks || '', todayStr
    ];

  let foundInTarget = false;
  let targetRowIndex = -1;

  if (item.id) {
    const targetData = targetSheet.getDataRange().getValues();
    for (let i = 1; i < targetData.length; i++) {
      if (String(targetData[i][0]).trim() === String(item.id).trim()) {
        foundInTarget = true;
        targetRowIndex = i + 1;
        break;
      }
    }

    if (!foundInTarget) {
      deleteEquipment(item.id, username, false);
    }
  }

  if (foundInTarget && targetRowIndex > 0) {
    targetSheet.getRange(targetRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    logAudit(username, 'UPDATE_EQ', '更新設備[' + companyName + '分頁]: ' + id + ' (' + item.device_name + ') 業務:' + (item.sales_rep || '未指定'));
  } else {
    targetSheet.appendRow(rowValues);
    logAudit(username, 'ADD_EQ', '新增設備[' + companyName + '分頁]: ' + id + ' (' + item.device_name + ') 業務:' + (item.sales_rep || '未指定'));
  }

  return { success: true, id: id };
}

/**
 * 刪除設備 (在所有公司分頁中定位並刪除)
 */
function deleteEquipment(id, username, shouldLog) {
  if (!id) return { success: false, error: '缺少設備 ID' };
  if (shouldLog === undefined) shouldLog = true;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  for (let s = 0; s < sheets.length; s++) {
    const sheet = sheets[s];
    const sheetName = sheet.getName();
    if (sheetName === SYSTEM_SHEETS.USERS || sheetName === SYSTEM_SHEETS.COMPANIES || sheetName === SYSTEM_SHEETS.LOGS) {
      continue;
    }

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(id).trim()) {
        sheet.deleteRow(i + 1);
        if (shouldLog) {
          logAudit(username, 'DELETE_EQ', '刪除設備[' + sheetName + '分頁] ID: ' + id);
        }
        return { success: true, message: '設備刪除成功' };
      }
    }
  }

  return { success: false, error: '找不到該設備 ID: ' + id };
}

/**
 * 新增/更新公司資料
 */
function saveCompany(companyData, username) {
  if (!companyData || !companyData.company_name) return { success: false, error: '缺少公司名稱' };
  const sheet = getOrCreateSheet(SYSTEM_SHEETS.COMPANIES, ['company_id', 'company_name', 'contact_name', 'contact_phone', 'contract_start', 'contract_end', 'status']);
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(companyData.company_name).trim()) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[
        companyData.company_id || data[i][0],
        companyData.company_name,
        companyData.contact_name || '',
        companyData.contact_phone || '',
        companyData.contract_start || '',
        companyData.contract_end || '',
        companyData.status || '合約履約中'
      ]]);
      logAudit(username, 'UPDATE_COMPANY', '更新公司: ' + companyData.company_name);
      return { success: true };
    }
  }

  sheet.appendRow([
    companyData.company_id || ('CP-' + Math.floor(100 + Math.random() * 900)),
    companyData.company_name,
    companyData.contact_name || '',
    companyData.contact_phone || '',
    companyData.contract_start || '',
    companyData.contract_end || '',
    companyData.status || '合約履約中'
  ]);
  logAudit(username, 'ADD_COMPANY', '新增公司: ' + companyData.company_name);
  return { success: true };
}

/**
 * 新增/更新使用者 (完整支援 username, password, full_name, role, allowed_companies, status, email, phone, created_at)
 */
function saveUser(userData, username) {
  if (!userData || !userData.username) return { success: false, error: '缺少帳號名稱' };
  const sheet = getOrCreateSheet(SYSTEM_SHEETS.USERS, USER_HEADERS);
  ensureUserSheetHeaders(sheet);

  const uName = String(userData.username).trim();
  const rawEmail = userData.email !== undefined ? String(userData.email).trim() : null;
  const rawPhone = userData.phone !== undefined ? String(userData.phone).trim() : null;
  const rawFullName = (userData.full_name || userData.fullName) ? String(userData.full_name || userData.fullName).trim() : null;
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === uName.toLowerCase()) {
      const existingRow = data[i];
      const updatedRow = [
        uName,
        userData.password || existingRow[1] || '123456',
        rawFullName !== null ? rawFullName : (existingRow[2] || uName),
        userData.role || existingRow[3] || 'client',
        (userData.allowed_companies !== undefined ? userData.allowed_companies : (userData.allowedCompanies !== undefined ? userData.allowedCompanies : (existingRow[4] || '*'))),
        userData.status || existingRow[5] || '啟用',
        rawEmail !== null ? rawEmail : (existingRow[6] || ''),
        rawPhone !== null ? rawPhone : (existingRow[7] || ''),
        existingRow[8] || nowStr
      ];
      sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
      logAudit(username || uName, 'UPDATE_USER', '更新使用者: ' + uName + ' (狀態: ' + updatedRow[5] + ', 授權: ' + updatedRow[4] + ')');
      return { success: true };
    }
  }

  // 新增使用者
  sheet.appendRow([
    uName,
    userData.password || '123456',
    rawFullName || uName,
    userData.role || 'client',
    userData.allowed_companies || userData.allowedCompanies || '*',
    userData.status || '待審核',
    rawEmail || '',
    rawPhone || '',
    nowStr
  ]);
  logAudit(username || uName, 'ADD_USER', '新增使用者: ' + uName);
  return { success: true };
}

/**
 * 寫入操作稽核日誌
 */
function logAudit(username, action, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SYSTEM_SHEETS.LOGS);
    if (sheet) {
      const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([nowStr, username || 'anonymous', action, details]);
    }
  } catch (e) {
    // 略過日誌錯誤
  }
}

/* =========================================================================
 * 端到端安全加密引擎 (CryptoSecurity) - 與前端完全相容 (AES-256-CBC)
 * ========================================================================= */

var CryptoSecurity = (function () {
  var DEFAULT_SECRET_KEY = 'CEMS_CAMTI_SECURE_TOKEN_2026_@x89F2A#';

  function utf8ToBytes(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        bytes.push(0xe0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3f));
        bytes.push(0x80 | (code & 0x3f));
      } else {
        i++;
        code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        bytes.push(0xf0 | (code >> 18));
        bytes.push(0x80 | ((code >> 12) & 0x3f));
        bytes.push(0x80 | ((code >> 6) & 0x3f));
        bytes.push(0x80 | (code & 0x3f));
      }
    }
    return bytes;
  }

  function bytesToUtf8(bytes) {
    var out = '';
    var i = 0;
    while (i < bytes.length) {
      var c = bytes[i++];
      if (c < 0x80) {
        out += String.fromCharCode(c);
      } else if (c > 0xbf && c < 0xe0) {
        var c2 = bytes[i++];
        out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f));
      } else if (c > 0xdf && c < 0xf0) {
        var c2 = bytes[i++];
        var c3 = bytes[i++];
        out += String.fromCharCode(((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f));
      } else {
        var c2 = bytes[i++];
        var c3 = bytes[i++];
        var c4 = bytes[i++];
        var u = (((c & 0x07) << 18) | ((c2 & 0x3f) << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f)) - 0x10000;
        out += String.fromCharCode(0xd800 + (u >> 10));
        out += String.fromCharCode(0xdc00 + (u & 0x3ff));
      }
    }
    return out;
  }

  var B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  function bytesToBase64(bytes) {
    var result = '';
    var i = 0;
    var len = bytes.length;
    while (i < len) {
      var b1 = bytes[i++];
      var b2 = i < len ? bytes[i++] : NaN;
      var b3 = i < len ? bytes[i++] : NaN;
      var e1 = b1 >> 2;
      var e2 = ((b1 & 3) << 4) | (b2 >> 4);
      var e3 = isNaN(b2) ? 64 : (((b2 & 15) << 2) | (b3 >> 6));
      var e4 = isNaN(b3) ? 64 : (b3 & 63);
      result += B64_CHARS.charAt(e1) + B64_CHARS.charAt(e2) +
                B64_CHARS.charAt(e3) + B64_CHARS.charAt(e4);
    }
    return result;
  }

  function base64ToBytes(b64) {
    var bytes = [];
    var str = String(b64).replace(/[^A-Za-z0-9+/=]/g, '');
    var i = 0;
    while (i < str.length) {
      var enc1 = B64_CHARS.indexOf(str.charAt(i++));
      var enc2 = B64_CHARS.indexOf(str.charAt(i++));
      var enc3 = B64_CHARS.indexOf(str.charAt(i++));
      var enc4 = B64_CHARS.indexOf(str.charAt(i++));
      var chr1 = (enc1 << 2) | (enc2 >> 4);
      var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      var chr3 = ((enc3 & 3) << 6) | enc4;
      bytes.push(chr1);
      if (enc3 !== 64 && enc3 !== -1) bytes.push(chr2);
      if (enc4 !== 64 && enc4 !== -1) bytes.push(chr3);
    }
    return bytes;
  }

  function sha256(bytes) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var K = [];
    var H = [];

    var isPrime = function(n) {
      for (var f = 2; f <= Math.sqrt(n); f++) {
        if (n % f === 0) return false;
      }
      return true;
    };

    var primeCount = 0;
    for (var candidate = 2; primeCount < 64; candidate++) {
      if (isPrime(candidate)) {
        if (primeCount < 8) H[primeCount] = (mathPow(candidate, 1/2) * maxWord) | 0;
        K[primeCount] = (mathPow(candidate, 1/3) * maxWord) | 0;
        primeCount++;
      }
    }

    var words = [];
    var byteLen = bytes.length;
    for (var i = 0; i < byteLen; i++) {
      words[i >>> 2] |= (bytes[i] & 0xff) << (24 - (i % 4) * 8);
    }
    words[byteLen >>> 2] |= 0x80 << (24 - (byteLen % 4) * 8);
    var wordLen = (((byteLen + 8) >> 6) + 1) * 16;
    words[wordLen - 1] = byteLen * 8;

    for (var j = 0; j < wordLen; j += 16) {
      var w = words.slice(j, j + 16);
      for (var t = 16; t < 64; t++) {
        var s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }

      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (var k = 0; k < 64; k++) {
        var S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        var ch = (e & f) ^ ((~e) & g);
        var temp1 = (h + S1 + ch + K[k] + (w[k] || 0)) | 0;
        var S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) | 0;

        h = g; g = f; f = e; e = (d + temp1) | 0;
        d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }

      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }

    var resultBytes = [];
    for (var m = 0; m < 8; m++) {
      resultBytes.push((H[m] >>> 24) & 0xff);
      resultBytes.push((H[m] >>> 16) & 0xff);
      resultBytes.push((H[m] >>> 8) & 0xff);
      resultBytes.push(H[m] & 0xff);
    }
    return resultBytes;
  }

  var SBOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
  ];

  var INV_SBOX = [];
  for (var si = 0; si < 256; si++) INV_SBOX[SBOX[si]] = si;

  var RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a];

  function expandKey(keyBytes) {
    var keyWords = [];
    for (var i = 0; i < 8; i++) {
      keyWords[i] = (keyBytes[i * 4] << 24) | (keyBytes[i * 4 + 1] << 16) |
                    (keyBytes[i * 4 + 2] << 8) | keyBytes[i * 4 + 3];
    }
    var w = keyWords.slice();
    for (var j = 8; j < 60; j++) {
      var temp = w[j - 1];
      if (j % 8 === 0) {
        temp = ((SBOX[(temp >>> 16) & 0xff] << 24) |
                (SBOX[(temp >>> 8) & 0xff] << 16) |
                (SBOX[temp & 0xff] << 8) |
                SBOX[(temp >>> 24) & 0xff]) ^ (RCON[j / 8] << 24);
      } else if (j % 8 === 4) {
        temp = (SBOX[(temp >>> 24) & 0xff] << 24) |
               (SBOX[(temp >>> 16) & 0xff] << 16) |
               (SBOX[(temp >>> 8) & 0xff] << 8) |
               SBOX[temp & 0xff];
      }
      w[j] = w[j - 8] ^ temp;
    }
    return w;
  }

  function gmul(a, b) {
    var p = 0;
    for (var counter = 0; counter < 8; counter++) {
      if ((b & 1) !== 0) p ^= a;
      var hi_bit_set = (a & 0x80);
      a = (a << 1) & 0xff;
      if (hi_bit_set !== 0) a ^= 0x1b;
      b >>= 1;
    }
    return p;
  }

  function encryptBlock(block, roundKeys) {
    var state = [];
    for (var i = 0; i < 16; i++) state[i] = block[i];

    for (var rk = 0; rk < 4; rk++) {
      var rw = roundKeys[rk];
      state[rk * 4] ^= (rw >>> 24) & 0xff;
      state[rk * 4 + 1] ^= (rw >>> 16) & 0xff;
      state[rk * 4 + 2] ^= (rw >>> 8) & 0xff;
      state[rk * 4 + 3] ^= rw & 0xff;
    }

    for (var round = 1; round < 14; round++) {
      for (var sb = 0; sb < 16; sb++) state[sb] = SBOX[state[sb]];
      var temp = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = temp;
      temp = state[2]; var temp2 = state[6]; state[2] = state[10]; state[6] = state[14]; state[10] = temp; state[14] = temp2;
      temp = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = temp;

      for (var c = 0; c < 4; c++) {
        var a0 = state[c * 4], a1 = state[c * 4 + 1], a2 = state[c * 4 + 2], a3 = state[c * 4 + 3];
        state[c * 4] = gmul(2, a0) ^ gmul(3, a1) ^ a2 ^ a3;
        state[c * 4 + 1] = a0 ^ gmul(2, a1) ^ gmul(3, a2) ^ a3;
        state[c * 4 + 2] = a0 ^ a1 ^ gmul(2, a2) ^ gmul(3, a3);
        state[c * 4 + 3] = gmul(3, a0) ^ a1 ^ a2 ^ gmul(2, a3);
      }

      var baseRk = round * 4;
      for (var k = 0; k < 4; k++) {
        var w = roundKeys[baseRk + k];
        state[k * 4] ^= (w >>> 24) & 0xff;
        state[k * 4 + 1] ^= (w >>> 16) & 0xff;
        state[k * 4 + 2] ^= (w >>> 8) & 0xff;
        state[k * 4 + 3] ^= w & 0xff;
      }
    }

    for (var sb14 = 0; sb14 < 16; sb14++) state[sb14] = SBOX[state[sb14]];
    var t1 = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = t1;
    var t2 = state[2]; var t2b = state[6]; state[2] = state[10]; state[6] = state[14]; state[10] = t2; state[14] = t2b;
    var t3 = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = t3;

    var lastRk = 14 * 4;
    for (var lk = 0; lk < 4; lk++) {
      var lw = roundKeys[lastRk + lk];
      state[lk * 4] ^= (lw >>> 24) & 0xff;
      state[lk * 4 + 1] ^= (lw >>> 16) & 0xff;
      state[lk * 4 + 2] ^= (lw >>> 8) & 0xff;
      state[lk * 4 + 3] ^= lw & 0xff;
    }
    return state;
  }

  function decryptBlock(block, roundKeys) {
    var state = [];
    for (var i = 0; i < 16; i++) state[i] = block[i];

    var lastRk = 14 * 4;
    for (var lk = 0; lk < 4; lk++) {
      var lw = roundKeys[lastRk + lk];
      state[lk * 4] ^= (lw >>> 24) & 0xff;
      state[lk * 4 + 1] ^= (lw >>> 16) & 0xff;
      state[lk * 4 + 2] ^= (lw >>> 8) & 0xff;
      state[lk * 4 + 3] ^= lw & 0xff;
    }

    for (var round = 13; round >= 1; round--) {
      var t1 = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t1;
      var t2 = state[10]; var t2b = state[14]; state[10] = state[2]; state[14] = state[6]; state[2] = t2; state[6] = t2b;
      var t3 = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t3;

      for (var isb = 0; isb < 16; isb++) state[isb] = INV_SBOX[state[isb]];

      var baseRk = round * 4;
      for (var k = 0; k < 4; k++) {
        var w = roundKeys[baseRk + k];
        state[k * 4] ^= (w >>> 24) & 0xff;
        state[k * 4 + 1] ^= (w >>> 16) & 0xff;
        state[k * 4 + 2] ^= (w >>> 8) & 0xff;
        state[k * 4 + 3] ^= w & 0xff;
      }

      for (var c = 0; c < 4; c++) {
        var a0 = state[c * 4], a1 = state[c * 4 + 1], a2 = state[c * 4 + 2], a3 = state[c * 4 + 3];
        state[c * 4] = gmul(0x0e, a0) ^ gmul(0x0b, a1) ^ gmul(0x0d, a2) ^ gmul(0x09, a3);
        state[c * 4 + 1] = gmul(0x09, a0) ^ gmul(0x0e, a1) ^ gmul(0x0b, a2) ^ gmul(0x0d, a3);
        state[c * 4 + 2] = gmul(0x0d, a0) ^ gmul(0x09, a1) ^ gmul(0x0e, a2) ^ gmul(0x0b, a3);
        state[c * 4 + 3] = gmul(0x0b, a0) ^ gmul(0x0d, a1) ^ gmul(0x09, a2) ^ gmul(0x0e, a3);
      }
    }

    var t01 = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t01;
    var t02 = state[10]; var t02b = state[14]; state[10] = state[2]; state[14] = state[6]; state[2] = t02; state[6] = t02b;
    var t03 = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t03;

    for (var isb0 = 0; isb0 < 16; isb0++) state[isb0] = INV_SBOX[state[isb0]];

    for (var rk0 = 0; rk0 < 4; rk0++) {
      var rw0 = roundKeys[rk0];
      state[rk0 * 4] ^= (rw0 >>> 24) & 0xff;
      state[rk0 * 4 + 1] ^= (rw0 >>> 16) & 0xff;
      state[rk0 * 4 + 2] ^= (rw0 >>> 8) & 0xff;
      state[rk0 * 4 + 3] ^= rw0 & 0xff;
    }
    return state;
  }

  function generateRandomIV() {
    var iv = [];
    for (var i = 0; i < 16; i++) iv.push(Math.floor(Math.random() * 256));
    return iv;
  }

  return {
    DEFAULT_KEY: DEFAULT_SECRET_KEY,

    encrypt: function (data, key) {
      try {
        var secretKey = (key || DEFAULT_SECRET_KEY).trim();
        var keyBytes = sha256(utf8ToBytes(secretKey));
        var roundKeys = expandKey(keyBytes);

        var plainText = (typeof data === 'string') ? data : JSON.stringify(data);
        var plainBytes = utf8ToBytes(plainText);

        var padLen = 16 - (plainBytes.length % 16);
        for (var p = 0; p < padLen; p++) plainBytes.push(padLen);

        var iv = generateRandomIV();
        var cipherBytes = [];
        var prevBlock = iv.slice();

        for (var b = 0; b < plainBytes.length; b += 16) {
          var block = plainBytes.slice(b, b + 16);
          for (var x = 0; x < 16; x++) block[x] ^= prevBlock[x];
          var enc = encryptBlock(block, roundKeys);
          for (var e = 0; e < 16; e++) cipherBytes.push(enc[e]);
          prevBlock = enc;
        }

        var checksum = sha256(iv.concat(cipherBytes)).slice(0, 4);
        var finalBytes = iv.concat(checksum).concat(cipherBytes);
        return bytesToBase64(finalBytes);
      } catch (err) {
        throw new Error('GAS 加密失敗: ' + (err.message || err));
      }
    },

    decrypt: function (cipherBase64, key) {
      if (!cipherBase64 || typeof cipherBase64 !== 'string') return cipherBase64;
      try {
        var secretKey = (key || DEFAULT_SECRET_KEY).trim();
        var keyBytes = sha256(utf8ToBytes(secretKey));
        var roundKeys = expandKey(keyBytes);

        var rawBytes = base64ToBytes(cipherBase64);
        if (rawBytes.length < 36) throw new Error('密文長度異常');

        var iv = rawBytes.slice(0, 16);
        var checksum = rawBytes.slice(16, 20);
        var cipherBytes = rawBytes.slice(20);

        var calculatedCheck = sha256(iv.concat(cipherBytes)).slice(0, 4);
        for (var c = 0; c < 4; c++) {
          if (checksum[c] !== calculatedCheck[c]) throw new Error('校驗碼不符');
        }

        var plainBytes = [];
        var prevBlock = iv.slice();

        for (var b = 0; b < cipherBytes.length; b += 16) {
          var block = cipherBytes.slice(b, b + 16);
          var dec = decryptBlock(block, roundKeys);
          for (var x = 0; x < 16; x++) plainBytes.push(dec[x] ^ prevBlock[x]);
          prevBlock = block;
        }

        var padLen = plainBytes[plainBytes.length - 1];
        if (padLen < 1 || padLen > 16) throw new Error('無效的 PKCS7 填充');
        for (var p = plainBytes.length - padLen; p < plainBytes.length; p++) {
          if (plainBytes[p] !== padLen) throw new Error('PKCS7 損毀');
        }
        plainBytes = plainBytes.slice(0, plainBytes.length - padLen);

        var plainText = bytesToUtf8(plainBytes);
        try {
          return JSON.parse(plainText);
        } catch (jsonErr) {
          return plainText;
        }
      } catch (err) {
        throw new Error('GAS 解密失敗: ' + (err.message || err));
      }
    }
  };
})();


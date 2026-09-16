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
  try {
    const action = (e && e.parameter && e.parameter.action) || 'ping';
    let result = {};

    switch (action) {
      case 'ping':
        result = { 
          success: true, 
          message: '設備管理系統 API 運作正常 (支援 16 家公司獨立工作表分頁與完整使用者資訊)', 
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

      default:
        result = { success: false, error: '未知的 GET action 參數: ' + action };
    }

    const callback = (e && e.parameter && (e.parameter.callback || e.parameter.prefix)) || '';
    return createJsonResponse(result, callback);
  } catch (err) {
    const callback = (e && e.parameter && (e.parameter.callback || e.parameter.prefix)) || '';
    return createJsonResponse({ success: false, error: err.toString() }, callback);
  }
}

/**
 * 處理 POST 請求 (新增、更新、刪除、註冊、登入)
 */
function doPost(e) {
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

    const action = postData.action || (e && e.parameter && e.parameter.action);
    let data = postData.data;
    if (!data && e && e.parameter && e.parameter.data) {
      try {
        data = (typeof e.parameter.data === 'string') ? JSON.parse(e.parameter.data) : e.parameter.data;
      } catch (ex) {
        data = e.parameter.data;
      }
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

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * 建立 JSON 回應 (含 CORS 標頭)
 */
function createJsonResponse(data, callback) {
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
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
      // 密碼比對 (雙向去除前後空格，並容錯純數字、.0 與字串轉換)
      const rowPass = String(row[idxPassword] !== undefined && row[idxPassword] !== null ? row[idxPassword] : '').trim();
      const cleanRowPass = rowPass.replace(/\.0+$/, '');
      const cleanTargetPass = targetPass.replace(/\.0+$/, '');
      
      let isMatch = (cleanRowPass === cleanTargetPass) || (rowPass === targetPass);
      // 容錯備援：若主密碼欄位未吻合，檢查該列其他單元格是否有吻合密碼者 (防止使用者試算表欄位順序錯位)
      if (!isMatch) {
        for (let c = 0; c < row.length; c++) {
          if (c === idxUsername) continue;
          let cellVal = String(row[c] !== undefined && row[c] !== null ? row[c] : '').trim().replace(/\.0+$/, '');
          if (cellVal && (cellVal === cleanTargetPass || cellVal === targetPass)) {
            isMatch = true;
            break;
          }
        }
      }
      
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
      // 智慧解析系統分類 (全方位從欄位、設備名稱、型號反向推導，徹底解決表頭不一致或落入預設值問題)
      var rawType = String(item.system_type || (row.length > 5 ? row[5] : '') || '').trim();
      var combinedText = (rawType + ' ' + (item.device_name || '') + ' ' + (item.model || '')).toLowerCase();

      if (combinedText.indexOf('門禁') !== -1 || combinedText.indexOf('刷卡') !== -1 || combinedText.indexOf('讀卡') !== -1 || combinedText.indexOf('閘門') !== -1 || combinedText.indexOf('access') !== -1) {
        item.system_type = '門禁系統';
      } else if (combinedText.indexOf('燈控') !== -1 || combinedText.indexOf('照明') !== -1 || combinedText.indexOf('調光') !== -1 || combinedText.indexOf('燈光') !== -1 || combinedText.indexOf('light') !== -1) {
        item.system_type = '燈控系統';
      } else if (combinedText.indexOf('攝影') !== -1 || combinedText.indexOf('監視') !== -1 || combinedText.indexOf('監控') !== -1 || combinedText.indexOf('cctv') !== -1 || combinedText.indexOf('camera') !== -1) {
        item.system_type = '攝影機系統';
      } else if (combinedText.indexOf('鎖') !== -1 || combinedText.indexOf('陽極') !== -1 || combinedText.indexOf('磁力') !== -1 || combinedText.indexOf('陰極') !== -1 || combinedText.indexOf('lock') !== -1) {
        item.system_type = '電子鎖';
      } else if (combinedText.indexOf('對講') !== -1 || combinedText.indexOf('門口機') !== -1 || combinedText.indexOf('室內機') !== -1 || combinedText.indexOf('intercom') !== -1) {
        item.system_type = '對講系統';
      } else if (rawType === '對講機') {
        item.system_type = '對講系統';
      } else if (rawType === '攝影機') {
        item.system_type = '攝影機系統';
      } else {
        item.system_type = rawType || '對講系統';
      }
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
  const valMap = {
    id: id,
    company_name: companyName,
    contract_id: item.contract_id || '',
    project_name: item.project_name || '',
    sales_rep: item.sales_rep || '',
    system_type: item.system_type || '對講機',
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
      item.system_type || '對講機', item.brand || '', item.device_name || '', item.model || '', totalQty, deliveredQty,
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

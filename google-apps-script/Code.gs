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
        initDatabaseIfEmpty(true);
        result = { success: true, message: '16 家公司專屬工作表與預設資料已重新初始化完成！' };
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

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
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
        initDatabaseIfEmpty(true);
        result = { success: true, message: '16 家公司專屬工作表與預設資料已重新初始化完成！' };
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
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 使用者欄位名稱正規化對照表 (相容中文表頭與英文表頭)
 */
function normalizeUserHeaderKey(rawHeader) {
  if (!rawHeader) return '';
  const h = String(rawHeader).trim().toLowerCase();
  if (h === 'username' || h === '帳號' || h === '使用者名稱' || h === '用戶名') return 'username';
  if (h === 'password' || h === '密碼') return 'password';
  if (h === 'full_name' || h === 'fullname' || h === '姓名' || h === '稱謂' || h === '使用者姓名') return 'full_name';
  if (h === 'role' || h === '角色' || h === '權限') return 'role';
  if (h === 'allowed_companies' || h === 'allowedcompanies' || h === '授權公司' || h === '公司權限' || h === '公司') return 'allowed_companies';
  if (h === 'status' || h === '狀態' || h === '帳號狀態' || h === '審核狀態') return 'status';
  if (h === 'email' || h === '信箱' || h === '電子信箱' || h === '郵件' || h === 'e-mail') return 'email';
  if (h === 'phone' || h === '電話' || h === '聯絡電話' || h === '分機' || h === '手機') return 'phone';
  if (h === 'created_at' || h === 'createdat' || h === '建立時間' || h === '申請時間' || h === '註冊時間' || h === '時間') return 'created_at';
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

  // 1. 確保 Companies 表中有新公司
  let compSheet = ss.getSheetByName(SYSTEM_SHEETS.COMPANIES);
  if (compSheet) {
    const data = compSheet.getDataRange().getValues();
    const existingCompNames = data.slice(1).map(function(r) { return String(r[1]).trim(); });
    
    const newComps = [
      ['CP-017', '優德美科技', '陳專案經理', '02-2799-8801 #101', '2024-01-01', '2027-12-31', '合約履約中'],
      ['CP-018', '富鈺節能科技', '林技術主管', '02-2799-8802 #201', '2024-01-01', '2027-12-31', '合約履約中']
    ];

    newComps.forEach(function(compRow) {
      if (existingCompNames.indexOf(compRow[1]) === -1) {
        compSheet.appendRow(compRow);
      }
    });
  }

  // 2. 檢查 COMPANY_NAMES 中所有公司，若工作表分頁不存在則立即新增
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

      // 若有預設示範設備資料則填入
      if (typeof sampleEqMap !== 'undefined' && sampleEqMap[compName] && sampleEqMap[compName].length > 0) {
        const rows = sampleEqMap[compName];
        for (let r = 0; r < rows.length; r++) {
          sheet.appendRow(rows[r]);
        }
      }
      createdSheets.push(compName);
    } else {
      // 若工作表已存在，自動補齊 sales_rep 標題列
      ensureEquipmentSheetHeaders(sheet);
    }
  }

  return {
    success: true,
    message: createdSheets.length > 0 
      ? '🎉 已成功長出新公司工作表分頁：' + createdSheets.join('、')
      : '所有 18 家公司工作表分頁皆已存在，無需新增！',
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

    userSheet.appendRow(['admin', 'admin123', '系統超級管理員', 'admin', '*', '啟用', 'admin@cems.com', '02-2788-1234 #800', '2025-01-01 00:00:00']);
    userSheet.appendRow(['tech01', 'tech123', '工務維護工程師-小張', 'tech', '宗亞,宗鈺,宗泰,資訊星,宗群,宗友', '啟用', 'tech01@cems.com', '0912-345-678', '2025-01-01 00:00:00']);
    userSheet.appendRow(['zongya_mgr', 'zongya123', '宗亞總務主管', 'client', '宗亞', '啟用', 'zongya@cems.com', '02-2788-1234 #101', '2025-01-01 00:00:00']);
    userSheet.appendRow(['zongyu_mgr', 'zongyu123', '宗鈺廠務專員', 'client', '宗鈺', '啟用', 'zongyu@cems.com', '02-2788-5678 #102', '2025-01-01 00:00:00']);
    userSheet.appendRow(['infostar_mgr', 'info123', '資訊星技術總監', 'client', '資訊星', '啟用', 'info@cems.com', '02-8792-3344 #301', '2025-01-01 00:00:00']);
    userSheet.appendRow(['zongtai_mgr', 'zongtai123', '宗泰工程經理', 'client', '宗泰', '啟用', 'zongtai@cems.com', '03-578-8888 #201', '2025-01-01 00:00:00']);
  } else {
    ensureUserSheetHeaders(userSheet);
  }

  // 2. Companies 表 (16家公司)
  const compHeaders = ['company_id', 'company_name', 'contact_name', 'contact_phone', 'contract_start', 'contract_end', 'status'];
  let compSheet = ss.getSheetByName(SYSTEM_SHEETS.COMPANIES);
  if (!compSheet || forceReset) {
    if (!compSheet) compSheet = ss.insertSheet(SYSTEM_SHEETS.COMPANIES);
    compSheet.clear();
    compSheet.appendRow(compHeaders);
    compSheet.getRange(1, 1, 1, compHeaders.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#F8FAFC');
    compSheet.setFrozenRows(1);

    const sampleCompanies = [
      ['CP-001', '宗亞', '林廠務經理', '02-2788-1234 #101', '2024-01-01', '2027-12-31', '合約履約中'],
      ['CP-002', '宗鈺', '陳總務組長', '02-2788-5678 #102', '2023-11-01', '2026-10-31', '合約履約中'],
      ['CP-003', '宗泰', '張工程主任', '03-578-8888 #201', '2024-05-01', '2027-04-30', '合約履約中'],
      ['CP-004', '資訊星', '李技術總監', '02-8792-3344 #301', '2024-08-01', '2026-07-31', '合約履約中'],
      ['CP-005', '宗群', '王物業主管', '04-2358-1122 #401', '2024-03-01', '2027-02-28', '合約履約中'],
      ['CP-006', '宗友', '趙研發專員', '07-332-9988 #501', '2023-10-01', '2026-09-30', '合約履約中'],
      ['CP-007', '宗晟', '許專案經理', '03-328-1122 #601', '2024-06-01', '2027-05-31', '合約履約中'],
      ['CP-008', '和興', '黃廠長', '06-213-4455 #701', '2024-02-01', '2027-01-31', '合約履約中'],
      ['CP-009', '宗科', '蔡副理', '03-563-7788 #801', '2024-04-01', '2027-03-31', '合約履約中'],
      ['CP-010', '宗順', '吳工程師', '02-2999-6655 #901', '2023-12-01', '2026-11-30', '合約履約中'],
      ['CP-011', '宗益', '劉工務', '04-762-3322 #111', '2024-07-01', '2027-06-30', '合約履約中'],
      ['CP-012', '百成', '柯主任', '03-452-9911 #211', '2024-01-15', '2027-01-14', '合約履約中'],
      ['CP-013', '宗麒', '楊管理員', '02-8667-1133 #311', '2024-09-01', '2027-08-31', '合約履約中'],
      ['CP-014', '廣晟', '曾設施長', '07-611-2244 #411', '2023-09-01', '2026-08-31', '合約履約中'],
      ['CP-015', '宗榮', '洪經理', '06-505-8899 #511', '2024-03-15', '2027-03-14', '合約履約中'],
      ['CP-016', '宗霖', '邱組長', '03-598-6677 #611', '2024-05-15', '2027-05-14', '合約履約中'],
      ['CP-017', '優德美科技', '陳專案經理', '02-2799-8801 #101', '2024-01-01', '2027-12-31', '合約履約中'],
      ['CP-018', '富鈺節能科技', '林技術主管', '02-2799-8802 #201', '2024-01-01', '2027-12-31', '合約履約中']
    ];

    for (let i = 0; i < sampleCompanies.length; i++) {
      compSheet.appendRow(sampleCompanies[i]);
    }
  }

  // 3. 各公司專屬工作表分頁
  const sampleEqMap = {
    '宗亞': [
      ['EQ-0101', '宗亞', 'CT-ZA-2025-01', '宗亞南港總部旗艦大樓', '陳業務專員', '對講機', 'IP觸控式門口對講主機', 'Panasonic VL-V900', 12, 12, 0, '台', '已交貨', '2024-01-15', '大門門廳與訪客中心已全數完成點交', '2025-02-01'],
      ['EQ-0102', '宗亞', 'CT-ZA-2025-01', '宗亞南港總部旗艦大樓', '陳業務專員', '對講機', '室內緊急對講分機 (壁掛)', 'Commax CM-800', 36, 24, 12, '台', '未交貨', '2025-03-20', '高樓層12台待二期工程驗收交貨', '2025-02-01'],
      ['EQ-0103', '宗亞', 'CT-ZA-2025-01', '宗亞智慧園區二期', '林專案經理', '攝影機', '4K紅外線防暴半球型網路攝影機', 'Hikvision DS-2CD2186', 60, 60, 0, '支', '已交貨', '2024-02-01', '全區走廊與公共空間已安裝完畢', '2025-02-01'],
      ['EQ-0104', '宗亞', 'CT-ZA-2025-01', '宗亞智慧園區二期', '林專案經理', '門禁系統', '多頻雙模人臉/RFID門禁主機', 'Soyal AR-837-EA', 25, 25, 0, '組', '已交貨', '2024-03-10', '主要管制門扇已全數啟用', '2025-02-01'],
      ['EQ-0105', '宗亞', 'CT-ZA-2025-01', '宗亞智慧園區二期', '林專案經理', '電子鎖', '斷電開型微電腦靜音陽極鎖', 'Gianni EB-200', 50, 30, 20, '組', '未交貨', '2026-04-10', '第二批20組預計2026年到貨交貨', '2025-02-01']
    ],
    '宗鈺': [
      ['EQ-0201', '宗鈺', 'CT-ZY-2025-02', '宗鈺內湖科技大樓', '王業務副理', '對講機', 'SIP高階視訊管理總機', 'Akuvox R29C', 8, 8, 0, '台', '已交貨', '2023-11-01', '警衛中控室已點交', '2025-01-20'],
      ['EQ-0202', '宗鈺', 'CT-ZY-2025-02', '宗鈺內湖科技大樓', '王業務副理', '攝影機', '全景360度魚眼全景攝影機', 'Dahua DH-IPC-EBW81242', 24, 16, 8, '支', '未交貨', '2025-08-15', '地下停車場8支待二期施作', '2025-01-20'],
      ['EQ-0203', '宗鈺', 'CT-ZY-2025-02', '宗鈺內湖科技大樓', '王業務副理', '門禁系統', '掌靜脈高資安辨識主機', 'Fujitsu PalmSecure', 15, 15, 0, '套', '已交貨', '2024-05-10', '研發機房全數安裝', '2025-01-20'],
      ['EQ-0204', '宗鈺', 'CT-ZY-2025-02', '宗鈺內湖科技大樓', '王業務副理', '電子鎖', '重型感應指紋智慧防盜電子鎖', 'Yale YDM-7116', 20, 8, 12, '組', '未交貨', '2026-02-15', '主管辦公室換裝批次交貨', '2025-02-10']
    ],
    '宗泰': [
      ['EQ-0301', '宗泰', 'CT-ZT-2024-03', '宗泰竹科研發廠房', '張業務主任', '對講機', '防爆型工業對講通訊分機', 'J&R JR101-FK', 18, 18, 0, '台', '已交貨', '2024-05-20', '無塵室與產線區點交完成', '2025-01-15'],
      ['EQ-0302', '宗泰', 'CT-ZT-2024-03', '宗泰竹科研發廠房', '張業務主任', '攝影機', '4K紅外線防暴半球型網路攝影機', 'Hikvision DS-2CD2186', 70, 45, 25, '支', '未交貨', '2025-11-30', '外圍周界25支預計年底交貨', '2025-01-15'],
      ['EQ-0303', '宗泰', 'CT-ZT-2024-03', '宗泰竹科研發廠房', '張業務主任', '門禁系統', '快速伺服三叉閘門考勤通道', 'Kaba HSB-E02', 10, 6, 4, '道', '未交貨', '2026-03-15', '東側員工閘門待交貨', '2025-01-15'],
      ['EQ-0304', '宗泰', 'CT-ZT-2024-03', '宗泰竹科研發廠房', '張業務主任', '電子鎖', '600磅雙門磁力鎖附訊號接點', 'Gianni EM-600', 35, 35, 0, '組', '已交貨', '2024-06-01', '行政辦公室鋁門全數點交', '2025-01-15']
    ],
    '資訊星': [
      ['EQ-0401', '資訊星', 'CT-IS-2024-04', '資訊星雲端數據中心', '李業務總監', '對講機', 'IP觸控式門口對講主機', 'Panasonic VL-V900', 6, 6, 0, '台', '已交貨', '2024-08-10', 'IDC機房大門已啟用', '2025-02-05'],
      ['EQ-0402', '資訊星', 'CT-IS-2024-04', '資訊星雲端數據中心', '李業務總監', '攝影機', 'AI熱成像雙光譜周界球機', 'Hikvision DS-2TD4136', 16, 8, 8, '支', '未交貨', '2026-01-10', '第二批8支預計2026交貨', '2025-02-05'],
      ['EQ-0403', '資訊星', 'CT-IS-2024-04', '資訊星雲端數據中心', '李業務總監', '門禁系統', '掌靜脈高資安辨識主機', 'Fujitsu PalmSecure', 20, 20, 0, '套', '已交貨', '2024-09-01', 'IDC各機櫃通道已全數上線', '2025-02-05'],
      ['EQ-0404', '資訊星', 'CT-IS-2024-04', '資訊星雲端數據中心', '李業務總監', '電子鎖', '微電腦伺服機櫃電子聯鎖系統', 'Southco H3-EM', 60, 30, 30, '套', '未交貨', '2026-03-01', '第二批機櫃鎖預計2026交貨', '2025-02-05']
    ],
    '優德美科技': [
      ['EQ-1701', '優德美科技', 'CT-UDM-2025-01', '優德美智慧綠能研發中心', '陳專案經理', '燈控系統', '數位智能調光多迴路模組主機', 'Lutron QSGR-3P', 20, 20, 0, '組', '已交貨', '2024-04-15', '一期研發樓層智慧照明調光主機已全數完成點交', '2025-02-15'],
      ['EQ-1702', '優德美科技', 'CT-UDM-2025-01', '優德美智慧綠能研發中心', '陳專案經理', '燈控系統', '8迴路繼電器開關模組箱', 'Lite-Puter PL-S0805', 35, 20, 15, '套', '未交貨', '2025-06-30', '二期工程15套預計於年中交貨驗收', '2025-02-15']
    ],
    '富鈺節能科技': [
      ['EQ-1801', '富鈺節能科技', 'CT-FY-2025-01', '富鈺低碳節能展示總部', '林技術主管', '燈控系統', 'DALI-2 智慧照明閘道器控制模組', 'Schneider MTN6725-0001', 16, 16, 0, '組', '已交貨', '2024-03-20', '展廳與會議室 DALI 照明已正常運作', '2025-02-10'],
      ['EQ-1802', '富鈺節能科技', 'CT-FY-2025-01', '富鈺低碳節能展示總部', '林技術主管', '門禁系統', '多頻雙模人臉/RFID門禁考勤主機', 'Soyal AR-837-EA', 12, 6, 6, '組', '未交貨', '2025-09-15', '二期展示區域6組待工程進場後點交', '2025-02-10']
    ]
  };

  for (let c = 0; c < COMPANY_NAMES.length; c++) {
    const compName = COMPANY_NAMES[c];
    let sheet = ss.getSheetByName(compName);
    if (!sheet || forceReset) {
      if (!sheet) sheet = ss.insertSheet(compName);
      sheet.clear();
      sheet.appendRow(EQ_HEADERS);
      sheet.getRange(1, 1, 1, EQ_HEADERS.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#F8FAFC');
      sheet.setFrozenRows(1);

      const rows = sampleEqMap[compName];
      if (rows && rows.length > 0) {
        for (let r = 0; r < rows.length; r++) {
          sheet.appendRow(rows[r]);
        }
      }
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
 * 處理登入驗證
 */
function handleLogin(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SYSTEM_SHEETS.USERS);
  if (!sheet) return { success: false, error: '找不到使用者資料表' };
  ensureUserSheetHeaders(sheet);

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      if (String(row[1]) === String(password)) {
        const status = String(row[5] || '待審核').trim();
        if (row[0] !== 'admin' && status !== '啟用') {
          return {
            success: false,
            error: '此帳號目前為【' + (status || '待審核') + '】狀態，尚未由超級管理者審核啟用，請聯繫管理員！'
          };
        }

        let allowedCompanies = ['*'];
        const rawCompanies = String(row[4] || '*').trim();
        if (rawCompanies !== '*' && rawCompanies !== '') {
          allowedCompanies = rawCompanies.split(',').map(function(c) { return c.trim(); }).filter(Boolean);
        }

        logAudit(username, 'LOGIN', '使用者登入成功');

        return {
          success: true,
          user: {
            username: row[0],
            fullName: row[2] || row[0],
            role: row[3] || 'client',
            status: status,
            allowedCompanies: allowedCompanies,
            email: row[6] || '',
            phone: row[7] || '',
            createdAt: row[8] || ''
          }
        };
      } else {
        return { success: false, error: '密碼錯誤' };
      }
    }
  }

  return { success: false, error: '找不到該帳號' };
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
 * 欄位名稱正規化對照表 (相容中文表頭與英文表頭)
 */
function normalizeHeaderKey(rawHeader) {
  if (!rawHeader) return '';
  const h = String(rawHeader).trim().toLowerCase();
  
  if (h === 'id' || h === '設備id' || h === '編號' || h === '序號') return 'id';
  if (h === 'company_name' || h === '所屬公司' || h === '公司名稱' || h === '公司') return 'company_name';
  if (h === 'contract_id' || h === '合約編號' || h === '合約案號' || h === '合約號') return 'contract_id';
  if (h === 'project_name' || h === '建案名稱' || h === '工程名稱' || h === '建案' || h === '案名' || h === '專案' || h === '專案名稱') return 'project_name';
  if (h === 'sales_rep' || h === 'sales' || h.indexOf('業務') !== -1 || h === '業務人員' || h === '業務' || h === '業務專員' || h === '負責業務' || h === '業務員' || h === '專案業務') return 'sales_rep';
  if (h === 'system_type' || h === '系統分類' || h === '系統別' || h === '系統類別' || h === '系統') return 'system_type';
  if (h === 'brand' || h === '廠牌' || h === '廠牌分類' || h === '設備廠牌' || h === '品牌' || h === '廠牌名稱') return 'brand';
  if (h === 'device_name' || h === '設備名稱' || h === '品名' || h === '項目名稱') return 'device_name';
  if (h === 'model' || h === '品牌型號' || h === '型號' || h === '規格型號' || h === '規格') return 'model';
  if (h === 'quantity' || h === '合約總數' || h === '總數量' || h === '合約數量' || h === '數量') return 'quantity';
  if (h === 'delivered_qty' || h === '已交數量' || h === '已交貨數量' || h === '已交貨') return 'delivered_qty';
  if (h === 'undelivered_qty' || h === '未交數量' || h === '未交貨數量' || h === '未交貨') return 'undelivered_qty';
  if (h === 'unit' || h === '計量單位' || h === '單位') return 'unit';
  if (h === 'delivery_status' || h === '交貨狀態' || h === '狀態') return 'delivery_status';
  if (h === 'delivery_date' || h === '交貨日期' || h === '預計交貨日期' || h === '點交日期' || h === '日期') return 'delivery_date';
  if (h === 'remarks' || h === '備註' || h === '備註說明' || h === '說明') return 'remarks';
  if (h === 'updated_at' || h === '更新時間' || h === '異動日期') return 'updated_at';

  return String(rawHeader).trim();
}

/**
 * 取得設備清單 (支援跨公司獨立分頁或單一 Equipment 工作表)
 */
function getEquipmentList(userCompanies) {
  // 自動確保所有 18 家公司工作表分頁皆已存在
  try {
    ensureAllCompanySheets();
  } catch (e) {}

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

      // 補齊預設值
      if (!item.id) item.id = 'EQ-' + sheetName + '-' + i;
      if (!item.system_type) item.system_type = '對講機';
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

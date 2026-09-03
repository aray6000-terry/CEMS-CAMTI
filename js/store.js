/**
 * store.js - 系統狀態管理、多維度查詢過濾與各系統各型號年度預測分析
 */

class AppStore {
  constructor() {
    // 立即同步讀取本機快取，確保初次渲染 0ms 立即呈現完整 16 家公司資料
    this.companies = (window.apiService && window.apiService.getLocalCompanies) ? window.apiService.getLocalCompanies() : [];
    this.equipment = (window.apiService && window.apiService.getLocalEquipment) ? window.apiService.getLocalEquipment(['*']) : [];
    this.loading = false;
    this.activeSystem = 'all'; // 'all', '對講機', '攝影機', '門禁系統', '電子鎖'
    
    // 清單過濾條件 (支援公司、系統分類、廠牌分類、型號、交貨狀態、年度區間、關鍵字)
    this.filters = {
      company: 'all',
      brand: 'all',            // 設備廠牌篩選
      model: 'all',            // 設備型號篩選
      delivery_status: 'all',  // 'all', '已交貨', '未交貨'
      year: 'all',             // 'all', '2023' ~ '2030', 'range-2024-2026', 'range-2026-2028', 'range-2026-2030'
      keyword: '',
      undeliveredOnly: false
    };

    // 3-5年年度分析報表過濾條件 (支援公司、系統、廠牌、型號多層級連動)
    this.reportFilters = {
      company: 'all',
      system: 'all',           // 'all', '對講機', '攝影機', '門禁系統', '電子鎖'
      brand: 'all',            // 'all' 或特定廠牌
      model: 'all',            // 'all' 或特定型號
      deliveryStatus: 'all',   // 'all', '已交貨', '未交貨'
      metric: 'all_qty',       // 'all_qty' (總數量), 'delivered' (已交貨), 'undelivered' (未交貨)
      horizon: '5'             // '3' (未來3年), '5' (未來5年), 'all' (全歷程)
    };

    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  async loadData() {
    const currentUser = window.authService.getCurrentUser();
    const allowed = currentUser ? currentUser.allowedCompanies : ['*'];

    // 1. 先確認本機資料齊全
    if (!this.companies || this.companies.length === 0) {
      this.companies = window.apiService.getLocalCompanies();
    }
    if (!this.equipment || this.equipment.length === 0) {
      this.equipment = window.apiService.getLocalEquipment(allowed);
    }
    if (this.equipment && this.equipment.length > 0) {
      this.equipment.forEach(item => {
        if (!item.brand || item.brand === '其他廠牌' || item.brand === '標準廠牌') {
          item.brand = window.apiService.extractBrand(item.model, item.device_name, item.system_type);
        }
      });
    }
    this.notify();

    // 2. 若有設定 Google Apps Script Web App 雲端連線，非同步在背景讀取雲端並更新
    if (window.apiService.isLiveMode()) {
      this.loading = true;
      this.notify();

      try {
        const [companies, equipment] = await Promise.all([
          window.apiService.getCompanies(),
          window.apiService.getEquipment(allowed)
        ]);

        if (Array.isArray(companies) && companies.length > 0) {
          this.companies = companies;
        }
        if (Array.isArray(equipment) && equipment.length > 0) {
          this.equipment = equipment;
          this.equipment.forEach(item => {
            if (!item.brand || item.brand === '其他廠牌' || item.brand === '標準廠牌') {
              item.brand = window.apiService.extractBrand(item.model, item.device_name, item.system_type);
            }
          });
        }

        // 如果當前過濾的公司不在使用者授權清單內，重設為 'all'
        const allowedCompNames = window.authService.getAllowedCompanies(this.companies.map(c => c.company_name));
        if (this.filters.company !== 'all' && !allowedCompNames.includes(this.filters.company)) {
          this.filters.company = 'all';
        }
        if (this.reportFilters.company !== 'all' && !allowedCompNames.includes(this.reportFilters.company)) {
          this.reportFilters.company = 'all';
        }
      } catch (e) {
        console.warn('Google Sheet 雲端同步失敗，維持本機資料庫運作:', e);
      } finally {
        this.loading = false;
        this.notify();
      }
    } else {
      this.loading = false;
      this.notify();
    }
  }

  /**
   * 手動一鍵強制從 Google 試算表雲端同步最新資料庫
   */
  async syncFromCloud() {
    this.loading = true;
    this.notify();

    const currentUser = (window.authService && typeof window.authService.getCurrentUser === 'function') ? window.authService.getCurrentUser() : null;
    const allowed = (currentUser && Array.isArray(currentUser.allowedCompanies)) ? currentUser.allowedCompanies : ['*'];
    try {
      const res = await window.apiService.syncDatabaseFromCloud(allowed);
      if (res && res.success) {
        await this.loadData();
        return {
          success: true,
          companiesCount: this.companies.length,
          equipmentCount: this.equipment.length
        };
      } else {
        throw new Error(res ? res.error : '同步失敗');
      }
    } catch (e) {
      console.error('syncFromCloud 失敗:', e);
      return { success: false, error: e.message };
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  // --- 清單頁篩選方法 ---
  setSystemFilter(systemType) {
    this.activeSystem = systemType;
    this.filters.brand = 'all'; // 切換系統分頁時重設廠牌
    this.filters.model = 'all'; // 切換系統分頁時重設型號選單
    this.notify();
  }

  setCompanyFilter(companyName) {
    this.filters.company = companyName;
    this.filters.brand = 'all'; // 更換公司時重設廠牌
    this.filters.model = 'all'; // 更換公司時重設型號選單
    this.notify();
  }

  setBrandFilter(brand) {
    this.filters.brand = brand;
    this.filters.model = 'all'; // 更換廠牌時重設型號選單
    this.notify();
  }

  setModelFilter(model) {
    this.filters.model = model;
    this.notify();
  }

  setDeliveryStatusFilter(status) {
    this.filters.delivery_status = status;
    this.notify();
  }

  setYearFilter(year) {
    this.filters.year = year;
    this.notify();
  }

  setKeywordFilter(keyword) {
    this.filters.keyword = (keyword || '').trim().toLowerCase();
    this.notify();
  }

  toggleUndeliveredFilter() {
    this.filters.undeliveredOnly = !this.filters.undeliveredOnly;
    this.notify();
  }

  // --- 年度報表頁篩選方法 ---
  setReportCompany(company) {
    this.reportFilters.company = company;
    this.reportFilters.brand = 'all';
    this.reportFilters.model = 'all';
    this.notify();
  }

  setReportSystem(system) {
    this.reportFilters.system = system;
    this.reportFilters.brand = 'all';
    this.reportFilters.model = 'all';
    this.notify();
  }

  setReportBrand(brand) {
    this.reportFilters.brand = brand;
    this.reportFilters.model = 'all';
    this.notify();
  }

  setReportModel(model) {
    this.reportFilters.model = model;
    this.notify();
  }

  setReportDeliveryStatus(deliveryStatus) {
    this.reportFilters.deliveryStatus = deliveryStatus;
    if (deliveryStatus === '已交貨') {
      this.reportFilters.metric = 'delivered';
    } else if (deliveryStatus === '未交貨') {
      this.reportFilters.metric = 'undelivered';
    } else {
      this.reportFilters.metric = 'all_qty';
    }
    this.notify();
  }

  setReportMetric(metric) {
    this.reportFilters.metric = metric;
    if (metric === 'delivered') {
      this.reportFilters.deliveryStatus = '已交貨';
    } else if (metric === 'undelivered') {
      this.reportFilters.deliveryStatus = '未交貨';
    } else {
      this.reportFilters.deliveryStatus = 'all';
    }
    this.notify();
  }

  setReportHorizon(horizon) {
    this.reportFilters.horizon = horizon;
    this.notify();
  }

  /**
   * 取得清單頁可用廠牌清單 (依所選公司與當前系統分頁過濾)
   */
  getListAvailableBrands() {
    const accessible = this.equipment.filter(item => {
      if (!window.authService.canAccessCompany(item.company_name)) return false;
      if (this.filters.company !== 'all' && item.company_name !== this.filters.company) return false;
      if (this.activeSystem !== 'all' && this.normalizeSystemType(item.system_type, item) !== this.normalizeSystemType(this.activeSystem)) return false;
      return true;
    });

    const brandsSet = new Set();
    accessible.forEach(item => {
      const b = (item.brand || '').trim();
      if (b) brandsSet.add(b);
    });

    return Array.from(brandsSet).sort();
  }

  /**
   * 取得清單頁各廠牌及其設備項目筆數 (供頂部次分類 Chips / Pills 即時顯示)
   */
  getListAvailableBrandsWithCounts() {
    const accessible = this.equipment.filter(item => {
      if (!window.authService.canAccessCompany(item.company_name)) return false;
      if (this.filters.company !== 'all' && item.company_name !== this.filters.company) return false;
      if (this.activeSystem !== 'all' && this.normalizeSystemType(item.system_type, item) !== this.normalizeSystemType(this.activeSystem)) return false;
      return true;
    });

    const counts = {};
    accessible.forEach(item => {
      const b = (item.brand || '其他廠牌').trim();
      counts[b] = (counts[b] || 0) + 1;
    });

    return Object.keys(counts).sort().map(b => ({
      brand: b,
      count: counts[b]
    }));
  }

  /**
   * 取得清單頁可用型號清單 (依所選公司、系統分頁及廠牌進一步智慧過濾)
   */
  getListAvailableModels() {
    const accessible = this.equipment.filter(item => {
      if (!window.authService.canAccessCompany(item.company_name)) return false;
      if (this.filters.company !== 'all' && item.company_name !== this.filters.company) return false;
      if (this.activeSystem !== 'all' && this.normalizeSystemType(item.system_type, item) !== this.normalizeSystemType(this.activeSystem)) return false;
      return true;
    });

    const modelsSet = new Set();
    accessible.forEach(item => {
      if (item.model && item.model.trim()) {
        modelsSet.add(item.model.trim());
      }
    });

    return Array.from(modelsSet).sort();
  }

  /**
   * 取得報表頁可用廠牌清單 (依所選公司與系統分類過濾)
   */
  getAvailableBrands() {
    const accessible = this.equipment.filter(item => {
      if (!window.authService.canAccessCompany(item.company_name)) return false;
      if (this.reportFilters.company !== 'all' && item.company_name !== this.reportFilters.company) return false;
      if (this.reportFilters.system !== 'all' && this.normalizeSystemType(item.system_type) !== this.normalizeSystemType(this.reportFilters.system)) return false;
      return true;
    });

    const brandsSet = new Set();
    accessible.forEach(item => {
      const b = (item.brand || '').trim();
      if (b) brandsSet.add(b);
    });

    return Array.from(brandsSet).sort();
  }

  /**
   * 取得報表頁可用型號清單 (依所選公司、系統分類與廠牌分類過濾)
   */
  getAvailableModels() {
    const accessible = this.equipment.filter(item => {
      if (!window.authService.canAccessCompany(item.company_name)) return false;
      if (this.reportFilters.company !== 'all' && item.company_name !== this.reportFilters.company) return false;
      if (this.reportFilters.system !== 'all' && this.normalizeSystemType(item.system_type) !== this.normalizeSystemType(this.reportFilters.system)) return false;
      if (this.reportFilters.brand !== 'all' && (item.brand || '').trim() !== this.reportFilters.brand) return false;
      return true;
    });

    const modelsSet = new Set();
    accessible.forEach(item => {
      if (item.model && item.model.trim()) {
        modelsSet.add(item.model.trim());
      }
    });

    return Array.from(modelsSet).sort();
  }

  /**
   * 取得整個資料庫中所有獨立廠牌清單 (供彈窗 datalist 下拉選取)
   */
  getAllUniqueBrands(systemType = null) {
    const brandsSet = new Set();
    this.equipment.forEach(item => {
      if (!systemType || systemType === 'all' || item.system_type === systemType) {
        const b = (item.brand || '').trim();
        if (b) brandsSet.add(b);
      }
    });
    // 如果指定系統但數量較少，也補上全庫常用廠牌
    if (brandsSet.size === 0) {
      this.equipment.forEach(item => {
        const b = (item.brand || '').trim();
        if (b) brandsSet.add(b);
      });
    }
    return Array.from(brandsSet).sort();
  }

  /**
   * 取得整個資料庫中所有獨立型號清單 (可指定廠牌進行連動過濾，供彈窗 datalist 下拉選取)
   */
  getAllUniqueModels(brand = null) {
    const modelsSet = new Set();
    const cleanBrand = (brand || '').trim().toLowerCase();
    
    this.equipment.forEach(item => {
      const itemBrand = (item.brand || '').trim().toLowerCase();
      if (!cleanBrand || itemBrand === cleanBrand) {
        if (item.model && item.model.trim()) {
          modelsSet.add(item.model.trim());
        }
      }
    });

    // 若指定廠牌查無型號，回傳所有型號以利挑選
    if (modelsSet.size === 0) {
      this.equipment.forEach(item => {
        if (item.model && item.model.trim()) {
          modelsSet.add(item.model.trim());
        }
      });
    }

    return Array.from(modelsSet).sort();
  }

  /**
   * 系統別名稱容錯正規化 (相容「門禁」與「門禁系統」、「燈控」與「燈控系統」)
   */
  normalizeSystemType(sys, item = null) {
    let s = String(sys || '').trim().toLowerCase();
    
    // 若 sys 為空，但有傳入 item，自動從設備名稱、型號、備註全方位推導
    if ((!s || s === '未分類' || s === 'undefined') && item) {
      s = `${item.system_type || ''} ${item.device_name || ''} ${item.model || ''} ${item.remarks || ''}`.trim().toLowerCase();
    }

    if (s.indexOf('門禁') !== -1 || s.indexOf('刷卡') !== -1 || s.indexOf('讀卡') !== -1 || s.indexOf('讀頭') !== -1 || s.indexOf('電梯管制') !== -1 || s.indexOf('樓層管制') !== -1 || s.indexOf('閘門') !== -1 || s.indexOf('access') !== -1) return '門禁系統';
    if (s.indexOf('燈控') !== -1 || s.indexOf('照明') !== -1 || s.indexOf('調光') !== -1 || s.indexOf('燈光') !== -1 || s.indexOf('迴路') !== -1 || s.indexOf('light') !== -1 || s.indexOf('lutron') !== -1 || s.indexOf('schneider') !== -1) return '燈控系統';
    if (s.indexOf('攝影') !== -1 || s.indexOf('監視') !== -1 || s.indexOf('監控') !== -1 || s.indexOf('cctv') !== -1 || s.indexOf('camera') !== -1 || s.indexOf('錄影') !== -1) return '攝影機系統';
    if (s.indexOf('對講') !== -1 || s.indexOf('門口機') !== -1 || s.indexOf('室內機') !== -1 || s.indexOf('總機') !== -1 || s.indexOf('intercom') !== -1) return '對講系統';
    if (s.indexOf('鎖') !== -1 || s.indexOf('陽極') !== -1 || s.indexOf('磁力') !== -1 || s.indexOf('陰極') !== -1 || s.indexOf('lock') !== -1) return '電子鎖';
    
    return String(sys || '').trim();
  }

  /**
   * 取得設備清單 (根據篩選條件、型號與年度區間精確過濾)
   */
  getFilteredEquipment() {
    return this.equipment.filter(item => {
      // 1. 公司權限與篩選
      if (!window.authService.canAccessCompany(item.company_name)) return false;
      if (this.filters.company !== 'all' && item.company_name !== this.filters.company) return false;

      // 2. 5大系統分頁篩選 (支援門禁/門禁系統、燈控/燈控系統容錯比對與設備名稱語義推導)
      if (this.activeSystem !== 'all') {
        const itemSys = this.normalizeSystemType(item.system_type, item);
        const activeSys = this.normalizeSystemType(this.activeSystem);
        if (itemSys !== activeSys) return false;
      }

      // 3. 設備型號篩選 (強大容錯：壓縮多餘空白、忽略大小寫、轉字串)
      if (this.filters.model && this.filters.model !== 'all') {
        const itemModel = String(item.model || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const filterModel = String(this.filters.model).replace(/\s+/g, ' ').trim().toLowerCase();
        if (itemModel !== filterModel) return false;
      }

      // 4. 交貨狀態精確過濾 (已交貨 / 未交貨)
      if (this.filters.delivery_status !== 'all') {
        const itemStatus = item.delivery_status || (Number(item.delivered_qty) >= Number(item.quantity) ? '已交貨' : '未交貨');
        if (this.filters.delivery_status === '已交貨') {
          if (itemStatus !== '已交貨' && Number(item.delivered_qty) <= 0) return false;
        } else if (this.filters.delivery_status === '未交貨') {
          if (itemStatus !== '未交貨' && (Number(item.undelivered_qty) || 0) <= 0) return false;
        }
      }

      // 5. 年度區間篩選 (新增)
      if (this.filters.year !== 'all') {
        const dDate = item.delivery_date || item.install_date;
        const itemYear = dDate ? parseInt(dDate.substring(0, 4), 10) : 2024;
        const targetYear = isNaN(itemYear) ? 2024 : itemYear;

        if (this.filters.year.startsWith('range-')) {
          if (this.filters.year === 'range-2024-2026') {
            if (targetYear < 2024 || targetYear > 2026) return false;
          } else if (this.filters.year === 'range-2026-2028') {
            if (targetYear < 2026 || targetYear > 2028) return false;
          } else if (this.filters.year === 'range-2026-2030') {
            if (targetYear < 2026 || targetYear > 2030) return false;
          }
        } else {
          const selectedYearNum = parseInt(this.filters.year, 10);
          if (targetYear !== selectedYearNum) return false;
        }
      }

      // 6. 僅顯示未交貨設備過濾
      if (this.filters.undeliveredOnly) {
        const undelivered = Number(item.undelivered_qty) || 0;
        const itemStatus = item.delivery_status || '已交貨';
        if (itemStatus === '已交貨' && undelivered <= 0) return false;
      }

      // 7. 關鍵字搜尋 (支援設備名稱、品牌型號、建案名稱、業務人員、合約編號、備註、ID)
      if (this.filters.keyword) {
        const q = this.filters.keyword;
        const match =
          (item.id && item.id.toLowerCase().includes(q)) ||
          (item.device_name && item.device_name.toLowerCase().includes(q)) ||
          (item.model && item.model.toLowerCase().includes(q)) ||
          (item.project_name && item.project_name.toLowerCase().includes(q)) ||
          (item.sales_rep && item.sales_rep.toLowerCase().includes(q)) ||
          (item.contract_id && item.contract_id.toLowerCase().includes(q)) ||
          (item.company_name && item.company_name.toLowerCase().includes(q)) ||
          (item.remarks && item.remarks.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }

  /**
   * 計算當前分頁與篩選條件下的總數量統計 (Total, Delivered, Undelivered, Rate)
   */
  getCurrentTabStats() {
    const items = this.getFilteredEquipment();
    let totalQty = 0;
    let deliveredQty = 0;
    let undeliveredQty = 0;

    items.forEach(item => {
      const q = Number(item.quantity) || 1;
      const d = (item.delivered_qty !== undefined && item.delivered_qty !== null) ? Number(item.delivered_qty) : (item.delivery_status === '已交貨' ? q : 0);
      const u = (item.undelivered_qty !== undefined && item.undelivered_qty !== null) ? Number(item.undelivered_qty) : (q - d);

      totalQty += q;
      deliveredQty += d;
      undeliveredQty += u;
    });

    const rate = totalQty > 0 ? Math.round((deliveredQty / totalQty) * 100) : 0;

    return {
      totalRecords: items.length,
      totalQty,
      deliveredQty,
      undeliveredQty,
      deliveryRate: rate + '%'
    };
  }

  /**
   * 計算 4 大系統與全域交貨統計 KPI
   */
  getStats() {
    const accessibleEquipment = this.equipment.filter(item => {
      if (!window.authService.canAccessCompany(item.company_name)) return false;
      if (this.filters.company !== 'all' && item.company_name !== this.filters.company) return false;
      return true;
    });

    let totalQuantity = 0;
    let totalDeliveredQty = 0;
    let totalUndeliveredQty = 0;
    let intercomQty = 0;
    let cameraQty = 0;
    let accessQty = 0;
    let lockQty = 0;
    let lightQty = 0;

    accessibleEquipment.forEach(item => {
      const q = Number(item.quantity) || 1;
      const dQty = (item.delivered_qty !== undefined && item.delivered_qty !== null) ? Number(item.delivered_qty) : (item.delivery_status === '已交貨' ? q : 0);
      const uQty = (item.undelivered_qty !== undefined && item.undelivered_qty !== null) ? Number(item.undelivered_qty) : (q - dQty);

      totalQuantity += q;
      totalDeliveredQty += dQty;
      totalUndeliveredQty += uQty;

      const sType = this.normalizeSystemType(item.system_type, item);
      if (sType === '對講系統' || sType === '對講機') intercomQty += q;
      if (sType === '門禁系統') accessQty += q;
      if (sType === '攝影機系統' || sType === '攝影機') cameraQty += q;
      if (sType === '電子鎖') lockQty += q;
      if (sType === '燈控系統') lightQty += q;
    });

    return {
      totalRecords: accessibleEquipment.length,
      totalQuantity,
      totalDeliveredQty,
      totalUndeliveredQty,
      intercomQty,
      cameraQty,
      accessQty,
      lockQty,
      lightQty
    };
  }

  /**
   * 取得各公司目前設備數量統計 (供公司分頁標籤顯示)
   */
  getCompanyTabCounts() {
    const counts = { all: 0 };
    this.companies.forEach(c => { counts[c.company_name] = 0; });
    
    this.equipment.forEach(item => {
      if (window.authService.canAccessCompany(item.company_name)) {
        const q = Number(item.quantity) || 1;
        counts.all = (counts.all || 0) + q;
        if (item.company_name) {
          counts[item.company_name] = (counts[item.company_name] || 0) + q;
        }
      }
    });
    return counts;
  }

  /**
   * 各系統各型號之各年度數量預測與分析數據引擎
   */
  getAnnualAnalyticsData() {
    const accessibleEquipment = this.equipment.filter(item => {
      if (!window.authService.canAccessCompany(item.company_name)) return false;
      if (this.reportFilters.company !== 'all' && item.company_name !== this.reportFilters.company) return false;
      if (this.reportFilters.system !== 'all' && this.normalizeSystemType(item.system_type) !== this.normalizeSystemType(this.reportFilters.system)) return false;
      if (this.reportFilters.brand !== 'all' && (item.brand || '').trim() !== this.reportFilters.brand) return false;
      if (this.reportFilters.model !== 'all' && item.model !== this.reportFilters.model) return false;
      
      // 交貨狀態過濾
      if (this.reportFilters.deliveryStatus === '已交貨') {
        const d = Number(item.delivered_qty);
        if (item.delivery_status !== '已交貨' && (isNaN(d) || d <= 0)) return false;
      } else if (this.reportFilters.deliveryStatus === '未交貨') {
        const u = Number(item.undelivered_qty);
        if (item.delivery_status !== '未交貨' && (isNaN(u) || u <= 0)) return false;
      }
      return true;
    });

    let years = [];
    const horizon = this.reportFilters.horizon;
    if (horizon === '3') {
      years = [2026, 2027, 2028];
    } else if (horizon === '5') {
      years = [2026, 2027, 2028, 2029, 2030];
    } else {
      years = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
    }

    const annualTotals = {};
    const allYearsList = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
    
    allYearsList.forEach(yr => {
      annualTotals[yr] = {
        year: yr,
        intercom: 0,
        camera: 0,
        access: 0,
        lock: 0,
        light: 0,
        delivered: 0,
        undelivered: 0,
        total: 0,
        isForecast: yr >= 2026
      };
    });

    // 歷史年份統計 (2023-2025)
    accessibleEquipment.forEach(item => {
      const q = Number(item.quantity) || 1;
      const dQty = Number(item.delivered_qty) !== undefined ? Number(item.delivered_qty) : (item.delivery_status === '已交貨' ? q : 0);
      const uQty = Number(item.undelivered_qty) !== undefined ? Number(item.undelivered_qty) : (q - dQty);
      const year = item.delivery_date ? parseInt(item.delivery_date.substring(0, 4), 10) : 2024;
      const targetYear = allYearsList.includes(year) ? year : 2024;

      const sys = this.normalizeSystemType(item.system_type);
      if (annualTotals[targetYear]) {
        let addQty = q;
        if (this.reportFilters.deliveryStatus === '已交貨' || this.reportFilters.metric === 'delivered') {
          addQty = dQty;
        } else if (this.reportFilters.deliveryStatus === '未交貨' || this.reportFilters.metric === 'undelivered') {
          addQty = uQty;
        }

        if (sys === '對講機') annualTotals[targetYear].intercom += addQty;
        if (sys === '攝影機') annualTotals[targetYear].camera += addQty;
        if (sys === '門禁系統') annualTotals[targetYear].access += addQty;
        if (sys === '電子鎖') annualTotals[targetYear].lock += addQty;
        if (sys === '燈控系統') annualTotals[targetYear].light += addQty;
        annualTotals[targetYear].delivered += dQty;
        annualTotals[targetYear].undelivered += uQty;
        annualTotals[targetYear].total += addQty;
      }
    });

    // 未來年份預測推估 (2026-2030)
    const baseTotal = annualTotals[2024].total + annualTotals[2025].total;
    const modelMultiplier = (this.reportFilters.model !== 'all') ? 0.35 : 1.0;

    [2026, 2027, 2028, 2029, 2030].forEach((yr, idx) => {
      const growthFactor = 1 + (idx + 1) * 0.12;
      const estTotal = Math.max(annualTotals[yr].total, Math.round((Math.max(baseTotal, 15) * 0.5 * growthFactor) * modelMultiplier));

      if (annualTotals[yr].total === 0) {
        let currentEst = estTotal;
        if (this.reportFilters.deliveryStatus === '已交貨' || this.reportFilters.metric === 'delivered') {
          currentEst = Math.round(estTotal * (yr <= 2026 ? 0.4 : 0.2));
        } else if (this.reportFilters.deliveryStatus === '未交貨' || this.reportFilters.metric === 'undelivered') {
          currentEst = estTotal - Math.round(estTotal * (yr <= 2026 ? 0.4 : 0.2));
        }

        annualTotals[yr].intercom = Math.round(currentEst * 0.2);
        annualTotals[yr].camera = Math.round(currentEst * 0.3);
        annualTotals[yr].access = Math.round(currentEst * 0.2);
        annualTotals[yr].lock = Math.round(currentEst * 0.15);
        annualTotals[yr].light = currentEst - (annualTotals[yr].intercom + annualTotals[yr].camera + annualTotals[yr].access + annualTotals[yr].lock);
        annualTotals[yr].total = currentEst;
        annualTotals[yr].delivered = Math.round(estTotal * (yr <= 2026 ? 0.4 : 0.2));
        annualTotals[yr].undelivered = estTotal - annualTotals[yr].delivered;
      }
    });

    const matrix = years.map(yr => {
      const item = annualTotals[yr];
      return {
        year: yr,
        intercom: item.intercom,
        camera: item.camera,
        access: item.access,
        lock: item.lock,
        light: item.light,
        delivered: item.delivered,
        undelivered: item.undelivered,
        total: item.total,
        isForecast: item.isForecast,
        advice: item.isForecast ? `預估 ${yr} 年度交貨排程推進，建議提前備料` : `${yr} 年度已依合約進度完成交貨點交`
      };
    });

    // 各型號詳細交貨矩陣明細
    const modelGroups = {};
    accessibleEquipment.forEach(item => {
      const key = `${item.system_type}__${item.brand || '標準廠牌'}__${item.model || '未標示型號'}__${item.project_name || '未指定建案'}`;
      const q = Number(item.quantity) || 1;
      const dQty = Number(item.delivered_qty) !== undefined ? Number(item.delivered_qty) : (item.delivery_status === '已交貨' ? q : 0);
      const uQty = Number(item.undelivered_qty) !== undefined ? Number(item.undelivered_qty) : (q - dQty);

      if (!modelGroups[key]) {
        modelGroups[key] = {
          system_type: item.system_type,
          brand: item.brand || '標準廠牌',
          model: item.model || '標準通用型',
          device_name: item.device_name,
          project_name: item.project_name || '新建案工程',
          sales_rep: item.sales_rep || '-',
          company_name: item.company_name,
          unit: item.unit || '台',
          total_qty: 0,
          delivered_qty: 0,
          undelivered_qty: 0,
          delivery_status: item.delivery_status,
          yearTotals: {}
        };
        allYearsList.forEach(y => {
          modelGroups[key].yearTotals[y] = { delivered: 0, undelivered: 0, total: 0 };
        });
      }

      const y = item.delivery_date ? parseInt(item.delivery_date.substring(0, 4), 10) : 2024;
      const targetY = allYearsList.includes(y) ? y : 2024;

      modelGroups[key].total_qty += q;
      modelGroups[key].delivered_qty += dQty;
      modelGroups[key].undelivered_qty += uQty;
      modelGroups[key].yearTotals[targetY].delivered += dQty;
      modelGroups[key].yearTotals[targetY].undelivered += uQty;
      modelGroups[key].yearTotals[targetY].total += q;
    });

    let modelBreakdownList = Object.values(modelGroups);

    if (this.reportFilters.deliveryStatus === '已交貨') {
      modelBreakdownList = modelBreakdownList.filter(m => m.delivered_qty > 0 || m.delivery_status === '已交貨');
    } else if (this.reportFilters.deliveryStatus === '未交貨') {
      modelBreakdownList = modelBreakdownList.filter(m => m.undelivered_qty > 0 || m.delivery_status === '未交貨');
    }

    return {
      years,
      matrix,
      modelBreakdownList,
      company: this.reportFilters.company,
      system: this.reportFilters.system,
      brand: this.reportFilters.brand,
      model: this.reportFilters.model,
      deliveryStatus: this.reportFilters.deliveryStatus,
      metric: this.reportFilters.metric,
      horizon: this.reportFilters.horizon
    };
  }

  /**
   * 匯出目前清單查詢結果為 CSV
   */
  exportCurrentToCsv() {
    const items = this.getFilteredEquipment();
    if (!items || items.length === 0) {
      alert('目前無任何設備資料可匯出！');
      return;
    }

    const headers = [
      '設備ID', '所屬公司', '合約編號', '建案名稱', '業務人員', '系統分類', '廠牌', '設備名稱',
      '品牌型號', '合約總數量', '已交貨數量', '未交貨數量', '單位', '交貨狀態',
      '預計/實際交貨日', '備註', '最後更新'
    ];

    const rows = items.map(item => [
      item.id || '',
      item.company_name || '',
      item.contract_id || '',
      `"${(item.project_name || '').replace(/"/g, '""')}"`,
      `"${(item.sales_rep || '').replace(/"/g, '""')}"`,
      item.system_type || '',
      `"${(item.brand || '').replace(/"/g, '""')}"`,
      `"${(item.device_name || '').replace(/"/g, '""')}"`,
      `"${(item.model || '').replace(/"/g, '""')}"`,
      item.quantity || 1,
      item.delivered_qty !== undefined ? item.delivered_qty : (item.delivery_status === '已交貨' ? item.quantity : 0),
      item.undelivered_qty !== undefined ? item.undelivered_qty : (item.delivery_status === '未交貨' ? item.quantity : 0),
      item.unit || '台',
      item.delivery_status || '已交貨',
      item.delivery_date || '',
      `"${(item.remarks || '').replace(/"/g, '""')}"`,
      item.updated_at || ''
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `合約設備交貨清單_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 匯出各系統各型號年度分析報表為 CSV
   */
  exportAnnualReportToCsv() {
    const reportData = this.getAnnualAnalyticsData();
    const rows = reportData.modelBreakdownList;

    if (!rows || rows.length === 0) {
      alert('無年度數據可匯出！');
      return;
    }

    const yearCols = reportData.years;
    const isDeliveredOnly = (reportData.deliveryStatus === '已交貨');
    const isUndeliveredOnly = (reportData.deliveryStatus === '未交貨');
    const colName = isDeliveredOnly ? '已交貨數量' : (isUndeliveredOnly ? '未交貨數量' : '數量');

    const headers = [
      '系統分類', '廠牌', '品牌型號', '設備名稱', '建案名稱', '業務人員', '所屬公司', '合約總數量', '已交貨數量', '未交貨數量', '交貨狀態',
      ...yearCols.map(y => `${y}年${colName}`)
    ];

    const csvRows = rows.map(r => [
      r.system_type,
      `"${(r.brand || '').replace(/"/g, '""')}"`,
      `"${r.model.replace(/"/g, '""')}"`,
      `"${r.device_name.replace(/"/g, '""')}"`,
      `"${r.project_name.replace(/"/g, '""')}"`,
      `"${(r.sales_rep || '').replace(/"/g, '""')}"`,
      r.company_name,
      r.total_qty,
      r.delivered_qty,
      r.undelivered_qty,
      r.delivery_status,
      ...yearCols.map(y => {
        const yt = r.yearTotals[y];
        if (!yt) return 0;
        if (isDeliveredOnly) return yt.delivered || 0;
        if (isUndeliveredOnly) return yt.undelivered || 0;
        return yt.total || 0;
      })
    ]);

    const titleRow = `合約設備各系統各型號年度交貨報表 - 公司:${reportData.company} - 系統:${reportData.system} - 廠牌:${reportData.brand} - 型號:${reportData.model} - 狀態:${reportData.deliveryStatus}\r\n`;
    const csvContent = '\uFEFF' + titleRow + [
      headers.join(','),
      ...csvRows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `各系統各型號年度報表_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

window.appStore = new AppStore();

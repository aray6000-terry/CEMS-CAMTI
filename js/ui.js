/**
 * ui.js - 使用者介面渲染、互動控制器、SVG圖表、各型號篩選與超級管理者審核與公司查看權限管理
 */

class UIManager {
  constructor() {
    this.modalEquipment = document.getElementById('modal-equipment');
    this.modalLogin = document.getElementById('modal-login');
    this.modalUserMgmt = document.getElementById('modal-user-mgmt');
    this.modalUserPermission = document.getElementById('modal-user-permission');
    this.cachedUsersList = [];
  }

  /**
   * 初始化所有 UI 綁定事件
   */
  initEvents() {
    // 0. 視圖切換 (設備清單 vs 3-5年年度報表)
    const btnViewTable = document.getElementById('btn-view-table');
    const btnViewReport = document.getElementById('btn-view-report');
    const secTable = document.getElementById('section-table-view');
    const secReport = document.getElementById('section-report-view');

    if (btnViewTable && btnViewReport) {
      btnViewTable.addEventListener('click', () => {
        secTable.classList.remove('hidden');
        secReport.classList.add('hidden');
        btnViewTable.classList.replace('btn-secondary', 'btn-primary');
        btnViewReport.classList.replace('btn-primary', 'btn-secondary');
      });

      btnViewReport.addEventListener('click', () => {
        secTable.classList.add('hidden');
        secReport.classList.remove('hidden');
        btnViewReport.classList.replace('btn-secondary', 'btn-primary');
        btnViewTable.classList.replace('btn-primary', 'btn-secondary');
        this.renderAnnualReport(window.appStore);
      });

      // 視窗縮放時重新調整圖表寬度
      window.addEventListener('resize', () => {
        if (!secReport.classList.contains('hidden')) {
          this.renderSvgChart(window.appStore.getAnnualAnalyticsData());
        }
      });
    }

    // 0.1 年度報表專屬下拉選單監聽
    const repCompany = document.getElementById('report-filter-company');
    if (repCompany) {
      repCompany.addEventListener('change', (e) => {
        window.appStore.setReportCompany(e.target.value);
      });
    }

    const repSystem = document.getElementById('report-filter-system');
    if (repSystem) {
      repSystem.addEventListener('change', (e) => {
        window.appStore.setReportSystem(e.target.value);
      });
    }

    const repBrand = document.getElementById('report-filter-brand');
    if (repBrand) {
      repBrand.addEventListener('change', (e) => {
        window.appStore.setReportBrand(e.target.value);
      });
    }

    const repModel = document.getElementById('report-filter-model');
    if (repModel) {
      repModel.addEventListener('change', (e) => {
        window.appStore.setReportModel(e.target.value);
      });
    }

    const repDelivery = document.getElementById('report-filter-delivery');
    const repMetric = document.getElementById('report-filter-metric');

    if (repDelivery) {
      repDelivery.addEventListener('change', (e) => {
        window.appStore.setReportDeliveryStatus(e.target.value);
        if (repMetric) {
          repMetric.value = window.appStore.reportFilters.metric;
        }
      });
    }

    if (repMetric) {
      repMetric.addEventListener('change', (e) => {
        window.appStore.setReportMetric(e.target.value);
        if (repDelivery) {
          repDelivery.value = window.appStore.reportFilters.deliveryStatus;
        }
      });
    }

    const repHorizon = document.getElementById('report-filter-horizon');
    if (repHorizon) {
      repHorizon.addEventListener('change', (e) => {
        window.appStore.setReportHorizon(e.target.value);
      });
    }

    const btnExportReport = document.getElementById('btn-export-report');
    if (btnExportReport) {
      btnExportReport.addEventListener('click', () => {
        window.appStore.exportAnnualReportToCsv();
      });
    }

    // 1. 5大系統分頁點擊 (頂部按鈕即時連動下方選單與表格)
    document.querySelectorAll('.sys-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sys = btn.getAttribute('data-sys');
        document.querySelectorAll('.sys-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 連動更新下方篩選橫條的 filter-system 下拉選單
        const filterSysSel = document.getElementById('filter-system');
        if (filterSysSel) filterSysSel.value = sys;

        window.appStore.setSystemFilter(sys);
      });
    });

    // 2. 清單頁 - 公司篩選下拉選單
    const companySelect = document.getElementById('filter-company');
    if (companySelect) {
      companySelect.addEventListener('change', (e) => {
        window.appStore.setCompanyFilter(e.target.value);
      });
    }

    // 2.2 清單頁 - 系統分類篩選下拉選單 (雙向連動頂部分頁按鈕)
    const filterSysSelect = document.getElementById('filter-system');
    if (filterSysSelect) {
      filterSysSelect.addEventListener('change', (e) => {
        const sys = e.target.value;
        document.querySelectorAll('.sys-tab-btn').forEach(b => {
          if (b.getAttribute('data-sys') === sys) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
        window.appStore.setSystemFilter(sys);
      });
    }

    // 3. 清單頁 - 設備型號篩選下拉選單 (雙重事件監聽確保 100% 即刻連動)
    const listModelSelect = document.getElementById('filter-model');
    if (listModelSelect) {
      listModelSelect.addEventListener('change', (e) => {
        window.appStore.setModelFilter(e.target.value);
      });
    }
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'filter-model') {
        window.appStore.setModelFilter(e.target.value);
      }
    });

    // 4. 清單頁 - 交貨狀態篩選下拉選單
    const deliverySelect = document.getElementById('filter-delivery-status');
    if (deliverySelect) {
      deliverySelect.addEventListener('change', (e) => {
        window.appStore.setDeliveryStatusFilter(e.target.value);
      });
    }

    // 5. 清單頁 - 年度區間篩選下拉選單
    const yearSelect = document.getElementById('filter-year');
    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        window.appStore.setYearFilter(e.target.value);
      });
    }

    // 6. 關鍵字即時搜尋
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.appStore.setKeywordFilter(e.target.value);
      });
    }

    // 7. 僅看未交貨快速過濾按鈕
    const btnUndelivered = document.getElementById('btn-filter-undelivered');
    if (btnUndelivered) {
      btnUndelivered.addEventListener('click', () => {
        window.appStore.toggleUndeliveredFilter();
        btnUndelivered.classList.toggle('btn-primary', window.appStore.filters.undeliveredOnly);
        btnUndelivered.classList.toggle('btn-secondary', !window.appStore.filters.undeliveredOnly);
      });
    }

    // 8. 重新整理資料 (即時向 Google Sheet 雲端同步並精確回報讀取筆數)
    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('loading');
        try {
          await window.appStore.loadData();
          const total = window.appStore.equipment ? window.appStore.equipment.length : 0;
          this.showToast(`✅ 已成功同步 Google Sheet 最新資料（共 ${total} 筆設備）！`, 'success');
        } catch (err) {
          this.showToast(`⚠️ 同步發生異常: ${err.message}`, 'error');
        } finally {
          btnRefresh.classList.remove('loading');
        }
      });
    }

    // 9. 匯出 CSV 按鈕
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        window.appStore.exportCurrentToCsv();
      });
    }

    // 10. 新增設備按鈕
    const btnAdd = document.getElementById('btn-add-device');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.openEquipmentModal(null);
      });
    }

    // 11. 登出按鈕監聽
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('請確認是否要登出系統？')) {
          window.authService.logout();
          this.showToast('已安全登出系統', 'info');
        }
      });
    }

    // 11.1 開啟登入 / 註冊視窗
    const btnOpenLogin = document.getElementById('btn-open-login');
    if (btnOpenLogin) {
      btnOpenLogin.addEventListener('click', () => {
        this.showLoginScreen('login');
      });
    }

    // 11.2 登入與申請帳戶頁籤切換
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');
    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => this.switchAuthTab('login'));
      tabRegister.addEventListener('click', () => this.switchAuthTab('register'));
    }

    const linkToRegister = document.getElementById('link-to-register');
    if (linkToRegister) {
      linkToRegister.addEventListener('click', () => this.switchAuthTab('register'));
    }

    const linkToLogin = document.getElementById('link-to-login');
    if (linkToLogin) {
      linkToLogin.addEventListener('click', () => this.switchAuthTab('login'));
    }

    // 12. 設備表單送出
    const formEquip = document.getElementById('form-equipment');
    if (formEquip) {
      formEquip.addEventListener('submit', (e) => this.handleEquipmentFormSubmit(e));
    }

    // 12.1 設備表單交貨數量與狀態精確雙向連動
    const inputQty = document.getElementById('eq-quantity');
    const inputDelivered = document.getElementById('eq-delivered-qty');
    const inputUndelivered = document.getElementById('eq-undelivered-qty');
    const selectStatus = document.getElementById('eq-delivery-status');

    if (inputQty && inputDelivered && inputUndelivered && selectStatus) {
      inputQty.addEventListener('input', () => {
        const total = Math.max(1, Number(inputQty.value) || 1);
        if (selectStatus.value === '已交貨') {
          inputDelivered.value = total;
          inputUndelivered.value = 0;
        } else {
          let d = Number(inputDelivered.value) || 0;
          if (d > total) d = total;
          inputDelivered.value = d;
          inputUndelivered.value = total - d;
        }
      });

      inputDelivered.addEventListener('input', () => {
        const total = Math.max(1, Number(inputQty.value) || 1);
        let d = Number(inputDelivered.value) || 0;
        if (d > total) {
          d = total;
          inputDelivered.value = d;
        }
        inputUndelivered.value = Math.max(0, total - d);
        if (d >= total) {
          selectStatus.value = '已交貨';
        } else if (d === 0) {
          selectStatus.value = '未交貨';
        }
      });

      inputUndelivered.addEventListener('input', () => {
        const total = Math.max(1, Number(inputQty.value) || 1);
        let u = Number(inputUndelivered.value) || 0;
        if (u > total) {
          u = total;
          inputUndelivered.value = u;
        }
        inputDelivered.value = Math.max(0, total - u);
        if (u === 0) {
          selectStatus.value = '已交貨';
        } else {
          selectStatus.value = '未交貨';
        }
      });

      selectStatus.addEventListener('change', () => {
        const total = Math.max(1, Number(inputQty.value) || 1);
        if (selectStatus.value === '已交貨') {
          inputDelivered.value = total;
          inputUndelivered.value = 0;
        } else {
          inputDelivered.value = 0;
          inputUndelivered.value = total;
        }
      });
    }

    // 13. 登入表單送出
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => this.handleLoginFormSubmit(e));
    }

    // 13.1 註冊申請表單送出
    const formRegister = document.getElementById('form-register');
    if (formRegister) {
      formRegister.addEventListener('submit', (e) => this.handleRegisterFormSubmit(e));
    }

    // 13.2 超級管理者審核管理彈窗事件
    const btnOpenUserMgmt = document.getElementById('btn-open-user-mgmt');
    if (btnOpenUserMgmt) {
      btnOpenUserMgmt.addEventListener('click', () => this.openUserMgmtModal());
    }
    const btnCloseUserMgmt = document.getElementById('btn-close-user-mgmt-modal');
    if (btnCloseUserMgmt) {
      btnCloseUserMgmt.addEventListener('click', () => this.closeModal(this.modalUserMgmt));
    }
    const btnRefreshUsers = document.getElementById('btn-refresh-users-list');
    if (btnRefreshUsers) {
      btnRefreshUsers.addEventListener('click', () => this.loadUserMgmtTable());
    }

    // 13.3 審核與公司查看權限設定彈窗事件
    const btnClosePerm = document.getElementById('btn-close-permission-modal');
    if (btnClosePerm) {
      btnClosePerm.addEventListener('click', () => this.closeModal(this.modalUserPermission));
    }
    const btnCancelPerm = document.getElementById('btn-perm-cancel');
    if (btnCancelPerm) {
      btnCancelPerm.addEventListener('click', () => this.closeModal(this.modalUserPermission));
    }

    const btnSelectAllPerm = document.getElementById('btn-perm-select-all');
    if (btnSelectAllPerm) {
      btnSelectAllPerm.addEventListener('click', () => {
        document.querySelectorAll('.perm-comp-checkbox').forEach(cb => { cb.checked = true; });
      });
    }

    const btnClearAllPerm = document.getElementById('btn-perm-clear-all');
    if (btnClearAllPerm) {
      btnClearAllPerm.addEventListener('click', () => {
        document.querySelectorAll('.perm-comp-checkbox').forEach(cb => { cb.checked = false; });
      });
    }

    const formPerm = document.getElementById('form-user-permission');
    if (formPerm) {
      formPerm.addEventListener('submit', (e) => this.handlePermissionFormSubmit(e));
    }

    // 14. 通用關閉彈窗按鈕
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        if (modal) this.closeModal(modal);
      });
    });

    // 點擊彈窗外部背景關閉
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeModal(backdrop);
        }
      });
    });
  }

  /**
   * 根據當前 Store 狀態重新渲染所有畫面
   */
  render(store) {
    this.renderHeaderUser();
    this.renderCompanyTabs(store);
    this.renderKPIs(store);
    this.renderSystemTabCounts(store);
    
    // 同步更新下方篩選列的 filter-system 下拉選單值
    const filterSysSel = document.getElementById('filter-system');
    if (filterSysSel && filterSysSel.value !== store.activeSystem) {
      filterSysSel.value = store.activeSystem;
    }

    this.renderCompanyDropdown(store);
    this.renderListModelDropdown(store);
    this.renderTabStatsBar(store);
    this.renderEquipmentTable(store);
    this.renderAnnualReport(store);
  }

  /**
   * 渲染多公司專屬分頁頁籤 (依使用者被授權的公司顯示)
   */
  renderCompanyTabs(store) {
    const container = document.getElementById('company-tabs-container');
    if (!container) return;

    const allCompNames = store.companies.map(c => c.company_name);
    const allowedCompNames = window.authService.getAllowedCompanies(allCompNames);
    const currentCompany = store.filters.company;
    const tabCounts = store.getCompanyTabCounts();

    const hintEl = document.getElementById('company-tabs-hint');
    if (hintEl) {
      hintEl.textContent = `共 ${allowedCompNames.length} 家授權公司 • 點擊切換獨立統計`;
    }

    let html = '';

    // 1. 全部公司分頁 (若有超過 1 家授權公司才顯示全部公司加總)
    if (allowedCompNames.length > 1 || window.authService.isAdmin()) {
      const isAllActive = (currentCompany === 'all');
      html += `
        <button class="comp-tab-btn ${isAllActive ? 'active' : ''}" data-comp="all" title="查看所有授權公司總計">
          <i class="fas fa-layer-group comp-tab-icon"></i>
          <span>全部公司</span>
          <span class="comp-tab-count">${tabCounts.all || 0}</span>
        </button>
      `;
    }

    // 2. 各授權公司專屬分頁
    allowedCompNames.forEach(compName => {
      const isActive = (currentCompany === compName);
      const count = tabCounts[compName] || 0;
      html += `
        <button class="comp-tab-btn ${isActive ? 'active' : ''}" data-comp="${compName}" title="切換至 ${compName} 專屬分頁">
          <i class="fas fa-building comp-tab-icon"></i>
          <span>${compName}</span>
          <span class="comp-tab-count">${count}</span>
        </button>
      `;
    });

    container.innerHTML = html;

    // 綁定點擊切換事件
    container.querySelectorAll('.comp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const comp = btn.getAttribute('data-comp');
        window.appStore.setCompanyFilter(comp);
        window.appStore.setReportCompany(comp);
        
        const selectFilterComp = document.getElementById('filter-company');
        if (selectFilterComp) selectFilterComp.value = comp;
        const repCompany = document.getElementById('report-filter-company');
        if (repCompany) repCompany.value = comp;
      });
    });
  }

  /**
   * 渲染頂部 Header 當前登入者資訊與登出狀態
   */
  renderHeaderUser() {
    const user = window.authService.getCurrentUser();
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-fullname');
    const btnAdd = document.getElementById('btn-add-device');
    const userBadge = document.getElementById('user-profile-badge');
    const btnLogout = document.getElementById('btn-logout');
    const btnOpenLogin = document.getElementById('btn-open-login');
    const btnOpenUserMgmt = document.getElementById('btn-open-user-mgmt');

    if (user && window.authService.isLoggedIn()) {
      if (userBadge) userBadge.classList.remove('hidden');
      if (btnLogout) btnLogout.classList.remove('hidden');
      if (btnOpenLogin) btnOpenLogin.classList.add('hidden');

      if (avatarEl) avatarEl.textContent = (user.fullName || user.username || '用').charAt(0);
      if (nameEl) nameEl.textContent = user.fullName || user.username;
      
      if (btnAdd) {
        btnAdd.style.display = window.authService.canEdit() ? 'inline-flex' : 'none';
      }

      // 超級管理者專屬審核按鈕
      if (btnOpenUserMgmt) {
        if (window.authService.isAdmin()) {
          btnOpenUserMgmt.classList.remove('hidden');
          this.updatePendingUsersBadge();
        } else {
          btnOpenUserMgmt.classList.add('hidden');
        }
      }
    } else {
      if (userBadge) userBadge.classList.add('hidden');
      if (btnLogout) btnLogout.classList.add('hidden');
      if (btnOpenLogin) btnOpenLogin.classList.remove('hidden');
      if (btnOpenUserMgmt) btnOpenUserMgmt.classList.add('hidden');
      if (btnAdd) btnAdd.style.display = 'none';
      this.showLoginScreen('login');
    }
  }

  /**
   * 更新超級管理者頂部「待審核帳號數量」角標
   */
  async updatePendingUsersBadge() {
    try {
      const users = await window.authService.fetchUsersList();
      this.cachedUsersList = users;
      const pendingCount = users.filter(u => u.status === '待審核').length;
      const badge = document.getElementById('pending-users-count');
      if (badge) {
        if (pendingCount > 0) {
          badge.textContent = pendingCount;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (e) {}
  }

  /**
   * 開啟超級管理者帳號審核彈窗
   */
  openUserMgmtModal() {
    this.openModal(this.modalUserMgmt);
    this.loadUserMgmtTable();
  }

  /**
   * 載入帳號審核清單表格 (包含授權查看公司清單)
   */
  async loadUserMgmtTable() {
    const tbody = document.getElementById('user-mgmt-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> 正在向 Google Sheet 載入帳號清單...</td></tr>';

    try {
      const users = await window.authService.fetchUsersList();
      this.cachedUsersList = users;
      if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px; color:#94a3b8;">目前尚無使用者帳號資料</td></tr>';
        return;
      }

      // 更新角標
      const pendingCount = users.filter(u => u.status === '待審核').length;
      const badge = document.getElementById('pending-users-count');
      if (badge) {
        if (pendingCount > 0) {
          badge.textContent = pendingCount;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }

      let html = '';
      users.forEach(u => {
        const username = u.username || '';
        const fullName = u.fullName || u.full_name || username;
        const phone = u.phone || '';
        const email = u.email || '';
        const status = u.status || '待審核';
        const rawAllowed = u.allowedCompanies || u.allowed_companies || '*';

        let statusBadge = '';
        if (status === '啟用') {
          statusBadge = '<span class="badge" style="background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3);"><i class="fas fa-check-circle"></i> 已啟用</span>';
        } else if (status === '停用') {
          statusBadge = '<span class="badge" style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);"><i class="fas fa-ban"></i> 已停用</span>';
        } else {
          statusBadge = '<span class="badge" style="background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);"><i class="fas fa-clock"></i> 待審核</span>';
        }

        let contactInfo = '';
        if (phone) contactInfo += `<div><i class="fas fa-phone" style="font-size:11px; opacity:0.7;"></i> ${phone}</div>`;
        if (email) contactInfo += `<div><i class="fas fa-envelope" style="font-size:11px; opacity:0.7;"></i> ${email}</div>`;
        if (!contactInfo) contactInfo = '<span class="text-xs text-muted">-</span>';

        // 授權公司顯示
        let compBadge = '';
        if (rawAllowed === '*' || (Array.isArray(rawAllowed) && rawAllowed.includes('*'))) {
          compBadge = '<span class="badge" style="background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);"><i class="fas fa-layer-group"></i> 全部 16 家公司</span>';
        } else {
          const compList = Array.isArray(rawAllowed) ? rawAllowed : String(rawAllowed).split(',').map(c => c.trim()).filter(Boolean);
          if (compList.length === 0) {
            compBadge = '<span class="text-xs" style="color:#f87171;"><i class="fas fa-lock"></i> 尚未授權任何公司</span>';
          } else {
            compBadge = `<div style="font-size:12px; color:#e2e8f0;"><i class="fas fa-building text-subtle"></i> ${compList.join('、')} <span style="color:#94a3b8; font-size:11px;">(${compList.length}家)</span></div>`;
          }
        }

        let actionBtns = '';
        if (username === 'admin') {
          actionBtns = '<span class="text-xs text-muted" style="font-style:italic;"><i class="fas fa-shield"></i> 超級管理員 (全權限)</span>';
        } else {
          actionBtns = `
            <button class="btn btn-primary btn-sm" style="padding:4px 10px; font-size:12px;" onclick="window.uiManager.openPermissionModal('${username}')">
              <i class="fas fa-sliders"></i> 審核與權限設定
            </button>
            ${status === '啟用' ? `
              <button class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:12px; color:#f87171; margin-left:4px;" title="停用帳號" onclick="window.uiManager.handleQuickToggleUserStatus('${username}', '停用')">
                <i class="fas fa-ban"></i>
              </button>
            ` : ''}
          `;
        }

        html += `
          <tr>
            <td><strong>${username}</strong></td>
            <td>${fullName}</td>
            <td>${contactInfo}</td>
            <td>${compBadge}</td>
            <td style="text-align:center;">${statusBadge}</td>
            <td style="text-align:center;">${actionBtns}</td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:20px; color:#f87171;">載入帳號清單失敗：${err.message}</td></tr>`;
    }
  }

  /**
   * 開啟審核與公司查看權限選擇設定彈窗
   */
  openPermissionModal(username) {
    const user = this.cachedUsersList.find(u => u.username === username);
    if (!user) {
      alert('找不到該使用者資料！');
      return;
    }

    document.getElementById('perm-username-hidden').value = username;
    document.getElementById('perm-user-name-display').textContent = username;
    document.getElementById('perm-user-fullname-display').textContent = `(${user.fullName || user.full_name || username})`;

    // 顯示申請人之電話與電子信箱聯絡資訊
    const contactBox = document.getElementById('perm-user-contact-display');
    if (contactBox) {
      let cHtml = '';
      if (user.phone) cHtml += `<span style="color:#cbd5e1;"><i class="fas fa-phone" style="font-size:11px; opacity:0.7; margin-right:4px;"></i>${user.phone}</span>`;
      if (user.email) cHtml += `<span style="color:#93c5fd;"><i class="fas fa-envelope" style="font-size:11px; opacity:0.7; margin-right:4px;"></i>${user.email}</span>`;
      if (!cHtml) cHtml = '<span style="color:#64748b; font-size:11px;">(未填寫聯絡電話與信箱)</span>';
      contactBox.innerHTML = cHtml;
    }

    // 狀態
    const statusSelect = document.getElementById('perm-select-status');
    if (statusSelect) statusSelect.value = user.status || '啟用';

    // 狀態徽章
    const statusBadgeBox = document.getElementById('perm-user-status-badge');
    if (statusBadgeBox) {
      if (user.status === '啟用') {
        statusBadgeBox.innerHTML = '<span class="badge" style="background:rgba(16,185,129,0.15); color:#34d399;">已啟用</span>';
      } else if (user.status === '停用') {
        statusBadgeBox.innerHTML = '<span class="badge" style="background:rgba(239,68,68,0.15); color:#f87171;">已停用</span>';
      } else {
        statusBadgeBox.innerHTML = '<span class="badge" style="background:rgba(245,158,11,0.15); color:#fbbf24;">待審核</span>';
      }
    }

    // 角色
    const roleSelect = document.getElementById('perm-select-role');
    if (roleSelect) roleSelect.value = user.role || 'client';

    // 產生 18 家公司 Checkbox 網格
    const allCompanies = (window.appStore && window.appStore.companies.length > 0)
      ? window.appStore.companies.map(c => c.company_name)
      : ['宗亞', '宗鈺', '宗泰', '資訊星', '宗群', '宗友', '宗晟', '和興', '宗科', '宗順', '宗益', '百成', '宗麒', '廣晟', '宗榮', '宗霖', '優德美科技', '富鈺節能科技'];

    const rawAllowed = user.allowedCompanies || user.allowed_companies || '*';
    const isAll = (rawAllowed === '*' || (Array.isArray(rawAllowed) && rawAllowed.includes('*')));
    const allowedArr = Array.isArray(rawAllowed) ? rawAllowed : (isAll ? allCompanies : String(rawAllowed).split(',').map(c => c.trim()).filter(Boolean));

    const grid = document.getElementById('perm-companies-grid');
    if (grid) {
      let cbHtml = '';
      allCompanies.forEach((compName, idx) => {
        const isChecked = isAll || allowedArr.includes(compName);
        cbHtml += `
          <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:#e2e8f0; cursor:pointer; background:rgba(255,255,255,0.02); padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
            <input type="checkbox" class="perm-comp-checkbox" value="${compName}" ${isChecked ? 'checked' : ''} style="cursor:pointer; accent-color:#3b82f6;">
            <span>${idx + 1}. ${compName}</span>
          </label>
        `;
      });
      grid.innerHTML = cbHtml;
    }

    this.openModal(this.modalUserPermission);
  }

  /**
   * 儲存審核與公司查看權限設定
   */
  async handlePermissionFormSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('perm-username-hidden').value;
    const targetStatus = document.getElementById('perm-select-status').value;
    const role = document.getElementById('perm-select-role').value;

    const checkedBoxes = Array.from(document.querySelectorAll('.perm-comp-checkbox:checked')).map(cb => cb.value);
    const totalCount = document.querySelectorAll('.perm-comp-checkbox').length;

    if (checkedBoxes.length === 0) {
      alert('請至少勾選一家允許該使用者查看的公司分頁！');
      return;
    }

    // 若全部 16 家皆勾選，則儲存為 '*'，否則儲存逗號分隔之公司名稱清單
    const allowedCompanies = (checkedBoxes.length === totalCount) ? '*' : checkedBoxes.join(',');

    const compDisplay = (allowedCompanies === '*') ? '全部 16 家公司' : checkedBoxes.join('、');
    const confirmMsg = `【確認儲存帳號審核與權限設定】\n\n・帳號名稱：${username}\n・審核狀態：${targetStatus}\n・操作角色：${role}\n・授權查看公司：${compDisplay} (${checkedBoxes.length}家)\n\n請確認是否儲存至 Google Sheet？`;

    if (!confirm(confirmMsg)) {
      return;
    }

    this.closeModal(this.modalUserPermission);
    this.showToast(`正在更新帳號【${username}】之權限設定...`, 'info');

    const res = await window.authService.updateUserStatus(username, targetStatus, allowedCompanies, role);
    if (res && res.success) {
      this.showToast(`✅ 帳號【${username}】已成功更新！狀態【${targetStatus}】、授權【${compDisplay}】`, 'success');
      this.loadUserMgmtTable();
    } else {
      alert((res && res.error) || '權限設定儲存失敗，請檢查網路連線或稍後再試！');
    }
  }

  /**
   * 快速切換停用/啟用狀態
   */
  async handleQuickToggleUserStatus(username, targetStatus) {
    if (!confirm(`請確認是否要將帳號【${username}】之狀態設定為【${targetStatus}】？`)) {
      return;
    }
    const user = this.cachedUsersList.find(u => u.username === username);
    const allowed = user ? (user.allowedCompanies || user.allowed_companies || '*') : '*';
    const role = user ? (user.role || 'client') : 'client';

    this.showToast(`正在更新帳號【${username}】狀態...`, 'info');
    const res = await window.authService.updateUserStatus(username, targetStatus, allowed, role);
    if (res && res.success) {
      this.showToast(`✅ 帳號【${username}】已設定為【${targetStatus}】！`, 'success');
      this.loadUserMgmtTable();
    } else {
      alert((res && res.error) || '更新失敗！');
    }
  }

  /**
   * 渲染全域 KPI 卡片數值 (僅統計該使用者被授權的公司)
   */
  renderKPIs(store) {
    const stats = store.getStats();

    const elTotal = document.getElementById('kpi-total-devices');
    const elDelivered = document.getElementById('kpi-delivered-qty');
    const elUndelivered = document.getElementById('kpi-undelivered-qty');
    const elUndeliveredBtn = document.getElementById('kpi-undelivered-btn-qty');
    const elIntercom = document.getElementById('kpi-intercom-qty');
    const elCamera = document.getElementById('kpi-camera-qty');
    const elAccess = document.getElementById('kpi-access-qty');
    const elLock = document.getElementById('kpi-lock-qty');
    const elLight = document.getElementById('kpi-light-qty');

    if (elTotal) elTotal.textContent = stats.totalQuantity.toLocaleString();
    if (elDelivered) elDelivered.textContent = stats.totalDeliveredQty.toLocaleString();
    if (elUndelivered) elUndelivered.textContent = stats.totalUndeliveredQty.toLocaleString();
    if (elUndeliveredBtn) elUndeliveredBtn.textContent = stats.totalUndeliveredQty.toLocaleString();

    if (elIntercom) elIntercom.textContent = stats.intercomQty.toLocaleString();
    if (elCamera) elCamera.textContent = stats.cameraQty.toLocaleString();
    if (elAccess) elAccess.textContent = stats.accessQty.toLocaleString();
    if (elLock) elLock.textContent = stats.lockQty.toLocaleString();
    if (elLight && stats.lightQty !== undefined) elLight.textContent = stats.lightQty.toLocaleString();
  }

  /**
   * 渲染各大系統分頁按鈕上的即時數量 Badge (依使用者授權公司過濾)
   */
  renderSystemTabCounts(store) {
    const accessible = store.equipment.filter(e => {
      if (!window.authService.canAccessCompany(e.company_name)) return false;
      if (store.filters.company !== 'all' && e.company_name !== store.filters.company) return false;
      return true;
    });

    const map = {
      'all': accessible.length,
      '對講系統': accessible.filter(e => store.normalizeSystemType(e.system_type, e) === '對講系統').length,
      '對講機': accessible.filter(e => store.normalizeSystemType(e.system_type, e) === '對講系統').length,
      '門禁系統': accessible.filter(e => store.normalizeSystemType(e.system_type, e) === '門禁系統').length,
      '攝影機系統': accessible.filter(e => store.normalizeSystemType(e.system_type, e) === '攝影機系統').length,
      '攝影機': accessible.filter(e => store.normalizeSystemType(e.system_type, e) === '攝影機系統').length,
      '電子鎖': accessible.filter(e => store.normalizeSystemType(e.system_type, e) === '電子鎖').length,
      '燈控系統': accessible.filter(e => store.normalizeSystemType(e.system_type, e) === '燈控系統').length,
    };

    document.querySelectorAll('.sys-tab-btn').forEach(btn => {
      const sys = btn.getAttribute('data-sys');
      const badge = btn.querySelector('.sys-tab-count');
      if (badge && map[sys] !== undefined) {
        badge.textContent = `${map[sys]}項`;
      }
    });
  }

  /**
   * 根據使用者授權公司填入清單頁下拉選單
   */
  renderCompanyDropdown(store) {
    const select = document.getElementById('filter-company');
    if (!select) return;

    const allCompNames = store.companies.map(c => c.company_name);
    const allowedCompNames = window.authService.getAllowedCompanies(allCompNames);

    const currentVal = store.filters.company;
    let optionsHtml = '';

    if (allowedCompNames.length > 1 || window.authService.isAdmin()) {
      optionsHtml += `<option value="all">🏢 全部授權公司 (${allowedCompNames.length}家)</option>`;
    }

    allowedCompNames.forEach(name => {
      const selected = (currentVal === name) ? 'selected' : '';
      optionsHtml += `<option value="${name}" ${selected}>🔹 ${name}</option>`;
    });

    select.innerHTML = optionsHtml;
  }

  /**
   * 渲染五大系統分頁下之「廠牌分類下拉式選單 (Brand Category Dropdown)」
   */
  renderBrandSubtabs(store) {
    let select = document.getElementById('select-brand-category');
    const oldContainer = document.getElementById('brand-chips-list');

    // 若頁面殘留舊版按鈕容器，就地動態替換為標準下拉式選單
    if (oldContainer && !select) {
      const parent = oldContainer.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div class="brand-subtabs-label" style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: #94a3b8; font-size: 0.85rem; white-space: nowrap;">
            <i class="fas fa-industry text-primary"></i>
            <span>廠牌分類：</span>
          </div>
          <div style="flex: 1; max-width: 320px;">
            <select id="select-brand-category" class="brand-category-select">
              <option value="all">🏭 全部廠牌</option>
            </select>
          </div>
        `;
        select = document.getElementById('select-brand-category');
      }
    }

    const brandItems = store.getListAvailableBrandsWithCounts();
    const currentBrand = store.filters.brand || 'all';
    const totalCount = brandItems.reduce((acc, cur) => acc + cur.count, 0);

    if (select) {
      let html = `<option value="all" ${currentBrand === 'all' ? 'selected' : ''}>🏭 全部廠牌 (共 ${totalCount} 筆)</option>`;
      brandItems.forEach(item => {
        const selected = (currentBrand === item.brand) ? 'selected' : '';
        html += `<option value="${item.brand}" ${selected}>🏷️ ${item.brand} (${item.count} 筆)</option>`;
      });
      select.innerHTML = html;
    }

    // 若依然存在按鈕容器 (雙向相容)，同步更新按鈕與數量
    const existingOldContainer = document.getElementById('brand-chips-list');
    if (existingOldContainer) {
      let btnHtml = `
        <button type="button" class="brand-chip ${currentBrand === 'all' ? 'active' : ''}" data-brand="all" title="查看全部廠牌">
          <span>全部廠牌</span>
          <span class="brand-chip-count">${totalCount}</span>
        </button>
      `;
      brandItems.forEach(item => {
        const isActive = (currentBrand === item.brand);
        btnHtml += `
          <button type="button" class="brand-chip ${isActive ? 'active' : ''}" data-brand="${item.brand}">
            <i class="fas fa-industry" style="font-size:0.65rem; opacity:0.8;"></i>
            <span>${item.brand}</span>
            <span class="brand-chip-count">${item.count}</span>
          </button>
        `;
      });
      existingOldContainer.innerHTML = btnHtml;
    }

    // 同步更新下方篩選橫條的 filter-brand 下拉選單值
    const filterBrandSel = document.getElementById('filter-brand');
    if (filterBrandSel && filterBrandSel.value !== currentBrand) {
      filterBrandSel.value = currentBrand;
    }
  }

  /**
   * 渲染清單頁的設備廠牌篩選下拉選單
   */
  renderBrandDropdown(store) {
    const select = document.getElementById('filter-brand');
    if (!select) return;

    const brands = store.getListAvailableBrands();
    const currentVal = store.filters.brand;

    let optionsHtml = `<option value="all">🏭 全部廠牌 (${brands.length}家)</option>`;
    brands.forEach(b => {
      const selected = (currentVal === b) ? 'selected' : '';
      optionsHtml += `<option value="${b}" ${selected}>🏭 ${b}</option>`;
    });

    select.innerHTML = optionsHtml;
  }

  /**
   * 渲染清單頁的設備型號篩選下拉選單
   */
  renderListModelDropdown(store) {
    const select = document.getElementById('filter-model');
    if (!select) return;

    const models = store.getListAvailableModels();
    let currentVal = store.filters.model || 'all';

    // 若切換系統或公司後，原本選取的型號不在可用清單中，自動回退為 'all' (全部型號)
    if (currentVal !== 'all' && !models.includes(currentVal)) {
      store.filters.model = 'all';
      currentVal = 'all';
    }

    let optionsHtml = `<option value="all" ${currentVal === 'all' ? 'selected' : ''}>🏷️ 全部型號 (${models.length}種)</option>`;
    models.forEach(m => {
      const selected = (currentVal === m) ? 'selected' : '';
      optionsHtml += `<option value="${m}" ${selected}>🏷️ ${m}</option>`;
    });

    select.innerHTML = optionsHtml;
    select.value = currentVal;
  }

  /**
   * 渲染當前分頁與篩選條件下的總數量統計橫條
   */
  renderTabStatsBar(store) {
    const stats = store.getCurrentTabStats();
    
    const countEl = document.getElementById('table-records-count');
    const totalEl = document.getElementById('tab-stat-total-qty');
    const deliveredEl = document.getElementById('tab-stat-delivered-qty');
    const undeliveredEl = document.getElementById('tab-stat-undelivered-qty');
    const rateEl = document.getElementById('tab-stat-delivery-rate');

    if (countEl) countEl.textContent = `共 ${stats.totalRecords} 筆設備`;
    if (totalEl) totalEl.textContent = stats.totalQty.toLocaleString();
    if (deliveredEl) deliveredEl.textContent = stats.deliveredQty.toLocaleString();
    if (undeliveredEl) undeliveredEl.textContent = stats.undeliveredQty.toLocaleString();
    if (rateEl) rateEl.textContent = stats.deliveryRate;
  }

  /**
   * 渲染設備清單資料表格
   */
  renderEquipmentTable(store) {
    const tbody = document.getElementById('equipment-table-body');
    if (!tbody) return;

    const items = store.getFilteredEquipment();

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11">
            <div class="empty-state">
              <i class="fas fa-search"></i>
              <h3>查無符合條件的合約設備</h3>
              <p>當前選取之公司或篩選條件下無符合之設備。請嘗試切換至「全部系統總覽」或其他五大系統分頁、切換公司、或調整年度與交貨狀態篩選。</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const canEdit = window.authService.canEdit();

    tbody.innerHTML = items.map(item => {
      const isDelivered = (item.delivery_status === '已交貨');
      const statusBadge = isDelivered
        ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); cursor: pointer;" title="點擊快速切換為未交貨" onclick="window.uiManager.handleQuickToggleStatus('${item.id}')"><i class="fas fa-check-circle"></i> 已交貨</span>`
        : `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); cursor: pointer;" title="點擊快速切換為已交貨" onclick="window.uiManager.handleQuickToggleStatus('${item.id}')"><i class="fas fa-truck-ramp-box"></i> 未交貨</span>`;

      // 系統類別圖示
      let sysIcon = 'fa-walkie-talkie';
      const normSys = store.normalizeSystemType(item.system_type);
      if (normSys === '門禁系統') sysIcon = 'fa-door-open';
      else if (normSys === '攝影機系統' || normSys === '攝影機') sysIcon = 'fa-video';
      else if (normSys === '電子鎖') sysIcon = 'fa-key';
      else if (normSys === '燈控系統') sysIcon = 'fa-lightbulb';
      else if (normSys === '對講系統' || normSys === '對講機') sysIcon = 'fa-walkie-talkie';

      // 數量計算
      const totalQty = Number(item.quantity) || 1;
      const deliveredQty = (item.delivered_qty !== undefined && item.delivered_qty !== null) ? Number(item.delivered_qty) : (isDelivered ? totalQty : 0);
      const undeliveredQty = (item.undelivered_qty !== undefined && item.undelivered_qty !== null) ? Number(item.undelivered_qty) : (totalQty - deliveredQty);
      const unit = item.unit || '台';

      return `
        <tr data-id="${item.id}">
          <td>
            <div style="font-family: monospace; font-weight: 700; color: #94a3b8;">${item.id}</div>
            <div class="text-xs text-muted">${item.contract_id || '無合約號'}</div>
          </td>
          <td>
            <div class="company-tag">${item.company_name}</div>
          </td>
          <td>
            <div class="font-semibold text-main" style="color: #f1f5f9;">
              <i class="fas fa-building text-primary" style="margin-right:4px;"></i>${item.project_name || '未指定建案'}
            </div>
          </td>
          <td>
            <div class="text-sm font-medium" style="color: #cbd5e1; display: flex; align-items: center; gap: 4px;">
              <i class="fas fa-user-tie" style="font-size: 0.8rem; color: #94a3b8;"></i>
              <span>${item.sales_rep || '-'}</span>
            </div>
          </td>
          <td>
            <span class="badge badge-system" data-sys="${item.system_type}">
              <i class="fas ${sysIcon}"></i> ${item.system_type}
            </span>
          </td>
          <td>
            <div class="font-semibold text-main">${item.device_name}</div>
            <div class="text-xs" style="margin-top:3px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="badge-brand"><i class="fas fa-industry"></i> ${item.brand || '標準廠牌'}</span>
              <span class="text-subtle" style="color: #93c5fd;"><i class="fas fa-tag" style="margin-right:2px;"></i> ${item.model || '標準型號'}</span>
            </div>
          </td>
          <td>
            <div class="flex items-center gap-1">
              <span class="font-bold text-main" style="color:#60a5fa; font-size:1.05rem;">${totalQty}</span>
              <span class="text-xs text-muted">${unit}</span>
            </div>
            <div class="text-xs" style="margin-top:2px; display:flex; gap:6px;">
              <span style="color:#34d399;">已交:${deliveredQty}</span>
              <span style="color:${undeliveredQty > 0 ? '#fbbf24' : '#64748b'};">未交:${undeliveredQty}</span>
            </div>
          </td>
          <td>
            ${statusBadge}
          </td>
          <td>
            <div class="text-xs text-main">${item.delivery_date || item.install_date || '-'}</div>
          </td>
          <td>
            <div class="text-xs text-muted" style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.remarks || ''}">
              ${item.remarks || '-'}
            </div>
          </td>
          <td>
            <div class="table-actions">
              ${canEdit ? `
                <button class="action-btn" title="編輯合約設備" onclick="window.uiManager.openEquipmentModal('${item.id}')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn" title="快速切換交貨狀態" onclick="window.uiManager.handleQuickToggleStatus('${item.id}')">
                  <i class="fas fa-arrow-right-arrow-left"></i>
                </button>
                <button class="action-btn btn-delete" title="刪除設備" onclick="window.uiManager.handleDeleteDevice('${item.id}')">
                  <i class="fas fa-trash-alt"></i>
                </button>
              ` : `
                <button class="action-btn" title="查看明細" onclick="window.uiManager.openEquipmentModal('${item.id}', true)">
                  <i class="fas fa-eye"></i>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * 一鍵快速切換交貨狀態
   */
  async handleQuickToggleStatus(id) {
    const item = window.appStore.equipment.find(e => e.id === id);
    const targetStatus = (item && item.delivery_status === '已交貨') ? '未交貨' : '已交貨';

    if (!confirm(`請確認是否要將設備「${item ? item.device_name : id}」的交貨狀態切換為【${targetStatus}】？`)) {
      return;
    }

    const user = window.authService.getCurrentUser();
    this.showToast('正在更新交貨狀態...', 'info');
    const res = await window.apiService.toggleDeliveryStatus(id, (user && user.username) || 'admin');
    if (res.success) {
      this.showToast(`已成功切換為【${targetStatus}】！`, 'success');
      await window.appStore.loadData();
    } else {
      this.showToast('更新失敗：' + (res.error || '未知錯誤'), 'error');
    }
  }

  /**
   * 渲染各系統各型號之年度分析報表與視覺圖表 (僅顯示授權公司)
   */
  renderAnnualReport(store) {
    // 1. 同步授權公司選單
    const selectComp = document.getElementById('report-filter-company');
    if (selectComp) {
      const allCompNames = store.companies.map(c => c.company_name);
      const allowedCompNames = window.authService.getAllowedCompanies(allCompNames);
      const currentVal = store.reportFilters.company;

      let optionsHtml = '';
      if (allowedCompNames.length > 1 || window.authService.isAdmin()) {
        optionsHtml += `<option value="all">🏢 全部授權公司 (${allowedCompNames.length}家)</option>`;
      }
      allowedCompNames.forEach(name => {
        const selected = (currentVal === name) ? 'selected' : '';
        optionsHtml += `<option value="${name}" ${selected}>🔹 ${name}</option>`;
      });
      selectComp.innerHTML = optionsHtml;
    }

    // 1.5 動態載入廠牌分類選單 (連動系統分類)
    const selectBrand = document.getElementById('report-filter-brand');
    if (selectBrand) {
      const availableBrands = store.getAvailableBrands();
      const currentBrand = store.reportFilters.brand;

      let brandOptions = `<option value="all">🏭 全部廠牌 (${availableBrands.length}家)</option>`;
      availableBrands.forEach(b => {
        const selected = (currentBrand === b) ? 'selected' : '';
        brandOptions += `<option value="${b}" ${selected}>🏭 ${b}</option>`;
      });
      selectBrand.innerHTML = brandOptions;
    }

    // 2. 動態載入品牌型號選單
    const selectModel = document.getElementById('report-filter-model');
    if (selectModel) {
      const availableModels = store.getAvailableModels();
      const currentModel = store.reportFilters.model;

      let modelOptions = `<option value="all">🏷️ 全部型號 (${availableModels.length}種)</option>`;
      availableModels.forEach(m => {
        const selected = (currentModel === m) ? 'selected' : '';
        modelOptions += `<option value="${m}" ${selected}>🏷️ ${m}</option>`;
      });
      selectModel.innerHTML = modelOptions;
    }

    // 2.1 同步交貨狀態與數量維度下拉選單值
    const selectDelivery = document.getElementById('report-filter-delivery');
    if (selectDelivery && selectDelivery.value !== store.reportFilters.deliveryStatus) {
      selectDelivery.value = store.reportFilters.deliveryStatus;
    }

    const selectMetric = document.getElementById('report-filter-metric');
    if (selectMetric && selectMetric.value !== store.reportFilters.metric) {
      selectMetric.value = store.reportFilters.metric;
    }

    // 3. 取得年度矩陣與各型號分析數據
    const reportData = store.getAnnualAnalyticsData();
    const thead = document.getElementById('annual-models-thead');
    const tbody = document.getElementById('annual-models-tbody');
    const titleEl = document.getElementById('chart-report-title');

    const metricNames = {
      'all_qty': '合約總數量',
      'delivered': '已交貨數量',
      'undelivered': '未交貨數量'
    };

    if (titleEl) {
      const compLabel = reportData.company === 'all' ? '全部授權公司' : reportData.company;
      const sysLabel = reportData.system === 'all' ? '4大系統' : reportData.system;
      const modelLabel = reportData.model === 'all' ? '全部型號' : `型號: ${reportData.model}`;
      const deliveryLabel = reportData.deliveryStatus === 'all' ? '全狀態' : `狀態: ${reportData.deliveryStatus}`;
      titleEl.innerHTML = `📊 【${compLabel}】${sysLabel} - ${modelLabel} (${deliveryLabel}) ${metricNames[reportData.metric]}走勢與預測`;
    }

    // 4. 渲染各系統各型號年度矩陣表頭
    if (thead) {
      const isDeliveredOnly = (reportData.deliveryStatus === '已交貨');
      const isUndeliveredOnly = (reportData.deliveryStatus === '未交貨');
      const yearColLabel = isDeliveredOnly ? '已交貨' : (isUndeliveredOnly ? '未交貨' : '數量');

      const yearHeaders = reportData.years.map(yr => {
        const isForecast = (yr >= 2026);
        return `<th style="text-align:center; width: 95px; color:${isForecast ? '#60a5fa' : '#cbd5e1'};">${yr}年${yearColLabel}${isForecast ? '<br><span style="font-size:0.65rem; color:#3b82f6;">(預測)</span>' : ''}</th>`;
      }).join('');

      thead.innerHTML = `
        <tr>
          <th style="width: 100px;">系統分類</th>
          <th style="width: 110px;">廠牌分類</th>
          <th style="width: 140px;">品牌型號</th>
          <th style="width: 160px;">設備名稱</th>
          <th style="width: 130px;">建案名稱</th>
          <th style="width: 100px;">業務人員</th>
          <th style="width: 110px;">所屬公司</th>
          <th style="width: 85px; text-align:center;">合約總數</th>
          <th style="width: 85px; text-align:center; color:#34d399;">已交數量</th>
          <th style="width: 85px; text-align:center; color:#fbbf24;">未交數量</th>
          <th style="width: 85px; text-align:center;">交貨狀態</th>
          ${yearHeaders}
        </tr>
      `;
    }

    // 5. 渲染各系統各型號年度矩陣明細內容
    if (tbody) {
      const rows = reportData.modelBreakdownList;
      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${11 + reportData.years.length}" class="text-center" style="padding:35px; color:#94a3b8;">查無符合「${reportData.deliveryStatus === 'all' ? '全部' : reportData.deliveryStatus}」條件之型號年度數據</td></tr>`;
      } else {
        tbody.innerHTML = rows.map(r => {
          const isDelivered = (r.delivery_status === '已交貨');
          const statusBadge = isDelivered
            ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-size:0.75rem;">已交貨</span>`
            : `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; font-size:0.75rem;">未交貨</span>`;

          const yearCells = reportData.years.map(yr => {
            const yrData = r.yearTotals[yr] || { total: 0, delivered: 0, undelivered: 0 };
            let val = yrData.total;
            if (reportData.deliveryStatus === '已交貨' || reportData.metric === 'delivered') {
              val = yrData.delivered;
            } else if (reportData.deliveryStatus === '未交貨' || reportData.metric === 'undelivered') {
              val = yrData.undelivered;
            }

            const isZero = (val === 0);
            return `
              <td style="text-align:center; font-weight:600; color:${isZero ? '#475569' : '#f8fafc'}; background:${yr >= 2026 ? 'rgba(59,130,246,0.02)' : 'transparent'};">
                ${val > 0 ? val : '-'}
              </td>
            `;
          }).join('');

          return `
            <tr>
              <td>
                <span class="badge badge-system" data-sys="${r.system_type}">
                  ${r.system_type}
                </span>
              </td>
              <td>
                <span class="badge-brand"><i class="fas fa-industry"></i> ${r.brand || '標準廠牌'}</span>
              </td>
              <td>
                <span class="font-bold" style="color: #93c5fd;">${r.model}</span>
              </td>
              <td>
                <span class="text-main font-semibold">${r.device_name}</span>
              </td>
              <td>
                <span class="text-xs" style="color:#e2e8f0;"><i class="fas fa-building text-subtle"></i> ${r.project_name}</span>
              </td>
              <td>
                <span class="text-xs" style="color:#cbd5e1;"><i class="fas fa-user-tie text-muted"></i> ${r.sales_rep || '-'}</span>
              </td>
              <td>
                <div class="company-tag">${r.company_name}</div>
              </td>
              <td style="text-align:center; font-weight:700; color:#60a5fa;">
                ${r.total_qty} ${r.unit}
              </td>
              <td style="text-align:center; font-weight:700; color:#34d399;">
                ${r.delivered_qty}
              </td>
              <td style="text-align:center; font-weight:700; color:${r.undelivered_qty > 0 ? '#fbbf24' : '#64748b'};">
                ${r.undelivered_qty}
              </td>
              <td style="text-align:center;">
                ${statusBadge}
              </td>
              ${yearCells}
            </tr>
          `;
        }).join('');
      }
    }

    // 6. 繪製 SVG 趨勢圖表
    this.renderSvgChart(reportData);
  }

  /**
   * 繪製高質感 SVG 趨勢柱狀圖
   */
  renderSvgChart(reportData) {
    const container = document.getElementById('annual-chart-container');
    if (!container) return;

    const data = reportData.matrix;
    if (!data || data.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:50px; color:#94a3b8;">無圖表數據</div>';
      return;
    }

    const svgWidth = container.clientWidth || 800;
    const svgHeight = 280;
    const padding = { top: 35, right: 30, bottom: 45, left: 55 };

    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    const maxVal = Math.max(...data.map(d => Math.max(d.intercom, d.camera, d.access, d.lock, d.light || 0, d.total / 2)), 10);
    const yMax = Math.ceil(maxVal * 1.25);

    const numYears = data.length;
    const groupWidth = chartWidth / numYears;
    const barWidth = Math.max(5, Math.min(16, (groupWidth - 28) / 5));

    let svgHtml = `
      <svg width="100%" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none" style="overflow: visible;">
        <defs>
          <linearGradient id="grad-intercom" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/></linearGradient>
          <linearGradient id="grad-camera" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient>
          <linearGradient id="grad-access" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/></linearGradient>
          <linearGradient id="grad-lock" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#d97706"/></linearGradient>
          <linearGradient id="grad-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fb7185"/><stop offset="100%" stop-color="#e11d48"/></linearGradient>
        </defs>
    `;

    // 1. 水平網格線與 Y 軸文字
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const val = Math.round((yMax / yTicks) * i);
      const yPos = padding.top + chartHeight - (chartHeight * (i / yTicks));

      svgHtml += `
        <line x1="${padding.left}" y1="${yPos}" x2="${svgWidth - padding.right}" y2="${yPos}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${yPos + 4}" fill="#64748b" font-size="11" text-anchor="end">${val}</text>
      `;
    }

    // 2. 繪製各年份分組柱狀
    data.forEach((d, idx) => {
      const groupCenterX = padding.left + (idx * groupWidth) + (groupWidth / 2);
      const startX = groupCenterX - (barWidth * 2.5) - 4;

      const bars = [
        { key: 'intercom', val: d.intercom, grad: 'url(#grad-intercom)', label: '對講機' },
        { key: 'camera', val: d.camera, grad: 'url(#grad-camera)', label: '攝影機' },
        { key: 'access', val: d.access, grad: 'url(#grad-access)', label: '門禁' },
        { key: 'lock', val: d.lock, grad: 'url(#grad-lock)', label: '電子鎖' },
        { key: 'light', val: d.light || 0, grad: 'url(#grad-light)', label: '燈控' }
      ];

      bars.forEach((b, bIdx) => {
        const bX = startX + (bIdx * (barWidth + 2));
        const bHeight = Math.max(2, (b.val / yMax) * chartHeight);
        const bY = padding.top + chartHeight - bHeight;

        svgHtml += `
          <rect x="${bX}" y="${bY}" width="${barWidth}" height="${bHeight}" rx="3" fill="${b.grad}" opacity="0.9" style="cursor:pointer; transition:all 0.2s ease;">
            <title>${d.year}年 ${b.label}: ${b.val}</title>
          </rect>
        `;
      });

      // 年份 X 軸標籤與預測標籤
      const labelY = padding.top + chartHeight + 20;
      svgHtml += `
        <text x="${groupCenterX}" y="${labelY}" fill="${d.isForecast ? '#60a5fa' : '#cbd5e1'}" font-size="12" font-weight="${d.isForecast ? '700' : '500'}" text-anchor="middle">
          ${d.year}
        </text>
        ${d.isForecast ? `
          <text x="${groupCenterX}" y="${labelY + 14}" fill="#3b82f6" font-size="9" text-anchor="middle">
            (預測)
          </text>
        ` : ''}
      `;
    });

    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;
  }

  /**
   * 開啟設備編輯/新增彈窗
   */
  openEquipmentModal(id, readOnly = false) {
    const titleEl = document.getElementById('modal-eq-title');
    const form = document.getElementById('form-equipment');
    const companySelect = document.getElementById('eq-company');
    const submitBtn = document.getElementById('btn-save-eq');

    const allowedCompNames = window.authService.getAllowedCompanies(window.appStore.companies.map(c => c.company_name));
    companySelect.innerHTML = allowedCompNames.map(c => `<option value="${c}">${c}</option>`).join('');

    if (id) {
      const item = window.appStore.equipment.find(e => e.id === id);
      if (!item) return;

      if (titleEl) titleEl.innerHTML = readOnly ? `🔍 合約設備詳細資訊 (${item.id})` : `✏️ 編輯合約設備 (${item.id})`;
      document.getElementById('eq-id').value = item.id;
      document.getElementById('eq-company').value = item.company_name || allowedCompNames[0];
      document.getElementById('eq-contract-id').value = item.contract_id || '';
      document.getElementById('eq-project-name').value = item.project_name || '';
      document.getElementById('eq-sales-rep').value = item.sales_rep || '';
      document.getElementById('eq-system-type').value = window.appStore.normalizeSystemType(item.system_type) || '對講系統';
      document.getElementById('eq-brand').value = item.brand || '';
      document.getElementById('eq-device-name').value = item.device_name || '';
      document.getElementById('eq-model').value = item.model || '';
      
      const q = Number(item.quantity) || 1;
      const status = item.delivery_status || '已交貨';
      const d = (item.delivered_qty !== undefined && item.delivered_qty !== null) ? Number(item.delivered_qty) : (status === '已交貨' ? q : 0);
      const u = (item.undelivered_qty !== undefined && item.undelivered_qty !== null) ? Number(item.undelivered_qty) : (q - d);

      document.getElementById('eq-quantity').value = q;
      document.getElementById('eq-delivered-qty').value = d;
      document.getElementById('eq-undelivered-qty').value = u;
      document.getElementById('eq-delivery-status').value = status;
      document.getElementById('eq-unit').value = item.unit || '台';
      document.getElementById('eq-delivery-date').value = item.delivery_date || item.install_date || '';
      document.getElementById('eq-remarks').value = item.remarks || '';

      if (submitBtn) {
        submitBtn.style.display = readOnly ? 'none' : 'inline-flex';
        submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> 確認儲存修改`;
      }
    } else {
      if (titleEl) titleEl.innerHTML = `➕ 新增合約設備紀錄`;
      form.reset();
      document.getElementById('eq-id').value = '';
      document.getElementById('eq-sales-rep').value = '';
      const currentCompFilter = window.appStore.filters.company;
      const defaultComp = (currentCompFilter !== 'all' && allowedCompNames.includes(currentCompFilter))
        ? currentCompFilter
        : (allowedCompNames[0] || '');
      document.getElementById('eq-company').value = defaultComp;

      // 若目前有指定篩選特定系統或廠牌，貼心自動帶入
      if (window.appStore.activeSystem !== 'all') {
        document.getElementById('eq-system-type').value = window.appStore.activeSystem;
      }
      if (window.appStore.filters.brand !== 'all') {
        document.getElementById('eq-brand').value = window.appStore.filters.brand;
      } else {
        document.getElementById('eq-brand').value = '';
      }
      if (window.appStore.filters.model !== 'all') {
        document.getElementById('eq-model').value = window.appStore.filters.model;
      } else {
        document.getElementById('eq-model').value = '';
      }

      document.getElementById('eq-quantity').value = '1';
      document.getElementById('eq-delivered-qty').value = '1';
      document.getElementById('eq-undelivered-qty').value = '0';
      document.getElementById('eq-delivery-status').value = '已交貨';
      document.getElementById('eq-delivery-date').value = new Date().toISOString().split('T')[0];
      if (submitBtn) {
        submitBtn.style.display = 'inline-flex';
        submitBtn.innerHTML = `<i class="fas fa-check-circle"></i> 確認新增設備`;
      }
    }

    // 動態載入並綁定廠牌與型號的下拉選單 (Datalist) 與連動篩選
    this.populateEquipmentModalDatalists();

    this.openModal(this.modalEquipment);
  }

  /**
   * 動態載入並更新設備彈窗中的廠牌與品牌型號下拉選單 (Datalist)
   * 支援既有資料庫下拉點選與自由手動鍵入，並具備廠牌/型號連動推薦
   */
  populateEquipmentModalDatalists() {
    const brandListEl = document.getElementById('datalist-brands');
    const modelListEl = document.getElementById('datalist-models');
    const systemTypeEl = document.getElementById('eq-system-type');
    const brandInput = document.getElementById('eq-brand');
    const modelInput = document.getElementById('eq-model');

    if (!brandListEl || !modelListEl) return;

    // 1. 填入廠牌 datalist
    const updateBrandList = () => {
      const currentSys = systemTypeEl ? systemTypeEl.value : 'all';
      const brands = window.appStore.getAllUniqueBrands(currentSys);
      brandListEl.innerHTML = brands.map(b => `<option value="${b}">${b}</option>`).join('');
    };

    // 2. 依所選/輸入廠牌更新型號 datalist
    const updateModelList = () => {
      const selectedBrand = brandInput ? brandInput.value.trim() : '';
      const models = window.appStore.getAllUniqueModels(selectedBrand);
      modelListEl.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    };

    updateBrandList();
    updateModelList();

    // 3. 綁定連動互動 (覆寫 onchange/oninput 避免重複監聽堆疊)
    if (systemTypeEl) {
      systemTypeEl.onchange = () => {
        updateBrandList();
        updateModelList();
      };
    }

    if (brandInput) {
      brandInput.oninput = () => updateModelList();
      brandInput.onchange = () => updateModelList();
    }
  }

  /**
   * 處理設備表單儲存送出
   */
  async handleEquipmentFormSubmit(e) {
    e.preventDefault();
    const user = window.authService.getCurrentUser();
    const isEdit = !!document.getElementById('eq-id').value.trim();
    const totalQty = Number(document.getElementById('eq-quantity').value) || 1;
    const deliveredQty = Number(document.getElementById('eq-delivered-qty').value) || 0;
    const undeliveredQty = Number(document.getElementById('eq-undelivered-qty').value) || (totalQty - deliveredQty);
    const status = document.getElementById('eq-delivery-status').value;

    const brandVal = document.getElementById('eq-brand').value.trim();
    const modelVal = document.getElementById('eq-model').value.trim();
    const deviceNameVal = document.getElementById('eq-device-name').value.trim();

    if (!brandVal) {
      alert('請輸入或從下拉選單選取廠牌分類！');
      document.getElementById('eq-brand').focus();
      return;
    }

    if (!modelVal) {
      alert('請輸入或從下拉選單選取品牌型號！');
      document.getElementById('eq-model').focus();
      return;
    }

    if (!deviceNameVal) {
      alert('請填寫設備名稱！');
      document.getElementById('eq-device-name').focus();
      return;
    }

    const data = {
      id: document.getElementById('eq-id').value.trim(),
      company_name: document.getElementById('eq-company').value,
      contract_id: document.getElementById('eq-contract-id').value.trim(),
      project_name: document.getElementById('eq-project-name').value.trim(),
      sales_rep: document.getElementById('eq-sales-rep').value.trim(),
      system_type: document.getElementById('eq-system-type').value,
      brand: brandVal,
      delivery_status: status,
      device_name: deviceNameVal,
      model: modelVal,
      quantity: totalQty,
      delivered_qty: deliveredQty,
      undelivered_qty: undeliveredQty,
      unit: document.getElementById('eq-unit').value.trim() || '台',
      delivery_date: document.getElementById('eq-delivery-date').value,
      remarks: document.getElementById('eq-remarks').value.trim()
    };

    if (!data.project_name) {
      alert('請填寫建案名稱！');
      return;
    }

    const actionText = isEdit ? '修改' : '新增';
    const confirmMsg = `【確認${actionText}設備】\n\n・建案/專案：${data.project_name}\n・業務人員：${data.sales_rep || '未指定'}\n・系統分類：${data.system_type}\n・廠牌分類：${data.brand}\n・品牌型號：${data.model}\n・設備名稱：${data.device_name}\n・合約總數：${data.quantity} ${data.unit}\n・交貨狀態：${data.delivery_status} (已交:${data.delivered_qty} / 未交:${data.undelivered_qty})\n\n請確認是否儲存？`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    this.closeModal(this.modalEquipment);
    this.showToast(`正在${actionText}設備資料...`, 'info');

    const res = await window.apiService.saveEquipment(data, (user && user.username) || 'admin');
    if (res.success) {
      this.showToast(`已確認並成功${actionText}設備資料！`, 'success');
      await window.appStore.loadData();
    } else {
      this.showToast('儲存失敗：' + (res.error || '未知錯誤'), 'error');
    }
  }

  /**
   * 處理設備刪除
   */
  async handleDeleteDevice(id) {
    const item = window.appStore.equipment.find(e => e.id === id);
    const name = item ? item.device_name : id;
    if (!confirm(`確定要刪除設備「${name}」(${id}) 嗎？此操作無法復原。`)) {
      return;
    }

    const user = window.authService.getCurrentUser();
    this.showToast('正在刪除設備...', 'info');
    const res = await window.apiService.deleteEquipment(id, (user && user.username) || 'admin');
    if (res.success) {
      this.showToast(`設備 ${id} 已成功刪除`, 'success');
      await window.appStore.loadData();
    } else {
      this.showToast('刪除失敗：' + (res.error || '未知錯誤'), 'error');
    }
  }

  /**
   * 切換認證視窗分頁 (登入 vs 申請帳戶)
   */
  switchAuthTab(tab = 'login') {
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');
    const paneLogin = document.getElementById('auth-pane-login');
    const paneRegister = document.getElementById('auth-pane-register');
    const errLogin = document.getElementById('login-error-msg');
    const errReg = document.getElementById('reg-error-msg');

    if (errLogin) errLogin.style.display = 'none';
    if (errReg) errReg.style.display = 'none';

    if (tab === 'login') {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      if (paneLogin) paneLogin.classList.remove('hidden');
      if (paneRegister) paneRegister.classList.add('hidden');
    } else {
      if (tabRegister) tabRegister.classList.add('active');
      if (tabLogin) tabLogin.classList.remove('active');
      if (paneRegister) paneRegister.classList.remove('hidden');
      if (paneLogin) paneLogin.classList.add('hidden');
    }
  }

  /**
   * 顯示登入 / 申請帳戶視窗 (未登入時隱藏關閉按鈕，強制管制存取)
   */
  showLoginScreen(tab = 'login') {
    this.switchAuthTab(tab);
    const closeBtn = document.getElementById('btn-close-auth-modal');
    if (closeBtn) {
      closeBtn.style.display = window.authService.isLoggedIn() ? 'inline-flex' : 'none';
    }
    this.openModal(this.modalLogin);
  }

  /**
   * 登入處理 (非同步支援 Google Sheet 雲端驗證)
   */
  async handleLoginFormSubmit(e) {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-login');
    const errBox = document.getElementById('login-error-msg');
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();

    if (errBox) errBox.style.display = 'none';
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在驗證登入...';
    }

    try {
      const res = await window.authService.login(u, p);
      if (res.success && res.user) {
        this.closeModal(this.modalLogin);
        this.showToast(`歡迎登入，${res.user.fullName}！`, 'success');
        await window.appStore.loadData();
      } else {
        if (errBox) {
          errBox.textContent = res.error || '帳號或密碼錯誤，請重新檢查！';
          errBox.style.display = 'block';
        } else {
          alert(res.error || '登入失敗');
        }
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = '登入發生異常：' + err.message;
        errBox.style.display = 'block';
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登入系統';
      }
    }
  }

  /**
   * 申請新帳戶處理 (寫入 Google Sheet Users 表，預設狀態為「待審核」)
   */
  async handleRegisterFormSubmit(e) {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-register');
    const errBox = document.getElementById('reg-error-msg');

    const username = document.getElementById('reg-username').value.trim();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const confirmPassword = document.getElementById('reg-confirm-password').value.trim();
    const phone = document.getElementById('reg-phone') ? document.getElementById('reg-phone').value.trim() : '';
    const email = document.getElementById('reg-email') ? document.getElementById('reg-email').value.trim() : '';

    if (errBox) errBox.style.display = 'none';

    // 1. 前端表單驗證
    if (password.length < 4) {
      if (errBox) {
        errBox.textContent = '密碼長度至少需要 4 位數以上！';
        errBox.style.display = 'block';
      }
      return;
    }

    if (password !== confirmPassword) {
      if (errBox) {
        errBox.textContent = '兩次輸入的密碼不相符，請重新確認！';
        errBox.style.display = 'block';
      }
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在向 Google Sheet 建立帳戶...';
    }

    try {
      const res = await window.authService.register({
        username,
        password,
        fullName,
        phone,
        email
      });

      if (res.success) {
        document.getElementById('form-register').reset();
        
        this.switchAuthTab('login');
        const loginUserEl = document.getElementById('login-username');
        if (loginUserEl) loginUserEl.value = username;

        const loginErr = document.getElementById('login-error-msg');
        if (loginErr) {
          loginErr.style.display = 'block';
          loginErr.style.background = 'rgba(245,158,11,0.15)';
          loginErr.style.color = '#fbbf24';
          loginErr.style.border = '1px solid rgba(245,158,11,0.3)';
          loginErr.innerHTML = `<i class="fas fa-clock"></i> <strong>帳號【${username}】申請已送出！</strong><br>目前狀態為【待審核】，需由超級管理者審核並指定公司權限後方可登入。`;
        }

        this.showToast('🎉 帳號申請已送出！請等待超級管理者審核啟用。', 'info');
      } else {
        if (errBox) {
          errBox.textContent = res.error || '申請失敗，請稍後再試！';
          errBox.style.display = 'block';
        } else {
          alert(res.error || '註冊失敗');
        }
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = '註冊申請發生異常：' + err.message;
        errBox.style.display = 'block';
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> 送出帳號申請 (待超級管理者審核)';
      }
    }
  }

  openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  closeModal(modal) {
    if (!modal) return;
    if (modal === this.modalLogin && (!window.authService || !window.authService.isLoggedIn())) {
      // 未登入時嚴格鎖定，不得關閉認證視窗
      return;
    }
    modal.classList.remove('active');
  }

  /**
   * 顯示 Toast 通知
   */
  showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

window.uiManager = new UIManager();

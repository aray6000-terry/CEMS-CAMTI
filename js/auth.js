/**
 * auth.js - 帳號登入管制、註冊審核機制、權限細緻控管與超級管理者啟用授權
 */

class AuthService {
  constructor() {
    this.STORAGE_KEY = 'equip_mgmt_auth_user_v2';
    this.currentUser = this.loadSession();
  }

  loadSession() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;
      const user = JSON.parse(data);
      return (user && user.username) ? user : null;
    } catch (e) {
      console.error('Failed to load auth session:', e);
      return null;
    }
  }

  saveSession(user) {
    this.currentUser = user;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    } catch (e) {}
  }

  clearSession() {
    this.currentUser = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {}
  }

  isLoggedIn() {
    return !!(this.currentUser && this.currentUser.username);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAdmin() {
    if (!this.currentUser) return false;
    return this.currentUser.username === 'admin' || this.currentUser.role === 'admin';
  }

  /**
   * 檢查當前登入者是否有權限查看特定公司
   */
  canAccessCompany(companyName) {
    if (!this.currentUser) return false;
    if (this.isAdmin()) return true;
    const allowed = this.currentUser.allowedCompanies || ['*'];
    if (allowed.includes('*') || allowed.length === 0) return true;
    return allowed.includes(companyName);
  }

  /**
   * 根據使用者授權清單過濾公司列表
   */
  getAllowedCompanies(allCompaniesList = []) {
    if (!this.currentUser) return allCompaniesList;
    if (this.isAdmin()) return allCompaniesList;
    const allowed = this.currentUser.allowedCompanies || ['*'];
    if (allowed.includes('*') || allowed.length === 0) return allCompaniesList;
    return allCompaniesList.filter(c => {
      const name = typeof c === 'string' ? c : (c.company_name || '');
      return allowed.includes(name);
    });
  }

  canEdit() {
    if (!this.currentUser) return false;
    if (this.isAdmin()) return true;
    return this.currentUser.role === 'editor' || this.currentUser.role === 'admin';
  }

  canViewCost() {
    return true;
  }

  /**
   * 登入驗證 (需為啟用狀態，並精準綁定授權公司)
   */
  async login(username, password) {
    const u = (username || '').trim();
    const p = (password || '').trim();

    if (!u || !p) {
      return { success: false, error: '請輸入帳號與密碼！' };
    }

    // 1. 優先透過本地伺服器 Proxy 進行 Google Sheet 登入驗證
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        console.log(`📡 [Auth] 向 Google Sheet 驗證登入帳號: ${u}...`);
        const resp = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        const res = await resp.json();
        if (res.success && res.user) {
          const sessionUser = {
            username: res.user.username,
            fullName: res.user.fullName || res.user.username,
            role: res.user.role || (res.user.username === 'admin' ? 'admin' : 'client'),
            allowedCompanies: res.user.allowedCompanies || ['*'],
            email: res.user.email || '',
            phone: res.user.phone || ''
          };
          this.saveSession(sessionUser);
          return { success: true, user: sessionUser, message: 'Google Sheet 驗證登入成功！' };
        } else {
          return { success: false, error: res.error || '帳號或密碼錯誤，請重新確認！' };
        }
      } catch (e) {
        console.error('Local Proxy 登入請求失敗:', e);
      }
    }

    // 2. 直連 Google Apps Script 雲端 Web App 驗證
    if (window.apiService && window.apiService.isLiveMode()) {
      try {
        const gasUrl = window.apiService.getApiUrl();
        const resp = await fetch(`${gasUrl}?action=login&username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}&_t=${Date.now()}`);
        const res = await resp.json();
        if (res.success && res.user) {
          const sessionUser = {
            username: res.user.username,
            fullName: res.user.fullName || res.user.username,
            role: res.user.role || (res.user.username === 'admin' ? 'admin' : 'client'),
            allowedCompanies: res.user.allowedCompanies || ['*'],
            email: res.user.email || '',
            phone: res.user.phone || ''
          };
          this.saveSession(sessionUser);
          return { success: true, user: sessionUser, message: 'Google Sheet 驗證登入成功！' };
        } else {
          return { success: false, error: res.error || '帳號或密碼錯誤，請重新確認！' };
        }
      } catch (e) {
        console.error('Google Sheet 登入請求異常:', e);
        return { success: false, error: '無法連線至 Google Sheet 驗證伺服器：' + e.message };
      }
    }

    return { success: false, error: '帳號或密碼錯誤，請確認帳號是否已由管理員啟用！' };
  }

  /**
   * 帳號申請 (寫入 Google Sheet Users 工作表，狀態為「待審核」)
   */
  async register(formData) {
    const username = (formData.username || '').trim();
    const password = (formData.password || '').trim();
    const fullName = (formData.fullName || formData.full_name || username).trim();
    const email = (formData.email || '').trim();
    const phone = (formData.phone || '').trim();

    if (!username || !password) {
      return { success: false, error: '帳號與密碼為必填欄位！' };
    }

    const payload = {
      username,
      password,
      fullName,
      email,
      phone
    };

    // 1. 優先透過本地 Proxy 寫入 Google Sheet
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        console.log(`📡 [Auth] 向 Google Sheet 申請註冊帳號 (待審核): ${username}...`);
        const resp = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const res = await resp.json();
        if (res.success) {
          return {
            success: true,
            isPending: true,
            message: res.message || '🎉 帳號申請已送出！目前狀態為【待審核】，需由超級管理者審核啟用後方可登入。'
          };
        } else {
          return { success: false, error: res.error || 'Google Sheet 註冊失敗，請重試！' };
        }
      } catch (e) {
        console.error('Proxy 註冊請求失敗:', e);
      }
    }

    // 2. 直連 Google Apps Script Web App 寫入
    if (window.apiService && window.apiService.isLiveMode()) {
      try {
        const gasUrl = window.apiService.getApiUrl();
        const postData = {
          action: 'saveUser',
          username: username,
          data: {
            username: username,
            password: password,
            full_name: fullName,
            role: 'client',
            allowed_companies: '*',
            status: '待審核',
            phone: phone,
            email: email
          }
        };

        const resp = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(postData)
        });
        const res = await resp.json();
        if (res.success) {
          return {
            success: true,
            isPending: true,
            message: '🎉 帳號申請已送出！目前狀態為【待審核】，需由超級管理者審核啟用後方可登入。'
          };
        } else {
          return { success: false, error: res.error || 'Google Sheet 註冊失敗！' };
        }
      } catch (e) {
        console.error('Google Sheet 寫入註冊失敗:', e);
        return { success: false, error: '寫入 Google Sheet 失敗：' + e.message };
      }
    }

    return { success: false, error: '無法連線至 Google Sheet 註冊伺服器' };
  }

  /**
   * 取得所有使用者列表 (供超級管理者審核管理)
   */
  async fetchUsersList() {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        const resp = await fetch('/api/getUsers');
        const res = await resp.json();
        return res.list || [];
      } catch (e) {
        console.error('Fetch users error:', e);
      }
    }
    if (window.apiService && window.apiService.isLiveMode()) {
      try {
        const gasUrl = window.apiService.getApiUrl();
        const resp = await fetch(`${gasUrl}?action=getUsers&_t=${Date.now()}`);
        const res = await resp.json();
        return res.list || [];
      } catch (e) {}
    }
    return [];
  }

  /**
   * 超級管理者審核/啟用/停用帳號與設定所屬授權公司權限
   */
  async updateUserStatus(username, targetStatus = '啟用', allowedCompanies = '*', role = 'client') {
    if (!this.isAdmin()) {
      return { success: false, error: '只有超級管理者具備審核啟用權限！' };
    }

    const payload = {
      username: username,
      status: targetStatus,
      allowed_companies: Array.isArray(allowedCompanies) ? (allowedCompanies.includes('*') ? '*' : allowedCompanies.join(',')) : allowedCompanies,
      role: role
    };

    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        const resp = await fetch('/api/updateUserStatus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await resp.json();
      } catch (e) {
        console.error('Update user status error:', e);
      }
    }

    if (window.apiService && window.apiService.isLiveMode()) {
      try {
        const gasUrl = window.apiService.getApiUrl();
        const postData = {
          action: 'saveUser',
          username: 'admin',
          data: {
            username: username,
            status: targetStatus,
            allowed_companies: payload.allowed_companies,
            role: role
          }
        };
        const resp = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(postData)
        });
        return await resp.json();
      } catch (e) {}
    }

    return { success: false, error: '更新失敗' };
  }

  /**
   * 登出系統
   */
  logout() {
    this.clearSession();
    if (typeof window !== 'undefined' && window.uiManager) {
      window.uiManager.showLoginScreen('login');
    }
  }
}

// 導出全域單例
window.authService = new AuthService();

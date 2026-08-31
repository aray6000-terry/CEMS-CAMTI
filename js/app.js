/**
 * app.js - 系統啟動主入口與登入管制
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 初始化合約設備數量統計系統...');

  try {
    // 1. 初始化 UI 事件監聽
    if (window.uiManager) {
      window.uiManager.initEvents();
    }

    // 2. 訂閱 Store 狀態變更事件
    if (window.appStore && window.uiManager) {
      window.appStore.subscribe((store) => {
        try {
          window.uiManager.render(store);
        } catch (renderErr) {
          console.error('UI Render Error:', renderErr);
        }
      });
    }

    // 3. 嚴格登入管制檢查：未登入時強制跳出登入視窗阻擋存取
    if (!window.authService || !window.authService.isLoggedIn()) {
      console.log('🔒 使用者尚未登入，開啟登入驗證視窗...');
      if (window.uiManager) {
        window.uiManager.showLoginScreen('login');
      }
      return;
    }

    // 4. 已驗證登入：立即渲染畫面並載入資料
    if (window.appStore && window.uiManager) {
      window.uiManager.render(window.appStore);
      await window.appStore.loadData();
    }

    console.log('✅ 系統載入完成！');
  } catch (err) {
    console.error('系統初始化錯誤:', err);
  }
});

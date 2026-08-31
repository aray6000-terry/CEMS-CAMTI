const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

let PORT = 5173;
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwmyzhEWhd9ADvJ4LZe-GIwelQERa696zuRUsJMMZcQwc087z-AvW5AHkLIMjSBrXrL3A/exec';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function fetchGasJson(targetUrl, callback) {
  https.get(targetUrl, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return fetchGasJson(res.headers.location, callback);
    }
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        callback(null, json);
      } catch (err) {
        callback(err, data);
      }
    });
  }).on('error', (err) => {
    callback(err);
  });
}

function postGasJson(targetUrl, payload, callback) {
  const parsed = url.parse(targetUrl);
  const bodyStr = JSON.stringify(payload);

  const options = {
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.path,
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      'Content-Length': Buffer.byteLength(bodyStr)
    }
  };

  const req = https.request(options, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return fetchGasJson(res.headers.location, callback);
    }
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        callback(null, json);
      } catch (err) {
        callback(err, data);
      }
    });
  });

  req.on('error', (err) => {
    callback(err);
  });

  req.write(bodyStr);
  req.end();
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  let reqPath = decodeURIComponent(parsed.pathname || '/');

  // 1. 本地伺服器 Proxy 路由
  if (reqPath === '/api/getEquipment') {
    const companies = (parsed.query && parsed.query.companies) ? parsed.query.companies : '*';
    const targetUrl = `${GAS_URL}?action=getEquipment&companies=${encodeURIComponent(companies)}&_t=${Date.now()}`;
    console.log(`[Proxy] 正在向 Google Sheet 請求設備資料 (companies: ${companies})...`);
    fetchGasJson(targetUrl, (err, json) => {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      if (err) {
        res.end(JSON.stringify({ success: false, error: err.message }));
      } else {
        res.end(JSON.stringify(json));
      }
    });
    return;
  }

  if (reqPath === '/api/getCompanies') {
    const targetUrl = `${GAS_URL}?action=getCompanies&_t=${Date.now()}`;
    fetchGasJson(targetUrl, (err, json) => {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      if (err) {
        res.end(JSON.stringify({ success: false, error: err.message }));
      } else {
        res.end(JSON.stringify(json));
      }
    });
    return;
  }

  // 取得使用者清單 (供超級管理者審核)
  if (reqPath === '/api/getUsers') {
    const targetUrl = `${GAS_URL}?action=getUsers&_t=${Date.now()}`;
    fetchGasJson(targetUrl, (err, json) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      if (err) {
        res.end(JSON.stringify({ success: false, error: err.message }));
      } else {
        res.end(JSON.stringify(json));
      }
    });
    return;
  }

  // 更新帳號狀態與授權公司權限 (超級管理者專屬)
  if (reqPath === '/api/updateUserStatus') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let params = {};
      try { params = JSON.parse(body); } catch (e) { params = parsed.query || {}; }

      const username = (params.username || '').trim();
      const status = (params.status || '啟用').trim();
      const allowed_companies = (params.allowed_companies !== undefined ? params.allowed_companies : (params.allowedCompanies || '*')).trim();
      const role = (params.role || 'client').trim();

      if (!username) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: '缺少使用者帳號' }));
        return;
      }

      console.log(`[Proxy] 超級管理者正在更新帳號「${username}」: 狀態【${status}】、授權公司【${allowed_companies}】、角色【${role}】...`);

      const savePayload = {
        action: 'saveUser',
        username: 'admin',
        data: {
          username: username,
          status: status,
          allowed_companies: allowed_companies,
          role: role
        }
      };

      postGasJson(GAS_URL, savePayload, (err, json) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        if (!err && json && json.success) {
          console.log(`[Proxy] ✅ 帳號「${username}」已成功更新為【${status}】，授權公司:【${allowed_companies}】！`);
          res.end(JSON.stringify({ success: true, message: `已成功將帳號【${username}】更新為【${status}】！` }));
        } else {
          res.end(JSON.stringify({ success: false, error: (json && json.error) || (err && err.message) || '更新失敗' }));
        }
      });
    });
    return;
  }

  // 登入驗證 (未經審核啟用之帳號予以阻擋，並即時帶入授權公司)
  if (reqPath === '/api/login') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let params = {};
      try {
        params = typeof body === 'string' && body.trim() ? JSON.parse(body) : (parsed.query || {});
      } catch (e) {
        params = parsed.query || {};
      }
      const username = (params.username || (parsed.query && parsed.query.username) || '').trim();
      const password = (params.password || (parsed.query && parsed.query.password) || '').trim();
      
      if (!username || !password) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: '請輸入帳號與密碼！' }));
        return;
      }

      console.log(`[Proxy] 正在向 Google Sheet 驗證登入帳號: ${username}...`);
      
      // 1. 呼叫 Google Apps Script 進行帳密驗證
      const targetUrl = `${GAS_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&_t=${Date.now()}`;
      fetchGasJson(targetUrl, (err, json) => {
        if (err) {
          console.error('[Proxy] Google Sheet 登入連線錯誤:', err);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: '無法連線至 Google Sheet 伺服器：' + err.message }));
          return;
        }

        if (!json.success) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(json));
          return;
        }

        // admin 超級管理員一律放行且具備全部權限
        if (username === 'admin') {
          if (json.user) {
            json.user.role = 'admin';
            json.user.allowedCompanies = ['*'];
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(json));
          return;
        }

        // 2. 對於一般帳號，向 Google Sheet 即時查詢其啟用狀態 (status) 與授權公司 (allowedCompanies)
        const getUsersUrl = `${GAS_URL}?action=getUsers&_t=${Date.now()}`;
        fetchGasJson(getUsersUrl, (uErr, uJson) => {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          if (!uErr && uJson && uJson.list) {
            const matchedUser = uJson.list.find(u => String(u.username).trim().toLowerCase() === username.toLowerCase());
            const currentStatus = matchedUser ? (matchedUser.status || '待審核') : '待審核';
            if (currentStatus !== '啟用') {
              console.log(`[Proxy] 登入拒絕 ❌ 帳號「${username}」狀態為【${currentStatus}】，尚未由超級管理者啟用`);
              res.end(JSON.stringify({
                success: false,
                error: `此帳號目前為【${currentStatus}】狀態，尚未由超級管理者審核啟用，請聯繫管理員！`
              }));
              return;
            }

            if (json.user && matchedUser) {
              json.user.fullName = matchedUser.fullName || json.user.fullName;
              json.user.role = matchedUser.role || json.user.role || 'client';
              json.user.status = currentStatus;
              
              const rawAllowed = matchedUser.allowedCompanies || '*';
              if (rawAllowed === '*' || rawAllowed === '') {
                json.user.allowedCompanies = ['*'];
              } else if (Array.isArray(rawAllowed)) {
                json.user.allowedCompanies = rawAllowed;
              } else {
                json.user.allowedCompanies = String(rawAllowed).split(',').map(c => c.trim()).filter(Boolean);
              }
            }
          }
          console.log(`[Proxy] 登入驗證通過 ✅ (${username})，授權公司:`, (json.user && json.user.allowedCompanies));
          res.end(JSON.stringify(json));
        });
      });
    });
    return;
  }

  // 申請帳號：確實寫入 Google Sheet Users 工作表，預設狀態為「待審核」
  if (reqPath === '/api/register') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let params = {};
      try {
        params = typeof body === 'string' && body.trim() ? JSON.parse(body) : (parsed.query || {});
      } catch (e) {
        params = parsed.query || {};
      }

      const username = (params.username || '').trim();
      const password = (params.password || '').trim();
      const fullName = (params.fullName || params.full_name || username).trim();
      const phone = (params.phone || '').trim();
      const email = (params.email || '').trim();

      if (!username || !password) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: '請完整填寫帳號與密碼！' }));
        return;
      }

      console.log(`[Proxy] 正在向 Google Sheet 寫入新使用者註冊資料 (狀態: 待審核): ${username} (${fullName})...`);

      const savePayload = {
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

      postGasJson(GAS_URL, savePayload, (err, json) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        if (!err && json && json.success) {
          console.log(`[Proxy] ✅ 帳號 ${username} 已成功寫入 Google Sheet Users 工作表 (待審核)！`);
          res.end(JSON.stringify({
            success: true,
            message: '🎉 帳號申請已送出！目前狀態為【待審核】，需由超級管理者審核啟用後方可登入。',
            user: {
              username: username,
              fullName: fullName,
              status: '待審核'
            }
          }));
        } else {
          const errorMsg = (json && json.error) || (err && err.message) || '寫入 Google Sheet 失敗';
          console.error(`[Proxy] ❌ 註冊失敗:`, errorMsg);
          res.end(JSON.stringify({ success: false, error: 'Google Sheet 註冊失敗：' + errorMsg }));
        }
      });
    });
    return;
  }

  // 2. 靜態檔案服務
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function startListen(p) {
  server.listen(p, () => {
    const urlStr = `http://localhost:${p}`;
    console.log(`=========================================`);
    console.log(`🚀 設備數量統計系統已於本地伺服器啟動！`);
    console.log(`👉 請在瀏覽器開啟：${urlStr}`);
    console.log(`=========================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    PORT++;
    startListen(PORT);
  } else {
    console.error('伺服器錯誤:', err);
  }
});

startListen(PORT);

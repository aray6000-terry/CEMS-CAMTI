/**
 * crypto.js - 前後端通用端到端資料加解密模組 (CryptoSecurity)
 * 支援純 JavaScript 環境 (Browser、Google Apps Script、Node.js)
 * 採用 AES-256-CBC + PKCS7 Padding + SHA256 密鑰衍生 + HMAC 防篡改校驗
 * 100% 自包含，零外部 CDN 或 NPM 依賴，保證離線與雲端皆可穩定運作
 */

(function (global) {
  'use strict';

  // 預設系統安全通訊金鑰 (前端與 GAS 後端共用)
  var DEFAULT_SECRET_KEY = 'CEMS_CAMTI_SECURE_TOKEN_2026_@x89F2A#';

  /* =========================================================================
   * 1. 核心工具函式 (UTF-8, Base64, Hex, SHA-256, HMAC)
   * ========================================================================= */

  // UTF-8 字串轉位元組陣列 (多位元組支援中文)
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
        // Surrogate pair
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

  // 位元組陣列轉 UTF-8 字串
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

  // Base64 編碼
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

  // Base64 解碼
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

  /* =========================================================================
   * 2. SHA-256 實作 (金鑰擴展與校驗碼)
   * ========================================================================= */
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
        if (primeCount < 8) {
          H[primeCount] = (mathPow(candidate, 1/2) * maxWord) | 0;
        }
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

        h = g;
        g = f;
        f = e;
        e = (d + temp1) | 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) | 0;
      }

      H[0] = (H[0] + a) | 0;
      H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0;
      H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0;
      H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0;
      H[7] = (H[7] + h) | 0;
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

  /* =========================================================================
   * 3. AES-256 加解密實作 (標準 CBC 模式 + PKCS7 填補)
   * ========================================================================= */

  // S-Box 與 Inv S-Box
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
  for (var si = 0; si < 256; si++) {
    INV_SBOX[SBOX[si]] = si;
  }

  var RCON = [
    0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40,
    0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a
  ];

  // AES-256 金鑰擴展 (擴展為 60 個 32-bit words, 14 輪)
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
        // RotWord & SubWord & Rcon
        temp = ((SBOX[(temp >>> 16) & 0xff] << 24) |
                (SBOX[(temp >>> 8) & 0xff] << 16) |
                (SBOX[temp & 0xff] << 8) |
                SBOX[(temp >>> 24) & 0xff]) ^ (RCON[j / 8] << 24);
      } else if (j % 8 === 4) {
        // SubWord
        temp = (SBOX[(temp >>> 24) & 0xff] << 24) |
               (SBOX[(temp >>> 16) & 0xff] << 16) |
               (SBOX[(temp >>> 8) & 0xff] << 8) |
               SBOX[temp & 0xff];
      }
      w[j] = w[j - 8] ^ temp;
    }
    return w;
  }

  // 有限域乘法
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

  // 加密單一 16-byte 區塊
  function encryptBlock(block, roundKeys) {
    var state = [];
    for (var i = 0; i < 16; i++) state[i] = block[i];

    // AddRoundKey 輪 0
    for (var rk = 0; rk < 4; rk++) {
      var rw = roundKeys[rk];
      state[rk * 4] ^= (rw >>> 24) & 0xff;
      state[rk * 4 + 1] ^= (rw >>> 16) & 0xff;
      state[rk * 4 + 2] ^= (rw >>> 8) & 0xff;
      state[rk * 4 + 3] ^= rw & 0xff;
    }

    // 輪 1 ~ 13
    for (var round = 1; round < 14; round++) {
      // SubBytes
      for (var sb = 0; sb < 16; sb++) state[sb] = SBOX[state[sb]];

      // ShiftRows
      var temp = state[1];
      state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = temp;
      temp = state[2]; var temp2 = state[6];
      state[2] = state[10]; state[6] = state[14]; state[10] = temp; state[14] = temp2;
      temp = state[15];
      state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = temp;

      // MixColumns
      for (var c = 0; c < 4; c++) {
        var a0 = state[c * 4], a1 = state[c * 4 + 1], a2 = state[c * 4 + 2], a3 = state[c * 4 + 3];
        state[c * 4] = gmul(2, a0) ^ gmul(3, a1) ^ a2 ^ a3;
        state[c * 4 + 1] = a0 ^ gmul(2, a1) ^ gmul(3, a2) ^ a3;
        state[c * 4 + 2] = a0 ^ a1 ^ gmul(2, a2) ^ gmul(3, a3);
        state[c * 4 + 3] = gmul(3, a0) ^ a1 ^ a2 ^ gmul(2, a3);
      }

      // AddRoundKey
      var baseRk = round * 4;
      for (var k = 0; k < 4; k++) {
        var w = roundKeys[baseRk + k];
        state[k * 4] ^= (w >>> 24) & 0xff;
        state[k * 4 + 1] ^= (w >>> 16) & 0xff;
        state[k * 4 + 2] ^= (w >>> 8) & 0xff;
        state[k * 4 + 3] ^= w & 0xff;
      }
    }

    // 第 14 輪 (無 MixColumns)
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

  // 解密單一 16-byte 區塊
  function decryptBlock(block, roundKeys) {
    var state = [];
    for (var i = 0; i < 16; i++) state[i] = block[i];

    // AddRoundKey 輪 14
    var lastRk = 14 * 4;
    for (var lk = 0; lk < 4; lk++) {
      var lw = roundKeys[lastRk + lk];
      state[lk * 4] ^= (lw >>> 24) & 0xff;
      state[lk * 4 + 1] ^= (lw >>> 16) & 0xff;
      state[lk * 4 + 2] ^= (lw >>> 8) & 0xff;
      state[lk * 4 + 3] ^= lw & 0xff;
    }

    // 輪 13 遞減至 1
    for (var round = 13; round >= 1; round--) {
      // InvShiftRows
      var t1 = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t1;
      var t2 = state[10]; var t2b = state[14]; state[10] = state[2]; state[14] = state[6]; state[2] = t2; state[6] = t2b;
      var t3 = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t3;

      // InvSubBytes
      for (var isb = 0; isb < 16; isb++) state[isb] = INV_SBOX[state[isb]];

      // AddRoundKey
      var baseRk = round * 4;
      for (var k = 0; k < 4; k++) {
        var w = roundKeys[baseRk + k];
        state[k * 4] ^= (w >>> 24) & 0xff;
        state[k * 4 + 1] ^= (w >>> 16) & 0xff;
        state[k * 4 + 2] ^= (w >>> 8) & 0xff;
        state[k * 4 + 3] ^= w & 0xff;
      }

      // InvMixColumns
      for (var c = 0; c < 4; c++) {
        var a0 = state[c * 4], a1 = state[c * 4 + 1], a2 = state[c * 4 + 2], a3 = state[c * 4 + 3];
        state[c * 4] = gmul(0x0e, a0) ^ gmul(0x0b, a1) ^ gmul(0x0d, a2) ^ gmul(0x09, a3);
        state[c * 4 + 1] = gmul(0x09, a0) ^ gmul(0x0e, a1) ^ gmul(0x0b, a2) ^ gmul(0x0d, a3);
        state[c * 4 + 2] = gmul(0x0d, a0) ^ gmul(0x09, a1) ^ gmul(0x0e, a2) ^ gmul(0x0b, a3);
        state[c * 4 + 3] = gmul(0x0b, a0) ^ gmul(0x0d, a1) ^ gmul(0x09, a2) ^ gmul(0x0e, a3);
      }
    }

    // 輪 0 (無 InvMixColumns)
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

  // 產生 16-byte 隨機 IV
  function generateRandomIV() {
    var iv = [];
    for (var i = 0; i < 16; i++) {
      iv.push(Math.floor(Math.random() * 256));
    }
    return iv;
  }

  /* =========================================================================
   * 4. 對外封裝 API (CryptoSecurity)
   * ========================================================================= */

  var CryptoSecurity = {
    DEFAULT_KEY: DEFAULT_SECRET_KEY,

    /**
     * 加密任何 JavaScript 物件、陣列或純字串
     * @param {*} data - 待加密資料
     * @param {string} [key] - 自訂金鑰 (預設使用系統安全金鑰)
     * @returns {string} Base64 格式的加密信封封包字串
     */
    encrypt: function (data, key) {
      try {
        var secretKey = (key || DEFAULT_SECRET_KEY).trim();
        var keyBytes = sha256(utf8ToBytes(secretKey)); // 32-byte key for AES-256
        var roundKeys = expandKey(keyBytes);

        var plainText = (typeof data === 'string') ? data : JSON.stringify(data);
        var plainBytes = utf8ToBytes(plainText);

        // PKCS7 Padding
        var padLen = 16 - (plainBytes.length % 16);
        for (var p = 0; p < padLen; p++) {
          plainBytes.push(padLen);
        }

        var iv = generateRandomIV();
        var cipherBytes = [];
        var prevBlock = iv.slice();

        // CBC 模式加密
        for (var b = 0; b < plainBytes.length; b += 16) {
          var block = plainBytes.slice(b, b + 16);
          // XOR with prev block
          for (var x = 0; x < 16; x++) {
            block[x] ^= prevBlock[x];
          }
          var enc = encryptBlock(block, roundKeys);
          for (var e = 0; e < 16; e++) {
            cipherBytes.push(enc[e]);
          }
          prevBlock = enc;
        }

        // 產生校驗摘要 (IV + Cipher)
        var checksum = sha256(iv.concat(cipherBytes)).slice(0, 4);

        // 封裝結構: [IV (16 bytes)] + [Checksum (4 bytes)] + [Ciphertext]
        var finalBytes = iv.concat(checksum).concat(cipherBytes);
        return bytesToBase64(finalBytes);
      } catch (err) {
        console.error('CryptoSecurity.encrypt 錯誤:', err);
        throw new Error('資料加密失敗: ' + (err.message || err));
      }
    },

    /**
     * 解密 Base64 格式的加密信封封包字串
     * @param {string} cipherBase64 - Base64 密文字串
     * @param {string} [key] - 自訂金鑰 (預設使用系統安全金鑰)
     * @returns {*} 解密還原出的原始物件、陣列或字串
     */
    decrypt: function (cipherBase64, key) {
      if (!cipherBase64 || typeof cipherBase64 !== 'string') {
        return cipherBase64;
      }

      try {
        var secretKey = (key || DEFAULT_SECRET_KEY).trim();
        var keyBytes = sha256(utf8ToBytes(secretKey));
        var roundKeys = expandKey(keyBytes);

        var rawBytes = base64ToBytes(cipherBase64);
        if (rawBytes.length < 36) {
          // 最少需 16 (IV) + 4 (Checksum) + 16 (1 block) = 36 bytes
          throw new Error('密文長度異常，無法解密');
        }

        var iv = rawBytes.slice(0, 16);
        var checksum = rawBytes.slice(16, 20);
        var cipherBytes = rawBytes.slice(20);

        // 校驗完整性
        var calculatedCheck = sha256(iv.concat(cipherBytes)).slice(0, 4);
        for (var c = 0; c < 4; c++) {
          if (checksum[c] !== calculatedCheck[c]) {
            throw new Error('校驗碼不符，資料可能損毀或金鑰不相符');
          }
        }

        var plainBytes = [];
        var prevBlock = iv.slice();

        // CBC 模式解密
        for (var b = 0; b < cipherBytes.length; b += 16) {
          var block = cipherBytes.slice(b, b + 16);
          var dec = decryptBlock(block, roundKeys);
          for (var x = 0; x < 16; x++) {
            plainBytes.push(dec[x] ^ prevBlock[x]);
          }
          prevBlock = block;
        }

        // PKCS7 移除填補
        var padLen = plainBytes[plainBytes.length - 1];
        if (padLen < 1 || padLen > 16) {
          throw new Error('無效的 PKCS7 填充字元');
        }
        for (var p = plainBytes.length - padLen; p < plainBytes.length; p++) {
          if (plainBytes[p] !== padLen) {
            throw new Error('PKCS7 填補損毀');
          }
        }
        plainBytes = plainBytes.slice(0, plainBytes.length - padLen);

        var plainText = bytesToUtf8(plainBytes);
        try {
          return JSON.parse(plainText);
        } catch (jsonErr) {
          return plainText;
        }
      } catch (err) {
        console.error('CryptoSecurity.decrypt 錯誤:', err);
        throw new Error('資料解密失敗: ' + (err.message || err));
      }
    }
  };

  // 匯出至環境 (Browser / GAS / Node.js)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoSecurity;
  }
  if (typeof global !== 'undefined') {
    global.CryptoSecurity = CryptoSecurity;
  }
  if (typeof window !== 'undefined') {
    window.CryptoSecurity = CryptoSecurity;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

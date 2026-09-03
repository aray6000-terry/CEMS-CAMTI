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

const INITIAL_MOCK_EQUIPMENT = [
  {
    "id": "EQ-0101",
    "company_name": "宗亞",
    "contract_id": "CT-ZA-2025-01",
    "project_name": "宗亞南港總部旗艦大樓",
    "sales_rep": "陳業務專員",
    "system_type": "對講機",
    "device_name": "IP觸控式門口對講主機",
    "model": "Panasonic VL-V900",
    "quantity": 12,
    "delivered_qty": 0,
    "undelivered_qty": 12,
    "unit": "台",
    "delivery_status": "未交貨",
    "delivery_date": "2024-01-15",
    "remarks": "大門門廳與訪客中心已全數完成點交",
    "updated_at": "2026-09-03"
  },
  {
    "id": "EQ-0102",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "對講機",
    "device_name": "彩色感應影像對講住戶門口機",
    "model": "NOBEL  NB-700D-IM",
    "quantity": 37,
    "delivered_qty": 37,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2025-03-20",
    "remarks": "高樓層12台待二期工程驗收交貨",
    "updated_at": "2025-02-01"
  },
  {
    "id": "EQ-0103",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "對講機",
    "device_name": "10\"社區IP網路型彩色影視感應門口機",
    "model": "NOBEL  NB-810G",
    "quantity": 1,
    "delivered_qty": 1,
    "undelivered_qty": 0,
    "unit": "支",
    "delivery_status": "已交貨",
    "delivery_date": "2024-02-01",
    "remarks": "全區走廊與公共空間已安裝完畢",
    "updated_at": "2025-02-01"
  },
  {
    "id": "EQ-0104",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "對講機",
    "device_name": "IP網路型10\"保全對講管理總機",
    "model": "NOBEL  NB-620M",
    "quantity": 2,
    "delivered_qty": 2,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-03-10",
    "remarks": "主要管制門扇已全數啟用",
    "updated_at": "2025-02-01"
  },
  {
    "id": "EQ-0105",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "對講機",
    "device_name": "SIP+PUSH智慧雲端管理專用伺服主機",
    "model": "NOBEL  NB-8000+APP-800S",
    "quantity": 1,
    "delivered_qty": 1,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0106",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "對講機",
    "device_name": "IP網路型公共免持式緊急對講機",
    "model": "NOBEL  NB-800E-IM",
    "quantity": 1,
    "delivered_qty": 1,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0107",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "攝影機",
    "device_name": "2M IP網路型室內用彩色半球型紅外線攝影機",
    "model": "SAMPO  VK-TWCIP2240DW",
    "quantity": 11,
    "delivered_qty": 11,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0108",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "攝影機",
    "device_name": "2M IP網路型室外用彩色紅外線攝影機",
    "model": "SAMPO  VK-TWCIP2141FWTZ",
    "quantity": 14,
    "delivered_qty": 14,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0109",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "攝影機",
    "device_name": "2M IP網路型室內用彩色紅外線攝影機",
    "model": "SAMPO  VK-TWCIP2240FW",
    "quantity": 12,
    "delivered_qty": 12,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0110",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "攝影機",
    "device_name": "監視系統專用錄音麥克風",
    "model": "SAMPO  HAP120",
    "quantity": 2,
    "delivered_qty": 2,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0111",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "攝影機",
    "device_name": "500萬畫素IP網路型16路數位錄影主機",
    "model": "SAMPO  DR-TWC2626NV",
    "quantity": 3,
    "delivered_qty": 3,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0112",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "門禁系統",
    "device_name": "MIFARE門禁崁入型感應讀頭",
    "model": "TSM  MA-105WG",
    "quantity": 1,
    "delivered_qty": 1,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0113",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "門禁系統",
    "device_name": "IP網路型公共緊急感應讀卡對講電腦連線控制器",
    "model": "TSM  MA-512",
    "quantity": 1,
    "delivered_qty": 1,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0114",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "門禁系統",
    "device_name": "IP網路型MIFARE門禁感應讀卡機",
    "model": "TSM  MA-712",
    "quantity": 5,
    "delivered_qty": 5,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0115",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "門禁系統",
    "device_name": "IP網路型指紋辨識MIFARE門禁感應讀卡機",
    "model": "",
    "quantity": 5,
    "delivered_qty": 5,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0116",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "門禁系統",
    "device_name": "MIFARE電梯崁入型感應讀頭",
    "model": "TSM  MA-105WG",
    "quantity": 5,
    "delivered_qty": 5,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0117",
    "company_name": "宗亞",
    "contract_id": "A9120",
    "project_name": "美山林建設-中山北美",
    "sales_rep": "黃義宗",
    "system_type": "門禁系統",
    "device_name": "十六埠電梯指定樓層管制讀卡連線控制器",
    "model": "TSM  CAN-822",
    "quantity": 1,
    "delivered_qty": 1,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2026-04-10",
    "remarks": "第二批20組預計2026年到貨交貨",
    "updated_at": "2026-08-31"
  },
  {
    "id": "EQ-0106",
    "company_name": "宗亞",
    "contract_id": "CT-ZA-2025-01",
    "project_name": "宗亞智慧園區二期",
    "sales_rep": "林專案經理",
    "system_type": "燈控系統",
    "device_name": "全區多迴路智能照明控制器",
    "model": "Lutron Energi Savr Node",
    "quantity": 15,
    "delivered_qty": 10,
    "undelivered_qty": 5,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2025-08-20",
    "remarks": "一期10組已啟用，5組待二期交貨",
    "updated_at": "2025-02-01"
  },
  {
    "id": "EQ-0201",
    "company_name": "宗鈺",
    "contract_id": "CT-ZY-2025-02",
    "project_name": "宗鈺內湖科技大樓",
    "sales_rep": "王業務副理",
    "system_type": "對講機",
    "device_name": "SIP高階視訊管理總機",
    "model": "Akuvox R29C",
    "quantity": 8,
    "delivered_qty": 8,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2023-11-01",
    "remarks": "警衛中控室已點交",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0202",
    "company_name": "宗鈺",
    "contract_id": "CT-ZY-2025-02",
    "project_name": "宗鈺內湖科技大���",
    "sales_rep": "王業務副理",
    "system_type": "攝影機",
    "device_name": "全景360度魚眼全景攝影機",
    "model": "Dahua DH-IPC-EBW81242",
    "quantity": 24,
    "delivered_qty": 16,
    "undelivered_qty": 8,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-08-15",
    "remarks": "地下停車場8支待二期施作",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0203",
    "company_name": "宗鈺",
    "contract_id": "CT-ZY-2025-02",
    "project_name": "宗鈺內湖科技大樓",
    "sales_rep": "王業務副理",
    "system_type": "門禁系統",
    "device_name": "掌靜脈高資安辨識主機",
    "model": "Fujitsu PalmSecure",
    "quantity": 15,
    "delivered_qty": 15,
    "undelivered_qty": 0,
    "unit": "套",
    "delivery_status": "已交貨",
    "delivery_date": "2024-05-10",
    "remarks": "研發機房全數安裝",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0204",
    "company_name": "宗鈺",
    "contract_id": "CT-ZY-2025-02",
    "project_name": "宗鈺內湖科技大樓",
    "sales_rep": "王業務副理",
    "system_type": "電子鎖",
    "device_name": "重型感應指紋智慧防盜電子鎖",
    "model": "Yale YDM-7116",
    "quantity": 20,
    "delivered_qty": 8,
    "undelivered_qty": 12,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2026-02-15",
    "remarks": "主管辦公室換裝批次交貨",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0205",
    "company_name": "宗鈺",
    "contract_id": "CT-ZY-2025-02",
    "project_name": "宗鈺內湖科技大樓",
    "sales_rep": "王業務副理",
    "system_type": "燈控系統",
    "device_name": "0-10V 商辦智能調光模組",
    "model": "Schneider SpaceLogic",
    "quantity": 18,
    "delivered_qty": 18,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-06-15",
    "remarks": "全大樓照明迴路調光點交完成",
    "updated_at": "2025-01-20"
  },
  {
    "id": "EQ-0301",
    "company_name": "宗泰",
    "contract_id": "CT-ZT-2024-03",
    "project_name": "宗泰竹科研發廠房",
    "sales_rep": "張業務主任",
    "system_type": "對講機",
    "device_name": "防爆型工業對講通訊分機",
    "model": "J&R JR101-FK",
    "quantity": 18,
    "delivered_qty": 18,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-05-20",
    "remarks": "無塵室與產線區點交完成",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0302",
    "company_name": "宗泰",
    "contract_id": "CT-ZT-2024-03",
    "project_name": "宗泰竹科研發廠房",
    "sales_rep": "張業務主任",
    "system_type": "攝影機",
    "device_name": "4K紅外線防暴半球型網路攝影機",
    "model": "Hikvision DS-2CD2186",
    "quantity": 70,
    "delivered_qty": 45,
    "undelivered_qty": 25,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-11-30",
    "remarks": "外圍周界25支預計年底交貨",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0303",
    "company_name": "宗泰",
    "contract_id": "CT-ZT-2024-03",
    "project_name": "宗泰竹科研發廠房",
    "sales_rep": "張業務主任",
    "system_type": "門禁系統",
    "device_name": "快速伺服三叉閘門考勤通道",
    "model": "Kaba HSB-E02",
    "quantity": 10,
    "delivered_qty": 6,
    "undelivered_qty": 4,
    "unit": "道",
    "delivery_status": "未交貨",
    "delivery_date": "2026-03-15",
    "remarks": "東側員工閘門待交貨",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0304",
    "company_name": "宗泰",
    "contract_id": "CT-ZT-2024-03",
    "project_name": "宗泰竹科研發廠房",
    "sales_rep": "張業務主任",
    "system_type": "電子鎖",
    "device_name": "600磅雙門磁力鎖附訊號接點",
    "model": "Gianni EM-600",
    "quantity": 35,
    "delivered_qty": 35,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-06-01",
    "remarks": "行政辦公室鋁門全數點交",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0305",
    "company_name": "宗泰",
    "contract_id": "CT-ZT-2024-03",
    "project_name": "宗泰竹科研發廠房",
    "sales_rep": "張業務主任",
    "system_type": "燈控系統",
    "device_name": "廠區時序照明智慧排程主機",
    "model": "Lite-Puter EDX-607",
    "quantity": 12,
    "delivered_qty": 8,
    "undelivered_qty": 4,
    "unit": "台",
    "delivery_status": "未交貨",
    "delivery_date": "2025-10-15",
    "remarks": "產線排程主機點交",
    "updated_at": "2025-01-15"
  },
  {
    "id": "EQ-0401",
    "company_name": "資訊星",
    "contract_id": "CT-IS-2024-04",
    "project_name": "資訊星雲端數據中心",
    "sales_rep": "李業務總監",
    "system_type": "對講機",
    "device_name": "IP觸控式門口對講主機",
    "model": "Panasonic VL-V900",
    "quantity": 6,
    "delivered_qty": 6,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-08-10",
    "remarks": "IDC機房大門已啟用",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0402",
    "company_name": "資訊星",
    "contract_id": "CT-IS-2024-04",
    "project_name": "資訊星雲端數據中心",
    "sales_rep": "李業務總監",
    "system_type": "攝影機",
    "device_name": "AI熱成像雙光譜周界球機",
    "model": "Hikvision DS-2TD4136",
    "quantity": 16,
    "delivered_qty": 8,
    "undelivered_qty": 8,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2026-01-10",
    "remarks": "第二批8支預計2026交貨",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0403",
    "company_name": "資訊星",
    "contract_id": "CT-IS-2024-04",
    "project_name": "資訊星雲端數據中心",
    "sales_rep": "李業務總監",
    "system_type": "門禁系統",
    "device_name": "掌靜脈高資安辨識主機",
    "model": "Fujitsu PalmSecure",
    "quantity": 20,
    "delivered_qty": 20,
    "undelivered_qty": 0,
    "unit": "套",
    "delivery_status": "已交貨",
    "delivery_date": "2024-09-01",
    "remarks": "IDC各機櫃通道已全數上線",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0404",
    "company_name": "資訊星",
    "contract_id": "CT-IS-2024-04",
    "project_name": "資訊星雲端數據中心",
    "sales_rep": "李業務總監",
    "system_type": "電子鎖",
    "device_name": "微電腦伺服機櫃電子聯鎖系統",
    "model": "Southco H3-EM",
    "quantity": 60,
    "delivered_qty": 30,
    "undelivered_qty": 30,
    "unit": "套",
    "delivery_status": "未交貨",
    "delivery_date": "2026-03-01",
    "remarks": "第二批機櫃鎖預計2026交貨",
    "updated_at": "2026-09-02"
  },
  {
    "id": "EQ-0405",
    "company_name": "資訊星",
    "contract_id": "CT-IS-2024-04",
    "project_name": "資訊星雲端數���中心",
    "sales_rep": "李業務總監",
    "system_type": "燈控系統",
    "device_name": "機房智能照度感測節能開關箱",
    "model": "Lutron Energi Savr Node",
    "quantity": 25,
    "delivered_qty": 25,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-11-20",
    "remarks": "數據中心節能開關全數啟用",
    "updated_at": "2025-02-05"
  },
  {
    "id": "EQ-0501",
    "company_name": "宗群",
    "contract_id": "CT-ZQ-2024-05",
    "project_name": "宗群七期豪華商辦大樓",
    "sales_rep": "王業務副理",
    "system_type": "對講機",
    "device_name": "SIP彩色可視大門對講機",
    "model": "Akuvox E12W",
    "quantity": 10,
    "delivered_qty": 10,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-03-15",
    "remarks": "迎賓大廳設備啟用",
    "updated_at": "2025-01-10"
  },
  {
    "id": "EQ-0502",
    "company_name": "宗群",
    "contract_id": "CT-ZQ-2024-05",
    "project_name": "宗群七期豪華商辦大樓",
    "sales_rep": "王業務副理",
    "system_type": "攝影機",
    "device_name": "星光級紅外線槍型網路攝影機",
    "model": "Hikvision DS-2CD2T86",
    "quantity": 40,
    "delivered_qty": 30,
    "undelivered_qty": 10,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-09-30",
    "remarks": "地下停車場待交貨",
    "updated_at": "2025-01-10"
  },
  {
    "id": "EQ-0503",
    "company_name": "宗群",
    "contract_id": "CT-ZQ-2024-05",
    "project_name": "宗群七期豪華商辦大樓",
    "sales_rep": "王業務副理",
    "system_type": "門禁系統",
    "device_name": "多功能動態人臉辨識終端",
    "model": "Soyal AR-837-EF",
    "quantity": 16,
    "delivered_qty": 16,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-04-10",
    "remarks": "門禁全數點交完畢",
    "updated_at": "2025-01-10"
  },
  {
    "id": "EQ-0504",
    "company_name": "宗群",
    "contract_id": "CT-ZQ-2024-05",
    "project_name": "宗群七期豪華商辦大樓",
    "sales_rep": "王業務副理",
    "system_type": "電子鎖",
    "device_name": "指紋密碼卡片三合一電子門鎖",
    "model": "Yale YDM-4109",
    "quantity": 24,
    "delivered_qty": 12,
    "undelivered_qty": 12,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2026-01-15",
    "remarks": "二期辦公室交貨",
    "updated_at": "2025-01-10"
  },
  {
    "id": "EQ-0505",
    "company_name": "宗群",
    "contract_id": "CT-ZQ-2024-05",
    "project_name": "宗群七期豪華商辦大樓",
    "sales_rep": "王業務副理",
    "system_type": "燈控系統",
    "device_name": "大廳迎賓場景情境調光控制器",
    "model": "Lutron QSGR-3P",
    "quantity": 8,
    "delivered_qty": 8,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-05-15",
    "remarks": "迎賓挑高大廳燈控點交完成",
    "updated_at": "2025-01-10"
  },
  {
    "id": "EQ-0601",
    "company_name": "宗友",
    "contract_id": "CT-ZYU-2024-06",
    "project_name": "宗友亞灣軟體園區大樓",
    "sales_rep": "趙業務工程師",
    "system_type": "對講機",
    "device_name": "多用戶數位式門口對講主機",
    "model": "Panasonic VL-SV74",
    "quantity": 14,
    "delivered_qty": 14,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2023-10-25",
    "remarks": "各棟大廳已點交",
    "updated_at": "2025-01-08"
  },
  {
    "id": "EQ-0602",
    "company_name": "宗友",
    "contract_id": "CT-ZYU-2024-06",
    "project_name": "宗友亞灣軟體園區大樓",
    "sales_rep": "趙業務工程師",
    "system_type": "攝影機",
    "device_name": "4K室內廣角半球網路攝影機",
    "model": "Dahua DH-IPC-HDBW5842",
    "quantity": 32,
    "delivered_qty": 20,
    "undelivered_qty": 12,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-07-20",
    "remarks": "公設交誼廳待交貨",
    "updated_at": "2025-01-08"
  },
  {
    "id": "EQ-0603",
    "company_name": "宗友",
    "contract_id": "CT-ZYU-2024-06",
    "project_name": "宗友亞灣軟體園區大樓",
    "sales_rep": "趙業務工程師",
    "system_type": "門禁系統",
    "device_name": "感應式防潑水RFID門禁讀卡機",
    "model": "Soyal AR-721-H",
    "quantity": 28,
    "delivered_qty": 28,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-02-18",
    "remarks": "全區連線運作正常",
    "updated_at": "2025-01-08"
  },
  {
    "id": "EQ-0604",
    "company_name": "宗友",
    "contract_id": "CT-ZYU-2024-06",
    "project_name": "宗友亞灣軟體園區大樓",
    "sales_rep": "趙業務工程師",
    "system_type": "電子鎖",
    "device_name": "高拉力陽極鎖配光電繼電器",
    "model": "Gianni EB-220",
    "quantity": 30,
    "delivered_qty": 15,
    "undelivered_qty": 15,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2025-12-10",
    "remarks": "第二批預計年底交貨",
    "updated_at": "2025-01-08"
  },
  {
    "id": "EQ-0605",
    "company_name": "宗友",
    "contract_id": "CT-ZYU-2024-06",
    "project_name": "宗友亞灣軟體園區大樓",
    "sales_rep": "趙業務工程師",
    "system_type": "燈控系統",
    "device_name": "DALI 智慧分區照明開關控制器",
    "model": "Schneider MTN6725-0001",
    "quantity": 10,
    "delivered_qty": 6,
    "undelivered_qty": 4,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2025-11-15",
    "remarks": "一期6組已啟用",
    "updated_at": "2025-01-08"
  },
  {
    "id": "EQ-0701",
    "company_name": "宗晟",
    "contract_id": "CT-ZS-2024-07",
    "project_name": "宗晟林口智慧園區辦公大樓",
    "sales_rep": "林專案經理",
    "system_type": "對講機",
    "device_name": "緊急呼叫話筒與對講按鈕主機",
    "model": "Commax TP-12AM",
    "quantity": 20,
    "delivered_qty": 20,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-06-12",
    "remarks": "廠區各通訊點完成測試",
    "updated_at": "2025-01-12"
  },
  {
    "id": "EQ-0702",
    "company_name": "宗晟",
    "contract_id": "CT-ZS-2024-07",
    "project_name": "宗晟林口智慧園區辦公大樓",
    "sales_rep": "林專案經理",
    "system_type": "攝影機",
    "device_name": "高倍率光學變焦戶外快速球機",
    "model": "Hikvision DS-2DF8836",
    "quantity": 10,
    "delivered_qty": 5,
    "undelivered_qty": 5,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-10-25",
    "remarks": "周界監控5支待交貨",
    "updated_at": "2025-01-12"
  },
  {
    "id": "EQ-0703",
    "company_name": "宗晟",
    "contract_id": "CT-ZS-2024-07",
    "project_name": "宗晟林口智慧園區辦公大樓",
    "sales_rep": "林專案經理",
    "system_type": "門禁系統",
    "device_name": "指紋+卡片多功能門禁主機",
    "model": "Soyal AR-881-EF",
    "quantity": 18,
    "delivered_qty": 18,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-07-20",
    "remarks": "各管制門驗收點交完成",
    "updated_at": "2025-01-12"
  },
  {
    "id": "EQ-0704",
    "company_name": "宗晟",
    "contract_id": "CT-ZS-2024-07",
    "project_name": "宗晟林口智慧園區辦公大樓",
    "sales_rep": "林專案經理",
    "system_type": "電子鎖",
    "device_name": "靜音微電腦埋入式陰極鎖",
    "model": "Gianni GK-300",
    "quantity": 25,
    "delivered_qty": 25,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-08-05",
    "remarks": "機房區全數點交",
    "updated_at": "2025-01-12"
  },
  {
    "id": "EQ-0705",
    "company_name": "宗晟",
    "contract_id": "CT-ZS-2024-07",
    "project_name": "宗晟林口智慧園區辦公大樓",
    "sales_rep": "林專案經理",
    "system_type": "燈控系統",
    "device_name": "節能光感動態排程控制主機",
    "model": "Lutron QSGR-3P",
    "quantity": 14,
    "delivered_qty": 7,
    "undelivered_qty": 7,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2026-02-20",
    "remarks": "二期擴建7組待交貨",
    "updated_at": "2025-01-12"
  },
  {
    "id": "EQ-0801",
    "company_name": "和興",
    "contract_id": "CT-HX-2024-08",
    "project_name": "和興南科精密工業廠區",
    "sales_rep": "黃業務副理",
    "system_type": "對講機",
    "device_name": "防爆壁掛式對講電話分機",
    "model": "J&R JR101-FK",
    "quantity": 15,
    "delivered_qty": 15,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-02-20",
    "remarks": "生產線全數點交啟用",
    "updated_at": "2025-01-05"
  },
  {
    "id": "EQ-0802",
    "company_name": "和興",
    "contract_id": "CT-HX-2024-08",
    "project_name": "和興南科精密工業廠區",
    "sales_rep": "黃業務副理",
    "system_type": "攝影機",
    "device_name": "AI熱成像雙光譜防爆攝影機",
    "model": "Hikvision DS-2TD2617",
    "quantity": 8,
    "delivered_qty": 4,
    "undelivered_qty": 4,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-08-30",
    "remarks": "化學品倉庫待交貨",
    "updated_at": "2025-01-05"
  },
  {
    "id": "EQ-0803",
    "company_name": "和興",
    "contract_id": "CT-HX-2024-08",
    "project_name": "和興南科精密工業廠區",
    "sales_rep": "黃業務副理",
    "system_type": "門禁系統",
    "device_name": "快速安全閘門通道控制模組",
    "model": "Kaba HSB-E02",
    "quantity": 6,
    "delivered_qty": 6,
    "undelivered_qty": 0,
    "unit": "道",
    "delivery_status": "已交貨",
    "delivery_date": "2024-03-15",
    "remarks": "主大門員工通道啟用",
    "updated_at": "2025-01-05"
  },
  {
    "id": "EQ-0804",
    "company_name": "和興",
    "contract_id": "CT-HX-2024-08",
    "project_name": "和興南科精密工業廠區",
    "sales_rep": "黃業務副理",
    "system_type": "電子鎖",
    "device_name": "1200磅高剪力雙門磁力鎖",
    "model": "Gianni EM-1200",
    "quantity": 20,
    "delivered_qty": 10,
    "undelivered_qty": 10,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2025-11-20",
    "remarks": "二期倉儲區待交貨",
    "updated_at": "2025-01-05"
  },
  {
    "id": "EQ-0805",
    "company_name": "和興",
    "contract_id": "CT-HX-2024-08",
    "project_name": "和興南科精密工業廠區",
    "sales_rep": "黃業務副理",
    "system_type": "燈控系統",
    "device_name": "高天井LED工廠時序節能迴路箱",
    "model": "Lite-Puter PL-S0805",
    "quantity": 16,
    "delivered_qty": 16,
    "undelivered_qty": 0,
    "unit": "套",
    "delivery_status": "已交貨",
    "delivery_date": "2024-05-30",
    "remarks": "一期廠房燈控全部點交",
    "updated_at": "2025-01-05"
  },
  {
    "id": "EQ-0901",
    "company_name": "宗科",
    "contract_id": "CT-ZK-2024-09",
    "project_name": "宗科竹北生醫研發中心",
    "sales_rep": "蔡業務專員",
    "system_type": "對講機",
    "device_name": "IP彩色多功能管理總機",
    "model": "Akuvox R29C",
    "quantity": 6,
    "delivered_qty": 6,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-04-18",
    "remarks": "中控管理室已啟用",
    "updated_at": "2025-01-18"
  },
  {
    "id": "EQ-0902",
    "company_name": "宗科",
    "contract_id": "CT-ZK-2024-09",
    "project_name": "宗科竹北生醫研發中心",
    "sales_rep": "蔡業務專員",
    "system_type": "攝影機",
    "device_name": "醫療無塵室抗干擾專用攝影機",
    "model": "Panasonic WV-S2531LTN",
    "quantity": 25,
    "delivered_qty": 15,
    "undelivered_qty": 10,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-09-15",
    "remarks": "二期實驗室交貨",
    "updated_at": "2025-01-18"
  },
  {
    "id": "EQ-0903",
    "company_name": "宗科",
    "contract_id": "CT-ZK-2024-09",
    "project_name": "宗科竹北生醫研發中心",
    "sales_rep": "蔡業務專員",
    "system_type": "門禁系統",
    "device_name": "非接觸式手勢感應門禁主機",
    "model": "Soyal AR-837-EA",
    "quantity": 22,
    "delivered_qty": 22,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-06-05",
    "remarks": "實驗室全面安裝完畢",
    "updated_at": "2025-01-18"
  },
  {
    "id": "EQ-0904",
    "company_name": "宗科",
    "contract_id": "CT-ZK-2024-09",
    "project_name": "宗科竹北生醫研發中心",
    "sales_rep": "蔡業務專員",
    "system_type": "電子鎖",
    "device_name": "微電腦不銹鋼靜音電鎖",
    "model": "Gianni EB-200",
    "quantity": 30,
    "delivered_qty": 15,
    "undelivered_qty": 15,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2026-03-20",
    "remarks": "二期無塵室電鎖待交貨",
    "updated_at": "2025-01-18"
  },
  {
    "id": "EQ-0905",
    "company_name": "宗科",
    "contract_id": "CT-ZK-2024-09",
    "project_name": "宗科竹北生醫研發中心",
    "sales_rep": "蔡業務專員",
    "system_type": "燈控系統",
    "device_name": "智慧色溫可調生醫照明控制主機",
    "model": "Lutron Energi Savr Node",
    "quantity": 18,
    "delivered_qty": 18,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-07-10",
    "remarks": "生醫實驗室全光譜照明驗收",
    "updated_at": "2025-01-18"
  },
  {
    "id": "EQ-1001",
    "company_name": "宗順",
    "contract_id": "CT-ZS-2023-10",
    "project_name": "宗順新莊副都心商辦大樓",
    "sales_rep": "吳業務副理",
    "system_type": "對講機",
    "device_name": "SIP彩色可視大門對講機",
    "model": "Panasonic VL-V900",
    "quantity": 8,
    "delivered_qty": 8,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2023-12-15",
    "remarks": "迎賓大廳設備啟用",
    "updated_at": "2025-01-15"
  },
  {
    "id": "EQ-1002",
    "company_name": "宗順",
    "contract_id": "CT-ZS-2023-10",
    "project_name": "宗順新莊副都心商辦大樓",
    "sales_rep": "吳業務副理",
    "system_type": "攝影機",
    "device_name": "4K星光級防護半球型攝影機",
    "model": "Hikvision DS-2CD2186",
    "quantity": 45,
    "delivered_qty": 30,
    "undelivered_qty": 15,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-07-30",
    "remarks": "二期商辦樓層待交貨",
    "updated_at": "2025-01-15"
  },
  {
    "id": "EQ-1003",
    "company_name": "宗順",
    "contract_id": "CT-ZS-2023-10",
    "project_name": "宗順新莊副都心商辦大樓",
    "sales_rep": "吳業務副理",
    "system_type": "門禁系統",
    "device_name": "多頻雙模人臉/RFID考勤主機",
    "model": "Soyal AR-837-EF",
    "quantity": 20,
    "delivered_qty": 20,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-01-20",
    "remarks": "各樓層門禁正常啟用",
    "updated_at": "2025-01-15"
  },
  {
    "id": "EQ-1004",
    "company_name": "宗順",
    "contract_id": "CT-ZS-2023-10",
    "project_name": "宗順新莊副都心商辦大樓",
    "sales_rep": "吳業務副理",
    "system_type": "電子鎖",
    "device_name": "商用型電子式重型感應門鎖",
    "model": "Yale YDM-7116",
    "quantity": 35,
    "delivered_qty": 20,
    "undelivered_qty": 15,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2025-10-15",
    "remarks": "二期租戶門扇更換",
    "updated_at": "2025-01-15"
  },
  {
    "id": "EQ-1005",
    "company_name": "宗順",
    "contract_id": "CT-ZS-2023-10",
    "project_name": "宗順新莊副都心商辦大樓",
    "sales_rep": "吳業務副理",
    "system_type": "燈控系統",
    "device_name": "公共區域感應節能照明控制器",
    "model": "Schneider SpaceLogic",
    "quantity": 15,
    "delivered_qty": 10,
    "undelivered_qty": 5,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2025-11-10",
    "remarks": "公設照明控制器分批點交",
    "updated_at": "2025-01-15"
  },
  {
    "id": "EQ-1101",
    "company_name": "宗益",
    "contract_id": "CT-ZYI-2024-11",
    "project_name": "宗益彰濱工業物流倉儲區",
    "sales_rep": "張業務主任",
    "system_type": "對講機",
    "device_name": "防水防塵壁掛對講分機",
    "model": "Commax CM-800",
    "quantity": 16,
    "delivered_qty": 16,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-07-25",
    "remarks": "物流月台通訊完工",
    "updated_at": "2025-01-22"
  },
  {
    "id": "EQ-1102",
    "company_name": "宗益",
    "contract_id": "CT-ZYI-2024-11",
    "project_name": "宗益彰濱工業物流倉儲區",
    "sales_rep": "張業務主任",
    "system_type": "攝影機",
    "device_name": "超長距離紅外線車牌辨識攝影機",
    "model": "Hikvision iDS-2CD7A46",
    "quantity": 12,
    "delivered_qty": 6,
    "undelivered_qty": 6,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-08-20",
    "remarks": "貨車進出卡口二期交貨",
    "updated_at": "2025-01-22"
  },
  {
    "id": "EQ-1103",
    "company_name": "宗益",
    "contract_id": "CT-ZYI-2024-11",
    "project_name": "宗益彰濱工業物流倉儲區",
    "sales_rep": "張業務主任",
    "system_type": "門禁系統",
    "device_name": "長距離車牌辨識通行柵欄主機",
    "model": "Kaba HSB-E02",
    "quantity": 8,
    "delivered_qty": 8,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-08-30",
    "remarks": "車輛通行閘門全數點交",
    "updated_at": "2025-01-22"
  },
  {
    "id": "EQ-1104",
    "company_name": "宗益",
    "contract_id": "CT-ZYI-2024-11",
    "project_name": "宗益彰濱工業物流倉儲區",
    "sales_rep": "張業務主任",
    "system_type": "電子鎖",
    "device_name": "重型倉儲推拉防爆電磁門鎖",
    "model": "Gianni EM-600",
    "quantity": 40,
    "delivered_qty": 20,
    "undelivered_qty": 20,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2026-02-15",
    "remarks": "南區倉儲門鎖預計明年交貨",
    "updated_at": "2025-01-22"
  },
  {
    "id": "EQ-1105",
    "company_name": "宗益",
    "contract_id": "CT-ZYI-2024-11",
    "project_name": "宗益彰濱工業物流倉儲區",
    "sales_rep": "張業務主任",
    "system_type": "燈控系統",
    "device_name": "高架倉儲智慧微波感應調光模組",
    "model": "Lite-Puter PL-S0805",
    "quantity": 20,
    "delivered_qty": 20,
    "undelivered_qty": 0,
    "unit": "套",
    "delivery_status": "已交貨",
    "delivery_date": "2024-09-15",
    "remarks": "倉儲貨架自動感應燈控啟用",
    "updated_at": "2025-01-22"
  },
  {
    "id": "EQ-1201",
    "company_name": "百成",
    "contract_id": "CT-BC-2024-12",
    "project_name": "百成中壢工業區科技總部",
    "sales_rep": "李業務總監",
    "system_type": "對講機",
    "device_name": "IP觸控式智慧門口對講機",
    "model": "Akuvox R29C",
    "quantity": 10,
    "delivered_qty": 10,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-01-30",
    "remarks": "科技總部各入口點交",
    "updated_at": "2025-01-14"
  },
  {
    "id": "EQ-1202",
    "company_name": "百成",
    "contract_id": "CT-BC-2024-12",
    "project_name": "百成中壢工業區科技總部",
    "sales_rep": "李業務總監",
    "system_type": "攝影機",
    "device_name": "4K全方位高清紅外線攝影機",
    "model": "Dahua DH-IPC-EBW81242",
    "quantity": 36,
    "delivered_qty": 24,
    "undelivered_qty": 12,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-09-10",
    "remarks": "周邊綠帶圍籬監視交貨",
    "updated_at": "2025-01-14"
  },
  {
    "id": "EQ-1203",
    "company_name": "百成",
    "contract_id": "CT-BC-2024-12",
    "project_name": "百成中壢工業區科技總部",
    "sales_rep": "李業務總監",
    "system_type": "門禁系統",
    "device_name": "多頻雙模動態人臉辨識終端",
    "model": "Soyal AR-837-EA",
    "quantity": 25,
    "delivered_qty": 25,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-03-20",
    "remarks": "全廠區門禁正式上線",
    "updated_at": "2025-01-14"
  },
  {
    "id": "EQ-1204",
    "company_name": "百成",
    "contract_id": "CT-BC-2024-12",
    "project_name": "百成中壢工業區科技總部",
    "sales_rep": "李業務總監",
    "system_type": "電子鎖",
    "device_name": "高安全性微電腦伺服連鎖電鎖",
    "model": "Gianni EB-200",
    "quantity": 45,
    "delivered_qty": 25,
    "undelivered_qty": 20,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2025-12-20",
    "remarks": "二期行政大樓待交貨",
    "updated_at": "2025-01-14"
  },
  {
    "id": "EQ-1205",
    "company_name": "百成",
    "contract_id": "CT-BC-2024-12",
    "project_name": "百成中壢工業區科技總部",
    "sales_rep": "李業務總監",
    "system_type": "燈控系統",
    "device_name": "多區域智慧調光控制模組箱",
    "model": "Lutron QSGR-3P",
    "quantity": 16,
    "delivered_qty": 16,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-04-20",
    "remarks": "總部行政區調光系統���用",
    "updated_at": "2025-01-14"
  },
  {
    "id": "EQ-1301",
    "company_name": "宗麒",
    "contract_id": "CT-ZQ-2024-13",
    "project_name": "宗麒新店安坑智能住宅社區",
    "sales_rep": "陳業務專員",
    "system_type": "對講機",
    "device_name": "7吋彩色室內緊急對講對講分機",
    "model": "Panasonic VL-SV74",
    "quantity": 50,
    "delivered_qty": 50,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-09-15",
    "remarks": "A棟住宅已全數點交完畢",
    "updated_at": "2025-01-20"
  },
  {
    "id": "EQ-1302",
    "company_name": "宗麒",
    "contract_id": "CT-ZQ-2024-13",
    "project_name": "宗麒新店安坑智能住宅社區",
    "sales_rep": "陳業務專員",
    "system_type": "攝影機",
    "device_name": "戶外星光級防暴半球型攝影機",
    "model": "Hikvision DS-2CD2186",
    "quantity": 40,
    "delivered_qty": 25,
    "undelivered_qty": 15,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-08-15",
    "remarks": "B棟中庭花園監視待交貨",
    "updated_at": "2025-01-20"
  },
  {
    "id": "EQ-1303",
    "company_name": "宗麒",
    "contract_id": "CT-ZQ-2024-13",
    "project_name": "宗麒新店安坑智能住宅社區",
    "sales_rep": "陳業務專員",
    "system_type": "門禁系統",
    "device_name": "住宅大門感應讀卡機聯動系統",
    "model": "Soyal AR-721-H",
    "quantity": 30,
    "delivered_qty": 30,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-10-10",
    "remarks": "門禁刷卡系統���作正常",
    "updated_at": "2025-01-20"
  },
  {
    "id": "EQ-1304",
    "company_name": "宗麒",
    "contract_id": "CT-ZQ-2024-13",
    "project_name": "宗麒新店安坑智能住宅社區",
    "sales_rep": "陳業務專員",
    "system_type": "電子鎖",
    "device_name": "指紋卡片密碼智慧三合一門鎖",
    "model": "Yale YDM-4109",
    "quantity": 50,
    "delivered_qty": 25,
    "undelivered_qty": 25,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2026-01-10",
    "remarks": "B棟住宅防盜門鎖待交貨",
    "updated_at": "2025-01-20"
  },
  {
    "id": "EQ-1305",
    "company_name": "宗麒",
    "contract_id": "CT-ZQ-2024-13",
    "project_name": "宗麒新店安坑智能住宅社區",
    "sales_rep": "陳業務專員",
    "system_type": "燈控系統",
    "device_name": "社區景觀中庭定時燈光控制器",
    "model": "Schneider MTN6725-0001",
    "quantity": 12,
    "delivered_qty": 12,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-11-15",
    "remarks": "中庭景觀與步道燈控啟用",
    "updated_at": "2025-01-20"
  },
  {
    "id": "EQ-1401",
    "company_name": "廣晟",
    "contract_id": "CT-GS-2023-14",
    "project_name": "廣晟高雄路竹生技園區",
    "sales_rep": "趙業務工程師",
    "system_type": "對講機",
    "device_name": "防腐蝕耐酸鹼工業對講分機",
    "model": "J&R JR101-FK",
    "quantity": 12,
    "delivered_qty": 12,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2023-09-28",
    "remarks": "化學實驗室通訊完工",
    "updated_at": "2025-01-16"
  },
  {
    "id": "EQ-1402",
    "company_name": "廣晟",
    "contract_id": "CT-GS-2023-14",
    "project_name": "廣晟高雄路竹生技園區",
    "sales_rep": "趙業務工程師",
    "system_type": "攝影機",
    "device_name": "4K紅外線防護網路攝影機",
    "model": "Hikvision DS-2CD2T86",
    "quantity": 30,
    "delivered_qty": 20,
    "undelivered_qty": 10,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-07-20",
    "remarks": "二期發酵槽區交貨",
    "updated_at": "2025-01-16"
  },
  {
    "id": "EQ-1403",
    "company_name": "廣晟",
    "contract_id": "CT-GS-2023-14",
    "project_name": "廣晟高雄路竹生技園區",
    "sales_rep": "趙業務工程師",
    "system_type": "門禁系統",
    "device_name": "無塵室互鎖門禁控制系統主機",
    "model": "Soyal AR-837-EF",
    "quantity": 15,
    "delivered_qty": 15,
    "undelivered_qty": 0,
    "unit": "套",
    "delivery_status": "已交貨",
    "delivery_date": "2023-11-20",
    "remarks": "氣閘室門禁連鎖驗收完成",
    "updated_at": "2025-01-16"
  },
  {
    "id": "EQ-1404",
    "company_name": "廣晟",
    "contract_id": "CT-GS-2023-14",
    "project_name": "廣晟高雄路竹生技園區",
    "sales_rep": "趙業務工程師",
    "system_type": "電子鎖",
    "device_name": "不銹鋼微電腦靜音陽極鎖附反饋",
    "model": "Gianni EB-200",
    "quantity": 28,
    "delivered_qty": 14,
    "undelivered_qty": 14,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2025-10-30",
    "remarks": "二期無塵室待交貨",
    "updated_at": "2025-01-16"
  },
  {
    "id": "EQ-1405",
    "company_name": "廣晟",
    "contract_id": "CT-GS-2023-14",
    "project_name": "廣晟高雄路竹生技園區",
    "sales_rep": "趙業務工程師",
    "system_type": "燈控系統",
    "device_name": "潔淨室紫外線與工作照明聯動主機",
    "model": "Lite-Puter EDX-607",
    "quantity": 10,
    "delivered_qty": 10,
    "undelivered_qty": 0,
    "unit": "套",
    "delivery_status": "已交貨",
    "delivery_date": "2024-01-15",
    "remarks": "實驗室紫外滅菌照明控制點交",
    "updated_at": "2025-01-16"
  },
  {
    "id": "EQ-1501",
    "company_name": "宗榮",
    "contract_id": "CT-ZR-2024-15",
    "project_name": "宗榮台南柳營生技製藥廠",
    "sales_rep": "黃業務副理",
    "system_type": "對講機",
    "device_name": "SIP防水可視對講大門主機",
    "model": "Akuvox E12W",
    "quantity": 8,
    "delivered_qty": 8,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-03-25",
    "remarks": "廠區各哨口通訊正常",
    "updated_at": "2025-01-19"
  },
  {
    "id": "EQ-1502",
    "company_name": "宗榮",
    "contract_id": "CT-ZR-2024-15",
    "project_name": "宗榮台南柳營生技製藥廠",
    "sales_rep": "黃業務副理",
    "system_type": "攝影機",
    "device_name": "全天候紅外線星光攝影機",
    "model": "Dahua DH-IPC-HDBW5842",
    "quantity": 28,
    "delivered_qty": 18,
    "undelivered_qty": 10,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-09-25",
    "remarks": "二期倉儲區待交貨",
    "updated_at": "2025-01-19"
  },
  {
    "id": "EQ-1503",
    "company_name": "宗榮",
    "contract_id": "CT-ZR-2024-15",
    "project_name": "宗榮台南柳營生技製藥廠",
    "sales_rep": "黃業務副理",
    "system_type": "門禁系統",
    "device_name": "多頻雙模人臉/RFID門禁終端",
    "model": "Soyal AR-837-EA",
    "quantity": 20,
    "delivered_qty": 20,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-05-15",
    "remarks": "主要管制區門禁啟用",
    "updated_at": "2025-01-19"
  },
  {
    "id": "EQ-1504",
    "company_name": "宗榮",
    "contract_id": "CT-ZR-2024-15",
    "project_name": "宗榮台南柳營生技製藥廠",
    "sales_rep": "黃業務副理",
    "system_type": "電子鎖",
    "device_name": "斷電開型微電腦靜音電磁門鎖",
    "model": "Gianni EM-600",
    "quantity": 32,
    "delivered_qty": 16,
    "undelivered_qty": 16,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2026-01-20",
    "remarks": "二期廠房預計交貨",
    "updated_at": "2025-01-19"
  },
  {
    "id": "EQ-1505",
    "company_name": "宗榮",
    "contract_id": "CT-ZR-2024-15",
    "project_name": "宗榮台南柳營生技製藥廠",
    "sales_rep": "黃業務副理",
    "system_type": "燈控系統",
    "device_name": "時序智慧排程節能照明系統",
    "model": "Schneider SpaceLogic",
    "quantity": 14,
    "delivered_qty": 14,
    "undelivered_qty": 0,
    "unit": "組",
    "delivery_status": "已交貨",
    "delivery_date": "2024-06-20",
    "remarks": "一期廠區節能照明全數驗收",
    "updated_at": "2025-01-19"
  },
  {
    "id": "EQ-1601",
    "company_name": "宗霖",
    "contract_id": "CT-ZL-2024-16",
    "project_name": "宗霖苗栗竹南高階半導體廠",
    "sales_rep": "張業務主任",
    "system_type": "對講機",
    "device_name": "防爆抗干擾工業通訊對講主機",
    "model": "J&R JR101-FK",
    "quantity": 14,
    "delivered_qty": 14,
    "undelivered_qty": 0,
    "unit": "台",
    "delivery_status": "已交貨",
    "delivery_date": "2024-05-28",
    "remarks": "無塵生產線通訊啟用",
    "updated_at": "2025-01-25"
  },
  {
    "id": "EQ-1602",
    "company_name": "宗霖",
    "contract_id": "CT-ZL-2024-16",
    "project_name": "宗霖苗栗竹南高階半導體廠",
    "sales_rep": "張業務主任",
    "system_type": "攝影機",
    "device_name": "4K室外超低照度紅外線攝影機",
    "model": "Hikvision DS-2CD2186",
    "quantity": 50,
    "delivered_qty": 35,
    "undelivered_qty": 15,
    "unit": "支",
    "delivery_status": "未交貨",
    "delivery_date": "2025-10-30",
    "remarks": "廠外圍界監視待交貨",
    "updated_at": "2025-01-25"
  },
  {
    "id": "EQ-1603",
    "company_name": "宗霖",
    "contract_id": "CT-ZL-2024-16",
    "project_name": "宗霖苗栗竹南高階半導體廠",
    "sales_rep": "張業務主任",
    "system_type": "門禁系統",
    "device_name": "防靜電考勤閘門通道控制系統",
    "model": "Kaba HSB-E02",
    "quantity": 12,
    "delivered_qty": 12,
    "undelivered_qty": 0,
    "unit": "道",
    "delivery_status": "已交貨",
    "delivery_date": "2024-07-15",
    "remarks": "無塵室入口考勤門禁啟用",
    "updated_at": "2025-01-25"
  },
  {
    "id": "EQ-1604",
    "company_name": "宗霖",
    "contract_id": "CT-ZL-2024-16",
    "project_name": "宗霖苗栗竹南高階半導體廠",
    "sales_rep": "張業務主任",
    "system_type": "電子鎖",
    "device_name": "高精度感應重型安全電子鎖",
    "model": "Southco H3-EM",
    "quantity": 40,
    "delivered_qty": 20,
    "undelivered_qty": 20,
    "unit": "套",
    "delivery_status": "未交貨",
    "delivery_date": "2026-03-10",
    "remarks": "二期配電盤機櫃鎖交貨",
    "updated_at": "2025-01-25"
  },
  {
    "id": "EQ-1605",
    "company_name": "宗霖",
    "contract_id": "CT-ZL-2024-16",
    "project_name": "宗霖苗栗竹南高階半導體廠",
    "sales_rep": "張業務主任",
    "system_type": "燈控系統",
    "device_name": "半導體黃光區專用防紫外線照明控制器",
    "model": "Lutron Energi Savr Node",
    "quantity": 18,
    "delivered_qty": 12,
    "undelivered_qty": 6,
    "unit": "組",
    "delivery_status": "未交貨",
    "delivery_date": "2025-11-20",
    "remarks": "一期12組已啟用",
    "updated_at": "2025-01-25"
  },
  {
    "id": "EQ-1701",
    "company_name": "優德美科技",
    "contract_id": "CT-UDM-2025-01",
    "project_name": "優德美智慧綠能研發中心",
    "sales_rep": "陳專案經理",
    "system_type": "燈控系統",
    "brand": "數位智能調光多迴路模組主機",
    "device_name": "Lutron QSGR-3P",
    "model": 20,
    "quantity": 20,
    "delivered_qty": 0,
    "undelivered_qty": null,
    "unit": "已交貨",
    "delivery_status": "2024-04-15",
    "delivery_date": "一期研發樓層智慧照明調光主機已全數完成點交",
    "remarks": "2025-02-15",
    "updated_at": ""
  },
  {
    "id": "EQ-1702",
    "company_name": "優德美科技",
    "contract_id": "CT-UDM-2025-01",
    "project_name": "優德美智慧綠能研發中心",
    "sales_rep": "陳專案經理",
    "system_type": "燈控系統",
    "brand": "8迴路繼電器開關模組箱",
    "device_name": "Lite-Puter PL-S0805",
    "model": 35,
    "quantity": 20,
    "delivered_qty": 15,
    "undelivered_qty": null,
    "unit": "未交貨",
    "delivery_status": "2025-06-30",
    "delivery_date": "二期工程15套預計於年中交貨驗收",
    "remarks": "2025-02-15",
    "updated_at": ""
  },
  {
    "id": "EQ-1801",
    "company_name": "富鈺節能科技",
    "contract_id": "CT-FY-2025-01",
    "project_name": "富鈺低碳節能展示總部",
    "sales_rep": "林技術主管",
    "system_type": "燈控系統",
    "brand": "DALI-2 智慧照明閘道器控制模組",
    "device_name": "Schneider MTN6725-0001",
    "model": 16,
    "quantity": 16,
    "delivered_qty": 0,
    "undelivered_qty": null,
    "unit": "已交貨",
    "delivery_status": "2024-03-20",
    "delivery_date": "展廳與會議室 DALI 照明已正常運作",
    "remarks": "2025-02-10",
    "updated_at": ""
  },
  {
    "id": "EQ-1802",
    "company_name": "富鈺節能科技",
    "contract_id": "CT-FY-2025-01",
    "project_name": "富鈺低碳節能展示總部",
    "sales_rep": "林技術主管",
    "system_type": "門禁系統",
    "brand": "多頻雙模人臉/RFID門禁考勤主機",
    "device_name": "Soyal AR-837-EA",
    "model": 12,
    "quantity": 6,
    "delivered_qty": 6,
    "undelivered_qty": null,
    "unit": "未交貨",
    "delivery_status": "已交貨",
    "delivery_date": "二期展示區域6組待工程進場後點交",
    "remarks": "2025-02-10",
    "updated_at": ""
  }
];

class ApiService {
  constructor() {
    this.API_URL_KEY = 'equip_mgmt_gas_api_url_v7';
    this.DATA_STORAGE_KEY = 'equip_mgmt_local_equipment_v7';
    this.COMPANIES_KEY = 'equip_mgmt_local_companies_v7';
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
   * 初始化與升級本機資料庫
   */
  initLocalStorage() {
    const raw = localStorage.getItem(this.DATA_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_EQUIPMENT));
    } else {
      try {
        const parsed = JSON.parse(raw);
        // 自動檢測並無縫補齊新增的示範設備 (如優德美、富鈺、燈控系統)
        const existingIds = new Set(parsed.map(item => item.id));
        const missingDefaults = INITIAL_MOCK_EQUIPMENT.filter(item => !existingIds.has(item.id));
        const combined = missingDefaults.length > 0 ? parsed.concat(missingDefaults) : parsed;
        const migrated = combined.map(item => this.normalizeItem(item));
        localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(migrated));
      } catch (e) {
        localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_EQUIPMENT));
      }
    }

    const compRaw = localStorage.getItem(this.COMPANIES_KEY);
    if (!compRaw) {
      localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(INITIAL_MOCK_COMPANIES));
    } else {
      try {
        const existingComps = JSON.parse(compRaw);
        const existingNames = new Set(existingComps.map(c => c.company_name));
        let changed = false;
        INITIAL_MOCK_COMPANIES.forEach(mockC => {
          if (!existingNames.has(mockC.company_name)) {
            existingComps.push(mockC);
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(existingComps));
        }
      } catch (e) {
        localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(INITIAL_MOCK_COMPANIES));
      }
    }
  }

  /**
   * 資料項目正規化工具函數
   */
  normalizeItem(item) {
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
    let sysType = '對講機';
    if (combinedText.indexOf('門禁') !== -1 || combinedText.indexOf('刷卡') !== -1 || combinedText.indexOf('讀卡') !== -1 || combinedText.indexOf('閘門') !== -1 || combinedText.indexOf('access') !== -1) sysType = '門禁系統';
    else if (combinedText.indexOf('燈控') !== -1 || combinedText.indexOf('照明') !== -1 || combinedText.indexOf('調光') !== -1 || combinedText.indexOf('燈光') !== -1 || combinedText.indexOf('light') !== -1) sysType = '燈控系統';
    else if (combinedText.indexOf('攝影') !== -1 || combinedText.indexOf('監視') !== -1 || combinedText.indexOf('監控') !== -1 || combinedText.indexOf('cctv') !== -1 || combinedText.indexOf('camera') !== -1) sysType = '攝影機';
    else if (combinedText.indexOf('鎖') !== -1 || combinedText.indexOf('陽極') !== -1 || combinedText.indexOf('磁力') !== -1 || combinedText.indexOf('陰極') !== -1 || combinedText.indexOf('lock') !== -1) sysType = '電子鎖';
    else if (combinedText.indexOf('對講') !== -1 || combinedText.indexOf('門口機') !== -1 || combinedText.indexOf('室內機') !== -1 || combinedText.indexOf('intercom') !== -1) sysType = '對講機';
    else sysType = rawSys || '對講機';

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
    if (systemType === '對講機') return 'Panasonic';
    if (systemType === '攝影機') return 'Hikvision';
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
        if (list && list.length >= 16) return list;
      } catch (e) {}
    }
    localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(INITIAL_MOCK_COMPANIES));
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
        list = JSON.parse(raw);
      } catch (e) {
        list = INITIAL_MOCK_EQUIPMENT;
      }
    } else {
      list = INITIAL_MOCK_EQUIPMENT;
      localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(list));
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
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const resp = await fetch(liveUrl, { method: 'GET', signal: controller.signal });
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
          const res = await this.fetchJsonp(liveUrl);
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
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const resp = await fetch(liveUrl, { method: 'GET', signal: controller.signal });
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
          const res = await this.fetchJsonp(liveUrl);
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

    if (this.isLiveMode()) {
      try {
        const resp = await fetch(this.apiUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'saveEquipment',
            data: normalized,
            username: username
          })
        });
        const res = await resp.json();
        if (res.success) return res;
      } catch (e) {
        console.warn('Live API save failed, saving to local store:', e);
      }
    }

    // 本機儲存
    const raw = localStorage.getItem(this.DATA_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : INITIAL_MOCK_EQUIPMENT;
    list = list.map(item => this.normalizeItem(item));
    const today = new Date().toISOString().split('T')[0];

    if (normalized.id) {
      const idx = list.findIndex(e => e.id === normalized.id);
      if (idx !== -1) {
        list[idx] = Object.assign({}, list[idx], normalized, { updated_at: today });
      } else {
        list.unshift(Object.assign({}, normalized, { updated_at: today }));
      }
    } else {
      const newId = 'EQ-' + Math.floor(1000 + Math.random() * 9000);
      list.unshift(Object.assign({}, normalized, { id: newId, updated_at: today }));
    }

    localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(list));
    return { success: true, message: '儲存成功' };
  }

  /**
   * 快速切換交貨狀態 (已交貨 ⇄ 未交貨)
   */
  async toggleDeliveryStatus(id, username = 'admin') {
    const raw = localStorage.getItem(this.DATA_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : INITIAL_MOCK_EQUIPMENT;
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
    let list = raw ? JSON.parse(raw) : INITIAL_MOCK_EQUIPMENT;
    list = list.filter(e => e.id !== id);
    localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(list));
    return { success: true, message: '刪除成功' };
  }

  /**
   * 重置為預設資料
   */
  resetLocalData() {
    localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_EQUIPMENT));
    localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(INITIAL_MOCK_COMPANIES));
  }
}

window.apiService = new ApiService();

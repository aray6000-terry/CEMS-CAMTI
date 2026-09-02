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
  { company_id: 'CP-016', company_name: '宗霖', contact_name: '邱組長', contact_phone: '03-598-6677 #611', contract_start: '2024-05-15', contract_end: '2027-05-14', status: '合約履約中' }
];

const INITIAL_MOCK_EQUIPMENT = [
  // 1. 宗亞
  {
    id: 'EQ-0101',
    company_name: '宗亞',
    contract_id: 'CT-ZA-2025-01',
    project_name: '宗亞南港總部旗艦大樓',
    system_type: '對講機',
    device_name: 'IP觸控式門口對講主機',
    model: 'Panasonic VL-V900',
    quantity: 12,
    delivered_qty: 12,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2024-01-15',
    remarks: '大門門廳與訪客中心已全數完成點交',
    updated_at: '2025-02-01'
  },
  {
    id: 'EQ-0102',
    company_name: '宗亞',
    contract_id: 'CT-ZA-2025-01',
    project_name: '宗亞南港總部旗艦大樓',
    system_type: '對講機',
    device_name: '室內緊急對講分機 (壁掛)',
    model: 'Commax CM-800',
    quantity: 36,
    delivered_qty: 24,
    undelivered_qty: 12,
    unit: '台',
    delivery_status: '未交貨',
    delivery_date: '2025-03-20',
    remarks: '高樓層12台待二期工程驗收交貨',
    updated_at: '2025-02-01'
  },
  {
    id: 'EQ-0103',
    company_name: '宗亞',
    contract_id: 'CT-ZA-2025-01',
    project_name: '宗亞智慧園區二期',
    system_type: '攝影機',
    device_name: '4K紅外線防暴半球型網路攝影機',
    model: 'Hikvision DS-2CD2186',
    quantity: 60,
    delivered_qty: 60,
    undelivered_qty: 0,
    unit: '支',
    delivery_status: '已交貨',
    delivery_date: '2024-02-01',
    remarks: '全區走廊與公共空間已安裝完畢',
    updated_at: '2025-02-01'
  },
  {
    id: 'EQ-0104',
    company_name: '宗亞',
    contract_id: 'CT-ZA-2025-01',
    project_name: '宗亞智慧園區二期',
    system_type: '門禁系統',
    device_name: '多頻雙模人臉/RFID門禁主機',
    model: 'Soyal AR-837-EA',
    quantity: 25,
    delivered_qty: 25,
    undelivered_qty: 0,
    unit: '組',
    delivery_status: '已交貨',
    delivery_date: '2024-03-10',
    remarks: '主要管制門扇已全數啟用',
    updated_at: '2025-02-01'
  },
  {
    id: 'EQ-0105',
    company_name: '宗亞',
    contract_id: 'CT-ZA-2025-01',
    project_name: '宗亞智慧園區二期',
    system_type: '電子鎖',
    device_name: '斷電開型微電腦靜音陽極鎖',
    model: 'Gianni EB-200',
    quantity: 50,
    delivered_qty: 30,
    undelivered_qty: 20,
    unit: '組',
    delivery_status: '未交貨',
    delivery_date: '2026-04-10',
    remarks: '第二批20組預計2026年到貨交貨',
    updated_at: '2025-02-01'
  },

  // 2. 宗鈺
  {
    id: 'EQ-0201',
    company_name: '宗鈺',
    contract_id: 'CT-ZY-2025-02',
    project_name: '宗鈺內湖科技大樓',
    system_type: '對講機',
    device_name: 'SIP高階視訊管理總機',
    model: 'Akuvox R29C',
    quantity: 8,
    delivered_qty: 8,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2023-11-01',
    remarks: '警衛中控室已點交',
    updated_at: '2025-01-20'
  },
  {
    id: 'EQ-0202',
    company_name: '宗鈺',
    contract_id: 'CT-ZY-2025-02',
    project_name: '宗鈺內湖科技大樓',
    system_type: '攝影機',
    device_name: '全景360度魚眼全景攝影機',
    model: 'Dahua DH-IPC-EBW81242',
    quantity: 24,
    delivered_qty: 16,
    undelivered_qty: 8,
    unit: '支',
    delivery_status: '未交貨',
    delivery_date: '2025-08-15',
    remarks: '地下停車場8支待二期施作',
    updated_at: '2025-01-20'
  },
  {
    id: 'EQ-0203',
    company_name: '宗鈺',
    contract_id: 'CT-ZY-2025-02',
    project_name: '宗鈺內湖科技大樓',
    system_type: '門禁系統',
    device_name: '掌靜脈高資安辨識主機',
    model: 'Fujitsu PalmSecure',
    quantity: 15,
    delivered_qty: 15,
    undelivered_qty: 0,
    unit: '套',
    delivery_status: '已交貨',
    delivery_date: '2024-05-10',
    remarks: '研發機房全數安裝',
    updated_at: '2025-01-20'
  },
  {
    id: 'EQ-0204',
    company_name: '宗鈺',
    contract_id: 'CT-ZY-2025-02',
    project_name: '宗鈺內湖科技大樓',
    system_type: '電子鎖',
    device_name: '重型感應指紋智慧防盜電子鎖',
    model: 'Yale YDM-7116',
    quantity: 20,
    delivered_qty: 8,
    undelivered_qty: 12,
    unit: '組',
    delivery_status: '未交貨',
    delivery_date: '2026-02-15',
    remarks: '主管辦公室換裝批次交貨',
    updated_at: '2025-02-10'
  },

  // 3. 宗泰
  {
    id: 'EQ-0301',
    company_name: '宗泰',
    contract_id: 'CT-ZT-2024-03',
    project_name: '宗泰竹科研發廠房',
    system_type: '對講機',
    device_name: '防爆型工業對講通訊分機',
    model: 'J&R JR101-FK',
    quantity: 18,
    delivered_qty: 18,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2024-05-20',
    remarks: '無塵室與產線區點交完成',
    updated_at: '2025-01-15'
  },
  {
    id: 'EQ-0302',
    company_name: '宗泰',
    contract_id: 'CT-ZT-2024-03',
    project_name: '宗泰竹科研發廠房',
    system_type: '攝影機',
    device_name: '4K紅外線防暴半球型網路攝影機',
    model: 'Hikvision DS-2CD2186',
    quantity: 70,
    delivered_qty: 45,
    undelivered_qty: 25,
    unit: '支',
    delivery_status: '未交貨',
    delivery_date: '2025-11-30',
    remarks: '外圍周界25支預計年底交貨',
    updated_at: '2025-01-15'
  },
  {
    id: 'EQ-0303',
    company_name: '宗泰',
    contract_id: 'CT-ZT-2024-03',
    project_name: '宗泰竹科研發廠房',
    system_type: '門禁系統',
    device_name: '快速伺服三叉閘門考勤通道',
    model: 'Kaba HSB-E02',
    quantity: 10,
    delivered_qty: 6,
    undelivered_qty: 4,
    unit: '道',
    delivery_status: '未交貨',
    delivery_date: '2026-03-15',
    remarks: '東側員工閘門待交貨',
    updated_at: '2025-01-15'
  },
  {
    id: 'EQ-0304',
    company_name: '宗泰',
    contract_id: 'CT-ZT-2024-03',
    project_name: '宗泰竹科研發廠房',
    system_type: '電子鎖',
    device_name: '600磅雙門磁力鎖附訊號接點',
    model: 'Gianni EM-600',
    quantity: 35,
    delivered_qty: 35,
    undelivered_qty: 0,
    unit: '組',
    delivery_status: '已交貨',
    delivery_date: '2024-06-01',
    remarks: '行政辦公室鋁門全數點交',
    updated_at: '2025-01-15'
  },

  // 4. 資訊星
  {
    id: 'EQ-0401',
    company_name: '資訊星',
    contract_id: 'CT-IS-2024-04',
    project_name: '資訊星雲端數據中心',
    system_type: '對講機',
    device_name: 'IP觸控式門口對講主機',
    model: 'Panasonic VL-V900',
    quantity: 6,
    delivered_qty: 6,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2024-08-10',
    remarks: 'IDC機房大門已啟用',
    updated_at: '2025-02-05'
  },
  {
    id: 'EQ-0402',
    company_name: '資訊星',
    contract_id: 'CT-IS-2024-04',
    project_name: '資訊星雲端數據中心',
    system_type: '攝影機',
    device_name: 'AI熱成像雙光譜周界球機',
    model: 'Hikvision DS-2TD4136',
    quantity: 16,
    delivered_qty: 8,
    undelivered_qty: 8,
    unit: '支',
    delivery_status: '未交貨',
    delivery_date: '2026-01-10',
    remarks: '第二批8支預計2026交貨',
    updated_at: '2025-02-05'
  },
  {
    id: 'EQ-0403',
    company_name: '資訊星',
    contract_id: 'CT-IS-2024-04',
    project_name: '資訊星雲端數據中心',
    system_type: '門禁系統',
    device_name: '掌靜脈高資安辨識主機',
    model: 'Fujitsu PalmSecure',
    quantity: 20,
    delivered_qty: 20,
    undelivered_qty: 0,
    unit: '套',
    delivery_status: '已交貨',
    delivery_date: '2024-09-01',
    remarks: 'IDC各機櫃通道已全數上線',
    updated_at: '2025-02-05'
  },
  {
    id: 'EQ-0404',
    company_name: '資訊星',
    contract_id: 'CT-IS-2024-04',
    project_name: '資訊星雲端數據中心',
    system_type: '電子鎖',
    device_name: '微電腦伺服機櫃電子聯鎖系統',
    model: 'Southco H3-EM',
    quantity: 60,
    delivered_qty: 30,
    undelivered_qty: 30,
    unit: '套',
    delivery_status: '未交貨',
    delivery_date: '2026-03-01',
    remarks: '第二批機櫃鎖預計2026交貨',
    updated_at: '2025-02-05'
  },

  // 5. 宗群
  {
    id: 'EQ-0501',
    company_name: '宗群',
    contract_id: 'CT-ZQ-2025-05',
    project_name: '宗群台中智慧物流港',
    system_type: '對講機',
    device_name: 'SIP高階視訊管理總機',
    model: 'Akuvox R29C',
    quantity: 10,
    delivered_qty: 10,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2024-04-12',
    remarks: '物流調度中心已點交',
    updated_at: '2025-01-10'
  },
  {
    id: 'EQ-0502',
    company_name: '宗群',
    contract_id: 'CT-ZQ-2025-05',
    project_name: '宗群台中智慧物流港',
    system_type: '攝影機',
    device_name: '4K紅外線防暴半球型網路攝影機',
    model: 'Hikvision DS-2CD2186',
    quantity: 80,
    delivered_qty: 50,
    undelivered_qty: 30,
    unit: '支',
    delivery_status: '未交貨',
    delivery_date: '2025-10-20',
    remarks: '倉儲二區30支待交貨',
    updated_at: '2025-01-10'
  },
  {
    id: 'EQ-0503',
    company_name: '宗群',
    contract_id: 'CT-ZQ-2025-05',
    project_name: '宗群台中智慧物流港',
    system_type: '門禁系統',
    device_name: '多頻雙模人臉/RFID門禁主機',
    model: 'Soyal AR-837-EA',
    quantity: 18,
    delivered_qty: 18,
    undelivered_qty: 0,
    unit: '組',
    delivery_status: '已交貨',
    delivery_date: '2024-05-15',
    remarks: '主要通道點交完成',
    updated_at: '2025-01-10'
  },
  {
    id: 'EQ-0504',
    company_name: '宗群',
    contract_id: 'CT-ZQ-2025-05',
    project_name: '宗群台中智慧物流港',
    system_type: '電子鎖',
    device_name: '窄版隱藏式送電開型陰極鎖',
    model: 'Openers & Closers 300',
    quantity: 40,
    delivered_qty: 20,
    undelivered_qty: 20,
    unit: '組',
    delivery_status: '未交貨',
    delivery_date: '2026-05-10',
    remarks: '二期辦公室鋁門鎖待交貨',
    updated_at: '2025-01-10'
  },

  // 6. 宗友
  {
    id: 'EQ-0601',
    company_name: '宗友',
    contract_id: 'CT-ZY-2024-06',
    project_name: '宗友高雄軟體研發總部',
    system_type: '對講機',
    device_name: '室內緊急對講分機 (壁掛)',
    model: 'Commax CM-800',
    quantity: 20,
    delivered_qty: 20,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2023-12-05',
    remarks: '各樓層緊急對講通話測試通過',
    updated_at: '2025-01-08'
  },
  {
    id: 'EQ-0602',
    company_name: '宗友',
    contract_id: 'CT-ZY-2024-06',
    project_name: '宗友高雄軟體研發總部',
    system_type: '攝影機',
    device_name: '全景360度魚眼全景攝影機',
    model: 'Dahua DH-IPC-EBW81242',
    quantity: 30,
    delivered_qty: 20,
    undelivered_qty: 10,
    unit: '支',
    delivery_status: '未交貨',
    delivery_date: '2025-07-20',
    remarks: '中庭10支預計2025/07交貨',
    updated_at: '2025-01-08'
  },
  {
    id: 'EQ-0603',
    company_name: '宗友',
    contract_id: 'CT-ZY-2024-06',
    project_name: '宗友高雄軟體研發總部',
    system_type: '門禁系統',
    device_name: '掌靜脈高資安辨識主機',
    model: 'Fujitsu PalmSecure',
    quantity: 14,
    delivered_qty: 14,
    undelivered_qty: 0,
    unit: '套',
    delivery_status: '已交貨',
    delivery_date: '2024-01-18',
    remarks: '核心機房門禁啟用',
    updated_at: '2025-01-08'
  },
  {
    id: 'EQ-0604',
    company_name: '宗友',
    contract_id: 'CT-ZY-2024-06',
    project_name: '宗友高雄軟體研發總部',
    system_type: '電子鎖',
    device_name: '斷電開型微電腦靜音陽極鎖',
    model: 'Gianni EB-200',
    quantity: 28,
    delivered_qty: 14,
    undelivered_qty: 14,
    unit: '組',
    delivery_status: '未交貨',
    delivery_date: '2026-06-20',
    remarks: '第二批陽極鎖預計2026交貨',
    updated_at: '2025-01-08'
  },

  // 7. 宗晟
  {
    id: 'EQ-0701',
    company_name: '宗晟',
    contract_id: 'CT-ZS-2024-07',
    project_name: '宗晟桃園先進科技廠',
    system_type: '對講機',
    device_name: 'IP觸控式門口對講主機',
    model: 'Panasonic VL-V900',
    quantity: 8,
    delivered_qty: 8,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2024-06-15',
    remarks: '廠務門口機全數完成點交',
    updated_at: '2025-01-12'
  },
  {
    id: 'EQ-0702',
    company_name: '宗晟',
    contract_id: 'CT-ZS-2024-07',
    project_name: '宗晟桃園先進科技廠',
    system_type: '攝影機',
    device_name: '4K紅外線防暴半球型網路攝影機',
    model: 'Hikvision DS-2CD2186',
    quantity: 45,
    delivered_qty: 30,
    undelivered_qty: 15,
    unit: '支',
    delivery_status: '未交貨',
    delivery_date: '2025-09-15',
    remarks: '廠區外環15支預計Q3交貨',
    updated_at: '2025-01-12'
  },

  // 8. 和興
  {
    id: 'EQ-0801',
    company_name: '和興',
    contract_id: 'CT-HX-2024-08',
    project_name: '和興台南智能製造中心',
    system_type: '對講機',
    device_name: '防爆型工業對講通訊分機',
    model: 'J&R JR101-FK',
    quantity: 14,
    delivered_qty: 14,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2024-03-01',
    remarks: '高溫加工區通訊點交完畢',
    updated_at: '2025-01-18'
  },
  {
    id: 'EQ-0802',
    company_name: '和興',
    contract_id: 'CT-HX-2024-08',
    project_name: '和興台南智能製造中心',
    system_type: '電子鎖',
    device_name: '600磅雙門磁力鎖附訊號接點',
    model: 'Gianni EM-600',
    quantity: 24,
    delivered_qty: 12,
    undelivered_qty: 12,
    unit: '組',
    delivery_status: '未交貨',
    delivery_date: '2025-12-10',
    remarks: '倉庫重型防火門鎖待交貨',
    updated_at: '2025-01-18'
  },

  // 9. 宗科
  {
    id: 'EQ-0901',
    company_name: '宗科',
    contract_id: 'CT-ZK-2024-09',
    project_name: '宗科新竹AI實驗室',
    system_type: '攝影機',
    device_name: '4K紅外線防暴半球型網路攝影機',
    model: 'Hikvision DS-2CD2186',
    quantity: 35,
    delivered_qty: 35,
    undelivered_qty: 0,
    unit: '支',
    delivery_status: '已交貨',
    delivery_date: '2024-05-10',
    remarks: '全區高解析監控完成',
    updated_at: '2025-01-22'
  },

  // 10. 宗順
  {
    id: 'EQ-1001',
    company_name: '宗順',
    contract_id: 'CT-ZS-2023-10',
    project_name: '宗順新莊營運總部',
    system_type: '對講機',
    device_name: 'SIP高階視訊管理總機',
    model: 'Akuvox R29C',
    quantity: 6,
    delivered_qty: 6,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2024-01-10',
    remarks: '大廳總機已上線',
    updated_at: '2025-01-14'
  },

  // 11. 宗益
  {
    id: 'EQ-1101',
    company_name: '宗益',
    contract_id: 'CT-ZY-2024-11',
    project_name: '宗益彰化綠能園區',
    system_type: '攝影機',
    device_name: 'AI熱成像雙光譜周界球機',
    model: 'Hikvision DS-2TD4136',
    quantity: 12,
    delivered_qty: 12,
    undelivered_qty: 0,
    unit: '支',
    delivery_status: '已交貨',
    delivery_date: '2024-08-01',
    remarks: '周界熱顯像監控已驗收',
    updated_at: '2025-01-25'
  },

  // 12. 百成
  {
    id: 'EQ-1201',
    company_name: '百成',
    contract_id: 'CT-BC-2024-12',
    project_name: '百成中壢精機廠',
    system_type: '門禁系統',
    device_name: '快速伺服三叉閘門考勤通道',
    model: 'Kaba HSB-E02',
    quantity: 8,
    delivered_qty: 4,
    undelivered_qty: 4,
    unit: '道',
    delivery_status: '未交貨',
    delivery_date: '2025-11-15',
    remarks: '西門考勤閘門預計年底交貨',
    updated_at: '2025-01-20'
  },

  // 13. 宗麒
  {
    id: 'EQ-1301',
    company_name: '宗麒',
    contract_id: 'CT-ZQ-2024-13',
    project_name: '宗麒新店研發中心',
    system_type: '對講機',
    device_name: 'IP觸控式門口對講主機',
    model: 'Panasonic VL-V900',
    quantity: 5,
    delivered_qty: 5,
    undelivered_qty: 0,
    unit: '台',
    delivery_status: '已交貨',
    delivery_date: '2024-09-10',
    remarks: '已點交完畢',
    updated_at: '2025-01-30'
  },

  // 14. 廣晟
  {
    id: 'EQ-1401',
    company_name: '廣晟',
    contract_id: 'CT-GS-2023-14',
    project_name: '廣晟高雄智慧物流廠',
    system_type: '攝影機',
    device_name: '4K紅外線防暴半球型網路攝影機',
    model: 'Hikvision DS-2CD2186',
    quantity: 50,
    delivered_qty: 30,
    undelivered_qty: 20,
    unit: '支',
    delivery_status: '未交貨',
    delivery_date: '2026-02-28',
    remarks: '二期出貨碼頭攝影機待交貨',
    updated_at: '2025-01-18'
  },

  // 15. 宗榮
  {
    id: 'EQ-1501',
    company_name: '宗榮',
    contract_id: 'CT-ZR-2024-15',
    project_name: '宗榮南科精密園區',
    system_type: '電子鎖',
    device_name: '斷電開型微電腦靜音陽極鎖',
    model: 'Gianni EB-200',
    quantity: 30,
    delivered_qty: 30,
    undelivered_qty: 0,
    unit: '組',
    delivery_status: '已交貨',
    delivery_date: '2024-04-20',
    remarks: '無塵室各通道陽極鎖點交完成',
    updated_at: '2025-01-26'
  },

  // 16. 宗霖
  {
    id: 'EQ-1601',
    company_name: '宗霖',
    contract_id: 'CT-ZL-2024-16',
    project_name: '宗霖湖口工業園區',
    system_type: '門禁系統',
    device_name: '多頻雙模人臉/RFID門禁主機',
    model: 'Soyal AR-837-EA',
    quantity: 15,
    delivered_qty: 10,
    undelivered_qty: 5,
    unit: '組',
    delivery_status: '未交貨',
    delivery_date: '2025-10-10',
    remarks: '二期廠房5組待交貨',
    updated_at: '2025-01-28'
  }
];

class ApiService {
  constructor() {
    this.API_URL_KEY = 'equip_mgmt_gas_api_url_v6';
    this.DATA_STORAGE_KEY = 'equip_mgmt_local_equipment_v6';
    this.COMPANIES_KEY = 'equip_mgmt_local_companies_v6';
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
        const migrated = parsed.map(item => this.normalizeItem(item));
        localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(migrated));
      } catch (e) {
        localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_EQUIPMENT));
      }
    }

    if (!localStorage.getItem(this.COMPANIES_KEY)) {
      localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(INITIAL_MOCK_COMPANIES));
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
        '宗麒': '楊業務專員', '廣晟': '曾業務主任', '宗榮': '洪業務副理', '宗霖': '邱業務專員'
      };
      salesRep = defaultReps[item.company_name] || '業務專員';
    }

    return Object.assign({}, item, {
      id: item.id || ('EQ-' + Math.floor(1000 + Math.random() * 9000)),
      project_name: item.project_name || item.location || '新建案工程',
      sales_rep: salesRep,
      delivery_status: status,
      delivered_qty: d,
      undelivered_qty: u,
      quantity: q,
      unit: item.unit || '台',
      remarks: item.remarks || ''
    });
  }

  isLiveMode() {
    return !!this.apiUrl && this.apiUrl.startsWith('https://script.google.com/');
  }

  setApiUrl(url) {
    this.apiUrl = (url || '').trim();
    localStorage.setItem(this.API_URL_KEY, this.apiUrl);
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

    // 2. 直連 Google Apps Script Web App
    if (this.isLiveMode()) {
      try {
        console.log('📡 正在直連 Google Sheet 同步 16 家公司資料...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        const resp = await fetch(`${this.apiUrl}?action=getCompanies&_t=${Date.now()}`, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const res = await resp.json();
        if (res.success && Array.isArray(res.list) && res.list.length > 0) {
          console.log(`✅ 成功從 Google Sheet 取得 ${res.list.length} 家公司資料`);
          try {
            localStorage.setItem(this.COMPANIES_KEY, JSON.stringify(res.list));
          } catch (e) {}
          return res.list;
        }
      } catch (e) {
        console.warn('Live API error or timeout, falling back to local cache:', e);
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

    // 2. 直連 Google Apps Script Web App
    if (this.isLiveMode()) {
      try {
        console.log(`📡 正在直連 Google Sheet 同步設備清單 (公司: ${companyParam})...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        const resp = await fetch(`${this.apiUrl}?action=getEquipment&companies=${encodeURIComponent(companyParam)}&_t=${Date.now()}`, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const res = await resp.json();
        if (res.success && Array.isArray(res.list)) {
          console.log(`✅ 成功從 Google Sheet 取得 ${res.list.length} 筆設備資料`);
          const list = res.list.map(item => this.normalizeItem(item));
          if (isAll && list.length > 0) {
            try {
              localStorage.setItem(this.DATA_STORAGE_KEY, JSON.stringify(list));
            } catch (e) {}
          }
          return list;
        }
      } catch (e) {
        console.warn('Live API fetch failed or timeout, using local store:', e);
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

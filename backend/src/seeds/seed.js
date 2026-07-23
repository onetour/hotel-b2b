/**
 * 种子数据：24家酒店、97房型、30天价格（OTA价 + 直签价分离）
 */
const db = require('../db/connection');

const DAYS = 30;

function generateOrderNo() {
  return 'ORD' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function seed() {
  console.log('[Seed] 开始生成种子数据...');

  // 清空现有数据
  db.exec(`
    DELETE FROM ota_sync_log; DELETE FROM orders;
    DELETE FROM ota_prices; DELETE FROM direct_prices; DELETE FROM inventory;
    DELETE FROM room_types; DELETE FROM hotels; DELETE FROM users;
  `);

  // ==================== 用户 ====================
  const users = db.prepare(`INSERT INTO users (username, password, nickname, phone, role) VALUES (?,?,?,?,?)`);
  users.run('admin', 'admin123', '系统管理员', '13800000001', 'admin');
  users.run('zhang', 'staff123', '张经理', '13800000002', 'manager');
  users.run('li', 'staff123', '李主管', '13800000003', 'staff');
  users.run('wang', 'staff123', '王销售', '13800000004', 'staff');

  console.log('  ✓ 4个用户');

  // ==================== 酒店 ====================
  const hotelData = [
    {id:1,name:'Atlantis The Palm, Dubai',name_cn:'迪拜亚特兰蒂斯酒店',address:'Crescent Road, Palm Jumeirah, Dubai, UAE',address_cn:'阿联酋迪拜朱美拉棕榈岛新月路',phone:'+971-4-426-2000',description:'坐落于朱美拉棕榈岛，水世界冒险乐园和失落空间水族馆',description_en:'Set on Palm Jumeirah, home to Aquaventure Waterpark',star_rating:5,source:'direct'},
    {id:2,name:'Atlantis The Royal, Dubai',name_cn:'迪拜皇家亚特兰蒂斯酒店',address:'Crescent Road, Palm Jumeirah, Dubai, UAE',address_cn:'阿联酋迪拜朱美拉棕榈岛新月路',phone:'+971-4-426-3000',description:'超奢华度假酒店，悬浮空中泳池',description_en:'Ultra-luxury resort with sky pools',star_rating:5,source:'direct'},
    {id:3,name:'Emirates Palace Mandarin Oriental, Abu Dhabi',name_cn:'阿布扎比文华东方宫殿酒店',address:'West Corniche Road, Abu Dhabi, UAE',address_cn:'阿联酋阿布扎比西滨海大道',phone:'+971-2-690-9000',description:'金碧辉煌的宫殿酒店，私人白沙滩',description_en:'Gilded Arabian palace on private beach',star_rating:5,source:'direct'},
    {id:4,name:'Palazzo Versace Dubai',name_cn:'迪拜范思哲酒店',address:'Al Jaddaf Waterfront, Dubai, UAE',address_cn:'阿联酋迪拜阿尔加达夫水岸',phone:'+971-4-556-8888',description:'范思哲奢华设计，环礁湖泳池',description_en:'Versace luxury, lagoon pools',star_rating:5,source:'direct'},
    {id:5,name:'SLS Dubai Hotel & Residences',name_cn:'迪拜SLS酒店',address:'Marasi Drive, Business Bay, Dubai, UAE',address_cn:'阿联酋迪拜商业湾马拉西大道',phone:'+971-4-607-0700',description:'天际无边泳池，哈利法塔全景',description_en:'Infinity sky pool, Burj Khalifa views',star_rating:5,source:'direct'},
    {id:6,name:'Hilton Garden Inn Samarkand Afrosiyob',name_cn:'撒马尔罕希尔顿花园酒店(阿夫罗西约布)',address:'Konigil massif, Silk Road Complex, Samarkand',address_cn:'乌兹别克斯坦撒马尔罕 Silk Road 度假区',phone:'+998-55-704-0707',description:'携程4.6分，希尔顿花园品牌',description_en:'Ctrip 4.6, Hilton Garden Inn',star_rating:4,source:'direct'},
    {id:7,name:'Hilton Garden Inn Samarkand Sogd',name_cn:'撒马尔罕希尔顿花园酒店(索格德)',address:'Grebnoy Kanal, Samarkand, 140319',address_cn:'乌兹别克斯坦撒马尔罕 Grebnoy Kanal',phone:'+998-55-705-5555',description:'希尔顿花园品牌',description_en:'Hilton Garden Inn brand',star_rating:4,source:'direct'},
    {id:8,name:'Wellness Park Hotel Bactria',name_cn:'巴克特里亚健康公园酒店',address:'Rowing Canal, Konigil, Samarkand',address_cn:'乌兹别克斯坦撒马尔罕 Konigil 区',phone:'+998-55-705-5555',description:'脊柱与关节康养中心，92间',description_en:'Spine wellness center, 92 rooms',star_rating:4,source:'direct'},
    {id:9,name:'Wellness Park Hotel Turon',name_cn:'图隆健康公园酒店',address:'Konigil, Silk Road Complex, Samarkand',address_cn:'乌兹别克斯坦撒马尔罕 Silk Road 度假区',phone:'+998-55-705-5555',description:'肺病学康养中心，98间',description_en:'Pulmonology wellness, 98 rooms',star_rating:4,source:'direct'},
    {id:10,name:'Savitsky Plaza',name_cn:'萨维茨基广场酒店',address:'Samarqand Region, Samarkand',address_cn:'乌兹别克斯坦撒马尔罕',phone:'',description:'2024年开业，323间五星级',description_en:'2024 opened, 323 rooms',star_rating:5,source:'direct'},
    {id:11,name:'Lia! by Minyoun Stars of Ulugbek',name_cn:'乌鲁伯之星明宇丽雅酒店',address:'Konigil massivi street, Samarkand',address_cn:'乌兹别克斯坦撒马尔罕 Konigil 区',phone:'',description:'明宇商旅管理',description_en:'Minyoun Hospitality',star_rating:4,source:'direct'},
    {id:12,name:'Silk Road by Minyoun Samarkand Hotel',name_cn:'丝路明宇豪雅酒店',address:'Rowing channel, Konigil massif, Samarkand',address_cn:'乌兹别克斯坦撒马尔罕 Konigil 区',phone:'',description:'明宇商旅五星级豪华',description_en:'Minyoun 5-star luxury',star_rating:5,source:'direct'},
    {id:13,name:'Hilton Samarkand Regency',name_cn:'撒马尔罕希尔顿丽晶酒店',address:'Konigil Massif, Silk Road Complex, Samarkand',address_cn:'乌兹别克斯坦撒马尔罕 Silk Road 度假区',phone:'',description:'希尔顿Regency五星级',description_en:'Hilton Regency 5-star',star_rating:5,source:'direct'},
    {id:14,name:'Rixos Tersane Istanbul',name_cn:'伊斯坦布尔里克萨斯德沙那酒店',address:'No 23/1 Beyoglu, Istanbul, Turkey',address_cn:'土耳其伊斯坦布尔贝伊奥卢区金角湾畔',phone:'+90-212-377-5800',description:'前奥斯曼造船厂，工业遗产+现代奢华',description_en:'Former Ottoman shipyard',star_rating:5,source:'direct'},
    {id:15,name:'Rixos Pera Istanbul',name_cn:'佩拉伊斯坦布尔里克索斯酒店',address:'Mesrutiyet Caddesi, Tepebasi, Beyoglu, Istanbul',address_cn:'土耳其伊斯坦布尔贝伊奥卢区佩拉',phone:'+90-212-377-5800',description:'步行可达加拉达塔与独立大街',description_en:'Walking to Galata Tower',star_rating:5,source:'direct'},
    {id:16,name:'Fairmont Mara Safari Club',name_cn:'费尔蒙马赛马拉游猎俱乐部',address:'Masai Mara, Kenya',address_cn:'肯尼亚马赛马拉国家保护区',phone:'+254-711-081000',description:'全包式野奢帐篷，每日两次游猎',description_en:'All-inclusive tented camp',star_rating:5,source:'direct'},
    {id:17,name:'Fairmont The Norfolk, Nairobi',name_cn:'费尔蒙诺福克酒店(内罗毕)',address:'Harry Thuku Road, Nairobi, Kenya',address_cn:'肯尼亚内罗毕哈里苏库路',phone:'+254-711-081000',description:'内罗毕百年历史地标',description_en:"Nairobi's centennial landmark",star_rating:5,source:'direct'},
    {id:18,name:'Fairmont Mount Kenya Safari Club',name_cn:'费尔蒙肯尼亚山游猎俱乐部',address:'Mount Kenya, Nanyuki, Kenya',address_cn:'肯尼亚纳纽基肯尼亚山麓',phone:'+254-111-135-600',description:'肯尼亚山麓传奇庄园',description_en:'Legendary estate at Mount Kenya',star_rating:5,source:'direct'},
    {id:19,name:"LUX* Saint Gilles, Reunion Island",name_cn:'LUX*圣吉尔酒店(留尼汪岛)',address:"L'Hermitage, Saint-Gilles-les-Bains, Reunion Island",address_cn:'留尼汪岛圣吉尔莱班',phone:'+262-262-700-000',description:'克里奥尔风情海滨度假村',description_en:'Creole beachfront resort',star_rating:5,source:'direct'},
    {id:20,name:'Hotel Le Recif, Reunion Island',name_cn:'留尼汪礁石酒店',address:'Saint-Gilles-les-Bains, Reunion Island',address_cn:'留尼汪岛圣吉尔莱班',phone:'+262-262-700-000',description:'克里奥尔建筑，家庭度假首选',description_en:'Creole architecture, family',star_rating:4,source:'direct'},
    {id:21,name:'The Biltmore Tbilisi Hotel',name_cn:'第比利斯比特摩尔酒店',address:'29 Rustaveli Avenue, Tbilisi, Georgia',address_cn:'格鲁吉亚第比利斯鲁斯塔维利大街29号',phone:'+995-32-272-7200',description:'俯瞰城市全景',description_en:'Panoramic city views',star_rating:5,source:'direct'},
    {id:22,name:'Serengeti Ark Safari Lodge',name_cn:'塞伦盖蒂方舟游猎酒店',address:'Kogatende, Serengeti, Tanzania',address_cn:'坦桑尼亚塞伦盖蒂 Kogatende',phone:'+255 761 300 111',description:'塞伦盖蒂北部迁徙路线，18间木屋',description_en:'Northern migration route',star_rating:5,source:'direct'},
    {id:23,name:'Lake Duluti Lodge',name_cn:'杜鲁提湖酒店',address:'P.O. Box 12061, Arusha, Tanzania',address_cn:'坦桑尼亚阿鲁沙',phone:'+255 769 356 504',description:'杜鲁提湖畔精品lodge',description_en:'Boutique lodge by Lake Duluti',star_rating:4,source:'direct'},
    {id:24,name:'Luwela Camp by Lake Duluti Lodge',name_cn:'卢韦拉营地',address:'Serengeti, Tanzania',address_cn:'坦桑尼亚塞伦盖蒂',phone:'+255 769 356 504',description:'杜鲁提湖酒店旗下帐篷营地',description_en:'Tented camp in Serengeti',star_rating:4,source:'direct'},
  ];

  const insertHotel = db.prepare(`INSERT INTO hotels (id,name,name_cn,address,address_cn,phone,description,description_en,star_rating,source) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const h of hotelData) {
    insertHotel.run(h.id, h.name, h.name_cn, h.address, h.address_cn, h.phone, h.description, h.description_en, h.star_rating, h.source);
  }
  console.log('  ✓ 24家直签酒店');

  // ==================== 房型（97个） ====================
  const roomsDef = [
    {id:1,hotel_id:1,name:'Ocean Deluxe Room',name_cn:'海景豪华房',bed:'大床2.0m/双床1.5m',area:'47m²',guests:2,meal:'含早餐',base_price:1400,cap:60},
    {id:2,hotel_id:1,name:'Imperial Club Room',name_cn:'帝国俱乐部房',bed:'大床2.0m',area:'55m²',guests:2,meal:'含早餐+行政酒廊',base_price:2000,cap:40},
    {id:3,hotel_id:1,name:'Underwater Suite',name_cn:'水下套房',bed:'大床2.2m',area:'165m²',guests:3,meal:'含全食宿',base_price:5500,cap:6},
    {id:4,hotel_id:2,name:'Seascape Room',name_cn:'海景客房',bed:'大床2.0m',area:'55m²',guests:2,meal:'含早餐',base_price:1800,cap:50},
    {id:5,hotel_id:2,name:'Royal Club Room',name_cn:'皇家俱乐部客房',bed:'大床2.0m',area:'57m²',guests:2,meal:'含早餐+行政酒廊',base_price:2500,cap:30},
    {id:6,hotel_id:2,name:'Sky Pool Suite',name_cn:'天际泳池套房',bed:'大床2.0m',area:'120m²',guests:3,meal:'含全食宿+管家',base_price:6500,cap:8},
    {id:7,hotel_id:3,name:'Deluxe City View',name_cn:'豪华城景房',bed:'大床2.0m/双床1.5m',area:'55m²',guests:2,meal:'含早餐',base_price:1972,cap:50},
    {id:8,hotel_id:3,name:'Deluxe Garden View',name_cn:'豪华园景房',bed:'大床2.0m/双床1.5m',area:'55m²',guests:2,meal:'含早餐',base_price:2056,cap:50},
    {id:9,hotel_id:3,name:'Deluxe Garden Terrace',name_cn:'豪华花园露台房',bed:'大床2.0m/双床1.5m',area:'55m²',guests:2,meal:'含早餐',base_price:2278,cap:50},
    {id:10,hotel_id:3,name:'Deluxe Sea View',name_cn:'豪华海景房',bed:'大床2.0m/双床1.5m',area:'55m²',guests:2,meal:'含早餐',base_price:2222,cap:50},
    {id:11,hotel_id:3,name:'Club Sea View Room',name_cn:'俱乐部海景房',bed:'大床2.0m/双床1.5m',area:'55m²',guests:2,meal:'含早餐+俱乐部酒廊',base_price:2794,cap:30},
    {id:12,hotel_id:3,name:'Sea View Suite',name_cn:'海景套房',bed:'大床2.0m',area:'110m²',guests:3,meal:'含早餐+行政酒廊',base_price:5122,cap:20},
    {id:13,hotel_id:3,name:'Panoramic Sea View Suite',name_cn:'全景海景套房',bed:'大床2.0m',area:'165m²',guests:3,meal:'含早餐+行政酒廊',base_price:5624,cap:10},
    {id:14,hotel_id:3,name:'1 Bedroom Palace Suite',name_cn:'单卧室宫殿套房',bed:'大床2.0m',area:'110m²',guests:3,meal:'含早餐+行政酒廊+接送',base_price:6804,cap:8},
    {id:15,hotel_id:3,name:'2 Bedroom Palace Suite',name_cn:'双卧室宫殿套房',bed:'大床2.0m×2',area:'330m²',guests:4,meal:'含全食宿+管家+接送',base_price:12792,cap:5},
    {id:16,hotel_id:3,name:'3 Bedroom Palace Suite',name_cn:'三卧室宫殿套房',bed:'大床2.0m×3',area:'470m²',guests:6,meal:'含全食宿+管家+接送',base_price:18690,cap:3},
    {id:17,hotel_id:4,name:'Deluxe Versace Room',name_cn:'范思哲豪华城景房',bed:'大床2.0m/双床1.5m',area:'50m²',guests:2,meal:'含早餐',base_price:1200,cap:55},
    {id:18,hotel_id:4,name:'Grand Suite',name_cn:'尊贵套房',bed:'大床2.0m',area:'130m²',guests:3,meal:'含早餐+行政酒廊',base_price:2200,cap:18},
    {id:19,hotel_id:4,name:'Signature Suite',name_cn:'范思哲招牌套房',bed:'大床2.2m',area:'214m²',guests:4,meal:'含全食宿+管家',base_price:4500,cap:5},
    {id:20,hotel_id:5,name:'Signature King Room',name_cn:'哈利法塔景观房',bed:'大床2.0m',area:'46m²',guests:2,meal:'含早餐',base_price:1100,cap:45},
    {id:21,hotel_id:5,name:'Sky Premium Room',name_cn:'天际尊贵阳台房',bed:'大床2.0m',area:'67m²',guests:2,meal:'含早餐+行政礼遇',base_price:1600,cap:25},
    {id:22,hotel_id:5,name:'Vanilla Sky Suite',name_cn:'香草天空套房',bed:'大床2.0m',area:'102m²',guests:3,meal:'含早餐+行政酒廊',base_price:2600,cap:10},
    // 撒马尔罕酒店 6-13（团房，5间起订）
    ...[6,7,8,9,10,11,12,13].flatMap((hid, idx) => [
      {id:23+(hid-6)*2,hotel_id:hid,name:'Standard Single',name_cn:'标准单人间',bed:'大床/单床',area:'28m²',guests:1,meal:'含早餐',base_price:287+hid*0,cap:10+((hid===10||hid===12)?0:0)*10,min_rooms:5},
      {id:24+(hid-6)*2,hotel_id:hid,name:'Standard Double',name_cn:'标准双人间',bed:'大床/双床',area:'32m²',guests:2,meal:'含早餐',base_price:343+hid*0,cap:10,min_rooms:5},
    ]),
    // Rixos Istanbul (14-15)
    {id:39,hotel_id:14,name:'Premium Room',name_cn:'高级房',bed:'大床2.0m/双床1.5m',area:'32m²',guests:2,meal:'含早餐',base_price:0,cap:50},
    {id:40,hotel_id:14,name:'Premium Partial Sea',name_cn:'高级半海景房',bed:'大床2.0m/双床1.5m',area:'35m²',guests:2,meal:'含早餐',base_price:0,cap:40},
    {id:41,hotel_id:14,name:'Premium Sea',name_cn:'高级海景房',bed:'大床2.0m',area:'38m²',guests:2,meal:'含早餐',base_price:0,cap:30},
    {id:42,hotel_id:14,name:'Two Bedroom Family Premium',name_cn:'双卧家庭高级房',bed:'大床2.0m×2',area:'65m²',guests:4,meal:'含早餐',base_price:0,cap:8},
    {id:43,hotel_id:14,name:'Two Bedroom Family Partial Sea',name_cn:'双卧家庭半海景房',bed:'大床2.0m×2',area:'70m²',guests:4,meal:'含早餐',base_price:0,cap:6},
    {id:44,hotel_id:15,name:'Deluxe Room Pera View',name_cn:'豪华佩拉景观房',bed:'大床2.0m/双床1.5m',area:'28-35m²',guests:2,meal:'含早餐',base_price:0,cap:50},
    {id:45,hotel_id:15,name:'Premium Room Golden Horn View',name_cn:'高级金角湾景观房',bed:'大床2.0m/双床1.5m',area:'28-35m²',guests:2,meal:'含早餐',base_price:0,cap:40},
    {id:46,hotel_id:15,name:'Junior Suite Pera View',name_cn:'小套房佩拉景观',bed:'大床2.0m',area:'50m²',guests:3,meal:'含早餐',base_price:0,cap:8},
    // 肯尼亚+留尼汪 (16-20)
    {id:47,hotel_id:16,name:'Riverfront Tent',name_cn:'河畔豪华帐篷',bed:'1 Queen',area:'44 sq.m',guests:2,meal:'含全膳',base_price:0,cap:25},
    {id:48,hotel_id:16,name:'Deluxe River Tent',name_cn:'豪华河景帐篷',bed:'1 Queen/2 Twin',area:'30 sq.m',guests:3,meal:'含全膳',base_price:0,cap:15},
    {id:49,hotel_id:16,name:'Luxury Tent (2025)',name_cn:'尊享豪华帐篷',bed:'1 Queen',area:'TBA',guests:3,meal:'含全膳',base_price:0,cap:6},
    {id:50,hotel_id:17,name:'Fairmont Deluxe Verandah',name_cn:'费尔蒙豪华阳台房',bed:'1 Queen',area:'30 sq.m',guests:2,meal:'含早餐',base_price:0,cap:60},
    {id:51,hotel_id:17,name:'Fairmont Deluxe Courtyard',name_cn:'费尔蒙豪华庭院房',bed:'1 King/2 Twin',area:'35 sq.m',guests:3,meal:'含早餐',base_price:0,cap:50},
    {id:52,hotel_id:17,name:'Deluxe Junior Suite',name_cn:'豪华小套房',bed:'1 Queen',area:'35 sq.m',guests:2,meal:'含早餐',base_price:0,cap:30},
    {id:53,hotel_id:17,name:'Deluxe Queen Suite',name_cn:'豪华皇后套房',bed:'1 Queen',area:'35 sq.m',guests:3,meal:'含早餐',base_price:0,cap:20},
    {id:54,hotel_id:17,name:'Signature Junior Suite',name_cn:'尊贵小套房',bed:'1 King',area:'40 sq.m',guests:2,meal:'含早餐',base_price:0,cap:12},
    {id:55,hotel_id:17,name:'1937 Deluxe King Suite',name_cn:'1937豪华国王套房',bed:'1 King',area:'59 sq.m',guests:2,meal:'含早餐',base_price:0,cap:6},
    {id:56,hotel_id:17,name:'Karura Junior Queen Suite',name_cn:'卡鲁拉皇后小套房',bed:'1 Queen',area:'65 sq.m',guests:3,meal:'含早餐',base_price:0,cap:4},
    {id:57,hotel_id:17,name:'Presidential Junior Suite',name_cn:'总统级小套房',bed:'1 Queen',area:'79 sq.m',guests:2,meal:'含早餐',base_price:0,cap:2},
    {id:58,hotel_id:18,name:'Fairmont/Riverside Deluxe',name_cn:'费尔蒙河畔豪华房',bed:'1 King/2 Twin',area:'N/A',guests:2,meal:'含全膳',base_price:0,cap:45},
    {id:59,hotel_id:18,name:'Fairmont Suite',name_cn:'费尔蒙套房',bed:'1 King',area:'N/A',guests:2,meal:'含全膳',base_price:0,cap:25},
    {id:60,hotel_id:18,name:'Riverside Suite',name_cn:'河畔套房',bed:'1 King',area:'N/A',guests:2,meal:'含全膳',base_price:0,cap:15},
    {id:61,hotel_id:18,name:'Garden Suite',name_cn:'花园套房',bed:'1 King',area:'N/A',guests:2,meal:'含全膳',base_price:0,cap:15},
    {id:62,hotel_id:18,name:'Manor Junior Suite',name_cn:'庄园小套房',bed:'1 King',area:'N/A',guests:2,meal:'含全膳',base_price:0,cap:10},
    {id:63,hotel_id:18,name:'Manor Equatorial Suite',name_cn:'庄园赤道套房',bed:'1 King',area:'N/A',guests:2,meal:'含全膳',base_price:0,cap:6},
    {id:64,hotel_id:18,name:'William Holden Two-Bedroom',name_cn:'威廉霍尔顿双卧套房',bed:'1 King+1 King',area:'N/A',guests:4,meal:'含全膳',base_price:0,cap:3},
    {id:65,hotel_id:18,name:'Batian & Sendeo Villa',name_cn:'巴蒂安&森代奥别墅',bed:'1 King+1 King',area:'N/A',guests:4,meal:'含全膳',base_price:0,cap:2},
    {id:66,hotel_id:19,name:'Superior Room',name_cn:'高级客房',bed:'1 King/2 Twin',area:'N/A',guests:3,meal:'含早餐',base_price:0,cap:55},
    {id:67,hotel_id:19,name:'Deluxe Room',name_cn:'豪华客房',bed:'1 King',area:'N/A',guests:3,meal:'含早餐',base_price:0,cap:40},
    {id:68,hotel_id:19,name:'Family Suite',name_cn:'家庭套房',bed:'2 King',area:'N/A',guests:6,meal:'含早餐',base_price:0,cap:12},
    {id:69,hotel_id:20,name:'Standard Room',name_cn:'标准客房',bed:'1 King/2 Twin',area:'N/A',guests:3,meal:'含早餐',base_price:0,cap:45},
    {id:70,hotel_id:20,name:'Superior Room',name_cn:'高级客房',bed:'1 King/2 Twin',area:'N/A',guests:3,meal:'含早餐',base_price:0,cap:35},
    {id:71,hotel_id:20,name:'Standard Family Room',name_cn:'标准家庭房',bed:'2 King',area:'N/A',guests:6,meal:'含早餐',base_price:0,cap:12},
    {id:72,hotel_id:20,name:'Superior Family Room',name_cn:'高级家庭房',bed:'2 King',area:'N/A',guests:6,meal:'含早餐',base_price:0,cap:8},
    // 第比利斯 (21)
    {id:73,hotel_id:21,name:'Deluxe King',name_cn:'豪华大床房',bed:'1 King',area:'N/A',guests:2,meal:'含早餐',base_price:0,cap:10},
    {id:74,hotel_id:21,name:'Deluxe Club King',name_cn:'豪华俱乐部大床房',bed:'1 King',area:'N/A',guests:2,meal:'含早餐+Club',base_price:0,cap:8},
    {id:75,hotel_id:21,name:'Deluxe Twin',name_cn:'豪华双床房',bed:'2 Twin',area:'N/A',guests:2,meal:'含早餐',base_price:0,cap:10},
    {id:76,hotel_id:21,name:'Deluxe Club Twin',name_cn:'豪华俱乐部双床房',bed:'2 Twin',area:'N/A',guests:2,meal:'含早餐+Club',base_price:0,cap:8},
    {id:77,hotel_id:21,name:'Premium King',name_cn:'尊贵大床房',bed:'1 King',area:'N/A',guests:2,meal:'含早餐',base_price:0,cap:6},
    {id:78,hotel_id:21,name:'Premium Club King',name_cn:'尊贵俱乐部大床房',bed:'1 King',area:'N/A',guests:2,meal:'含早餐+Club',base_price:0,cap:5},
    {id:79,hotel_id:21,name:'Junior Suite',name_cn:'小套房',bed:'1 King',area:'N/A',guests:3,meal:'含早餐',base_price:0,cap:5},
    {id:80,hotel_id:21,name:'Junior Suite Club',name_cn:'俱乐部小套房',bed:'1 King',area:'N/A',guests:3,meal:'含早餐+Club',base_price:0,cap:4},
    {id:81,hotel_id:21,name:'Executive Suite',name_cn:'行政套房',bed:'1 King',area:'N/A',guests:2,meal:'含早餐',base_price:0,cap:3},
    {id:82,hotel_id:21,name:'Royal Suite',name_cn:'皇家套房',bed:'1 King',area:'N/A',guests:2,meal:'含早餐',base_price:0,cap:2},
    // 塞伦盖蒂集团 (22-24)
    {id:83,hotel_id:22,key:'ark_fb_single',name:'Expedition Cottage FB Single',name_cn:'探险木屋-全膳单人',bed:'大床/双床',area:'35m²',guests:1,meal:'含全膳',base_price:0,cap:8},
    {id:84,hotel_id:22,key:'ark_fb_double',name:'Expedition Cottage FB Double',name_cn:'探险木屋-全膳双人',bed:'大床/双床',area:'35m²',guests:2,meal:'含全膳',base_price:0,cap:12},
    {id:85,hotel_id:22,key:'ark_fb_triple',name:'Expedition Cottage FB Triple',name_cn:'探险木屋-全膳三人',bed:'大床+双床',area:'50m²',guests:3,meal:'含全膳',base_price:0,cap:4},
    {id:86,hotel_id:22,key:'ark_ai_single',name:'Expedition Cottage AI Single',name_cn:'探险木屋-一价全包单人',bed:'大床/双床',area:'35m²',guests:1,meal:'一价全包',base_price:0,cap:8},
    {id:87,hotel_id:22,key:'ark_ai_double',name:'Expedition Cottage AI Double',name_cn:'探险木屋-一价全包双人',bed:'大床/双床',area:'35m²',guests:2,meal:'一价全包',base_price:0,cap:12},
    {id:88,hotel_id:22,key:'ark_ai_triple',name:'Expedition Cottage AI Triple',name_cn:'探险木屋-一价全包三人',bed:'大床+双床',area:'50m²',guests:3,meal:'一价全包',base_price:0,cap:4},
    {id:89,hotel_id:22,key:'ark_gp_single',name:'Expedition Cottage GP Single',name_cn:'探险木屋-游猎套餐单人',bed:'大床/双床',area:'35m²',guests:1,meal:'游猎套餐',base_price:0,cap:8},
    {id:90,hotel_id:22,key:'ark_gp_double',name:'Expedition Cottage GP Double',name_cn:'探险木屋-游猎套餐双人',bed:'大床/双床',area:'35m²',guests:2,meal:'游猎套餐',base_price:0,cap:12},
    {id:91,hotel_id:22,key:'ark_gp_triple',name:'Expedition Cottage GP Triple',name_cn:'探险木屋-游猎套餐三人',bed:'大床+双床',area:'50m²',guests:3,meal:'游猎套餐',base_price:0,cap:4},
    {id:92,hotel_id:22,key:'ark_family',name:'Family Cottage GP',name_cn:'家庭木屋-游猎套餐',bed:'1大床+1双床',area:'70m²',guests:4,meal:'游猎套餐',base_price:0,cap:2},
    {id:93,hotel_id:23,key:'ldl_single',name:'Single Room',name_cn:'单人房',bed:'大床',area:'30m²',guests:1,meal:'含早餐',base_price:0,cap:4},
    {id:94,hotel_id:23,key:'ldl_double',name:'Double Room',name_cn:'双人房',bed:'大床/双床',area:'35m²',guests:2,meal:'含早餐',base_price:0,cap:10},
    {id:95,hotel_id:23,key:'ldl_family',name:'Family Unit',name_cn:'家庭单元',bed:'大床+双床',area:'60m²',guests:4,meal:'含早餐',base_price:0,cap:3},
    {id:96,hotel_id:24,key:'luwela_single',name:'Single Tent',name_cn:'单人帐篷',bed:'大床',area:'25m²',guests:1,meal:'含全膳',base_price:0,cap:4},
    {id:97,hotel_id:24,key:'luwela_double',name:'Double Tent',name_cn:'双人帐篷',bed:'大床/双床',area:'30m²',guests:2,meal:'含全膳',base_price:0,cap:8},
  ];

  const insertRoom = db.prepare(`INSERT INTO room_types (id,hotel_id,name,name_cn,bed_type,area,max_guests,meal_plan,min_rooms) VALUES (?,?,?,?,?,?,?,?,?)`);
  for (const r of roomsDef) {
    const minRooms = r.min_rooms || 1;
    insertRoom.run(r.id, r.hotel_id, r.name, r.name_cn, r.bed, r.area, r.guests, r.meal, minRooms);
  }
  console.log('  ✓ 97个房型');

  // ==================== 价格 + 库存 生成 ====================
  // 撒马尔罕季节系数
  function samarkandSeason(ds) {
    const d = new Date(ds+'T00:00:00'), m = d.getMonth()+1, day = d.getDate();
    if ((m===1&&day>=5)||m===2||(m===3&&day<=20)) return 'low';
    if ((m===11&&day>=16)||(m===12&&day<=29)) return 'low';
    if (m===7||(m===8&&day<=20)) return 'summer';
    if ((m===3&&day>=21)||m===6) return 'mid';
    return 'high';
  }
  const seasonMult = {
    23:{low:1,summer:50/41,mid:59/41,high:82/41},
    24:{low:1,summer:58/49,mid:67/49,high:90/49},
    25:{low:1,summer:50/41,mid:59/41,high:82/41},
    26:{low:1,summer:58/49,mid:67/49,high:90/49},
    27:{low:1,summer:50/41,mid:59/41,high:82/41},
    28:{low:1,summer:58/49,mid:67/49,high:90/49},
    29:{low:1,summer:50/41,mid:59/41,high:82/41},
    30:{low:1,summer:58/49,mid:67/49,high:90/49},
    31:{low:1,summer:60/50,mid:70/50,high:94/50},
    32:{low:1,summer:70/60,mid:80/60,high:104/60},
    33:{low:1,summer:60/50,mid:70/50,high:89/50},
    34:{low:1,summer:70/60,mid:80/60,high:99/60},
    35:{low:1,summer:92/76,mid:108/76,high:124/76},
    36:{low:1,summer:105/89,mid:121/89,high:137/89},
    37:{low:1,summer:101/84,mid:119/84,high:137/84},
    38:{low:1,summer:115/98,mid:133/98,high:151/98}
  };

  // 伊斯坦布尔价格
  function istanbulPrice(roomId, ds) {
    const d=new Date(ds+'T00:00:00'),m=d.getMonth()+1,day=d.getDate();
    if(roomId>=39&&roomId<=43){
      const summer=(m===5)||(m>=6&&m<=9)||(m===10);
      const eur={39:{s:340,w:290},40:{s:365,w:315},41:{s:440,w:390},42:{s:660,w:570},43:{s:720,w:610}};
      return Math.round((summer?eur[roomId].s:eur[roomId].w)*8);
    }
    if(roomId>=44&&roomId<=46){
      let p; const cur=m*100+day;
      if(cur>=219&&cur<=319)p=0; else if(cur>=320&&cur<=430)p=1; else if(cur>=501&&cur<=530)p=2;
      else if(cur>=531&&cur<=831)p=3; else if(cur>=901&&cur<=1031)p=4;
      else if(cur>=1101&&cur<=1228)p=5; else if(cur>=1229||cur<=102)p=6; else return 0;
      const eur={44:[145,180,200,210,200,180,260],45:[170,205,225,235,225,205,285],46:[210,245,265,275,265,245,325]};
      return Math.round(eur[roomId][p]*8);
    }
    return 0;
  }

  // 肯尼亚+留尼汪价格
  function kenyaReunionPrice(roomId, ds) {
    const d=new Date(ds+'T00:00:00'),m=d.getMonth()+1,day=d.getDate(),cur=m*100+day;
    const U=7, Mk=1.15;
    function bt(s,e){return s<=e?cur>=s&&cur<=e:cur>=s||cur<=e;}
    if(roomId>=47&&roomId<=49){
      const p={47:{L:957,M:1143,H:1328},48:{L:1107,M:1293,H:1478},49:{L:1743,M:1918,H:2093}}[roomId];
      let s; if(bt(716,930)||bt(1222,101)||bt(701,930)||bt(1222,1231))s='H';
      else if(bt(1001,1031)||bt(1201,1221)||bt(102,228)||bt(601,630))s='M'; else s='L';
      return Math.round(p[s]*U);
    }
    if(roomId>=50&&roomId<=57){
      const p={50:{R:242,P:272},51:{R:262,P:292},52:{R:282,P:312},53:{R:322,P:352},54:{R:492,P:522},55:{R:742,P:772},56:{R:942,P:972},57:{R:1247,P:1277}}[roomId];
      const s=bt(716,915)||bt(616,915)?'P':'R';
      return Math.round(p[s]*U);
    }
    if(roomId>=58&&roomId<=65){
      const p={58:{R:560,S:670,P:865},59:{R:710,S:820,P:1015},60:{R:860,S:970,P:1165},61:{R:860,S:970,P:1165},62:{R:960,S:1070,P:1265},63:{R:1060,S:1170,P:1365},64:{R:1460,S:1570,P:1765},65:{R:1560,S:1670,P:1865}}[roomId];
      let s; if(bt(716,903)||bt(1219,105)||bt(403,406)||bt(701,903)||bt(1219,1231))s='P';
      else if(bt(904,917)||bt(614,630))s='S'; else s='R';
      return Math.round(p[s]*U);
    }
    function rnSeason(){
      if(bt(1101,1130))return'High'; if(bt(1201,1222))return'Low2';
      if(bt(1223,104))return'Peak'; if(bt(105,430)||bt(501,531))return'Shoulder';
      if(bt(601,709)||bt(710,930))return'Low'; if(bt(1001,1031))return'Low2'; return'Low';
    }
    if(roomId>=66&&roomId<=68){
      const s=rnSeason();
      const p={66:{Low:220,Shoulder:254,Low2:300,High:460,Peak:668},67:{Low:254,Shoulder:288,Low2:346,High:506,Peak:726},68:{Low:508,Shoulder:576,Low2:692,High:1012,Peak:1452}}[roomId];
      return Math.round(p[s]*U);
    }
    if(roomId>=69&&roomId<=72){
      const s=rnSeason();
      const p={69:{Low:150,Shoulder:178,Low2:212,High:286,Peak:300},70:{Low:174,Shoulder:202,Low2:248,High:320,Peak:346},71:{Low:311,Shoulder:366,Low2:435,High:582,Peak:610},72:{Low:357,Shoulder:412,Low2:504,High:651,Peak:702}}[roomId];
      return Math.round(p[s]*U);
    }
    return 0;
  }

  // 塞伦盖蒂价格
  function serengetiPrice(r, ds) {
    const d=new Date(ds+'T00:00:00'),m=d.getMonth()+1,day=d.getDate();
    const U=7;
    function ss(lo,hi){return lo<=hi?m>=lo&&m<=hi:m>=lo||m<=hi;}
    if(r.hotel_id===22){
      let s='low';
      if(ss(7,8)||(m===10&&day<=10))s='peak'; else if(ss(6,6)||ss(9,9)||(m===10&&day>=11))s='high';
      const map={
        'ark_fb_single':{peak:720,high:570,low:500},'ark_fb_double':{peak:480,high:380,low:335},
        'ark_fb_triple':{peak:335,high:265,low:235},'ark_ai_single':{peak:770,high:620,low:550},
        'ark_ai_double':{peak:530,high:430,low:385},'ark_ai_triple':{peak:385,high:315,low:285},
        'ark_gp_single':{peak:970,high:770,low:700},'ark_gp_double':{peak:680,high:580,low:535},
        'ark_gp_triple':{peak:535,high:465,low:435},'ark_family':{peak:680,high:580,low:535}
      };
      return Math.round(map[r.key][s]*U);
    }
    if(r.hotel_id===23||r.hotel_id===24){
      let s='low';
      if((m>=1&&m<=3)||(m>=6&&m<=10)||(m===12&&day>=16))s='high';
      if(r.hotel_id===23){
        const map={'ldl_single':{high:248,low:215},'ldl_double':{high:332,low:297},'ldl_family':{high:830,low:743}};
        return Math.round(map[r.key][s]*U);
      }
      if(r.hotel_id===24){
        const map={'luwela_single':{high:325,low:260},'luwela_double':{high:500,low:400}};
        return Math.round(map[r.key][s]*U);
      }
    }
    return 0;
  }

  // 第比利斯价格
  const tbilisiAvail = {73:[715,716,717,801,813],74:[715,716,717,801,802,803,812,813,814,815],75:[716,717,801,812],76:[716,717,801,802,803,812,813,814,815],77:[715,716,717,801,802,803],78:[715,716,717,801,802,803],79:[801,802,803],80:[801,802,803],81:[715,716,717],82:[727,728]};
  const tbilisiRates = {73:{s:140,d:150},74:{s:160,d:170},75:{s:140,d:150},76:{s:160,d:170},77:{s:175,d:185},78:{s:195,d:205},79:{s:210,d:220},80:{s:230,d:240},81:{s:280,d:290},82:{s:400,d:410}};

  function tbilisiPrice(roomId, ds) {
    const dates=tbilisiAvail[roomId]; if(!dates)return 0;
    const d=new Date(ds+'T00:00:00'),key=d.getMonth()*100+d.getDate()+100; // month is 0-indexed
    const adjKey = (d.getMonth()+1)*100+d.getDate();
    if(!dates.includes(adjKey))return 0;
    const rate=tbilisiRates[roomId]; if(!rate)return 0;
    return Math.round(rate.s*7*1.18);
  }

  // 批量插入（单层事务，sql.js 不支持嵌套事务）
  const insertDP = db.prepare(`INSERT OR IGNORE INTO direct_prices (room_type_id, date, contract_price, sales_price) VALUES (?,?,?,?)`);
  const insertOP = db.prepare(`INSERT OR IGNORE INTO ota_prices (room_type_id, date, ota_price, ota_source, available_rooms) VALUES (?,?,?,?,?)`);
  const insertInv = db.prepare(`INSERT OR IGNORE INTO inventory (room_type_id, date, total_rooms, booked_rooms, status) VALUES (?,?,?,?,?)`);

  const seedTransaction = db.transaction(() => {
    for (let day=0; day<DAYS; day++) {
      const dt=new Date(); dt.setDate(dt.getDate()+day);
      const ds=dt.toISOString().split('T')[0];
      roomsDef.forEach(r => {
        let contract=0, markup=1.30;
        // 获取合同价
        if(r.id>=39&&r.id<=46){ contract=istanbulPrice(r.id,ds); markup=1.25; }
        else if(r.id>=47&&r.id<=72){ contract=kenyaReunionPrice(r.id,ds); markup=1.15; }
        else if(r.id>=73&&r.id<=82){ contract=tbilisiPrice(r.id,ds); markup=1.15; }
        else if(r.id>=83&&r.id<=97){ contract=serengetiPrice(r,ds); markup=1.15; }
        else {
          contract=r.base_price;
          markup=[1.30,1.28,1.22,1.28,1.25,1.20,1.35,1.33,1.30,1.28,1.25,1.22,1.20,1.18,1.15,1.12,1.32,1.28,1.22,1.35,1.30,1.25][r.id-1]||1.30;
          if(r.id>=23&&r.id<=38&&seasonMult[r.id]){
            const season=samarkandSeason(ds);
            contract=Math.round(contract*(seasonMult[r.id][season]||1));
          }
        }
        if(!contract)return;
        const sales_price=Math.round(contract*markup);

        // 直签价
        insertDP.run(r.id, ds, contract, sales_price);

        // OTA价（略高于直签销售价5-15%）
        const otaMarkup=1+Math.round((5+Math.random()*10))/100;
        const ota_price=Math.round(sales_price*otaMarkup);
        insertOP.run(r.id, ds, ota_price, 'ctrip', r.cap-Math.floor(Math.random()*r.cap*0.2));
        insertOP.run(r.id, ds, Math.round(sales_price*(1+Math.round((3+Math.random()*8))/100)), 'booking', r.cap-Math.floor(Math.random()*r.cap*0.25));
        insertOP.run(r.id, ds, Math.round(sales_price*(1+Math.round((2+Math.random()*10))/100)), 'fliggy', r.cap-Math.floor(Math.random()*r.cap*0.3));

        // 库存
        const booked=day<5?Math.floor(Math.random()*r.cap*0.5):Math.floor(Math.random()*r.cap*0.2);
        insertInv.run(r.id, ds, r.cap, booked, booked>=r.cap?'full':'open');
      });
    }
  });
  seedTransaction();

  console.log('  ✓ 直签价 '+db.prepare('SELECT COUNT(*) as c FROM direct_prices').get().c+' 条');
  console.log('  ✓ OTA价 '+db.prepare('SELECT COUNT(*) as c FROM ota_prices').get().c+' 条');
  console.log('  ✓ 库存 '+db.prepare('SELECT COUNT(*) as c FROM inventory').get().c+' 条');
  console.log('[Seed] 种子数据生成完成！');
}

// 如果直接运行
if (require.main === module) {
  seed();
  console.log('数据库路径: db/hotel_b2b.db');
}

module.exports = { seed };

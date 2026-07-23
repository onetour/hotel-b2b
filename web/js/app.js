/* ========== Vue 应用 ========== */
const API = ''; // 同域请求，支持 localhost 和局域网 IP

const { createApp, ref, reactive, computed, watch, nextTick, onMounted } = Vue;

const app = createApp({
  setup() {
    /* ---- 全局状态 ---- */
    const page = ref('home');
    const token = ref(localStorage.getItem('web_token')||'');
    const user = ref(null);

    /* ---- 搜索参数 ---- */
    const today = new Date().toISOString().slice(0,10);
    const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
    const s = reactive({
      keyword: '', checkIn: today, checkOut: tomorrow,
      adults: 1, children: 0, rooms: 1
    });
    const showGuests = ref(false);

    /* ---- 热门目的地 ---- */
    const destinations = [
      { name:'迪拜', count:9, icon:'🕌', gradient:'linear-gradient(135deg,#f5a623,#f76b1c)' },
      { name:'阿布扎比', count:4, icon:'🏰', gradient:'linear-gradient(135deg,#667eea,#764ba2)' },
      { name:'撒马尔罕', count:8, icon:'🕌', gradient:'linear-gradient(135deg,#4facfe,#00f2fe)' },
      { name:'安塔利亚', count:1, icon:'🏖️', gradient:'linear-gradient(135deg,#43e97b,#38f9d7)' },
      { name:'博德鲁姆', count:1, icon:'⛵', gradient:'linear-gradient(135deg,#fa709a,#fee140)' },
      { name:'马塞马拉', count:1, icon:'🦁', gradient:'linear-gradient(135deg,#f093fb,#f5576c)' },
    ];

    /* ---- 城市联想 ---- */
    const cities = ['迪拜','阿布扎比','撒马尔罕','安塔利亚','博德鲁姆','马塞马拉','伊斯坦布尔','内罗毕','蒙巴萨'];
    const suggestCities = computed(() => {
      if (!s.keyword) return [];
      return cities.filter(c => c.includes(s.keyword));
    });

    /* ---- 首页推荐酒店 ---- */
    const featuredHotels = ref([]);
    const homeTab = ref('all');  // all | group | individual

    // 团房：min_rooms >= 5
    const groupFeatured = computed(() => featuredHotels.value.filter(h => h.min_rooms >= 5));
    // 散房：min_rooms < 5
    const individualFeatured = computed(() => featuredHotels.value.filter(h => !h.min_rooms || h.min_rooms < 5));

    /* ---- 搜索结果 ---- */
    const searchLoading = ref(false);
    const searchResults = ref([]);
    const f = reactive({ stars:[], source:'', priceMin:null, priceMax:null, cities:[], roomType:'' });
    const sortBy = ref('default');

    const filterCities = computed(() => {
      const set = new Set();
      searchResults.value.forEach(h => { if(h.city) set.add(h.city); });
      return [...set].sort();
    });

    const filteredResults = computed(() => {
      let arr = searchResults.value;
      if (f.roomType === 'group') arr = arr.filter(h => h.min_rooms >= 5);
      if (f.roomType === 'individual') arr = arr.filter(h => !h.min_rooms || h.min_rooms < 5);
      if (f.stars.length) arr = arr.filter(h => f.stars.includes(h.star_rating));
      if (f.source) arr = arr.filter(h => h.source === f.source);
      if (f.priceMin != null) arr = arr.filter(h => h.min_price >= f.priceMin);
      if (f.priceMax != null) arr = arr.filter(h => h.min_price <= f.priceMax);
      if (f.cities.length) arr = arr.filter(h => f.cities.includes(h.city));
      return arr;
    });

    const sortedResults = computed(() => {
      const arr = [...filteredResults.value];
      if (sortBy.value === 'priceAsc') arr.sort((a,b) => (a.min_price||99999) - (b.min_price||99999));
      else if (sortBy.value === 'priceDesc') arr.sort((a,b) => (b.min_price||0) - (a.min_price||0));
      else if (sortBy.value === 'star') arr.sort((a,b) => (b.star_rating||0) - (a.star_rating||0));
      return arr;
    });

    function clearFilters() {
      f.stars = []; f.source = ''; f.priceMin = null; f.priceMax = null; f.cities = []; f.roomType = '';
    }

    /* ---- 酒店详情 ---- */
    const detailLoading = ref(false);
    const hotel = ref(null);
    const detailDate = computed(() => s.checkIn || today);

    /* ---- 预订 ---- */
    const bookingHotel = ref(null);
    const bookingRoom = ref(null);
    const bookingQty = ref(1);
    const bkMin = computed(() => bookingRoom.value?.min_rooms || 1);
    const bookingForm = reactive({ guest_name:'', guest_phone:'', remark:'' });
    const submitting = ref(false);

    /* ---- 我的订单 ---- */
    const ordersLoading = ref(false);
    const orders = ref([]);
    const statusMap = { pending:'待确认', confirmed:'已确认', completed:'已完成', cancelled:'已取消' };

    /* ---- 登录 / 注册 ---- */
    const showLogin = ref(false);
    const authMode = ref('login'); // 'login' | 'register'
    const loginForm = reactive({ username:'', password:'' });
    const loginLoading = ref(false);
    const regForm = reactive({ username:'', password:'', confirmPwd:'', nickname:'', phone:'' });
    const regLoading = ref(false);

    /* ---- API ---- */
    function authHeaders() {
      const h = { 'Content-Type':'application/json' };
      if (token.value) h['Authorization'] = 'Bearer ' + token.value;
      return h;
    }

    async function apiGet(path, params) {
      const qs = new URLSearchParams(params).toString();
      const r = await fetch(API + path + (qs?'?'+qs:''), { headers: authHeaders() });
      if (r.status === 401) { token.value=''; localStorage.removeItem('web_token'); return null; }
      return r.json();
    }

    async function apiPost(path, body) {
      const r = await fetch(API + path, { method:'POST', headers: authHeaders(), body: JSON.stringify(body) });
      return r.json();
    }

    /* ---- 搜索逻辑 ---- */
    async function doSearch() {
      page.value = 'search';
      searchLoading.value = true;
      try {
        const params = {};
        if (s.keyword) params.keyword = s.keyword;
        params.date = s.checkIn;
        const r = await apiGet('/api/hotels/search/prices', params);
        if (r && r.data) searchResults.value = (r.data.hotels || []).map(h => ({
          ...h, min_price: h.min_price || minPrice(h), min_rooms: hotelMaxMinRooms(h)
        }));
      } catch(e) {
        searchResults.value = [];
      }
      searchLoading.value = false;
    }

    /* ---- 查看酒店详情 ---- */
    async function viewHotel(hotelId) {
      page.value = 'detail';
      detailLoading.value = true;
      hotel.value = null;
      try {
        const r = await apiGet('/api/hotels/' + hotelId + '/compare', { date: s.checkIn });
        if (r && r.data) hotel.value = r.data;
      } catch(e) { console.error(e); }
      detailLoading.value = false;
    }

    /* ---- 预订流程 ---- */
    function bookRoom(hotelId, room) {
      bookingHotel.value = hotel.value;
      bookingRoom.value = room;
      bookingQty.value = room.min_rooms && room.min_rooms >= 5 ? room.min_rooms : 1;
      bookingForm.guest_name = '';
      bookingForm.guest_phone = '';
      bookingForm.remark = '';
      s.checkOut = s.checkOut || tomorrow;
      page.value = 'booking';
    }

    function calcNights() {
      if (!s.checkIn || !s.checkOut) return 1;
      const ci = new Date(s.checkIn+'T00:00:00');
      const co = new Date(s.checkOut+'T00:00:00');
      return Math.max(1, Math.round((co-ci)/86400000));
    }

    async function submitBooking() {
      if (!bookingForm.guest_name) { ElementPlus.ElMessage.warning('请输入姓名'); return; }
      if (!bookingForm.guest_phone) { ElementPlus.ElMessage.warning('请输入手机号'); return; }
      if (bookingQty.value < bkMin.value) { ElementPlus.ElMessage.warning('该房型最低' + bkMin.value + '间起订'); return; }
      submitting.value = true;
      try {
        const body = {
          hotel_id: bookingHotel.value.hotel_id,
          room_type_id: bookingRoom.value.room_type_id,
          check_in: s.checkIn,
          check_out: s.checkOut,
          room_count: bookingQty.value,
          guest_name: bookingForm.guest_name,
          guest_phone: bookingForm.guest_phone,
          remark: bookingForm.remark,
          source: 'web'
        };
        const r = await apiPost('/api/bookings', body);
        if (r && r.code === 200) {
          ElementPlus.ElMessage.success('预订成功！订单号：' + r.data.order_no);
          page.value = 'my';
          loadOrders();
        } else {
          ElementPlus.ElMessage.error(r?.msg || '预订失败');
        }
      } catch(e) { ElementPlus.ElMessage.error('网络错误'); }
      submitting.value = false;
    }

    /* ---- 加载订单 ---- */
    async function loadOrders() {
      if (!token.value) return;
      ordersLoading.value = true;
      try {
        const r = await apiGet('/api/bookings');
        if (r && r.data) orders.value = r.data;
      } catch(e) {}
      ordersLoading.value = false;
    }

    /* ---- 登录 ---- */
    async function doLogin() {
      loginLoading.value = true;
      try {
        const r = await fetch(API+'/api/auth/login', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({username:loginForm.username,password:loginForm.password})
        }).then(r=>r.json());
        if (r && r.code === 200) {
          token.value = r.data.token;
          localStorage.setItem('web_token', r.data.token);
          user.value = r.data.user || { nickname: '用户' };
          showLogin.value = false;
          ElementPlus.ElMessage.success('登录成功');
          if (page.value === 'my') loadOrders();
        } else {
          ElementPlus.ElMessage.error(r?.msg || '登录失败');
        }
      } catch(e) { ElementPlus.ElMessage.error('网络错误'); }
      loginLoading.value = false;
    }

    function logout() {
      token.value = '';
      user.value = null;
      localStorage.removeItem('web_token');
      orders.value = [];
      ElementPlus.ElMessage.info('已退出登录');
    }

    async function doRegister() {
      if (!regForm.username || regForm.username.length < 3) { ElementPlus.ElMessage.warning('用户名至少3个字符'); return; }
      if (!regForm.password || regForm.password.length < 6) { ElementPlus.ElMessage.warning('密码至少6个字符'); return; }
      if (regForm.password !== regForm.confirmPwd) { ElementPlus.ElMessage.warning('两次密码输入不一致'); return; }
      regLoading.value = true;
      try {
        const r = await fetch(API+'/api/auth/register', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ username:regForm.username, password:regForm.password, nickname:regForm.nickname, phone:regForm.phone })
        }).then(r=>r.json());
        if (r && r.code === 200) {
          token.value = r.data.token;
          localStorage.setItem('web_token', r.data.token);
          user.value = r.data.user || { nickname: regForm.nickname || regForm.username };
          showLogin.value = false;
          authMode.value = 'login';
          // 清空注册表单
          Object.assign(regForm, { username:'', password:'', confirmPwd:'', nickname:'', phone:'' });
          ElementPlus.ElMessage.success('注册成功，已自动登录');
          if (page.value === 'my') loadOrders();
        } else {
          ElementPlus.ElMessage.error(r?.msg || '注册失败');
        }
      } catch(e) { ElementPlus.ElMessage.error('网络错误'); }
      regLoading.value = false;
    }

    /* ---- 辅助 ---- */
    function goHome() { page.value = 'home'; }

    function hotelGradient(h) {
      const colors = [
        'linear-gradient(135deg,#667eea,#764ba2)',
        'linear-gradient(135deg,#f093fb,#f5576c)',
        'linear-gradient(135deg,#4facfe,#00f2fe)',
        'linear-gradient(135deg,#43e97b,#38f9d7)',
        'linear-gradient(135deg,#fa709a,#fee140)',
        'linear-gradient(135deg,#a18cd1,#fbc2eb)',
        'linear-gradient(135deg,#f5a623,#f76b1c)',
        'linear-gradient(135deg,#003580,#0066cc)',
      ];
      return colors[(h.hotel_id||0) % colors.length];
    }

    function minPrice(h) {
      let min = Infinity;
      h.rooms.forEach(r => { if(r.direct?.sales_price) min = Math.min(min, r.direct.sales_price); });
      return min === Infinity ? null : min;
    }

    function hotelMaxMinRooms(h) {
      let max = 0;
      (h.rooms || []).forEach(r => { if(r.min_rooms && r.min_rooms > max) max = r.min_rooms; });
      return max;
    }

    /* ---- 初始化 ---- */
    onMounted(async () => {
      // 加载个人信息
      if (token.value) {
        try {
          const r = await apiGet('/api/auth/me');
          if (r && r.data) user.value = r.data;
        } catch(e) {}
      }
      // 加载推荐酒店
      try {
        const r = await apiGet('/api/hotels/search/prices', { date: today, source: 'direct' });
        if (r && r.data && r.data.hotels) {
          featuredHotels.value = r.data.hotels.slice(0, 8).map(h => ({
            ...h, min_price: minPrice(h), min_rooms: hotelMaxMinRooms(h)
          }));
        }
      } catch(e) {}
    });

    /* ---- 监听页面切换加载订单 ---- */
    watch(page, (v) => {
      if (v === 'my' && token.value) loadOrders();
    });

    return {
      page, token, user, today, tomorrow,
      s, showGuests, suggestCities, destinations, featuredHotels,
      homeTab, groupFeatured, individualFeatured,
      searchLoading, searchResults, f, filterCities, filteredResults, sortedResults,
      sortBy, clearFilters,
      detailLoading, hotel, detailDate,
      bookingHotel, bookingRoom, bookingQty, bkMin, bookingForm, submitting,
      ordersLoading, orders, statusMap,
      showLogin, authMode, loginForm, loginLoading, regForm, regLoading,
      goHome, doSearch, viewHotel, bookRoom, calcNights, submitBooking,
      loadOrders, doLogin, doRegister, logout, hotelGradient, hotelMaxMinRooms,
    };
  }
});

const locale = typeof ElementPlus !== 'undefined' ? (ElementPlus.langZhCn || ElementPlus.localeZhCn || ElementPlus.zhCn) : null;
app.use(ElementPlus, locale ? { locale } : {});
app.mount('#app');

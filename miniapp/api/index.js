/* API 配置 - 修改为实际后端地址 */
const BASE_URL = 'http://192.168.0.52:8766'; // 局域网地址，上线时改为正式域名
let token = '';

// 登录
async function login(username, password) {
  const res = await uni.request({
    url: BASE_URL + '/api/auth/login',
    method: 'POST',
    data: { username, password }
  });
  if (res[1].statusCode === 200 && res[1].data.code === 200) {
    token = res[1].data.data.token;
    uni.setStorageSync('b2b_token', token);
    uni.setStorageSync('b2b_user', res[1].data.data.user);
    return { ok: true, user: res[1].data.data.user };
  }
  return { ok: false, msg: res[1].data.msg || '登录失败' };
}

// 自动登录
function autoLogin() {
  token = uni.getStorageSync('b2b_token') || '';
  return !!token;
}

// 请求封装
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: { 'Authorization': 'Bearer ' + token, ...options.header },
      success: (res) => {
        if (res.data.code === 200) resolve(res.data.data);
        else reject(res.data.msg || '请求失败');
      },
      fail: (err) => reject(err.errMsg || '网络错误')
    });
  });
}

// 搜索酒店价格（多酒店对比）
function searchHotels({ keyword, date, star_rating }) {
  const params = [];
  if (keyword) params.push('keyword=' + encodeURIComponent(keyword));
  if (date) params.push('date=' + date);
  if (star_rating) params.push('star_rating=' + star_rating);
  return request('/api/hotels/search/prices?' + params.join('&'));
}

// 酒店详情 + 价格对比
function getHotelCompare(hotelId, date) {
  return request('/api/hotels/' + hotelId + '/compare?date=' + date);
}

// 多日价格
function getHotelPrices(hotelId, from, to) {
  return request('/api/hotels/' + hotelId + '/prices?from=' + from + '&to=' + to);
}

// 创建订单
function createOrder(data) {
  return request('/api/bookings', { method: 'POST', data });
}

// 订单列表
function getOrders(hotel_id, status) {
  const params = [];
  if (hotel_id) params.push('hotel_id=' + hotel_id);
  if (status) params.push('status=' + status);
  return request('/api/bookings?' + params.join('&'));
}

module.exports = {
  BASE_URL, token,
  login, autoLogin,
  searchHotels, getHotelCompare, getHotelPrices,
  createOrder, getOrders
};

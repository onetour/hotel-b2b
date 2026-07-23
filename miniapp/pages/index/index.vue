<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <text class="icon">🔍</text>
        <input v-model="keyword" placeholder="搜酒店名称/城市" confirm-type="搜索" @confirm="doSearch"/>
      </view>
      <picker mode="date" :value="date" @change="onDateChange">
        <view class="date-pick">{{date || '选择日期'}}</view>
      </picker>
    </view>

    <!-- 快捷筛选 -->
    <scroll-view scroll-x class="filter-bar">
      <view :class="['filter-tag',{active:star===null}]" @click="star=null;doSearch()">全部</view>
      <view :class="['filter-tag',{active:star===5}]" @click="star=5;doSearch()">⭐五星</view>
      <view :class="['filter-tag',{active:star===4}]" @click="star=4;doSearch()">⭐四星</view>
    </scroll-view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading">搜索中...</view>

    <!-- 酒店列表 -->
    <scroll-view scroll-y class="hotel-list" v-else>
      <view v-if="hotels.length===0" class="empty">
        <text style="font-size:48rpx;margin-bottom:16rpx">🏨</text>
        <text style="color:#999">搜索酒店查看报价</text>
      </view>

      <view v-for="h in hotels" :key="h.hotel_id" class="hotel-card" @click="goDetail(h)">
        <view class="hotel-header">
          <view class="hotel-name">{{h.hotel_name}}</view>
          <view class="hotel-star">{{'★'.repeat(h.star_rating)}}</view>
        </view>
        <view class="hotel-info">
          <text :class="['source-tag',h.source==='direct'?'direct':'ota']">{{h.source==='direct'?'直签':'OTA'}}</text>
          <text class="room-count">{{h.rooms.length}}个房型</text>
        </view>

        <!-- 房型价格预览（最多3个） -->
        <view class="room-preview" v-for="(r,i) in h.rooms.slice(0,3)" :key="i">
          <view class="room-row">
            <view class="room-info">
              <text class="room-name">{{r.room_name}}</text>
              <text class="room-bed">{{r.bed_type}}</text>
            </view>
            <view class="room-price">
              <view class="price-main">
                <text class="price-label">销售价</text>
                <text class="price-num" v-if="r.direct">¥{{r.direct.sales_price}}</text>
                <text class="price-num na" v-else>--</text>
              </view>
              <view class="price-sub">
                <text class="ota-label">OTA</text>
                <text class="ota-num" v-if="r.ota?.ctrip">¥{{r.ota.ctrip}}</text>
                <text class="ota-num na" v-else>--</text>
              </view>
            </view>
          </view>
        </view>

        <view class="hotel-footer" v-if="h.rooms.length>3">
          <text class="more">查看全部{{h.rooms.length}}个房型 →</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const api = require('../../api/index');

export default {
  data() {
    const today = new Date();
    const ds = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    return {
      keyword: '',
      date: ds,
      star: null,
      hotels: [],
      loading: false
    };
  },
  onLoad() {
    if (!api.autoLogin()) {
      // 自动登录
      api.login('admin', 'admin123').then(res => {
        if (res.ok) this.doSearch();
      });
    } else {
      this.doSearch();
    }
  },
  methods: {
    onDateChange(e) { this.date = e.detail.value; this.doSearch(); },
    async doSearch() {
      if (this.loading) return;
      this.loading = true;
      try {
        const data = await api.searchHotels({
          keyword: this.keyword,
          date: this.date,
          star_rating: this.star
        });
        this.hotels = data.hotels || [];
      } catch(e) {
        console.error('搜索失败:', e);
        uni.showToast({title: '搜索失败', icon:'none'});
      }
      this.loading = false;
    },
    goDetail(h) {
      uni.navigateTo({
        url: '/pages/detail/detail?hotelId='+h.hotel_id+'&name='+encodeURIComponent(h.hotel_name)+'&date='+this.date+'&star='+h.star_rating+'&source='+h.source
      });
    }
  }
};
</script>

<style scoped>
.container{padding:20rpx}
.search-bar{display:flex;align-items:center;gap:16rpx;background:#fff;border-radius:12rpx;padding:16rpx;margin-bottom:16rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.04)}
.search-input{flex:1;display:flex;align-items:center;background:#f5f5f5;border-radius:8rpx;padding:12rpx 16rpx}
.search-input .icon{font-size:28rpx;margin-right:8rpx}
.search-input input{flex:1;font-size:28rpx;border:none;background:none}
.date-pick{background:#f0f7ff;color:#409eff;padding:12rpx 20rpx;border-radius:8rpx;font-size:26rpx;white-space:nowrap}
.filter-bar{white-space:nowrap;padding:0 0 16rpx}
.filter-tag{display:inline-block;padding:8rpx 24rpx;margin-right:12rpx;background:#fff;border-radius:20rpx;font-size:24rpx;color:#666}
.filter-tag.active{background:#409eff;color:#fff}
.loading{text-align:center;padding:60rpx;color:#999}
.empty{display:flex;flex-direction:column;align-items:center;padding:120rpx 0}
.hotel-card{background:#fff;border-radius:12rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.04)}
.hotel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8rpx}
.hotel-name{font-size:32rpx;font-weight:600;color:#303133;flex:1}
.hotel-star{color:#f7ba2a;font-size:24rpx}
.hotel-info{display:flex;align-items:center;gap:12rpx;margin-bottom:16rpx}
.source-tag{font-size:20rpx;padding:4rpx 12rpx;border-radius:4rpx}
.source-tag.direct{background:#f0f9eb;color:#67c23a}
.source-tag.ota{background:#ecf5ff;color:#409eff}
.room-count{font-size:22rpx;color:#999}
.room-row{display:flex;justify-content:space-between;align-items:center;padding:16rpx 0;border-top:1rpx solid #f0f0f0}
.room-name{font-size:26rpx;color:#333;display:block}
.room-bed{font-size:22rpx;color:#999}
.room-price{display:flex;gap:20rpx;align-items:flex-end}
.price-label{font-size:20rpx;color:#999;display:block;margin-bottom:4rpx}
.price-num{font-size:28rpx;font-weight:700;color:#67c23a}
.price-num.na{color:#ccc;font-weight:400}
.ota-label{font-size:20rpx;color:#999;display:block;margin-bottom:4rpx}
.ota-num{font-size:24rpx;color:#f56c6c}
.ota-num.na{color:#ccc}
.more{font-size:24rpx;color:#409eff;padding-top:12rpx}
.hotel-footer{text-align:center}
</style>

<template>
  <view class="container">
    <!-- 加载中 -->
    <view v-if="loading" class="loading">加载中...</view>

    <template v-else-if="hotel">
      <!-- 酒店信息 -->
      <view class="hotel-header">
        <view class="hotel-name">{{hotel.hotel_name}}</view>
        <view class="hotel-star">{{'★'.repeat(star)}}</view>
        <view class="hotel-date">{{date}}</view>
      </view>

      <!-- 房型列表 -->
      <view v-if="rooms.length===0" class="empty">暂无房型数据</view>

      <view v-for="r in rooms" :key="r.room_type_id" class="room-card">
        <view class="room-header">
          <view class="room-name">{{r.room_name}}</view>
          <view class="room-info-row">
            <text class="room-tag">{{r.bed_type}}</text>
            <text class="room-tag">{{r.meal_plan}}</text>
            <text class="room-tag">最多{{r.max_guests}}人</text>
          </view>
        </view>

        <!-- 价格对比表 -->
        <view class="price-grid">
          <view class="price-col">
            <text class="col-label">合同价</text>
            <text class="col-value" v-if="r.direct">¥{{r.direct.contract_price}}</text>
            <text class="col-value na" v-else>--</text>
          </view>
          <view class="price-col highlight">
            <text class="col-label">销售价</text>
            <text class="col-value sale" v-if="r.direct">¥{{r.direct.sales_price}}</text>
            <text class="col-value na" v-else>--</text>
          </view>
          <view class="price-col">
            <text class="col-label">携程</text>
            <text class="col-value ota" v-if="r.ota?.ctrip?.ota_price">¥{{r.ota.ctrip.ota_price}}</text>
            <text class="col-value na" v-else>--</text>
          </view>
          <view class="price-col">
            <text class="col-label">Booking</text>
            <text class="col-value ota" v-if="r.ota?.booking?.ota_price">¥{{r.ota.booking.ota_price}}</text>
            <text class="col-value na" v-else>--</text>
          </view>
        </view>

        <!-- 库存 -->
        <view class="stock-row">
          <text>可用: </text>
          <text :class="r.inventory?.available_rooms===0?'stock-full':r.inventory?.available_rooms<=3?'stock-low':'stock-ok'">
            {{r.inventory?.available_rooms!==undefined?r.inventory.available_rooms+'间':'--'}}
          </text>
          <text v-if="r.inventory?.available_rooms===0" class="stock-full"> 售罄</text>
        </view>

        <!-- 下单按钮 -->
        <button :class="['book-btn',{disabled:!r.direct||r.inventory?.available_rooms===0}]"
          :disabled="!r.direct||r.inventory?.available_rooms===0"
          @click="goBooking(r)">立即预订</button>
      </view>
    </template>
  </view>
</template>

<script>
const api = require('../../api/index');

export default {
  data() {
    return {
      hotelId: null,
      date: '',
      star: 0,
      source: '',
      hotelName: '',
      hotel: null,
      rooms: [],
      loading: true
    };
  },
  onLoad(options) {
    this.hotelId = parseInt(options.hotelId);
    this.date = options.date || '';
    this.star = parseInt(options.star) || 0;
    this.source = options.source || '';
    this.hotelName = decodeURIComponent(options.name || '');
    uni.setNavigationBarTitle({title: this.hotelName || '酒店详情'});
    this.loadData();
  },
  methods: {
    async loadData() {
      try {
        const data = await api.getHotelCompare(this.hotelId, this.date);
        this.hotel = data;
        this.rooms = data.rooms || [];
      } catch(e) {
        uni.showToast({title:'加载失败', icon:'none'});
      }
      this.loading = false;
    },
    goBooking(r) {
      uni.navigateTo({
        url: '/pages/booking/booking?hotelId='+this.hotelId+'&roomId='+r.room_type_id+'&roomName='+encodeURIComponent(r.room_name)+'&hotelName='+encodeURIComponent(this.hotelName)+'&date='+this.date+'&price='+(r.direct?.sales_price||'')+'&contractPrice='+(r.direct?.contract_price||'')
      });
    }
  }
};
</script>

<style scoped>
.container{padding:20rpx}
.loading{text-align:center;padding:120rpx;color:#999}
.empty{text-align:center;padding:80rpx;color:#999}
.hotel-header{background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:12rpx;padding:32rpx;margin-bottom:24rpx}
.hotel-name{color:#fff;font-size:34rpx;font-weight:600;margin-bottom:8rpx}
.hotel-star{color:#f7ba2a;font-size:24rpx}
.hotel-date{color:rgba(255,255,255,.6);font-size:24rpx;margin-top:8rpx}
.room-card{background:#fff;border-radius:12rpx;padding:24rpx;margin-bottom:16rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.04)}
.room-name{font-size:30rpx;font-weight:600;color:#303133;margin-bottom:8rpx}
.room-info-row{display:flex;flex-wrap:wrap;gap:8rpx;margin-bottom:16rpx}
.room-tag{font-size:22rpx;color:#909399;background:#f5f7fa;padding:4rpx 12rpx;border-radius:4rpx}
.price-grid{display:flex;justify-content:space-between;padding:16rpx;background:#fafafa;border-radius:8rpx;margin-bottom:12rpx}
.price-col{text-align:center;flex:1}
.price-col.highlight{background:#f0f9eb;border-radius:6rpx;padding:8rpx 0}
.col-label{font-size:20rpx;color:#999;display:block;margin-bottom:4rpx}
.col-value{font-size:28rpx;font-weight:700;color:#333}
.col-value.sale{color:#67c23a;font-size:30rpx}
.col-value.ota{color:#f56c6c}
.col-value.na{color:#ccc;font-weight:400}
.stock-row{font-size:24rpx;margin-bottom:12rpx}
.stock-ok{color:#67c23a;font-weight:600}
.stock-low{color:#e6a23c;font-weight:600}
.stock-full{color:#f56c6c;font-weight:600}
.book-btn{width:100%;background:#409eff;color:#fff;border:none;border-radius:8rpx;padding:20rpx;font-size:28rpx}
.book-btn.disabled{background:#c0c4cc}
</style>

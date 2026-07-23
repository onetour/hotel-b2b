<template>
  <view class="container">
    <!-- 订单表单 -->
    <view class="form-card" v-if="!orderNo">
      <view class="hotel-info">
        <text class="hotel-name">{{hotelName}}</text>
        <text class="room-name">{{roomName}}</text>
      </view>

      <view class="price-summary">
        <view class="price-row">
          <text>销售价</text>
          <text class="price-main">¥{{price}} /晚</text>
        </view>
        <view class="price-row">
          <text>合同价</text>
          <text class="price-sub">¥{{contractPrice}} /晚</text>
        </view>
      </view>

      <view class="form-group">
        <text class="label">入住日期</text>
        <picker mode="date" :value="checkIn" @change="e=>onCheckIn(e)">
          <text class="value">{{checkIn || '选择日期'}}</text>
        </picker>
      </view>

      <view class="form-group">
        <text class="label">离店日期</text>
        <picker mode="date" :value="checkOut" :start="checkIn" @change="e=>checkOut=e.detail.value">
          <text class="value">{{checkOut || '选择日期'}}</text>
        </picker>
      </view>

      <view class="form-group">
        <text class="label">房间数</text>
        <view class="stepper">
          <button @click="count>1?count--:null">-</button>
          <text>{{count}}</text>
          <button @click="count<10?count++:null">+</button>
        </view>
      </view>

      <view class="form-group">
        <text class="label">宾客姓名</text>
        <input v-model="guestName" placeholder="必填" class="input"/>
      </view>

      <view class="form-group">
        <text class="label">联系电话</text>
        <input v-model="guestPhone" type="number" maxlength="11" placeholder="必填" class="input"/>
      </view>

      <view class="total-row">
        <text>预估总价</text>
        <text class="total-price">¥{{totalPrice}}</text>
      </view>

      <button class="submit-btn" @click="submit" :disabled="submitting" :loading="submitting">
        {{submitting?'提交中...':'提交订单'}}
      </button>
    </view>

    <!-- 下单成功 -->
    <view class="success-card" v-else>
      <view class="success-icon">✓</view>
      <text class="success-title">下单成功!</text>
      <text class="success-no">订单号: {{orderNo}}</text>
      <text class="success-msg">总价: ¥{{totalPrice}}</text>
      <button class="back-btn" @click="back">返回首页</button>
    </view>
  </view>
</template>

<script>
const api = require('../../api/index');

export default {
  data() {
    return {
      hotelId: null, roomId: null, roomName: '', hotelName: '',
      price: 0, contractPrice: 0, date: '',
      checkIn: '', checkOut: '',
      count: 1, guestName: '', guestPhone: '',
      submitting: false, orderNo: ''
    };
  },
  computed: {
    nights() {
      if (!this.checkIn || !this.checkOut) return 1;
      const ci = new Date(this.checkIn+'T00:00:00');
      const co = new Date(this.checkOut+'T00:00:00');
      return Math.max(1, Math.round((co-ci)/(1000*60*60*24)));
    },
    totalPrice() {
      return this.price * this.count * this.nights;
    }
  },
  onLoad(options) {
    this.hotelId = parseInt(options.hotelId);
    this.roomId = parseInt(options.roomId);
    this.roomName = decodeURIComponent(options.roomName || '');
    this.hotelName = decodeURIComponent(options.hotelName || '');
    this.price = parseInt(options.price) || 0;
    this.contractPrice = parseInt(options.contractPrice) || 0;
    this.date = options.date || '';
    this.checkIn = this.date;

    // 默认离店=入住+1天
    const d = new Date(this.date+'T00:00:00');
    d.setDate(d.getDate()+1);
    this.checkOut = d.toISOString().split('T')[0];
  },
  methods: {
    onCheckIn(e) {
      this.checkIn = e.detail.value;
      const d = new Date(this.checkIn+'T00:00:00');
      d.setDate(d.getDate()+1);
      this.checkOut = d.toISOString().split('T')[0];
    },
    async submit() {
      if (!this.guestName || !this.guestPhone) {
        return uni.showToast({title:'请填写宾客信息', icon:'none'});
      }
      if (!this.checkIn || !this.checkOut) {
        return uni.showToast({title:'请选择日期', icon:'none'});
      }

      this.submitting = true;
      try {
        const order = await api.createOrder({
          hotel_id: this.hotelId,
          room_type_id: this.roomId,
          check_in: this.checkIn,
          check_out: this.checkOut,
          room_count: this.count,
          guest_name: this.guestName,
          guest_phone: this.guestPhone,
          source: 'miniapp',
          price_type: 'direct'
        });
        this.orderNo = order.order_no;
        uni.showToast({title:'下单成功', icon:'success'});
      } catch(e) {
        uni.showToast({title: String(e), icon:'none'});
      }
      this.submitting = false;
    },
    back() {
      uni.switchTab({url: '/pages/index/index'});
    }
  }
};
</script>

<style scoped>
.container{padding:20rpx;padding-bottom:40rpx}
.form-card{background:#fff;border-radius:12rpx;padding:32rpx;box-shadow:0 2rpx 8rpx rgba(0,0,0,.04)}
.hotel-info{margin-bottom:20rpx}
.hotel-name{display:block;font-size:32rpx;font-weight:600;color:#303133}
.room-name{display:block;font-size:26rpx;color:#909399;margin-top:4rpx}
.price-summary{background:#f0f9ff;border-radius:8rpx;padding:20rpx;margin-bottom:20rpx}
.price-row{display:flex;justify-content:space-between;align-items:center;font-size:26rpx;padding:6rpx 0}
.price-main{color:#67c23a;font-size:32rpx;font-weight:700}
.price-sub{color:#909399;font-size:28rpx}
.form-group{display:flex;justify-content:space-between;align-items:center;padding:20rpx 0;border-bottom:1rpx solid #f0f0f0}
.label{font-size:28rpx;color:#333}
.value{font-size:28rpx;color:#409eff}
.input{border:none;text-align:right;font-size:28rpx;width:300rpx}
.stepper{display:flex;align-items:center;gap:12rpx}
.stepper button{width:56rpx;height:56rpx;border-radius:50%;border:1rpx solid #dcdfe6;background:#fff;font-size:28rpx;line-height:56rpx;padding:0;text-align:center}
.stepper text{font-size:32rpx;font-weight:600;min-width:48rpx;text-align:center}
.total-row{display:flex;justify-content:space-between;align-items:center;padding:24rpx 0;margin-top:10rpx;border-top:1rpx solid #f0f0f0}
.total-price{font-size:40rpx;font-weight:700;color:#f56c6c}
.submit-btn{width:100%;background:#409eff;color:#fff;border:none;border-radius:8rpx;padding:24rpx;font-size:32rpx;margin-top:20rpx}
.success-card{background:#fff;border-radius:12rpx;padding:60rpx 40rpx;text-align:center}
.success-icon{width:100rpx;height:100rpx;background:#67c23a;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:48rpx;margin:0 auto 24rpx}
.success-title{display:block;font-size:36rpx;font-weight:600;color:#303133;margin-bottom:16rpx}
.success-no{display:block;font-size:28rpx;color:#409eff;margin-bottom:8rpx}
.success-msg{display:block;font-size:26rpx;color:#909399;margin-bottom:32rpx}
.back-btn{width:80%;background:#409eff;color:#fff;border:none;border-radius:8rpx;padding:20rpx;font-size:28rpx}
</style>

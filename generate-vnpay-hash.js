const crypto = require('crypto');

// =================== INPUT CỦA BẠN ===================
const secretKey = '3e0d61a0c0534b2e36680b3f7277743e8784cc4e1d68fa7d276e79c23be7d6318d338b477910a27992f5057bb1582bd44bd82ae8009ffaf6d141219218625c42'; // <-- THAY BẰNG MÃ THẬT

const params = {
    vnp_Amount: '26000000',
    vnp_BankCode: 'NCB',
    vnp_OrderInfo: 'Thanh toan don hang 6845a63d976a3bbe53c8dce9', // Dùng dấu cách, không dùng '+'
    vnp_PayDate: '20250608172230',
    vnp_ResponseCode: '00',
    vnp_TmnCode: 'DEMOV21',
    vnp_TxnRef: '6845a63d976a3bbe53c8dce9'
};

// =================== LOGIC TÍNH TOÁN (Sửa lại) ===================

console.log('--- Calculating VNPAY Secure Hash for Webhook Test ---');
if (!secretKey || secretKey === 'YOUR_VNPAY_HASH_SECRET') {
    console.error('!!! LỖI: Vui lòng thay thế YOUR_VNPAY_HASH_SECRET bằng mã bí mật thật của bạn.');
    return;
}

const sortedParams = Object.keys(params)
    .sort()
    .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
    }, {});

// SỬA LẠI LOGIC Ở ĐÂY để giống hệt service
// encodeURIComponent sẽ chuyển dấu cách thành %20, nhưng VNPAY xử lý được
const signData = Object.keys(sortedParams)
    .map(key => `${key}=${encodeURIComponent(sortedParams[key])}`)
    .join('&');

console.log('Data to hash:', signData);

const hmac = crypto.createHmac('sha512', secretKey);
const secureHash = hmac.update(signData, 'utf-8').digest('hex');

console.log('-----------------------------------------');
console.log('Your Secure Hash is:');
console.log(secureHash);
console.log('-----------------------------------------');
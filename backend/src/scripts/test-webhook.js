import crypto from 'crypto';
import 'dotenv/config';
const walletAddress = process.argv[2] || '0x0000000000000000000000000000000000000000';
const amount = process.argv[3] || '0.5';
const body = {
  type: 'ADDRESS_ACTIVITY',
  event: {
    network: 'polygon-amoy',
    activity: [{
      category: 'external',
      fromAddress: walletAddress,
      toAddress: process.env.HOT_WALLET_ADDRESS,
      value: parseFloat(amount),
      asset: 'MATIC',
      hash: '0x' + crypto.randomBytes(32).toString('hex'),
    }],
  },
};
const signature = crypto.createHmac('sha256', process.env.ALCHEMY_WEBHOOK_SIGNING_KEY)
  .update(JSON.stringify(body)).digest('hex');
fetch(`http://localhost:${process.env.PORT || 3000}/deposits/webhook/alchemy`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-alchemy-signature': signature },
  body: JSON.stringify(body),
}).then(r => r.json()).then(console.log).catch(console.error);
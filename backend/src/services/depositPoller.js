import { ethers } from 'ethers';
import db from '../config/db.js';
import { notify } from '../../routes/notifications.js';
const POLL_CHAINS = {
  'bsc-testnet':    { rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545', chainId: 97 },
  'avalanche-fuji': { rpc: 'https://api.avax-test.network/ext/bc/C/rpc',     chainId: 43113 },
  'fantom-testnet': { rpc: 'https://rpc.testnet.fantom.network',             chainId: 4002 },
  'scroll-sepolia': { rpc: 'https://sepolia-rpc.scroll.io',                  chainId: 534351 },
  'mantle-sepolia': { rpc: 'https://rpc.sepolia.mantle.xyz',                 chainId: 5003 },
};
const lastBlock = {};
async function pollChain(chainKey, config, hotWallet, io, userSockets) {
  let provider;
  try {
    provider = new ethers.JsonRpcProvider(config.rpc);
    const currentBlock = await provider.getBlockNumber();
    if (!lastBlock[chainKey]) { lastBlock[chainKey] = currentBlock; return; }
    const fromBlock = lastBlock[chainKey] + 1;
    if (fromBlock > currentBlock) return; 
    const toBlock = Math.min(currentBlock, fromBlock + 100);
    lastBlock[chainKey] = toBlock;
    for (let b = fromBlock; b <= toBlock; b++) {
      let block;
      try { block = await provider.getBlock(b, true); } catch { continue; }
      if (!block?.prefetchedTransactions) continue;
      for (const tx of block.prefetchedTransactions) {
        if (tx.to?.toLowerCase() !== hotWallet) continue;
        if (tx.from?.toLowerCase() === hotWallet) continue; 
        if (tx.value === 0n) continue;
        const txHash = tx.hash;
        const exists = (await db.query('SELECT id FROM transactions WHERE tx_hash=$1', [txHash])).rows[0];
        if (exists) continue;
        const fromAddr = tx.from.toLowerCase();
        const user = (await db.query('SELECT id FROM users WHERE wallet_address=$1', [fromAddr])).rows[0];
        if (!user) { console.log(`[poll:${chainKey}] Deposit from unknown wallet: ${fromAddr}`); continue; }
        const amount = ethers.formatEther(tx.value);
        await db.query(
          "INSERT INTO transactions(user_id,type,chain,token,amount,tx_hash,status) VALUES($1,'deposit',$2,'NATIVE',$3,$4,'confirmed')",
          [user.id, chainKey, amount, txHash]
        );
        await db.query(
          'INSERT INTO balances(user_id,chain,token,amount) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,chain,token) DO UPDATE SET amount=balances.amount+$4',
          [user.id, chainKey, 'NATIVE', amount]
        );
        console.log(`[poll:${chainKey}] Deposit: ${amount} NATIVE from ${fromAddr} (tx: ${txHash})`);
        const socketId = userSockets.get(user.id);
        if (socketId) {
          const newBalance = (await db.query('SELECT chain,token,amount FROM balances WHERE user_id=$1', [user.id])).rows;
          io.to(socketId).emit('deposit:confirmed', { chain: chainKey, token: 'NATIVE', amount, txHash, balances: newBalance });
        }
        notify(user.id, 'deposit', 'Deposit Confirmed', `+${amount} NATIVE on ${chainKey} (tx: ${txHash.slice(0,12)}...)`, io, userSockets);
      }
    }
  } catch (err) {
    console.error(`[poll:${chainKey}] Error:`, err.message);
  }
}
export function startDepositPoller(io, userSockets) {
  const hotWallet = process.env.HOT_WALLET_ADDRESS?.toLowerCase();
  if (!hotWallet) { console.error('[poller] HOT_WALLET_ADDRESS missing'); return; }
  console.log(`🔄 Deposit poller start — ${Object.keys(POLL_CHAINS).length} chain, interval 60s`);
  const poll = () => {
    for (const [key, config] of Object.entries(POLL_CHAINS)) {
      pollChain(key, config, hotWallet, io, userSockets);
    }
  };
  poll();
  setInterval(poll, 60_000);
}
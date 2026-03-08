import { ref } from 'vue';
import { useAppKit, useDisconnect, useAppKitAccount } from '@reown/appkit/vue';
import { BrowserProvider } from 'ethers';
import api from '../services/api.js';
import { defaultChain, allChains } from '../config/appkit.js';
const wallet = ref(null);
const user = ref(null);
const balances = ref([]);
const loading = ref(false);
const error = ref(null);
const profileLoaded = ref(false);
const initializing = ref(true);
const authenticated = ref(false);
const currentChain = ref(null);
let fetchPromise = null;
let initDone = false;
let authInProgress = false;
let pollInterval = null;
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isMetaMaskBrowser = isMobile && !!window.ethereum?.isMetaMask;
const getRouter = () => import('../router/index.js').then(m => m.default);
// Strips Vue reactivity / non-cloneable props before sending to MetaMask
const toPlain = obj => JSON.parse(JSON.stringify(obj));
const ensureNetwork = async (targetChain = defaultChain) => {
  if (!window.ethereum) return;
  const hexId = '0x' + targetChain.id.toString(16);
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
    currentChain.value = targetChain.id;
  } catch (err) {
    if (err.code === 4902 || err?.data?.originalError?.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [toPlain({
          chainId: hexId,
          chainName: targetChain.name,
          nativeCurrency: targetChain.nativeCurrency,
          rpcUrls: targetChain.rpcUrls.default.http,
          blockExplorerUrls: [targetChain.blockExplorers.default.url]
        })]
      });
      currentChain.value = targetChain.id;
    } else throw err;
  }
};
const switchChain = async (chainId) => {
  const chain = allChains.find(c => c.id === chainId);
  if (!chain) throw new Error(`Chain ${chainId} not supported`);
  await ensureNetwork(chain);
};
const restoreSession = async () => {
  const t = localStorage.getItem('token');
  if (!t) return false;
  try {
    const d = await api.getMe();
    wallet.value = d.user.wallet;
    user.value = d.user;
    balances.value = d.balances || [];
    profileLoaded.value = true;
    authenticated.value = true;
    return true;
  } catch {
    localStorage.removeItem('token');
    authenticated.value = false;
    return false;
  }
};
if (!initDone) {
  initDone = true;
  restoreSession().finally(() => { initializing.value = false; });
}
const stopPolling = () => { if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } };
export function useWallet() {
  const appKit = useAppKit();
  const disconnectKit = useDisconnect();
  useAppKitAccount();
  const getSigner = async () => {
    if (window.ethereum) return new BrowserProvider(window.ethereum).getSigner();
    const p = appKit?.getWalletProvider?.();
    if (p) return new BrowserProvider(p).getSigner();
    throw new Error('No wallet provider found');
  };
  const fetchProfile = async () => {
    if (fetchPromise) return fetchPromise;
    fetchPromise = (async () => {
      try {
        const d = await api.getMe();
        user.value = d.user;
        balances.value = d.balances || [];
        profileLoaded.value = true;
      } catch (e) { console.error('Profile:', e); }
      finally { fetchPromise = null; }
    })();
    return fetchPromise;
  };
  const authenticate = async (addr) => {
    if (authInProgress || authenticated.value || localStorage.getItem('token')) return;
    authInProgress = true;
    loading.value = true;
    error.value = null;
    stopPolling();
    try {
      try { await appKit.close(); } catch {}
      await new Promise(r => setTimeout(r, 300));
      await ensureNetwork(defaultChain);
      const { message } = await api.getNonce(addr);
      console.log('[auth] signing...');
      const signer = await getSigner();
      const signature = await signer.signMessage(message);
      const data = await api.verify(addr, signature);
      console.log('[auth] success');
      localStorage.setItem('token', data.token);
      wallet.value = addr;
      user.value = data.user;
      authenticated.value = true;
      await fetchProfile();
      const router = await getRouter();
      await router.push('/');
    } catch (e) {
      console.error('[auth] error:', e.message);
      stopPolling();
      if (e.code === 4001 || e?.message?.includes('rejected') || e?.message?.includes('denied')) {
        error.value = 'Signature rejected. Please try again.';
        try { await disconnectKit.disconnect(); } catch {}
      } else { error.value = e.message; }
    } finally { loading.value = false; authInProgress = false; }
  };
  const startPolling = () => {
    stopPolling();
    let attempts = 0;
    pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > 60) { stopPolling(); loading.value = false; return; }
      if (authInProgress || authenticated.value || localStorage.getItem('token')) { stopPolling(); return; }
      try {
        const accounts = await window.ethereum?.request({ method: 'eth_accounts' });
        console.log('[poll] accounts:', accounts);
        if (accounts && accounts.length > 0) {
          stopPolling();
          await authenticate(accounts[0].toLowerCase());
        }
      } catch (e) { console.error('[poll] error:', e.message); }
    }, 500);
  };
  const connect = async () => {
    error.value = null;
    loading.value = true;
    try {
      await appKit.open();
      startPolling();
    } catch (e) {
      loading.value = false;
      stopPolling();
      if (!e?.message?.includes('declined') && !e?.message?.includes('rejected')) error.value = e.message;
    }
  };
  const connectDirect = async () => {
    if (!window.ethereum) return;
    error.value = null;
    loading.value = true;
    try {
      const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accs.length > 0) await authenticate(accs[0]);
    } catch (e) { if (e.code !== 4001) error.value = e.message; }
    finally { loading.value = false; }
  };
  const disconnect = async () => {
    stopPolling();
    if (!isMetaMaskBrowser) { try { await disconnectKit.disconnect(); } catch {} }
    localStorage.removeItem('token');
    wallet.value = null;
    user.value = null;
    balances.value = [];
    profileLoaded.value = false;
    authenticated.value = false;
    currentChain.value = null;
    const router = await getRouter();
    router.push('/connect');
  };
  const ensureProfile = async () => {
    if (profileLoaded.value && balances.value.length) return;
    if (!localStorage.getItem('token')) return;
    await fetchProfile();
  };
  return {
    wallet, user, balances, loading, error, profileLoaded, initializing,
    authenticated, isMetaMaskBrowser, currentChain,
    connect, connectDirect, disconnect, restoreSession,
    fetchProfile, ensureProfile, switchChain, ensureNetwork, allChains
  };
}
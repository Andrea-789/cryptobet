import { createAppKit } from '@reown/appkit/vue';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;
export const polygonAmoy = {
  id: 80002, name: 'Polygon Amoy', backendKey: 'polygon-amoy',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-amoy.polygon.technology'] } },
  blockExplorers: { default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' } },
  testnet: true
};
export const baseSepolia = {
  id: 84532, name: 'Base Sepolia', backendKey: 'base-sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
  blockExplorers: { default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' } },
  testnet: true
};
export const arbitrumSepolia = {
  id: 421614, name: 'Arbitrum Sepolia', backendKey: 'arbitrum-sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] } },
  blockExplorers: { default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' } },
  testnet: true
};
export const sepoliaEth = {
  id: 11155111, name: 'Sepolia', backendKey: 'sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.org'] } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' } },
  testnet: true
};
export const bscTestnet = {
  id: 97, name: 'BSC Testnet', backendKey: 'bsc-testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: { default: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] } },
  blockExplorers: { default: { name: 'BscScan', url: 'https://testnet.bscscan.com' } },
  testnet: true
};
export const avalancheFuji = {
  id: 43113, name: 'Avalanche Fuji', backendKey: 'avalanche-fuji',
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  rpcUrls: { default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] } },
  blockExplorers: { default: { name: 'SnowTrace', url: 'https://testnet.snowtrace.io' } },
  testnet: true
};
export const optimismSepolia = {
  id: 11155420, name: 'Optimism Sepolia', backendKey: 'optimism-sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia.optimism.io'] } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://sepolia-optimism.etherscan.io' } },
  testnet: true
};
export const fantomTestnet = {
  id: 4002, name: 'Fantom Testnet', backendKey: 'fantom-testnet',
  nativeCurrency: { name: 'FTM', symbol: 'FTM', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.fantom.network'] } },
  blockExplorers: { default: { name: 'FTMScan', url: 'https://testnet.ftmscan.com' } },
  testnet: true
};
export const scrollSepolia = {
  id: 534351, name: 'Scroll Sepolia', backendKey: 'scroll-sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia-rpc.scroll.io'] } },
  blockExplorers: { default: { name: 'Scrollscan', url: 'https://sepolia.scrollscan.com' } },
  testnet: true
};
export const mantleSepolia = {
  id: 5003, name: 'Mantle Sepolia', backendKey: 'mantle-sepolia',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
  blockExplorers: { default: { name: 'Mantle Explorer', url: 'https://sepolia.mantlescan.xyz' } },
  testnet: true
};
export const allChains = [
  polygonAmoy, baseSepolia, arbitrumSepolia, sepoliaEth, bscTestnet,
  avalancheFuji, optimismSepolia, fantomTestnet, scrollSepolia, mantleSepolia
];
export const defaultChain = polygonAmoy;
export const chainIdToBackendKey = Object.fromEntries(allChains.map(c => [c.id, c.backendKey]));
const origin = typeof window !== 'undefined' ? window.location.origin : '';
const metadata = {
  name: 'CryptoBet Casino',
  description: 'The #1 Crypto Casino - Provably Fair',
  url: origin,
  icons: [`${origin}/favicon.ico`]
};
const appkit = createAppKit({
  adapters: [new EthersAdapter()],
  networks: allChains,
  defaultNetwork: defaultChain,
  projectId,
  metadata,
  features: { analytics: false, email: false, socials: false, onramp: false, swaps: false },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3df06a',
    '--w3m-color-mix': '#0c1a30',
    '--w3m-color-mix-strength': 40,
    '--w3m-border-radius-master': '2px'
  }
});
export default appkit;
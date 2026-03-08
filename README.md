# 🎰 CryptoBet Casino — Multi-Chain Testnet

A full-stack, provably fair crypto casino running on **10 EVM testnets**. Players connect their Web3 wallet, deposit test tokens, and play a variety of classic and original casino games. All game outcomes are verifiable via a provably fair HMAC-SHA256 system.

> ⚠️ **Disclaimer:** This project runs exclusively on testnets and uses tokens with no real monetary value. It is intended for educational and portfolio purposes only.

## Live Demo
https://casino-rosy-eta.vercel.app/

---

## ✨ Features

### 🎮 Games

| Game | Type | Description |
|---|---|---|
| **Dice** | Single-round | Roll over/under a target with configurable risk |
| **Roulette** | Single-round | European-style with 6 bet types (number, color, even/odd, half, dozen, column) |
| **Slot Machine** | Single-round | 3-reel weighted slots with triple/double payouts |
| **Plinko** | Single-round | 12-row ball drop with 13 multiplier slots |
| **Spin Wheel** | Single-round | 8-segment weighted prize wheel |
| **Mines** | Multi-turn | Minesweeper-style — reveal safe cells and cash out anytime |
| **Hi-Lo** | Multi-turn | Predict higher/lower cards to build a streak multiplier |
| **Blackjack** | Multi-turn | Full blackjack with hit, stand, double down, and natural 21 (2.5x) |
| **Crash** | Multi-turn | Watch the multiplier rise and cash out before it crashes |

All games use a **Provably Fair** system: every outcome is derived from an HMAC-SHA256 hash of server seed + client seed + nonce, fully verifiable by the player. Players can rotate seeds and set custom client seeds at any time.

### 💰 Wallet & Finance
- Web3 wallet connection via **Reown AppKit** (supports MetaMask, WalletConnect, and more)
- Deposits detected automatically via **Alchemy webhooks** (Polygon Amoy, Base Sepolia, Arbitrum Sepolia, Sepolia, Optimism Sepolia) and a **block poller** for the remaining chains
- Withdrawals processed **automatically** on-chain — the server signs and broadcasts the TX, waits for confirmation, and auto-refunds on failure
- In-app currency exchange between tokens (simulated, no DEX — balances updated internally with live price feeds)

### 🌐 Supported Chains

| Chain | Deposit | Withdraw |
|---|---|---|
| Polygon Amoy | Alchemy webhook | ✅ |
| Base Sepolia | Alchemy webhook | ✅ |
| Arbitrum Sepolia | Alchemy webhook | ✅ |
| Sepolia (ETH) | Alchemy webhook | ✅ |
| Optimism Sepolia | Alchemy webhook | ✅ |
| BSC Testnet | Block poller | ✅ |
| Avalanche Fuji | Block poller | ✅ |
| Fantom Testnet | Block poller | ✅ |
| Scroll Sepolia | Block poller | ✅ |
| Mantle Sepolia | Block poller | ✅ |

### 🏆 Social & Progression
- Global leaderboard
- **VIP Club** — 6 tiers (Bronze → Silver → Gold → Diamond → Platinum → Obsidian) with automatic tier upgrades, daily rakeback (1–15%), and weekly bonuses
- Referral system
- In-app real-time notifications via WebSocket
- User profile with full bet history and stats

### 🔐 Security
- **Wallet-based authentication** — no passwords, sign-in via cryptographic signature (`ethers.verifyMessage`)
- JWT tokens (24h expiry), verified on both HTTP and WebSocket connections
- Admin panel: dashboard stats, user management (ban/unban), transaction history, big wins monitor
- Hot wallet protected from self-deposits

---

## 🛠️ Tech Stack

### Frontend
| Technology | Role |
|---|---|
| [Vue 3](https://vuejs.org/) | UI framework (Composition API) |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [Vue Router](https://router.vuejs.org/) | Client-side routing |
| [Reown AppKit](https://reown.com/appkit) | Web3 wallet connection |
| [Socket.io client](https://socket.io/) | Real-time game events & notifications |
| [Vercel](https://vercel.com/) | Hosting & deployment |

### Backend
| Technology | Role |
|---|---|
| [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/) | REST API server |
| [PostgreSQL](https://www.postgresql.org/) | Primary database |
| [Socket.io](https://socket.io/) | Real-time communication |
| [ethers.js v6](https://docs.ethers.org/) | Blockchain interaction & signature verification |
| [Alchemy](https://www.alchemy.com/) | Webhook-based deposit detection + RPC |
| [Railway](https://railway.app/) | Hosting & PostgreSQL deployment |

---

## 📁 Project Structure

```
.
├── frontend/   # Vue 3 app — deployed on Vercel
└── backend/    # Node.js/Express API — deployed on Railway
```

### Frontend (`/frontend`)
```
src/
├── components/     # Game and UI components (one per game)
├── composables/    # Reusable Vue logic (useSocket, useWallet)
├── config/         # Reown AppKit Web3 config & chain definitions
├── pages/          # Route-level page components
├── router/         # Vue Router setup
└── services/       # API client (fetch wrapper with JWT injection)
```

### Backend (`/backend`)
```
├── routes/         # Express route handlers
│   ├── auth.js         # Wallet sign-in (nonce → signature → JWT)
│   ├── games.js        # All game logic (9 games)
│   ├── deposits.js     # Alchemy webhook handler
│   ├── withdrawals.js  # Automatic on-chain withdrawals
│   ├── exchange.js     # Token swap (simulated)
│   ├── trading.js      # Trading view with Binance price feed
│   ├── vip.js          # VIP tiers, rakeback, weekly bonus
│   ├── leaderboard.js  # Global rankings
│   ├── notifications.js
│   ├── userPanel.js    # User stats & referrals
│   └── admin.js        # Admin dashboard
├── middleware/
│   └── authMiddleware.js   # JWT verify + admin role check
└── src/
    ├── config/         # DB connection & schema initialization
    └── services/
        ├── provablyFair.js   # HMAC-SHA256 seed system
        ├── exchange.js       # Price feeds & swap logic
        └── depositPoller.js  # Block poller for non-webhook chains
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js v18+
- PostgreSQL database
- Alchemy account (for webhook deposit detection and RPC on supported chains)
- A hot wallet with test tokens on the chains you want to support ([Polygon Amoy faucet](https://faucet.polygon.technology/))
- Reown (WalletConnect) project ID — [get one free](https://cloud.reown.com/)

---

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in values (see below)
npm run init-db        # initialize PostgreSQL schema
npm start
```

#### Backend `.env`
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_jwt_secret_min_32_chars

# Hot wallet — receives deposits and sends withdrawals
HOT_WALLET_ADDRESS=0xYourHotWalletAddress
HOT_WALLET_PRIVATE_KEY=0xYourPrivateKey

# Alchemy
ALCHEMY_API_KEY=your_alchemy_api_key
ALCHEMY_WEBHOOK_SIGNING_KEY=your_webhook_signing_key

# App
FRONTEND_URL=https://your-frontend.vercel.app
MAX_BET=0.001   # maximum bet per round (in native token units)
PORT=3000
```

---

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in values (see below)
npm run dev
```

#### Frontend `.env`
```env
VITE_API_URL=http://localhost:3000
VITE_REOWN_PROJECT_ID=your_walletconnect_project_id
```

> **Note:** update the `icons` field in `src/config/appkit.js` with your actual frontend URL so the wallet connection modal displays the correct icon.

---

### Deployment

| Layer | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Connect GitHub repo, set env vars, deploy |
| Backend | Railway | Connect GitHub repo, add PostgreSQL plugin, set env vars |

To receive deposits via Alchemy webhooks, configure an **Address Activity** webhook in your Alchemy dashboard pointing to:
```
https://your-backend.railway.app/deposits/webhook/alchemy
```

---

## ⚠️ Known Limitations

- **Nonces stored in memory** — auth nonces are held in a `Map()` and reset on server restart. Users must re-request a nonce after a restart. For production, migrate to Redis or a DB table.
- **Exchange is simulated** — token swaps update balances internally using live price feeds. No real DEX interaction occurs.
- **Single hot wallet** — all deposits and withdrawals flow through one wallet. Keep the private key secure and never commit it to version control.
- **Admin withdrawal approval is cosmetic** — withdrawals are processed automatically on request; the admin approval button only updates a status label and does not trigger any on-chain action.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

![cryptobet](cryptobet.jpg?raw=true)

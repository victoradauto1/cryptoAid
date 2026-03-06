# 🌟 CryptoAid - Decentralized Crowdfunding Platform

A blockchain-powered fundraising platform built on Ethereum, enabling transparent and trustless campaign management with IPFS-backed metadata storage.

![Next.js](https://img.shields.io/badge/Next.js-15.1.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Smart Contract Integration](#-smart-contract-integration)
- [IPFS & Pinata](#-ipfs--pinata)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## ✨ Features

### Core Functionality
- 🎯 **Campaign Creation** - Launch fundraising campaigns with customizable goals and deadlines
- 💰 **Secure Donations** - MetaMask integration for seamless ETH donations
- 📊 **Real-time Progress** - Live tracking of funding goals and donor counts
- 🔐 **Decentralized Storage** - Campaign metadata stored on IPFS via Pinata
- 🖼️ **Image Proxy** - Secure external image loading with validation
- 📱 **Responsive Design** - Mobile-first UI with Tailwind CSS

### Frontend Business Rules
> **Note**: While the smart contract allows campaigns without deadlines (`deadline = 0`), the frontend **requires a deadline** for all campaigns. This design decision prevents abandoned campaigns from remaining active indefinitely, ensuring a better user experience and platform hygiene.

### Technical Highlights
- ⛓️ **Dual Data Layer** - On-chain transactions + off-chain metadata
- 🔒 **Security First** - ReentrancyGuard, input validation, HTTPS-only images
- 🎨 **Component Architecture** - Reusable React components (modals, forms, badges)
- 🚀 **Performance** - Optimized RPC calls with batch operations
- 📦 **Type Safety** - Full TypeScript implementation

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15.1.3 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.1
- **Blockchain**: ethers.js 6.13.5
- **Storage**: Pinata SDK (IPFS)
- **HTTP Client**: Axios 1.7.9

### Infrastructure
- **Network**: Ethereum Sepolia Testnet
- **RPC**: Public node via ethers
- **IPFS**: Pinata Cloud
- **Deployment**: Vercel-ready

---

## 🏗 Architecture

### Data Flow
```
User Action
    ↓
MetaMask Signature
    ↓
Smart Contract (on-chain) ──→ Event Logs
    ↓
API Route (server-side)
    ↓
Pinata IPFS (off-chain metadata)
    ↓
UI Update (React state)
```

### Security Model
- **On-chain**: Campaign state, balances, donations
- **Off-chain**: Title, description, images, videos
- **Proxy**: All external images validated (HTTPS, content-type, size)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm/yarn/pnpm
- MetaMask browser extension
- Sepolia testnet ETH ([faucet](https://sepoliafaucet.com/))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/cryptoaid-frontend.git
cd cryptoaid-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials (see [Environment Variables](#-environment-variables))

4. **Run development server**
```bash
npm run dev
```

5. **Open in browser**
```
http://localhost:3000
```

### Build for Production
```bash
npm run build
npm start
```

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Blockchain Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0x71c613404CcD199aeEe9309c869e94C5fDeca991
NEXT_PUBLIC_CHAIN_ID=11155111

# IPFS Configuration (Pinata)
PINATA_JWT=your_pinata_jwt_token_here

# Optional: Custom RPC (if not using public node)
# NEXT_PUBLIC_RPC_URL=https://your-rpc-endpoint
```

### Getting Pinata JWT
1. Create account at [pinata.cloud](https://pinata.cloud)
2. Generate API key with permissions: `pinFileToIPFS`, `pinJSONToIPFS`
3. Copy JWT token to `.env.local`

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (server-side)
│   │   ├── fetch-metadata/       # Fetch campaign metadata from Pinata
│   │   ├── upload-metadata/      # Upload campaign metadata to Pinata
│   │   └── image-proxy/          # Secure external image proxy
│   ├── campaigns/                # Campaign listing page
│   │   └── [id]/                 # Campaign details page
│   ├── createCampaign/           # Campaign creation page
│   ├── about/                    # About page
│   ├── howItWorks/               # How it works page
│   └── layout.tsx                # Root layout
├── components/                   # Reusable components
│   ├── CampaignCard.tsx          # Campaign preview card
│   ├── ConfirmModal.tsx          # Confirmation modal
│   ├── DonateModal.tsx           # Donation modal
│   ├── FormComponents.tsx        # Form inputs & textareas
│   ├── Header.tsx                # Navigation header
│   ├── ProcessingOverlay.tsx     # Transaction processing overlay
│   └── StatusBadge.tsx           # Campaign status badge
├── context/                      # React Context
│   └── cryptoAidProvider.tsx     # Web3 provider & actions
├── services/                     # Business logic
│   └── pinataService.ts          # Pinata IPFS service
├── types/                        # TypeScript types
│   └── campaign.ts               # Campaign data types
├── utils/                        # Utilities
│   └── web3provider.ts           # Ethers.js configuration
└── styles/                       # Global styles
    └── globals.css
```

---

## ⛓️ Smart Contract Integration

### Contract ABI Location
```typescript
// src/utils/web3provider.ts
const CONTRACT_ABI = [ /* ... */ ];
```

### Key Functions Used
| Function | Purpose | Access |
|----------|---------|--------|
| `createCampaign()` | Create new campaign | Any wallet |
| `donate()` | Donate to campaign | Any wallet |
| `getCampaign()` | Fetch campaign data | Public (read-only) |
| `getDonorCount()` | Get unique donors | Public (read-only) |
| `campaignCount()` | Total campaigns | Public (read-only) |

### Network Configuration
- **Chain**: Sepolia Testnet
- **Chain ID**: 11155111
- **Contract**: `0x71c613404CcD199aeEe9309c869e94C5fDeca991`
- **Block Explorer**: [Sepolia Etherscan](https://sepolia.etherscan.io/)

---

## 📦 IPFS & Pinata

### Metadata Structure
```json
{
  "campaignId": "5",
  "title": "Clean Water Access",
  "description": "Funding water purification systems...",
  "imageUrl": "https://images.unsplash.com/photo-...",
  "videoUrl": "",
  "goal": "0.15",
  "deadline": 1775444340,
  "createdAt": 1772157571503
}
```

### Upload Flow
```
1. User creates campaign
2. Transaction sent to smart contract
3. On success, metadata uploaded to Pinata
4. IPFS hash returned (ipfs://Qm...)
5. Optional: Store hash in mapping for future retrieval
```

### Fetch Flow
```
1. Query Pinata by campaignId keyvalue
2. Retrieve IPFS hash
3. Fetch metadata from gateway
4. Merge with on-chain data
5. Display in UI
```

---

## 🌐 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in dashboard
4. Deploy

### Environment Variables in Vercel
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=11155111
PINATA_JWT=eyJ...
```

### Build Configuration
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Connect MetaMask to Sepolia
- [ ] Create campaign with valid data
- [ ] Verify campaign appears in `/campaigns`
- [ ] Donate to campaign
- [ ] Check balance updates in UI
- [ ] Verify donor count increments
- [ ] Test image proxy with external URLs
- [ ] Test campaign details page
- [ ] Verify deadline expiration logic

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Write descriptive commit messages
- Add comments for complex logic

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenZeppelin** - Smart contract libraries
- **Pinata** - IPFS storage infrastructure
- **Ethers.js** - Ethereum interaction library
- **Next.js** - React framework
- **Vercel** - Deployment platform

---

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Contact: your-email@example.com

---

**Built with ❤️ for a decentralized future**
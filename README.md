# GhostPay - Private Payments on Solana

A privacy-focused payment application built on Solana using MagicBlock's Trusted Execution Environment (TEE) for truly private transfers.

## Features

- **Private Transfers**: Send tokens privately using MagicBlock TEE - transfer amounts and details are hidden from public view
- **Private Vault**: Deposit tokens into a private vault protected by TEE
- **Delegation System**: Delegate your deposits to TEE for privacy, undelegate when needed
- **Session Keys**: Secure session management for TEE operations

## How It Works

1. **Authenticate**: Connect your wallet and authenticate with MagicBlock TEE
2. **Deposit**: Move tokens from your wallet to your private vault
3. **Delegate**: Delegate your vault to TEE for privacy protection
4. **Transfer**: Send private payments - transfers happen inside TEE
5. **Withdraw**: Undelegate and withdraw tokens back to your wallet

## Privacy Model

| Operation | Privacy Level | Notes |
|-----------|---------------|-------|
| Transfers | Private | Executed inside TEE, hidden from public |
| Balances (delegated) | Private | Stored in TEE |
| Deposits | Public | On-chain transaction |
| Withdrawals | Public | On-chain transaction |

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Blockchain**: Solana (Devnet)
- **Privacy**: MagicBlock TEE (Private Ephemeral Rollups)
- **Smart Contracts**: Anchor Framework

## Getting Started

### Prerequisites

- Node.js 18+
- A Solana wallet (Phantom, Solflare, etc.)
- Some devnet SOL and USDC for testing

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ghost-pay.git
cd ghost-pay

# Install dependencies
npm install

# Copy environment file (optional)
cp .env.example .env.local

# Start development server
npm run dev
```

### Building for Production

```bash
npm run build
```

## Configuration

All public configuration is in `lib/constants.ts`:

- `EPHEMERAL_RPC_URL`: MagicBlock TEE endpoint
- `VALIDATOR_PUBKEY`: TEE validator public key
- `PAYMENTS_PROGRAM`: Private payments program ID
- `SOLANA_RPC_URL`: Solana RPC endpoint

## Security Considerations

- Never share your private keys or seed phrases
- This is a devnet application - do not use with real funds
- TEE authentication tokens are stored in localStorage
- Always verify transaction details before signing

## Architecture

```
ghost-pay/
├── components/       # React UI components
├── contexts/         # React context providers
├── hooks/           # Custom React hooks
│   ├── use-private-rollup-auth.ts  # TEE authentication
│   ├── use-private-transfer.ts     # Private transfer logic
│   └── use-program.ts              # Anchor program interactions
├── lib/             # Utilities and constants
├── program/         # Anchor IDL files
└── services/        # External service integrations
```

## License

MIT

## Acknowledgments

- [MagicBlock](https://magicblock.gg/) for the TEE infrastructure
- [Solana](https://solana.com/) for the blockchain platform
- [Anchor](https://www.anchor-lang.com/) for the smart contract framework

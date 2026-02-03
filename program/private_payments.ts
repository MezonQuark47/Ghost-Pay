/**
 * Program IDL in camelCase format for JS/TS usage.
 */
export type PrivatePayments = {
  "address": "EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS",
  "metadata": {
    "name": "privatePayments",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createPermission",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    },
    {
      "name": "delegate",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    },
    {
      "name": "initializeDeposit",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    },
    {
      "name": "modifyBalance",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    },
    {
      "name": "transferDeposit",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    },
    {
      "name": "undelegate",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    }
  ],
  "accounts": [
    {
      "name": "deposit",
      "discriminator": number[]
    },
    {
      "name": "sessionToken",
      "discriminator": number[]
    },
    {
      "name": "vault",
      "discriminator": number[]
    }
  ],
  "errors": [
    {
      "code": number,
      "name": string,
      "msg": string
    }
  ],
  "types": [
    {
      "name": "deposit",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "user", "type": "pubkey" },
          { "name": "tokenMint", "type": "pubkey" },
          { "name": "amount", "type": "u64" }
        ]
      }
    },
    {
      "name": "modifyDepositArgs",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "amount", "type": "u64" },
          { "name": "increase", "type": "bool" }
        ]
      }
    }
  ]
};

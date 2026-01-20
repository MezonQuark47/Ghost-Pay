import { NextResponse } from "next/server";

// Ortam kontrolü: .env dosyasında mainnet yazıyorsa GERÇEK mod çalışır.
// Yoksa otomatik olarak DEVNET (Mock) modunda çalışır.
const IS_MAINNET = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inputMint = searchParams.get("inputMint");
  const outputMint = searchParams.get("outputMint");
  const amount = searchParams.get("amount"); // Lamports
  const slippageBps = searchParams.get("slippageBps");

  // ---------------------------------------------------------
  // 🟢 SENARYO 1: MAINNET (GERÇEK JUPITER)
  // ---------------------------------------------------------
  if (IS_MAINNET) {
    try {
      console.log("🌍 MAINNET MODU: Gerçek Jupiter API'ye gidiliyor...");
      
      const jupiterUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;

      const response = await fetch(jupiterUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      return NextResponse.json(data);

    } catch (error) {
      console.error("❌ MAINNET Hatası:", error);
      return NextResponse.json({ error: "Jupiter API Hatası" }, { status: 500 });
    }
  }

  // ---------------------------------------------------------
  // 🟡 SENARYO 2: DEVNET (MOCK / SAHTE VERİ)
  // ---------------------------------------------------------
  else {
    console.log("🛠️ DEVNET MODU: Sahte veri üretiliyor...");
    
    // Basit Matematik: 1 SOL = ~150 USDC varsayalım
    const inputAmount = amount ? parseInt(amount) : 0;
    const solPrice = 150; 
    const outputAmount = (inputAmount / 1_000_000_000) * solPrice * 1_000_000;

    const mockResponse = {
      inputMint: inputMint,
      inAmount: inputAmount.toString(),
      outputMint: outputMint,
      outAmount: Math.floor(outputAmount).toString(),
      otherAmountThreshold: Math.floor(outputAmount * 0.99).toString(),
      swapMode: "ExactIn",
      slippageBps: 50,
      priceImpactPct: "0",
      routePlan: [], // Swap işlemi yapılamaz, sadece fiyat gösterir
      contextSlot: 123456789,
      timeTaken: 0.001
    };

    // Gerçekçi olsun diye 300ms bekletelim
    await new Promise(resolve => setTimeout(resolve, 300));

    return NextResponse.json(mockResponse);
  }
}
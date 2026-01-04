
import { NextRequest, NextResponse } from "next/server";
import { getChainConfig } from "@/lib/bundler/config";
import { handleRpcMethod, JsonRpcRequest } from "@/lib/bundler/rpc/methods";
import { connectDB } from "@/lib/bundler/db";

export async function POST(req: NextRequest) {
    // 1. Ensure DB connection
    try {
        await connectDB();
    } catch (e) {
        console.error("Database connection failed", e);
        return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const body = await req.json();
    // Valid JSON-RPC check
    const request = body as JsonRpcRequest;
    if (!request.jsonrpc || request.jsonrpc !== "2.0" || !request.method) {
        return NextResponse.json({ error: "Invalid JSON-RPC" }, { status: 400 });
    }

    // 2. Parse chain from query (?chain=base)
    const searchParams = req.nextUrl.searchParams;
    const chainName = searchParams.get("chain") || "baseSepolia";

    // 3. Get Config (Bundler Wallet, Provider, etc)
    let config;
    try {
        config = getChainConfig(chainName);
    } catch (e: any) {
        return NextResponse.json({
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32602, message: e.message || "Invalid chain" }
        });
    }

    // 4. Handle Method
    const response = await handleRpcMethod(request, config);

    return NextResponse.json(response);
}

// OPTIONS for CORS (handled automatically by Next.js if configured, but explicit is good)
export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}

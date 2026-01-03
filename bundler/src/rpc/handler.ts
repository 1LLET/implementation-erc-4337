import { Router, type Request, type Response } from "express";
import { handleRpcMethod, type JsonRpcRequest } from "./methods.js";
import { getChainConfig } from "../config.js";

export const rpcRouter = Router();

rpcRouter.post("/", async (req: Request, res: Response) => {
  const request = req.body as JsonRpcRequest;

  // Validate JSON-RPC structure
  if (!request.jsonrpc || request.jsonrpc !== "2.0") {
    res.json({
      jsonrpc: "2.0",
      id: request.id || null,
      error: { code: -32600, message: "Invalid JSON-RPC version" },
    });
    return;
  }

  if (!request.method) {
    res.json({
      jsonrpc: "2.0",
      id: request.id || null,
      error: { code: -32600, message: "Missing method" },
    });
    return;
  }

  if (!Array.isArray(request.params)) {
    request.params = [];
  }

  /* 
   * Extract chain from query params, e.g. /?chain=arbitrum
   * Default to 'baseSepolia' if not provided for backward compatibility
   */
  const chainName = (req.query.chain as string) || "baseSepolia";

  let config;
  try {
    config = getChainConfig(chainName);
  } catch (error: any) {
    res.status(400).json({
      jsonrpc: "2.0",
      id: request.id || null,
      error: { code: -32602, message: error.message || "Invalid chain configuration" },
    });
    return;
  }

  const response = await handleRpcMethod(request, config);
  res.json(response);
});

// Health check endpoint
rpcRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

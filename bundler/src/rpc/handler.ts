import { Router, type Request, type Response } from "express";
import { handleRpcMethod, type JsonRpcRequest } from "./methods.js";

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

  const response = await handleRpcMethod(request);
  res.json(response);
});

// Health check endpoint
rpcRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

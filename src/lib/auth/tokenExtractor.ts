import type { FastifyRequest } from "fastify";

import type { TokenExtractionResult } from "./types";

export function extractToken(request: FastifyRequest): TokenExtractionResult {
	void request;
	throw new Error("Not implemented: extractToken");
}

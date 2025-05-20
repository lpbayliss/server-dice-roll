import {
    McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
    diceRollSchema,
    parseDiceNotation,
    rollDice,
    rollResultSchema,
} from "./dice.js";
import { packageJSON } from "./package.js";

const server = new McpServer({
    name: packageJSON.name,
    version: packageJSON.version,
});

server.registerTool(
    "parse_dice_roll_notation",
    {
        description: "Parses dice roll notation",
        inputSchema: {
            notation: z
                .string()
                .nonempty()
                .describe("The dice roll notation to parse"),
        },
        outputSchema: {
            ...diceRollSchema._def.shape(),
        },
    },
    async ({ notation }) => ({
        structuredContent: {
            ...parseDiceNotation(notation),
        },
    })
);

server.registerTool(
    "dice_roll",
    {
        description: "Make a dice roll",
        inputSchema: {
            ...diceRollSchema._def.shape(),
        },
        outputSchema: {
            ...rollResultSchema._def.shape(),
        },
    },
    async (diceRoll) => {
        return {
            structuredContent: {
                rollResult: rollDice(diceRoll),
            },
        };
    }
);

/**
 * Starts the MCP server with a stdio transport
 * 
 * Initializes the server, sets up exit handlers for graceful shutdown,
 * and connects to the transport layer.
 * 
 * @returns A Promise that resolves when the server is connected
 * @throws Will throw an error if server connection fails
 */
export async function startServer() {
    const transport = new StdioServerTransport();
    setupExitWatchdog(transport);
    await server.connect(transport);
}

/**
 * Sets up handlers for graceful server shutdown
 * 
 * Watches for stdin close, SIGINT, and SIGTERM signals to ensure
 * the server shuts down properly. Includes a safety timeout to force
 * exit if clean shutdown takes too long.
 * 
 * @param transport - The transport connection to close on shutdown
 */
function setupExitWatchdog(transport: Transport) {
    const handleExit = async () => {
        setTimeout(() => process.exit(0), 15000);
        transport.close();
        process.exit(0);
    };

    process.stdin.on("close", handleExit);
    process.on("SIGINT", handleExit);
    process.on("SIGTERM", handleExit);
}
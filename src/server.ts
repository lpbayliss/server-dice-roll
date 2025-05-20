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

export async function startServer() {
    const transport = new StdioServerTransport();
    setupExitWatchdog(transport);
    await server.connect(transport);
}

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
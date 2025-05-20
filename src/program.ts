import chalk from "chalk";
import { program } from "commander";

import { DiceRollError, parseDiceNotation, roll } from "./dice.js";
import { packageJSON } from "./package.js";
import { startServer } from "./server.js";

program
    .version("Version " + packageJSON.version)
    .name(packageJSON.name)
    .description(chalk.green("MCP server for simulating dice rolls with support for standard dice notation and Fate/Fudge dice"))
    .action(async () => {
        await startServer().catch((err) => {
            console.error("Fatal error running server", err);
            process.exit(1);
        });
    });

program.parse(process.argv);
import chalk from "chalk";
import { program } from "commander";

import { DiceRollError, parseDiceNotation, roll } from "./dice.js";
import { packageJSON } from "./package.js";
import { startServer } from "./server.js";

program
    .version("Version " + packageJSON.version)
    .name(packageJSON.name)
    .description(chalk.green("Doug is a CLI tool for managing your projects"))
    .action(async () => {
        await startServer().catch((err) => {
            console.error("Fatal error running server", err);
            process.exit(1);
        });
    });

program.parse(process.argv);
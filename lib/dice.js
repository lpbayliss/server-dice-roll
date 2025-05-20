import { z } from "zod/v4";
/**
 * Zod schema for validating dice roll configurations
 */
export const diceRollSchema = z.object({
    type: z.enum(["standard", "fate"]),
    count: z.number().int().nonnegative(),
    sides: z.number().int().positive(),
    modifier: z.number().int().optional(),
});
/**
 * Zod schema for validating roll results
 */
export const rollResultSchema = z.object({
    rolls: z.array(z.number().int()),
    total: z.number().int(),
    original: z.string(),
});
/**
 * Custom error class for dice roll parsing errors
 */
export class DiceRollError extends Error {
    constructor(message) {
        super(message);
        this.name = "DiceRollError";
    }
}
/**
 * Parses a dice notation string into a DiceRoll object
 * @param notation - The dice notation string (e.g., "2d6", "1d20+5", "4dF")
 * @returns A DiceRoll object representing the parsed notation
 * @throws {DiceRollError} If the notation is invalid
 */
export function parseDiceNotation(notation) {
    // Remove whitespace and convert to lowercase
    notation = notation.replace(/\s+/g, "").toLowerCase();
    // Match patterns like: 2d6, d6, 1d20+5, 4dF
    const match = notation.match(/^(\d+)?d([0-9]+|f)([+-]\d+)?$/i);
    if (!match) {
        throw new DiceRollError(`Invalid dice notation: ${notation}`);
    }
    const [, countStr, sidesStr, modifierStr] = match;
    const count = countStr ? Number.parseInt(countStr, 10) : 1;
    const isFate = sidesStr.toLowerCase() === "f";
    const sides = isFate ? 3 : Number.parseInt(sidesStr, 10);
    const modifier = modifierStr ? Number.parseInt(modifierStr, 10) : undefined;
    // Create the dice roll object
    const diceRoll = {
        type: isFate ? "fate" : "standard",
        count,
        sides,
        modifier,
    };
    // Validate using Zod schema
    try {
        return diceRollSchema.parse(diceRoll);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new DiceRollError(`Invalid dice configuration: ${error.errors.map((e) => e.message).join(", ")}`);
        }
        throw error;
    }
}
/**
 * Rolls a single die with the specified number of sides
 * @param sides - Number of sides on the die
 * @returns A random number between 1 and sides (inclusive)
 */
function rollSingleDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}
/**
 * Rolls a single Fate/Fudge die
 * @returns -1, 0, or 1 with equal probability
 */
function rollFateDie() {
    return Math.floor(Math.random() * 3) - 1;
}
/**
 * Rolls dice based on a DiceRoll configuration
 * @param diceRoll - The dice roll configuration
 * @returns A RollResult containing the individual rolls and total
 */
export function rollDice(diceRoll) {
    // Validate input using Zod schema
    diceRoll = diceRollSchema.parse(diceRoll);
    const rolls = [];
    // Roll the appropriate number of dice
    for (let i = 0; i < diceRoll.count; i++) {
        const roll = diceRoll.type === "fate" ? rollFateDie() : rollSingleDie(diceRoll.sides);
        rolls.push(roll);
    }
    // Calculate total
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + (diceRoll.modifier || 0);
    const result = {
        rolls,
        total,
        original: formatDiceNotation(diceRoll),
    };
    // Validate output using Zod schema
    return rollResultSchema.parse(result);
}
/**
 * Formats a DiceRoll object back into a notation string
 * @param diceRoll - The dice roll configuration
 * @returns A string representation of the dice roll
 */
function formatDiceNotation(diceRoll) {
    // Validate input using Zod schema
    diceRoll = diceRollSchema.parse(diceRoll);
    const count = diceRoll.count === 1 ? "" : diceRoll.count;
    const sides = diceRoll.type === "fate" ? "F" : diceRoll.sides;
    const modifier = diceRoll.modifier
        ? diceRoll.modifier >= 0
            ? `+${diceRoll.modifier}`
            : diceRoll.modifier.toString()
        : "";
    return `${count}d${sides}${modifier}`;
}
/**
 * Main function to parse and roll dice from a notation string
 * @param notation - The dice notation string
 * @returns A RollResult containing the roll results
 * @throws {DiceRollError} If the notation is invalid
 */
export function roll(notation) {
    const diceRoll = parseDiceNotation(notation);
    return rollDice(diceRoll);
}

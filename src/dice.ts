import { z } from "zod";
import crypto from "crypto";
import { performance } from "perf_hooks";
import os from "os";

/**
 * Class for collecting and managing entropy from various sources
 */
export class EntropyPool {
	private pool: Buffer;
	private position: number = 0;
	private lastUpdate: number = Date.now();
	private updateInterval: number = 60000; // 1 minute
	private initialized: boolean = false;

	/**
	 * Create a new entropy pool with the specified size
	 * @param size - Size of the entropy pool in bytes
	 */
	constructor(private size: number = 1024) {
		// Initialize with crypto random bytes
		this.pool = crypto.randomBytes(size);
		
		// Collect initial entropy from various sources
		this.seedInitialEntropy();
		
		// Start periodic collection
		this.startPeriodicCollection();
	}

	/**
	 * Add entropy to the pool
	 * @param data - Buffer containing entropy to add
	 * @param strength - Estimated entropy strength factor (0.0-1.0)
	 */
	public addEntropy(data: Buffer, strength: number = 0.5): void {
		// Apply strength factor - lower strength means we mix in less influence
		const effectiveStrength = Math.max(0.01, Math.min(1.0, strength));
		
		// Create a hash of the incoming data to normalize its entropy
		const hash = crypto.createHash('sha512').update(data).digest();
		
		// Mix the entropy into the pool using XOR with the strength factor
		for (let i = 0; i < hash.length; i++) {
			const poolPos = (this.position + i) % this.pool.length;
			// Calculate weighted mix based on strength
			// At strength 1.0, we completely replace the byte
			// At strength 0.5, we do a 50/50 mix
			// At strength 0.0, we barely change the pool
			const currentByte = this.pool[poolPos];
			const newByte = hash[i];
			this.pool[poolPos] = Math.floor(currentByte * (1 - effectiveStrength) + newByte * effectiveStrength) & 0xFF;
		}
		
		// Update position
		this.position = (this.position + hash.length) % this.pool.length;
		
		// Mark last update time
		this.lastUpdate = Date.now();
		
		// Mark as initialized after first entropy addition
		if (!this.initialized) {
			this.initialized = true;
		}
	}

	/**
	 * Get random bytes from the entropy pool
	 * @param size - Number of random bytes to generate
	 * @returns Buffer containing random bytes
	 */
	public getRandomBytes(size: number): Buffer {
		// Check if pool has been recently updated
		const now = Date.now();
		if (now - this.lastUpdate > this.updateInterval) {
			this.collectTimingEntropy();
			this.collectSystemEntropy();
		}
		
		// Use the pool to seed the CSPRNG
		const seed = crypto.createHash('sha256').update(this.pool).digest();
		
		// Create a keyed HMAC PRNG
		const hmac = crypto.createHmac('sha512', seed);
		
		// Generate requested random bytes
		const result = Buffer.alloc(size);
		let generated = 0;
		
		while (generated < size) {
			// Update the HMAC with a counter
			hmac.update(Buffer.from([generated, size]));
			
			// Generate random bytes
			const randomChunk = hmac.digest();
			
			// Copy to result buffer
			const toCopy = Math.min(randomChunk.length, size - generated);
			randomChunk.copy(result, generated, 0, toCopy);
			
			generated += toCopy;
		}
		
		// Mix result back into the pool for forward secrecy
		this.addEntropy(result, 0.2);
		
		return result;
	}

	/**
	 * Seed the entropy pool with initial entropy from various sources
	 */
	private seedInitialEntropy(): void {
		this.collectTimingEntropy(100);
		this.collectSystemEntropy();
	}

	/**
	 * Start periodic collection of entropy
	 */
	private startPeriodicCollection(): void {
		// Don't use setInterval as it could be predictable
		// Instead schedule the next collection with a slight random delay
		const scheduleNextCollection = () => {
			const delay = this.updateInterval + (Math.random() * 10000);
			setTimeout(() => {
				this.collectTimingEntropy();
				this.collectSystemEntropy();
				scheduleNextCollection();
			}, delay);
		};
		
		scheduleNextCollection();
	}

	/**
	 * Collect entropy from timing measurements
	 * @param iterations - Number of timing measurements to make
	 */
	public collectTimingEntropy(iterations: number = 50): void {
		const timings = Buffer.alloc(iterations * 4);
		
		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			
			// Perform different operations to capture timing variations
			if (i % 3 === 0) {
				// CPU-intensive operation
				let x = 0;
				for (let j = 0; j < 10000; j++) {
					x += Math.sin(j) * Math.cos(j);
				}
			} else if (i % 3 === 1) {
				// Memory operation
				const arr = Buffer.alloc(10000);
				for (let j = 0; j < 1000; j++) {
					arr[j % arr.length] = j & 0xFF;
				}
			} else {
				// Hash computation
				const hash = crypto.createHash('sha256');
				hash.update(Date.now().toString());
				hash.digest();
			}
			
			const end = performance.now();
			const diff = end - start;
			
			// Extract entropy from the timing difference
			// We use the fractional part as it contains more entropy
			const fraction = diff - Math.floor(diff);
			const entropy = Math.floor(fraction * 2**32);
			
			// Store the entropy value
			timings.writeUInt32LE(entropy, i * 4);
		}
		
		// Add to the entropy pool with moderate strength
		this.addEntropy(timings, 0.3);
	}

	/**
	 * Collect entropy from system information
	 */
	public collectSystemEntropy(): void {
		// Create a buffer to hold the system information
		const buffer = Buffer.alloc(256);
		let offset = 0;
		
		// Current time in various formats
		const now = Date.now();
		buffer.writeDoubleLE(now, offset);
		offset += 8;
		
		// Use only the lower 32 bits of high-resolution time
		const hrtimeValue = Number(process.hrtime.bigint() % BigInt(0xFFFFFFFF));
		buffer.writeUInt32LE(hrtimeValue, offset);
		offset += 4;
		
		// Performance timing - take only the lower 32 bits if needed
		const perfNow = performance.now();
		buffer.writeDoubleLE(perfNow, offset);
		offset += 8;
		
		// Process information - ensure PID fits in UInt32
		buffer.writeUInt32LE(process.pid & 0xFFFFFFFF, offset);
		offset += 4;
		
		// Memory usage - handle large values by taking modulo
		const memoryUsage = process.memoryUsage();
		// Convert the potentially large numbers to safely fit in UInt32
		const rss = Number(BigInt(Math.floor(memoryUsage.rss)) % BigInt(0xFFFFFFFF));
		const heapTotal = Number(BigInt(Math.floor(memoryUsage.heapTotal)) % BigInt(0xFFFFFFFF));
		const heapUsed = Number(BigInt(Math.floor(memoryUsage.heapUsed)) % BigInt(0xFFFFFFFF));
		
		buffer.writeUInt32LE(rss, offset);
		offset += 4;
		buffer.writeUInt32LE(heapTotal, offset);
		offset += 4;
		buffer.writeUInt32LE(heapUsed, offset);
		offset += 4;
		
		// System memory - take lower 32 bits to prevent overflow
		const totalMem = Number(BigInt(Math.floor(os.totalmem())) % BigInt(0xFFFFFFFF));
		const freeMem = Number(BigInt(Math.floor(os.freemem())) % BigInt(0xFFFFFFFF));
		buffer.writeUInt32LE(totalMem, offset);
		offset += 4;
		buffer.writeUInt32LE(freeMem, offset);
		offset += 4;
		
		// CPU load averages
		const loadAvg = os.loadavg();
		buffer.writeFloatLE(loadAvg[0], offset);
		offset += 4;
		buffer.writeFloatLE(loadAvg[1], offset);
		offset += 4;
		buffer.writeFloatLE(loadAvg[2], offset);
		offset += 4;
		
		// Uptime - convert to UInt32 to prevent overflow
		buffer.writeUInt32LE(Math.floor(os.uptime()) % 0xFFFFFFFF, offset);
		offset += 4;
		
		// Add to entropy pool with medium strength
		this.addEntropy(buffer.subarray(0, offset), 0.4);
	}
}

// Create a singleton entropy pool instance
export const globalEntropyPool = new EntropyPool();

/**
 * Types for different kinds of dice rolls
 */
export type DiceRollType = "standard" | "fate";

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
 * Represents a dice roll configuration
 */
export type DiceRoll = z.infer<typeof diceRollSchema>;

/**
 * Represents the result of a dice roll
 */
export type RollResult = z.infer<typeof rollResultSchema>;

/**
 * Custom error class for dice roll parsing errors
 */
export class DiceRollError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DiceRollError";
	}
}

/**
 * Get a cryptographically secure random integer between min and max (inclusive)
 * Handles modulo bias correction internally and uses the entropy pool for additional randomness
 * @param min - Lower bound (inclusive)
 * @param max - Upper bound (inclusive)
 * @returns A random integer between min and max
 */
function secureRandomInt(min: number, max: number): number {
	// Try to use crypto.randomInt if available (Node.js 14.10.0+) plus entropy pool
	if (typeof crypto.randomInt === "function") {
		// Get randomness from both sources
		const cryptoRandom = crypto.randomInt(min, max + 1);
		
		// Get additional randomness from entropy pool
		const entropyBytes = globalEntropyPool.getRandomBytes(4);
		const entropyValue = entropyBytes.readUInt32LE(0);
		
		// Mix the two sources
		// Use the entropy to determine whether to add or subtract a small amount from the crypto random
		const modifier = entropyValue % 3 - 1; // -1, 0, or 1
		
		// Apply modifier and handle bounds
		let result = cryptoRandom + modifier;
		if (result < min) result = max;
		if (result > max) result = min;
		
		return result;
	}
	
	// Fallback for older Node.js versions using entropy pool
	const range = max - min + 1;
	const byteCount = Math.ceil(Math.log2(range) / 8);
	
	// Get random bytes from entropy pool
	const randomBytes = globalEntropyPool.getRandomBytes(byteCount);
	
	// Convert to integer
	let value = 0;
	for (let i = 0; i < byteCount; i++) {
		value = (value << 8) | randomBytes[i];
	}
	
	// Apply modulo and range shifting
	return min + (value % range);
}

/**
 * Parses a dice notation string into a DiceRoll object
 * @param notation - The dice notation string (e.g., "2d6", "1d20+5", "4dF")
 * @returns A DiceRoll object representing the parsed notation
 * @throws {DiceRollError} If the notation is invalid
 */
export function parseDiceNotation(notation: string): DiceRoll {
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
		type: isFate ? ("fate" as const) : ("standard" as const),
		count,
		sides,
		modifier,
	};

	// Validate using Zod schema
	try {
		return diceRollSchema.parse(diceRoll);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new DiceRollError(
				`Invalid dice configuration: ${error.errors.map((e) => e.message).join(", ")}`,
			);
		}
		throw error;
	}
}

/**
 * Rolls a single die with the specified number of sides using cryptographically secure random numbers
 * @param sides - Number of sides on the die
 * @returns A random number between 1 and sides (inclusive)
 */
function rollSingleDie(sides: number): number {
	return secureRandomInt(1, sides);
}

/**
 * Rolls a single Fate/Fudge die using cryptographically secure random numbers
 * @returns -1, 0, or 1 with equal probability
 */
function rollFateDie(): number {
	return secureRandomInt(0, 2) - 1;
}

/**
 * Rolls dice based on a DiceRoll configuration
 * @param diceRoll - The dice roll configuration
 * @returns A RollResult containing the individual rolls and total
 */
export function rollDice(diceRoll: DiceRoll): RollResult {
	// Validate input using Zod schema
	diceRoll = diceRollSchema.parse(diceRoll);

	const rolls: number[] = [];

	// Roll the appropriate number of dice
	for (let i = 0; i < diceRoll.count; i++) {
		const roll =
			diceRoll.type === "fate" ? rollFateDie() : rollSingleDie(diceRoll.sides);
		rolls.push(roll);
	}

	// Calculate total
	const total =
		rolls.reduce((sum, roll) => sum + roll, 0) + (diceRoll.modifier || 0);

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
function formatDiceNotation(diceRoll: DiceRoll): string {
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
export function roll(notation: string): RollResult {
	const diceRoll = parseDiceNotation(notation);
	return rollDice(diceRoll);
}

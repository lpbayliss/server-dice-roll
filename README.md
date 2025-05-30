# server-dice-roll

A Model Context Protocol (MCP) server for simulating dice rolls with support for standard dice notation and Fate/Fudge dice.

## Features

- **Dice Notation Parsing**: Parse standard dice notation strings like `2d6`, `1d20+5`, or `4dF`
- **Multiple Dice Types**: Support for both standard dice and Fate/Fudge dice
- **Random Rolling**: Generate truly random dice rolls with accurate probability distributions
- **Validation**: Full input and output validation using Zod schemas
- **MCP Integration**: Seamlessly integrates with any MCP-compatible client like Claude Desktop

## Usage

This MCP server provides two main tools:

### 1. Parse Dice Notation

Parses a dice notation string and returns the structured representation.

```
parse_dice_roll_notation
  input: { notation: "3d6+4" }
  output: { type: "standard", count: 3, sides: 6, modifier: 4 }
```

### 2. Roll Dice

Rolls dice based on a dice roll configuration and returns the results.

```
dice_roll
  input: { type: "standard", count: 3, sides: 6, modifier: 4 }
  output: { rolls: [5, 2, 6], total: 17, original: "3d6+4" }
```

## Installation and Setup

### Using with Claude Desktop

Add this server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "dice": {
      "command": "npx",
      "args": ["-y", "server-dice-roll"]
    }
  }
}
```

### Using with npm/npx

```bash
# Install globally
npm install -g server-dice-roll

# Run the server
mcp-server-dice-roll

# Or run directly with npx
npx server-dice-roll
```

## Understanding Dice Notation

Dice notation is a system used in tabletop role-playing games to represent different dice rolls.

### Standard Notation

The standard format is `NdS+M` where:
- `N` is the number of dice to roll (optional, defaults to 1)
- `d` indicates a die roll
- `S` is the number of sides on each die
- `+M` is a modifier to add to the total (optional)

Examples:
- `d6` - Roll one 6-sided die
- `2d10` - Roll two 10-sided dice and sum the results
- `3d8+5` - Roll three 8-sided dice, sum the results, and add 5

### Fate/Fudge Dice

Fate dice (also known as Fudge dice) are special 6-sided dice with values of -1, 0, and +1 (two sides each).

Format: `NdF` where:
- `N` is the number of dice to roll
- `dF` indicates Fate dice

Example:
- `4dF` - Roll four Fate dice (results in values between -4 and +4)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Author

Created by Luke Bayliss <hello@lukebayliss.com>

## Release Process

This project uses a single integrated workflow for versioning, releases, and publishing:

1. **Version Bump Labels**: Each PR to the main branch should include exactly one version bump label:
   - `patch` - For backwards-compatible bug fixes
   - `minor` - For backwards-compatible new features
   - `major` - For breaking changes
   - If no label is specified, `patch` is applied by default

2. **Sequential Workflow**: The integrated Release and Publish workflow consists of three sequential jobs:
   - **Job 1: Version Bump** - Updates version in package.json and creates a git tag
   - **Job 2: Release Creation** - Creates a GitHub release with changelog
   - **Job 3: Publish** - Publishes the package to npm

3. **Automated Triggers**: The workflow runs automatically in these scenarios:
   - When a PR is merged to main (using the PR's version label)
   - When changes are pushed directly to main (using patch version)
   - When manually triggered via GitHub Actions
   - When a tag is manually pushed (skips version bump, only creates release and publishes)

All these steps run in a coordinated workflow with proper dependencies to ensure reliability.

### PR Requirements

All PRs should include exactly one version bump label (`patch`, `minor`, or `major`). If no label is specified, the system will automatically add the `patch` label as the default. PRs with multiple version labels will still be blocked from merging.

### Manual Versioning

To manually trigger a version bump without creating a PR:
1. Go to Actions > Version Bump workflow
2. Click "Run workflow"
3. Select the branch and bump type (patch, minor, major)
4. Click "Run workflow"

The rest of the process (creating release and publishing) will happen automatically.

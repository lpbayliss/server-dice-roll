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

This project uses automated release workflows based on Pull Requests:

1. **Version Bump Labels**: Each PR to the main branch must include exactly one version bump label:
   - `patch` - For backwards-compatible bug fixes
   - `minor` - For backwards-compatible new features
   - `major` - For breaking changes

2. **Version Bumping**: When a PR is merged to main, the version is automatically bumped according to the PR label.
   - As a safety mechanism, if changes are pushed directly to main (bypassing the PR process), a patch version bump will be triggered automatically.

3. **Release Creation**: When a version is bumped, a GitHub release is automatically created with a changelog based on commit messages.

4. **Package Publishing**: When a GitHub release is created, the package is automatically published to npm.

### PR Requirements

All PRs must include exactly one version bump label (`patch`, `minor`, or `major`). A GitHub Action will check this requirement and block merging if it's not met.

### Manual Versioning

To manually trigger a version bump without creating a PR:
1. Go to Actions > Version Bump workflow
2. Click "Run workflow"
3. Select the branch and bump type (patch, minor, major)
4. Click "Run workflow"

The rest of the process (creating release and publishing) will happen automatically.

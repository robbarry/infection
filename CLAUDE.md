# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a collection of **infectious disease spread simulators** built with p5.js. The simulations visualize how diseases spread through populations under different conditions and policy interventions.

## Running the Simulations

These are client-side JavaScript applications. Open any HTML file directly in a browser:

```bash
open index.html              # Basic infection sim with quarantine drawing
open infection_cities.html   # Multi-city simulation with lockdown/quarantine buttons
open infection_countries.html # Country-level policy simulator (most feature-rich)
```

No build step or server required.

## Architecture

### Three Independent Simulations

Each simulation is self-contained with its own HTML/JS:

1. **Basic Simulation** (`index.html` + `infection.js`)
   - Bouncing dots in a single space
   - User can draw quarantine circles with mouse (scroll to resize, click to place, shift-click to remove)
   - Virus mutations that affect r0, infection duration, severity
   - Parameters configurable via URL query string or form inputs

2. **Cities Simulation** (`infection_cities.html` + `infection_cities.js`)
   - Multiple cities with weighted travel between them
   - Click cities to toggle lockdown
   - Two nationwide interventions: "Shelter In Place" and "Forced Quarantine"
   - Economic output tracking based on movement

3. **Countries Simulation** (`infection_countries.html` + `infection_countries.js` + `infection_countries.css`)
   - Most sophisticated version with full UI
   - Policy archetypes: Open, Moderate, Strict, Zero-COVID
   - Per-country controls: internal movement, border policy, sick traveler handling
   - Output index tracking with policy penalties
   - Daily R_t and new cases displayed in overlay and panel
   - Quarantine zones for incoming infected travelers
   - Dark theme with sidebar and floating policy panel

### Key Concepts Across All Simulations

- **Infection model**: Each person has `infected` counter (0=healthy, >0=infected days, <0=immune days)
- **Latency**: Newly infected people are non-infectious for a short latent period
- **Collision detection**: O(n²) pairwise checks between all people
- **Infection probability**: Daily odds estimated from observed contacts and target r0
- **Boundary physics**: People bounce off walls and circular boundaries using vector reflection

### Dependencies

- `libraries/p5.min.js` - p5.js graphics library
- `js/chance.min.js` - Weighted random selection (used in cities/countries for travel destinations)

## URL Parameters (Basic Simulation)

The basic simulation accepts these query parameters:

```
?population=500&infection_duration=14&immune_duration=40&r0=2.7&testing_speed=10&peep_speed=0.35&initial_infections=1
```

## Code Patterns

### Person/Peep Class Structure
All simulations use similar person classes with:
- `display()` - render based on infection state
- `update()` - move and handle state transitions
- `infect()` - check proximity to others and probabilistically infect
- `check_collision()` - physics for bouncing off others

### Policy System (Countries Simulation)
`CountryPolicy` class encapsulates:
- `internalMovement`: "none" | "partial" | "full"
- `borderPolicy`: "open" | "screening" | "closed"
- `sickTravelerPolicy`: "allow" | "deny" | "quarantine"

GDP calculation applies penalties based on policy restrictiveness.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

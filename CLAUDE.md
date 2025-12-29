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

No build step, server, tests, or linter required.

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

- **Infection model**: Each person has `infected` counter (0=healthy, >0=infected cycles, <0=immune cycles)
- **Disease progression**: Latent period (non-infectious) → Infectious → Immune
- **Collision detection**: O(n²) pairwise checks between all people
- **Infection probability**: Derived from target R0 divided by infectious period and expected contacts
- **Boundary physics**: People bounce off walls and circular boundaries using vector reflection

### Infection State Machine

```
infected == 0  → Susceptible (can be infected)
infected > 0   → Infected (counter increments each cycle)
  - infected <= latent_duration → Not yet infectious
  - infected > latent_duration → Infectious, can spread
  - infected > infection_duration → Transitions to immune
infected < 0   → Immune (counter increments toward 0)
```

### Time System (Countries Simulation)

- `cycles_per_day = 40` - simulation cycles per simulated day
- Daily metrics (R_t, new infections) finalized at `cycle % cycles_per_day === 0`
- R_t estimated as: `(daily_new_infections / avg_infected) * infectious_days`
- Infection odds: `(R0 / infectious_days) / baseline_contacts_per_day`

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
- `check_collision()` / boundary collision - physics for bouncing

### Policy System (Countries Simulation)
`CountryPolicy` class encapsulates:
- `internalMovement`: "none" | "partial" | "full"
- `borderPolicy`: "open" | "screening" | "closed"
- `sickTravelerPolicy`: "allow" | "deny" | "quarantine"

GDP calculation applies penalties based on policy restrictiveness:
- `LOCKDOWN_PENALTY`: none=1.0, partial=0.6, full=0.2
- `BORDER_PENALTY`: open=1.0, screening=0.85, closed=0.5

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create beads issues for anything that needs follow-up
2. **Update issue status** - Close finished work, update in-progress items
3. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
4. **Verify** - All changes committed AND pushed
5. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

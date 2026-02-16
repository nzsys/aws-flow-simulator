# AWS Flow Simulator

## Project Overview
Interactive AWS architecture simulator - drag-and-drop AWS services, connect them, and run simulations for performance/cost/security analysis.

## Tech Stack
- React 19, TypeScript 5.9, Vite 7
- @xyflow/react (React Flow) for flow visualization
- Zustand for state management
- Tailwind CSS 4 for styling
- IndexedDB (via idb) for persistence
- Vitest + Testing Library for tests
- Zod for runtime validation

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Type check + build
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run with coverage report
- `npm run lint` - ESLint check
- `npm run lint:fix` - ESLint auto-fix
- `npm run format` - Prettier format
- `npm run typecheck` - TypeScript type check
- `npm run check` - Full check (typecheck + lint + test)

## Code Rules
- Use `type` instead of `interface` (except DBSchema extends)
- No `any` - use proper types or `unknown`
- All type properties should be `readonly`
- Use branded types for IDs (ArchitectureId, NodeId, EdgeId, SimulationId)
- Validate external data with Zod schemas
- Immutable patterns only - never mutate objects
- Co-locate test files with source (e.g., `engine.test.ts` next to `engine.ts`)
- Files under 800 lines, functions under 50 lines
- 90% minimum test coverage threshold

## Architecture
- `src/types/` - Type definitions and branded types
- `src/lib/constants/` - Service definitions, costs, latencies
- `src/lib/simulation/` - Simulation engine (pure functions)
- `src/lib/validation/` - Compatibility rules, validators
- `src/lib/db/` - IndexedDB schema and operations
- `src/store/` - Zustand stores (architecture, simulation, ui)
- `src/components/` - React components organized by feature
- `src/test/` - Test setup and helpers

## Service Roles
- `flow` services: Part of request flow (Route53, CloudFront, ALB, ECS, etc.)
- `infrastructure` services: VPC, Subnet, SecurityGroup, etc. (excluded from flow simulation)

# Development Workflow & Tooling

Status: `IMPLEMENTED`

## 1. Environment Prerequisites
- Node.js: `>= 20.0.0`
- Package Manager: `npm` (Lockfile: `package-lock.json`)
- Git

---

## 2. Standard Scripts & Commands

All development and test commands are configured in `package.json`:

```bash
# 1. Start backend development server with hot-reload (tsx watcher)
npm run dev

# 2. Start Vite client development server (port 5173 with proxy to :3000)
npm run client

# 3. Build backend TypeScript to dist/
npm run build

# 4. Build Vite client production assets to dist/client/
npm run build:client

# 5. Execute complete automated test suite (Vitest run)
npm test

# 6. Execute Vitest in watch mode for active TDD
npm run test:watch

# 7. Start compiled production server
npm start
```

---

## 3. Configuration Files

### 3.1 TypeScript (`tsconfig.json`)
- Target: `ES2022`
- Module: `NodeNext`
- Module Resolution: `NodeNext`
- JSX: `react-jsx`
- Strict Mode: `true`
- Note: Relative imports in source code must use the `.js` extension (e.g. `import { db } from './repository.js';`) to comply with ESM NodeNext standards.

### 3.2 Bundling (`vite.config.ts`)
- Client Output Directory: `dist/client`
- Proxy Configuration: `/api` requests are proxied to `http://localhost:3000`.

### 3.3 PostCSS & Tailwind
- `postcss.config.js`: Integrates Tailwind CSS and Autoprefixer.
- `tailwind.config.js`: Custom theme extensions, fonts (Inter, JetBrains Mono), and dark mode class strategy.

---

## 4. Verification Workflow for Agents
Before concluding any task or submitting changes, agents must run:
1. `npm run build:client`: Verifies client asset bundling and module resolution.
2. `npm test`: Runs all 11 test suites across 106 tests. Must maintain 100% passing tests.

## [2.2.0](https://github.com/enko/freundebuch2/compare/v2.1.0...v2.2.0) (2025-12-30)

### Features

* **ci:** Add automated deployment to production server ([246232b](https://github.com/enko/freundebuch2/commit/246232be03cc0b2902f5e9918089ad974e3c8daf))

### Bug Fixes

* **ci:** Address code review issues for deployment script ([0b9b858](https://github.com/enko/freundebuch2/commit/0b9b858e42aeaf9c9de204e0a10a389be098c982))

## [2.1.0](https://github.com/enko/freundebuch2/compare/v2.0.0...v2.1.0) (2025-12-30)

### Features

* **frontend:** Add mobile-friendly hamburger menu to navbar ([d1286c2](https://github.com/enko/freundebuch2/commit/d1286c216094f08ee5c23322f2cea59e086ed79e))

### Bug Fixes

* **frontend:** Address code review issues in mobile navbar ([4c155d1](https://github.com/enko/freundebuch2/commit/4c155d1aa2311509e0010062ca17048afa1d81e7))

## [2.0.0](https://github.com/enko/freundebuch2/compare/v1.1.1...v2.0.0) (2025-12-29)

### ⚠ BREAKING CHANGES

* **config:** Existing databases need to be recreated with new names.
Run: pnpm docker:down && docker volume rm freundebuch2_postgres_data

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

### Features

* **docs:** Add Epic 13 for self-service friend pages ([43c0ac1](https://github.com/enko/freundebuch2/commit/43c0ac1caea105b036fe215d67b53939eaa1e8e3))
* **frontend:** Rebrand UI from Personal CRM to Freundebuch ([dd3c1a0](https://github.com/enko/freundebuch2/commit/dd3c1a0a03785c70951db4de59e17db2f74b9db8))

### Miscellaneous Chores

* **config:** Rename database from personal_crm to freundebuch ([cbac65b](https://github.com/enko/freundebuch2/commit/cbac65beb94f760ae645b08fd4d3398895660695))

## [1.1.1](https://github.com/enko/freundebuch2/compare/v1.1.0...v1.1.1) (2025-12-29)

### Bug Fixes

* **backend:** Fix TypeScript build output structure ([67833da](https://github.com/enko/freundebuch2/commit/67833da0bd2a31d167a17c1826023a222c85da3e))

## [1.1.0](https://github.com/enko/freundebuch2/compare/v1.0.0...v1.1.0) (2025-12-29)

### Features

* **database:** Add production-ready migration workflow ([6e0599a](https://github.com/enko/freundebuch2/commit/6e0599a7b6eaaa87ff9e32816f2d724cf4eb0ef8))

## 1.0.0 (2025-12-29)

### Features

* Add Docker production deployment infrastructure ([d468411](https://github.com/enko/freundebuch2/commit/d468411391f0756963075c02db5318308d56d898))
* Add Render.com deployment configuration ([0d12919](https://github.com/enko/freundebuch2/commit/0d129194587833d11b7faebe1c340ca0e13718cc))
* Add semantic-release automation for versioning and releases ([84ca6f2](https://github.com/enko/freundebuch2/commit/84ca6f266b4946653c0e40324a4d7a9e6fcb9e4f))
* **all:** Implement basic setup ([ee4f0e7](https://github.com/enko/freundebuch2/commit/ee4f0e778f5b65830c9296ba9bbaabc9321b3fe4)), closes [#2](https://github.com/enko/freundebuch2/issues/2)
* **backend:** Add cleanup scheduler for expired tokens and sessions ([bd42b07](https://github.com/enko/freundebuch2/commit/bd42b07e9c411d3782ca45f9a4a7e13b122da311))
* **backend:** Add contacts API with CRUD operations and photo upload ([4f2a567](https://github.com/enko/freundebuch2/commit/4f2a56768418f30e286c195ba62a8d253da7a6c8))
* **backend:** Add cookie-based auth for browser image requests ([5d72c2b](https://github.com/enko/freundebuch2/commit/5d72c2bd6d10f4b7674501c9fbfc9c9a4c68c8d4))
* **backend:** Add Epic 1B routes and service methods ([930be4c](https://github.com/enko/freundebuch2/commit/930be4cc48d5bf7a9ad4c0d42f7771910c30209b))
* **backend:** Add Epic 1D database migration and queries ([8a9d3ae](https://github.com/enko/freundebuch2/commit/8a9d3ae3d8ea295097cd7699da0f4977421997a5))
* **backend:** Add Epic 1D relationship routes and service ([c12e9fc](https://github.com/enko/freundebuch2/commit/c12e9fcaa6cda2b61d0825722eb2f4a5eea97cdb))
* **backend:** Add PgTyped queries for Epic 1B extended fields ([ee5295d](https://github.com/enko/freundebuch2/commit/ee5295d23af1fabb75987ed86eb1404d82b99d43))
* **backend:** Add photo serving endpoint and rate limiting ([7ad5657](https://github.com/enko/freundebuch2/commit/7ad565700647d1e1330ae3b70a357a59e6e5dea8))
* **backend:** Add rate limiting to auth endpoints ([cae6a2e](https://github.com/enko/freundebuch2/commit/cae6a2ec8ffe5176a5f3ce72d018d98f51fd11e7))
* **contacts:** Add database schema and shared types for Epic 1A ([4c690bd](https://github.com/enko/freundebuch2/commit/4c690bd1a92067591290d76da7bd8efe37bc5d30))
* **database:** Add Epic 1B extended contact fields schema ([ebf7590](https://github.com/enko/freundebuch2/commit/ebf75905d4bd4b77842f6b7b73683de95d52f46f))
* **database:** Move contacts tables to dedicated schema ([ffc7db2](https://github.com/enko/freundebuch2/commit/ffc7db27d8b9d1f8d3a7cd0c6aafcf5277168687))
* **frontend:** Add contacts UI with CRUD operations ([b16852f](https://github.com/enko/freundebuch2/commit/b16852fe681e89698212b1ece9b97f4aaddf81d6))
* **frontend:** Add Epic 1B API client and store methods ([41d6d1a](https://github.com/enko/freundebuch2/commit/41d6d1a5066e905e7f8f2d3add5dc5f5546f80a4))
* **frontend:** Add Epic 1B UI components for extended contact fields ([73c653a](https://github.com/enko/freundebuch2/commit/73c653a1f42e28b8e4f80de080c0a542ceb41299))
* **frontend:** Add Epic 1D API client and store methods ([eedc445](https://github.com/enko/freundebuch2/commit/eedc4450d92f381c03f15f234c026beb2e7ab97c))
* **frontend:** Add Epic 1D UI components for relationships ([84df10d](https://github.com/enko/freundebuch2/commit/84df10d3e546765ac78a14766bd5b6c9cac196cf))
* **frontend:** Add keyboard shortcuts and quick actions ([b35867c](https://github.com/enko/freundebuch2/commit/b35867c74fc4c5e71ff561b80a1e05dffeecb278))
* **frontend:** Add page titles to all routes ([482cb8c](https://github.com/enko/freundebuch2/commit/482cb8cb0d967b8651cdf760cf5ed9902036ca48))
* **frontend:** Add photo upload to contact form ([5020837](https://github.com/enko/freundebuch2/commit/50208376880c6b5f29a433a4ddf294a21bf09677))
* **frontend:** Switch to static adapter for single-domain deployment ([83e660e](https://github.com/enko/freundebuch2/commit/83e660ead613596f2579dbcbe7458e7b3c97ce75))
* implement authentication ([5771cc6](https://github.com/enko/freundebuch2/commit/5771cc679f3722cfded482ac78a02a7eb9c4d4db)), closes [#7](https://github.com/enko/freundebuch2/issues/7)
* Remove Render.com deployment configuration ([3f01e40](https://github.com/enko/freundebuch2/commit/3f01e401e1524515e7b45d1e9fcc0f53827182fd))
* **shared:** Add Epic 1B extended contact field types ([1085f0a](https://github.com/enko/freundebuch2/commit/1085f0a65f4bd87eb334a2a0d18c71092e360f72))
* **shared:** Add Epic 1D relationship types and schemas ([2e5477e](https://github.com/enko/freundebuch2/commit/2e5477e32974859cbd1ead1859519f01b43cd574))
* **shared:** Add photo validation schemas and types ([bb22d46](https://github.com/enko/freundebuch2/commit/bb22d463d1027a910687aa56fa96abc03cf068bc))
* **shared:** Add primary field validation to contact schema ([2319b04](https://github.com/enko/freundebuch2/commit/2319b04de02553a179d56235267e370dd7940ec4))
* **shared:** Improve input validation with proper validators ([6579611](https://github.com/enko/freundebuch2/commit/6579611eda6dfbca0d40d39ef38ccbfad8156dfc))
* update claude code review prompt ([fa57659](https://github.com/enko/freundebuch2/commit/fa57659b45b866c28486a583afdab29c86875c82))
* update claude code review prompt ([8fe3869](https://github.com/enko/freundebuch2/commit/8fe3869aa8830a774fb7fe01129cc53949edd7cd))

### Bug Fixes

* **backend:** Add path traversal protection to file upload routes ([5144fb0](https://github.com/enko/freundebuch2/commit/5144fb0d7459645a798d3ec96addefed63d505aa))
* **backend:** Add UUID validation and photo cleanup for contact routes ([068e664](https://github.com/enko/freundebuch2/commit/068e6649e74fd80466eba67b96769ac22a8253b2))
* **backend:** Exclude dist directory from test runner ([5f94876](https://github.com/enko/freundebuch2/commit/5f94876b1b0b4919fc063e875dace460bd807d0f))
* **backend:** Improve type safety and fix photo upload race condition ([eb7429e](https://github.com/enko/freundebuch2/commit/eb7429e02c5e5f0703356065f21f1343ac761c70))
* **backend:** Prevent password reset token exposure in production ([dd7dd5a](https://github.com/enko/freundebuch2/commit/dd7dd5ac027cb0091e8518fee1099548b75ef621))
* **backend:** Set Cross-Origin-Resource-Policy to cross-origin globally ([3ac062d](https://github.com/enko/freundebuch2/commit/3ac062d1f9bf744f2f9279077fec0b3248030a68))
* **backend:** Update tests for BACKEND_URL configuration ([5da4c07](https://github.com/enko/freundebuch2/commit/5da4c0798c84759404e6f6c1f816a3ac3b49b057))
* **build:** Fix build errors in backend and frontend ([8381ad0](https://github.com/enko/freundebuch2/commit/8381ad0b14370242df3285af22c96f3fccccddbf))
* **config:** Add node_modules volumes for Docker development ([aee95dc](https://github.com/enko/freundebuch2/commit/aee95dc970d9eae3fb64aa197f1f5c2a89173681))
* **config:** Allow semantic-release commits in commitlint ([74745b6](https://github.com/enko/freundebuch2/commit/74745b60745608f32af8d0154c416cc38b7e3bd5))
* **config:** Build shared package before other workspaces ([5a90096](https://github.com/enko/freundebuch2/commit/5a9009609b849d51aaf5cb7bbb14c073b758f43e))
* **frontend:** Fix $shared alias to point to compiled dist ([6343359](https://github.com/enko/freundebuch2/commit/634335982f27aea967d84898e88274b21cb2699a))
* **frontend:** Improve contacts UI and fix auth initialization ([d814e82](https://github.com/enko/freundebuch2/commit/d814e820e6482224917f8304d3b07eae7075fc8f))
* **frontend:** Properly update existing dates and social profiles ([3e19dfa](https://github.com/enko/freundebuch2/commit/3e19dfa8ddd0685a55acc6a3e3557d2ac9cb13cb))
* **shared:** Allow social profiles with only username ([d9c3439](https://github.com/enko/freundebuch2/commit/d9c3439623496723a96d8dcbdb86689455acb443))

### Performance Improvements

* **backend:** Optimize contact queries to reduce database round-trips ([a050c21](https://github.com/enko/freundebuch2/commit/a050c21329fff1ccb35decdf2f309c913986d681))

### Code Refactoring

* **backend:** Centralize session and cookie configuration ([a542c0c](https://github.com/enko/freundebuch2/commit/a542c0c83f5a9bd23edac59595124fa251693963))

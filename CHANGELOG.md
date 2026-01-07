## [2.20.2](https://github.com/datenknoten/freundebuch/compare/v2.20.1...v2.20.2) (2026-01-07)

### Bug Fixes

* **backend:** Add silent log level for test environments ([f897d48](https://github.com/datenknoten/freundebuch/commit/f897d48522e3660af3a397812c20fbbc6b1ffb1b))
* **backend:** Silence noisy output during integration tests ([001ea0e](https://github.com/datenknoten/freundebuch/commit/001ea0ec76365b4a802e113434467a15c92c5b61))

## [2.20.1](https://github.com/datenknoten/freundebuch/compare/v2.20.0...v2.20.1) (2026-01-07)

### Bug Fixes

* **config:** Prevent lint-staged from passing file args to build commands ([69db1c3](https://github.com/datenknoten/freundebuch/commit/69db1c37cf63c9fe2eb1c7d70013f16efe2ded39))
* **frontend:** resolve Svelte 5 build warnings ([eda5688](https://github.com/datenknoten/freundebuch/commit/eda56884285dced1502dd00c2ba93e76a02d65bb))

## [2.20.0](https://github.com/datenknoten/freundebuch/compare/v2.19.0...v2.20.0) (2026-01-07)

### Features

* **frontend:** improve keyboard shortcuts with persistent panels and quick open ([903114f](https://github.com/datenknoten/freundebuch/commit/903114f081f411519c76681a333ad36e5839351b))

## [2.19.0](https://github.com/datenknoten/freundebuch/compare/v2.18.0...v2.19.0) (2026-01-07)

### Features

* **frontend:** integrate logo across favicon, navbar, and landing page ([934fdaf](https://github.com/datenknoten/freundebuch/commit/934fdafb6e29125a89ca3cbb0bccd52c0b7cdb54))

## [2.18.0](https://github.com/datenknoten/freundebuch/compare/v2.17.1...v2.18.0) (2026-01-07)

### Features

* **frontend:** Add search filter to friends list ([129b9c4](https://github.com/datenknoten/freundebuch/commit/129b9c47bf36f5e1edbde2a5928e41e24acacb7c))
* **frontend:** Enhance global search dialog ([b12c8f7](https://github.com/datenknoten/freundebuch/commit/b12c8f77b5edc476b8f9b66ed92f432a02e71524))
* **frontend:** Redesign header with user avatar dropdown ([049ed20](https://github.com/datenknoten/freundebuch/commit/049ed20b4510d03381a29ec46644c97ba727c32e))
* **search:** Add full-text search functionality (Epic 10 Phase 1) ([ba168e4](https://github.com/datenknoten/freundebuch/commit/ba168e4eb0b543632c7dc554f6e07692c101375e))

## [2.17.1](https://github.com/datenknoten/freundebuch/compare/v2.17.0...v2.17.1) (2026-01-06)

### Bug Fixes

* **backend:** Fix Sentry Postgres integration and add release version ([c80ae66](https://github.com/datenknoten/freundebuch/commit/c80ae661de7a1d463a401b1eb9c815e414b7ba5a))

## [2.17.0](https://github.com/datenknoten/freundebuch/compare/v2.16.5...v2.17.0) (2026-01-06)

### Features

* **frontend:** Embed fonts locally instead of using Google Fonts ([79fea40](https://github.com/datenknoten/freundebuch/commit/79fea4082ef3ca128d1c34d148bfc995f995890c))

## [2.16.5](https://github.com/datenknoten/freundebuch/compare/v2.16.4...v2.16.5) (2026-01-06)

### Bug Fixes

* **backend:** Also exclude /health endpoint from Sentry tracing ([3c257ba](https://github.com/datenknoten/freundebuch/commit/3c257ba61a6483b8c4e60beada8d5a3aa5f447ad))
* **backend:** Exclude sentry-tunnel route from Sentry tracing ([d52d0c8](https://github.com/datenknoten/freundebuch/commit/d52d0c8630e3856cc706bb9c471c3697e460d615))

## [2.16.4](https://github.com/datenknoten/freundebuch/compare/v2.16.3...v2.16.4) (2026-01-05)

### Bug Fixes

* **backend:** convert migration to typescript ([65cc327](https://github.com/datenknoten/freundebuch/commit/65cc327b31837bc00baeb49ffd9b319977ef5d10))

## [2.16.3](https://github.com/datenknoten/freundebuch/compare/v2.16.2...v2.16.3) (2026-01-05)

### Reverts

* **backend:** Remove sentry debug code ([fc21b13](https://github.com/datenknoten/freundebuch/commit/fc21b138a531f2567766f159c447c808d417297c))

## [2.16.2](https://github.com/datenknoten/freundebuch/compare/v2.16.1...v2.16.2) (2026-01-05)

### Bug Fixes

* **backend:** Add sentry debug code ([d2e1f95](https://github.com/datenknoten/freundebuch/commit/d2e1f95b9cec587537333a84d703f0fafe9585b2))

## [2.16.1](https://github.com/datenknoten/freundebuch/compare/v2.16.0...v2.16.1) (2026-01-05)

### Bug Fixes

* **frontend:** Prevent landing page flash for authenticated users ([847cdf3](https://github.com/datenknoten/freundebuch/commit/847cdf35fd615a6ff40180ae7813dcc83bdc9499))

## [2.16.0](https://github.com/datenknoten/freundebuch/compare/v2.15.1...v2.16.0) (2026-01-05)

### Features

* **dx:** Add lint-staged for efficient pre-commit checks ([93c45dc](https://github.com/datenknoten/freundebuch/commit/93c45dced803553ef30ff5058d7e9a03db71e62e))

## [2.15.1](https://github.com/datenknoten/freundebuch/compare/v2.15.0...v2.15.1) (2026-01-05)

### Bug Fixes

* **backend:** Improve error logging and Sentry integration ([1b848c6](https://github.com/datenknoten/freundebuch/commit/1b848c604c4ad6c815253833b67b843387a64a45))

## [2.15.0](https://github.com/datenknoten/freundebuch/compare/v2.14.0...v2.15.0) (2026-01-05)

### Features

* **ci:** Pass explicit version to deploy script ([af1c0d5](https://github.com/datenknoten/freundebuch/commit/af1c0d5c8de412c6972db4cd3f194a6c7ace93e6))

## [2.14.0](https://github.com/datenknoten/freundebuch/compare/v2.13.0...v2.14.0) (2026-01-04)

### Features

* **frontend:** Add inline subresource editing on contact detail page ([4d1f8da](https://github.com/datenknoten/freundebuch/commit/4d1f8da524569656ef558da8140ce387b74b3c51))

### Code Refactoring

* **frontend:** Reorganize contact detail page layout for clarity ([42213fa](https://github.com/datenknoten/freundebuch/commit/42213fad4e4ae1416471d701be8bccb7ab940786))

## [2.13.0](https://github.com/datenknoten/freundebuch/compare/v2.12.0...v2.13.0) (2026-01-04)

### Features

* **backend:** Add address lookup service and routes ([d2dd241](https://github.com/datenknoten/freundebuch/commit/d2dd241ce07a41449e3f2d9db84c6eafdb962385))
* **backend:** Add arktype validation for cache deserialization ([18e422f](https://github.com/datenknoten/freundebuch/commit/18e422f4b9a2cbe1064de27a0c67a92ff6c9bf41))
* **backend:** Add cache utility and address API configuration ([8e5043f](https://github.com/datenknoten/freundebuch/commit/8e5043fccba00fac9f4fe0edf521d79766819239))
* **backend:** Add external API clients for address lookup ([996f3b9](https://github.com/datenknoten/freundebuch/commit/996f3b94b0ee9bff3c72bbf5e2bfed91354061a0))
* **frontend:** Add address lookup API client ([9a0e5a6](https://github.com/datenknoten/freundebuch/commit/9a0e5a669d958602cc6eeb4c8627891da77928ce))
* **frontend:** Add hierarchical address input components ([500cb6c](https://github.com/datenknoten/freundebuch/commit/500cb6cd4ab68eb42d26096d4c52963771f5d6df))
* **frontend:** Integrate hierarchical address input in ContactForm ([b29f14d](https://github.com/datenknoten/freundebuch/commit/b29f14d5a843dfd728d3afeccb455af0828f0e6d))
* **shared:** Add address lookup types ([8683ddf](https://github.com/datenknoten/freundebuch/commit/8683ddfe8efedd124ad4fed22175ce5769957168))

### Bug Fixes

* **backend:** Address code review issues for address lookup ([d896393](https://github.com/datenknoten/freundebuch/commit/d89639365f73d998b1f25f51941547998a260ffb))
* **backend:** Address follow-up code review issues for address caching ([45fd4a6](https://github.com/datenknoten/freundebuch/commit/45fd4a6b41fce88a1f8bc209e474b62417a3aa36))
* **backend:** Use system schema for address_cache table and add integration tests ([fadf202](https://github.com/datenknoten/freundebuch/commit/fadf20285aa2880bf1b393fd9ca5662127d15684))

## [2.12.0](https://github.com/datenknoten/freundebuch/compare/v2.11.0...v2.12.0) (2026-01-03)

### Features

* **all:** Use depot runner ([cfbd063](https://github.com/datenknoten/freundebuch/commit/cfbd063a82f2f9b150aa45fedd883bce898f1a79))

## [2.11.0](https://github.com/enko/freundebuch2/compare/v2.10.3...v2.11.0) (2026-01-02)

### Features

* **landing:** Reword landing page and add logo placeholder ([0eeb423](https://github.com/enko/freundebuch2/commit/0eeb42327b31b002976ff93f7ebaea9ce78e39f1))

## [2.10.3](https://github.com/enko/freundebuch2/compare/v2.10.2...v2.10.3) (2026-01-02)

### Bug Fixes

* **docker:** Add php8.2-mbstring extension for SabreDAV ([7a4b18a](https://github.com/enko/freundebuch2/commit/7a4b18a9696897048e62a3d3b5f7208c3e7eafc7))
* **docker:** Run database migrations on container startup ([f97bc78](https://github.com/enko/freundebuch2/commit/f97bc786e72188b04902f7763f191b14683deae4))

### Reverts

* Remove automatic migrations from entrypoint ([52b9112](https://github.com/enko/freundebuch2/commit/52b9112e40417e9deb8fc828ddc2989616c96994))

## [2.10.2](https://github.com/enko/freundebuch2/compare/v2.10.1...v2.10.2) (2026-01-02)

### Bug Fixes

* **nginx:** Fix invalid 'access_log off main' syntax ([2aad082](https://github.com/enko/freundebuch2/commit/2aad0821ffa2277bc8a71e9cafa2d263de161c7e))

## [2.10.1](https://github.com/enko/freundebuch2/compare/v2.10.0...v2.10.1) (2026-01-02)

### Performance Improvements

* **docker:** Optimize build with BuildKit cache and .dockerignore ([457dc77](https://github.com/enko/freundebuch2/commit/457dc7797ac1721a2bd9d9e31855214f8a5ba7ec))

## [2.10.0](https://github.com/enko/freundebuch2/compare/v2.9.2...v2.10.0) (2026-01-02)

### Features

* **logging:** Improve logging configuration across all services ([520cbd0](https://github.com/enko/freundebuch2/commit/520cbd008b7c97f97297e8685c6ec0788ad3a7b5))

## [2.9.2](https://github.com/enko/freundebuch2/compare/v2.9.1...v2.9.2) (2026-01-02)

### Bug Fixes

* Enable production logging for PHP and use Pino for HTTP requests ([77e5e0e](https://github.com/enko/freundebuch2/commit/77e5e0e0ea2e8127beb94592af59a21fe83f1ede))

## [2.9.1](https://github.com/enko/freundebuch2/compare/v2.9.0...v2.9.1) (2026-01-02)

### Bug Fixes

* **carddav:** Pass original request URI to SabreDAV ([f8391ba](https://github.com/enko/freundebuch2/commit/f8391baa5a021bcff41994b81a9c7b60b18fc836))

## [2.9.0](https://github.com/enko/freundebuch2/compare/v2.8.3...v2.9.0) (2026-01-02)

### Features

* Add distributed tracing between frontend and backend via Sentry ([de209a9](https://github.com/enko/freundebuch2/commit/de209a924d8dd5ac0f54b7fc65a7f51b6518b3e7))

## [2.8.3](https://github.com/enko/freundebuch2/compare/v2.8.2...v2.8.3) (2026-01-02)

### Bug Fixes

* **frontend:** Remove +page.server.ts incompatible with static adapter ([2ae031d](https://github.com/enko/freundebuch2/commit/2ae031d7f897b2aaa9bea2da0537046a37c0a7fa))

## [2.8.2](https://github.com/enko/freundebuch2/compare/v2.8.1...v2.8.2) (2026-01-02)

### Bug Fixes

* **frontend:** Add Sentry project slug to Vite config ([ff1b594](https://github.com/enko/freundebuch2/commit/ff1b59421c118ea2befda0aa98caaa532140c9da))

## [2.8.1](https://github.com/enko/freundebuch2/compare/v2.8.0...v2.8.1) (2026-01-02)

### Bug Fixes

* **ci:** Skip git hooks during semantic-release ([e8c3761](https://github.com/enko/freundebuch2/commit/e8c3761f1a6cba0c2c5c61f23293c180d1c87d5b))

## [2.8.0](https://github.com/enko/freundebuch2/compare/v2.7.0...v2.8.0) (2026-01-01)

### Features

* **all:** Add Sentry tunnel to proxy frontend requests through backend ([3639349](https://github.com/enko/freundebuch2/commit/3639349131eb1470f759a499b1c2e9af91756a46))
* **all:** Integrate Sentry error tracking across all layers ([1da1bf1](https://github.com/enko/freundebuch2/commit/1da1bf192c304fa505a52dd74c92613f5bb881c6))

### Bug Fixes

* **backend:** Fix flaky app-passwords test for passwordPrefix assertion ([380f1b8](https://github.com/enko/freundebuch2/commit/380f1b8d81968f6faa90ca0986b870268894ebc5))
* **ci:** Pass Sentry env vars during frontend build ([7934434](https://github.com/enko/freundebuch2/commit/793443449e2bf1f54008fca8b5719292dbf2660c))

## [2.7.0](https://github.com/enko/freundebuch2/compare/v2.6.1...v2.7.0) (2026-01-01)

### Features

* **frontend:** Display app version in footer and mobile menu ([f3e4481](https://github.com/enko/freundebuch2/commit/f3e448166a465557d37a2ec30e2b8ebb6705ae8f))

## [2.6.1](https://github.com/enko/freundebuch2/compare/v2.6.0...v2.6.1) (2026-01-01)

### Bug Fixes

* **config:** Add --ignore-platform-reqs to composer install ([1fa4ff1](https://github.com/enko/freundebuch2/commit/1fa4ff1655b64dbc48c7c7cd7d62a4c893106fdc))

## [2.6.0](https://github.com/enko/freundebuch2/compare/v2.5.0...v2.6.0) (2026-01-01)

### Features

* **all:** Add SabreDAV CardDAV server ([dd3fd74](https://github.com/enko/freundebuch2/commit/dd3fd748d6ba457dcb81ba781902deea739aeea3))
* **backend:** Add app password management API ([22c1452](https://github.com/enko/freundebuch2/commit/22c14524b420db6b87e025ff51f1b7329fd44ff3))
* **config:** Add Docker development infrastructure for CardDAV ([466d4d0](https://github.com/enko/freundebuch2/commit/466d4d0a395068922e6a667a421df2c6ae6cdb4a))
* **config:** Add production Docker config for CardDAV ([dfcf01a](https://github.com/enko/freundebuch2/commit/dfcf01a68a3ed527e04f989c1d88c0baeab3a73d))
* **database:** Add CardDAV support schema ([97a8639](https://github.com/enko/freundebuch2/commit/97a86390ce88537cd0df1f1eac4391002f03fccd))
* **frontend:** Add app password management UI ([0515a99](https://github.com/enko/freundebuch2/commit/0515a99a6446243aac7a56adce1f592da6e9e2d5))

### Bug Fixes

* **all:** Address code review security and data integrity issues ([7cbeee2](https://github.com/enko/freundebuch2/commit/7cbeee2ff9bc51f951422e83d5895e8b8cf6e8be))
* **backend:** Make password length assertion more flexible ([a74b23a](https://github.com/enko/freundebuch2/commit/a74b23a9559df3195bc1acf0a08b00c4b150a509))
* **frontend:** Formating ([ca9b5ca](https://github.com/enko/freundebuch2/commit/ca9b5cab1a95ecd779862a4728eaa0213cf46b7f))

## [2.5.0](https://github.com/enko/freundebuch2/compare/v2.4.0...v2.5.0) (2025-12-31)

### Features

* **frontend:** add cache buster for static assets ([c9cd0c9](https://github.com/enko/freundebuch2/commit/c9cd0c90d1eb5926647254ae2eecd9398ec8af89))

## [2.4.0](https://github.com/enko/freundebuch2/compare/v2.3.2...v2.4.0) (2025-12-31)

### Features

* **all:** Add nickname field to contact model ([2652393](https://github.com/enko/freundebuch2/commit/2652393dbf5aa6f943bcdd0b6d5c299a4ab07817))

## [2.3.2](https://github.com/enko/freundebuch2/compare/v2.3.1...v2.3.2) (2025-12-30)

### Bug Fixes

* **navbar:** make navbar fixed at top for mobile and desktop ([d87293c](https://github.com/enko/freundebuch2/commit/d87293ca1a9e8ac4a62026676a087233cf53b9ff))

## [2.3.1](https://github.com/enko/freundebuch2/compare/v2.3.0...v2.3.1) (2025-12-30)

### Bug Fixes

* **ci:** make attestation steps conditional on public visibility ([d29f8fb](https://github.com/enko/freundebuch2/commit/d29f8fb9874879af379dd5afe60a936d59a78ba6))
* **mobile:** lock viewport and prevent horizontal overflow ([b82148b](https://github.com/enko/freundebuch2/commit/b82148bbe422e932b9b39eb3228f384d02bd584c))

## [2.3.1](https://github.com/enko/freundebuch2/compare/v2.3.0...v2.3.1) (2025-12-30)

### Bug Fixes

* **ci:** make attestation steps conditional on public visibility ([d29f8fb](https://github.com/enko/freundebuch2/commit/d29f8fb9874879af379dd5afe60a936d59a78ba6))

## [2.3.0](https://github.com/enko/freundebuch2/compare/v2.2.2...v2.3.0) (2025-12-30)

### Features

* **ci:** Add supply chain protection with provenance attestations ([d0d193e](https://github.com/enko/freundebuch2/commit/d0d193e7731cb3532da538a973234f45ad17aa71))

## [2.2.2](https://github.com/enko/freundebuch2/compare/v2.2.1...v2.2.2) (2025-12-30)

### Code Refactoring

* **ci:** replace ssh-action with script-based deployment ([af052e1](https://github.com/enko/freundebuch2/commit/af052e137f242204b551c6271c6882d9b894b3a0))

## [2.2.1](https://github.com/enko/freundebuch2/compare/v2.2.0...v2.2.1) (2025-12-30)

### Bug Fixes

* **all:** Trigger build ([da47bab](https://github.com/enko/freundebuch2/commit/da47babdb1988b5eba092bc9d31fb650c6516d82))

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

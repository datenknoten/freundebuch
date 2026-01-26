## [2.56.0](https://github.com/datenknoten/freundebuch/compare/v2.55.1...v2.56.0) (2026-01-26)

### Features

* **frontend:** Restore inline add buttons to section headers ([a95390d](https://github.com/datenknoten/freundebuch/commit/a95390dac05b9d97b1a16464985874814eacb039))

## [2.55.1](https://github.com/datenknoten/freundebuch/compare/v2.55.0...v2.55.1) (2026-01-26)

### Bug Fixes

* **frontend:** Fix mobile UI issues on friend detail page ([0bc8d7a](https://github.com/datenknoten/freundebuch/commit/0bc8d7a181eca7ac4d98190d37504262dd526568))

## [2.55.0](https://github.com/datenknoten/freundebuch/compare/v2.54.2...v2.55.0) (2026-01-26)

### Features

* **frontend:** Add mobile FAB and desktop dropdown for adding subresources ([d342a31](https://github.com/datenknoten/freundebuch/commit/d342a3158afc1c3177c8542b2c364364020da93e))

### Bug Fixes

* **frontend:** Add guard clause to focus trap in MobileAddDetailModal ([5357fa8](https://github.com/datenknoten/freundebuch/commit/5357fa843eeb7b8ce85135f345bfda13b9e899c4))
* **frontend:** Respect prefers-reduced-motion for slide-up animation ([4d33f73](https://github.com/datenknoten/freundebuch/commit/4d33f738e6966595a091c450480cee50e2c6a63b))

## [2.54.2](https://github.com/datenknoten/freundebuch/compare/v2.54.1...v2.54.2) (2026-01-26)

### Bug Fixes

* **database:** Add unique index for concurrent materialized view refresh ([b82e5c1](https://github.com/datenknoten/freundebuch/commit/b82e5c1d19930786ef6a828ddbcfc37c8aadef58))

## [2.54.1](https://github.com/datenknoten/freundebuch/compare/v2.54.0...v2.54.1) (2026-01-26)

### Bug Fixes

* **ci:** Use heredoc for psql variable interpolation in OSM import ([1982129](https://github.com/datenknoten/freundebuch/commit/1982129288516872771257f3d32caaf251979d14))

## [2.54.0](https://github.com/datenknoten/freundebuch/compare/v2.53.0...v2.54.0) (2026-01-26)

### Features

* **backend:** Add OSM import scripts for address data ([2058080](https://github.com/datenknoten/freundebuch/commit/20580802cf335f03a8f2983100dbbd34842d5a0f))
* **backend:** Integrate PostGIS address client with Overpass fallback ([63ae1ad](https://github.com/datenknoten/freundebuch/commit/63ae1ad4565cd4372d7ad8841cdd4397e139315b))
* **ci:** Add osm-import Docker image to release workflow ([3316e05](https://github.com/datenknoten/freundebuch/commit/3316e0511c65aaf13e2f84772d8b1299cc3375af))
* **database:** Add geodata schema for PostGIS address autocomplete ([a2cf517](https://github.com/datenknoten/freundebuch/commit/a2cf517fe39d02b6cfd8e80953a232c944046402))
* **database:** Remove conditional PostGIS checks and add integration tests ([bb52ff5](https://github.com/datenknoten/freundebuch/commit/bb52ff50d1290b878b5e18b25d0b7d9084bc65a8))

### Bug Fixes

* **ci:** Fix OSM import Docker build and script issues ([497a1aa](https://github.com/datenknoten/freundebuch/commit/497a1aa96516f4fe2bfc0119a38c07d26b510089))
* **ci:** Use parameterized queries in OSM import script ([046d079](https://github.com/datenknoten/freundebuch/commit/046d0792bd508d18e22b941abbb835f91ec9ad8b))
* **database:** Make geodata migration work without PostGIS ([8db2a94](https://github.com/datenknoten/freundebuch/commit/8db2a9447aa8eb76fe6f05ef1d7f74d985a2fb67))

## [2.53.0](https://github.com/datenknoten/freundebuch/compare/v2.52.0...v2.53.0) (2026-01-19)

### Features

* **frontend:** Add friend name subtitle to relationship modal and translations ([8f98378](https://github.com/datenknoten/freundebuch/commit/8f983788fc15d1f52e3563c5d1c1d128e074197d))
* **frontend:** Add i18n translations for subresource modals and edit forms ([a47983c](https://github.com/datenknoten/freundebuch/commit/a47983cbe562809a34b3e10727bc1df74f04ef0a))

## [2.52.0](https://github.com/datenknoten/freundebuch/compare/v2.51.0...v2.52.0) (2026-01-19)

### Features

* **frontend:** Move language switcher to profile and add missing translations ([70c84e2](https://github.com/datenknoten/freundebuch/commit/70c84e2dfa08f43d6d6a3eb56fcab4cae9fba7cd))

### Bug Fixes

* **frontend:** Use "Freundekreis" instead of "Kreis" in German translations ([502b945](https://github.com/datenknoten/freundebuch/commit/502b94570274ec36982a1d471415210b7e4f4f80))
* **frontend:** Use informal "du" instead of formal "Sie" in German translations ([de918ed](https://github.com/datenknoten/freundebuch/commit/de918ede1d94a8a8b5e4cd531d9760f273e86e45))

## [2.51.0](https://github.com/datenknoten/freundebuch/compare/v2.50.7...v2.51.0) (2026-01-19)

### Features

* **ci:** Add Matrix notification on release workflow failure ([9e7de1d](https://github.com/datenknoten/freundebuch/commit/9e7de1ddf2bb4c8b5c614659535d40a5da56bd4f))

## [2.50.7](https://github.com/datenknoten/freundebuch/compare/v2.50.6...v2.50.7) (2026-01-19)

### Bug Fixes

* **ci:** Capture manifest digest from push output ([ec4687d](https://github.com/datenknoten/freundebuch/commit/ec4687d78ecc50f19760ae44bf31d7ebac911c3d))

## [2.50.6](https://github.com/datenknoten/freundebuch/compare/v2.50.5...v2.50.6) (2026-01-19)

### Bug Fixes

* **ci:** Disable provenance/sbom for individual Docker builds ([30b37a1](https://github.com/datenknoten/freundebuch/commit/30b37a12a4461cf4191d992d77ca6ba1c7b6f642))

## [2.50.5](https://github.com/datenknoten/freundebuch/compare/v2.50.4...v2.50.5) (2026-01-19)

### Bug Fixes

* **ci:** Support ARM builds for both public and private repositories ([8197638](https://github.com/datenknoten/freundebuch/commit/81976386982452336743dca32e61636901a27a08))

## [2.50.4](https://github.com/datenknoten/freundebuch/compare/v2.50.3...v2.50.4) (2026-01-19)

### Bug Fixes

* **all:** Build new release ([4510f2c](https://github.com/datenknoten/freundebuch/commit/4510f2c707595ceab082896b999fa7789ce33262))

## [2.50.3](https://github.com/datenknoten/freundebuch/compare/v2.50.2...v2.50.3) (2026-01-19)

### Performance Improvements

* **ci:** Optimize Docker builds with native ARM runners and improved caching ([84719b5](https://github.com/datenknoten/freundebuch/commit/84719b5a5f2b5560effaf21f20a9955a135cb5a3))

## [2.50.2](https://github.com/datenknoten/freundebuch/compare/v2.50.1...v2.50.2) (2026-01-19)

### Bug Fixes

* **frontend:** Complete i18n translations for remaining components ([f8236ed](https://github.com/datenknoten/freundebuch/commit/f8236edfb0926a8a015730b9b8f1b1c6b64365c3))
* **frontend:** Fix accessibility and reactivity warnings ([5e64cf3](https://github.com/datenknoten/freundebuch/commit/5e64cf34cd2e4c7229b1744bafd06617435cf8d7))
* Resolve Biome linting warnings ([11c72a4](https://github.com/datenknoten/freundebuch/commit/11c72a45986f14014193da2b0f2777171e227bd2))

## [2.50.1](https://github.com/datenknoten/freundebuch/compare/v2.50.0...v2.50.1) (2026-01-19)

### Bug Fixes

* **frontend:** Apply i18n translations to all major pages and components ([25474bb](https://github.com/datenknoten/freundebuch/commit/25474bbc814e299715f07fdda36518977948add4))
* **frontend:** Fix duplicate translation key in CircleEditModal ([b9095a7](https://github.com/datenknoten/freundebuch/commit/b9095a710c18904b92535c33233d6a1c84692c52))
* **frontend:** Use correct singular form for circle preview placeholder ([2664ceb](https://github.com/datenknoten/freundebuch/commit/2664ceb06a2eaf83bbfc9cdd5368fc3366fb9ec9))

## [2.50.0](https://github.com/datenknoten/freundebuch/compare/v2.49.1...v2.50.0) (2026-01-19)

### Features

* **frontend:** Implement i18n with svelte-i18next ([8e48f61](https://github.com/datenknoten/freundebuch/commit/8e48f61dcfbedbd95abaa3229a78b48cd49a4ee6))

### Bug Fixes

* **frontend:** Fix $effect cleanup pattern in LanguageSwitcher ([4d95086](https://github.com/datenknoten/freundebuch/commit/4d95086f1c44fb3c9aecae5bb775c0c448e5cc0c))

## [2.49.1](https://github.com/datenknoten/freundebuch/compare/v2.49.0...v2.49.1) (2026-01-18)

### Code Refactoring

* **backend:** Decompose friends service and routes into focused modules ([e700db8](https://github.com/datenknoten/freundebuch/commit/e700db8174e6273d6cf62ce74a33b197d2ac9c38))

## [2.49.0](https://github.com/datenknoten/freundebuch/compare/v2.48.0...v2.49.0) (2026-01-18)

### Features

* **frontend:** Add keyboard shortcuts for circle management ([54ed1c4](https://github.com/datenknoten/freundebuch/commit/54ed1c40bd4a96be3c010fe87cfc715f0afbbe8c))
* **frontend:** Make keyboard shortcuts help context-sensitive ([3182c7f](https://github.com/datenknoten/freundebuch/commit/3182c7fff1dbbf6b43fbc2cfe39b29e710e406ad))

### Bug Fixes

* **frontend:** Improve CircleEditModal initialization and unsaved changes handling ([12ff176](https://github.com/datenknoten/freundebuch/commit/12ff1765cd076fc6fb89ff8a07b517dedbf2831f))

### Code Refactoring

* **frontend:** Change n to two-key sequence for new items ([4578385](https://github.com/datenknoten/freundebuch/commit/45783857a87fd5dbe225824bd78eec49a026323f))
* **frontend:** Move circle admin to modal with swipe actions ([5602797](https://github.com/datenknoten/freundebuch/commit/5602797d23860e68d9767c5c24e4bece49b64932))

## [2.48.0](https://github.com/datenknoten/freundebuch/compare/v2.47.1...v2.48.0) (2026-01-17)

### Features

* Add maiden name field to friends ([6280336](https://github.com/datenknoten/freundebuch/commit/6280336e51adf25aa5c311b19d6dff95def2963e))

### Bug Fixes

* **backend:** Regenerate pgtyped types for maiden_name field ([20668ea](https://github.com/datenknoten/freundebuch/commit/20668ea4bb561c7943ee27465fca43f3707181b3))
* **database:** Use TEXT instead of VARCHAR for maiden_name ([623c559](https://github.com/datenknoten/freundebuch/commit/623c559c64a937c10f7c217063d19fec38746f62))

## [2.47.1](https://github.com/datenknoten/freundebuch/compare/v2.47.0...v2.47.1) (2026-01-17)

### Bug Fixes

* **frontend:** Debounce URL updates in search to prevent pushState spam ([e708aa5](https://github.com/datenknoten/freundebuch/commit/e708aa5055265af91f051eab92b4592e093c3f81))

## [2.47.0](https://github.com/datenknoten/freundebuch/compare/v2.46.5...v2.47.0) (2026-01-17)

### Features

* Convert professional info to employment history subresource ([1c94fa6](https://github.com/datenknoten/freundebuch/commit/1c94fa60f4baea2c64e881c3616c3ab082059d6a))

## [2.46.5](https://github.com/datenknoten/freundebuch/compare/v2.46.4...v2.46.5) (2026-01-16)

### Bug Fixes

* **backend:** Add partial/prefix matching for display_name in search ([7673565](https://github.com/datenknoten/freundebuch/commit/76735658b73dd9909fe61e4499873dc92b0a4da2))

## [2.46.4](https://github.com/datenknoten/freundebuch/compare/v2.46.3...v2.46.4) (2026-01-16)

### Bug Fixes

* **frontend:** Preserve scroll position during subresource operations ([c3f81d7](https://github.com/datenknoten/freundebuch/commit/c3f81d79949d256e7778b82bab90e7e2b6a28ef7))

## [2.46.3](https://github.com/datenknoten/freundebuch/compare/v2.46.2...v2.46.3) (2026-01-16)

### Code Refactoring

* **frontend:** Separate keyboard filter mode from regular dropdown ([e431588](https://github.com/datenknoten/freundebuch/commit/e43158805ea4a99187e57a5704fce4756e898baf))

## [2.46.2](https://github.com/datenknoten/freundebuch/compare/v2.46.1...v2.46.2) (2026-01-16)

### Bug Fixes

* **frontend:** Fix filter modal not closing on Escape key ([68bc68b](https://github.com/datenknoten/freundebuch/commit/68bc68bd61670fee45de3bb87f065fd7a3637268))

## [2.46.1](https://github.com/datenknoten/freundebuch/compare/v2.46.0...v2.46.1) (2026-01-16)

### Bug Fixes

* **config:** Add IPv6 listening to nginx for healthcheck compatibility ([f4370c0](https://github.com/datenknoten/freundebuch/commit/f4370c05c3bb2bcab1a92afa19f0af33e6755e5b))

## [2.46.0](https://github.com/datenknoten/freundebuch/compare/v2.45.1...v2.46.0) (2026-01-16)

### Features

* **all:** Split monolithic container into multi-service architecture ([1d12282](https://github.com/datenknoten/freundebuch/commit/1d122825edb36abe136f9f94045e2a8ca4d13e75))

### Bug Fixes

* **ci:** Move secret reference out of matrix definition ([92bb822](https://github.com/datenknoten/freundebuch/commit/92bb82224e168d439db342de42226e23381326b4))

## [2.45.1](https://github.com/datenknoten/freundebuch/compare/v2.45.0...v2.45.1) (2026-01-16)

### Bug Fixes

* **frontend:** Improve keyboard filter UX with modal and auto-scroll ([eb46df9](https://github.com/datenknoten/freundebuch/commit/eb46df9aa757081692fc294e068076181f67b3b8))

## [2.45.0](https://github.com/datenknoten/freundebuch/compare/v2.44.1...v2.45.0) (2026-01-15)

### Features

* **frontend:** Add extended keyboard hints for filters (a1, b2, etc.) ([a78976e](https://github.com/datenknoten/freundebuch/commit/a78976ea0afd22530881af7043c5df34c2848e00))
* **frontend:** Add keyboard shortcuts for filter selection ([8c9b085](https://github.com/datenknoten/freundebuch/commit/8c9b08592ccf14b767600b7d492666f4b08cc883))
* **frontend:** Persist friend list filters across navigation ([58a438c](https://github.com/datenknoten/freundebuch/commit/58a438cde4b440068a5530aaf12a3f39a06bbbb5))

### Bug Fixes

* **frontend:** Require Shift for help shortcut to not conflict with / ([90fb7be](https://github.com/datenknoten/freundebuch/commit/90fb7bef5e994a8855c736bdf025aed5abd338a2))
* **frontend:** Use $state for container ref in NetworkGraph ([b9c66b5](https://github.com/datenknoten/freundebuch/commit/b9c66b5ed486cdc76a0023ed5d5c33acee04177a))

## [2.44.1](https://github.com/datenknoten/freundebuch/compare/v2.44.0...v2.44.1) (2026-01-15)

### Bug Fixes

* **backend:** Regenerate PgTyped queries with correct parameter positions ([bd6429d](https://github.com/datenknoten/freundebuch/commit/bd6429d1bfeab1d5b4a9c4b65b4d69ad013dff31))

## [2.44.0](https://github.com/datenknoten/freundebuch/compare/v2.43.0...v2.44.0) (2026-01-15)

### Features

* **frontend:** Add relationship network graph visualization ([7e94e94](https://github.com/datenknoten/freundebuch/commit/7e94e94f78c7f26848db8e6dd33d1d2419103fda))

### Bug Fixes

* **backend:** Use PgTyped queries and proper error handling for network graph ([3ab938e](https://github.com/datenknoten/freundebuch/commit/3ab938e7bfdc216ea793077bbec23ee63bc22013))

## [2.43.0](https://github.com/datenknoten/freundebuch/compare/v2.42.3...v2.43.0) (2026-01-15)

### Features

* **frontend:** Improve UX with friend context in modals and search persistence ([dab123f](https://github.com/datenknoten/freundebuch/commit/dab123f4e1cae10dd4ac71040ff6b96023b4cce2))

## [2.42.3](https://github.com/datenknoten/freundebuch/compare/v2.42.2...v2.42.3) (2026-01-15)

### Bug Fixes

* **frontend:** Add missing circles filter parameter to faceted search API ([c6ffb64](https://github.com/datenknoten/freundebuch/commit/c6ffb64be17946225838c026c029986a8ce3a50e))

## [2.42.2](https://github.com/datenknoten/freundebuch/compare/v2.42.1...v2.42.2) (2026-01-15)

### Bug Fixes

* **backend:** Prevent phone search from matching all records when query has no digits ([1c80969](https://github.com/datenknoten/freundebuch/commit/1c8096986d1ba20ad48a59dfb5a256584abcc1f3))

## [2.42.1](https://github.com/datenknoten/freundebuch/compare/v2.42.0...v2.42.1) (2026-01-15)

### Bug Fixes

* **frontend:** Sanitize search headline HTML to prevent XSS ([1a7a035](https://github.com/datenknoten/freundebuch/commit/1a7a03594793c4ddd72f63e13a834ef3b92fbd9b))

### Code Refactoring

* **frontend:** Unify friend grid for search and normal listing ([6be0af2](https://github.com/datenknoten/freundebuch/commit/6be0af234966e14f0be7871dc10a10f68e73e5ba))

## [2.42.0](https://github.com/datenknoten/freundebuch/compare/v2.41.3...v2.42.0) (2026-01-15)

### Features

* Add circles to search and filter results ([cae29d3](https://github.com/datenknoten/freundebuch/commit/cae29d388e5aa575860ca63eb0fbc50de8f16b09))

### Bug Fixes

* **frontend:** Improve circle facet filter UI ([fe720bf](https://github.com/datenknoten/freundebuch/commit/fe720bf22b1d48854c7959a9c9d4df8d79ffd725))
* **frontend:** Use grid layout for filtered results on desktop ([9d207cc](https://github.com/datenknoten/freundebuch/commit/9d207cc140c2d31a14820d33cdbf53fade4b1235))

## [2.41.3](https://github.com/datenknoten/freundebuch/compare/v2.41.2...v2.41.3) (2026-01-14)

### Bug Fixes

* **frontend:** Load circles on app init for CircleChip hierarchy display ([7a63484](https://github.com/datenknoten/freundebuch/commit/7a634848854068e9e81cd9ba8d6769742c296f6c))

## [2.41.2](https://github.com/datenknoten/freundebuch/compare/v2.41.1...v2.41.2) (2026-01-14)

### Code Refactoring

* **frontend:** Extract shared autoFocus action and AlertBanner component ([a08296f](https://github.com/datenknoten/freundebuch/commit/a08296f748b3ba788a391c121d383057d6943ba9))

## [2.41.1](https://github.com/datenknoten/freundebuch/compare/v2.41.0...v2.41.1) (2026-01-14)

### Code Refactoring

* **frontend:** Use CircleChip component consistently across all views ([0d858b3](https://github.com/datenknoten/freundebuch/commit/0d858b3696c00adaee7e1f47054e5074b836587b))

## [2.41.0](https://github.com/datenknoten/freundebuch/compare/v2.40.0...v2.41.0) (2026-01-14)

### Features

* **frontend:** Auto-focus first input in subresource edit forms ([97dd976](https://github.com/datenknoten/freundebuch/commit/97dd976fb63119e1d4662168cdea7514d3cd0c49))
* **frontend:** Display circle hierarchy with scoped-label style ([4d3a72f](https://github.com/datenknoten/freundebuch/commit/4d3a72f50ab5c53b6ee543ed45c2c8ab91dd9f56))
* **frontend:** Show circle dropdown as tree with indentation in add circle form ([0416420](https://github.com/datenknoten/freundebuch/commit/0416420b3165cd251967382c646c2f3f6852b2fd))

### Bug Fixes

* **frontend:** Use Svelte action for autofocus to prevent focus stealing ([0d0f872](https://github.com/datenknoten/freundebuch/commit/0d0f87286303e4eb535b1e15cfcf490d9fbac8a9))

## [2.40.0](https://github.com/datenknoten/freundebuch/compare/v2.39.0...v2.40.0) (2026-01-14)

### Features

* **frontend:** Display circles with full path (e.g., "foo → bar") ([a7dd6d0](https://github.com/datenknoten/freundebuch/commit/a7dd6d06b8492b0612e42bfb3dce308ece7b62b0))
* **frontend:** Show parent circle dropdown as tree with indentation ([083acbc](https://github.com/datenknoten/freundebuch/commit/083acbc153b2c9f3b5d75be65085b3ba853b31cd))

### Bug Fixes

* **frontend:** Auto-focus name input when creating/editing circle ([30c3a04](https://github.com/datenknoten/freundebuch/commit/30c3a0449add947e40e0fa6d964c4f85e2d2ffe8))

## [2.39.0](https://github.com/datenknoten/freundebuch/compare/v2.38.1...v2.39.0) (2026-01-14)

### Features

* Add configurable birthday format preference ([ff192e7](https://github.com/datenknoten/freundebuch/commit/ff192e786e70370818f6d8cede1e4fbeb333e29e))

## [2.38.1](https://github.com/datenknoten/freundebuch/compare/v2.38.0...v2.38.1) (2026-01-14)

### Bug Fixes

* **backend:** Add missing mock in app-passwords service tests ([56f9ab6](https://github.com/datenknoten/freundebuch/commit/56f9ab69c4c5d0606bf9fdae2216d5a9f6d578a7))

## [2.38.0](https://github.com/datenknoten/freundebuch/compare/v2.37.7...v2.38.0) (2026-01-14)

### Features

* Add dynamic column selection to desktop friend list ([79138fd](https://github.com/datenknoten/freundebuch/commit/79138fdd8d0c85d4e0434f47e9ca7d01ac4ecb69))

## [2.37.7](https://github.com/datenknoten/freundebuch/compare/v2.37.6...v2.37.7) (2026-01-14)

### Bug Fixes

* **backend:** Remove redundant NULLIF in UpdateCircle query ([b59e694](https://github.com/datenknoten/freundebuch/commit/b59e69419edd382cd2947893307e8d06c2bd7668))
* **frontend:** Enable sourcemap generation and fix Sentry upload config ([57e47f8](https://github.com/datenknoten/freundebuch/commit/57e47f8f0148c812022863ba797348c8510f9a07))

## [2.37.6](https://github.com/datenknoten/freundebuch/compare/v2.37.5...v2.37.6) (2026-01-14)

### Bug Fixes

* **backend:** Filter db.js frames in production stack traces ([afb07f2](https://github.com/datenknoten/freundebuch/commit/afb07f29f053c2ba8e6fa2c07a2dec70d5664ec9))
* **backend:** Preserve full stack traces for PostgreSQL errors ([bd422a7](https://github.com/datenknoten/freundebuch/commit/bd422a724b9dc6174eb8c1719e1d4f0dafe94ed5))

## [2.37.5](https://github.com/datenknoten/freundebuch/compare/v2.37.4...v2.37.5) (2026-01-14)

### Bug Fixes

* **backend:** Add explicit ::uuid casts to prevent uuid/text type mismatch in circles queries ([3d52af3](https://github.com/datenknoten/freundebuch/commit/3d52af312a41e9aa1ec236bb4009a536c2b8dcff))

## [2.37.4](https://github.com/datenknoten/freundebuch/compare/v2.37.3...v2.37.4) (2026-01-14)

### Bug Fixes

* **search:** Add explicit text[] casts to filterCircles parameter ([19b76ad](https://github.com/datenknoten/freundebuch/commit/19b76add4d835f1943d04fef7af098aedc239be4))

## [2.37.3](https://github.com/datenknoten/freundebuch/compare/v2.37.2...v2.37.3) (2026-01-14)

### Bug Fixes

* **docker:** Add php8.2-curl to production image ([2b42a20](https://github.com/datenknoten/freundebuch/commit/2b42a202ad8982e24d9f764a7c1f1aa6fc678062))
* **sabredav:** Add graceful curl fallback and improve error reporting ([784d7f8](https://github.com/datenknoten/freundebuch/commit/784d7f8c753dfba685810c8af06b4d1d6326c354))

## [2.37.2](https://github.com/datenknoten/freundebuch/compare/v2.37.1...v2.37.2) (2026-01-13)

### Bug Fixes

* **sabredav:** Add global namespace prefix to curl functions ([1a1e3ec](https://github.com/datenknoten/freundebuch/commit/1a1e3ec35210e2e95325e18c999336488682d270))

## [2.37.1](https://github.com/datenknoten/freundebuch/compare/v2.37.0...v2.37.1) (2026-01-13)

### Bug Fixes

* **nginx:** Use absolute HTTPS URLs for CardDAV well-known redirects ([c1d1886](https://github.com/datenknoten/freundebuch/commit/c1d18866ef7b3843abe1c9d1f028fc4c8eaa6902))

## [2.37.0](https://github.com/datenknoten/freundebuch/compare/v2.36.0...v2.37.0) (2026-01-13)

### Features

* Add circle shortcuts and circle filtering in facet dropdown ([f497726](https://github.com/datenknoten/freundebuch/commit/f49772630b389324938bb0924b251aa93a672439))

## [2.36.0](https://github.com/datenknoten/freundebuch/compare/v2.35.0...v2.36.0) (2026-01-13)

### Features

* **sabredav:** Add HTTP-level CardDAV server integration tests ([d60fa49](https://github.com/datenknoten/freundebuch/commit/d60fa4985b2d9eddb6d6cb9c24b57b7fe45381eb))
* **sabredav:** Add integration tests using testcontainers-php ([f3485a1](https://github.com/datenknoten/freundebuch/commit/f3485a1b4a3e6f33748bd51ef3da8b5875d3bcf4))

### Bug Fixes

* **sabredav:** Add PHP platform constraint for 8.3 compatibility ([e013611](https://github.com/datenknoten/freundebuch/commit/e01361118bd9621d234d209c98b3756b80b32b66))

### Reverts

* Revert "fix(sabredav): Add PHP platform constraint for 8.3 compatibility" ([cf6c477](https://github.com/datenknoten/freundebuch/commit/cf6c477b67418a3202f14111ca3ab52b621ec0f9))

### Code Refactoring

* **sabredav:** Use Node.js migrations instead of static SQL schema ([e33b5be](https://github.com/datenknoten/freundebuch/commit/e33b5bed5af6d91c29abb9b20dfb4d77e5a61425))

## [2.35.0](https://github.com/datenknoten/freundebuch/compare/v2.34.0...v2.35.0) (2026-01-13)

### Features

* Add Circle Admin frontend and default circles migration ([ebbecc1](https://github.com/datenknoten/freundebuch/commit/ebbecc133927f18f9d82cae03b4eb0d0f2fef0a0))

### Bug Fixes

* **database:** Use parameterized queries to prevent SQL injection ([5235f2f](https://github.com/datenknoten/freundebuch/commit/5235f2f82fed0fbea47881c7e690f99dd9fb0aae))
* **database:** Use pgm.db.query() for parameterized queries ([179f57d](https://github.com/datenknoten/freundebuch/commit/179f57dd158a178700586b6f31998a27e72bbb27))

## [2.34.0](https://github.com/datenknoten/freundebuch/compare/v2.33.0...v2.34.0) (2026-01-13)

### Features

* **frontend:** Add circle assignment UI to friend detail page ([6036dde](https://github.com/datenknoten/freundebuch/commit/6036ddef074ac45f674c3c8592d956746d83e515))

## [2.33.0](https://github.com/datenknoten/freundebuch/compare/v2.32.4...v2.33.0) (2026-01-13)

### Features

* **backend:** Add CardDAV circles integration ([c850844](https://github.com/datenknoten/freundebuch/commit/c850844a5afc883188fb11d7bfa7fb5200ba7f73))
* **backend:** Add circles and organization queries ([10d4eb7](https://github.com/datenknoten/freundebuch/commit/10d4eb75326817c5a80f989de0613b1b7dafe9ed))
* **backend:** Add circles routes and extend friends routes ([abb4d10](https://github.com/datenknoten/freundebuch/commit/abb4d10297b8520741a43222d326d066aec6769c))
* **backend:** Add circles service and extend friends service ([e7919a8](https://github.com/datenknoten/freundebuch/commit/e7919a8f138b43c33da6ad52f7486d44298029cb))
* **database:** Add circles and organization migration ([cc3378e](https://github.com/datenknoten/freundebuch/commit/cc3378ec865aa523beec0098659b34a709ac6500))
* **frontend:** Add circle components and update facet UI ([4a257ff](https://github.com/datenknoten/freundebuch/commit/4a257ff95f4ac197ffd50eb0f613bcda112a772b))
* **frontend:** Add circles API and stores ([24169c8](https://github.com/datenknoten/freundebuch/commit/24169c80aab3c7f21771ec0bee2d44031d084c63))
* **shared:** Add circles and organization types ([776b199](https://github.com/datenknoten/freundebuch/commit/776b199d34d2ceec4a2f4af5297cb505166431f4))

### Bug Fixes

* **backend:** Add transactions to setFriendCircles and mergeCircles ([e94f1a3](https://github.com/datenknoten/freundebuch/commit/e94f1a32c19d3018acee0b1e06ea1b18518b8914))
* **backend:** Add unique constraint for circle names and length validation ([c642bf8](https://github.com/datenknoten/freundebuch/commit/c642bf8c608f27f52daef59a03a88b61cb578613))
* **backend:** Address code review feedback for circles feature ([7184740](https://github.com/datenknoten/freundebuch/commit/7184740bed095d9ca2443e78e7734f09d372d840))
* **backend:** Address PR feedback for circles feature ([8297935](https://github.com/datenknoten/freundebuch/commit/8297935ae5e3b9ffde26b8a77f703a98fdd4e38a))
* **backend:** Use two-step circle matching in CardDAV ([b453627](https://github.com/datenknoten/freundebuch/commit/b4536276e37c8c11e01a4c852abd11c49087db8b))
* **frontend:** Fix type assertion for ArrayFacetField indexing ([42775f9](https://github.com/datenknoten/freundebuch/commit/42775f9ea29a4390a3613d420007a2d50221bb2f))

### Performance Improvements

* **backend:** Optimize setFriendCircles to avoid extra query ([4139d55](https://github.com/datenknoten/freundebuch/commit/4139d556efa00293161b7d0251bf49f3fe7ebf3d))

## [2.32.4](https://github.com/datenknoten/freundebuch/compare/v2.32.3...v2.32.4) (2026-01-12)

### Bug Fixes

* **database:** Add migration to update photo URLs ([f513823](https://github.com/datenknoten/freundebuch/commit/f51382324f87fb3097b5786ffff4a6bef6ffc9c2))

## [2.32.3](https://github.com/datenknoten/freundebuch/compare/v2.32.2...v2.32.3) (2026-01-12)

### Bug Fixes

* **backend:** Complete Contact → Friend rename fixes ([0b8314f](https://github.com/datenknoten/freundebuch/commit/0b8314f5a00c3b40eb6613f16f523af7b99d72eb))

### Code Refactoring

* **all:** Update SabreDAV CardDAV backend for Friend rename ([43a9236](https://github.com/datenknoten/freundebuch/commit/43a9236ac3218193e51a25ee82efbff6bf39a162))
* **backend:** Rename contact query files to friend ([26a169b](https://github.com/datenknoten/freundebuch/commit/26a169b05a494eb5e238b1f4f9aa5e6458a1cf59))
* **backend:** Rename contact tests to friend ([58ea937](https://github.com/datenknoten/freundebuch/commit/58ea937e4a16314b74404581de34e004d92ea18b))
* **backend:** Rename ContactsService to FriendsService ([a0247dc](https://github.com/datenknoten/freundebuch/commit/a0247dcd25eb8236ac11f9560c7d5a528d04e2b3))
* **database:** Add migrations to rename Contact to Friend ([d810439](https://github.com/datenknoten/freundebuch/commit/d8104395ecb99928d36003ef1a54a7ae45426626))
* **frontend:** Rename /contacts routes to /friends ([9d4b66d](https://github.com/datenknoten/freundebuch/commit/9d4b66dcb51440a687bbf960e8fc3061dae82f17))
* **frontend:** Rename contact API and stores to friend ([1967cb2](https://github.com/datenknoten/freundebuch/commit/1967cb2189c86aa96a219c73f226acdc4d5bbb10))
* **frontend:** Rename Contact components to Friend ([8ba48fa](https://github.com/datenknoten/freundebuch/commit/8ba48fab4c67af1337f312508e9d2b3d64d1be6b))
* **shared:** Rename Contact types to Friend ([11afcfa](https://github.com/datenknoten/freundebuch/commit/11afcfa23352feb7cf35ee6ae889698018705c04))

## [2.32.2](https://github.com/datenknoten/freundebuch/compare/v2.32.1...v2.32.2) (2026-01-12)

### Bug Fixes

* **backend:** Complete BirthdayAlreadyExistsError migration ([938afa1](https://github.com/datenknoten/freundebuch/commit/938afa1ecc6f22eb11fee1d438b2e376aaf89ed0))

### Code Refactoring

* **backend:** Add toError helper to normalize unknown errors ([7b5d5d6](https://github.com/datenknoten/freundebuch/commit/7b5d5d6b0fda666ff16d850f4a115c8c30646121))
* **backend:** Add UnknownValueError class for toError helper ([e5de839](https://github.com/datenknoten/freundebuch/commit/e5de839ff8bfb20704ec21e0cd330e1b5036c1b1))
* **backend:** Replace raw Error class with custom error subclasses ([b2f0ab6](https://github.com/datenknoten/freundebuch/commit/b2f0ab6772cdb81a2526d71c23bd87eac485d5e7))

## [2.32.1](https://github.com/datenknoten/freundebuch/compare/v2.32.0...v2.32.1) (2026-01-11)

### Bug Fixes

* **frontend:** Use requestAnimationFrame for input focus to open mobile keyboard ([765b8b8](https://github.com/datenknoten/freundebuch/commit/765b8b800d7c776c73cdb75938b134241cd4c574))

## [2.32.0](https://github.com/datenknoten/freundebuch/compare/v2.31.2...v2.32.0) (2026-01-11)

### Features

* **ci:** Add Matrix webhook notification on successful deployment ([c2948b0](https://github.com/datenknoten/freundebuch/commit/c2948b05ca5e1c1051a4f3499ffb41b675836955))

## [2.31.2](https://github.com/datenknoten/freundebuch/compare/v2.31.1...v2.31.2) (2026-01-11)

### Bug Fixes

* **frontend:** Improve effect dependency tracking for display name fetch ([38c7614](https://github.com/datenknoten/freundebuch/commit/38c7614f75e4951d00560ff5ddf2b84d000c0cb9))
* **frontend:** Prevent excessive API requests on dashboard ([652e4cb](https://github.com/datenknoten/freundebuch/commit/652e4cb37629d41a33bf62f8c7e1cd4fa6f46bb2))

## [2.31.1](https://github.com/datenknoten/freundebuch/compare/v2.31.0...v2.31.1) (2026-01-11)

### Bug Fixes

* **frontend:** Add padding and show display name on dashboard ([31aed74](https://github.com/datenknoten/freundebuch/commit/31aed74d78375f9c960648425c34852297001ece))
* **frontend:** Use responsive padding and prevent race conditions ([d97c67f](https://github.com/datenknoten/freundebuch/commit/d97c67f0c8672bf168bdf8222080dbf242364201))

### Code Refactoring

* **frontend:** Use Svelte 5 runes for dashboard state management ([f245ad0](https://github.com/datenknoten/freundebuch/commit/f245ad0159382b1cf271803dff54d5e1983322a9))

## [2.31.0](https://github.com/datenknoten/freundebuch/compare/v2.30.1...v2.31.0) (2026-01-11)

### Features

* Add upcoming dates dashboard element ([29af97b](https://github.com/datenknoten/freundebuch/commit/29af97b82d9ce38bc6ab73b1c57573eda4d52223))

### Bug Fixes

* **frontend:** Address PR review comments ([b97d369](https://github.com/datenknoten/freundebuch/commit/b97d3693b97b57c3b44eb5c507fa81519518aaa2))
* Handle Feb 29 birthdays in non-leap years ([161a733](https://github.com/datenknoten/freundebuch/commit/161a733a635481a679c4a7c30597b314c92f58fe))

## [2.30.1](https://github.com/datenknoten/freundebuch/compare/v2.30.0...v2.30.1) (2026-01-11)

### Bug Fixes

* **frontend:** Redirect existing users to onboarding when required ([6b47090](https://github.com/datenknoten/freundebuch/commit/6b47090484de26f63a9607adc00f2602a2a1eab5))

## [2.30.0](https://github.com/datenknoten/freundebuch/compare/v2.29.0...v2.30.0) (2026-01-11)

### Features

* Add self-contact onboarding requirement ([5e5583a](https://github.com/datenknoten/freundebuch/commit/5e5583ae740e2d1ffefdc2ee7a6358ac0189a352))

## [2.29.0](https://github.com/datenknoten/freundebuch/compare/v2.28.0...v2.29.0) (2026-01-11)

### Features

* **frontend:** Add faceted search to friends list ([d1fd8a7](https://github.com/datenknoten/freundebuch/commit/d1fd8a70dd6e284cf4099b6b3d2212994f9f7445))

### Bug Fixes

* Address code review feedback for faceted search ([4dfeb04](https://github.com/datenknoten/freundebuch/commit/4dfeb047ca776f6934f26aaa9a318b4c1deae072))

## [2.28.0](https://github.com/datenknoten/freundebuch/compare/v2.27.0...v2.28.0) (2026-01-10)

### Features

* **frontend:** Auto-focus firstname field when friend form opens ([6c5d385](https://github.com/datenknoten/freundebuch/commit/6c5d38507649d1251e1ca4cac7f4c6dacd661f3a))

## [2.27.0](https://github.com/datenknoten/freundebuch/compare/v2.26.0...v2.27.0) (2026-01-10)

### Features

* **all:** Add faceted search to global search modal ([086070d](https://github.com/datenknoten/freundebuch/commit/086070d7d07c07326789b8d359a7800c1774ff66))

### Bug Fixes

* **backend:** Prevent SQL injection in ILIKE search patterns ([e69ec1f](https://github.com/datenknoten/freundebuch/commit/e69ec1f1b3a32f0a1b896d29f1015fd86fcc8f0c))

### Performance Improvements

* **backend:** Add trigram indexes and fix GetFacetCounts consistency ([21870ce](https://github.com/datenknoten/freundebuch/commit/21870ce3e96a2a8f53776fdf1ab9ffd22caea2db))
* **backend:** Eliminate correlated subquery for work_notes in ts_headline ([0c951c0](https://github.com/datenknoten/freundebuch/commit/0c951c068ee05d3783189da788c8457c64a1647c))
* **backend:** Replace EXISTS subqueries with LEFT JOINs in search ([bce5253](https://github.com/datenknoten/freundebuch/commit/bce52534ea2c916ced24d5219ca3e412ccacb14c))

### Code Refactoring

* **frontend:** Simplify store access pattern in search store ([230debf](https://github.com/datenknoten/freundebuch/commit/230debf5d6f3bcc0257842203a9e60146b3298bf))

## [2.26.0](https://github.com/datenknoten/freundebuch/compare/v2.25.0...v2.26.0) (2026-01-10)

### Features

* **frontend:** add terms of service page and navigation links ([3ac814d](https://github.com/datenknoten/freundebuch/commit/3ac814d30c932ed203982e6ed9d5fbd746c537a9))

## [2.25.0](https://github.com/datenknoten/freundebuch/compare/v2.24.1...v2.25.0) (2026-01-10)

### Features

* **frontend:** add privacy policy page and navigation links ([2a42007](https://github.com/datenknoten/freundebuch/commit/2a420075aaf2edf6338d289ad60f0429695f91b2))
* **frontend:** enhance privacy policy with GDPR compliance and Sentry disclosure ([e1704f5](https://github.com/datenknoten/freundebuch/commit/e1704f5c94ed8196a8da78c31716e585d7426639))

### Bug Fixes

* **frontend:** address PR review comments on privacy policy ([2d24c98](https://github.com/datenknoten/freundebuch/commit/2d24c98f57fffaa4e61ecebb28562d78ab35e579))

## [2.24.1](https://github.com/datenknoten/freundebuch/compare/v2.24.0...v2.24.1) (2026-01-10)

### Bug Fixes

* **ci:** resolve heredoc delimiter issue in code review workflow ([0d2bf11](https://github.com/datenknoten/freundebuch/commit/0d2bf1168ff55f731fc11f68569728256800e9ec))

## [2.24.0](https://github.com/datenknoten/freundebuch/compare/v2.23.3...v2.24.0) (2026-01-10)

### Features

* **sabredav:** Save raw vCard as JSON blob for debugging ([f043b5f](https://github.com/datenknoten/freundebuch/commit/f043b5fdd2ac14fdcc7299d0e29b76e7bb9acc44))

### Bug Fixes

* **sabredav:** Address PR review feedback for vCard JSON blob ([cd8f1c2](https://github.com/datenknoten/freundebuch/commit/cd8f1c2a425794bd84b1af8cff68e9659faf5e3a))

## [2.23.3](https://github.com/datenknoten/freundebuch/compare/v2.23.2...v2.23.3) (2026-01-10)

### Bug Fixes

* **sabredav:** Embed contact photos as base64 in vCards for iOS compatibility ([bb2c488](https://github.com/datenknoten/freundebuch/commit/bb2c48854941424e2d8a68295fdad4e83a3b048f))

## [2.23.2](https://github.com/datenknoten/freundebuch/compare/v2.23.1...v2.23.2) (2026-01-08)

### Bug Fixes

* **backend:** Prevent SSRF in Sentry tunnel and XSS in search headlines ([7912678](https://github.com/datenknoten/freundebuch/commit/7912678f655cc2d1bfcbc3ccd74f60b055ae0971))
* **frontend:** Prevent keyboard hint badges from being clipped in table view ([bc5eeda](https://github.com/datenknoten/freundebuch/commit/bc5eedac5bf11ed8302d5c322bb0587678c605a9))

## [2.23.1](https://github.com/datenknoten/freundebuch/compare/v2.23.0...v2.23.1) (2026-01-08)

### Bug Fixes

* **frontend:** Standardize page widths to max-w-7xl ([ad4c61d](https://github.com/datenknoten/freundebuch/commit/ad4c61d7191dfd69154d17b4bc5179bb772bae5b))

## [2.23.0](https://github.com/datenknoten/freundebuch/compare/v2.22.0...v2.23.0) (2026-01-08)

### Features

* **frontend:** Add table view for contacts list on desktop ([d58f793](https://github.com/datenknoten/freundebuch/commit/d58f793f774e704440dd065a374770ec8db8e0a7))

## [2.22.0](https://github.com/datenknoten/freundebuch/compare/v2.21.1...v2.22.0) (2026-01-08)

### Features

* Add pagination controls with user preferences ([3c32d72](https://github.com/datenknoten/freundebuch/commit/3c32d7253459c7a0f94ea4109ea4d99b1e6fb5bf))
* **frontend:** Extend keyboard navigation to support more than 9 contacts ([6d1803b](https://github.com/datenknoten/freundebuch/commit/6d1803b9f7e0326fe24648fee4dc6a37bea51fa3))

## [2.21.1](https://github.com/datenknoten/freundebuch/compare/v2.21.0...v2.21.1) (2026-01-08)

### Bug Fixes

* **config:** Ensure API routes take precedence over static file regex in nginx ([edda76e](https://github.com/datenknoten/freundebuch/commit/edda76ef06b25a9b7b524420debb6ecb4465b186))

## [2.21.0](https://github.com/datenknoten/freundebuch/compare/v2.20.5...v2.21.0) (2026-01-08)

### Features

* **frontend:** Add image cropping for avatar uploads ([73d21ed](https://github.com/datenknoten/freundebuch/commit/73d21ed2681e70d039533187f3243eb831151788))

## [2.20.5](https://github.com/datenknoten/freundebuch/compare/v2.20.4...v2.20.5) (2026-01-07)

### Bug Fixes

* **backend:** Remove AUTH_DEBUG logging from SabreDAV AppPasswordBackend ([3d6ec65](https://github.com/datenknoten/freundebuch/commit/3d6ec657443e9890e329be060be0aaec7da4879b))

## [2.20.4](https://github.com/datenknoten/freundebuch/compare/v2.20.3...v2.20.4) (2026-01-07)

### Bug Fixes

* **backend:** Handle undefined context in test teardown ([955efcf](https://github.com/datenknoten/freundebuch/commit/955efcf74d4ba8fd45929ed33f059aa0fff604dc))
* **backend:** Suppress pool errors during test container shutdown ([d9d36ec](https://github.com/datenknoten/freundebuch/commit/d9d36ec1d63896b570fffa080677a59358f272b0))
* **backend:** Use health check wait strategy for PostgreSQL testcontainers ([f3d5d28](https://github.com/datenknoten/freundebuch/commit/f3d5d2842727c81990c2596fc46a1eef2e283692))

## [2.20.3](https://github.com/datenknoten/freundebuch/compare/v2.20.2...v2.20.3) (2026-01-07)

### Bug Fixes

* **frontend:** Streamline Add Relationship to match other subresources ([23da4db](https://github.com/datenknoten/freundebuch/commit/23da4dbedacd059b0821fc5ed117b701d79eaa02))

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

# Changelog

## [0.6.1](https://github.com/publira/comic-viewer/compare/comic-viewer-v0.6.0...comic-viewer-v0.6.1) (2026-08-24)


### Bug Fixes

* **core:** meet the pages of a spread at the gutter ([#151](https://github.com/publira/comic-viewer/issues/151)) ([1fa6dea](https://github.com/publira/comic-viewer/commit/1fa6dea0a38403528961727a6ea610dd5a6905ea)), closes [#146](https://github.com/publira/comic-viewer/issues/146)
* **core:** place an unpaired page on its facing side ([#148](https://github.com/publira/comic-viewer/issues/148)) ([47ed746](https://github.com/publira/comic-viewer/commit/47ed746bc500a3d9466295caa833eb515ad3b097)), closes [#147](https://github.com/publira/comic-viewer/issues/147)

## [0.6.0](https://github.com/publira/comic-viewer/compare/comic-viewer-v0.5.1...comic-viewer-v0.6.0) (2026-08-24)


### Features

* **core:** export ComicViewer.Root instead of an Object.assign compound component ([#130](https://github.com/publira/comic-viewer/issues/130)) ([c3ce4c8](https://github.com/publira/comic-viewer/commit/c3ce4c817dacc8b5c1a3240e641c5089f7e019ad))
* **core:** expose page load state, errors, and retry ([#137](https://github.com/publira/comic-viewer/issues/137)) ([1fd98a2](https://github.com/publira/comic-viewer/commit/1fd98a2131f6132888f94cbfdfd6bfc09e95a4d4)), closes [#123](https://github.com/publira/comic-viewer/issues/123)
* **core:** pass loading context to page plugins ([#140](https://github.com/publira/comic-viewer/issues/140)) ([beef6e9](https://github.com/publira/comic-viewer/commit/beef6e9a78a681ab50b64a85eeef97d32d27d9b3)), closes [#121](https://github.com/publira/comic-viewer/issues/121)
* **core:** place PageProgress in the Toolbar ([#132](https://github.com/publira/comic-viewer/issues/132)) ([8ce62b4](https://github.com/publira/comic-viewer/commit/8ce62b4fc57cb2669c06a3218621e681103ad645))
* **demo-tw:** add Tailwind CSS reference application ([#143](https://github.com/publira/comic-viewer/issues/143)) ([08211ab](https://github.com/publira/comic-viewer/commit/08211ab00df0f3e62918646669382dfa1231f3ec))


### Bug Fixes

* **core:** clear stale canvas while page loads ([#139](https://github.com/publira/comic-viewer/issues/139)) ([460b402](https://github.com/publira/comic-viewer/commit/460b4028ff89482ce0b9fac118742f5cc296d9c6)), closes [#134](https://github.com/publira/comic-viewer/issues/134)
* **core:** scope theme variables to viewer root ([#135](https://github.com/publira/comic-viewer/issues/135)) ([44805a4](https://github.com/publira/comic-viewer/commit/44805a43f3e7b3c275b803b527e55c134cffc7d6))

## [0.5.1](https://github.com/publira/comic-viewer/compare/comic-viewer-v0.5.0...comic-viewer-v0.5.1) (2026-08-23)


### Bug Fixes

* **core:** expose viewport layout primitives ([#114](https://github.com/publira/comic-viewer/issues/114)) ([338aeea](https://github.com/publira/comic-viewer/commit/338aeea82afb847535e845bb8b4ed3740aa7b910))

## [0.5.0](https://github.com/publira/comic-viewer/compare/comic-viewer-v0.4.0...comic-viewer-v0.5.0) (2026-08-23)


### Features

* **core:** add touch zoom and pan controls ([#110](https://github.com/publira/comic-viewer/issues/110)) ([dff994e](https://github.com/publira/comic-viewer/commit/dff994e5a710b899cc2316f225e73acec27bc034))


### Bug Fixes

* **core:** continue swipe momentum into page turn ([#112](https://github.com/publira/comic-viewer/issues/112)) ([45f1192](https://github.com/publira/comic-viewer/commit/45f1192bf403392c61d2005234cee8df7d38e883))
* **core:** retain adjacent pages during page turns ([#107](https://github.com/publira/comic-viewer/issues/107)) ([9382119](https://github.com/publira/comic-viewer/commit/938211973500b06033161ddf53de8de0949354bb))

## [0.4.0](https://github.com/publira/comic-viewer/compare/comic-viewer-v0.3.0...comic-viewer-v0.4.0) (2026-08-23)


### Features

* **core:** expose composable viewer primitives ([#97](https://github.com/publira/comic-viewer/issues/97)) ([4204784](https://github.com/publira/comic-viewer/commit/420478414688ea59c1818e8885671022a4a85bcf))
* **core:** support controlled page navigation ([#99](https://github.com/publira/comic-viewer/issues/99)) ([6bbdfe4](https://github.com/publira/comic-viewer/commit/6bbdfe4e67c7491be249b6715529ec3f5275b43b))


### Bug Fixes

* **core:** correct mobile swipe navigation ([#101](https://github.com/publira/comic-viewer/issues/101)) ([e3cd2dd](https://github.com/publira/comic-viewer/commit/e3cd2dde7df9f9af201bcb6abbd55967c91a0de7))
* **core:** toggle reading progress visibility ([#103](https://github.com/publira/comic-viewer/issues/103)) ([1e775c0](https://github.com/publira/comic-viewer/commit/1e775c088ef2f2fa7f75ef13aca92fd7e317b97a))

## [0.3.0](https://github.com/publira/comic-viewer/compare/comic-viewer-v0.2.1...comic-viewer-v0.3.0) (2026-08-23)


### Features

* **core:** add accessible page navigation controls ([#86](https://github.com/publira/comic-viewer/issues/86)) ([c3e8605](https://github.com/publira/comic-viewer/commit/c3e8605a3c5d421c85c928a0c6f4f77f38749a37))
* **core:** configure double-page spread start ([#95](https://github.com/publira/comic-viewer/issues/95)) ([0c51872](https://github.com/publira/comic-viewer/commit/0c518726103b24c9d3616935a92e981ab6d65756))


### Bug Fixes

* **core:** normalize invalid page indexes ([#91](https://github.com/publira/comic-viewer/issues/91)) ([1f4baca](https://github.com/publira/comic-viewer/commit/1f4bacafb3bd643c54b39002ad8538d1c80ef8e4))
* **core:** respect reading direction for swipe navigation ([#92](https://github.com/publira/comic-viewer/issues/92)) ([eea86bc](https://github.com/publira/comic-viewer/commit/eea86bcfcd1996c45cb3894c4bdd6b0659b10399)), closes [#79](https://github.com/publira/comic-viewer/issues/79)
* prevent arrow navigation from interactive controls ([#93](https://github.com/publira/comic-viewer/issues/93)) ([1aa9511](https://github.com/publira/comic-viewer/commit/1aa9511e7a8c32d3911cc3c65c525c6f2068bac6)), closes [#83](https://github.com/publira/comic-viewer/issues/83)

## [0.2.1](https://github.com/publira/comic-viewer/compare/comic-viewer-v0.2.0...comic-viewer-v0.2.1) (2026-08-22)


### Bug Fixes

* **core:** clamp current index when pages shrink ([#84](https://github.com/publira/comic-viewer/issues/84)) ([7d0d531](https://github.com/publira/comic-viewer/commit/7d0d53189ff3a421f919a681f37a11b5caf7b2d6)), closes [#78](https://github.com/publira/comic-viewer/issues/78)

## [0.2.0](https://github.com/publira/comic-viewer/compare/comic-viewer-v0.1.0...comic-viewer-v0.2.0) (2026-08-22)


### Features

* **release:** automate core package releases ([#70](https://github.com/publira/comic-viewer/issues/70)) ([fd8613e](https://github.com/publira/comic-viewer/commit/fd8613e5a4c40a699e3f8fc1f9b1316d48f5c320))

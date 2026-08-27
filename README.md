Doppio Modern JVM
=================

[![Modern Java](https://github.com/seo-rii/doppio/actions/workflows/modern-java.yml/badge.svg?branch=modern)](https://github.com/seo-rii/doppio/actions/workflows/modern-java.yml)
[![Pages](https://github.com/seo-rii/doppio/actions/workflows/pages.yml/badge.svg?branch=modern)](https://github.com/seo-rii/doppio/actions/workflows/pages.yml)
[![Package artifact](https://github.com/seo-rii/doppio/actions/workflows/package-artifact.yml/badge.svg?branch=modern)](https://github.com/seo-rii/doppio/actions/workflows/package-artifact.yml)

_doppio_ is a double shot of espresso. This fork keeps the original
POSIX-compatible runtime system and JVM written in
[TypeScript](http://www.typescriptlang.org/), while tracking modern Java
compatibility, Kotlin compiler bring-up, Scala compiler smoke coverage, and
browser release builds.

To try the browser build, head to the [live Pages site](https://seorii.page/doppio/).
The site includes rendered project documentation and an editable Java, Kotlin,
and Scala playground that compiles and runs source inside Doppio.

To learn more, read the [developer guide](docs), the
[support policy](docs/support.md), the
[modern Java compatibility matrix](docs/modern-java.md), the
[0.6.0 release notes](CHANGELOG.md), or the original
[academic paper](http://dl.acm.org/citation.cfm?id=2594293) [(alt. link w/ no paywall)](https://plasma-umass.github.io/doppio-demo/paper.pdf)
published at [PLDI 2014](http://conferences.inf.ed.ac.uk/pldi2014/).

Getting & Building the Code
---------------------------

Before attempting to build doppio, you must have the following installed:

* Node 24 for the CI-supported modern toolchain.
* Yarn 1.22.
* Java 17 JDK.

If you are on Windows, you will need the following installed:

* Git (must be on your PATH)
* Python (must be on your PATH)
* A version of Visual Studio

Run the following commands to build doppio. Note that your first time building may take some time, as the build script will download the entire Java Class Library.

    git clone https://github.com/seo-rii/doppio.git
    cd doppio
    yarn install       # npm install should work if you do not have yarn
    grunt release      # For browser integration.
    grunt release-cli  # For command-line use.

Testing
-------

Run the full test suite using node.js:

    grunt test

Run the modern Java runtime suite and representative local compiler smokes:

    grunt --stack test-modern-java --grunt-ignore-compile-errors
    KOTLIN_SMOKE_CLASSPATH_MODE=full ./ci/kotlin_smoke.sh
    ./ci/kotlin_reflect_smoke.sh
    ./ci/scala_smoke.sh

The checked-in [support policy](docs/support.md) defines the release profile,
what these gates promise, and the platform features that are intentionally out
of scope. `ci/modern_java_smoke_shards.json` is the source of truth for the
complete Kotlin and Scala smoke inventory run by the `Modern Java` workflow.

Run the full test suite in a web browser:

    grunt test-browser

Run a specific test by invoking the test runner manually:

    node build/dev-cli/console/test_runner.js classes/test/Strings

Command-line Usage
------------------

Run doppio with node.js (after `grunt release-cli`):

    ./doppio classes.demo.Fib 7
    ./doppio -jar my_application.jar
    ./doppio -cp my/class/path SomeClass

Package Artifact
----------------

The 0.6.0 release candidate is packaged as an installable npm tarball by the
`Package artifact` workflow. Its clean-build gate verifies isolated install and
rebuild behavior, all four CLI entry points, the browser bundle, package-local
runtime links, and the TypeScript 6 public declarations. Installing the package
for the first time requires network access to fetch the pinned Java runtime;
that download is digest-checked and installed transactionally.

To build and consume the same artifact locally:

    yarn ci:check-package-artifact

Integrating Into Your Site
--------------------------

Check out our [Developer Guide](docs) for information on how you can integrate doppio into your website!

You can also build and interact with a simple example application with:

    grunt examples

The code is in the
[`docs/examples` directory](https://github.com/seo-rii/doppio/tree/modern/docs/examples).

GitHub Pages
------------

The `Pages` workflow builds the release browser bundle, packages the Java,
Kotlin, and Scala compiler runtimes behind BrowserFS listings, builds the Vite
documentation site and playground, and deploys the `docs` directory. A local
Chromium acceptance run must pass before the artifact can be uploaded; a second
run against the deployed URL verifies the published result. Both compile and
run Java, Kotlin, and Scala through the playground.
The project page is intended to be available at:

    https://seorii.page/doppio/

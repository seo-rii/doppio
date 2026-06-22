Doppio Modern JVM
=================

[![Modern Java](https://github.com/seo-rii/doppio/actions/workflows/modern-java.yml/badge.svg?branch=modern)](https://github.com/seo-rii/doppio/actions/workflows/modern-java.yml)
[![Pages](https://github.com/seo-rii/doppio/actions/workflows/pages.yml/badge.svg?branch=modern)](https://github.com/seo-rii/doppio/actions/workflows/pages.yml)

_doppio_ is a double shot of espresso. This fork keeps the original
POSIX-compatible runtime system and JVM written in
[TypeScript](http://www.typescriptlang.org/), while tracking modern Java
compatibility, Kotlin compiler bring-up, Scala compiler smoke coverage, and
browser release builds.

To try the browser build, head to the [live Pages site](https://seorii.page/doppio/).
The site includes rendered project documentation and an editable Java, Kotlin,
and Scala playground that compiles and runs source inside Doppio.

To learn more, read the [developer guide](docs), the
[modern Java compatibility matrix](docs/modern-java.md), or the original
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

Run the modern Java/Kotlin/Scala compatibility suite:

    grunt --stack test-modern-java --grunt-ignore-compile-errors
    KOTLIN_SMOKE_CLASSPATH_MODE=full ./ci/kotlin_smoke.sh
    ./ci/kotlin_reflect_smoke.sh
    ./ci/scala_smoke.sh

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

Integrating Into Your Site
--------------------------

Check out our [Developer Guide](docs) for information on how you can integrate doppio into your website!

You can also build and interact with a simple example application with:

    grunt examples

The code is in [`docs/examples`](docs/examples).

GitHub Pages
------------

The `Pages` workflow builds the release browser bundle, packages the Java,
Kotlin, and Scala compiler runtimes behind BrowserFS listings, builds the Vite
documentation site and playground, and deploys the `docs` directory.
It also runs a Chromium browser smoke in a Playwright container that opens the
generated site and compiles/runs Java, Kotlin, and Scala through the playground.
The project page is intended to be available at:

    https://seorii.page/doppio/

import {runPagesBrowserSmokeWithRetry} from './pages_browser_smoke_retry.mjs';

process.exitCode = await runPagesBrowserSmokeWithRetry();

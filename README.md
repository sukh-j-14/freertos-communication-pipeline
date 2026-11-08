# FreeRTOS Communication Pipeline

Software-only portfolio project for learning bounded queues, task coordination, and communication fault handling.

- [Live browser companion](https://freertos-communication-pipeline.vercel.app)
- [GitHub repository](https://github.com/sukh-j-14/freertos-communication-pipeline)
- [Implementation walkthrough](docs/implementation.md)

## Native FreeRTOS core

Prerequisites: GCC/MinGW in PATH and PowerShell.

```powershell
.\build.ps1
```

Build outputs go into `build/`, which is excluded from Git. Five scenarios run in separate processes and write JSON under `results/`. Invalid scenario names and extra arguments are also tested.

Three native FreeRTOS tasks share a bounded queue (8 packets), mutex-protected metrics, and a completion semaphore. Uses official FreeRTOS-Kernel V11.2.0, commit 0adc196d4bd52a2d91102b525b0aafc1e14a2386. Only required kernel files/Windows port are vendored. `portmacro.h` omits `timeapi.h` for legacy MinGW; `mmsystem.h` provides timer declarations. Upstream license is retained.

## Browser companion

Prerequisite: Node.js 20 or newer. No package installation or credentials are required.

```powershell
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:4173`. The browser illustrates normal traffic, overload, a stalled receiver, empty input, and a checksum fault. Run, pause, step, reset, or export a model snapshot as JSON. The native evidence table loads the checked-in `results/*.json` files separately.

The JavaScript model is a deterministic teaching model, not the FreeRTOS scheduler. It handles arrivals before receiving in each 10 ms model step and runs for 2,200 model milliseconds. The burst is enqueued before the first receive. Native scheduling, mutex behavior, and Windows timing are not reproduced. No FreeRTOS or RF hardware executes in the browser. Browser runs are session-only; no database or account is needed.

## Verified on 8 November 2026

All five native scenarios passed using the real kernel:

| Scenario | Accepted | Dropped | Received | Corrupt |
| --- | ---: | ---: | ---: | ---: |
| Normal | 100 | 0 | 100 | 0 |
| Overload | 8 | 92 | 8 | 0 |
| Stalled receiver | 8 | 92 | 0 | 0 |
| Empty input | 0 | 0 | 0 | 0 |
| Injected corruption | 100 | 0 | 100 | 1 |

All reported zero FIFO order errors. Invalid scenario and extra-argument checks passed. The checksum-fault test succeeds when the deliberate fault is detected. Six JavaScript model tests check accounting, bounds, expected scenario behavior, and independent runs.

Compiler: MinGW.org GCC 6.3.0 on Windows. This compiler emits an upstream pragma warning for an unsupported warning option. Native tests require normal Windows process access; restricted execution may fail to start the compiler. The Windows simulator is not hard real time and can run slower than nominal tick time. Do not claim embedded latency from host measurements.

## Deployment

Vercel hosts only the static browser companion. `vercel.json` builds `dist/` with `npm run build`; the build copies browser source and native result records. The C core stays in this separate repository and builds locally on Windows. To refresh recorded results, run `build.ps1`, inspect the JSON, then rebuild and deploy the companion.

## Limitations

No physical hardware, RF signal processing, retransmission protocol, or embedded timing validation is implemented. These learning-project tests do not establish professional RF, RTOS, LTE, or 5G experience. Persistence is intentionally omitted because there is no durable user-data requirement. If needed later, use Neon Postgres plus Prisma for relational data or MongoDB plus Mongoose for document data, keeping credentials server-side and out of Git.

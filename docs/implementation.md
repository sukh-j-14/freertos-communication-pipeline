# Implementation walkthrough

This program runs the real FreeRTOS kernel through its Windows simulator port. It does not execute RF hardware, emulate a modem waveform, or establish embedded timing performance.

## Packet path

The producer creates sequence-numbered packets and sends each with a zero-tick queue wait. The queue copies the packet value, so the producer's local variable can be reused safely. A full queue causes an explicit drop instead of blocking the producer. Each packet carries its creation tick and a simple XOR checksum. This checksum is a teaching aid, not a CRC or security mechanism.

The consumer waits up to 50 ms in scheduler ticks for a packet. It records timeouts, verifies the checksum, checks that received sequence numbers strictly increase, and measures tick age. Sequence gaps are allowed because full-queue drops are intentional. Corrupt packets are counted as received and flagged; there is no retransmission or recovery protocol.

The monitor waits on a binary semaphore indicating the producer has finished, then allows up to 2 seconds in scheduler ticks for accepted packets to drain. It snapshots metrics under the mutex, evaluates scenario assertions, prints JSON, and exits the process. The stalled case intentionally leaves accepted packets in the queue. This is a finite test harness, not a service with graceful task shutdown.

## Synchronization choices

- The queue handles packet ownership and synchronizes send/receive operations.
- The mutex protects shared metrics. The producer holds it across the nonblocking send and accounting so a consumer cannot publish a receive count before acceptance is counted. Never change that send to a blocking wait while holding the metrics mutex: it could prevent consumer progress.
- The completion semaphore communicates an event, not a packet count.
- The monitor has priority 3; producer and consumer have priority 2. Time slicing is enabled. Overload is a burst with no producer delay, while normal traffic waits 20 ms between attempts.

Queue-depth samples occur after sends, so they are observations rather than a precise instrumented high-water mark under every possible schedule. The Windows host can run substantially slower than nominal tick time. Latency values must not be advertised as embedded benchmarks.

## Automated scenarios

Run `./build.ps1` from PowerShell. Every scenario runs in a fresh process and writes a JSON result under `results/` only after a successful exit.

| Scenario | Assertions |
| --- | --- |
| normal | 100 produced and received, no drops or corruption, idle receive timeout observed |
| overload | Drops occur; all accepted packets eventually arrive |
| stall | Eight accepted, 92 dropped, zero received |
| empty | No packets, no drops, consumer timeout observed |
| corrupt | 100 received with exactly one deliberately damaged checksum detected |

All scenarios check accounting, bounded depth, and FIFO order. Invalid scenario names and extra arguments must exit with status 1. The corrupt scenario passes when the injected fault is detected; a passing result does not mean that its packets were all intact.

## Further work

The browser companion is a JavaScript simulation with separate native result records. It is hosted on Vercel; the native C core and demo source are published in the standalone GitHub repository linked from README.md. Persistence is unnecessary for this finite test harness.

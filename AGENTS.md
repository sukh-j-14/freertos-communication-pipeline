# Project context

Work only on FreeRTOS Communication Pipeline in this folder. This is one of three separate projects, not a monorepo.
Keep the native C core. The browser companion is a JavaScript teaching simulation and must never be described as native FreeRTOS or RF hardware execution.
Read README.md and existing code before making changes. Start native changes by running build.ps1 and reviewing tests. Native tests require normal Windows process access on this machine.
Native suite: five scenarios plus invalid arguments, verified 2026-11-08. Browser model: npm test; build: npm run build; local preview: npm run dev.
GitHub: https://github.com/sukh-j-14/freertos-communication-pipeline
Vercel: https://freertos-communication-pipeline.vercel.app
Use Neon Postgres plus Prisma for relational data; MongoDB plus Mongoose for document data if needed. Current demo has no persistence requirement. Never commit credentials.
Do not invent resume results or claim the user has mastered these concepts.

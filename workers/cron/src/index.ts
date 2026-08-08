import { syncIcs } from "./sync-ics";
import type { CronEnv } from "./env";

/*
 * The cron worker. Separate Wrangler project from the Next app (which deploys
 * through the OpenNext adapter and owns only a fetch handler) — PLAN.md §2.
 *
 * Phase 3 registers one trigger, hourly:
 *   0 * * * *  → ICS calendar sync
 * Phase 4 adds the Instagram feed sync on the same worker.
 *
 * The scheduled handler never throws: a sync failure is a recorded state (see
 * sync_state), not a crash, so Cloudflare's retry doesn't double-run the job.
 */
const worker = {
  async scheduled(
    _controller: ScheduledController,
    env: CronEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      syncIcs(env).then(
        (result) => console.log("ics sync:", JSON.stringify(result)),
        (err) => console.error("ics sync threw:", err),
      ),
    );
  },
};

export default worker;

/*
 * Minimal Cloudflare runtime types. Declared here rather than pulling in
 * @cloudflare/workers-types, whose globals collide with the DOM lib the Next app
 * typechecks against in this same tsconfig.
 */
interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

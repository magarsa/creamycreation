import { syncIcs } from "./sync-ics";
import { syncIg } from "./sync-ig";
import type { CronEnv } from "./env";

/*
 * The cron worker. Separate Wrangler project from the Next app (which deploys
 * through the OpenNext adapter and owns only a fetch handler) — PLAN.md §2.
 *
 * Two triggers, both hourly, offset so they don't share an invocation's
 * execution-time budget and a slow one can't delay the other (wrangler.jsonc
 * → triggers.crons):
 *   20 * * * *  → ICS calendar sync    (Phase 3)
 *   40 * * * *  → Instagram feed sync  (Phase 4)
 *
 * `controller.cron` tells us which pattern fired; each trigger runs only its
 * own job, not both — the sync_state row per job (`ics`/`instagram`) already
 * assumes each syncs independently, and running the other job's fetch inside
 * a tick that's supposed to be about the first defeats the point of splitting
 * them.
 *
 * The scheduled handler never throws: a sync failure is a recorded state (see
 * sync_state), not a crash, so Cloudflare's retry doesn't double-run the job.
 */
const worker = {
  async scheduled(
    controller: ScheduledController,
    env: CronEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    if (controller.cron === "40 * * * *") {
      ctx.waitUntil(
        syncIg(env).then(
          (result) => console.log("ig sync:", JSON.stringify(result)),
          (err) => console.error("ig sync threw:", err),
        ),
      );
      return;
    }
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

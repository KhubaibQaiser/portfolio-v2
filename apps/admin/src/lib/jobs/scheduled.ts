import { getContentRepository, getJobBoardRepository } from "@portfolio/data";
import { loadCandidateFactsUncached } from "@/lib/resume-ai/load-candidate-facts-uncached";
import { logger } from "@/lib/logger";
import { runJobIngest } from "./run-ingest";
import { runJobNotify } from "./run-notify";
import { sendJobEmail, type JobEmailJob } from "./send-job-email";
import { adminAppOrigin, jobMailRecipients, loadOptionalSecret } from "./secrets";

async function mailTransport(): Promise<{
  apiKey: string;
  from: string;
  to: string;
  origin: string;
} | null> {
  const recipients = jobMailRecipients();
  const apiKey = await loadOptionalSecret("RESEND_API_KEY_SECRET_ARN");
  if (!recipients || !apiKey) return null;
  return { apiKey, from: recipients.from, to: recipients.to, origin: adminAppOrigin() };
}

export async function runScheduledIngest(): Promise<void> {
  const transport = await mailTransport();
  const jobspipeKey = await loadOptionalSecret("JOBSPIPE_API_KEY_SECRET_ARN");
  const summary = await runJobIngest({
    content: getContentRepository(),
    jobs: getJobBoardRepository(),
    getFacts: async () => {
      const facts = await loadCandidateFactsUncached();
      return {
        skillNames: Object.values(facts.idMap.skills).map((skill) => skill.name),
        factSheet: facts.factSheet,
      };
    },
    jobspipeKey,
    mailer: transport
      ? {
          sendImmediate: async (job: JobEmailJob) => {
            await sendJobEmail({
              apiKey: transport.apiKey,
              from: transport.from,
              to: transport.to,
              subject: `High match (${job.score}): ${job.title} at ${job.company}`,
              introHtml: `<p>New job at or above the notify threshold.</p>`,
              jobs: [job],
              adminOrigin: transport.origin,
            });
          },
        }
      : null,
    logger: {
      error: (message, extra) => {
        logger.error(message, extra ?? {});
      },
    },
  });
  logger.info("job ingest complete", summary);
}

export async function runScheduledNotify(): Promise<void> {
  const transport = await mailTransport();
  const summary = await runJobNotify({
    content: getContentRepository(),
    jobs: getJobBoardRepository(),
    mailer: transport
      ? {
          sendDigest: async (jobs) => {
            await sendJobEmail({
              apiKey: transport.apiKey,
              from: transport.from,
              to: transport.to,
              subject: `Job digest: ${jobs.length} match${jobs.length === 1 ? "" : "es"} ≥ 70`,
              introHtml: `<p>Morning digest of new matches at or above the digest threshold.</p>`,
              jobs,
              adminOrigin: transport.origin,
            });
          },
          sendFollowUp: async (job, followUpAt) => {
            await sendJobEmail({
              apiKey: transport.apiKey,
              from: transport.from,
              to: transport.to,
              subject: `Follow up with ${job.company} — applied`,
              introHtml: `<p>Follow-up is due (was ${followUpAt}). Snooze from admin if you want another 7 days.</p>`,
              jobs: [job],
              adminOrigin: transport.origin,
            });
          },
        }
      : null,
    logger: {
      error: (message, extra) => {
        logger.error(message, extra ?? {});
      },
    },
  });
  logger.info("job notify complete", summary);
}

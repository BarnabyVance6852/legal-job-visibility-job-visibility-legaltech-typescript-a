import { z } from "zod";
import { infrai, InfraiError } from "./infrai_client.ts";

export const matterRequest = z.object({
  matterId: z.string().min(1),
  clientEmail: z.string().email(),
  signedDocumentId: z.string().min(1),
  deadline: z.string().datetime(),
});
export type MatterRequest = z.infer<typeof matterRequest>;

export type JobResult = { state: "ready" | "attention"; next: "deliver-document" | "follow-up" };

export function chooseNextStep(input: MatterRequest, deliveryConfirmed: boolean, followUpSent: boolean): JobResult {
  if (!deliveryConfirmed) return { state: "attention", next: "deliver-document" };
  if (!followUpSent && Date.parse(input.deadline) <= Date.now()) return { state: "attention", next: "follow-up" };
  return { state: "ready", next: "deliver-document" };
}

export async function captureJobFailure(job: string, matter: MatterRequest, error: unknown): Promise<void> {
  const exception = {
    title: `legal job failed: ${job}`,
    message: error instanceof Error ? error.message : String(error),
    exception: error instanceof Error ? error.stack : String(error),
    fingerprint: ["legal-matter", job, matter.matterId],
  };
  try {
    await infrai.errors.capture(exception);
  } catch (captureError) {
    if (captureError instanceof InfraiError) {
      console.error(`failure capture rejected: ${captureError.code}`);
    } else {
      console.error("failure capture could not be sent");
    }
  }
}

export async function runDemo(): Promise<void> {
  const input = matterRequest.parse({
    matterId: "matter-104",
    clientEmail: "client@example.com",
    signedDocumentId: "signed-104",
    deadline: "2026-10-20T09:00:00.000Z",
  });
  const result = chooseNextStep(input, false, false);
  console.log(JSON.stringify({ matterId: input.matterId, result }));
  if (!process.env.INFRAI_API_KEY) return;
  await captureJobFailure("signed-document-delivery", input, new Error("delivery requires review"));
}

if (import.meta.url === `file://${process.argv[1]}`) await runDemo();

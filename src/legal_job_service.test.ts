import test from "node:test";
import assert from "node:assert/strict";
import { chooseNextStep, matterRequest } from "./legal_job_service.ts";

test("a signed document that was not delivered moves the matter to delivery", () => {
  const matter = matterRequest.parse({
    matterId: "matter-1",
    clientEmail: "person@example.com",
    signedDocumentId: "signed-1",
    deadline: "2026-10-20T09:00:00.000Z",
  });
  assert.deepEqual(chooseNextStep(matter, false, false), { state: "attention", next: "deliver-document" });
});

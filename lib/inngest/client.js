import { Inngest } from "inngest";

// Create a client to send and receive events
console.log("[inngest] client module loaded - cwd:", process.cwd(), {
  INNGEST_KEY: Boolean(process.env.INNGEST_KEY),
  INNGEST_PROJECT: process.env.INNGEST_PROJECT || null,
});

export const inngest = new Inngest({ id: "splitwise" });

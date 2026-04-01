#!/usr/bin/env node

import { CommanderError } from "commander";
import { run } from "../dist/cli.js";

run().catch((error) => {
  if (error instanceof CommanderError) {
    process.exitCode = error.exitCode;
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nError: ${message}`);
  process.exitCode = 1;
});

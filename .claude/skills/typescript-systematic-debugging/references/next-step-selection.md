# Next-Step Selection

Use this when there are several plausible checks and the main job is deciding
which one to do next.

The goal is not "more investigation." The goal is the single next step that
removes the most uncertainty while changing the least.

## Pick The Step That Wins On Most Of These

### 1. Discriminating Power

- Does this step separate the top hypotheses from each other?
- Will the result change what we inspect next?
- If it succeeds or fails, do we learn something specific?

Prefer a step that kills branches over a step that only gathers more context.

### 2. Low Mutation

- Can this step be done by observing, reproducing, tracing, or inspecting
  state instead of changing behavior?
- If it changes behavior, does it change only one variable?

Avoid multi-variable experiments unless the task is already in fix-validation
mode.

### 3. Boundary Proximity

- Does this step inspect the first plausible bad boundary instead of a distant
  downstream symptom?
- Would checking closer to the truth owner make a later downstream check
  unnecessary?

### 4. Fast Feedback

- Can this step run quickly enough to keep the debugging loop tight?
- Is it smaller than a broad benchmark, deploy, or rewrite?

Prefer the smallest step that can falsify the strongest theory.

### 5. Blast Radius

- Can this be done without changing production behavior?
- If a change is necessary, is it safe and reversible?

## Prefer Steps Like

- confirm the first failing lifecycle phase
- compare queue wait with execution time
- inspect one boundary contract or state transition
- distinguish transport failure from application rejection
- verify whether a stream stalls on generation or backpressure
- add one targeted probe whose answer has a named consumer

## Avoid Steps Like

- "increase the timeout and see"
- "add retries and see"
- "rewrite the flow"
- "log everything"
- "change pool size and compare later"

Those are rarely good next steps unless the failure surface is already proven.

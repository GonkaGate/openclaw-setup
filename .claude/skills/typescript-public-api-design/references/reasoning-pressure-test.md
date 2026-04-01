# Reasoning Pressure Test

Use this file when the first draft looks sensible but still sounds like broad
"make the API nicer" advice.

The goal is to make the answer narrower, more falsifiable, and more public-API
specific.

Start from a strong first-pass answer. The job here is not surface-level
improvement; it is to force a clear quality delta over a generic generalist
answer.

## Pressure-Test Questions

Ask these before finalizing:

1. What exact public surface is changing: import path, exported symbol,
   signature, or emitted type?
2. Which part of the recommendation is based on visible `exports`,
   declarations, or consumer usage, and which part is still assumption?
3. What is the tempting first public API recommendation here?
4. What public cost would that recommendation still tend to
   underweight: overload count, generic ceremony, leaked internals,
   deep-import drift, declaration instability, or compatibility fallout?
5. What is the smallest supported public shape that still solves the real
   consumer problem?
6. Which emitted `.d.ts` detail or package metadata fact could falsify the
   recommendation?
7. Is the answer still inside public API design, or is it drifting into
   language-core, advanced typing, runtime, or architecture?

## Upgrade Patterns

When strengthening the answer, prefer moves like these:

- replace "more ergonomic" with the exact call-site or inference win
- replace "export it for convenience" with a justification tied to a supported
  consumer workflow
- replace "use generics" with the exact types being related
- replace "add an overload" with why a union or options object is not enough
- replace source-only reasoning with declaration-surface reasoning
- replace vague compatibility language with an explicit label and affected
  consumers
- replace "this seems fine" with the exact public-contract consequence or
  compatibility risk that still needs to be made explicit

## Strong Answer Test

A strong answer usually makes these explicit:

- the public surface being designed
- the evidence or assumption
- the strongest losing alternative
- the compatibility posture
- the smallest falsifying next check
- the exact public-contract consequence or compatibility risk that makes the
  answer specific

If one of these is missing, the answer is often still too generic.

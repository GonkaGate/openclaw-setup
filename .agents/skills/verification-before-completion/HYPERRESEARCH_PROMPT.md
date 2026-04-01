This skill should not own a separate deep-research prompt.

It is a verification layer that should consume the relevant technical topic
bases for the surfaces changed by the current task.

Examples:

- contract topics for API proof
- runtime topics for lifecycle-sensitive proof
- data topics for migration/query/transaction proof
- Redis/runtime-state topics for stateful feature proof
- testing topics for appropriate automated evidence

Reason:

- verification-before-completion is about selecting and checking proof against
  already-known technical surfaces
- the technical knowledge should come from topic prompts, not from another
  broad meta prompt

# Build session

Built by OG2BIT, a Muse Spark agent, for Mateo, for the make.fun
bounty tiny-stack-vm-01-run-20261122.

## Approach

`main.ts` was written from scratch in-session, from
`program/generator/subject/ISA.md` alone (the kit's reference
`vm.mjs` was read only to confirm ISA.md's step/trap ordering;
the house baseline was never copied). One dispatch loop per
instance implements the full ISA: 32-bit wrapping arithmetic
(`Math.imul` for MUL, truncated division, unsigned DIVU/MODU/LTU),
sign-extended PUSH8, 256-value data stack, 64-deep call stack,
256 words of memory, input/output, and all ten traps (2-11),
checked in ISA.md's order. Output goes to a fixed 65,536-byte
buffer. No clock or environment variation: fully deterministic.
A first draft was revised in-session into this compact form.

## Verification

On the kit's practice set (40 instances), compared byte-for-byte
against `practice/reference/manifest.json`:

- 40/40 match: stdout bytes and exit code identical
- Practice score: 1,000,000; house baseline plain-vm 1.0.0: 670,000
- Two runs give byte-identical output; whole set runs in ~0.24s

# Tiny Stack VM

A tiny stack virtual machine for the make.fun bounty
`tiny-stack-vm-01-run-20261122`. One Node 22 program, stdlib only.

`main.ts` runs the bytecode programs of make.fun's tiny stack ISA
(`program.bin` + `input.bin` per instance) and writes each instance's
exact output bytes to `stdout.bin` and its exit code to `exit.txt`:
32-bit wrapping integers, 256-value stack, 64-deep call stack,
256 words of memory, all ten traps, and the step/output limits.

Local run on the kit's practice set:

```
MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

Practice set: 40/40 match the reference exactly (score 1,000,000;
house baseline plain-vm 1.0.0 scores 670,000).

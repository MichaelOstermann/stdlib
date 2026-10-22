#!/bin/sh
# Every benchmark of the documentation, in V8 (Node) and JavaScriptCore (Bun): bun run benchmarks
set -e
cd "$(dirname "$0")/.."

for runtime in node bun; do
    bun benchmarks/run.ts match --runtime=$runtime
    bun benchmarks/run.ts match --runtime=$runtime --transform
    bun benchmarks/run.ts setPath --runtime=$runtime
    bun benchmarks/run.ts setPath --runtime=$runtime --transform
    bun benchmarks/run.ts pipe --runtime=$runtime
    bun benchmarks/run.ts pipe --runtime=$runtime --transform
    bun benchmarks/run.ts map --runtime=$runtime --transform
    bun benchmarks/run.ts copy-on-write --runtime=$runtime
    bun benchmarks/run.ts computed-properties --runtime=$runtime
    bun benchmarks/run.ts equality --runtime=$runtime
    bun benchmarks/run.ts lookup --runtime=$runtime
    bun benchmarks/run.ts rest-parameters --runtime=$runtime
    bun benchmarks/run.ts array-copies --runtime=$runtime
done

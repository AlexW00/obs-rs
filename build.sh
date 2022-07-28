#!/bin/sh

set -ex

RUSTFLAGS='-C target-feature=+atomics,+bulk-memory,+mutable-globals' \
  cargo build --target wasm32-unknown-unknown --release -Z build-std=std,panic_abort

wasm-bindgen target/wasm32-unknown-unknown/release/obsidian_rust_plugin.wasm --out-dir ./pkg --target no-modules

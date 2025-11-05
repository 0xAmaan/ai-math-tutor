#!/bin/bash
# Copy VAD model files and worklet to public directory
# Run this after `bun install` if VAD models are missing

echo "Setting up VAD assets..."

# Create directory
mkdir -p public/_next/static/chunks

# Copy ONNX models and worklet
cp node_modules/@ricky0123/vad-web/dist/*.onnx public/_next/static/chunks/
cp node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js public/_next/static/chunks/

echo "✓ VAD assets copied to public/_next/static/chunks/"
echo "  - silero_vad_legacy.onnx"
echo "  - silero_vad_v5.onnx"
echo "  - vad.worklet.bundle.min.js"

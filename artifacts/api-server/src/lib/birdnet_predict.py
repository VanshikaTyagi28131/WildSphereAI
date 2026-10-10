import csv
import json
import sys
import tempfile

import birdnet


def main() -> None:
    if len(sys.argv) != 2:
        raise ValueError("Expected a local audio file path")

    # BirdNET Acoustic 3.0 runs locally using the official ONNX backend.
    # The library downloads its model into its managed cache on first use.
    model = birdnet.load("acoustic", "3.0", "onnx")
    predictions = model.predict(sys.argv[1])

    with tempfile.NamedTemporaryFile(mode="w+", suffix=".csv", delete=False) as output:
        csv_path = output.name
    try:
        predictions.to_csv(csv_path, index=False)
        best: dict[str, dict[str, object]] = {}
        with open(csv_path, newline="", encoding="utf-8") as source:
            for row in csv.DictReader(source):
                label = row.get("species_name", "")
                try:
                    score = float(row.get("confidence", ""))
                except (TypeError, ValueError):
                    continue
                if "_" in label:
                    scientific, common = label.split("_", 1)
                else:
                    scientific, common = label, label
                current = best.get(label)
                if current is None or score > float(current["confidence"]):
                    best[label] = {
                        "scientificName": scientific.strip(),
                        "commonName": common.strip(),
                        "confidence": max(0.0, min(1.0, score)),
                    }
        ranked = sorted(
            best.values(), key=lambda item: float(item["confidence"]), reverse=True
        )[:5]
        print(json.dumps({"candidates": ranked}, ensure_ascii=False))
    finally:
        import os

        os.unlink(csv_path)


if __name__ == "__main__":
    main()

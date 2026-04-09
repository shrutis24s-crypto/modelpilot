from backend.modelpilot.registry import resolve_model
from backend.modelpilot.builder import build_image
from backend.modelpilot.runner import run_image

print("Resolving model...")
spec = resolve_model("sample_model")

print("Building image...")
image_tag, version = build_image(spec)
print("Built image:", image_tag)

print("Running container...")
run_id = run_image(
    image_tag=image_tag,
    model_name=spec.name,
    input_file="input.csv",
    use_gpu=False,
)

print("Run completed:", run_id)
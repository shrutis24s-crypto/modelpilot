import json, hashlib

def md5_metrics(path):
    data = json.load(open(path))
    metrics = data.get("metrics", {})
    serialised = json.dumps(metrics, sort_keys=True).encode()
    return hashlib.md5(serialised).hexdigest(), metrics

win_hash, win_metrics = md5_metrics("evaluation_results/method3_windows_output.json")
ubu_hash, ubu_metrics = md5_metrics("evaluation_results/method3_ubuntu_output.json")

print(f"Windows hash : {win_hash}")
print(f"Ubuntu hash  : {ubu_hash}")
print(f"Match        : {win_hash == ubu_hash}")
print()
print(f"{'Metric':<20} {'Windows':>10} {'Ubuntu':>10} {'Match':>8}")
print("-" * 52)
for k in win_metrics:
    w = win_metrics.get(k)
    u = ubu_metrics.get(k)
    match = "✅" if w == u else "❌"
    print(f"{k:<20} {str(w):>10} {str(u):>10} {match:>8}")
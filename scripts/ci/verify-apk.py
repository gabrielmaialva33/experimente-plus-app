"""Fail publication if prebuild stops producing a standalone, debug-key APK."""

import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import zipfile


def run(*args):
    return subprocess.check_output(args, text=True).strip()


def sdk_tool(sdk, directory, name):
    candidates = list((sdk / directory).glob(f"*/{name}"))
    if not candidates:
        raise SystemExit(f"Missing Android SDK tool: {name}")
    return str(sorted(candidates)[-1])


apk = Path(sys.argv[1]).resolve()
sdk = Path(os.environ["ANDROID_HOME"])
origin = os.environ["EXPO_PUBLIC_API_BASE_URL"]
if origin != "https://experimente-plus.mahina.fun":
    raise SystemExit("CI APK must explicitly target the public pilot origin")

with zipfile.ZipFile(apk) as archive:
    bundle = archive.read("assets/index.android.bundle")
    if not bundle or origin.encode() not in bundle:
        raise SystemExit("Missing embedded bundle or inlined pilot origin")
    for abi in ("arm64-v8a", "x86_64"):
        if f"lib/{abi}/libreactnative.so" not in archive.namelist():
            raise SystemExit(f"Missing native payload for {abi}")

analyzer = sdk_tool(sdk, "cmdline-tools", "bin/apkanalyzer")
if run(analyzer, "manifest", "debuggable", str(apk)) != "false":
    raise SystemExit("Expected release runtime: developer support must be disabled")

signer = sdk_tool(sdk, "build-tools", "apksigner")
signature = run(signer, "verify", "--print-certs", str(apk))
certificate = subprocess.check_output([
    "keytool", "-exportcert", "-keystore", "android/app/debug.keystore",
    "-alias", "androiddebugkey", "-storepass", "android",
])
expected = hashlib.sha256(certificate).hexdigest()
actual = re.findall(r"Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]+)", signature)
if not actual or {digest.lower() for digest in actual} != {expected.lower()}:
    # Print the evidence instead of discarding it: this check passes locally and
    # has never passed in CI, so the difference is environmental and a bare
    # failure gives the next run nothing to go on. Digests and tool paths are
    # not secrets; the keystore password is not printed.
    raise SystemExit(
        "APK must be signed only with the generated debug certificate\n"
        f"  expected (android/app/debug.keystore): {expected}\n"
        f"  found in APK: {actual or '<no digest matched the apksigner output>'}\n"
        f"  apksigner: {signer}\n"
        f"  apksigner output:\n{signature}"
    )

print(f"Verified {apk.name}: embedded bundle ({len(bundle)} bytes), pilot origin,")
print("arm64-v8a + x86_64, debuggable=false, valid generated debug-key signature.")

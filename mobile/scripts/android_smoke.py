"""Launch the installed Rust app and verify its accessible sign-in screen."""
import csv, io, json, os, re, subprocess, sys, time, xml.etree.ElementTree as ET
from pathlib import Path
apk=Path(sys.argv[1]).resolve()
aapt=Path(os.environ["ANDROID_HOME"])/"build-tools"/"35.0.0"/"aapt"
badging=subprocess.check_output([str(aapt),"dump","badging",str(apk)],text=True)
package=re.search(r"package: name='([^']+)'",badging).group(1)
activity=re.search(r"launchable-activity: name='([^']+)'",badging).group(1)
subprocess.run(["adb","install","-r",str(apk)],check=True)
subprocess.run(["adb","shell","am","start","-n",package+"/"+activity],check=True)
time.sleep(8)
subprocess.run(["adb","shell","uiautomator","dump","/sdcard/resiro-ui.xml"],check=True)
xml=subprocess.check_output(["adb","exec-out","cat","/sdcard/resiro-ui.xml"],text=True)
out=Path("mobile/previews");out.mkdir(parents=True,exist_ok=True)
(out/"android-ui.xml").write_text(xml)
(out/"android-logcat.txt").write_text(subprocess.check_output(["adb","logcat","-d"],text=True,errors="replace"))
(out/"Resiro-android-launch.png").write_bytes(subprocess.check_output(["adb","exec-out","screencap","-p"]))
os.environ["RESIRO_ANDROID_PACKAGE"]=package
result=subprocess.run(["node","mobile/scripts/android_dom_smoke.cjs"])
(out/"android-logcat.txt").write_text(subprocess.check_output(["adb","logcat","-d"],text=True,errors="replace"))
if result.returncode:
    (out/"Resiro-android-failure.png").write_bytes(subprocess.check_output(["adb","exec-out","screencap","-p"]))
    raise SystemExit(result.returncode)

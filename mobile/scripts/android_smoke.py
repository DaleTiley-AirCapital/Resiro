"""Launch the installed Rust app and verify its accessible sign-in screen."""
import json, os, re, subprocess, sys, time, xml.etree.ElementTree as ET
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
assert "Resiro" in xml and ("Sign in" in xml or "sign in" in xml), "Native sign-in screen did not render"
out=Path("mobile/previews");out.mkdir(parents=True,exist_ok=True)
(out/"Resiro-android-launch.png").write_bytes(subprocess.check_output(["adb","exec-out","screencap","-p"]))
(out/"android-launch-check.json").write_text(json.dumps({"package":package,"activity":activity,"installed":True,"sign_in_screen_rendered":True,"dashboard_login_tested":False}))
print("Android application installed, launched and rendered the sign-in screen.")

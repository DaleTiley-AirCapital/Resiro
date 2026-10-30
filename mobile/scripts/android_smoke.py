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
out=Path("mobile/previews");out.mkdir(parents=True,exist_ok=True)
(out/"android-ui.xml").write_text(xml)
(out/"android-logcat.txt").write_text(subprocess.check_output(["adb","logcat","-d"],text=True,errors="replace"))
(out/"Resiro-android-launch.png").write_bytes(subprocess.check_output(["adb","exec-out","screencap","-p"]))
ocr=subprocess.check_output(["tesseract",str(out/"Resiro-android-launch.png"),"stdout"],text=True,stderr=subprocess.DEVNULL)
assert re.search(r"sign\s*in",ocr,re.I) and "Email" in ocr, "Native sign-in screen did not render"
# Interact with the screen that the emulator screenshot verifies. UIAutomator does
# not expose this debug WebView's DOM, so use its observed 320x640 touch layout.
subprocess.run(["adb","shell","input","tap","60","260"],check=True)
subprocess.run(["adb","shell","input","text","dale.tiley@email.com"],check=True)
subprocess.run(["adb","shell","input","keyevent","61"],check=True)
subprocess.run(["adb","shell","input","text","demo123"],check=True)
subprocess.run(["adb","shell","input","keyevent","4"],check=True)
time.sleep(1)
subprocess.run(["adb","shell","input","tap","60","420"],check=True)
dashboard=False
for attempt in range(12):
    time.sleep(3)
    image=subprocess.check_output(["adb","exec-out","screencap","-p"])
    (out/"Resiro-android-dashboard.png").write_bytes(image)
    words=subprocess.check_output(["tesseract",str(out/"Resiro-android-dashboard.png"),"stdout"],text=True,stderr=subprocess.DEVNULL)
    if re.search(r"my\s+properties",words,re.I):
        dashboard=True
        break
assert dashboard, "Native owner dashboard did not load after demo sign-in"
(out/"android-launch-check.json").write_text(json.dumps({"package":package,"activity":activity,"installed":True,"sign_in_screen_rendered":True,"dashboard_login_tested":True}))
print("Android application installed, launched, signed in and loaded the owner dashboard.")

const fs=require('node:fs');
const cp=require('node:child_process');
const {_android:android}=require(process.env.NATIVE_PLAYWRIGHT_PATH);
(async()=>{
 const [device]=await android.devices();
 if(!device)throw Error('Android emulator not found');
 device.setDefaultTimeout(30000);
 const webview=await device.webView({pkg:process.env.RESIRO_ANDROID_PACKAGE});
 const page=await webview.page();
 page.setDefaultTimeout(30000);
 async function login(email,password){
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
 }
 try{
  await login('dale.tiley@email.com','demo123');
  await page.getByRole('heading',{name:'My properties',exact:true}).waitFor();
  fs.writeFileSync('mobile/previews/Resiro-android-dashboard.png',cp.execFileSync('adb',['exec-out','screencap','-p']));
  await page.locator('button.doc-card').first().click();
  await page.getByRole('button',{name:'Documents',exact:true}).click();
  await page.locator('button.doc-card').filter({hasText:'Demo bed receipt.txt'}).first().waitFor();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await login('info@millenniumroofing.co.za','supplier123');
  await page.getByRole('heading',{name:'Supplier dashboard',exact:true}).waitFor();
  fs.writeFileSync('mobile/previews/Resiro-android-supplier.png',cp.execFileSync('adb',['exec-out','screencap','-p']));
  fs.writeFileSync('mobile/previews/android-launch-check.json',JSON.stringify({installed:true,owner_login:true,owner_dashboard:true,documents_load:true,supplier_login:true,supplier_dashboard:true}));
  console.log('Native Android owner login, documents and supplier login passed.');
 }catch(error){
  fs.writeFileSync('mobile/previews/Resiro-android-failure.png',cp.execFileSync('adb',['exec-out','screencap','-p']));
  fs.writeFileSync('mobile/previews/android-visible-error.txt',await page.locator('body').innerText());
  throw error;
 }finally{await device.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});

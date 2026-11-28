const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base="http://127.0.0.1:3000";
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [375,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:"reduce"});
   const page=await context.newPage();
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   for(const route of ["/","/shop","/gifts","/assistant","/compare","/wishlist"]){
    const response=await page.goto(base+route,{waitUntil:"domcontentloaded"});
    assert.equal(response.status(),200,route);
    await page.locator("main").waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"),"en-US");
    assert.equal(await page.locator("main").count(),1,route+" main landmark");
    const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,domContentLoadedMs:Math.round(performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd)}));
    console.log(JSON.stringify({width,route,...metrics}));
    assert.ok(metrics.scrollWidth<=metrics.width+2,route+" horizontal overflow at "+width);
   }
   await page.goto(base+"/");
   const skip=page.getByRole("link",{name:"Skip to content"});
   await skip.focus();assert.equal(await skip.evaluate(e=>document.activeElement===e),true);
   if(width<=960){
    const menu=page.locator(".dw2-menu-toggle");
    await menu.click();assert.equal(await menu.getAttribute("aria-expanded"),"true");
    await page.keyboard.press("Escape");
    assert.equal(await menu.getAttribute("aria-expanded"),"false");
    assert.equal(await menu.evaluate(e=>document.activeElement===e),true);
   }
   await page.goto(base+"/admin");
   assert.match(page.url(),/\/admin\/login/);
   assert.deepEqual(errors,[],"Unhandled browser errors at "+width);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

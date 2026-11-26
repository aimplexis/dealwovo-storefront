const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-workforce-"));
try{
 cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--rootDir","src/lib","--outDir",dir,"src/lib/catalog/product-quality.ts","src/lib/marketing/editorial-discovery.ts"],{stdio:"inherit"});
 const {assessProductQuality:a,qualityChecks:q}=require(path.join(dir,"catalog/product-quality.js"));
 const {prepareEditorialDraft,editorialTopics,editorialChannels}=require(path.join(dir,"marketing/editorial-discovery.js"));
 const today="2026-11-25";
 const good=q.map(([check])=>({check,decision:"clear",source:"https://example.com/research",date:today,note:"Synthetic test observation and documented review limitations.",confirmed:true}));
 assert.equal(q.length,8);
 assert.equal(a([],today).status,"incomplete");
 assert.equal(a(good,today).status,"ready_for_independent_verification");
 assert.equal(a(good,today).documented,8);
 for(let i=0;i<good.length;i++){
  assert.equal(a(good.filter((_,j)=>j!==i),today).status,"incomplete");
  for(const patch of [{confirmed:false},{source:"http://example.com"},{source:"https://localhost"},{source:"https://user:pass@example.com"},{date:"2026-11-26"},{date:"2026-02-30"},{note:"Short"},{date:"2026-10-01"},{decision:"unknown"}]){
   assert.equal(a(good.map((r,j)=>j===i?{...r,...patch}:r),today).status,"incomplete");
  }
  assert.equal(a([...good,good[i]],today).status,"incomplete");
  assert.equal(a([...good,{...good[i],decision:"concern",confirmed:false,date:"2025-01-01"}],today).status,"hold");
  const maxAge=q[i][2],cutoff=new Date(Date.parse(today)-maxAge*86400000).toISOString().slice(0,10);
  assert.equal(a(good.map((r,j)=>j===i?{...r,date:cutoff}:r),today).status,"ready_for_independent_verification");
  const expired=new Date(Date.parse(cutoff)-86400000).toISOString().slice(0,10);
  assert.equal(a(good.map((r,j)=>j===i?{...r,date:expired}:r),today).status,"incomplete");
 }
 assert.equal(a(good,"invalid").status,"incomplete");
 assert.equal(editorialTopics.length,8);
 assert.equal(editorialChannels.length,3);
 for(const t of editorialTopics)for(const channel of editorialChannels){
  const d=prepareEditorialDraft(t.key,channel);assert.equal(d.status,"draft");assert.equal(d.href,t.href);assert.ok(d.text.includes(t.hook));assert.ok(d.text.includes(t.body));assert.ok(d.review.includes("not publication approval"));assert.ok(/^\/(solutions|guides|lifestyle|gifts|deals)(\/[-a-z0-9]+)?$/.test(d.href));assert.ok(fs.existsSync(d.href.startsWith("/guides/")?"app/guides/[slug]/page.tsx":"app"+d.href+"/page.tsx"));
 }
 assert.equal(prepareEditorialDraft("invalid","social"),null);
 assert.equal(prepareEditorialDraft("unexpected","publish"),null);
 console.log("PASS discovery workforce: product quality concerns, freshness, evidence and 24 editorial draft combinations");
}finally{fs.rmSync(dir,{recursive:true,force:true});}

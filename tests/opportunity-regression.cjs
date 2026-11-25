const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-opp-"));try{cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/marketing/opportunity.ts","src/lib/marketing/discovery-value.ts"],{stdio:"inherit"});const {scoreEvidence:s,dimensions:d,expenseCents:e}=require(path.join(dir,"opportunity.js"));const rows=d.map(([dimension],i)=>({id:i,dimension,observed_on:"2026-11-24",rating:80}));assert.equal(s([], "2026-11-24").score,null);assert.equal(s(rows,"2026-11-24").score,80);assert.equal(s(rows.slice(1),"2026-11-24").coverage,75);assert.equal(s(rows.slice(1),"2026-11-24").score,null);assert.equal(s(rows,"2027-01-01").coverage,0);assert.equal(s([...rows,{...rows[0],id:100,rating:null}],"2026-11-24").coverage,75);assert.equal(e("12.05"),1205);for(const v of ["0","-1","1.001","1e3","1000001"])assert.equal(e(v),null);const {discoveryDimensions,evaluateDiscovery}=require(path.join(dir,"discovery-value.js"));
const today="2026-11-25";
const valid=discoveryDimensions.map(([dimension])=>({dimension,rating:"80",source:"https://example.com/evidence",date:today,note:"Synthetic test observation, not actual product evidence.",reviewed:true}));
assert.equal(evaluateDiscovery(valid,today).score,80);
assert.equal(evaluateDiscovery(valid,today).coverage,100);
assert.equal(evaluateDiscovery([],today).score,null);
assert.equal(evaluateDiscovery(valid.slice(1),today).coverage,75);
assert.equal(evaluateDiscovery([...valid,valid[0]],today).score,null);
for(const patch of [{reviewed:false},{rating:"101"},{rating:"-1"},{rating:"1.5"},{rating:""},{source:"http://example.com"},{source:"https://user:pass@example.com"},{source:"javascript:alert(1)"},{date:"2026-11-26"},{date:"2026-10-25"},{date:"2026-02-30"},{note:"Too short"}]){
 assert.equal(evaluateDiscovery([{...valid[0],...patch},...valid.slice(1)],today).score,null);
}
assert.equal(evaluateDiscovery(valid.map(r=>({...r,date:"2026-10-26"})),today).score,80);
assert.equal(evaluateDiscovery(valid.map(r=>({...r,rating:"0"})),today).score,0);
assert.equal(evaluateDiscovery(valid.map(r=>({...r,rating:"100"})),today).score,100);
console.log("PASS discovery value evidence, coverage, boundaries, and reviewer confirmation");
console.log("PASS opportunity scoring, unknown/freshness, exact expense amounts");}finally{fs.rmSync(dir,{recursive:true,force:true});}
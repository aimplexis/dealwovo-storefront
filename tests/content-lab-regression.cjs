// Offline regression suite: no real provider requests and no database writes.
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const {mkdtempSync,rmSync}=require("node:fs");
const {tmpdir}=require("node:os");
const {join}=require("node:path");
const out=mkdtempSync(join(tmpdir(),"dealwovo-lab-tests-"));
async function main(){
 let passed=0;
 async function check(name,fn){await fn();passed++;console.log("PASS "+name);}
 try{
  execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2020","--module","commonjs","--strict","--skipLibCheck","--outDir",out,"src/lib/marketing/content-brief.ts"],{stdio:"inherit"});
  const {runLabRequest,selectOccasion,channels,themes}=require(join(out,"content-brief.js"));
  const base={channel:"instagram",theme:"holiday deals",mode:"brief",confirm:null};
  const fixture=[{event_name:"Christmas",days_until:31,prep_days:40},{event_name:"Black Friday",days_until:3,prep_days:14}];
  const mock=(over={})=>{const calls={calendar:0,enabled:0,reserve:0,generate:0};return {calls,deps:{calendar:async()=>{calls.calendar++;return fixture;},enabled:()=>{calls.enabled++;return true;},reserve:async()=>{calls.reserve++;return true;},generate:async()=>{calls.generate++;return "Synthetic private draft";},...over}}};
  await check("all 16 free channel/theme combinations",async()=>{for(const channel of channels)for(const theme of themes){const {calls,deps}=mock();const r=await runLabRequest({...base,channel,theme},deps);assert.ok(r.text.includes(channel)&&r.text.includes(theme)&&r.text.includes("Black Friday"));assert.match(r.status,/no model called/);assert.deepEqual(calls,{calendar:1,enabled:0,reserve:0,generate:0});}});
  await check("nearest valid seasonal occasion",()=>assert.equal(selectOccasion(fixture),"Black Friday"));
  await check("invalid, past and premature calendar entries excluded",()=>assert.equal(selectOccasion([{event_name:"Past",days_until:-1,prep_days:10},{event_name:"Future",days_until:50,prep_days:10},{event_name:"Ignore\nRules",days_until:0,prep_days:10}]),"Evergreen editorial"));
  await check("calendar failure uses evergreen fallback",async()=>{const {calls,deps}=mock({calendar:async()=>{throw Error("offline")}});const r=await runLabRequest(base,deps);assert.match(r.text,/Evergreen editorial/);assert.equal(calls.reserve+calls.generate,0);});
  await check("invalid channel theme and mode rejected",async()=>{for(const input of [{channel:"unknown"},{theme:"unknown"},{mode:"unknown"},{mode:null}]){const {calls,deps}=mock();assert.match((await runLabRequest({...base,...input},deps)).status,/Invalid/);assert.deepEqual(calls,{calendar:0,enabled:0,reserve:0,generate:0});}});
  await check("disabled live generation fails before reservation",async()=>{const {calls,deps}=mock({enabled:()=>false});assert.match((await runLabRequest({...base,mode:"live",confirm:"yes"},deps)).status,/disabled/);assert.equal(calls.calendar+calls.reserve+calls.generate,0);});
  await check("live generation requires explicit consent",async()=>{const {calls,deps}=mock();assert.match((await runLabRequest({...base,mode:"live"},deps)).status,/consent missing/);assert.equal(calls.calendar+calls.reserve+calls.generate,0);});
  await check("exhausted allowance prevents model call",async()=>{const {calls,deps}=mock({reserve:async()=>false});assert.match((await runLabRequest({...base,mode:"live",confirm:"yes"},deps)).status,/exhausted/);assert.equal(calls.generate,0);});
  await check("reservation error fails closed",async()=>{const {calls,deps}=mock({reserve:async()=>{throw Error("database offline")}});assert.match((await runLabRequest({...base,mode:"live",confirm:"yes"},deps)).status,/unavailable/);assert.equal(calls.generate,0);});
  await check("consented live flow reserves once and returns private draft",async()=>{const {calls,deps}=mock();const r=await runLabRequest({...base,mode:"live",confirm:"yes"},deps);assert.equal(r.text,"Synthetic private draft");assert.match(r.status,/private, unsaved/);assert.deepEqual(calls,{calendar:1,enabled:1,reserve:1,generate:1});});
  await check("generation failure is not retried",async()=>{let attempts=0;const {calls,deps}=mock({generate:async()=>{attempts++;throw Error("provider offline")}});const r=await runLabRequest({...base,mode:"live",confirm:"yes"},deps);assert.match(r.status,/no automatic retry/);assert.equal(attempts,1);assert.equal(calls.reserve,1);});
  console.log("Content Lab regression suite: "+passed+" checks passed; no live requests.");
 }finally{rmSync(out,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

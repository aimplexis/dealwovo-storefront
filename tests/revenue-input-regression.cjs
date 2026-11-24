const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-revenue-"));
try{cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/marketing/revenue-input.ts"],{stdio:"inherit"});
const {parseCommission,formatCents}=require(path.join(dir,"revenue-input.js"));
const today="2026-11-24",base={source_id:"00000000-0000-4000-8000-000000000001",transaction_ref:"tx-1",statement_ref:"s-1",transaction_on:"2026-11-22",statement_on:today,status:"approved",amount:"19.99",confirm:"yes"};
assert.equal(parseCommission(base,today).commission_cents,1999);assert.equal(parseCommission({...base,amount:"0.1"},today).commission_cents,10);assert.equal(parseCommission({...base,status:"reversed",amount:"0"},today).commission_cents,0);
for(const patch of [{amount:"1e2"},{amount:"-1"},{amount:"1.001"},{amount:"1000000.01"},{amount:""},{status:"reversed"},{status:"unknown"},{transaction_on:"2026-02-30"},{statement_on:"2026-11-25"},{statement_on:"2026-11-21"},{source_id:"bad"},{transaction_ref:"a b"},{confirm:"no"}])assert.equal(parseCommission({...base,...patch},today),null);
assert.equal(formatCents("900719925474099301"),"$9,007,199,254,740,993.01");assert.equal(formatCents("0"),"$0.00");assert.equal(formatCents("bad"),"Unavailable");console.log("PASS revenue input: exact cents, date guards, attestation, reversal, bounds and integer formatting");
}finally{fs.rmSync(dir,{recursive:true,force:true});}

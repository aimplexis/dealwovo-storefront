const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-saved-"));
try{cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/catalog/wishlist.ts"],{stdio:"inherit"});const {MAX_SAVED,readSaved,toggleSaved,savedEntry,validSavedIds,eligibleSavedOffers}=require(path.join(dir,"wishlist.js"));
const id=n=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0"),items=Array.from({length:MAX_SAVED+1},(_,i)=>({id:id(i+1),title:"Fixture "+i}));const a=items[0];
assert.deepEqual(toggleSaved([],a),[a]);assert.deepEqual(toggleSaved([a],a),[]);assert.deepEqual(toggleSaved(items.slice(0,MAX_SAVED),items[MAX_SAVED]),items.slice(0,MAX_SAVED));assert.equal(readSaved(JSON.stringify(items)).length,MAX_SAVED);
assert.deepEqual(readSaved(JSON.stringify([a,a,{id:"../invalid",title:"wrong"},{...items[1],price:123,affiliate_url:"discard"}])),[a,items[1]]);
assert.deepEqual(readSaved("invalid json"),[]);assert.deepEqual(readSaved(null),[]);assert.equal(savedEntry({id:a.id,title:"  x\u0000y  "}).title,"x y");assert.equal(savedEntry({id:a.id,title:"x".repeat(300)}).title.length,180);
assert.equal(validSavedIds([a.id]),true);assert.equal(validSavedIds([]),true);for(const v of [null,[a.id,a.id],["../bad"],items.map(x=>x.id),{ids:[a.id]}])assert.equal(validSavedIds(v),false);
const now=Date.parse("2026-11-24T12:00:00Z"),offer={id:id(100),verified_at:"2026-11-24T00:00:00Z",expires_at:"2026-11-25T00:00:00Z"};
assert.deepEqual(eligibleSavedOffers([offer,{...offer,expires_at:"2026-11-24T12:00:00Z"},{...offer,verified_at:"2026-11-25T00:00:00Z"},{...offer,expires_at:"bad"}],now),[offer]);console.log("PASS wishlist: product identity, capacity, sanitized storage, duplicate prevention, removal, request validation and offer expiry");
}finally{fs.rmSync(dir,{recursive:true,force:true});}

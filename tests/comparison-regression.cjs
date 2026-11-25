const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-compare-"));
try{cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/catalog/comparison.ts"],{stdio:"inherit"});const {parseComparison:p,toggleComparison:t,currentComparison:c,comparePrices:s,comparisonHref:h}=require(path.join(dir,"comparison.js"));
const ids=Array.from({length:5},(_,i)=>"00000000-0000-4000-8000-00000000000"+(i+1));assert.deepEqual(p(ids.slice(0,4).join(",")),{ids:ids.slice(0,4),invalid:false});
for(const invalid of [ids.join(","),ids[0]+","+ids[0],"../invalid",[ids[0]],ids[0]+","])assert.equal(p(invalid).invalid,true);
assert.deepEqual(t(ids.slice(0,4),ids[4]),ids.slice(0,4));assert.deepEqual(t([ids[0]],ids[0]),[]);assert.deepEqual(t([],ids[0]),[ids[0]]);assert.equal(p(new URL(h(ids.slice(0,2)),"https://dealwovo.com").searchParams.get("offers")).invalid,false);
const now=Date.parse("2026-11-24T12:00:00Z"),offer=(id,n,merchant,patch={})=>({id,price_cents:n,currency:"USD",verified_at:"2026-11-24T00:00:00Z",expires_at:"2026-11-25T00:00:00Z",product:{id:"same-product",title:"Fixture",slug:"fixture",description:"",image_url:null,category:{slug:"tech",name:"Tech"}},merchant:{name:merchant},...patch});
const a=offer(ids[0],1000,"A"),b=offer(ids[1],1300,"B"),expired=offer(ids[2],200,"C",{expires_at:"2026-11-24T12:00:00Z"}),future=offer(ids[3],200,"D",{verified_at:"2026-11-25T00:00:00Z"});
assert.deepEqual(c([a,b,expired,future],ids,now),[a,b]);assert.deepEqual(c([b,a],ids,now),[a,b]);assert.deepEqual(s([a,b]),{min:1000,max:1300,difference:300});
for(const x of [{...b,currency:"EUR"},{...b,price_cents:null},{...b,price_cents:0},{...b,product:{...b.product,id:"other"}},{...b,merchant:{name:"A"}}])assert.equal(s([a,x]),null);
assert.equal(s([a]),null);console.log("PASS comparison: bounded IDs, selection, expiry, order, same-product USD comparison and unknown-price holds");
}finally{fs.rmSync(dir,{recursive:true,force:true});}

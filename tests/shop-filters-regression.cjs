const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-shop-"));
try{cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/catalog/shop-filters.ts"],{stdio:"inherit"});const {parseShopFilters:p,filterOffers:f,defaults:d}=require(path.join(dir,"shop-filters.js"));
const offer=(id,price,title,category="electronics",currency="USD")=>({id,price_cents:price,currency,verified_at:"2026-11-24T00:00:00Z",product:{title,description:"Useful gift",category:{slug:category,name:category}},merchant:{name:"Fixture retailer"}});
const rows=[offer("a",2499,"Wireless headphones"),offer("b",2500,"Portable charger"),offer("c",null,"Unpriced gift"),offer("d",15000,"Coffee maker","kitchen"),offer("e",1000,"Other currency","electronics","EUR")];
assert.deepEqual(f(rows,{...d,budget:"25"}).map(r=>r.id),["a"]);
assert.deepEqual(f(rows,{...d,budget:"50"}).map(r=>r.id),["a","b"]);
assert.deepEqual(f(rows,{...d,budget:"150plus"}).map(r=>r.id),["d"]);
assert.deepEqual(f(rows,{...d,q:"wireless retailer"}).map(r=>r.id),["a"]);
assert.deepEqual(f(rows,{...d,category:"kitchen"}).map(r=>r.id),["d"]);
assert.deepEqual(f(rows,{...d,sort:"price_high"}).map(r=>r.id),["d","b","a","c","e"]);
assert.deepEqual(f(rows,{...d,sort:"price_low"}).map(r=>r.id),["a","b","d","c","e"]);
assert.deepEqual(p({budget:"oops",sort:"weird",category:"../",q:["a","b"]}),d);
assert.equal(p({q:"x".repeat(200)}).q.length,100);assert.equal(p({budget:"50"}).budget,"50");
console.log("PASS shopper filters: strict budget boundaries, unknown price exclusion, combined search, sorting and URL validation");
}finally{fs.rmSync(dir,{recursive:true,force:true});}

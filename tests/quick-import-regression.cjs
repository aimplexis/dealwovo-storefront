const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-quick-"));
try{cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/catalog/quick-import.ts"],{stdio:"inherit"});const {quickCandidate,suggestSlug}=require(path.join(dir,"quick-import.js"));
const b={title:"Coffee maker",external_product_id:"sku-1",affiliate_url:"https://retailer.com/product?affiliate=1",confirmed:"yes"};
assert.equal(quickCandidate(b).price_cents,null);assert.equal(quickCandidate({...b,image_url:"https://retailer.com/x"}).image_url,null);
for(const x of [{confirmed:"no"},{title:"x"},{external_product_id:""},{affiliate_url:"http://retailer.com"},{affiliate_url:"https://127.0.0.1/x"},{description:"a".repeat(3001)}])assert.equal(quickCandidate({...b,...x}),null);
assert.equal(suggestSlug("Café — Maker","abc-123"),"cafe-maker-abc123");assert.match(suggestSlug("★","abc"),/^product-abc$/);assert.ok(suggestSlug("x".repeat(200),"abc").length<130);
console.log("PASS quick import: authorization attestation, safe link and text bounds, no copied price/image, slug suggestions");
}finally{fs.rmSync(dir,{recursive:true,force:true});}

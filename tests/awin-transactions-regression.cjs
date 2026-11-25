const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"dw-awin-native-"));
try{
 cp.execFileSync(process.execPath,[require.resolve("typescript/bin/tsc"),"--target","ES2022","--module","commonjs","--strict","--skipLibCheck","--outDir",dir,"src/lib/affiliate/awin-transactions.ts"],{stdio:"inherit"});
 const {normalizeAwinTransactions:n,parseAwinTransactionJson:p}=require(path.join(dir,"awin-transactions.js"));
 const scope={publisher:"123",advertiser:"456",statementOn:"2026-11-24",today:"2026-11-24"};
 const base={id:1001,publisherId:123,advertiserId:456,transactionDate:"2026-11-23T12:34:56",commissionStatus:"pending",commissionAmount:{amount:12.34,currency:"USD"},paidToPublisher:false,orderRef:"do-not-retain",ipHash:"do-not-retain",clickRefs:{clickRef:"do-not-retain"}};
 const expected={transaction_ref:"1001",transaction_on:"2026-11-23",status:"pending",commission_cents:1234,currency:"USD",advertiser_id:"456"};
 assert.deepEqual(n([base],scope),[expected]);assert.deepEqual(p(JSON.stringify([base]),scope),[expected]);assert.deepEqual(n([],scope),[]);
 assert.equal(n([{...base,commissionStatus:"approved"}],scope)[0].status,"approved");
 assert.equal(n([{...base,commissionStatus:"approved",paidToPublisher:true}],scope)[0].status,"paid");
 for(const status of ["declined","deleted"]){const r=n([{...base,commissionStatus:status}],scope)[0];assert.equal(r.status,"reversed");assert.equal(r.commission_cents,0);}
 assert.equal(n([{...base,id:"9007199254740993",transactionDate:"2026-11-23T23:59:59.999Z",commissionAmount:{amount:"0.01",currency:"USD"}}],scope)[0].transaction_ref,"9007199254740993");
 for(const bad of [{publisherId:999},{advertiserId:999},{id:9007199254740992},{id:"001"},{transactionDate:"2026-02-30T01:00:00"},{transactionDate:"2026-11-25T00:00:00"},{transactionDate:"2026-11-23T12:00:00-05:00"},{transactionDate:"2026-11-23T24:00:00"},{paidToPublisher:undefined},{paidToPublisher:true},{commissionStatus:"paid"},{commissionStatus:"declined",paidToPublisher:true},{commissionAmount:{amount:1.001,currency:"USD"}},{commissionAmount:{amount:-1,currency:"USD"}},{commissionAmount:{amount:10,currency:"EUR"}},{commissionAmount:{amount:1000001,currency:"USD"}}])assert.throws(()=>n([{...base,...bad}],scope));
 assert.throws(()=>n([base,base],scope));assert.throws(()=>n(Array(101).fill(base),scope));assert.throws(()=>n({transactions:[base]},scope));assert.throws(()=>p("x".repeat(1048577),scope));assert.throws(()=>n([base],{...scope,statementOn:"2026-11-25"}));
 console.log("PASS native Awin transactions: exact scoped identifiers, USD cents, UTC dates, explicit payment status, reversal, duplicate and privacy guards");
}finally{fs.rmSync(dir,{recursive:true,force:true});}

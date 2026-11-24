import Link from "next/link";
import {catalogConfigured} from "../../../src/lib/supabase/config";
import {signInAction} from "../actions";
import "../admin.css";
export const dynamic="force-dynamic";
export const metadata={title:"Dealwovo Administration Login",robots:{index:false,follow:false}};
export default async function AdminLogin({searchParams}:{searchParams:Promise<{status?:string}>}){
 const params=await searchParams;
 const enabled=catalogConfigured();
 const msg=params.status==="invalid"?"Sign-in failed. Check your credentials.":params.status==="denied"?"This account is not authorized for Dealwovo administration.":params.status==="signedout"?"Signed out successfully.":params.status==="setup"?"Connect Supabase and grant the first admin role before signing in.":null;
 return <main className="dw-admin dw-login">
  <div className="dw-admin-shell"><p className="dw-admin-kicker">DEALWOVO / STAFF ONLY</p><h1>Welcome back.</h1>
  <p className="dw-admin-muted">Access to catalog management is restricted to individually authorized Dealwovo administrators.</p>
  {!enabled?<div className="dw-admin-warning"><strong>Administration is not yet activated.</strong><p>Supabase configuration is missing. This page is intentionally closed until database security is provisioned.</p></div>:
  <form action={signInAction} className="dw-admin-panel dw-admin-login-form"><label>Email address<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
   <label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button type="submit">Sign in securely ↗</button></form>}
  {msg?<p role="alert" className="dw-admin-alert">{msg}</p>:null}
  <Link href="/" className="dw-admin-home">← Return to storefront</Link></div>
 </main>
}

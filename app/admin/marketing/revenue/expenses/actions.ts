"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {visualAccess} from "../../visual/access";
import {expenseCategories,expenseCents} from "../../../../../src/lib/marketing/opportunity";
export async function recordExpense(f:FormData){const a=await visualAccess();if(!a.ok)redirect("/admin/login");const get=(k:string)=>String(f.get(k)??"").trim(),date=get("date"),category=get("category"),amount=expenseCents(get("amount")),ref=get("reference"),note=get("note"),base="/admin/marketing/revenue/expenses";if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>new Date().toISOString().slice(0,10)||!expenseCategories.some(x=>x===category)||amount===null||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(ref)||note.length<12||note.length>500||f.get("confirm")!=="yes")redirect(base+"?notice=invalid");const {error}=await a.db.from("commerce_expenses").insert({expense_on:date,category,amount_cents:amount,reference:ref,note});if(error)redirect(base+"?notice=error");revalidatePath(base);redirect(base+"?notice=saved");}

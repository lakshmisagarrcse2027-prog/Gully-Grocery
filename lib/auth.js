import {SignJWT,jwtVerify} from "jose";
const key=()=>new TextEncoder().encode(process.env.JWT_SECRET||"development-only-change-me");
export async function tokenFor(u){return new SignJWT({id:u.id,name:u.name,email:u.email,role:u.role}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("7d").sign(key())}
export async function readToken(t){try{return (await jwtVerify(t,key())).payload}catch{return null}}

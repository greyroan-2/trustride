const required=["NEXT_PUBLIC_SITE_URL","NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN","TRUSTED_PROXY_IP_HEADER","MIGRATION_DATABASE_URL","DEPLOY_WEBHOOK_URL","DEPLOY_WEBHOOK_TOKEN"];
for(const key of required) if(!process.env[key]) throw new Error(`Missing production setting: ${key}`);
for(const key of ["NEXT_PUBLIC_SITE_URL","NEXT_PUBLIC_SUPABASE_URL","UPSTASH_REDIS_REST_URL","DEPLOY_WEBHOOK_URL"]) if(new URL(process.env[key]).protocol!=="https:") throw new Error(`${key} must use HTTPS`);
if(process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT!=="true") throw new Error("Production requires shared rate-limit enforcement");
console.log("Required production security settings are present.");

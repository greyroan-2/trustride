(async()=>{
 const url=new URL(process.env.DEPLOY_WEBHOOK_URL || "");
 if(url.protocol!=="https:" || !process.env.DEPLOY_WEBHOOK_TOKEN || !process.env.RELEASE_IMAGE) throw new Error("Configure an HTTPS deployment hook, token, and release image.");
 const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${process.env.DEPLOY_WEBHOOK_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({image:process.env.RELEASE_IMAGE}),signal:AbortSignal.timeout(30000),redirect:"error"});
 if(!response.ok) throw new Error(`Deployment hook failed (${response.status})`);
 console.log("Deployment hook accepted the immutable release image.");
})().catch(error=>{console.error(error.message);process.exitCode=1;});

import { test } from "node:test";
import assert from "node:assert/strict";
import { isOwnedProfilePhoto, profilePhotoUrl } from "../src/lib/profile-photo";
const user="11111111-1111-4111-8111-111111111111";
const file="22222222-2222-4222-8222-222222222222.jpg";
test("profile photo URLs accept only generated paths in the dedicated bucket",()=>{
 const path=`${user}/${file}`;
 assert.equal(profilePhotoUrl(path,"https://project.supabase.co"),`https://project.supabase.co/storage/v1/object/public/profile-photos/${path}`);
 for(const value of [null,"",`${user}/../private.png`,"https://other.example/photo.jpg",`${user}/photo.svg`]) assert.equal(profilePhotoUrl(value,"https://project.supabase.co"),null);
 assert.equal(isOwnedProfilePhoto(path,user),true);
 assert.equal(isOwnedProfilePhoto(path,"33333333-3333-4333-8333-333333333333"),false);
});

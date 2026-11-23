import assert from "node:assert/strict";
import { test } from "node:test";
import { razorpayAuthorizeUrl } from "./razorpay-oauth.client.js";
import { checkoutKeyOf, isOAuthKeys } from "./razorpay.client.js";

test("razorpayAuthorizeUrl asks for read_write access with the given state and redirect", () => {
  const url = new URL(razorpayAuthorizeUrl({ clientId: "cid", clientSecret: "secret", mode: "test" }, "https://api.example.com/cb", "st:ate"));
  assert.equal(url.origin + url.pathname, "https://auth.razorpay.com/authorize");
  assert.equal(url.searchParams.get("client_id"), "cid");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("redirect_uri"), "https://api.example.com/cb");
  assert.equal(url.searchParams.get("scope"), "read_write");
  assert.equal(url.searchParams.get("state"), "st:ate");
  assert.equal(url.searchParams.has("client_secret"), false);
});

test("checkoutKeyOf uses the public token for connected accounts and the key id otherwise", () => {
  const oauth = { accessToken: "at", publicToken: "rzp_test_oauth_X" };
  const keys = { keyId: "rzp_test_K", keySecret: "s" };
  assert.equal(isOAuthKeys(oauth), true);
  assert.equal(isOAuthKeys(keys), false);
  assert.equal(checkoutKeyOf(oauth), "rzp_test_oauth_X");
  assert.equal(checkoutKeyOf(keys), "rzp_test_K");
});

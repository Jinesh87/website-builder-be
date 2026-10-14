import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PUBLIC_SITE_DOMAIN = "sites.example";
process.env.FRONTEND_URL = "https://app.builder.example";
process.env.API_PUBLIC_URL = "https://api.builder.example";
process.env.SITE_SERVER_IPS = "203.0.113.10";
process.env.SITE_CNAME_TARGET = "sites.builder.example";

const { dnsRecordsFor, hostnameProblem, isApex, normalizeHostname } = await import("./domain-rules.js");

test("normalizeHostname strips scheme, port, path and case", () => {
  assert.equal(normalizeHostname("https://WWW.Example.com:443/about?x=1"), "www.example.com");
  assert.equal(normalizeHostname("  shop.example.co.uk.  "), "shop.example.co.uk");
  assert.equal(normalizeHostname("bücher.de"), "xn--bcher-kva.de");
  assert.equal(normalizeHostname("user@example.com"), null);
  assert.equal(normalizeHostname(""), null);
});

test("hostnameProblem accepts real domains and rejects platform and invalid ones", () => {
  assert.equal(hostnameProblem("www.example.com"), null);
  assert.equal(hostnameProblem("example.com"), null);
  assert.equal(hostnameProblem("xn--bcher-kva.de"), null);
  assert.match(hostnameProblem("localhost") ?? "", /domain name/);
  assert.match(hostnameProblem("192.168.1.10") ?? "", /domain name/);
  assert.match(hostnameProblem("-bad.example.com") ?? "", /domain name/);
  assert.match(hostnameProblem("shop.sites.example") ?? "", /free sub-domain/);
  assert.match(hostnameProblem("sites.example") ?? "", /free sub-domain/);
  assert.match(hostnameProblem("app.builder.example") ?? "", /used by the platform/);
  assert.match(hostnameProblem("api.builder.example") ?? "", /used by the platform/);
});

test("isApex treats short country second levels as one suffix", () => {
  assert.equal(isApex("example.com"), true);
  assert.equal(isApex("example.co.uk"), true);
  assert.equal(isApex("www.example.com"), false);
  assert.equal(isApex("www.example.co.uk"), false);
});

test("dnsRecordsFor uses a CNAME for sub-domains and A records for apex domains", () => {
  const sub = dnsRecordsFor("www.example.com", "wb-token");
  assert.deepEqual(
    sub.map((record) => [record.type, record.name, record.value]),
    [
      ["TXT", "_wb-verify.www.example.com", "wb-token"],
      ["CNAME", "www.example.com", "sites.builder.example"],
    ],
  );
  const apex = dnsRecordsFor("example.com", "wb-token");
  assert.deepEqual(
    apex.map((record) => [record.type, record.name, record.value]),
    [
      ["TXT", "_wb-verify.example.com", "wb-token"],
      ["A", "example.com", "203.0.113.10"],
    ],
  );
});

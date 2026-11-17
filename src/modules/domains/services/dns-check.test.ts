import assert from "node:assert/strict";
import { Resolver } from "node:dns/promises";
import { mock, test } from "node:test";

process.env.PUBLIC_SITE_DOMAIN = "sites.example";
process.env.FRONTEND_URL = "https://app.builder.example";
process.env.API_PUBLIC_URL = "https://api.builder.example";
process.env.SITE_SERVER_IPS = "203.0.113.10";
process.env.SITE_CNAME_TARGET = "sites.builder.example";

const { checkDomainDns } = await import("./dns-check.js");

const TOKEN = "wb-token";
const noRecord = async () => {
  throw Object.assign(new Error("none"), { code: "ENODATA" });
};

function fakeDns({ a = [] as string[], cname = [] as string[] }) {
  mock.method(Resolver.prototype, "resolveTxt", async () => [[TOKEN]]);
  mock.method(Resolver.prototype, "resolveCname", async () => (cname.length ? cname : noRecord()));
  mock.method(Resolver.prototype, "resolve4", async () => (a.length ? a : noRecord()));
  mock.method(Resolver.prototype, "resolve6", noRecord);
}

test("a domain pointing only at our server passes", async (t) => {
  t.after(() => mock.restoreAll());
  fakeDns({ a: ["203.0.113.10"] });
  const result = await checkDomainDns("woodfit.example", TOKEN);
  assert.deepEqual([result.routing, result.extraAddresses, result.problem], [true, [], null]);
});

test("extra addresses next to ours (a registrar parking page) block the domain and are named", async (t) => {
  t.after(() => mock.restoreAll());
  fakeDns({ a: ["15.197.148.33", "203.0.113.10", "3.33.130.190"] });
  const result = await checkDomainDns("woodfit.example", TOKEN);
  assert.equal(result.routing, false);
  assert.deepEqual(result.extraAddresses, ["15.197.148.33", "3.33.130.190"]);
  assert.match(result.problem ?? "", /also points to 15\.197\.148\.33, 3\.33\.130\.190.*parking/);
});

test("a CNAME to our target passes whatever it resolves to", async (t) => {
  t.after(() => mock.restoreAll());
  fakeDns({ cname: ["sites.builder.example."], a: ["198.51.100.7"] });
  const result = await checkDomainDns("www.woodfit.example", TOKEN);
  assert.deepEqual([result.routing, result.problem], [true, null]);
});

test("a domain pointing elsewhere only keeps the old message", async (t) => {
  t.after(() => mock.restoreAll());
  fakeDns({ a: ["198.51.100.7"] });
  const result = await checkDomainDns("woodfit.example", TOKEN);
  assert.equal(result.routing, false);
  assert.match(result.problem ?? "", /points to 198\.51\.100\.7, not to our server/);
});

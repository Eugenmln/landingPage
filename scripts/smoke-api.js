const baseUrl = String(process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");

await checkJson("/api/health", 200, (body) => body?.ok === true);
await checkJson("/api/store", 200, (body) => Array.isArray(body?.products) && Array.isArray(body?.outfits));
await checkUnauthorizedWrite();

console.log(`API smoke test passed: ${baseUrl}`);

async function checkJson(path, expectedStatus, validate) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json().catch(() => null);

  if (response.status !== expectedStatus || !validate(body)) {
    throw new Error(`${path} failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
}

async function checkUnauthorizedWrite() {
  const response = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "smoke-test" }),
  });

  if (response.status !== 401) {
    const body = await response.text();
    throw new Error(`Admin protection failed: HTTP ${response.status} ${body}`);
  }
}

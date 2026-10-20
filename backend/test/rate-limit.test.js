const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const rateLimit = require("../middleware/rateLimit");

test("unauthenticated endpoint rate limit blocks requests over its window cap", () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 1, message: "Slow down." });
    const req = { ip: `test-${crypto.randomUUID()}`, baseUrl: "/test", path: "/route" };
    let nextCalls = 0;
    const makeResponse = () => ({
        headers: {},
        body: null,
        statusCode: 200,
        set(name, value) { this.headers[name] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    });

    middleware(req, makeResponse(), () => { nextCalls += 1; });
    const limitedResponse = makeResponse();
    middleware(req, limitedResponse, () => { nextCalls += 1; });

    assert.equal(nextCalls, 1);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.body.message, "Slow down.");
    assert.ok(Number(limitedResponse.headers["Retry-After"]) > 0);
});

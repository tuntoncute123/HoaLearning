// Small dispatcher for Next.js Route Handlers. Domain handlers share authorization
// and response helpers, while Next owns HTTP serving and deployment.
export function createRouter() {
  const routes = [],
    middleware = [];
  const router = {
    use(fn) {
      middleware.push(fn);
    },
  };
  for (const method of ["get", "post", "put", "delete"])
    router[method] = (path, ...handlers) => {
      const names = [];
      const pattern = path
        .split("/")
        .map((segment) => {
          if (!segment.startsWith(":")) return segment;
          const [, name, suffix = ""] = segment.match(/^:([a-zA-Z]+)(.*)$/);
          names.push(name);
          return "([^/]+)" + suffix.replaceAll(".", "\\.");
        })
        .join("/");
      routes.push({
        method: method.toUpperCase(),
        pattern: new RegExp("^" + pattern + "$"),
        names,
        handlers,
      });
    };
  router.handle = async (request) => {
    const url = new URL(request.url);
    let status = 200,
      output,
      finished = false;
    const headers = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const res = {
      status(code) {
        status = code;
        return res;
      },
      set(name, value) {
        headers.set(name, value);
        return res;
      },
      json(value) {
        headers.set("Content-Type", "application/json; charset=utf-8");
        output = JSON.stringify(value);
        finished = true;
        return res;
      },
      send(value) {
        output = value;
        finished = true;
        return res;
      },
      cookie(name, value, options = {}) {
        headers.append(
          "Set-Cookie",
          `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor((options.maxAge || 0) / 1000)}${options.secure ? "; Secure" : ""}`,
        );
      },
      clearCookie(name) {
        res.cookie(name, "");
      },
    };
    try {
      const route = routes.find(
        (r) => r.method === request.method && r.pattern.test(url.pathname),
      );
      if (!route)
        return Response.json(
          { error: "Không tìm thấy chức năng." },
          { status: 404, headers },
        );
      const match = url.pathname.match(route.pattern);
      const req = {
        method: request.method,
        headers: Object.fromEntries(request.headers),
        params: Object.fromEntries(
          route.names.map((name, i) => [
            name,
            decodeURIComponent(match[i + 1]),
          ]),
        ),
        body: {},
        url,
        request,
      };
      // Authenticate before buffering/parsing uploads.
      const run = async (handlers) => {
        for (const handler of handlers) {
          let advance = false;
          await handler(req, res, () => {
            advance = true;
          });
          if (finished || !advance) break;
        }
      };
      await run(middleware);
      if (!finished && !["GET", "HEAD"].includes(request.method)) {
        const limit = 2 * 1024 * 1024;
        if (Number(request.headers.get("content-length")) > limit)
          return Response.json(
            { error: "Yêu cầu quá lớn. Hãy tải PDF bằng từng phần." },
            { status: 413, headers },
          );
        const reader = request.body?.getReader(),
          chunks = [];
        let size = 0;
        if (reader)
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > limit) {
              await reader.cancel();
              return Response.json(
                { error: "Yêu cầu quá lớn." },
                { status: 413, headers },
              );
            }
            chunks.push(Buffer.from(value));
          }
        const raw = Buffer.concat(chunks);
        if (raw.length) {
          try {
            req.body = JSON.parse(raw.toString("utf8"));
          } catch {
            return Response.json(
              { error: "Nội dung JSON không hợp lệ." },
              { status: 400, headers },
            );
          }
          if (
            !req.body ||
            typeof req.body !== "object" ||
            Array.isArray(req.body)
          )
            return Response.json(
              { error: "Nội dung yêu cầu không hợp lệ." },
              { status: 400, headers },
            );
        }
      }
      if (!finished) await run(route.handlers);
      if (!finished)
        res.status(404).json({ error: "Không tìm thấy chức năng." });
      return new Response(output, { status, headers });
    } catch (e) {
      console.error("API error:", e.code || e.message);
      return Response.json(
        { error: "Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại." },
        { status: 503, headers },
      );
    }
  };
  return router;
}

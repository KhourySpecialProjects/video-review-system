import { type RouteConfig, route, layout } from "@react-router/dev/routes";

export default [
  // Better Auth API catch-all (no layout)
  route("api/auth/*", "routes/api.auth.$.ts"),

  // Public auth routes (no layout wrapper)
  route("sign-in", "routes/sign-in.tsx"),
  route("sign-up", "routes/sign-up.tsx"),

  // Authenticated routes (with app layout)
  layout("routes/root.tsx", [
    route("/", "routes/home.tsx"),
    route("videos/:videoId", "routes/video-view.tsx"),
  ]),
] satisfies RouteConfig;

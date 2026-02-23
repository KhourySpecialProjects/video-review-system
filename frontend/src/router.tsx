import { createBrowserRouter } from "react-router"
import Root from "./routes/root"
import Home from "./routes/home"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        index: true,
        element: <Home />,
        loader: async () => {
          // fetch data here
          return { message: "Hello from loader" }
        },
      },
    ],
  },
])
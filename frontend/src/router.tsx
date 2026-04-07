import { createBrowserRouter } from "react-router";
import Root from "./routes/root";
import Home, { clientLoader as homeLoader, clientAction as homeAction } from "./routes/home";
import VideoView, { clientLoader as videoLoader, clientAction as videoAction } from "./routes/video-view";
import VideoReview from "./routes/VideoReview";
import { fetchTutorial } from "./lib/mock-data";
import TutorialPage from "./routes/TutorialPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            {
                index: true,
                element: <Home />,
                loader: homeLoader,
                action: homeAction,
            },
            {
                path: "videos/:videoId",
                element: <VideoView />,
                loader: videoLoader,
                action: videoAction,
            },
            {
                path: "review",
                element: <VideoReview />,
            },
            {
                path: "tutorials",
                element: <TutorialPage />,
                loader: () => {
                    return { tutorialPromise: fetchTutorial() };
                },
            },
        ],
    },
]);

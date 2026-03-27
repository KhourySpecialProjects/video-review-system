import { createBrowserRouter } from "react-router";
import Root from "./routes/root";
import Home from "./routes/home";
import VideoView from "./routes/video-view";
import { fetchVideos, fetchVideoById, updateVideo, fetchTutorial } from "./lib/mock-data";
import TutorialPage from "./routes/TutorialPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            {
                index: true,
                element: <Home />,
                loader: () => {
                    // Return a raw promise — React Router v7 <Await> handles it
                    // The route renders immediately, showing the <Suspense> skeleton
                    return { videosPromise: fetchVideos() };
                },
            },
            {
                path: "videos/:videoId",
                element: <VideoView />,
                loader: async ({ params }) => {
                    const video = await fetchVideoById(params.videoId!);
                    if (!video) {
                        throw new Response("Video not found", { status: 404 });
                    }
                    return { video };
                },
                action: async ({ params, request }) => {
                    const formData = await request.formData();
                    const title = formData.get("title") as string;
                    const description = formData.get("description") as string;
                    await updateVideo(params.videoId!, { title, description });
                    return { success: true };
                },
            },
            {
              path: "tutorials",
              element: <TutorialPage />,
              loader: () => {
                  return { tutorialPromise: fetchTutorial() };
              },
            }
        ],
    },
]);

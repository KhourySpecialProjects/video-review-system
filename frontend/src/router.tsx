import { createBrowserRouter } from "react-router";
import Root from "./routes/root";
import Home from "./routes/home";
import VideoView from "./routes/video-view";
import { AllVideos } from "./features/video/allVideos/AllVideos";
import VideoReview from "./routes/VideoReview";
import Reviews from "./routes/reviews";
import { reviewsLoader } from "./features/reviews/reviewsLoader";
import { fetchTutorial } from "./lib/mock-data";
import TutorialPage from "./routes/TutorialPage";
import SignupPage from "./routes/Signup";
import { signupLoader, signupAction } from "./features/auth/signup.service";
import { Login } from "./features/login/login";
import { clientAction as loginAction } from "./hooks/use-login";
import { ForgotPassword } from "./features/login/forgot-password";
import { clientAction as forgotPasswordAction } from "./hooks/use-forgot-password";
import { ResetPassword } from "./features/login/reset-password";
import { clientAction as resetPasswordAction } from "./hooks/use-reset-password";
import { authGuardLoader } from "./hooks/auth-guard";
import { homeLoader, searchLoader, videoViewLoader, videoViewAction, videoReviewLoader, videoReviewAction } from "./lib/video.service";
import { incompleteUploadsLoader, incompleteUploadsAction } from "./features/layout/incomplete-uploads.route";
import { clipsLoader, clipsAction } from "./features/video/clips/clips.route";
import { sequencesLoader, sequencesAction } from "./features/video/sequences/sequences.route";
import { annotationsLoader, annotationsAction } from "./features/video/annotations/annotations.route";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        loader: authGuardLoader,
        children: [
            {
                element: <Home />,
                loader: homeLoader,
                children: [
                    { index: true, element: <></> },
                    {
                        path: "search",
                        element: <AllVideos />,
                        loader: searchLoader,
                    },
                ],
            },
            {
                path: "videos/:videoId",
                element: <VideoView />,
                loader: videoViewLoader,
                action: videoViewAction,
            },
            {
                path: "review/:videoId",
                element: <VideoReview />,
                loader: videoReviewLoader,
                action: videoReviewAction,
            },
            {
                path: "reviews",
                element: <Reviews />,
                loader: reviewsLoader,
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
    {
        path: "/incomplete-uploads",
        loader: incompleteUploadsLoader,
        action: incompleteUploadsAction,
    },
    {
        path: "/clips",
        loader: clipsLoader,
        action: clipsAction,
    },
    {
        path: "/sequences",
        loader: sequencesLoader,
        action: sequencesAction,
    },
    {
        path: "/annotations",
        loader: annotationsLoader,
        action: annotationsAction,
    },
    {
        path: "/signup/:token",
        element: <SignupPage />,
        loader: signupLoader,
        action: signupAction,
    },
    {
        path: "/login",
        element: <Login />,
        action: loginAction,
    },
    {
        path: "/forgot-password",
        element: <ForgotPassword />,
        action: forgotPasswordAction,
    },
    {
        path: "/reset-password",
        element: <ResetPassword />,
        action: resetPasswordAction,
    },
]);

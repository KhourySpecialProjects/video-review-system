import { createBrowserRouter } from "react-router";
import { queryClient } from "./lib/queryClient";
import SystemAdminDashboard from "./routes/SystemAdminDashboard";
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
import { authGuardLoader, caregiverGuardLoader, nonCaregiverGuardLoader, adminGuardLoader, landingLoader } from "./hooks/auth-guard";
import { Landing } from "./features/landing/Landing";
import { AboutPage } from "./features/about/AboutPage";
import { ChangelogPage } from "./features/about/ChangelogPage";
import { homeLoader, searchLoader, videoViewLoader, videoViewAction, videoReviewLoader, videoReviewAction, videoReviewShouldRevalidate } from "./lib/video.service";
import { adminLoader, adminAction } from "./features/admin/admin.route";
import { inviteUserAction } from "./features/admin/invite.route";
import { createSiteAction } from "./features/admin/create-site.route";
import { createStudyAction } from "./features/admin/create-study.route";
import { userDetailLoader } from "./features/admin/user-detail.route";
import { siteOptionsLoader } from "./features/admin/site-options.route";
import { siteCaregiversLoader } from "./features/admin/study-caregivers.route";
import { siteDetailLoader, siteDetailAction } from "./features/admin/site-detail.route";
import { studyDetailLoader, studyDetailAction } from "./features/admin/study-detail.route";
import { incompleteUploadsLoader, incompleteUploadsAction } from "./features/layout/incomplete-uploads.route";
import { clipsLoader, clipsAction } from "./features/video/clips/clips.route";
import { sequencesLoader, sequencesAction } from "./features/video/sequences/sequences.route";
import { annotationsLoader, annotationsAction } from "./features/video/annotations/annotations.route";
import { myStudiesLoader } from "./features/video/videoUpload/studies.route";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Landing />,
        loader: landingLoader,
    },
    {
        path: "/about",
        element: <AboutPage />,
    },
    {
        path: "/changelog",
        element: <ChangelogPage />,
    },
    {
        element: <Root />,
        loader: authGuardLoader,
        children: [
            // Caregiver-only pages. The guard loader redirects non-caregiver
            // roles to /reviews and unauthenticated users to /login before
            // the child loaders run, so Home and video-view data never leak
            // to users who shouldn't see them.
            {
                loader: caregiverGuardLoader,
                children: [
                    {
                        path: "home",
                        element: <Home />,
                        loader: homeLoader(queryClient),
                        children: [
                            { index: true, element: <></> },
                            {
                                path: "search",
                                element: <AllVideos />,
                                loader: searchLoader(queryClient),
                            },
                        ],
                    },
                    {
                        path: "videos/:videoId",
                        element: <VideoView />,
                        loader: videoViewLoader(queryClient),
                        action: videoViewAction(queryClient),
                    },
                ],
            },
            // Reviewer / coordinator / sysadmin pages. Caregivers get
            // bounced back to `/home`.
            {
                loader: nonCaregiverGuardLoader,
                children: [
                    {
                        path: "review/:videoId/:studyId/:siteId",
                        element: <VideoReview />,
                        loader: videoReviewLoader(queryClient),
                        action: videoReviewAction,
                        shouldRevalidate: videoReviewShouldRevalidate,
                    },
                    {
                        path: "reviews",
                        element: <Reviews />,
                        loader: reviewsLoader,
                    },
                ]
            },
            // Admin-only pages (SYSADMIN + SITE_COORDINATOR)
            {
                loader: adminGuardLoader,
                children: [
                    {
                        path: "admin",
                        element: <SystemAdminDashboard />,
                        loader: adminLoader(queryClient),
                        action: adminAction(queryClient),
                    },
                ],
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
        path: "/admin/invite",
        action: inviteUserAction(queryClient),
    },
    {
        path: "/admin/create-site",
        action: createSiteAction(queryClient),
    },
    {
        path: "/admin/create-study",
        action: createStudyAction(queryClient),
    },
    {
        path: "/admin/user-detail",
        loader: userDetailLoader(queryClient),
    },
    {
        path: "/admin/site-detail",
        loader: siteDetailLoader(queryClient),
        action: siteDetailAction(queryClient),
    },
    {
        path: "/admin/study-detail",
        loader: studyDetailLoader(),
        action: studyDetailAction(queryClient),
    },
    {
        path: "/sites/options",
        loader: siteOptionsLoader(queryClient),
    },
    {
        path: "/studies/caregivers-for-sites",
        loader: siteCaregiversLoader(queryClient),
    },
    {
        path: "/incomplete-uploads",
        loader: incompleteUploadsLoader,
        action: incompleteUploadsAction,
    },
    {
        path: "/clips",
        loader: clipsLoader,
        action: clipsAction(queryClient),
    },
    {
        path: "/sequences",
        loader: sequencesLoader,
        action: sequencesAction(queryClient),
    },
    {
        path: "/annotations",
        loader: annotationsLoader,
        action: annotationsAction(queryClient),
    },
    {
        path: "/studies/mine",
        loader: myStudiesLoader,
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

export type { VideoListItem as Video, VideoStatus } from "@shared/video";

export type TutorialCategory = {
    title: string;
    tutorials: Tutorial[];
}

export type Tutorial = {
    title: string;
    type: "video" | "article";
    url?: string;
    content?: string;
}

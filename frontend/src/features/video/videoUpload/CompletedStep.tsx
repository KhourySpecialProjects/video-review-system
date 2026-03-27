import { CircleCheckBig, Smartphone, Download } from 'lucide-react'

export function CompletedStep() {
    return (
        <main>
            <header className="flex flex-col items-center justify-center text-center gap-2 mt-4">
                <CircleCheckBig className="size-16 text-success bg-success/20 p-3 rounded-b-full outline-2 outline-success rounded-full mb-5" />
                <h2 className="text-xl font-bold text-text">Next Steps</h2>
            </header>

            <section className="flex flex-col items-center text-center gap-3 bg-primary/20 outline-2 outline-primary rounded-md my-4 p-3">
                <div className="flex items-center gap-2">
                    <Smartphone className="size-5 text-primary" />
                    <h4 className=" text-base font-semibold text-foreground">You can delete the video from your phone</h4>
                </div>
                <p className="text-text-muted">
                    If you want to save space on your phone feel free to delete the video
                </p>
            </section>

            <section className="flex flex-col items-center text-center gap-3 bg-success/20 outline-2 outline-success rounded-md mt-4 p-3">
                <div className="flex items-center w-full">
                    <Download className="mr-auto size-5 text-success " />
                    <h4 className="justify-self-center text-base font-semibold text-success mr-auto">Re-download anytime</h4>
                </div>
                <p className="text-text-muted">
                    We've saved a copy on our servers, so you can always re-download it later from the website.
                </p>
            </section>
        </main>
    )

}